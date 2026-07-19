#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  BENCHMARK_RUNS_PER_VARIANT,
  DEFAULT_BENCHMARK_PATH,
  formatBenchmarkSummary,
  runEnterpriseDeliveryBenchmark
} from "./ai-toolkit/run-enterprise-delivery-benchmark.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNNER = path.join(ROOT, "scripts", "ai-toolkit", "run-enterprise-delivery-benchmark.mjs");

test("enterprise benchmark is a deterministic 12-task, three-run baseline/candidate comparison", async () => {
  const first = await runEnterpriseDeliveryBenchmark({ root: ROOT });
  const second = await runEnterpriseDeliveryBenchmark({ root: ROOT });

  assert.equal(BENCHMARK_RUNS_PER_VARIANT, 3);
  assert.equal(first.taskCount, 12);
  assert.equal(first.runsPerVariant, 3);
  assert.equal(first.totalRuns, 72);
  assert.deepEqual(first.categories, [
    "api-data-security",
    "desktop",
    "maintenance",
    "mobile",
    "source-release",
    "web-saas"
  ]);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("measured static thresholds pass without manufacturing unavailable execution evidence", async () => {
  const result = await runEnterpriseDeliveryBenchmark({ root: ROOT });

  assert.equal(result.measured.mandatoryCompetencyCoverage, 1);
  assert.equal(result.measured.domainGateCoverage, 1);
  assert.ok(result.measured.exactGoldenRouting >= 0.9);
  assert.equal(result.measured.unsafeActivationCases, 0);
  assert.equal(result.measured.falseReadyCases, 0);
  assert.equal(result.measured.secretLeakCases, 0);
  assert.equal(result.measured.containmentEscapeCases, 0);
  assert.equal(result.measured.unauthorizedWriteCases, 0);
  assert.equal(result.measured.redundantInvocationRate <= 0.05, true);
  assert.equal(result.measured.medianInputTokenReduction >= 0.25, true);
  assert.equal(result.staticGatePassed, true);

  for (const dimension of [
    "modelExecution",
    "firstPassAcceptance",
    "finalAcceptance",
    "escapedDefects",
    "wallClockTiming",
    "humanCorrectness",
    "humanUsefulness",
    "humanTraceability",
    "reworkRate",
    "unsupportedClaimRate",
    "verificationCompleteness",
    "humanReviewEffort",
    "falseEscalationRate",
    "nativePilots"
  ]) {
    assert.equal(result.notMeasured[dimension].status, "notMeasured", dimension);
  }
  assert.equal(result.releaseDecision, "blocked");
  assert.ok(result.releaseBlockers.includes("runtime-host-bridge-unavailable"));
  assert.ok(result.releaseBlockers.includes("human-and-pilot-evidence-not-measured"));
});

test("benchmark CLI is stdout-only by default and emits its exact summary", () => {
  assert.equal(existsSync(DEFAULT_BENCHMARK_PATH), true);
  const before = readFileSync(DEFAULT_BENCHMARK_PATH);
  const result = spawnSync(process.execPath, [RUNNER, "--summary"], {
    cwd: ROOT,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  assert.match(result.stdout, /^PASS enterprise-delivery-benchmark /u);
  assert.deepEqual(readFileSync(DEFAULT_BENCHMARK_PATH), before);
});

test("benchmark summary keeps measured and unmeasured claims separate", async () => {
  const result = await runEnterpriseDeliveryBenchmark({ root: ROOT });
  const summary = formatBenchmarkSummary(result);

  assert.match(summary, /tasks=12/u);
  assert.match(summary, /staticGate=PASS/u);
  assert.match(summary, /release=BLOCKED/u);
  assert.doesNotMatch(summary, /enterprise-ready/u);
});
