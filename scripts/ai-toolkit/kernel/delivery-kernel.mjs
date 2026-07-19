import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertPathContained } from "../../../install/safe-filesystem.mjs";
import { readCanonicalJsonWithin } from "./canonical-json.mjs";
import { canonicalDigest } from "./canonical-digest.mjs";
import {
  assertDeliveryRequest,
  assertDeliveryRequestPreflight,
  DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS,
  DELIVERY_REQUEST_PLATFORM_IDS
} from "./contracts.mjs";
import { selectResources } from "./resource-router.mjs";
import {
  buildBlockedExecutionWavePlan,
  buildExecutionWavePlan
} from "./team-planner.mjs";
import { buildContextBundle, buildMemoryProposal } from "./context-memory.mjs";
import { buildEvidenceRecord } from "./evidence.mjs";
import { loadDomainRegistry, resolveDomainSelection } from "./domain-packs.mjs";
import { buildCodexExecutionPlan } from "./codex-adapter.mjs";
import { buildClaudeExecutionPlan } from "./claude-adapter.mjs";
import {
  inspectApplicableInstructions,
  inspectProjectCapabilities,
  inspectRepositoryContextItem,
  inspectScopedDiff,
  inspectScopedDiffChunks
} from "./project-inspector.mjs";
import {
  applySourceReferenceSnapshotToResources,
  buildInspectedProjectCommandResources,
  buildResourceCatalog,
  commandCompetencyForVerifierKind,
  hasTrustedScopedLocalWriteCapability
} from "./resource-catalog.mjs";
import {
  loadScenarioPolicyRegistry,
  resolveScenarioPolicy
} from "./scenario-policy.mjs";
import { assessRiskPolicy } from "./risk-policy.mjs";
import { deriveValidationPolicy } from "./validation-policy.mjs";
import { loadValidatedSourceCatalog } from "./source-catalog-loader.mjs";
import { SOURCE_CATALOG_SCHEMA_VERSION } from "./source-catalog-contract.mjs";
import {
  applySourceReferenceSnapshotToDomain,
  buildSourceReferenceSnapshot
} from "./source-policy.mjs";

