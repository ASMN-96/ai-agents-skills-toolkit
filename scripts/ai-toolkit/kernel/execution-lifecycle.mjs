import { buildResourceDigestBindings, canonicalDigest } from "./canonical-digest.mjs";
import { assertDomainGate, assertResourceContract } from "./contracts.mjs";
import { buildExecutionEvidenceRecord } from "./evidence.mjs";
import { assertSourceReferenceSnapshot } from "./source-policy.mjs";
import { assertPlanSourceDependencyAccounting } from "./source-release-accounting.mjs";

const SCHEMA_VERSION = "1.0.0";
const HASH = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const EVENT_TYPES = new Set([
  "assignment-started",
  "assignment-completed",
  "assignment-failed",
  "assignment-blocked"
]);
const RECEIPT_STATUSES = new Set(["passed", "failed", "blocked"]);
const CHECK_STATUSES = new Set(["passed", "failed", "blocked"]);
const COMMAND_EVIDENCE_TYPES = new Set(["observed-command-receipt"]);
const COMMAND_VERIFIER_KINDS = new Set([
  "static-analysis",
  "unit-test",
  "integration-test",
  "browser-runtime",
  "native-build",
  "simulator-device",
  "packaging-install-rollback"
]);
const TOOL_ACTIONS_BY_ADAPTER_KIND = new Map([
  ["project-script", "project-validation"]
]);
const MAX_FINALIZATION_DELAY_MS = 86_400_000;

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function cloneJson(value, label) {
  canonicalDigest(value, label);
  return structuredClone(value);
}

function requireRecord(value, label) {
  if (!isPlainRecord(value)) throw new Error(`${label} must be a plain record`);
  return value;
}

function requireFields(value, fields, label) {
  requireRecord(value, label);
  for (const field of Object.keys(value)) {
    if (!fields.has(field)) throw new Error(`${label}.${field} is not allowed`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string`);
  }
  return value;
}

function requireHash(value, label) {
  if (typeof value !== "string" || !HASH.test(value)) {
    throw new Error(`${label} must be a lowercase sha256 digest`);
  }
  return value;
}

function requireCommit(value, label) {
  if (typeof value !== "string" || !COMMIT.test(value)) {
    throw new Error(`${label} must be a lowercase 40-character commit`);
  }
  return value;
}

function requireIso(value, label, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== "string") throw new Error(`${label} must be an ISO timestamp`);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString() !== value) {
    throw new Error(`${label} must be an exact ISO timestamp`);
  }
  return value;
}

function requireUniqueStrings(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${label} must be ${allowEmpty ? "an array" : "a non-empty array"}`);
  }
  const seen = new Set();
  return value.map((entry, index) => {
    const item = requireString(entry, `${label}[${index}]`);
    if (seen.has(item)) throw new Error(`${label}[${index}] must be unique`);
    seen.add(item);
    return item;
  });
}

function canonicalPath(value) {
  return typeof value === "string"
    && value !== ""
    && value !== "."
    && value === value.trim()
    && !value.includes("\\")
    && !value.includes("\0")
    && !value.startsWith("/")
    && !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
    && value.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function sameJson(left, right) {
  return canonicalDigest(left, "comparison left") === canonicalDigest(right, "comparison right");
}

function sameStringSet(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value) => right.includes(value));
}

function validateSelectedResources(plan) {
  const selected = plan.routing?.selected;
  if (!Array.isArray(selected)) throw new Error("prepared plan routing.selected must be an array");
  const ids = new Set();
  return selected.map((resource) => {
    const validated = assertResourceContract(resource);
    if (!validated.eligibility.eligible) {
      throw new Error(`prepared plan selected resource is ineligible: ${validated.id}`);
    }
    if (ids.has(validated.id)) throw new Error(`prepared plan selected resource id is duplicated: ${validated.id}`);
    ids.add(validated.id);
    return validated;
  });
}

function validateOwnership(assignments, task, resources) {
  const selectedAgents = new Map(
    resources
      .filter((resource) => resource.type === "agent")
      .map((resource) => [resource.id, resource])
  );
  const writers = [];
  for (const assignment of assignments) {
    const envelope = requireRecord(assignment.governedEnvelope, `assignment ${assignment.id}.governedEnvelope`);
    if (envelope.taskId !== task.id) throw new Error(`assignment ${assignment.id} taskId must match prepared plan`);
    const ownership = requireRecord(envelope.ownership, `assignment ${assignment.id}.ownership`);
    if (!new Set(["read-only", "write"]).has(ownership.mode)) {
      throw new Error(`assignment ${assignment.id} ownership.mode is invalid`);
    }
    const paths = requireUniqueStrings(ownership.ownedPaths, `assignment ${assignment.id} ownership.ownedPaths`);
    if (!paths.every(canonicalPath)) {
      throw new Error(`assignment ${assignment.id} ownership paths must be canonical repository-relative paths`);
    }
    const resource = selectedAgents.get(assignment.agentId);
    if (!resource) {
      throw new Error(`assignment ${assignment.id} references an unselected agent`);
    }
    if (ownership.mode === "write") {
      if (!task.authorizedActions.includes("scoped-local-write")) {
        throw new Error(`assignment ${assignment.id} write ownership is unauthorized`);
      }
      if (
        resource.runtimePosture?.sandboxMode !== "workspace-write"
        || resource.runtimePosture?.scopedLocalWrite !== true
      ) {
        throw new Error(`write assignment ${assignment.id} requires workspace-write capability`);
      }
      if (paths.length === 0) throw new Error(`assignment ${assignment.id} write ownership requires paths`);
      for (const ownedPath of paths) writers.push({ assignmentId: assignment.id, ownedPath });
    } else if (resource.runtimePosture?.sandboxMode === "workspace-write") {
      throw new Error(
        `read-only assignment ${assignment.id} cannot use fixed workspace-write capability`
      );
    }
  }
  for (let left = 0; left < writers.length; left += 1) {
    for (let right = left + 1; right < writers.length; right += 1) {
      if (writers[left].assignmentId === writers[right].assignmentId) continue;
      if (pathsOverlap(writers[left].ownedPath, writers[right].ownedPath)) {
        throw new Error(
          `writer ownership overlap: ${writers[left].ownedPath} (${writers[left].assignmentId}) conflicts with ${writers[right].ownedPath} (${writers[right].assignmentId})`
        );
      }
    }
  }
}

