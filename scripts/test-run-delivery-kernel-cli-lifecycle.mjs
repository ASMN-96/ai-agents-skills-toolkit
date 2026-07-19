#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import { runDeliveryKernelCli } from "./ai-toolkit/run-delivery-kernel.mjs";
import { canonicalDigest } from "./ai-toolkit/kernel/canonical-digest.mjs";
import { prepareExecutionPlan } from "./ai-toolkit/kernel/execution-lifecycle.mjs";
import { readPinnedDeliveryRequestSync } from "./test-support/live-repository-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_TEMPLATE = path.join(ROOT, "templates", "delivery-kernel.request.example.json");
const MATERIALIZED_TEMPLATE_ROOT = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-template-"));
const TEMPLATE = path.join(MATERIALIZED_TEMPLATE_ROOT, "request.json");
const CREATED_AT = "2026-07-17T08:00:00.000Z";

writeFileSync(
  TEMPLATE,
  `${JSON.stringify(readPinnedDeliveryRequestSync(RAW_TEMPLATE, ROOT), null, 2)}\n`,
  "utf8"
);
after(() => rmSync(MATERIALIZED_TEMPLATE_ROOT, { recursive: true, force: true }));

function outputSink() {
  let value = "";
  return {
    stream: { write(chunk) { value += String(chunk); } },
    value() { return value; }
  };
}

async function run(argv, cwd = ROOT) {
  const stdout = outputSink();
  const stderr = outputSink();
  const result = await runDeliveryKernelCli({ argv, cwd, stdout: stdout.stream, stderr: stderr.stream });
  assert.equal(stderr.value(), "");
  assert.deepEqual(JSON.parse(stdout.value()), result);
  return result;
}

test("plan command accepts the materialized pinned starter and legacy --input", async () => {
  const planned = await run(["plan", "--input", TEMPLATE, "--created-at", CREATED_AT]);
  assert.equal(planned.executionManifest.createdAt, CREATED_AT);
  assert.match(planned.executionManifest.planDigest, /^[a-f0-9]{64}$/);
  assert.match(planned.executionManifest.runId, /^run-[a-f0-9]{24}$/);
  const legacy = await run(["--input", TEMPLATE, "--created-at", CREATED_AT]);
  assert.deepEqual(legacy, planned);
});

test("plan command rejects the raw all-zero template placeholder", async () => {
  await assert.rejects(
    runDeliveryKernelCli({
      argv: ["plan", "--input", RAW_TEMPLATE, "--created-at", CREATED_AT],
      cwd: ROOT,
      stdout: outputSink().stream,
      stderr: outputSink().stream
    }),
    /does not match expectedCommit 0000000000000000000000000000000000000000/
  );
});

