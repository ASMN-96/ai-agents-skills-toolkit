#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { DELIVERY_REQUEST_V1_MIGRATION_MESSAGE } from "./ai-toolkit/kernel/contracts.mjs";
import { readPinnedDeliveryRequestSync } from "./test-support/live-repository-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts", "ai-toolkit", "run-delivery-kernel.mjs");
const TEMPLATE = path.join(ROOT, "templates", "delivery-kernel.request.example.json");

async function loadCliModule() {
  const originalExitCode = process.exitCode;
  const module = await import(pathToFileURL(CLI).href);
  process.exitCode = originalExitCode;
  return module;
}

function outputSink() {
  let value = "";
  return {
    stream: { write(chunk) { value += String(chunk); } },
    value() { return value; }
  };
}

test("materialized pinned DeliveryRequest v1 template succeeds through the importable CLI path", async () => {
  const cli = await loadCliModule();
  assert.equal(typeof cli.runDeliveryKernelCli, "function");
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-live-"));
  try {
    const requestPath = path.join(fixture, "request.json");
    const request = readPinnedDeliveryRequestSync(TEMPLATE, ROOT);
    writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`, "utf8");
    const stdout = outputSink();
    const stderr = outputSink();

    const result = await cli.runDeliveryKernelCli({
      argv: ["--input", requestPath],
      cwd: ROOT,
      stdout: stdout.stream,
      stderr: stderr.stream,
    });

    assert.equal(stderr.value(), "");
    assert.match(stdout.value(), /^\{[\s\S]*\}\n$/);
    assert.deepEqual(JSON.parse(stdout.value()), result);
    assert.equal(result.request.schemaVersion, "1.0.0");
    assert.equal(result.task.id, "TASK-001");
    assert.equal(result.team.lead, null);
    assert.deepEqual(result.team.assignments, []);
    assert.equal(result.domain.sourceGovernance.status, "blocked");
    assert.equal(result.codex.executionStatus, "blocked");
    assert.equal(result.domain.status, "blocked");
    assert.equal(result.projectInspection.inspectionMode, "read-only");
    assert.equal(result.evidence.disposition, "blocked");
    assert.ok(result.routing.decisions.length >= 50);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("raw committed DeliveryRequest placeholder remains non-runnable", async () => {
  const cli = await loadCliModule();
  const stdout = outputSink();
  const stderr = outputSink();

  await assert.rejects(
    cli.runDeliveryKernelCli({
      argv: ["--input", TEMPLATE],
      cwd: ROOT,
      stdout: stdout.stream,
      stderr: stderr.stream
    }),
    /does not match expectedCommit 0000000000000000000000000000000000000000/
  );
  assert.equal(stdout.value(), "");
  assert.equal(stderr.value(), "");
});

test("importable CLI rejects the previous flat request with the exact migration message and no stdout", async () => {
  const cli = await loadCliModule();
  assert.equal(typeof cli.runDeliveryKernelCli, "function");
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-cli-"));
  try {
    const requestPath = path.join(fixture, "flat-request.json");
    writeFileSync(requestPath, `${JSON.stringify({
      id: "TASK-OLD",
      goal: "Old request",
      platform: "web-saas",
      requiredEvidence: ["tests"],
      detectedTools: ["codeql"],
      projectCommands: { codeql: "codeql database analyze" }
    }, null, 2)}\n`, "utf8");
    const stdout = outputSink();
    const stderr = outputSink();

    await assert.rejects(
      cli.runDeliveryKernelCli({
        argv: ["--input", requestPath],
        stdout: stdout.stream,
        stderr: stderr.stream,
      }),
      (error) => error?.message === DELIVERY_REQUEST_V1_MIGRATION_MESSAGE
    );
    assert.equal(stdout.value(), "");
    assert.equal(stderr.value(), "");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
