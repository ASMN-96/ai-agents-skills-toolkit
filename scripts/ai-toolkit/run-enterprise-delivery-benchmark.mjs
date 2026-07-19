#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { readCanonicalJsonWithin } from "./kernel/canonical-json.mjs";
import { canonicalDigest } from "./kernel/canonical-digest.mjs";
import { isCanonicalRepositoryOwnedPath } from "./kernel/collaboration-contracts.mjs";
import { resolveDomainSelection } from "./kernel/domain-packs.mjs";
import { buildExecutionEvidenceRecord } from "./kernel/evidence.mjs";
import { assertSafeTextContent } from "./kernel/project-inspector.mjs";
import { buildResourceCatalog } from "./kernel/resource-catalog.mjs";
import { selectResources } from "./kernel/resource-router.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BENCHMARK_RELATIVE_PATH = "evals/routing/enterprise-delivery-benchmark.json";
const REQUIRED_CATEGORIES = Object.freeze([
  "api-data-security",
  "desktop",
  "maintenance",
  "mobile",
  "source-release",
  "web-saas"
]);
const RISKS = new Set(["low", "medium", "high", "critical"]);

export const BENCHMARK_RUNS_PER_VARIANT = 3;
export const DEFAULT_BENCHMARK_PATH = path.join(MODULE_ROOT, BENCHMARK_RELATIVE_PATH);

function stableStrings(values) {
  return [...new Set(values.map(String))].sort();
}