function validateTeam(plan, resources) {
  const team = requireRecord(plan.team, "prepared plan team");
  if (team.schemaVersion !== SCHEMA_VERSION) throw new Error("prepared plan team schemaVersion is invalid");
  if (team.taskId !== plan.task.id) throw new Error("prepared plan team.taskId must match task.id");
  if (team.taskDigest !== canonicalDigest(plan.task, "prepared plan task")) {
    throw new Error("prepared plan team.taskDigest does not match task");
  }
  if (!sameJson(team.selectedResourceDigests, buildResourceDigestBindings(resources))) {
    throw new Error("prepared plan team.selectedResourceDigests do not match routing.selected");
  }
  if (team.domainSelectionDigest !== canonicalDigest(plan.domain, "prepared plan domain")) {
    throw new Error("prepared plan team.domainSelectionDigest does not match domain");
  }
  if (!Array.isArray(team.assignments) || !Array.isArray(team.waves)) {
    throw new Error("prepared plan team requires assignments and waves arrays");
  }
  const selectedAgents = new Set(resources.filter((resource) => resource.type === "agent").map((resource) => resource.id));
  const assignmentIds = new Set();
  const assignmentsById = new Map();
  for (const assignment of team.assignments) {
    requireRecord(assignment, "prepared plan assignment");
    const id = requireString(assignment.id, "prepared plan assignment.id");
    if (assignmentIds.has(id)) throw new Error(`prepared plan assignment id is duplicated: ${id}`);
    assignmentIds.add(id);
    assignmentsById.set(id, assignment);
    if (!selectedAgents.has(assignment.agentId)) {
      throw new Error(`prepared plan assignment references unselected agent: ${assignment.agentId}`);
    }
    if (!Number.isSafeInteger(assignment.wave) || assignment.wave < 1) {
      throw new Error(`prepared plan assignment ${id} wave is invalid`);
    }
    if (assignment.executionProof !== null || assignment.receiptProof !== null) {
      throw new Error(`prepared plan assignment ${id} contains execution proof`);
    }
    const dependencies = requireUniqueStrings(assignment.governedEnvelope?.dependencies, `assignment ${id} dependencies`);
    for (const dependency of dependencies) {
      if (dependency === id) throw new Error(`assignment ${id} cannot depend on itself`);
    }
  }
  for (const assignment of team.assignments) {
    for (const dependency of assignment.governedEnvelope.dependencies) {
      if (!assignmentIds.has(dependency)) {
        throw new Error(`assignment ${assignment.id} dependency is unknown: ${dependency}`);
      }
    }
  }
  validateOwnership(team.assignments, plan.task, resources);
  if (team.executionStatus === "blocked" && team.assignments.length > 0) {
    throw new Error("blocked prepared plan cannot contain assignments");
  }
  const waveAssignmentIds = team.waves.flatMap((wave, waveIndex) => {
    requireRecord(wave, "prepared plan wave");
    const expectedOrder = waveIndex + 1;
    if (wave.order !== expectedOrder) {
      throw new Error(`prepared plan wave order must be consecutive from 1; expected ${expectedOrder}`);
    }
    if (!Array.isArray(wave.assignments)) throw new Error("prepared plan wave.assignments must be an array");
    const leadAssignments = wave.assignments.filter((entry) => entry.role === "lead");
    const specialistAssignments = wave.assignments.filter((entry) => entry.role === "specialist");
    const verifierAssignments = wave.assignments.filter((entry) => entry.role === "verifier");
    if (leadAssignments.length > 1) throw new Error(`prepared plan wave ${wave.order} cannot contain more than one lead`);
    if (specialistAssignments.length > 2) {
      throw new Error(`prepared plan wave ${wave.order} cannot contain more than two specialists`);
    }
    if (verifierAssignments.length > 1) {
      throw new Error(`prepared plan wave ${wave.order} cannot contain more than one verifier`);
    }
    for (const entry of wave.assignments) {
      if (entry.wave !== wave.order) {
        throw new Error(`prepared plan assignment ${entry.id} wave must match its containing wave`);
      }
      if (assignmentsById.get(entry.id) !== entry && !sameJson(assignmentsById.get(entry.id), entry)) {
        throw new Error(`prepared plan wave assignment ${entry.id} must match team.assignments`);
      }
    }
    return wave.assignments.map((entry) => entry.id);
  });
  if (!sameJson(waveAssignmentIds, team.assignments.map((entry) => entry.id))) {
    throw new Error("prepared plan waves must contain every assignment exactly once in order");
  }

  const waveByAssignmentId = new Map(
    team.assignments.map((assignment) => [assignment.id, assignment.wave])
  );
  for (const assignment of team.assignments) {
    for (const dependency of assignment.governedEnvelope.dependencies) {
      if (waveByAssignmentId.get(dependency) >= assignment.wave) {
        throw new Error(
          `assignment ${assignment.id} dependency ${dependency} must belong to an earlier wave`
        );
      }
    }
  }

  if (team.executionStatus === "blocked") return;
  const leads = team.assignments.filter((assignment) => assignment.role === "lead");
  if (leads.length !== 1 || team.lead !== leads[0].agentId) {
    throw new Error("prepared plan requires exactly one accountable lead assignment");
  }
  const verifiers = team.assignments.filter((assignment) => assignment.role === "verifier");
  const verifierRequired = ["high", "critical"].includes(plan.task.risk)
    || plan.scenarioPolicy?.requiredRoles?.verifier === "independent";
  if (verifierRequired) {
    const finalWave = team.waves.at(-1);
    if (verifiers.length !== 1 || verifiers[0].wave !== finalWave?.order) {
      throw new Error("high-risk prepared plan requires one verifier assignment in the final wave");
    }
  }
  for (const verifier of verifiers) {
    if (verifier.agentId === team.lead) {
      throw new Error("prepared plan verifier must be distinct from the accountable lead");
    }
    if (verifier.governedEnvelope.ownership.mode !== "read-only") {
      throw new Error("prepared plan verifier must be read-only");
    }
    const writers = team.assignments.filter(
      (assignment) => assignment.governedEnvelope.ownership.mode === "write"
    );
    if (writers.some((writer) => writer.agentId === verifier.agentId)) {
      throw new Error("prepared plan verifier must be independent of every writer");
    }
    const dependencies = new Set(verifier.governedEnvelope.dependencies);
    const missingWriters = writers
      .map((writer) => writer.id)
      .filter((writerId) => !dependencies.has(writerId));
    if (missingWriters.length > 0) {
      throw new Error(
        `prepared plan verifier must depend on every writer assignment; missing: ${missingWriters.join(", ")}`
      );
    }
  }
}

function validateBasePlan(rawPlan) {
  const plan = cloneJson(rawPlan, "delivery execution plan");
  requireRecord(plan, "delivery execution plan");
  if (plan.schemaVersion !== SCHEMA_VERSION) throw new Error("delivery execution plan schemaVersion is invalid");
  const task = requireRecord(plan.task, "delivery execution plan task");
  requireString(task.id, "delivery execution plan task.id");
  requireUniqueStrings(task.authorizedActions, "delivery execution plan task.authorizedActions", { allowEmpty: false });
  if (plan.request?.task?.id !== task.id) throw new Error("delivery execution plan request.task.id must match task.id");
  const repositoryCommit = requireCommit(plan.repository?.expectedCommit, "delivery execution plan repository.expectedCommit");
  if (plan.request?.repository?.expectedCommit !== repositoryCommit) {
    throw new Error("delivery execution plan request repository commit must match");
  }
  if (plan.context?.taskId !== task.id) throw new Error("delivery execution plan context.taskId must match task.id");
  if (plan.context?.repositoryCommit !== repositoryCommit) {
    throw new Error("delivery execution plan context repositoryCommit must match");
  }
  requireHash(plan.context?.cacheKey, "delivery execution plan context.cacheKey");
  requireUniqueStrings(plan.requiredGateIds, "delivery execution plan requiredGateIds", { allowEmpty: false });
  const resources = validateSelectedResources(plan);
  if (plan.domain?.sourceGovernance === undefined) {
    throw new Error("DeliveryRequest v1 execution plan requires domain.sourceGovernance");
  }
  const sourceSnapshot = assertSourceReferenceSnapshot(plan.domain.sourceGovernance);
  validateTeam(plan, resources);
  if (!Array.isArray(plan.domain?.gates)) throw new Error("delivery execution plan domain.gates must be an array");
  const domainGateIds = new Set();
  plan.domain.gates = plan.domain.gates.map((gate, index) => {
    const validated = assertDomainGate(gate);
    if (domainGateIds.has(validated.id)) {
      throw new Error(`delivery execution plan domain.gates[${index}].id must be unique`);
    }
    domainGateIds.add(validated.id);
    return validated;
  });
  const domainGateOrder = plan.domain.gates.map((gate) => gate.id);
  if (!sameStringSet(plan.requiredGateIds, domainGateOrder)) {
    throw new Error("prepared plan requiredGateIds must exactly match domain resolved gates");
  }
  const selectedPackIds = requireUniqueStrings(
    plan.domain.selectedPackIds,
    "delivery execution plan domain.selectedPackIds",
    { allowEmpty: false }
  );
  const resolvedGateIds = requireUniqueStrings(
    plan.domain.resolvedGateIds,
    "delivery execution plan domain.resolvedGateIds",
    { allowEmpty: false }
  );
  if (!sameStringSet(resolvedGateIds, domainGateOrder)) {
    throw new Error("prepared plan domain.resolvedGateIds must exactly match domain.gates");
  }
  if (!sameStringSet(plan.scenarioPolicy?.requiredGateIds, plan.requiredGateIds)) {
    throw new Error("prepared plan scenarioPolicy.requiredGateIds must exactly match requiredGateIds");
  }
  const sourceDependencyAccounting = assertPlanSourceDependencyAccounting(
    plan.sourceDependencyAccounting,
    {
      selectedPackIds,
      selectedGateIds: resolvedGateIds,
      selectedResourceIds: resources.map((resource) => resource.id),
      sourceSnapshot
    }
  );
  {
    for (const gateId of sourceSnapshot.blockedGateIds) {
      if (!domainGateIds.has(gateId)) {
        throw new Error(`prepared plan source snapshot blocks unknown DomainGate: ${gateId}`);
      }
    }
    if (plan.codex?.sourceSnapshotDigest !== sourceSnapshot.snapshotDigest
      || plan.claude?.sourceSnapshotDigest !== sourceSnapshot.snapshotDigest) {
      throw new Error("prepared plan adapters must bind the authoritative source snapshot digest");
    }
    if (sourceSnapshot.status === "blocked" && plan.team.executionStatus !== "blocked") {
      throw new Error("blocked authoritative sources require a blocked no-execution team");
    }
    if (sourceDependencyAccounting.status === "blocked" && plan.team.executionStatus !== "blocked") {
      throw new Error("blocked plan source dependencies require a blocked no-execution team");
    }
  }
  return plan;
}

