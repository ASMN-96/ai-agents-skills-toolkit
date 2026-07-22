#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertDeliveryRequest } from "./ai-toolkit/kernel/contracts.mjs";
import {
  EXPECTED_OBSERVED_TASK_IDS,
  OBSERVED_RECORD_RELATIVE_PATH,
  buildObservedBenchmarkRunPacket,
  parseObservedBenchmarkRunPacketArguments
} from "./ai-toolkit/prepare-observed-benchmark-run-packet.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CLI = path.join(ROOT, "scripts", "ai-toolkit", "prepare-observed-benchmark-run-packet.mjs");
const MAINTENANCE_GATES = [
  "enterprise-product-acceptance",
  "web-runtime-security-quality",
  "web-wcag-22-aa",
  "web-browser-interaction"
];

test("preparation packets are valid and preserve canonical policy bindings for every observed task and variant", async () => {
  for (const taskId of EXPECTED_OBSERVED_TASK_IDS) {
    for (const variant of ["baseline", "kernel-routed"]) {
      const packet = await buildObservedBenchmarkRunPacket({ root: ROOT, taskId, variant, run: 1 });
      assert.equal(packet.schemaVersion, "1.0.0");
      assert.equal(packet.preparationStatus, "model-not-invoked");
      assert.equal(packet.evidenceStatus, "preparation-only");
      assert.equal(packet.observedRecord.status, "not-measured");
      assert.equal(Object.hasOwn(packet, "modelTelemetry"), false);
      assert.equal(Object.hasOwn(packet, "humanReview"), false);
      assert.equal(Object.hasOwn(packet, "benchmarkOutcome"), false);
      assert.equal(packet.canonicalTask.id, taskId);
      assert.equal(packet.fixture.id, taskId);
      assert.match(packet.fixture.digest, /^sha256:[0-9a-f]{64}$/u);
      assert.equal(packet.run.variant, variant);
      assert.equal(packet.run.number, 1);
      assert.ok(packet.selectedResources.ids.length > 0);
      assert.ok(packet.selectedResources.toolkitControlledInputTokenEstimate > 0);
      assert.deepEqual(packet.deliveryRequest.task.gates, packet.resolvedPolicy.requiredGateIds);
      assert.deepEqual(
        packet.deliveryRequest.task.acceptanceCriteria.flatMap(({ requiredGateIds }) => requiredGateIds),
        packet.resolvedPolicy.requiredGateIds
      );
      assert.doesNotThrow(() => assertDeliveryRequest(packet.deliveryRequest, {
        registeredScenarios: [packet.canonicalTask.scenario],
        policyGateIds: packet.resolvedPolicy.requiredGateIds
      }));
      if (variant === "kernel-routed") {
        assert.deepEqual(packet.selectedResources.ids, packet.canonicalTask.goldenSelectedResourceIds);
      }
    }
  }
});

test("maintenance packet derives its gates from canonical scenario and domain policy rather than fixture labels", async () => {
  const packet = await buildObservedBenchmarkRunPacket({
    root: ROOT,
    taskId: "BENCH-MAINT-01",
    variant: "kernel-routed",
    run: 2
  });
  assert.deepEqual(packet.resolvedPolicy.requiredGateIds, MAINTENANCE_GATES);
  assert.deepEqual(packet.deliveryRequest.task.gates, MAINTENANCE_GATES);
});

test("packet generator rejects invalid task, variant, run, and output-path inputs", async () => {
  await assert.rejects(
    () => buildObservedBenchmarkRunPacket({ root: ROOT, taskId: "BENCH-IOS-01", variant: "baseline", run: 1 }),
    /taskId/u
  );
  await assert.rejects(
    () => buildObservedBenchmarkRunPacket({ root: ROOT, taskId: "BENCH-MAINT-01", variant: "candidate", run: 1 }),
    /variant/u
  );
  await assert.rejects(
    () => buildObservedBenchmarkRunPacket({ root: ROOT, taskId: "BENCH-MAINT-01", variant: "baseline", run: 4 }),
    /run/u
  );
  await assert.rejects(
    () => buildObservedBenchmarkRunPacket({
      root: ROOT,
      taskId: "BENCH-MAINT-01",
      variant: "baseline",
      run: 1,
      outputPath: "../unsafe.json"
    }),
    /unknown input field: outputPath/u
  );
  assert.throws(
    () => parseObservedBenchmarkRunPacketArguments([
      "--task-id", "BENCH-MAINT-01", "--variant", "baseline", "--run", "1", "--output", "unsafe.json"
    ]),
    /unknown argument: --output/u
  );
});

test("CLI emits exactly one stdout packet and never mutates the observed benchmark record", () => {
  const recordPath = path.join(ROOT, OBSERVED_RECORD_RELATIVE_PATH);
  const before = readFileSync(recordPath, "utf8");
  const result = spawnSync(process.execPath, [CLI,
    "--task-id", "BENCH-SOURCE-RELEASE-01",
    "--variant", "kernel-routed",
    "--run", "3"
  ], { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.run.number, 3);
  assert.equal(packet.preparationStatus, "model-not-invoked");
  assert.equal(readFileSync(recordPath, "utf8"), before);
});