export { VALIDATION_LANES } from "./validation-policy.mjs";
export { deriveValidationPolicy };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const PLANNER_INPUTS = new Set(["request"]);
const HOST_OPTION_FIELDS = new Set(["invocationRoot"]);
const COMMAND_EVIDENCE_TYPES = new Set(["observed-command-receipt"]);
const FORBIDDEN_TRUST_INPUTS = [
  "resources",
  "domainPacks",
  "registeredScenarios",
  "routingMatrix",
  "policyGateIds",
  "environmentCapabilities"
];

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .filter((value) => value !== null && value !== undefined && String(value) !== "")
    .map(String))];
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function compareStableIds(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function canonicalOwnedPath(value) {
  if (
    typeof value !== "string"
    || value === ""
    || value === "."
    || value !== value.trim()
    || value.includes("\\")
    || value.includes("\0")
    || value.startsWith("/")
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
  ) {
    return false;
  }
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function safeOwnedPaths(task) {
  const exclusions = task.exclusions.filter(canonicalOwnedPath);
  return task.scope.filter((scopePath) => (
    canonicalOwnedPath(scopePath)
    && scopePath.split("/", 1)[0].toLowerCase() !== ".git"
    && !exclusions.some((excludedPath) => pathsOverlap(scopePath, excludedPath))
  ));
}

function disjointOwnedRoots(task) {
  const roots = [];
  const candidates = safeOwnedPaths(task).sort((left, right) => {
    const depthDifference = left.split("/").length - right.split("/").length;
    return depthDifference || compareStableIds(left, right);
  });
  for (const candidate of candidates) {
    if (!roots.some((root) => pathsOverlap(root, candidate))) roots.push(candidate);
  }
  return roots.sort(compareStableIds);
}

function assignmentIntent({ id, agentId, role, wave, ownership, dependencies = [] }) {
  return {
    id,
    agentId,
    role,
    wave,
    responsibility: role === "lead"
      ? "accountable integration and evidence"
      : role === "verifier"
        ? "independent final verification"
        : `specialist authority for ${agentId}`,
    ownership,
    dependencies,
    stopConditionRefs: [
      "stop:scope-change",
      "stop:authorization-change",
      "stop:blocked-evidence"
    ],
    evidenceRefs: ["evidence:resolved-gates"],
    contextRefs: ["context:bounded-task-bundle"]
  };
}

function writeCapableImplementationAgent(resource) {
  return hasTrustedScopedLocalWriteCapability(resource)
    && resource.canonicalCompetencies?.includes("implementation");
}

function writerCompetencyFit(resource, requiredCompetencies) {
  const resourceCompetencies = new Set(resource.canonicalCompetencies ?? []);
  const matched = requiredCompetencies.filter((competency) => resourceCompetencies.has(competency));
  return {
    domainMatches: matched.filter((competency) => competency !== "implementation").length,
    totalMatches: matched.length
  };
}

function compareWriterFit(left, right, requiredCompetencies) {
  const leftFit = writerCompetencyFit(left, requiredCompetencies);
  const rightFit = writerCompetencyFit(right, requiredCompetencies);
  if (leftFit.domainMatches !== rightFit.domainMatches) {
    return rightFit.domainMatches - leftFit.domainMatches;
  }
  if (leftFit.totalMatches !== rightFit.totalMatches) {
    return rightFit.totalMatches - leftFit.totalMatches;
  }
  const leftCost = Number(left.measuredContextCost ?? Number.POSITIVE_INFINITY);
  const rightCost = Number(right.measuredContextCost ?? Number.POSITIVE_INFINITY);
  if (leftCost !== rightCost) return leftCost - rightCost;
  return compareStableIds(left.id, right.id);
}

function buildTrustedAssignmentIntents({ task, routing }) {
  const selectedAgents = routing.selected.filter((resource) => resource.type === "agent");
  const byId = new Map(selectedAgents.map((resource) => [resource.id, resource]));
  const leadId = routing.requiredRoles.lead;
  const verifierId = routing.requiredRoles.verifier;
  if (!leadId || !byId.has(leadId)) throw new Error("routing did not produce an accountable lead");
  if (verifierId && !byId.has(verifierId)) {
    throw new Error("routing produced an unselected verifier");
  }
  const writeAuthorized = task.authorizedActions.includes("scoped-local-write");
  const ownedRoots = writeAuthorized ? disjointOwnedRoots(task) : [];
  const requiredCompetencies = uniqueStrings([
    ...(routing.requiredCompetencies ?? []),
    ...(task.competencies ?? [])
  ]);
  const fixedWriteAgents = selectedAgents
    .filter(hasTrustedScopedLocalWriteCapability)
    .sort((left, right) => compareWriterFit(left, right, requiredCompetencies));
  const incapableFixedWriters = fixedWriteAgents.filter(
    (resource) => !writeCapableImplementationAgent(resource)
  );
  const blockers = [];
  if (!writeAuthorized && fixedWriteAgents.length > 0) {
    blockers.push("scoped-local-write:fixed-writer-selected-without-authorization");
  } else if (verifierId && fixedWriteAgents.some((resource) => resource.id === verifierId)) {
    blockers.push(`scoped-local-write:fixed-writer-cannot-verify:${verifierId}`);
  } else if (incapableFixedWriters.length > 0) {
    blockers.push(
      `scoped-local-write:fixed-writer-lacks-implementation:${incapableFixedWriters.map((resource) => resource.id).join(",")}`
    );
  } else if (writeAuthorized && ownedRoots.length === 0) {
    blockers.push("scoped-local-write:no-safe-owned-path");
  } else if (writeAuthorized && fixedWriteAgents.length === 0) {
    blockers.push("scoped-local-write:no-selected-capable-implementation-writer");
  } else if (writeAuthorized && fixedWriteAgents.length > ownedRoots.length) {
    blockers.push(
      `scoped-local-write:insufficient-disjoint-owned-paths:required=${fixedWriteAgents.length}:available=${ownedRoots.length}`
    );
  }
  if (blockers.length > 0) return { intents: [], blockers };

  const writerIds = new Set(fixedWriteAgents.map((resource) => resource.id));
  const specialists = selectedAgents
    .map((resource) => resource.id)
    .filter((id) => id !== leadId && id !== verifierId && !writerIds.has(id))
    .sort(compareStableIds);
  const intents = [];
  let leadAssignmentId = null;
  if (!writerIds.has(leadId)) {
    leadAssignmentId = `assignment-1-${leadId}`;
    intents.push(assignmentIntent({
      id: leadAssignmentId,
      agentId: leadId,
      role: "lead",
      wave: 1,
      ownership: { mode: "read-only", ownedPaths: [] }
    }));
  }

  specialists.forEach((agentId, index) => {
    const wave = Math.floor(index / 2) + 1;
    intents.push(assignmentIntent({
      id: `assignment-${intents.length + 1}-${agentId}`,
      agentId,
      role: "specialist",
      wave,
      ownership: { mode: "read-only", ownedPaths: [] }
    }));
  });

  let lastAssignmentWave = specialists.length === 0
    ? (leadAssignmentId === null ? 0 : 1)
    : Math.floor((specialists.length - 1) / 2) + 1;
  const writerAssignmentIds = [];
  if (fixedWriteAgents.length > 0) {
    const writerOwnership = new Map(
      fixedWriteAgents.map((resource) => [resource.id, []])
    );
    ownedRoots.forEach((ownedPath, index) => {
      writerOwnership.get(fixedWriteAgents[index % fixedWriteAgents.length].id).push(ownedPath);
    });
    const writerStartWave = lastAssignmentWave + 1;
    const leadWriter = fixedWriteAgents.find((resource) => resource.id === leadId) ?? null;
    const specialistWriters = fixedWriteAgents.filter((resource) => resource.id !== leadId);

    if (leadWriter) {
      leadAssignmentId = `assignment-${intents.length + 1}-${leadWriter.id}`;
      writerAssignmentIds.push(leadAssignmentId);
      intents.push(assignmentIntent({
        id: leadAssignmentId,
        agentId: leadWriter.id,
        role: "lead",
        wave: writerStartWave,
        ownership: { mode: "write", ownedPaths: writerOwnership.get(leadWriter.id) }
      }));
    }
    specialistWriters.forEach((resource, index) => {
      const writerWave = writerStartWave + Math.floor(index / 2);
      const writerAssignmentId = `assignment-${intents.length + 1}-${resource.id}`;
      writerAssignmentIds.push(writerAssignmentId);
      intents.push(assignmentIntent({
        id: writerAssignmentId,
        agentId: resource.id,
        role: "specialist",
        wave: writerWave,
        ownership: { mode: "write", ownedPaths: writerOwnership.get(resource.id) },
        dependencies: leadAssignmentId === null || leadWriter !== null ? [] : [leadAssignmentId]
      }));
      lastAssignmentWave = Math.max(lastAssignmentWave, writerWave);
    });
    if (leadWriter) lastAssignmentWave = Math.max(lastAssignmentWave, writerStartWave);
  }

  if (verifierId) {
    const verifierWave = lastAssignmentWave + 1;
    intents.push(assignmentIntent({
      id: `assignment-${intents.length + 1}-${verifierId}`,
      agentId: verifierId,
      role: "verifier",
      wave: verifierWave,
      ownership: { mode: "read-only", ownedPaths: [] },
      dependencies: writerAssignmentIds
    }));
  }
  return { intents, blockers: [] };
}

export function buildExecutionTeam({ task, routing, resolvedGateIds, domainSelection = null }) {
  if (domainSelection?.status === "blocked") {
    const sourceBlockers = (domainSelection.sourceGovernance?.blockers ?? []).map((blocker) => (
      `${blocker.code}:${blocker.gateId}:${blocker.sourceId}:${blocker.reason}`
    ));
    const domainBlockers = domainSelection.blockedGateIds.map(
      (gateId) => `domain-gate-blocked:${gateId}`
    );
    return buildBlockedExecutionWavePlan({
      task,
      blockers: uniqueStrings([...sourceBlockers, ...domainBlockers]),
      selectedResources: routing.selected,
      domainSelection
    });
  }
  if (routing.blockedReasons.length > 0) {
    return buildBlockedExecutionWavePlan({
      task,
      blockers: routing.blockedReasons,
      selectedResources: routing.selected,
      domainSelection
    });
  }
  const { intents, blockers } = buildTrustedAssignmentIntents({ task, routing });
  if (blockers.length > 0) {
    return buildBlockedExecutionWavePlan({
      task,
      blockers,
      selectedResources: routing.selected,
      domainSelection
    });
  }
  return buildExecutionWavePlan({
    task,
    resolvedGateIds,
    selectedResources: routing.selected,
    domainSelection,
    trustedAssignmentIntents: intents
  });
}

const PLATFORM_PACK_IDS = new Set(DELIVERY_REQUEST_PLATFORM_IDS);
const OVERLAY_PACK_IDS = new Set(DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS);

function requestedDomainPackIds(task) {
  return uniqueStrings([
    "enterprise-core",
    ...task.targets.platforms.filter((id) => id !== "cross-platform-desktop"),
    ...task.targets.frameworkOverlays
  ]);
}

function restoreTrustedCatalogSelection(routing, resources) {
  const catalogById = new Map(resources.map((resource) => [resource.id, resource]));
  return {
    ...routing,
    selected: routing.selected.map((resource) => {
      const trusted = catalogById.get(resource.id);
      if (!trusted) throw new Error(`routing selected unknown catalog resource: ${resource.id}`);
      return trusted;
    })
  };
}

function effectiveDomainTargets(task, requiredDomainPackIds) {
  return {
    platforms: uniqueStrings([
      ...task.targets.platforms,
      ...requiredDomainPackIds.filter((id) => PLATFORM_PACK_IDS.has(id))
    ]),
    frameworkOverlays: uniqueStrings([
      ...task.targets.frameworkOverlays,
      ...requiredDomainPackIds.filter((id) => OVERLAY_PACK_IDS.has(id))
    ])
  };
}

function assertPlannerInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("delivery planner input must be a plain own-property record");
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("delivery planner input must be a plain own-property record");
  }
  for (const field of FORBIDDEN_TRUST_INPUTS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      throw new Error(`caller-injected ${field} is forbidden`);
    }
  }
  for (const field of Object.keys(input)) {
    if (!PLANNER_INPUTS.has(field)) throw new Error(`delivery planner input ${field} is not allowed`);
  }
  if (!Object.prototype.hasOwnProperty.call(input, "request")) {
    throw new Error("delivery planner input requires request");
  }
}