function validateFinalizationHost(hostOptions) {
  requireRecord(hostOptions, "execution finalization host options");
  if (Object.keys(hostOptions).length > 0) {
    throw new Error(
      "privileged host observation bridge is not installed; caller-supplied evidence authority is forbidden"
    );
  }
  return {
    finalizedAt: new Date().toISOString(),
    trusted: false,
    issuerId: null,
    ownerApproverIdentities: new Set()
  };
}

function manifestCore(plan, createdAt, contextExpiresAt) {
  return {
    schemaVersion: SCHEMA_VERSION,
    taskId: plan.task.id,
    repositoryCommit: plan.repository.expectedCommit,
    contextHash: canonicalDigest(plan.context, "prepared execution context"),
    promptHash: canonicalDigest({ codex: plan.codex ?? null, claude: plan.claude ?? null }, "prepared execution prompts"),
    sourceSnapshotDigest: plan.domain?.sourceGovernance?.snapshotDigest ?? null,
    createdAt,
    contextExpiresAt
  };
}

export function prepareExecutionPlan(rawPlan, { createdAt, contextTtlSeconds = 3600 } = {}) {
  if (isPlainRecord(rawPlan) && Object.hasOwn(rawPlan, "executionManifest")) {
    throw new Error("delivery execution plan is already prepared");
  }
  const plan = validateBasePlan(rawPlan);
  const preparedAt = requireIso(createdAt, "execution manifest createdAt");
  if (!Number.isSafeInteger(contextTtlSeconds) || contextTtlSeconds < 1 || contextTtlSeconds > 86400) {
    throw new Error("contextTtlSeconds must be an integer from 1 through 86400");
  }
  const requestedContextExpiresAt = new Date(
    new Date(preparedAt).valueOf() + contextTtlSeconds * 1000
  ).toISOString();
  const sourceSnapshot = plan.domain.sourceGovernance;
  if (sourceSnapshot.status === "current" && (
    sourceSnapshot.validUntil === null
    || new Date(preparedAt).valueOf() >= new Date(sourceSnapshot.validUntil).valueOf()
  )) {
    throw new Error("authoritative source snapshot is expired at execution preparation");
  }
  const contextExpiresAt = sourceSnapshot.status === "current"
    && new Date(sourceSnapshot.validUntil).valueOf() < new Date(requestedContextExpiresAt).valueOf()
    ? sourceSnapshot.validUntil
    : requestedContextExpiresAt;
  const core = manifestCore(plan, preparedAt, contextExpiresAt);
  const planDigest = canonicalDigest({ plan, executionManifest: core }, "prepared execution plan");
  return deepFreeze({
    ...plan,
    executionManifest: { ...core, runId: `run-${planDigest.slice(0, 24)}`, planDigest }
  });
}

export function validatePreparedExecutionPlan(rawPlan) {
  const prepared = cloneJson(rawPlan, "prepared execution plan");
  const manifest = requireRecord(prepared.executionManifest, "executionManifest");
  requireFields(manifest, new Set([
    "schemaVersion", "runId", "taskId", "planDigest", "repositoryCommit",
    "contextHash", "promptHash", "sourceSnapshotDigest", "createdAt", "contextExpiresAt"
  ]), "executionManifest");
  const plan = structuredClone(prepared);
  delete plan.executionManifest;
  const validatedPlan = validateBasePlan(plan);
  if (manifest.schemaVersion !== SCHEMA_VERSION) throw new Error("executionManifest schemaVersion is invalid");
  if (manifest.taskId !== validatedPlan.task.id) throw new Error("executionManifest taskId must match prepared plan");
  if (manifest.repositoryCommit !== validatedPlan.repository.expectedCommit) {
    throw new Error("executionManifest repositoryCommit must match prepared plan");
  }
  const createdAt = requireIso(manifest.createdAt, "executionManifest.createdAt");
  const contextExpiresAt = requireIso(manifest.contextExpiresAt, "executionManifest.contextExpiresAt");
  if (new Date(contextExpiresAt) <= new Date(createdAt)) {
    throw new Error("executionManifest contextExpiresAt must follow createdAt");
  }
  if (validatedPlan.domain.sourceGovernance.status === "current"
    && new Date(contextExpiresAt).valueOf()
      > new Date(validatedPlan.domain.sourceGovernance.validUntil).valueOf()) {
    throw new Error("executionManifest contextExpiresAt exceeds authoritative source validity");
  }
  const core = manifestCore(validatedPlan, createdAt, contextExpiresAt);
  if (manifest.contextHash !== core.contextHash) throw new Error("executionManifest contextHash does not match prepared plan");
  if (manifest.promptHash !== core.promptHash) throw new Error("executionManifest promptHash does not match prepared plan");
  if (manifest.sourceSnapshotDigest !== core.sourceSnapshotDigest) {
    throw new Error("executionManifest sourceSnapshotDigest does not match prepared plan");
  }
  const digest = canonicalDigest({ plan: validatedPlan, executionManifest: core }, "prepared execution plan");
  if (manifest.planDigest !== digest) throw new Error("executionManifest planDigest does not match prepared plan");
  if (manifest.runId !== `run-${digest.slice(0, 24)}`) throw new Error("executionManifest runId does not match planDigest");
  return deepFreeze({ ...validatedPlan, executionManifest: structuredClone(manifest) });
}

function validateRepositoryState(rawState, plan, label) {
  const state = requireRecord(rawState, label);
  requireFields(state, new Set(["commit", "dirty", "changedPaths"]), label);
  if (requireCommit(state.commit, `${label}.commit`) !== plan.repository.expectedCommit) {
    throw new Error(`${label}.commit must match prepared plan`);
  }
  if (typeof state.dirty !== "boolean") throw new Error(`${label}.dirty must be boolean`);
  const changedPaths = requireUniqueStrings(state.changedPaths, `${label}.changedPaths`);
  if (!changedPaths.every(canonicalPath)) {
    throw new Error(`${label}.changedPaths must contain canonical repository-relative paths`);
  }
  if (!state.dirty && changedPaths.length > 0) {
    throw new Error(`${label}.changedPaths must be empty when dirty is false`);
  }
  if (state.dirty && changedPaths.length === 0) {
    throw new Error(`${label}.changedPaths must be non-empty when dirty is true`);
  }
  return state;
}

function isDelegationToolName(toolName) {
  const normalized = toolName.toLowerCase().replace(/[^a-z0-9]+/gu, "-");
  const compact = normalized.replaceAll("-", "");
  return normalized.split("-").some((part) => (
    part === "spawn"
    || part === "delegate"
    || part === "delegation"
    || part === "subagent"
  )) || ["spawn", "delegate", "delegation", "subagent"].some((prefix) => (
    compact.startsWith(prefix)
  ));
}

function resolveExecutableToolBinding(plan, toolName, label) {
  const matches = plan.routing.selected.filter((resource) => (
    resource.type === "tool"
    && resource.eligibility?.eligible === true
    && resource.nativeAdapter?.kind === "project-script"
    && resource.commandReference?.kind === "project-script"
    && (resource.id === toolName || resource.nativeAdapter.id === toolName)
  ));
  if (matches.length !== 1) {
    throw new Error(
      `${label}.toolName must bind to exactly one selected executable tool or native adapter`
    );
  }
  const resource = matches[0];
  if (isDelegationToolName(resource.id) || isDelegationToolName(resource.nativeAdapter.id)) {
    throw new Error(`${label}.toolName spawn or delegation tool names are forbidden`);
  }
  validateInspectedCommandBinding(plan, resource, label);
  return resource;
}

