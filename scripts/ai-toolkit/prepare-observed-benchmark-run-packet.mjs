#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { canonicalTextSha256 } from "./kernel/canonical-digest.mjs";
import { readCanonicalJsonDocumentWithin } from "./kernel/canonical-json.mjs";
import { assertDeliveryRequest } from "./kernel/contracts.mjs";
import { resolveDomainSelection } from "./kernel/domain-packs.mjs";
import { buildResourceCatalog } from "./kernel/resource-catalog.mjs";
import { selectResources } from "./kernel/resource-router.mjs";
import { assertScenarioPolicyRegistry, resolveScenarioPolicy } from "./kernel/scenario-policy.mjs";
import {
  EXPECTED_TASK_IDS,
  OBSERVED_BENCHMARK_RELATIVE_PATH,
  validateObservedEnterpriseBenchmark
} from "../validate-observed-enterprise-benchmark.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BENCHMARK_RELATIVE_PATH = "evals/routing/enterprise-delivery-benchmark.json";
const FIXTURE_DIRECTORY = "evals/observed/fixtures";
const VARIANTS = Object.freeze(["baseline", "kernel-routed"]);
const RUNS_PER_VARIANT = 3;

export const EXPECTED_OBSERVED_TASK_IDS = EXPECTED_TASK_IDS;
export const OBSERVED_RECORD_RELATIVE_PATH = OBSERVED_BENCHMARK_RELATIVE_PATH;

function isPlainRecord(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function stableStrings(values) {
  return [...new Set(values.map(String))].sort();
}

function sameStringSet(left, right) {
  return JSON.stringify(stableStrings(left)) === JSON.stringify(stableStrings(right));
}

function assertExactInput(input) {
  if (!isPlainRecord(input)) throw new Error("observed benchmark packet input must be a plain record");
  const allowed = new Set(["root", "taskId", "variant", "run"]);
  for (const field of Object.keys(input)) {
    if (!allowed.has(field)) throw new Error(`observed benchmark packet unknown input field: ${field}`);
  }
  if (typeof input.root !== "string" || input.root.trim() === "") {
    throw new Error("observed benchmark packet root must be a non-empty path");
  }
  if (!EXPECTED_TASK_IDS.includes(input.taskId)) {
    throw new Error("observed benchmark packet taskId must be one of the canonical observed task IDs");
  }
  if (!VARIANTS.includes(input.variant)) {
    throw new Error("observed benchmark packet variant must be baseline or kernel-routed");
  }
  if (!Number.isInteger(input.run) || input.run < 1 || input.run > RUNS_PER_VARIANT) {
    throw new Error("observed benchmark packet run must be an integer from 1 through 3");
  }
}

function assertObservedFixture(fixture, taskId) {
  if (!isPlainRecord(fixture)
    || JSON.stringify(Object.keys(fixture)) !== JSON.stringify(["id", "input", "executionBoundary", "goldenValidator"])
    || fixture.id !== taskId
    || typeof fixture.input !== "string"
    || fixture.input.trim() === ""
    || !isPlainRecord(fixture.executionBoundary)
    || fixture.executionBoundary.productRepositoryAccess !== "forbidden"
    || fixture.executionBoundary.productSourceAccess !== "forbidden"
    || fixture.executionBoundary.remoteAccess !== "forbidden"
    || fixture.executionBoundary.freshFixtureCopyPerRun !== true
    || !isPlainRecord(fixture.goldenValidator)
    || fixture.goldenValidator.expectedTaskId !== taskId) {
    throw new Error(`observed benchmark packet fixture binding is invalid for ${taskId}`);
  }
}

function assertCanonicalBenchmarkTask(task, taskId) {
  if (!isPlainRecord(task) || task.id !== taskId
    || typeof task.category !== "string"
    || typeof task.scenario !== "string"
    || typeof task.risk !== "string"
    || !isPlainRecord(task.targets)
    || !Array.isArray(task.environmentCapabilities)
    || !Array.isArray(task.authorizedActions)
    || !Array.isArray(task.additionalCompetencies)
    || !isPlainRecord(task.requiredRoles)
    || !Array.isArray(task.goldenSelectedResourceIds)) {
    throw new Error(`observed benchmark packet canonical task is invalid for ${taskId}`);
  }
}

function isEligibleBaselineResource(resource) {
  return resource.lifecycle === "active"
    && resource.eligibility?.eligible === true
    && resource.eligibility.reasons.length === 0
    && resource.runtimePosture?.available === true
    && resource.runtimePosture?.supported === true
    && resource.freshness?.state === "current";
}

function resourceTokenEstimate(resources) {
  return resources.reduce((total, resource) => total + resource.measuredContextCost, 0);
}

function selectedResourcePacket(resources) {
  return {
    ids: stableStrings(resources.map(({ id }) => id)),
    toolkitControlledInputTokenEstimate: resourceTokenEstimate(resources),
    estimationMethod: "sum-of-canonical-conservative-resource-context-costs"
  };
}

function fixtureRelativePath(taskId) {
  return `${FIXTURE_DIRECTORY}/${taskId.toLowerCase()}.json`;
}

function readRepositoryCommit(root) {
  let value;
  try {
    value = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    }).trim();
  } catch {
    throw new Error("observed benchmark packet could not read the local toolkit commit");
  }
  if (!/^[0-9a-f]{40}$/u.test(value)) {
    throw new Error("observed benchmark packet local toolkit commit is invalid");
  }
  return value;
}