test("ingest-events and finalize consume serialized lifecycle envelopes", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-lifecycle-"));
  try {
    const plan = await run(["plan", "--input", TEMPLATE, "--created-at", CREATED_AT], ROOT);
    const planPath = path.join(fixture, "plan.json");
    const eventsPath = path.join(fixture, "events.json");
    const receiptsPath = path.join(fixture, "receipts.json");
    const identity = {
      schemaVersion: "1.0.0",
      runId: plan.executionManifest.runId,
      taskId: plan.executionManifest.taskId,
      planDigest: plan.executionManifest.planDigest
    };
    writeFileSync(planPath, `${JSON.stringify(plan)}\n`, "utf8");
    writeFileSync(eventsPath, `${JSON.stringify({ ...identity, events: [] })}\n`, "utf8");
    writeFileSync(receiptsPath, `${JSON.stringify({ ...identity, receipts: [] })}\n`, "utf8");
    const ingested = await run(["ingest-events", "--plan", planPath, "--events", eventsPath], ROOT);
    assert.ok(new Set(["planned", "blocked"]).has(ingested.readinessState));
    const finalized = await run([
      "finalize", "--plan", planPath, "--events", eventsPath, "--receipts", receiptsPath
    ], ROOT);
    assert.equal(finalized.readinessState, "blocked");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("ingest rejects a re-hashed plan that removes canonical policy gates", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-policy-forgery-"));
  try {
    const planned = await run(["plan", "--input", TEMPLATE, "--created-at", CREATED_AT], ROOT);
    const forged = structuredClone(planned);
    const { createdAt, contextExpiresAt } = forged.executionManifest;
    delete forged.executionManifest;
    const removedGateId = forged.requiredGateIds.at(-1);
    forged.requiredGateIds = forged.requiredGateIds.filter((id) => id !== removedGateId);
    forged.scenarioPolicy.requiredGateIds = forged.scenarioPolicy.requiredGateIds
      .filter((id) => id !== removedGateId);
    forged.domain.resolvedGateIds = forged.domain.resolvedGateIds
      .filter((id) => id !== removedGateId);
    forged.domain.gates = forged.domain.gates.filter((gate) => gate.id !== removedGateId);
    forged.domain.blockedGateIds = forged.domain.blockedGateIds
      .filter((id) => id !== removedGateId);
    for (const blocker of forged.domain.blockers) {
      blocker.gateIds = blocker.gateIds.filter((id) => id !== removedGateId);
    }
    const sourceGovernance = forged.domain.sourceGovernance;
    sourceGovernance.dependencies = sourceGovernance.dependencies
      .filter((dependency) => dependency.gateId !== removedGateId);
    sourceGovernance.blockers = sourceGovernance.blockers
      .filter((blocker) => blocker.gateId !== removedGateId);
    sourceGovernance.blockedGateIds = sourceGovernance.blockedGateIds
      .filter((id) => id !== removedGateId);
    sourceGovernance.requiredSourceIds = [...new Set(
      sourceGovernance.dependencies.map((dependency) => dependency.sourceId)
    )].sort();
    sourceGovernance.sources = sourceGovernance.sources
      .filter((source) => sourceGovernance.requiredSourceIds.includes(source.sourceId));
    sourceGovernance.status = sourceGovernance.blockers.length === 0 ? "current" : "blocked";
    const { snapshotDigest: ignoredSnapshotDigest, ...snapshotCore } = sourceGovernance;
    void ignoredSnapshotDigest;
    sourceGovernance.snapshotDigest = canonicalDigest(
      snapshotCore,
      "forged authoritative source policy snapshot"
    );
    forged.codex.sourceSnapshotDigest = sourceGovernance.snapshotDigest;
    forged.claude.sourceSnapshotDigest = sourceGovernance.snapshotDigest;
    const accounting = forged.sourceDependencyAccounting;
    accounting.selectedGateIds = [...forged.domain.resolvedGateIds].sort();
    const selectedGates = new Set(accounting.selectedGateIds);
    const movedPreviewBlockers = accounting.selectedPreviewDependencyBlockers
      .filter((blocker) => !selectedGates.has(blocker.gateId));
    accounting.selectedPreviewDependencyBlockers = accounting.selectedPreviewDependencyBlockers
      .filter((blocker) => selectedGates.has(blocker.gateId));
    accounting.diagnosticPreviewDependencyBlockers = [
      ...accounting.diagnosticPreviewDependencyBlockers,
      ...movedPreviewBlockers
    ].sort((left, right) => (
      left.packId.localeCompare(right.packId)
      || left.gateId.localeCompare(right.gateId)
      || left.sourceId.localeCompare(right.sourceId)
    ));
    accounting.blockingSourceIds = [...new Set([
      ...accounting.supportedDependencyBlockers,
      ...accounting.selectedPreviewDependencyBlockers,
      ...accounting.selectedResourceDependencyBlockers
    ].map((blocker) => blocker.sourceId))].sort();
    accounting.status = accounting.blockingSourceIds.length === 0 ? "current" : "blocked";
    forged.team.domainSelectionDigest = canonicalDigest(forged.domain, "forged domain");
    const ttlSeconds = Math.round(
      (new Date(contextExpiresAt).valueOf() - new Date(createdAt).valueOf()) / 1000
    );
    const preparedForgery = prepareExecutionPlan(forged, { createdAt, contextTtlSeconds: ttlSeconds });
    const identity = {
      schemaVersion: "1.0.0",
      runId: preparedForgery.executionManifest.runId,
      taskId: preparedForgery.executionManifest.taskId,
      planDigest: preparedForgery.executionManifest.planDigest
    };
    const planPath = path.join(fixture, "forged-plan.json");
    const eventsPath = path.join(fixture, "events.json");
    writeFileSync(planPath, `${JSON.stringify(preparedForgery)}\n`, "utf8");
    writeFileSync(eventsPath, `${JSON.stringify({ ...identity, events: [] })}\n`, "utf8");
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["ingest-events", "--plan", planPath, "--events", eventsPath],
        cwd: ROOT,
        stdout: outputSink().stream,
        stderr: outputSink().stream
      }),
      /does not match the current canonical planner policy/
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("ingest rejects a re-hashed plan that alters inspected context and adapter prompts", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-context-forgery-"));
  try {
    const planned = await run(["plan", "--input", TEMPLATE, "--created-at", CREATED_AT], ROOT);
    const forged = structuredClone(planned);
    const { createdAt, contextExpiresAt } = forged.executionManifest;
    delete forged.executionManifest;
    forged.context.items[0].source = "README.md";
    forged.codex.contextReferences[0].source = "README.md";
    forged.claude.contextReferences[0].source = "README.md";
    const ttlSeconds = Math.round(
      (new Date(contextExpiresAt).valueOf() - new Date(createdAt).valueOf()) / 1000
    );
    const preparedForgery = prepareExecutionPlan(forged, { createdAt, contextTtlSeconds: ttlSeconds });
    const identity = {
      schemaVersion: "1.0.0",
      runId: preparedForgery.executionManifest.runId,
      taskId: preparedForgery.executionManifest.taskId,
      planDigest: preparedForgery.executionManifest.planDigest
    };
    const planPath = path.join(fixture, "forged-plan.json");
    const eventsPath = path.join(fixture, "events.json");
    writeFileSync(planPath, `${JSON.stringify(preparedForgery)}\n`, "utf8");
    writeFileSync(eventsPath, `${JSON.stringify({ ...identity, events: [] })}\n`, "utf8");

    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["ingest-events", "--plan", planPath, "--events", eventsPath],
        cwd: ROOT,
        stdout: outputSink().stream,
        stderr: outputSink().stream
      }),
      /does not match the current canonical planner policy/
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("ingest rejects caller-forged source dependency accounting after canonical replanning", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-source-accounting-forgery-"));
  try {
    const planned = await run(["plan", "--input", TEMPLATE, "--created-at", CREATED_AT], ROOT);
    const forged = structuredClone(planned);
    forged.sourceDependencyAccounting.selectedResourceIds = ["caller-forged-resource"];
    const planPath = path.join(fixture, "forged-plan.json");
    const eventsPath = path.join(fixture, "events.json");
    writeFileSync(planPath, `${JSON.stringify(forged)}\n`, "utf8");
    writeFileSync(eventsPath, `${JSON.stringify({
      schemaVersion: "1.0.0",
      runId: forged.executionManifest.runId,
      taskId: forged.executionManifest.taskId,
      planDigest: forged.executionManifest.planDigest,
      events: []
    })}\n`, "utf8");
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["ingest-events", "--plan", planPath, "--events", eventsPath],
        cwd: ROOT,
        stdout: outputSink().stream,
        stderr: outputSink().stream
      }),
      /does not match the current canonical planner policy/
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("output writes require dual authorization, stay within cwd, and never overwrite", async () => {
  const fixture = mkdtempSync(path.join(ROOT, ".delivery-kernel-cli-output-"));
  try {
    const outputPath = path.join(fixture, "prepared.json");
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["plan", "--input", TEMPLATE, "--created-at", CREATED_AT, "--output", outputPath],
        cwd: ROOT, stdout: outputSink().stream, stderr: outputSink().stream
      }),
      /--authorize-action scoped-local-write/
    );
    assert.equal(existsSync(outputPath), false);

    const unauthorizedRequest = JSON.parse(readFileSync(TEMPLATE, "utf8"));
    unauthorizedRequest.task.authorizedActions = unauthorizedRequest.task.authorizedActions
      .filter((action) => action !== "scoped-local-write");
    const unauthorizedRequestPath = path.join(fixture, "unauthorized-request.json");
    const unauthorizedOutputPath = path.join(fixture, "unauthorized-output.json");
    writeFileSync(unauthorizedRequestPath, `${JSON.stringify(unauthorizedRequest)}\n`, "utf8");
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["plan", "--input", unauthorizedRequestPath, "--created-at", CREATED_AT,
          "--output", unauthorizedOutputPath, "--authorize-action", "scoped-local-write"],
        cwd: ROOT, stdout: outputSink().stream, stderr: outputSink().stream
      }),
      /plan does not authorize scoped-local-write/i
    );
    assert.equal(existsSync(unauthorizedOutputPath), false);

    const result = await run([
      "plan", "--input", TEMPLATE, "--created-at", CREATED_AT,
      "--output", outputPath, "--authorize-action", "scoped-local-write"
    ], ROOT);
    assert.deepEqual(JSON.parse(readFileSync(outputPath, "utf8")), result);
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["plan", "--input", TEMPLATE, "--created-at", CREATED_AT, "--output", outputPath,
          "--authorize-action", "scoped-local-write"],
        cwd: ROOT, stdout: outputSink().stream, stderr: outputSink().stream
      }),
      /already exists|overwrite/i
    );
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["plan", "--input", TEMPLATE, "--created-at", CREATED_AT,
          "--output", path.join(ROOT, "..", "escape.json"),
          "--authorize-action", "scoped-local-write"],
        cwd: ROOT, stdout: outputSink().stream, stderr: outputSink().stream
      }),
      /contained|outside|cwd/i
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("output rejects a linked parent path component", async (context) => {
  const fixture = mkdtempSync(path.join(ROOT, ".delivery-kernel-cli-link-"));
  const target = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-link-target-"));
  try {
    const linked = path.join(fixture, "linked");
    try {
      symlinkSync(target, linked, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("host does not permit creating a test link");
        return;
      }
      throw error;
    }
    await assert.rejects(
      runDeliveryKernelCli({
        argv: ["plan", "--input", TEMPLATE, "--created-at", CREATED_AT,
          "--output", path.join(linked, "result.json"),
          "--authorize-action", "scoped-local-write"],
        cwd: ROOT, stdout: outputSink().stream, stderr: outputSink().stream
      }),
      /linked|symlink|junction|reparse/i
    );
    assert.equal(existsSync(path.join(target, "result.json")), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test("output rejects NTFS stream, reserved-device, and trailing-alias names", async () => {
  const fixture = mkdtempSync(path.join(ROOT, ".delivery-kernel-cli-windows-alias-"));
  try {
    for (const unsafeName of ["result.json:stream", "CON.json", "NUL", "result.json.", "nested. /result.json"]) {
      const outputPath = path.join(fixture, ...unsafeName.split("/"));
      await assert.rejects(
        runDeliveryKernelCli({
          argv: ["plan", "--input", TEMPLATE, "--created-at", CREATED_AT,
            "--output", outputPath, "--authorize-action", "scoped-local-write"],
          cwd: ROOT, stdout: outputSink().stream, stderr: outputSink().stream
        }),
        /unsafe Windows|alternate data stream|device|trailing dot|trailing space/i,
        unsafeName
      );
      assert.equal(existsSync(outputPath), false);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