function validateToolCalls(rawToolCalls, label, plan) {
  if (!Array.isArray(rawToolCalls)) throw new Error(`${label} must be an array`);
  const allowedActions = new Set(plan.task.authorizedActions);
  const ids = new Set();
  const boundResourceIds = new Set();
  return rawToolCalls.map((rawCall, index) => {
    const callLabel = `${label}[${index}]`;
    const call = requireRecord(rawCall, callLabel);
    requireFields(call, new Set([
      "toolCallId", "toolName", "authorizedAction", "inputHash", "status", "outputHash",
      "startedAt", "completedAt"
    ]), callLabel);
    const toolCallId = requireString(call.toolCallId, `${callLabel}.toolCallId`);
    if (ids.has(toolCallId)) throw new Error(`${callLabel}.toolCallId must be unique`);
    ids.add(toolCallId);
    const toolName = requireString(call.toolName, `${callLabel}.toolName`);
    if (isDelegationToolName(toolName)) {
      throw new Error(`${callLabel}.toolName spawn or delegation tool names are forbidden`);
    }
    const authorizedAction = requireString(call.authorizedAction, `${callLabel}.authorizedAction`);
    if (!allowedActions.has(authorizedAction)) {
      throw new Error(`${callLabel}.authorizedAction is not authorized by the task`);
    }
    const resource = resolveExecutableToolBinding(plan, toolName, callLabel);
    if (boundResourceIds.has(resource.id)) {
      throw new Error(
        `${callLabel} selected executable tool may be observed at most once per assignment event`
      );
    }
    boundResourceIds.add(resource.id);
    const requiredAction = TOOL_ACTIONS_BY_ADAPTER_KIND.get(resource.nativeAdapter.kind);
    if (authorizedAction !== requiredAction) {
      throw new Error(`${callLabel}.authorizedAction must match the selected executable tool policy`);
    }
    requireHash(call.inputHash, `${callLabel}.inputHash`);
    if (call.inputHash !== canonicalDigest(resource.commandReference, `${callLabel} command input`)) {
      throw new Error(`${callLabel}.inputHash must bind to the selected command reference`);
    }
    if (!new Set(["succeeded", "failed", "blocked"]).has(call.status)) {
      throw new Error(`${callLabel}.status is invalid`);
    }
    requireIso(call.startedAt, `${callLabel}.startedAt`);
    requireIso(call.completedAt, `${callLabel}.completedAt`);
    if (new Date(call.completedAt) < new Date(call.startedAt)) {
      throw new Error(`${callLabel}.completedAt must not precede startedAt`);
    }
    if (call.status === "succeeded") requireHash(call.outputHash, `${callLabel}.outputHash`);
    else if (call.outputHash !== null) requireHash(call.outputHash, `${callLabel}.outputHash`);
    return call;
  });
}

function validateEnvelopeIdentity(envelope, plan, label) {
  const manifest = plan.executionManifest;
  if (envelope.schemaVersion !== SCHEMA_VERSION) throw new Error(`${label}.schemaVersion is invalid`);
  if (envelope.runId !== manifest.runId) throw new Error(`${label}.runId must match prepared plan`);
  if (envelope.taskId !== manifest.taskId) throw new Error(`${label}.taskId must match prepared plan`);
  if (envelope.planDigest !== manifest.planDigest) throw new Error(`${label}.planDigest must match prepared plan`);
}

function validateEventEnvelope(rawEvents, plan) {
  const envelope = cloneJson(rawEvents, "execution event envelope");
  requireFields(envelope, new Set(["schemaVersion", "runId", "taskId", "planDigest", "events"]), "events");
  validateEnvelopeIdentity(envelope, plan, "events");
  if (!Array.isArray(envelope.events)) throw new Error("events.events must be an array");
  const assignments = new Map(plan.team.assignments.map((entry) => [entry.id, entry]));
  const eventIds = new Set();
  const sequences = new Set();
  const events = envelope.events.map((rawEvent, index) => {
    const label = `events.events[${index}]`;
    const event = requireRecord(rawEvent, label);
    requireFields(event, new Set([
      "schemaVersion", "eventId", "sequence", "type", "runId", "taskId", "planDigest",
      "assignmentId", "resourceId", "invocationId", "promptHash", "contextHash",
      "startedAt", "completedAt", "toolCalls", "outputHash", "repositoryState", "warnings"
    ]), label);
    validateEnvelopeIdentity(event, plan, label);
    const eventId = requireString(event.eventId, `${label}.eventId`);
    if (eventIds.has(eventId)) throw new Error(`${label}.eventId must be unique`);
    eventIds.add(eventId);
    if (!Number.isSafeInteger(event.sequence) || event.sequence < 1 || sequences.has(event.sequence)) {
      throw new Error(`${label}.sequence must be a unique positive integer`);
    }
    sequences.add(event.sequence);
    if (!EVENT_TYPES.has(event.type)) throw new Error(`${label}.type is invalid`);
    const assignment = assignments.get(requireString(event.assignmentId, `${label}.assignmentId`));
    if (!assignment) throw new Error(`${label}.assignmentId is not in prepared plan`);
    if (event.resourceId !== assignment.agentId) {
      throw new Error(`${label}.resourceId must match prepared assignment`);
    }
    requireString(event.invocationId, `${label}.invocationId`);
    if (event.promptHash !== plan.executionManifest.promptHash) {
      throw new Error(`${label}.promptHash must match prepared plan`);
    }
    if (event.contextHash !== plan.executionManifest.contextHash) {
      throw new Error(`${label}.contextHash must match prepared plan`);
    }
    requireIso(event.startedAt, `${label}.startedAt`);
    if (event.type === "assignment-started") {
      if (event.completedAt !== null || event.outputHash !== null) {
        throw new Error(`${label} started event cannot contain completion evidence`);
      }
    } else {
      requireIso(event.completedAt, `${label}.completedAt`);
      if (new Date(event.completedAt) < new Date(event.startedAt)) {
        throw new Error(`${label}.completedAt must not precede startedAt`);
      }
      if (event.type === "assignment-completed") {
        if (event.outputHash === null) throw new Error("completed event requires outputHash");
        requireHash(event.outputHash, `${label}.outputHash`);
      } else if (event.outputHash !== null) {
        requireHash(event.outputHash, `${label}.outputHash`);
      }
    }
    event.toolCalls = validateToolCalls(
      event.toolCalls,
      `${label}.toolCalls`,
      plan
    );
    if (event.type === "assignment-started" && event.toolCalls.length > 0) {
      throw new Error(`${label} started event cannot contain tool execution evidence`);
    }
    for (const toolCall of event.toolCalls) {
      if (
        new Date(toolCall.startedAt) < new Date(event.startedAt)
        || new Date(toolCall.completedAt) > new Date(event.completedAt)
      ) {
        throw new Error(`${label} tool call timestamps must stay within the assignment event window`);
      }
    }
    validateRepositoryState(event.repositoryState, plan, `${label}.repositoryState`);
    requireUniqueStrings(event.warnings, `${label}.warnings`);
    return event;
  }).sort((left, right) => left.sequence - right.sequence);
  for (let index = 0; index < events.length; index += 1) {
    if (events[index].sequence !== index + 1) {
      throw new Error("event sequences must be contiguous and start at 1");
    }
  }
  const observedToolCallIds = new Set();
  for (const event of events) {
    for (const toolCall of event.toolCalls) {
      if (observedToolCallIds.has(toolCall.toolCallId)) {
        throw new Error(`event toolCallId must be globally unique: ${toolCall.toolCallId}`);
      }
      observedToolCallIds.add(toolCall.toolCallId);
    }
  }
  const assignmentTerminals = new Set();
  const assignmentInvocations = new Map();
  const invocations = new Map();
  for (const event of events) {
    const assignedInvocation = assignmentInvocations.get(event.assignmentId);
    if (assignedInvocation && assignedInvocation !== event.invocationId) {
      throw new Error(`assignment cannot use multiple invocationIds: ${event.assignmentId}`);
    }
    assignmentInvocations.set(event.assignmentId, event.invocationId);
    const state = invocations.get(event.invocationId) ?? {
      assignmentId: event.assignmentId,
      started: null,
      terminal: null
    };
    if (state.assignmentId !== event.assignmentId) {
      throw new Error(`invocationId cannot span assignments: ${event.invocationId}`);
    }
    if (event.type === "assignment-started") {
      if (state.started) throw new Error(`invocation has multiple started events: ${event.invocationId}`);
      if (state.terminal) throw new Error(`started event cannot follow terminal event: ${event.assignmentId}`);
      state.started = event;
    } else {
      if (!state.started) {
        throw new Error(`terminal event requires a preceding started event: ${event.assignmentId}`);
      }
      if (state.terminal || assignmentTerminals.has(event.assignmentId)) {
        throw new Error(`assignment has multiple terminal events: ${event.assignmentId}`);
      }
      if (event.startedAt !== state.started.startedAt) {
        throw new Error(`terminal startedAt must match started event: ${event.assignmentId}`);
      }
      state.terminal = event;
      assignmentTerminals.add(event.assignmentId);
    }
    invocations.set(event.invocationId, state);
  }
  const startedByAssignment = new Map();
  const terminalByAssignment = new Map();
  for (const event of events) {
    if (event.type === "assignment-started") startedByAssignment.set(event.assignmentId, event);
    else terminalByAssignment.set(event.assignmentId, event);
  }
  for (const assignment of assignments.values()) {
    const started = startedByAssignment.get(assignment.id);
    if (!started) continue;
    const prerequisites = new Set(assignment.governedEnvelope.dependencies);
    for (const candidate of assignments.values()) {
      if (candidate.wave < assignment.wave) prerequisites.add(candidate.id);
    }
    for (const prerequisiteId of prerequisites) {
      const terminal = terminalByAssignment.get(prerequisiteId);
      if (
        !terminal
        || terminal.type !== "assignment-completed"
        || terminal.sequence >= started.sequence
        || new Date(terminal.completedAt) > new Date(started.startedAt)
      ) {
        throw new Error(
          `assignment ${assignment.id} started before successful prerequisite ${prerequisiteId}`
        );
      }
    }
  }
  return { ...envelope, events };
}

