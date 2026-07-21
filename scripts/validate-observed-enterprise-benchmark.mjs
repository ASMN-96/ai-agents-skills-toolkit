#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { canonicalTextSha256 } from "./ai-toolkit/kernel/canonical-digest.mjs";
import { assertRegularFileWithin } from "../install/safe-filesystem.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const OBSERVED_BENCHMARK_RELATIVE_PATH = "evals/observed/enterprise-core-v0.3.json";
const FIXTURE_DIRECTORY = "evals/observed/fixtures";
export const EXPECTED_TASK_IDS = Object.freeze([
  "BENCH-MAINT-01",
  "BENCH-WEB-01",
  "BENCH-WEB-UX-02",
  "BENCH-API-01",
  "BENCH-SOURCE-RELEASE-01"
]);
const VARIANTS = Object.freeze(["baseline", "kernel-routed"]);
const RUNS_PER_VARIANT = 3;
const TEMPLATE_FIELDS = Object.freeze([
  "schemaVersion", "status", "evidenceType", "toolkitCommit", "hostTrust", "model", "variantSettings",
  "taskIds", "runsPerVariant", "fixtureDigests", "runs", "summary", "ownerReview"
]);
const RUN_FIELDS = Object.freeze([
  "taskId", "variant", "run", "fixtureDigest", "resultArtifact"
]);
const SETTINGS_BINDING_FIELDS = Object.freeze(["path", "sha256"]);
const SETTINGS_ARTIFACT_FIELDS = Object.freeze([
  "schemaVersion", "variant", "modelId", "reasoningLevel", "fixtureCopy", "productRepositoryAccess",
  "productSourceAccess", "remoteAccess", "runtimeSettings"
]);
const RESULT_ARTIFACT_FIELDS = Object.freeze([
  "schemaVersion", "taskId", "variant", "run", "fixtureDigest", "settingsDigest", "outcome", "mandatoryCompetencyCovered",
  "requiredGatesCovered", "exactGoldenRouting", "finalAcceptance", "firstPassAccepted",
  "escapedCriticalOrHighDefects", "falseReadyCases", "secretLeakCases", "unauthorizedWriteCases",
  "redundantInvocation", "toolkitControlledInputTokens", "verifiedResultDurationMs", "humanReview"
]);
const SUMMARY_FIELDS = Object.freeze([
  "mandatoryCompetencyCoverage", "requiredGateCoverage", "exactGoldenRouting", "firstPassAcceptance",
  "finalAcceptance", "escapedCriticalOrHighDefects", "falseReadyCases", "secretLeakCases",
  "unauthorizedWriteCases", "redundantInvocationRate", "medianToolkitControlledInputTokenReduction",
  "medianTimeToVerifiedResultRatio", "humanCorrectnessAverage", "humanUsefulnessAverage",
  "humanTraceabilityAverage", "lowestHumanDimension"
]);

function fail(code) {
  throw new Error(`observed-benchmark:${code}`);
}