function parseRun(value) {
  if (!/^[1-3]$/u.test(value ?? "")) throw new Error("observed benchmark packet --run must be 1, 2, or 3");
  return Number(value);
}

export function parseObservedBenchmarkRunPacketArguments(argv) {
  if (!Array.isArray(argv)) throw new Error("observed benchmark packet arguments must be an array");
  const values = {};
  const optionFields = new Map([
    ["--task-id", "taskId"],
    ["--variant", "variant"],
    ["--run", "run"]
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    const field = optionFields.get(option);
    if (!field) throw new Error(`observed benchmark packet unknown argument: ${option}`);
    if (Object.hasOwn(values, field)) throw new Error(`observed benchmark packet duplicate argument: ${option}`);
    const value = argv[index + 1];
    if (typeof value !== "string" || value === "") throw new Error(`observed benchmark packet ${option} requires a value`);
    values[field] = value;
    index += 1;
  }
  if (typeof values.taskId !== "string" || typeof values.variant !== "string" || values.run === undefined) {
    throw new Error("observed benchmark packet requires --task-id, --variant, and --run");
  }
  return { taskId: values.taskId, variant: values.variant, run: parseRun(values.run) };
}

export async function buildObservedBenchmarkRunPacket(input) {
  assertExactInput(input);
  const root = path.resolve(input.root);
  const observedRecord = validateObservedEnterpriseBenchmark({ root });
  if (observedRecord.status !== "not-measured") {
    throw new Error("observed benchmark packet requires the committed record to remain not-measured");
  }

  const [benchmarkDocument, fixtureDocument, agentsRegistry, skillsRegistry, toolsRegistry, domainRegistry, routingMatrix] = await Promise.all([
    readCanonicalJsonDocumentWithin(root, path.join(root, BENCHMARK_RELATIVE_PATH), "enterprise delivery benchmark fixture"),
    readCanonicalJsonDocumentWithin(root, path.join(root, fixtureRelativePath(input.taskId)), `observed fixture ${input.taskId}`),
    readCanonicalJsonDocumentWithin(root, path.join(root, "registries/agents.registry.json"), "agent registry"),
    readCanonicalJsonDocumentWithin(root, path.join(root, "registries/skills.registry.json"), "skill registry"),
    readCanonicalJsonDocumentWithin(root, path.join(root, "registries/tools.registry.json"), "tool registry"),
    readCanonicalJsonDocumentWithin(root, path.join(root, "registries/domain-packs.registry.json"), "domain registry"),
    readCanonicalJsonDocumentWithin(root, path.join(root, "registries/routing-matrix.json"), "scenario-policy registry")
  ]);
  const benchmark = benchmarkDocument.parsed;
  if (!isPlainRecord(benchmark) || !Array.isArray(benchmark.tasks)) {
    throw new Error("observed benchmark packet canonical benchmark fixture is invalid");
  }
  const canonicalTask = benchmark.tasks.find(({ id }) => id === input.taskId);
  assertCanonicalBenchmarkTask(canonicalTask, input.taskId);
  const fixture = fixtureDocument.parsed;
  assertObservedFixture(fixture, input.taskId);
  const fixtureDigest = `sha256:${canonicalTextSha256(Buffer.from(fixtureDocument.text, "utf8"))}`;
  const expectedFixtureDigest = (await readCanonicalJsonDocumentWithin(
    root,
    path.join(root, OBSERVED_BENCHMARK_RELATIVE_PATH),
    "observed enterprise benchmark record"
  )).parsed.fixtureDigests?.[input.taskId];
  if (fixtureDigest !== expectedFixtureDigest) {
    throw new Error(`observed benchmark packet fixture digest does not match the committed observed record for ${input.taskId}`);
  }

  const resources = buildResourceCatalog({
    repositoryRoot: root,
    agentsRegistry: agentsRegistry.parsed,
    skillsRegistry: skillsRegistry.parsed,
    toolsRegistry: toolsRegistry.parsed
  });
  const domain = resolveDomainSelection({
    registry: domainRegistry.parsed,
    task: {
      id: canonicalTask.id,
      scenario: canonicalTask.scenario,
      risk: canonicalTask.risk,
      targets: canonicalTask.targets,
      authorizedActions: canonicalTask.authorizedActions
    },
    environmentCapabilities: canonicalTask.environmentCapabilities
  });
  const canonicalRoutingMatrix = assertScenarioPolicyRegistry(routingMatrix.parsed);
  const resolvedPolicy = resolveScenarioPolicy({
    registry: canonicalRoutingMatrix,
    scenario: canonicalTask.scenario,
    risk: canonicalTask.risk,
    domainPolicy: {
      requiredCompetencies: domain.requiredCompetencies,
      requiredGateIds: domain.resolvedGateIds,
      requiredDomainPackIds: domain.selectedPackIds
    },
    additions: {
      competencies: canonicalTask.additionalCompetencies,
      gateIds: [],
      domainPackIds: []
    }
  });
  if (JSON.stringify(resolvedPolicy.requiredRoles) !== JSON.stringify(canonicalTask.requiredRoles)) {
    throw new Error(`observed benchmark packet required-role policy mismatch for ${input.taskId}`);
  }
  const candidateRouting = selectResources({
    task: {
      id: canonicalTask.id,
      risk: canonicalTask.risk,
      requiredCompetencies: stableStrings(resolvedPolicy.requiredCompetencies),
      requiredRoles: resolvedPolicy.requiredRoles,
      resourcePreferences: resolvedPolicy.resourcePreferences,
      targets: canonicalTask.targets,
      authorizedActions: canonicalTask.authorizedActions
    },
    resources
  });
  const candidateResources = candidateRouting.selected;
  const candidateIds = stableStrings(candidateResources.map(({ id }) => id));
  if (!sameStringSet(candidateIds, canonicalTask.goldenSelectedResourceIds)) {
    throw new Error(`observed benchmark packet canonical routing mismatch for ${input.taskId}`);
  }
  const baselineResources = resources.filter(isEligibleBaselineResource);
  if (baselineResources.length === 0) throw new Error("observed benchmark packet has no eligible baseline resources");
  const selectedResources = input.variant === "baseline" ? baselineResources : candidateResources;
  const commit = readRepositoryCommit(root);
  const acceptanceCriteria = resolvedPolicy.requiredGateIds.map((gateId, index) => ({
    id: `policy-gate-${index + 1}`,
    statement: `The canonical ${gateId} obligation is satisfied before review.`,
    requiredGateIds: [gateId]
  }));
  const deliveryRequest = {
    schemaVersion: "1.0.0",
    task: {
      id: canonicalTask.id,
      goal: fixture.input,
      scenario: canonicalTask.scenario,
      scope: ["fresh OS-temp copy of the observed benchmark fixture"],
      exclusions: ["product repository access", "product source access", "remote access", "benchmark record mutation"],
      constraints: ["stdout-only packet preparation", "no model invocation", "no execution evidence claim"],
      risk: resolvedPolicy.risk,
      targets: structuredClone(canonicalTask.targets),
      authorizedActions: [...canonicalTask.authorizedActions],
      acceptanceCriteria,
      competencies: [...resolvedPolicy.requiredCompetencies],
      gates: [...resolvedPolicy.requiredGateIds]
    },
    repository: {
      root: ".",
      expectedCommit: commit
    },
    contextPolicy: {
      mode: resolvedPolicy.tokenMode,
      modelWindowTokens: 128000,
      maxInputFraction: 0.35
    }
  };
  const validatedDeliveryRequest = assertDeliveryRequest(deliveryRequest, {
    routingMatrix: canonicalRoutingMatrix,
    policyGateIds: resolvedPolicy.requiredGateIds
  });

  return Object.freeze({
    schemaVersion: "1.0.0",
    preparationStatus: "model-not-invoked",
    evidenceStatus: "preparation-only",
    observedRecord: Object.freeze({ status: "not-measured", mutation: "none" }),
    run: Object.freeze({ taskId: input.taskId, variant: input.variant, number: input.run }),
    fixture: Object.freeze({ id: fixture.id, digest: fixtureDigest, input: fixture.input }),
    canonicalTask: Object.freeze({
      id: canonicalTask.id,
      category: canonicalTask.category,
      scenario: canonicalTask.scenario,
      risk: canonicalTask.risk,
      targets: structuredClone(canonicalTask.targets),
      environmentCapabilities: [...canonicalTask.environmentCapabilities],
      authorizedActions: [...canonicalTask.authorizedActions],
      expectedWriterResourceId: canonicalTask.expectedWriterResourceId,
      goldenSelectedResourceIds: stableStrings(canonicalTask.goldenSelectedResourceIds)
    }),
    resolvedPolicy: Object.freeze({
      domainPackIds: [...domain.selectedPackIds],
      requiredCompetencies: [...resolvedPolicy.requiredCompetencies],
      requiredGateIds: [...resolvedPolicy.requiredGateIds],
      requiredRoles: structuredClone(resolvedPolicy.requiredRoles),
      blockedGateIds: [...domain.blockedGateIds]
    }),
    selectedResources: Object.freeze(selectedResourcePacket(selectedResources)),
    executionBoundary: Object.freeze({
      productRepositoryAccess: "forbidden",
      productSourceAccess: "forbidden",
      remoteAccess: "forbidden",
      fixtureCopy: "fresh-os-temp-per-run",
      repositoryWrites: "forbidden",
      packetOutput: "stdout-only"
    }),
    deliveryRequest: validatedDeliveryRequest
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const input = parseObservedBenchmarkRunPacketArguments(process.argv.slice(2));
    const packet = await buildObservedBenchmarkRunPacket({ root: MODULE_ROOT, ...input });
    process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL observed-benchmark-run-packet ${error.message}\n`);
    process.exitCode = 1;
  }
}