function uniqueOrdered(values) {
  return [...new Set(values)];
}

function planBlockingReasons(plan) {
  const reasons = [];
  if (plan.readinessState === "blocked") reasons.push("plan-readiness-blocked");
  if (plan.team.executionStatus === "blocked") reasons.push("team-execution-blocked");
  for (const competency of plan.routing.uncoveredCompetencies ?? []) {
    reasons.push(`uncovered-competency:${competency}`);
  }
  for (const gateId of plan.domain.blockedGateIds ?? []) reasons.push(`domain-gate-blocked:${gateId}`);
  return uniqueOrdered(reasons);
}

export function ingestExecutionEvents({ plan: rawPlan, events: rawEvents } = {}) {
  const plan = validatePreparedExecutionPlan(rawPlan);
  const envelope = validateEventEnvelope(rawEvents, plan);
  const blockingReasons = planBlockingReasons(plan);
  const warnings = [];
  for (const event of envelope.events) {
    warnings.push(...event.warnings);
    for (const toolCall of event.toolCalls) {
      if (toolCall.status !== "succeeded") {
        blockingReasons.push(`tool-call-${toolCall.status}:${event.assignmentId}:${toolCall.toolCallId}`);
      }
    }
    if (event.type === "assignment-failed") {
      blockingReasons.push(`event-failed:${event.assignmentId}`);
    } else if (event.type === "assignment-blocked") {
      blockingReasons.push(`event-blocked:${event.assignmentId}`);
    }
  }
  const observedAssignmentIds = uniqueOrdered(envelope.events.map((event) => event.assignmentId));
  const terminalAssignmentIds = uniqueOrdered(
    envelope.events.filter((event) => event.type !== "assignment-started").map((event) => event.assignmentId)
  );
  const invokedResourceIds = uniqueOrdered(envelope.events.map((event) => event.resourceId));
  const readinessState = blockingReasons.length > 0
    ? "blocked"
    : envelope.events.length > 0
      ? "in-progress"
      : "planned";
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    runId: plan.executionManifest.runId,
    taskId: plan.executionManifest.taskId,
    planDigest: plan.executionManifest.planDigest,
    eventDigest: canonicalDigest(envelope, "execution event envelope"),
    readinessState,
    observedAssignmentIds,
    terminalAssignmentIds,
    invokedResourceIds,
    warnings: uniqueOrdered(warnings),
    blockingReasons: uniqueOrdered(blockingReasons)
  });
}

function resolvedGatePolicies(plan) {
  return new Map(plan.domain.gates.map((gate) => [gate.id, gate]));
}

function requiresCommandEvidence(gate, verifierKind) {
  return COMMAND_EVIDENCE_TYPES.has(gate.evidenceType)
    || COMMAND_VERIFIER_KINDS.has(verifierKind);
}

function validateInspectedCommandBinding(plan, commandResource, label) {
  const inspection = requireRecord(plan.projectInspection, "delivery execution plan projectInspection");
  if (inspection.verifiedCommit !== plan.repository.expectedCommit) {
    throw new Error(`${label} project inspection commit must match prepared plan`);
  }
  if (!Array.isArray(inspection.commandReferences)) {
    throw new Error(`${label} requires inspected project command references`);
  }
  const commandReference = commandResource.commandReference;
  if (!inspection.commandReferences.some((reference) => sameJson(reference, commandReference))) {
    throw new Error(`${label} command reference must match inspected project command references`);
  }
  if (!Array.isArray(inspection.manifests)) {
    throw new Error(`${label} requires inspected project manifests`);
  }
  const manifest = inspection.manifests.find((entry) => (
    entry?.path === commandReference.manifestPath
    && entry?.sha256 === commandReference.digest
    && Array.isArray(entry?.scriptNames)
    && entry.scriptNames.includes(commandReference.scriptName)
  ));
  if (!manifest) {
    throw new Error(`${label} command reference must bind to its inspected manifest digest and script`);
  }
}

function validateChecks(rawChecks, label, {
  plan,
  assignment,
  resource,
  resourceInvocations,
  receiptOutputHash
}) {
  if (!Array.isArray(rawChecks)) throw new Error(`${label} must be an array`);
  const gatePolicies = resolvedGatePolicies(plan);
  const gateIds = new Set();
  return rawChecks.map((rawCheck, index) => {
    const checkLabel = `${label}[${index}]`;
    const check = requireRecord(rawCheck, checkLabel);
    requireFields(check, new Set([
      "gateId",
      "status",
      "outputHash",
      "evidenceType",
      "verifierKind",
      "producerAssignmentId",
      "producerResourceId",
      "approverIdentity",
      "commandEvidenceInvocationId"
    ]), checkLabel);
    const gateId = requireString(check.gateId, `${checkLabel}.gateId`);
    if (gateIds.has(gateId)) throw new Error(`${checkLabel}.gateId must be unique`);
    gateIds.add(gateId);
    const gate = gatePolicies.get(gateId);
    if (!gate) throw new Error(`${checkLabel}.gateId is not required by the prepared plan`);
    if (!CHECK_STATUSES.has(check.status)) throw new Error(`${checkLabel}.status is invalid`);
    if (check.outputHash !== null) requireHash(check.outputHash, `${checkLabel}.outputHash`);
    if (check.status === "passed" && check.outputHash !== receiptOutputHash) {
      throw new Error(`${checkLabel}.outputHash must bind to the producing receipt output`);
    }
    if (check.evidenceType !== gate.evidenceType) {
      throw new Error(`${checkLabel}.evidenceType must match DomainGate policy`);
    }
    if (!gate.verifierKinds.includes(check.verifierKind)) {
      throw new Error(`${checkLabel}.verifierKind is not authorized by DomainGate policy`);
    }
    if (check.producerAssignmentId !== assignment.id) {
      throw new Error(`${checkLabel}.producerAssignmentId must match the producing receipt`);
    }
    if (check.producerResourceId !== resource.id) {
      throw new Error(`${checkLabel}.producerResourceId must match the producing receipt`);
    }
    if (check.verifierKind === "owner-review") {
      requireString(check.approverIdentity, `${checkLabel}.approverIdentity`);
    } else {
      if (check.approverIdentity !== null) {
        throw new Error(`${checkLabel}.approverIdentity must be null without owner-review`);
      }
      if (
        !["specialist", "verifier"].includes(assignment.role)
        || !resource.eligibleRoles.includes(assignment.role)
        || assignment.governedEnvelope.ownership.mode !== "read-only"
      ) {
        throw new Error(`${checkLabel} requires an authorized read-only verification assignment`);
      }
      if (!(resource.verificationCapabilities ?? []).includes(check.verifierKind)) {
        throw new Error(
          `${checkLabel} producer resource is not authorized for verifier kind: ${check.verifierKind}`
        );
      }
      if (gate.id === "enterprise-independent-verification" && assignment.role !== "verifier") {
        throw new Error(`${checkLabel} requires the independent verifier assignment`);
      }
    }
    if (requiresCommandEvidence(gate, check.verifierKind)) {
      if (
        typeof check.commandEvidenceInvocationId !== "string"
        || check.commandEvidenceInvocationId === ""
        || check.commandEvidenceInvocationId !== check.commandEvidenceInvocationId.trim()
      ) {
        throw new Error(`${checkLabel}.commandEvidenceInvocationId is required for command evidence`);
      }
      const invocationId = check.commandEvidenceInvocationId;
      const invocation = resourceInvocations.find((entry) => entry.invocationId === invocationId);
      const commandResource = invocation === undefined
        ? undefined
        : plan.routing.selected.find((entry) => entry.id === invocation.resourceId);
      if (
        !invocation
        || commandResource?.type !== "tool"
        || commandResource.nativeAdapter?.kind !== "project-script"
        || commandResource.commandReference?.kind !== "project-script"
        || invocation.toolCallId === null
      ) {
        throw new Error(
          `${checkLabel}.commandEvidenceInvocationId must reference a successful selected project command invocation`
        );
      }
      validateInspectedCommandBinding(plan, commandResource, checkLabel);
      if (check.outputHash !== invocation.outputHash) {
        throw new Error(`${checkLabel}.outputHash must match command evidence invocation output`);
      }
    } else if (check.commandEvidenceInvocationId !== undefined && check.commandEvidenceInvocationId !== null) {
      throw new Error(`${checkLabel}.commandEvidenceInvocationId is allowed only for command-required gates`);
    }
    return check;
  });
}