function resolveHostInvocationRoot(hostOptions) {
  if (hostOptions === null || typeof hostOptions !== "object" || Array.isArray(hostOptions)) {
    throw new Error("delivery planner host options must be a plain own-property record");
  }
  const prototype = Object.getPrototypeOf(hostOptions);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("delivery planner host options must be a plain own-property record");
  }
  for (const field of Object.keys(hostOptions)) {
    if (!HOST_OPTION_FIELDS.has(field)) throw new Error(`delivery planner host option ${field} is not allowed`);
  }
  const invocationRoot = hostOptions.invocationRoot ?? process.cwd();
  if (typeof invocationRoot !== "string" || invocationRoot.trim() !== invocationRoot || invocationRoot === "") {
    throw new Error("delivery planner invocationRoot must be a non-empty trimmed path");
  }
  const resolved = path.resolve(invocationRoot);
  return assertPathContained(resolved, resolved, "delivery planner invocation root");
}

function resolveProjectRepositoryRoot(invocationRoot, repositoryRoot) {
  const segments = repositoryRoot === "." ? [] : repositoryRoot.split("/");
  const resolved = path.resolve(invocationRoot, ...segments);
  return assertPathContained(invocationRoot, resolved, "delivery project repository root");
}

function buildRiskAssessment({ request, scenarioFloor, inspectedScope }) {
  const canonicalScopePaths = [...inspectedScope.provenance.scope];
  const authorizedActions = [...request.task.authorizedActions].sort(compareStableIds);
  const inference = assessRiskPolicy({
    declaredRisk: "low",
    scenarioFloor: "low",
    authorizedActions,
    canonicalScopePaths
  });
  const assessment = assessRiskPolicy({
    declaredRisk: request.task.risk,
    scenarioFloor,
    authorizedActions,
    canonicalScopePaths
  });

  return deepFreeze({
    schemaVersion: "1.0.0",
    declaredRisk: assessment.declaredRisk,
    scenarioFloor: assessment.scenarioFloor,
    inferredRisk: inference.effectiveRisk,
    effectiveRisk: assessment.effectiveRisk,
    elevationReasons: assessment.elevationReasons,
    provenance: {
      classification: "planning-policy-inference",
      policy: "automatic-risk-policy-v1",
      declaredRiskSource: "DeliveryRequest-v1.task.risk",
      scenarioFloorSource: `scenario-policy-v2:${request.task.scenario}`,
      inferredRiskSource: "read-only-project-and-scoped-diff-inspection",
      inspectionMode: "read-only",
      repositoryCommit: request.repository.expectedCommit,
      canonicalScopePaths,
      authorizedActions,
      executionEvidenceClaimed: false
    }
  });
}