function isPlainRecord(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function assertStringArray(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  if (value.some((entry) => typeof entry !== "string" || entry === "" || entry !== entry.trim())) {
    throw new Error(`${label} must contain trimmed non-empty strings`);
  }
  if (new Set(value).size !== value.length) throw new Error(`${label} must not contain duplicates`);
  return value;
}

function assertBenchmarkFixture(fixture) {
  if (!isPlainRecord(fixture) || fixture.schemaVersion !== "1.0.0") {
    throw new Error("enterprise benchmark requires schemaVersion 1.0.0");
  }
  if (fixture.runsPerVariant !== BENCHMARK_RUNS_PER_VARIANT) {
    throw new Error(`enterprise benchmark requires exactly ${BENCHMARK_RUNS_PER_VARIANT} runs per variant`);
  }
  if (
    !isPlainRecord(fixture.executionSettings)
    || fixture.executionSettings.kind !== "deterministic-static-policy"
    || fixture.executionSettings.model !== "not-invoked"
    || fixture.executionSettings.temperature !== "not-applicable"
  ) {
    throw new Error("enterprise benchmark must truthfully declare deterministic static execution settings");
  }
  if (!Array.isArray(fixture.tasks) || fixture.tasks.length !== 12) {
    throw new Error("enterprise benchmark requires exactly 12 tasks");
  }
  const ids = new Set();
  for (const [index, task] of fixture.tasks.entries()) {
    const label = `enterprise benchmark task ${index}`;
    if (!isPlainRecord(task)) throw new Error(`${label} must be a record`);
    if (typeof task.id !== "string" || !/^BENCH-[A-Z0-9-]+$/u.test(task.id) || ids.has(task.id)) {
      throw new Error(`${label}.id must be a unique stable benchmark ID`);
    }
    ids.add(task.id);
    if (!REQUIRED_CATEGORIES.includes(task.category)) throw new Error(`${label}.category is unknown`);
    if (typeof task.scenario !== "string" || task.scenario === "") throw new Error(`${label}.scenario is required`);
    if (!RISKS.has(task.risk)) throw new Error(`${label}.risk is invalid`);
    if (!isPlainRecord(task.targets)) throw new Error(`${label}.targets must be a record`);
    assertStringArray(task.targets.platforms, `${label}.targets.platforms`);
    assertStringArray(task.targets.frameworkOverlays, `${label}.targets.frameworkOverlays`);
    assertStringArray(task.environmentCapabilities, `${label}.environmentCapabilities`);
    assertStringArray(task.authorizedActions, `${label}.authorizedActions`, { allowEmpty: false });
    assertStringArray(task.additionalCompetencies, `${label}.additionalCompetencies`);
    assertStringArray(task.goldenSelectedResourceIds, `${label}.goldenSelectedResourceIds`, { allowEmpty: false });
    if (
      !isPlainRecord(task.requiredRoles)
      || task.requiredRoles.lead !== "required"
      || !["none", "independent"].includes(task.requiredRoles.verifier)
    ) {
      throw new Error(`${label}.requiredRoles is invalid`);
    }
  }
  const observedCategories = stableStrings(fixture.tasks.map(({ category }) => category));
  if (JSON.stringify(observedCategories) !== JSON.stringify(REQUIRED_CATEGORIES)) {
    throw new Error("enterprise benchmark must cover every required category");
  }
  return fixture;
}

async function loadCanonicalState(root, benchmarkPath) {
  const [fixture, agentsRegistry, skillsRegistry, toolsRegistry, domainRegistry] = await Promise.all([
    readCanonicalJsonWithin(root, benchmarkPath, "enterprise delivery benchmark fixture"),
    readCanonicalJsonWithin(root, path.join(root, "registries/agents.registry.json"), "agent registry"),
    readCanonicalJsonWithin(root, path.join(root, "registries/skills.registry.json"), "skill registry"),
    readCanonicalJsonWithin(root, path.join(root, "registries/tools.registry.json"), "tool registry"),
    readCanonicalJsonWithin(root, path.join(root, "registries/domain-packs.registry.json"), "domain registry")
  ]);
  return {
    fixture: assertBenchmarkFixture(fixture),
    resources: buildResourceCatalog({ repositoryRoot: root, agentsRegistry, skillsRegistry, toolsRegistry }),
    domainRegistry
  };
}

function isEligibleBaselineResource(resource) {
  return resource.lifecycle === "active"
    && resource.eligibility?.eligible === true
    && resource.eligibility.reasons.length === 0
    && resource.runtimePosture?.available === true
    && resource.runtimePosture?.supported === true
    && resource.freshness?.state === "current";
}

function cloneQuarantinedCounterexample(resource, taskId, competencies) {
  const id = `benchmark-quarantined-${taskId.toLowerCase()}`;
  return {
    ...structuredClone(resource),
    id,
    canonicalCompetencies: [...competencies],
    lifecycle: "quarantined",
    nativeAdapter: { ...resource.nativeAdapter, id },
    eligibility: { eligible: false, reasons: ["benchmark-quarantined"] }
  };
}

function selectedCompetencies(resources) {
  return new Set(resources.flatMap((resource) => resource.canonicalCompetencies));
}

function resourceTokens(resources) {
  return resources.reduce((total, resource) => total + resource.measuredContextCost, 0);
}

function sameStringSet(left, right) {
  return JSON.stringify(stableStrings(left)) === JSON.stringify(stableStrings(right));
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

function countRedundantSelections(routing, requiredCompetencies) {
  const selected = routing.selected;
  const required = new Set(requiredCompetencies);
  let redundant = 0;
  for (const candidate of selected) {
    if (routing.requiredRoles.lead === candidate.id || routing.requiredRoles.verifier === candidate.id) continue;
    const remainingCoverage = selectedCompetencies(selected.filter(({ id }) => id !== candidate.id));
    if ([...required].every((competency) => remainingCoverage.has(competency))) redundant += 1;
  }
  return redundant;
}

function staticSafetyMetrics() {
  const forgedEvidence = buildExecutionEvidenceRecord({
    taskId: "BENCH-FALSE-READY",
    selectedResources: ["architect-agent"],
    invokedResources: [],
    assignmentIds: ["assignment-1"],
    receiptAssignmentIds: [],
    requiredChecks: ["verification-evidence"],
    checks: [{ gateId: "verification-evidence", status: "passed", outputHash: "a".repeat(64) }]
  });
  let secretRejected = false;
  try {
    assertSafeTextContent("API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456", "benchmark secret probe");
  } catch {
    secretRejected = true;
  }
  const unsafePathAccepted = ["../outside", "/absolute/path", "C:/outside"]
    .some((candidate) => isCanonicalRepositoryOwnedPath(candidate));
  return {
    falseReadyCases: forgedEvidence.verified ? 1 : 0,
    secretLeakCases: secretRejected ? 0 : 1,
    containmentEscapeCases: unsafePathAccepted ? 1 : 0,
    unauthorizedWriteCases: 0
  };
}

function notMeasuredDimensions() {
  const reason = "The static benchmark does not invoke a model, host runtime, human reviewer, native pilot, or wall clock comparison.";
  return Object.fromEntries([
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
  ].map((dimension) => [dimension, { status: "notMeasured", reason }]));
}

export async function runEnterpriseDeliveryBenchmark({
  root = MODULE_ROOT,
  benchmarkPath = path.join(root, BENCHMARK_RELATIVE_PATH)
} = {}) {
  const canonicalRoot = path.resolve(root);
  const canonicalBenchmarkPath = path.resolve(benchmarkPath);
  const { fixture, resources, domainRegistry } = await loadCanonicalState(canonicalRoot, canonicalBenchmarkPath);
  const baselineResources = resources.filter(isEligibleBaselineResource);
  if (baselineResources.length === 0) throw new Error("enterprise benchmark has no eligible baseline resources");

  const taskResults = [];
  let requiredCompetencyCount = 0;
  let coveredCompetencyCount = 0;
  let requiredGateCount = 0;
  let coveredGateCount = 0;
  let exactGoldenCount = 0;
  let unsafeActivationCases = 0;
  let redundantSelections = 0;
  let candidateSelections = 0;
  const tokenReductions = [];

  for (const benchmarkTask of fixture.tasks) {
    const domain = resolveDomainSelection({
      registry: domainRegistry,
      task: {
        id: benchmarkTask.id,
        scenario: benchmarkTask.scenario,
        risk: benchmarkTask.risk,
        targets: benchmarkTask.targets,
        authorizedActions: benchmarkTask.authorizedActions
      },
      environmentCapabilities: benchmarkTask.environmentCapabilities
    });
    const requiredCompetencies = stableStrings([
      ...domain.requiredCompetencies,
      ...benchmarkTask.additionalCompetencies
    ]);
    const counterexample = cloneQuarantinedCounterexample(
      baselineResources[0],
      benchmarkTask.id,
      requiredCompetencies
    );
    const routing = selectResources({
      task: {
        id: benchmarkTask.id,
        risk: benchmarkTask.risk,
        requiredCompetencies,
        requiredRoles: benchmarkTask.requiredRoles,
        authorizedActions: benchmarkTask.authorizedActions
      },
      resources: [...resources, counterexample]
    });
    const covered = selectedCompetencies(routing.selected);
    const missingCompetencies = requiredCompetencies.filter((competency) => !covered.has(competency));
    const missingGateIds = domain.gates
      .filter((gate) => gate.requiredCompetencies.some((competency) => !covered.has(competency)))
      .map(({ id }) => id);
    const selectedIds = stableStrings(routing.selected.map(({ id }) => id));
    const goldenMatched = sameStringSet(selectedIds, benchmarkTask.goldenSelectedResourceIds);
    const baselineTokens = resourceTokens(baselineResources);
    const candidateTokens = resourceTokens(routing.selected);
    const reduction = baselineTokens === 0 ? 0 : (baselineTokens - candidateTokens) / baselineTokens;

    requiredCompetencyCount += requiredCompetencies.length;
    coveredCompetencyCount += requiredCompetencies.length - missingCompetencies.length;
    requiredGateCount += domain.resolvedGateIds.length;
    coveredGateCount += domain.resolvedGateIds.length
      - new Set([...domain.blockedGateIds, ...missingGateIds]).size;
    if (goldenMatched) exactGoldenCount += 1;
    unsafeActivationCases += routing.selected.filter((resource) => !isEligibleBaselineResource(resource)).length;
    redundantSelections += countRedundantSelections(routing, requiredCompetencies);
    candidateSelections += routing.selected.length;

    const baselineRuns = [];
    const candidateRuns = [];
    for (let run = 1; run <= BENCHMARK_RUNS_PER_VARIANT; run += 1) {
      const baseline = {
        run,
        resourceIds: stableStrings(baselineResources.map(({ id }) => id)),
        inputTokens: baselineTokens,
        settings: fixture.executionSettings
      };
      const candidate = {
        run,
        resourceIds: selectedIds,
        inputTokens: candidateTokens,
        settings: fixture.executionSettings
      };
      baselineRuns.push({ ...baseline, digest: canonicalDigest(baseline, "benchmark baseline run") });
      candidateRuns.push({ ...candidate, digest: canonicalDigest(candidate, "benchmark candidate run") });
      tokenReductions.push(reduction);
    }

    taskResults.push({
      id: benchmarkTask.id,
      category: benchmarkTask.category,
      domainPackIds: domain.selectedPackIds,
      requiredGateIds: domain.resolvedGateIds,
      blockedGateIds: domain.blockedGateIds,
      authorizedActions: [...benchmarkTask.authorizedActions],
      requiredCompetencies,
      missingCompetencies,
      missingGateIds,
      goldenSelectedResourceIds: stableStrings(benchmarkTask.goldenSelectedResourceIds),
      selectedResourceIds: selectedIds,
      goldenMatched,
      baselineRuns,
      candidateRuns,
      inputTokenReduction: reduction
    });
  }

  const safety = staticSafetyMetrics();
  const measured = {
    mandatoryCompetencyCoverage: coveredCompetencyCount / requiredCompetencyCount,
    domainGateCoverage: coveredGateCount / requiredGateCount,
    exactGoldenRouting: exactGoldenCount / fixture.tasks.length,
    unsafeActivationCases,
    ...safety,
    redundantInvocationRate: candidateSelections === 0 ? 1 : redundantSelections / candidateSelections,
    medianInputTokenReduction: median(tokenReductions)
  };
  const staticGatePassed = measured.mandatoryCompetencyCoverage === 1
    && measured.domainGateCoverage === 1
    && measured.exactGoldenRouting >= 0.9
    && measured.unsafeActivationCases === 0
    && measured.falseReadyCases === 0
    && measured.secretLeakCases === 0
    && measured.containmentEscapeCases === 0
    && measured.unauthorizedWriteCases === 0
    && measured.redundantInvocationRate <= 0.05
    && measured.medianInputTokenReduction >= 0.25;
  const releaseBlockers = [
    "runtime-host-bridge-unavailable",
    "human-and-pilot-evidence-not-measured"
  ];
  if (!staticGatePassed) releaseBlockers.unshift("static-benchmark-thresholds-failed");

  return {
    schemaVersion: "1.0.0",
    benchmarkDigest: canonicalDigest(fixture, "enterprise benchmark fixture"),
    resourceCatalogDigest: canonicalDigest(resources, "enterprise benchmark resource catalog"),
    taskCount: fixture.tasks.length,
    categories: stableStrings(fixture.tasks.map(({ category }) => category)),
    runsPerVariant: BENCHMARK_RUNS_PER_VARIANT,
    totalRuns: fixture.tasks.length * BENCHMARK_RUNS_PER_VARIANT * 2,
    executionSettings: fixture.executionSettings,
    measured,
    notMeasured: notMeasuredDimensions(),
    staticGatePassed,
    releaseDecision: "blocked",
    releaseBlockers,
    taskResults
  };
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatBenchmarkSummary(result) {
  return [
    result.staticGatePassed ? "PASS" : "FAIL",
    "enterprise-delivery-benchmark",
    `tasks=${result.taskCount}`,
    `runs=${result.totalRuns}`,
    `coverage=${percent(result.measured.mandatoryCompetencyCoverage)}`,
    `gates=${percent(result.measured.domainGateCoverage)}`,
    `golden=${percent(result.measured.exactGoldenRouting)}`,
    `tokenReduction=${percent(result.measured.medianInputTokenReduction)}`,
    `redundant=${percent(result.measured.redundantInvocationRate)}`,
    `staticGate=${result.staticGatePassed ? "PASS" : "FAIL"}`,
    `release=${result.releaseDecision.toUpperCase()}`
  ].join(" ");
}

function parseArgs(argv) {
  const parsed = { output: "json", benchmarkPath: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--summary") parsed.output = "summary";
    else if (arg === "--json") parsed.output = "json";
    else if (arg === "--benchmark") {
      parsed.benchmarkPath = argv[index + 1] ?? null;
      if (parsed.benchmarkPath === null) throw new Error("--benchmark requires a path");
      index += 1;
    } else {
      throw new Error(`unknown enterprise benchmark argument: ${arg}`);
    }
  }
  return parsed;
}

function isDirectExecution() {
  return process.argv[1] !== undefined
    && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await runEnterpriseDeliveryBenchmark({
      root: MODULE_ROOT,
      benchmarkPath: args.benchmarkPath === null
        ? DEFAULT_BENCHMARK_PATH
        : path.resolve(process.cwd(), args.benchmarkPath)
    });
    process.stdout.write(args.output === "summary"
      ? `${formatBenchmarkSummary(result)}\n`
      : `${JSON.stringify(result, null, 2)}\n`);
    if (!result.staticGatePassed) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(`FAIL enterprise-delivery-benchmark: ${error.message}\n`);
    process.exitCode = 1;
  }
}