function validateFreshness(rawFreshness, label) {
  const freshness = requireRecord(rawFreshness, label);
  requireFields(freshness, new Set(["state", "checkedAt", "sourceIds"]), label);
  if (!new Set(["current", "unresolved", "changed", "due", "check-failed", "missing-review"]).has(freshness.state)) {
    throw new Error(`${label}.state is invalid`);
  }
  requireIso(freshness.checkedAt, `${label}.checkedAt`);
  const sourceIds = requireUniqueStrings(freshness.sourceIds, `${label}.sourceIds`);
  if (freshness.state === "current" && sourceIds.length === 0) {
    throw new Error(`${label}.sourceIds must be non-empty when current`);
  }
  return freshness;
}

function validateResourceInvocations(rawInvocations, {
  plan,
  invokedResourceIds,
  toolCalls,
  assignmentInvocationId,
  receiptStartedAt,
  receiptCompletedAt,
  receiptOutputHash,
  label
}) {
  if (rawInvocations === undefined) return [];
  if (!Array.isArray(rawInvocations)) throw new Error(`${label} must be an array`);
  const selected = new Map(plan.routing.selected.map((resource) => [resource.id, resource]));
  const resourceIds = new Set();
  const invocationIds = new Set();
  const invocations = rawInvocations.map((rawInvocation, index) => {
    const invocationLabel = `${label}[${index}]`;
    const invocation = requireRecord(rawInvocation, invocationLabel);
    requireFields(
      invocation,
      new Set([
        "resourceId",
        "invocationId",
        "assignmentInvocationId",
        "resourceDigest",
        "adapterDigest",
        "commandReferenceDigest",
        "startedAt",
        "completedAt",
        "outputHash",
        "toolCallId"
      ]),
      invocationLabel
    );
    const resourceId = requireString(invocation.resourceId, `${invocationLabel}.resourceId`);
    const resource = selected.get(resourceId);
    if (!resource) throw new Error(`${invocationLabel}.resourceId is not selected`);
    if (!new Set(["skill", "tool"]).has(resource.type)) {
      throw new Error(`${invocationLabel}.resourceId must identify a selected skill or tool`);
    }
    if (resourceIds.has(resourceId)) throw new Error(`${invocationLabel}.resourceId must be unique`);
    resourceIds.add(resourceId);
    const invocationId = requireString(invocation.invocationId, `${invocationLabel}.invocationId`);
    if (invocationIds.has(invocationId)) throw new Error(`${invocationLabel}.invocationId must be unique`);
    invocationIds.add(invocationId);
    if (invocation.assignmentInvocationId !== assignmentInvocationId) {
      throw new Error(`${invocationLabel}.assignmentInvocationId must match the producing assignment`);
    }
    if (invocation.resourceDigest !== canonicalDigest(resource, `${invocationLabel} resource`)) {
      throw new Error(`${invocationLabel}.resourceDigest must match the selected ResourceContract`);
    }
    if (invocation.adapterDigest !== canonicalDigest(resource.nativeAdapter, `${invocationLabel} adapter`)) {
      throw new Error(`${invocationLabel}.adapterDigest must match the selected native adapter`);
    }
    requireIso(invocation.startedAt, `${invocationLabel}.startedAt`);
    requireIso(invocation.completedAt, `${invocationLabel}.completedAt`);
    if (
      new Date(invocation.completedAt) < new Date(invocation.startedAt)
      || new Date(invocation.startedAt) < new Date(receiptStartedAt)
      || new Date(invocation.completedAt) > new Date(receiptCompletedAt)
    ) {
      throw new Error(`${invocationLabel} timestamps must stay within the producing receipt`);
    }
    requireHash(invocation.outputHash, `${invocationLabel}.outputHash`);
    if (!invokedResourceIds.includes(resourceId)) {
      throw new Error(`${invocationLabel}.resourceId must also appear in invokedResourceIds`);
    }
    if (resource.type === "skill") {
      if (invocation.commandReferenceDigest !== null) {
        throw new Error(`${invocationLabel}.commandReferenceDigest must be null for a skill`);
      }
      if (invocation.toolCallId !== null) {
        throw new Error(`${invocationLabel}.toolCallId must be null for a skill`);
      }
      if (invocation.outputHash !== receiptOutputHash) {
        throw new Error(`${invocationLabel}.outputHash must bind to the producing receipt output`);
      }
    } else {
      if (
        invocation.commandReferenceDigest
        !== canonicalDigest(resource.commandReference, `${invocationLabel} command reference`)
      ) {
        throw new Error(`${invocationLabel}.commandReferenceDigest must match the selected command reference`);
      }
      const toolCallId = requireString(invocation.toolCallId, `${invocationLabel}.toolCallId`);
      const toolCall = toolCalls.find((call) => call.toolCallId === toolCallId);
      if (!toolCall) throw new Error(`${invocationLabel}.toolCallId must reference receipt toolCalls`);
      const adapterId = resource.nativeAdapter?.id;
      if (toolCall.toolName !== resourceId && toolCall.toolName !== adapterId) {
        throw new Error(`${invocationLabel}.toolCallId must identify the selected tool`);
      }
      if (
        toolCall.inputHash
        !== canonicalDigest(resource.commandReference, `${invocationLabel} command input`)
      ) {
        throw new Error(`${invocationLabel}.inputHash must bind to the selected command reference`);
      }
      if (toolCall.status !== "succeeded" || toolCall.outputHash !== invocation.outputHash) {
        throw new Error(`${invocationLabel} must match successful tool output evidence`);
      }
      if (toolCall.startedAt !== invocation.startedAt || toolCall.completedAt !== invocation.completedAt) {
        throw new Error(`${invocationLabel} timestamps must match the selected tool call`);
      }
    }
    return invocation;
  });

  const selectedProjectScripts = [...selected.values()].filter((resource) => (
    resource.type === "tool"
    && resource.nativeAdapter?.kind === "project-script"
    && resource.commandReference?.kind === "project-script"
  ));
  for (const toolCall of toolCalls) {
    const matchesSelectedProjectScript = selectedProjectScripts.some((resource) => (
      toolCall.toolName === resource.id || toolCall.toolName === resource.nativeAdapter?.id
    ));
    if (!matchesSelectedProjectScript) continue;
    const references = invocations.filter((invocation) => invocation.toolCallId === toolCall.toolCallId);
    if (references.length !== 1) {
      throw new Error(
        `${label} selected project-script tool call must be referenced exactly once: ${toolCall.toolCallId}`
      );
    }
  }
  return invocations;
}