function observedEnvironmentCapabilities(projectInspection) {
  const capabilities = new Set();
  if (projectInspection.executableEvidence.some((entry) => entry.id === "node")) capabilities.add("node");
  for (const capability of projectInspection.hostCapabilities) {
    if (capability.id === "platform:win32") capabilities.add("windows");
    if (capability.id === "platform:darwin") capabilities.add("macos");
  }
  return [...capabilities].sort(compareStableIds);
}

function requiredCommandCompetencies(gates, requiredGateIds) {
  const gateById = new Map(gates.map((gate) => [gate.id, gate]));
  const competencies = [];
  const seen = new Set();
  for (const gateId of requiredGateIds) {
    const gate = gateById.get(gateId);
    if (!gate) continue;
    const verifierKind = gate.verifierKinds[0];
    const inferredCompetency = commandCompetencyForVerifierKind(verifierKind);
    if (inferredCompetency === null && !COMMAND_EVIDENCE_TYPES.has(gate.evidenceType)) continue;
    const competency = inferredCompetency ?? `command-${verifierKind}`;
    if (seen.has(competency)) continue;
    seen.add(competency);
    competencies.push(competency);
  }
  return competencies;
}

function contextTargetAgentIds(team, selectedAgentIds, mode) {
  const writers = team.assignments
    .filter((assignment) => assignment.governedEnvelope.ownership.mode === "write")
    .map((assignment) => assignment.agentId);
  const fallback = selectedAgentIds[0] ?? null;
  const primary = uniqueStrings([team.lead, writers[0], fallback]);
  return mode === "detailed" ? primary.slice(0, 2) : primary.slice(0, 1);
}