function isPlainRecord(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function hasExactFields(value, fields) {
  return isPlainRecord(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(fields);
}

function assertRepositoryPath(root, relativePath, label) {
  if (typeof relativePath !== "string" || relativePath === "" || path.isAbsolute(relativePath) || relativePath.includes("\\")) {
    fail(`${label}-path`);
  }
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) fail(`${label}-outside-root`);
  return resolved;
}

function readRegularJson(root, relativePath, label) {
  const resolved = assertRepositoryPath(root, relativePath, label);
  try {
    assertRegularFileWithin(root, resolved, label);
    const contents = readFileSync(resolved, "utf8");
    assertRegularFileWithin(root, resolved, `${label} post-read`);
    return { value: JSON.parse(contents), digest: `sha256:${canonicalTextSha256(Buffer.from(contents, "utf8"))}` };
  } catch (error) {
    fail(`${label}-unsafe-or-invalid:${error.message}`);
  }
}

function assertTaskIds(taskIds) {
  if (JSON.stringify(taskIds) !== JSON.stringify(EXPECTED_TASK_IDS)) fail("task-ids");
}

function assertFixtureDigests(root, fixtureDigests) {
  if (!isPlainRecord(fixtureDigests) || JSON.stringify(Object.keys(fixtureDigests)) !== JSON.stringify(EXPECTED_TASK_IDS)) {
    fail("fixture-digests");
  }
  for (const taskId of EXPECTED_TASK_IDS) {
    const filename = `${taskId.toLowerCase()}.json`;
    const fixture = readRegularJson(root, `${FIXTURE_DIRECTORY}/${filename}`, `fixture-${taskId}`);
    if (!hasExactFields(fixture.value, ["id", "input", "executionBoundary", "goldenValidator"])
      || fixture.value.id !== taskId
      || fixture.value.executionBoundary?.productRepositoryAccess !== "forbidden"
      || fixture.value.executionBoundary?.productSourceAccess !== "forbidden"
      || fixture.value.executionBoundary?.remoteAccess !== "forbidden"
      || fixture.value.executionBoundary?.freshFixtureCopyPerRun !== true
      || fixture.value.goldenValidator?.expectedTaskId !== taskId
      || fixtureDigests[taskId] !== fixture.digest) {
      fail(`fixture-digest-${taskId}`);
    }
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function normalizedMetric(value) {
  return Math.round(value * 1_000_000_000_000) / 1_000_000_000_000;
}

function validateSettingsArtifact(root, variant, binding, modelId) {
  const artifactVariant = variant === "baseline" ? "baseline" : "candidate";
  if (!hasExactFields(binding, SETTINGS_BINDING_FIELDS)
    || typeof binding.path !== "string"
    || binding.path !== `evals/observed/settings/${artifactVariant}.json`
    || !/^sha256:[0-9a-f]{64}$/u.test(binding.sha256)) fail("settings-binding");
  const settings = readRegularJson(root, binding.path, `settings-${variant}`);
  if (settings.digest !== binding.sha256
    || !hasExactFields(settings.value, SETTINGS_ARTIFACT_FIELDS)
    || settings.value.schemaVersion !== "1.0.0"
    || settings.value.variant !== variant
    || settings.value.modelId !== modelId
    || settings.value.reasoningLevel !== "high"
    || settings.value.fixtureCopy !== "fresh-per-run"
    || settings.value.productRepositoryAccess !== "forbidden"
    || settings.value.productSourceAccess !== "forbidden"
    || settings.value.remoteAccess !== "forbidden"
    || !hasExactFields(settings.value.runtimeSettings, ["toolAccess", "workspaceScope"])
    || settings.value.runtimeSettings.toolAccess !== "toolkit-only"
    || settings.value.runtimeSettings.workspaceScope !== "fixture-only") fail("settings-artifact");
  return settings.value;
}

function validateVariantSettings(root, bindings, modelId) {
  if (!hasExactFields(bindings, ["baseline", "kernel-routed"])) fail("settings-bindings");
  const settings = Object.fromEntries(VARIANTS.map((variant) => [
    variant,
    validateSettingsArtifact(root, variant, bindings[variant], modelId)
  ]));
  if (settings.baseline.reasoningLevel !== settings["kernel-routed"].reasoningLevel
    || JSON.stringify(settings.baseline.runtimeSettings) !== JSON.stringify(settings["kernel-routed"].runtimeSettings)) {
    fail("settings-not-equivalent");
  }
  return settings;
}

function validateRunResultArtifact(root, run, fixtureDigests, variantSettings) {
  const artifactVariant = run.variant === "baseline" ? "baseline" : "candidate";
  if (!hasExactFields(run, RUN_FIELDS)
    || !EXPECTED_TASK_IDS.includes(run.taskId)
    || !VARIANTS.includes(run.variant)
    || !Number.isInteger(run.run) || run.run < 1 || run.run > RUNS_PER_VARIANT
    || run.fixtureDigest !== fixtureDigests[run.taskId]
    || !hasExactFields(run.resultArtifact, ["path", "sha256"])
    || typeof run.resultArtifact.path !== "string"
    || !/^sha256:[0-9a-f]{64}$/u.test(run.resultArtifact.sha256)) fail("run-schema");
  if (run.resultArtifact.path !== `evals/observed/runs/${run.taskId}/${artifactVariant}-${run.run}.json`) {
    fail("run-result-binding");
  }
  const result = readRegularJson(root, run.resultArtifact.path, `run-result-${run.taskId}-${run.variant}-${run.run}`);
  if (result.digest !== run.resultArtifact.sha256
    || !hasExactFields(result.value, RESULT_ARTIFACT_FIELDS)
    || result.value.schemaVersion !== "1.0.0"
    || result.value.taskId !== run.taskId
    || result.value.variant !== run.variant
    || result.value.run !== run.run
    || result.value.fixtureDigest !== run.fixtureDigest
    || result.value.settingsDigest !== variantSettings[run.variant]
    || result.value.outcome !== "accepted"
    || ["mandatoryCompetencyCovered", "requiredGatesCovered", "exactGoldenRouting", "finalAcceptance", "firstPassAccepted", "redundantInvocation"].some((field) => typeof result.value[field] !== "boolean")
    || ["escapedCriticalOrHighDefects", "falseReadyCases", "secretLeakCases", "unauthorizedWriteCases", "toolkitControlledInputTokens", "verifiedResultDurationMs"].some((field) => !Number.isFinite(result.value[field]) || result.value[field] < 0)
    || !hasExactFields(result.value.humanReview, ["correctness", "usefulness", "traceability"])
    || [result.value.humanReview.correctness, result.value.humanReview.usefulness, result.value.humanReview.traceability].some((score) => !Number.isFinite(score) || score < 0 || score > 5)) {
    fail("run-result-artifact");
  }
  return result.value;
}

function deriveSummary(runs) {
  const rate = (field) => runs.filter((run) => run[field]).length / runs.length;
  const total = (field) => runs.reduce((sum, run) => sum + run[field], 0);
  const byPair = new Map();
  for (const run of runs) byPair.set(`${run.taskId}:${run.run}:${run.variant}`, run);
  const pairs = EXPECTED_TASK_IDS.flatMap((taskId) => [1, 2, 3].map((run) => [
    byPair.get(`${taskId}:${run}:baseline`),
    byPair.get(`${taskId}:${run}:kernel-routed`)
  ]));
  const tokenReductions = pairs.map(([baseline, candidate]) => (
    baseline.toolkitControlledInputTokens === 0 ? 0 : 1 - (candidate.toolkitControlledInputTokens / baseline.toolkitControlledInputTokens)
  ));
  const timeRatios = pairs.map(([baseline, candidate]) => (
    baseline.verifiedResultDurationMs === 0 ? 1 : candidate.verifiedResultDurationMs / baseline.verifiedResultDurationMs
  ));
  const scores = (field) => runs.map((run) => run.humanReview[field]);
  const allScores = ["correctness", "usefulness", "traceability"].flatMap(scores);
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    mandatoryCompetencyCoverage: normalizedMetric(rate("mandatoryCompetencyCovered")),
    requiredGateCoverage: normalizedMetric(rate("requiredGatesCovered")),
    exactGoldenRouting: normalizedMetric(rate("exactGoldenRouting")),
    firstPassAcceptance: normalizedMetric(rate("firstPassAccepted")),
    finalAcceptance: normalizedMetric(rate("finalAcceptance")),
    escapedCriticalOrHighDefects: total("escapedCriticalOrHighDefects"),
    falseReadyCases: total("falseReadyCases"),
    secretLeakCases: total("secretLeakCases"),
    unauthorizedWriteCases: total("unauthorizedWriteCases"),
    redundantInvocationRate: normalizedMetric(rate("redundantInvocation")),
    medianToolkitControlledInputTokenReduction: normalizedMetric(median(tokenReductions)),
    medianTimeToVerifiedResultRatio: normalizedMetric(median(timeRatios)),
    humanCorrectnessAverage: normalizedMetric(average(scores("correctness"))),
    humanUsefulnessAverage: normalizedMetric(average(scores("usefulness"))),
    humanTraceabilityAverage: normalizedMetric(average(scores("traceability"))),
    lowestHumanDimension: Math.min(...allScores)
  };
}

function validateMeasured(root, record, expectedCommit) {
  if (!/^[0-9a-f]{40}$/u.test(record.toolkitCommit) || (expectedCommit !== undefined && record.toolkitCommit !== expectedCommit)) {
    fail("toolkit-commit");
  }
  if (!hasExactFields(record.model, ["id"]) || record.model.id !== "gpt-5.6-terra") fail("model-settings");
  validateVariantSettings(root, record.variantSettings, record.model.id);
  if (!Array.isArray(record.runs) || record.runs.length !== EXPECTED_TASK_IDS.length * VARIANTS.length * RUNS_PER_VARIANT) fail("runs-incomplete");
  const keys = new Set();
  const results = [];
  for (const run of record.runs) {
    results.push(validateRunResultArtifact(root, run, record.fixtureDigests, Object.fromEntries(
      VARIANTS.map((variant) => [variant, record.variantSettings[variant].sha256])
    )));
    const key = `${run.taskId}:${run.variant}:${run.run}`;
    if (keys.has(key)) fail("runs-duplicate");
    keys.add(key);
  }
  if (keys.size !== EXPECTED_TASK_IDS.length * VARIANTS.length * RUNS_PER_VARIANT) fail("runs-incomplete");
  if (!hasExactFields(record.summary, SUMMARY_FIELDS)) fail("summary-schema");
  const derived = deriveSummary(results);
  if (JSON.stringify(record.summary) !== JSON.stringify(derived)) fail("summary-derived");
  if (!hasExactFields(record.ownerReview, ["identity", "decision", "approvedAt"])
    || record.ownerReview.identity !== "repository-owner:abdal"
    || record.ownerReview.decision !== "approved"
    || typeof record.ownerReview.approvedAt !== "string"
    || Number.isNaN(Date.parse(record.ownerReview.approvedAt))
    || Date.parse(record.ownerReview.approvedAt) > Date.now()) fail("owner-review");
  const thresholdChecks = [
    ["mandatory-competency-coverage", record.summary.mandatoryCompetencyCoverage === 1],
    ["required-gate-coverage", record.summary.requiredGateCoverage === 1],
    ["exact-golden-routing", record.summary.exactGoldenRouting >= 0.9],
    ["first-pass-acceptance", record.summary.firstPassAcceptance >= 0.85],
    ["final-acceptance", record.summary.finalAcceptance === 1],
    ["escaped-critical-or-high-defects", record.summary.escapedCriticalOrHighDefects === 0],
    ["false-ready-cases", record.summary.falseReadyCases === 0],
    ["secret-leak-cases", record.summary.secretLeakCases === 0],
    ["unauthorized-write-cases", record.summary.unauthorizedWriteCases === 0],
    ["redundant-invocation-rate", record.summary.redundantInvocationRate <= 0.05],
    ["median-toolkit-controlled-input-token-reduction", record.summary.medianToolkitControlledInputTokenReduction >= 0.25],
    ["median-time-to-verified-result", record.summary.medianTimeToVerifiedResultRatio <= 1],
    ["human-correctness-average", record.summary.humanCorrectnessAverage >= 4],
    ["human-usefulness-average", record.summary.humanUsefulnessAverage >= 4],
    ["human-traceability-average", record.summary.humanTraceabilityAverage >= 4],
    ["lowest-human-dimension", record.summary.lowestHumanDimension >= 3.5]
  ];
  const failedThreshold = thresholdChecks.find(([, passed]) => !passed)?.[0] ?? null;
  if (record.status === "measured-passed" && failedThreshold !== null) fail(`threshold-${failedThreshold}`);
  if (record.status === "measured-failed" && failedThreshold === null) fail("measured-failed-without-failed-threshold");
}

export function validateObservedEnterpriseBenchmark({
  root = MODULE_ROOT,
  relativePath = OBSERVED_BENCHMARK_RELATIVE_PATH,
  record = undefined,
  expectedCommit = undefined
} = {}) {
  const loaded = record === undefined ? readRegularJson(root, relativePath, "observed-record") : null;
  const observed = record ?? loaded.value;
  if (!hasExactFields(observed, TEMPLATE_FIELDS)
    || observed.schemaVersion !== "1.0.0"
    || !["not-measured", "measured-passed", "measured-failed"].includes(observed.status)
    || observed.evidenceType !== "owner-reviewed-manual-enterprise-core-observation"
    || observed.runsPerVariant !== RUNS_PER_VARIANT) fail("schema");
  if (observed.hostTrust !== "not-trusted-host-bridge") fail("host-trust-boundary");
  assertTaskIds(observed.taskIds);
  assertFixtureDigests(root, observed.fixtureDigests);
  if (observed.status === "not-measured") {
    if (observed.toolkitCommit !== null || observed.model !== null || observed.variantSettings !== null || observed.runs.length !== 0
      || Object.keys(observed.summary).length !== 0 || observed.ownerReview !== null) fail("not-measured-template");
  } else {
    validateMeasured(root, observed, expectedCommit);
  }
  return Object.freeze({
    relativePath,
    digest: loaded?.digest ?? null,
    status: observed.status,
    toolkitCommit: observed.toolkitCommit,
    ownerReview: observed.ownerReview,
    taskIds: [...observed.taskIds],
    hostTrust: observed.hostTrust,
    releaseEligible: observed.status === "measured-passed"
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = validateObservedEnterpriseBenchmark();
    process.stdout.write(`PASS observed-enterprise-benchmark status=${result.status} releaseEligible=${result.releaseEligible}\n`);
  } catch (error) {
    process.stderr.write(`FAIL observed-enterprise-benchmark ${error.message}\n`);
    process.exitCode = 1;
  }
}