function validateReceiptEnvelope(rawReceipts, plan) {
  const envelope = cloneJson(rawReceipts, "execution receipt envelope");
  requireFields(
    envelope,
    new Set(["schemaVersion", "runId", "taskId", "planDigest", "receipts"]),
    "receipts"
  );
  validateEnvelopeIdentity(envelope, plan, "receipts");
  if (!Array.isArray(envelope.receipts)) throw new Error("receipts.receipts must be an array");
  const assignments = new Map(plan.team.assignments.map((entry) => [entry.id, entry]));
  const selectedResources = new Map(plan.routing.selected.map((resource) => [resource.id, resource]));
  const receiptIds = new Set();
  const assignmentIds = new Set();
  const receiptToolCallIds = new Set();
  const receipts = envelope.receipts.map((rawReceipt, index) => {
    const label = `receipts.receipts[${index}]`;
    const receipt = requireRecord(rawReceipt, label);
    requireFields(receipt, new Set([
      "schemaVersion", "receiptId", "runId", "taskId", "planDigest", "assignmentId",
      "resourceId", "invokedResourceIds", "resourceInvocations", "invocationId", "promptHash", "contextHash",
      "startedAt", "completedAt", "toolCalls", "outputHash", "repositoryState", "warnings",
      "status", "exitCode", "checks", "freshness", "disconfirmingChecks", "reversalCriteria"
    ]), label);
    validateEnvelopeIdentity(receipt, plan, label);
    const receiptId = requireString(receipt.receiptId, `${label}.receiptId`);
    if (receiptIds.has(receiptId)) throw new Error(`${label}.receiptId must be unique`);
    receiptIds.add(receiptId);
    const assignmentId = requireString(receipt.assignmentId, `${label}.assignmentId`);
    const assignment = assignments.get(assignmentId);
    if (!assignment) throw new Error(`${label}.assignmentId is not in prepared plan`);
    if (assignmentIds.has(assignmentId)) throw new Error(`assignment has multiple receipts: ${assignmentId}`);
    assignmentIds.add(assignmentId);
    if (receipt.resourceId !== assignment.agentId) {
      throw new Error(`${label}.resourceId must match prepared assignment`);
    }
    const producingResource = selectedResources.get(receipt.resourceId);
    if (!producingResource) {
      throw new Error(`${label}.resourceId is not selected by the prepared plan`);
    }
    const invokedResourceIds = requireUniqueStrings(
      receipt.invokedResourceIds,
      `${label}.invokedResourceIds`,
      { allowEmpty: false }
    );
    for (const resourceId of invokedResourceIds) {
      if (!selectedResources.has(resourceId)) {
        throw new Error(`${label}.invokedResourceIds contains unselected resource: ${resourceId}`);
      }
    }
    if (!invokedResourceIds.includes(receipt.resourceId)) {
      throw new Error(`${label}.invokedResourceIds must include resourceId`);
    }
    requireString(receipt.invocationId, `${label}.invocationId`);
    if (receipt.promptHash !== plan.executionManifest.promptHash) {
      throw new Error(`${label}.promptHash must match prepared plan`);
    }
    if (receipt.contextHash !== plan.executionManifest.contextHash) {
      throw new Error(`${label}.contextHash must match prepared plan`);
    }
    requireIso(receipt.startedAt, `${label}.startedAt`);
    requireIso(receipt.completedAt, `${label}.completedAt`);
    if (new Date(receipt.completedAt) < new Date(receipt.startedAt)) {
      throw new Error(`${label}.completedAt must not precede startedAt`);
    }
    receipt.toolCalls = validateToolCalls(
      receipt.toolCalls,
      `${label}.toolCalls`,
      plan
    );
    for (const toolCall of receipt.toolCalls) {
      if (receiptToolCallIds.has(toolCall.toolCallId)) {
        throw new Error(`receipt toolCallId must be globally unique: ${toolCall.toolCallId}`);
      }
      receiptToolCallIds.add(toolCall.toolCallId);
      if (
        new Date(toolCall.startedAt) < new Date(receipt.startedAt)
        || new Date(toolCall.completedAt) > new Date(receipt.completedAt)
      ) {
        throw new Error(`${label} tool call timestamps must stay within the producing receipt`);
      }
    }
    if (receipt.outputHash !== null) requireHash(receipt.outputHash, `${label}.outputHash`);
    receipt.resourceInvocations = validateResourceInvocations(receipt.resourceInvocations, {
      plan,
      invokedResourceIds,
      toolCalls: receipt.toolCalls,
      assignmentInvocationId: receipt.invocationId,
      receiptStartedAt: receipt.startedAt,
      receiptCompletedAt: receipt.completedAt,
      receiptOutputHash: receipt.outputHash,
      label: `${label}.resourceInvocations`
    });
    validateRepositoryState(receipt.repositoryState, plan, `${label}.repositoryState`);
    requireUniqueStrings(receipt.warnings, `${label}.warnings`);
    if (!RECEIPT_STATUSES.has(receipt.status)) throw new Error(`${label}.status is invalid`);
    if (!Number.isSafeInteger(receipt.exitCode) || receipt.exitCode < 0 || receipt.exitCode > 255) {
      throw new Error(`${label}.exitCode must be an integer from 0 through 255`);
    }
    if (assignment.role === "verifier") {
      receipt.disconfirmingChecks = requireUniqueStrings(
        receipt.disconfirmingChecks,
        `${label}.disconfirmingChecks`,
        { allowEmpty: false }
      );
      receipt.reversalCriteria = requireUniqueStrings(
        receipt.reversalCriteria,
        `${label}.reversalCriteria`,
        { allowEmpty: false }
      );
    } else if (
      Object.hasOwn(receipt, "disconfirmingChecks")
      || Object.hasOwn(receipt, "reversalCriteria")
    ) {
      throw new Error(`${label} verifier evidence fields are allowed only for verifier receipts`);
    }
    receipt.checks = validateChecks(receipt.checks, `${label}.checks`, {
      plan,
      assignment,
      resource: producingResource,
      resourceInvocations: receipt.resourceInvocations,
      receiptOutputHash: receipt.outputHash
    });
    receipt.freshness = validateFreshness(receipt.freshness, `${label}.freshness`);
    if (new Date(receipt.freshness.checkedAt) > new Date(receipt.completedAt)) {
      throw new Error(`freshness checkedAt cannot be after receipt completedAt: ${assignmentId}`);
    }
    return receipt;
  });
  return { ...envelope, receipts };
}

function pathIsOwned(changedPath, ownedPaths) {
  return ownedPaths.some((ownedPath) => changedPath === ownedPath || changedPath.startsWith(`${ownedPath}/`));
}

function validateReceiptAgainstEvent(receipt, event) {
  if (receipt.invocationId !== event.invocationId) {
    throw new Error(`receipt invocationId must match terminal event: ${receipt.assignmentId}`);
  }
  if (receipt.resourceId !== event.resourceId) {
    throw new Error(`receipt resourceId must match terminal event: ${receipt.assignmentId}`);
  }
  if (receipt.startedAt !== event.startedAt) {
    throw new Error(`receipt startedAt must match terminal event: ${receipt.assignmentId}`);
  }
  if (receipt.completedAt !== event.completedAt) {
    throw new Error(`receipt completedAt must match terminal event: ${receipt.assignmentId}`);
  }
  if (receipt.outputHash !== event.outputHash) {
    throw new Error(`receipt outputHash must match terminal event: ${receipt.assignmentId}`);
  }
  if (!sameJson(receipt.toolCalls, event.toolCalls)) {
    throw new Error(`receipt toolCalls must match terminal event: ${receipt.assignmentId}`);
  }
  if (!sameJson(receipt.repositoryState, event.repositoryState)) {
    throw new Error(`receipt repositoryState must match terminal event: ${receipt.assignmentId}`);
  }
  if (!sameJson(receipt.warnings, event.warnings)) {
    throw new Error(`receipt warnings must match terminal event: ${receipt.assignmentId}`);
  }
}