function inspectProjectContext({ repositoryRoot, request, projectInspection, team, selectedAgentIds }) {
  const sharedInstructions = inspectApplicableInstructions({
    repositoryRoot,
    targetPaths: request.task.scope
  });
  const targetAgentIds = contextTargetAgentIds(team, selectedAgentIds, request.contextPolicy.mode);
  const scopedDiff = inspectScopedDiffChunks({
    repositoryRoot,
    expectedCommit: request.repository.expectedCommit,
    scope: request.task.scope,
    agentIds: targetAgentIds
  });
  const projectMaps = projectInspection.manifests.map((manifest, index) => inspectRepositoryContextItem({
    repositoryRoot,
    id: `project-map-${index + 1}`,
    source: manifest.path,
    kind: "project-map",
    relevance: 700 - index,
    agentIds: targetAgentIds
  }));
  return [...sharedInstructions, ...scopedDiff, ...projectMaps];
}

async function readCanonicalJson(relativePath, label) {
  const filePath = path.join(ROOT, relativePath);
  return readCanonicalJsonWithin(ROOT, filePath, `canonical ${label}`);
}

async function inspectTrustedRuntimeState() {
  const now = new Date().toISOString();
  const [agentsRegistry, skillsRegistry, toolsRegistry, routingMatrix, domainRegistry] = await Promise.all([
    readCanonicalJson("registries/agents.registry.json", "agent registry"),
    readCanonicalJson("registries/skills.registry.json", "skill registry"),
    readCanonicalJson("registries/tools.registry.json", "tool registry"),
    loadScenarioPolicyRegistry(),
    loadDomainRegistry()
  ]);
  const sourceGovernance = await loadValidatedSourceCatalog({
    repositoryRoot: ROOT,
    now
  });
  const { catalog: sourceCatalog, validation: sourceGovernanceValidation } = sourceGovernance;
  const resources = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry,
    skillsRegistry,
    toolsRegistry
  });
  return {
    resources,
    domainRegistry,
    routingMatrix,
    sourceCatalog,
    sourceGovernanceValidation,
    sourceEvaluatedAt: now
  };
}