export function finalizeExecutionRun(
  { plan: rawPlan, events: rawEvents, receipts: rawReceipts } = {},
  hostOptions = {}
) {
  const plan = validatePreparedExecutionPlan(rawPlan);
  const eventEnvelope = validateEventEnvelope(rawEvents, plan);
  const eventState = ingestExecutionEvents({ plan, events: eventEnvelope });
  const receiptEnvelope = validateReceiptEnvelope(rawReceipts, plan);
  const finalization = validateFinalizationHost(hostOptions);
  const blockingReasons = [...eventState.blockingReasons];
  const warnings = [...eventState.warnings];
  const terminalEvents = new Map(
    eventEnvelope.events
      .filter((event) => event.type !== "assignment-started")
      .map((event) => [event.assignmentId, event])
  );
  const assignments = new Map(plan.team.assignments.map((assignment) => [assignment.id, assignment]));
  const invokedResourceIds = [];
  const checks = [];
  const observedGateIds = new Set();
  const hasReleaseGate = plan.domain.gates.some(
    (gate) => plan.requiredGateIds.includes(gate.id) && gate.blockingStage === "verified-for-release"
  );
  const finalizedAtMs = new Date(finalization.finalizedAt).valueOf();
  const manifestCreatedAtMs = new Date(plan.executionManifest.createdAt).valueOf();
  const contextExpiresAtMs = new Date(plan.executionManifest.contextExpiresAt).valueOf();

  if (!finalization.trusted) blockingReasons.push("untrusted-evidence-issuer");
  for (const event of eventEnvelope.events) {
    const eventStartedAtMs = new Date(event.startedAt).valueOf();
    if (eventStartedAtMs < manifestCreatedAtMs) {
      blockingReasons.push(`event-before-preparation:${event.assignmentId}`);
    }
    if (eventStartedAtMs > finalizedAtMs) {
      blockingReasons.push(`event-after-finalization:${event.assignmentId}`);
    }
    if (event.completedAt !== null && new Date(event.completedAt).valueOf() > finalizedAtMs) {
      blockingReasons.push(`event-after-finalization:${event.assignmentId}`);
    }
    for (const toolCall of event.toolCalls) {
      if (new Date(toolCall.completedAt).valueOf() > finalizedAtMs) {
        blockingReasons.push(`tool-call-after-finalization:${event.assignmentId}:${toolCall.toolCallId}`);
      }
    }
  }

  for (const receipt of receiptEnvelope.receipts) {
    const terminalEvent = terminalEvents.get(receipt.assignmentId);
    if (!terminalEvent) {
      blockingReasons.push(`missing-terminal-event:${receipt.assignmentId}`);
    } else {
      validateReceiptAgainstEvent(receipt, terminalEvent);
    }
    invokedResourceIds.push(receipt.resourceId);
    invokedResourceIds.push(...receipt.resourceInvocations.map((invocation) => invocation.resourceId));
    warnings.push(...receipt.warnings);
    checks.push(...receipt.checks);
    if (receipt.outputHash === null) blockingReasons.push(`missing-output-hash:${receipt.assignmentId}`);
    if (receipt.exitCode !== 0) blockingReasons.push(`nonzero-exit:${receipt.assignmentId}`);
    if (receipt.status !== "passed") blockingReasons.push(`receipt-${receipt.status}:${receipt.assignmentId}`);
    const receiptStartedAtMs = new Date(receipt.startedAt).valueOf();
    const receiptCompletedAtMs = new Date(receipt.completedAt).valueOf();
    if (receiptStartedAtMs < manifestCreatedAtMs) {
      blockingReasons.push(`context-before-preparation:${receipt.assignmentId}`);
    }
    if (receiptStartedAtMs >= contextExpiresAtMs) {
      blockingReasons.push(`context-expired:${receipt.assignmentId}`);
    }
    if (receiptCompletedAtMs > contextExpiresAtMs) {
      blockingReasons.push(`context-expired-before-completion:${receipt.assignmentId}`);
    }
    if (receiptCompletedAtMs > finalizedAtMs) {
      blockingReasons.push(`receipt-after-finalization:${receipt.assignmentId}`);
    }
    if (finalizedAtMs - receiptCompletedAtMs > MAX_FINALIZATION_DELAY_MS) {
      blockingReasons.push(`receipt-stale-at-finalization:${receipt.assignmentId}`);
    }
    if (receipt.freshness.state !== "current") {
      blockingReasons.push(`freshness-unresolved:${receipt.assignmentId}`);
    } else {
      const freshnessCheckedAtMs = new Date(receipt.freshness.checkedAt).valueOf();
      if (freshnessCheckedAtMs > finalizedAtMs) {
        blockingReasons.push(`freshness-after-finalization:${receipt.assignmentId}`);
      } else if (hasReleaseGate && finalizedAtMs - freshnessCheckedAtMs > MAX_FINALIZATION_DELAY_MS) {
        blockingReasons.push(`freshness-stale:${receipt.assignmentId}`);
      }
    }
    for (const toolCall of receipt.toolCalls) {
      if (toolCall.status !== "succeeded") {
        blockingReasons.push(`tool-call-${toolCall.status}:${receipt.assignmentId}:${toolCall.toolCallId}`);
      }
    }
    for (const check of receipt.checks) {
      if (observedGateIds.has(check.gateId)) {
        blockingReasons.push(`duplicate-gate-evidence:${check.gateId}`);
      }
      observedGateIds.add(check.gateId);
      if (
        check.verifierKind === "owner-review"
        && !finalization.ownerApproverIdentities.has(check.approverIdentity)
      ) {
        blockingReasons.push(
          `unauthorized-owner-approver:${check.gateId}:${check.approverIdentity}`
        );
      }
      if (check.status !== "passed") {
        blockingReasons.push(`gate-${check.status}:${check.gateId}`);
      }
      if (check.outputHash === null) blockingReasons.push(`gate-missing-output-hash:${check.gateId}`);
    }
    const assignment = assignments.get(receipt.assignmentId);
    const changedPaths = receipt.repositoryState.changedPaths;
    if (receipt.repositoryState.dirty) {
      if (assignment.governedEnvelope.ownership.mode !== "write") {
        blockingReasons.push(`unauthorized-repository-change:${receipt.assignmentId}`);
      } else {
        for (const changedPath of changedPaths) {
          if (!pathIsOwned(changedPath, assignment.governedEnvelope.ownership.ownedPaths)) {
            blockingReasons.push(`ownership-escape:${receipt.assignmentId}:${changedPath}`);
          }
        }
      }
    }
  }

  const selectedResourceIds = plan.routing.selected.map((resource) => resource.id);
  const invoked = uniqueOrdered(invokedResourceIds);
  for (const resourceId of selectedResourceIds) {
    if (!invoked.includes(resourceId)) blockingReasons.push(`selected-resource-not-invoked:${resourceId}`);
  }
  const receiptAssignmentIds = receiptEnvelope.receipts.map((receipt) => receipt.assignmentId);
  for (const assignment of plan.team.assignments) {
    if (!receiptAssignmentIds.includes(assignment.id)) {
      blockingReasons.push(`assignment-missing-receipt:${assignment.id}`);
    }
  }
  for (const warning of uniqueOrdered(warnings)) blockingReasons.push(`unwaived-warning:${warning}`);

  const reasons = uniqueOrdered(blockingReasons);
  const evidence = buildExecutionEvidenceRecord({
    taskId: plan.task.id,
    selectedResources: selectedResourceIds,
    invokedResources: invoked,
    assignmentIds: plan.team.assignments.map((assignment) => assignment.id),
    receiptAssignmentIds,
    requiredChecks: plan.requiredGateIds,
    checks,
    warnings: uniqueOrdered(warnings),
    blockingReasons: reasons
  });
  const readinessState = evidence.verified
    ? hasReleaseGate ? "verified-for-release" : "verified-for-review"
    : "blocked";
  return deepFreeze({
    schemaVersion: SCHEMA_VERSION,
    runId: plan.executionManifest.runId,
    taskId: plan.executionManifest.taskId,
    planDigest: plan.executionManifest.planDigest,
    eventDigest: eventState.eventDigest,
    receiptDigest: canonicalDigest(receiptEnvelope, "execution receipt envelope"),
    finalizedAt: finalization.finalizedAt,
    evidenceIssuer: {
      trusted: finalization.trusted,
      issuerId: finalization.issuerId
    },
    readinessState,
    warnings: uniqueOrdered(warnings),
    blockingReasons: reasons,
    evidence
  });
}