export async function planDeliveryRun(input, hostOptions = {}) {
  assertPlannerInput(input);
  const invocationRoot = resolveHostInvocationRoot(hostOptions);
  const { request } = input;
  const {
    resources,
    domainRegistry,
    routingMatrix,
    sourceCatalog,
    sourceGovernanceValidation,
    sourceEvaluatedAt
  } = await inspectTrustedRuntimeState();
  const prevalidatedRequest = assertDeliveryRequestPreflight(request, {
    routingMatrix,
    policyGateIds: []
  });
  const projectRepositoryRoot = resolveProjectRepositoryRoot(
    invocationRoot,
    prevalidatedRequest.repository.root
  );
  const inspectedProject = inspectProjectCapabilities({ repositoryRoot: projectRepositoryRoot });
  const inspectedProjectResources = buildInspectedProjectCommandResources({
    repositoryRoot: projectRepositoryRoot,
    commandReferences: inspectedProject.commandReferences
  });
  const inspectedResources = Object.freeze([...resources, ...inspectedProjectResources]);
  const environmentCapabilities = observedEnvironmentCapabilities(inspectedProject);
  const taskAdditions = {
    competencies: prevalidatedRequest.task.competencies ?? [],
    gateIds: prevalidatedRequest.task.gates ?? [],
    domainPackIds: requestedDomainPackIds(prevalidatedRequest.task)
  };
  const scenarioFloorPolicy = resolveScenarioPolicy({
    registry: routingMatrix,
    scenario: prevalidatedRequest.task.scenario,
    tokenMode: prevalidatedRequest.contextPolicy.mode,
    additions: taskAdditions
  });
  const inspectedRiskScope = inspectScopedDiff({
    repositoryRoot: projectRepositoryRoot,
    expectedCommit: prevalidatedRequest.repository.expectedCommit,
    scope: prevalidatedRequest.task.scope,
    agentIds: []
  });
  const riskAssessment = buildRiskAssessment({
    request: prevalidatedRequest,
    scenarioFloor: scenarioFloorPolicy.risk,
    inspectedScope: inspectedRiskScope
  });
  const initialScenarioPolicy = resolveScenarioPolicy({
    registry: routingMatrix,
    scenario: prevalidatedRequest.task.scenario,
    risk: riskAssessment.effectiveRisk,
    tokenMode: prevalidatedRequest.contextPolicy.mode,
    additions: taskAdditions
  });
  const domainTask = {
    ...prevalidatedRequest.task,
    risk: initialScenarioPolicy.risk,
    targets: effectiveDomainTargets(
      prevalidatedRequest.task,
      initialScenarioPolicy.requiredDomainPackIds
    )
  };
  const environmentDomain = resolveDomainSelection({
    registry: domainRegistry,
    task: domainTask,
    environmentCapabilities
  });
  const sourceSnapshot = buildSourceReferenceSnapshot({
    catalog: sourceCatalog,
    gates: environmentDomain.gates,
    resourceIds: inspectedResources.map((resource) => resource.id),
    now: sourceEvaluatedAt,
    receiptsValidated: sourceGovernanceValidation.schemaVersion === SOURCE_CATALOG_SCHEMA_VERSION
  });
  const governedResources = applySourceReferenceSnapshotToResources(inspectedResources, sourceSnapshot);
  const domain = applySourceReferenceSnapshotToDomain(environmentDomain, sourceSnapshot);
  const scenarioPolicy = resolveScenarioPolicy({
    registry: routingMatrix,
    scenario: prevalidatedRequest.task.scenario,
    risk: riskAssessment.effectiveRisk,
    tokenMode: prevalidatedRequest.contextPolicy.mode,
    domainPolicy: {
      requiredCompetencies: domain.requiredCompetencies,
      requiredGateIds: domain.resolvedGateIds,
      requiredDomainPackIds: domain.selectedPackIds
    },
    additions: taskAdditions
  });
  const policyGateIds = scenarioPolicy.requiredGateIds;
  const validatedRequest = assertDeliveryRequest(request, { routingMatrix, policyGateIds });
  const validatedTask = validatedRequest.task;
  const effectiveTask = deepFreeze({ ...validatedTask, risk: scenarioPolicy.risk });
  const commandCompetencies = requiredCommandCompetencies(
    domain.gates,
    scenarioPolicy.requiredGateIds
  );
  const routingTask = {
    ...effectiveTask,
    risk: scenarioPolicy.risk,
    requiredRoles: scenarioPolicy.requiredRoles,
    requiredCompetencies: uniqueStrings([
      ...scenarioPolicy.requiredCompetencies,
      ...commandCompetencies
    ])
  };
  const routing = {
    ...restoreTrustedCatalogSelection(
      selectResources({ task: routingTask, resources: governedResources }),
      governedResources
    ),
    requiredCompetencies: [...routingTask.requiredCompetencies]
  };
  const gates = [...scenarioPolicy.requiredGateIds];
  const validationPolicy = deriveValidationPolicy({
    effectiveRisk: riskAssessment.effectiveRisk,
    authorizedActions: [...validatedTask.authorizedActions],
    canonicalScopePaths: [...inspectedRiskScope.provenance.scope],
    changedPaths: [...inspectedRiskScope.provenance.changedPaths],
    requiredGateIds: gates
  });
  const team = buildExecutionTeam({
    task: effectiveTask,
    routing,
    resolvedGateIds: gates,
    domainSelection: domain
  });
  const maxInputFraction = validatedRequest.contextPolicy.maxInputFraction ?? 0.35;
  const selectedAgentIds = routing.selected
    .filter((resource) => resource.type === "agent")
    .map((resource) => resource.id);
  const contextItems = inspectProjectContext({
    repositoryRoot: projectRepositoryRoot,
    request: validatedRequest,
    projectInspection: inspectedProject,
    team,
    selectedAgentIds
  });
  const context = buildContextBundle({
    taskId: validatedTask.id,
    taskDigest: team.taskDigest,
    repositoryCommit: validatedRequest.repository.expectedCommit,
    policyVersion: canonicalDigest({ scenarioPolicy, domain }, "resolved delivery policy"),
    modelContextTokens: validatedRequest.contextPolicy.modelWindowTokens,
    mode: validatedRequest.contextPolicy.mode,
    maxInputFraction,
    ttlPolicy: { id: "no-cache", ttlSeconds: 0, generation: 0 },
    agentIds: selectedAgentIds,
    items: contextItems
  });
  const codex = buildCodexExecutionPlan({
    task: effectiveTask,
    selectedResources: routing.selected,
    team,
    context,
    domainPack: domain
  });
  const claude = buildClaudeExecutionPlan({
    task: effectiveTask,
    selectedResources: routing.selected,
    team,
    context,
    domainPack: domain
  });
  const evidence = deepFreeze({
    ...buildEvidenceRecord({
      taskId: validatedTask.id,
      selectedResources: routing.selected.map((resource) => resource.id),
      invokedResources: [],
      requiredChecks: gates,
      checks: gates.map((id) => ({ id, status: "planned" })),
      changedScope: []
    }),
    validationLane: validationPolicy.validationLane,
    validationRationale: validationPolicy.rationale
  });
  const memory = buildMemoryProposal({ taskId: validatedTask.id, records: [] });

  const plan = {
    schemaVersion: "1.0.0",
    readinessState: domain.status === "blocked" || team.executionStatus === "blocked"
      ? "blocked"
      : "planned",
    validationLane: validationPolicy.validationLane,
    validationRationale: validationPolicy.rationale,
    validationPolicy,
    request: validatedRequest,
    task: effectiveTask,
    repository: validatedRequest.repository,
    contextPolicy: validatedRequest.contextPolicy,
    projectInspection: {
      ...inspectedProject,
      verifiedCommit: validatedRequest.repository.expectedCommit,
      observedEnvironmentCapabilities: environmentCapabilities
    },
    riskAssessment,
    scenarioPolicy,
    requiredGateIds: gates,
    routing,
    context,
    team,
    domain,
    codex,
    claude,
    evidence,
    memory
  };
  for (const field of ["validationLane", "validationRationale", "validationPolicy"]) {
    Object.defineProperty(plan, field, {
      value: plan[field],
      enumerable: true,
      writable: false,
      configurable: false
    });
  }
  return plan;
}
