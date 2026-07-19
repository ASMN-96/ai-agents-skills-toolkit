const SCHEMA_VERSION = "1.0.0";

const RISK_VALUES = new Set(["low", "medium", "high", "critical"]);
const ASSIGNMENT_ROLES = new Set(["lead", "specialist", "verifier"]);
const OWNERSHIP_MODES = new Set(["read-only", "write"]);
const COLLABORATION_EVENT_TYPES = new Set([
  "assignment-created",
  "handoff-planned",
  "stop-requested",
  "evidence-requested",
  "context-requested"
]);
const ASSIGNMENT_FIELDS = new Set([
  "id",
  "agentId",
  "role",
  "wave",
  "responsibility",
  "ownership",
  "dependencies",
  "stopConditionRefs",
  "evidenceRefs",
  "contextRefs"
]);
const ASSIGNMENT_PROOF_FIELDS = new Set([
  "actualExecutionProof",
  "actualSpawnProof",
  "completedAt",
  "executed",
  "executionProof",
  "invocationId",
  "observed",
  "receiptProof",
  "successful",
  "verified"
]);
const BUILT_ASSIGNMENT_CONTRACTS = new WeakSet();

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, field) {
  return isPlainRecord(value) && Object.prototype.hasOwnProperty.call(value, field);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty trimmed string`);
  }
  return value;
}

function uniqueStrings(value, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const result = [];
  const seen = new Set();
  value.forEach((entry, index) => {
    const item = requiredString(entry, `${field}[${index}]`);
    if (seen.has(item)) throw new Error(`${field}[${index}] must be unique`);
    seen.add(item);
    result.push(item);
  });
  if (!allowEmpty && result.length === 0) throw new Error(`${field} must not be empty`);
  return result;
}

function rejectUnknownFields(value, allowed, field) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`${field}.${key} is not allowed`);
  }
}

export function isCanonicalRepositoryOwnedPath(value) {
  if (
    typeof value !== "string"
    || value === ""
    || value !== value.trim()
    || value === "."
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

function isCanonicalTaskBoundaryPath(value) {
  return value === "." || isCanonicalRepositoryOwnedPath(value);
}

function pathContains(container, candidate) {
  return container === "." || candidate === container || candidate.startsWith(`${container}/`);
}

function pathsOverlap(left, right) {
  return pathContains(left, right) || pathContains(right, left);
}

function isReservedRepositoryMetadata(ownedPath) {
  return ownedPath.split("/", 1)[0].toLowerCase() === ".git";
}

function validateAcceptanceCriteria(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("task.acceptanceCriteria must be a non-empty array");
  }
  const ids = new Set();
  return value.map((criterion, index) => {
    const field = `task.acceptanceCriteria[${index}]`;
    if (!isPlainRecord(criterion)) throw new Error(`${field} must be a plain record`);
    rejectUnknownFields(criterion, new Set(["id", "statement", "requiredGateIds"]), field);
    const id = requiredString(criterion.id, `${field}.id`);
    if (ids.has(id)) throw new Error(`${field}.id must be unique`);
    ids.add(id);
    return {
      id,
      statement: requiredString(criterion.statement, `${field}.statement`),
      requiredGateIds: uniqueStrings(
        criterion.requiredGateIds,
        `${field}.requiredGateIds`,
        { allowEmpty: false }
      )
    };
  });
}

function validateTask(task, resolvedGateIds) {
  if (!isPlainRecord(task)) throw new Error("task must be a plain record");
  const risk = requiredString(task.risk, "task.risk");
  if (!RISK_VALUES.has(risk)) {
    throw new Error(`task.risk must be one of: ${[...RISK_VALUES].join(", ")}`);
  }
  const taskGateIds = uniqueStrings(task.gates ?? [], "task.gates");
  const resolved = uniqueStrings(resolvedGateIds, "resolvedGateIds");
  const resolvedSet = new Set(resolved);
  for (const gateId of taskGateIds) {
    if (!resolvedSet.has(gateId)) {
      throw new Error(`resolvedGateIds must include task gate ${gateId}`);
    }
  }
  const acceptanceCriteria = validateAcceptanceCriteria(task.acceptanceCriteria);
  for (const criterion of acceptanceCriteria) {
    for (const gateId of criterion.requiredGateIds) {
      if (!resolvedSet.has(gateId)) {
        throw new Error(`resolvedGateIds must include acceptance-criterion gate ${gateId}`);
      }
    }
  }
  return {
    taskId: requiredString(task.id, "task.id"),
    goal: requiredString(task.goal, "task.goal"),
    scenario: requiredString(task.scenario, "task.scenario"),
    risk,
    scope: uniqueStrings(task.scope, "task.scope", { allowEmpty: false }),
    exclusions: uniqueStrings(task.exclusions, "task.exclusions"),
    constraints: uniqueStrings(task.constraints, "task.constraints"),
    authorizedActions: uniqueStrings(
      task.authorizedActions,
      "task.authorizedActions",
      { allowEmpty: false }
    ),
    acceptanceCriteria,
    taskGateIds,
    resolvedGateIds: resolved
  };
}

function validateOwnership(value, taskFields, assignmentId) {
  if (!isPlainRecord(value)) throw new Error("assignment.ownership must be a plain record");
  rejectUnknownFields(value, new Set(["mode", "ownedPaths"]), "assignment.ownership");
  if (!OWNERSHIP_MODES.has(value.mode)) {
    throw new Error("assignment.ownership.mode must be read-only or write");
  }
  if (!Array.isArray(value.ownedPaths)) {
    throw new Error(
      "assignment.ownership.ownedPaths must contain non-empty canonical POSIX repository-relative paths"
    );
  }
  const ownedPaths = uniqueStrings(value.ownedPaths, "assignment.ownership.ownedPaths");
  if (value.mode === "write" && ownedPaths.length === 0) {
    throw new Error(
      "assignment.ownership.ownedPaths must contain non-empty canonical POSIX repository-relative paths for write assignments"
    );
  }
  if (!ownedPaths.every(isCanonicalRepositoryOwnedPath)) {
    throw new Error(
      "assignment.ownership.ownedPaths must contain non-empty canonical POSIX repository-relative paths"
    );
  }
  if (value.mode === "write" && !taskFields.authorizedActions.includes("scoped-local-write")) {
    throw new Error(`write assignment ${assignmentId} requires task authorization scoped-local-write`);
  }
  if (value.mode === "write") {
    for (const ownedPath of ownedPaths) {
      if (isReservedRepositoryMetadata(ownedPath)) {
        throw new Error(`owned path ${ownedPath} targets reserved repository metadata`);
      }
      if (!taskFields.scope.some(
        (scopePath) => isCanonicalTaskBoundaryPath(scopePath) && pathContains(scopePath, ownedPath)
      )) {
        throw new Error(`owned path ${ownedPath} is outside task.scope`);
      }
      const exclusion = taskFields.exclusions.find(
        (excludedPath) => isCanonicalTaskBoundaryPath(excludedPath)
          && pathsOverlap(ownedPath, excludedPath)
      );
      if (exclusion) {
        throw new Error(`owned path ${ownedPath} overlaps task exclusion ${exclusion}`);
      }
    }
  }
  return { mode: value.mode, ownedPaths };
}

function buildGovernedEnvelope({ task, resolvedGateIds, assignment }) {
  const taskFields = validateTask(task, resolvedGateIds);
  const ownership = validateOwnership(assignment.ownership, taskFields, assignment.id);
  return deepFreeze({
    ...taskFields,
    ownership,
    dependencies: uniqueStrings(assignment.dependencies, "assignment.dependencies"),
    stopConditionRefs: uniqueStrings(
      assignment.stopConditionRefs,
      "assignment.stopConditionRefs"
    ),
    evidenceRefs: uniqueStrings(assignment.evidenceRefs, "assignment.evidenceRefs"),
    contextRefs: uniqueStrings(assignment.contextRefs, "assignment.contextRefs")
  });
}

function assertBuiltAssignment(value) {
  if (
    !BUILT_ASSIGNMENT_CONTRACTS.has(value)
    ||
    !isPlainRecord(value)
    || value.schemaVersion !== SCHEMA_VERSION
    || value.kind !== "assignment"
    || !isPlainRecord(value.governedEnvelope)
    || !Object.isFrozen(value)
    || !Object.isFrozen(value.governedEnvelope)
  ) {
    throw new Error(
      "assignment must be a validated immutable assignment contract created by buildAssignmentContract"
    );
  }
  return value;
}

function frozenArtifact(value) {
  return deepFreeze(value);
}

export function buildAssignmentContract({ task, resolvedGateIds, assignment }) {
  if (!isPlainRecord(assignment)) throw new Error("assignment must be a plain record");
  if (Object.keys(assignment).some((field) => ASSIGNMENT_PROOF_FIELDS.has(field))) {
    throw new Error("assignment proof claims are forbidden");
  }
  rejectUnknownFields(assignment, ASSIGNMENT_FIELDS, "assignment");
  const id = requiredString(assignment.id, "assignment.id");
  const agentId = requiredString(assignment.agentId, "assignment.agentId");
  const role = requiredString(assignment.role, "assignment.role");
  if (!ASSIGNMENT_ROLES.has(role)) {
    throw new Error("assignment.role must be lead, specialist, or verifier");
  }
  if (!Number.isSafeInteger(assignment.wave) || assignment.wave < 1) {
    throw new Error("assignment.wave must be a positive safe integer");
  }
  const governedEnvelope = buildGovernedEnvelope({ task, resolvedGateIds, assignment });
  const builtAssignment = frozenArtifact({
    schemaVersion: SCHEMA_VERSION,
    kind: "assignment",
    id,
    agentId,
    role,
    wave: assignment.wave,
    responsibility: requiredString(assignment.responsibility, "assignment.responsibility"),
    governedEnvelope,
    executionStatus: "planned",
    executionProof: null,
    receiptProof: null
  });
  BUILT_ASSIGNMENT_CONTRACTS.add(builtAssignment);
  return builtAssignment;
}

export function buildHandoffContract({ assignment, handoff }) {
  const source = assertBuiltAssignment(assignment);
  if (!isPlainRecord(handoff)) throw new Error("handoff must be a plain record");
  if (handoff.status !== "planned") throw new Error("handoff status must remain planned");
  rejectUnknownFields(
    handoff,
    new Set(["id", "fromAgentId", "toAgentId", "reason", "status"]),
    "handoff"
  );
  const fromAgentId = requiredString(handoff.fromAgentId, "handoff.fromAgentId");
  if (fromAgentId !== source.agentId) {
    throw new Error("handoff.fromAgentId must match the assigned agent");
  }
  const toAgentId = requiredString(handoff.toAgentId, "handoff.toAgentId");
  if (toAgentId === fromAgentId) throw new Error("handoff agents must be distinct");
  return frozenArtifact({
    schemaVersion: SCHEMA_VERSION,
    kind: "handoff",
    id: requiredString(handoff.id, "handoff.id"),
    assignmentId: source.id,
    fromAgentId,
    toAgentId,
    reason: requiredString(handoff.reason, "handoff.reason"),
    status: "planned",
    governedEnvelope: source.governedEnvelope,
    executionProof: null,
    receiptProof: null
  });
}

export function buildCollaborationEvent({ assignment, event }) {
  const source = assertBuiltAssignment(assignment);
  if (!isPlainRecord(event)) throw new Error("event must be a plain record");
  rejectUnknownFields(
    event,
    new Set(["id", "type", "actorAgentId", "sequence"]),
    "event"
  );
  if (!COLLABORATION_EVENT_TYPES.has(event.type)) {
    throw new Error("event type must be a non-execution collaboration event");
  }
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) {
    throw new Error("event.sequence must be a positive safe integer");
  }
  return frozenArtifact({
    schemaVersion: SCHEMA_VERSION,
    kind: "collaboration-event",
    id: requiredString(event.id, "event.id"),
    assignmentId: source.id,
    type: event.type,
    actorAgentId: requiredString(event.actorAgentId, "event.actorAgentId"),
    sequence: event.sequence,
    status: "planned",
    governedEnvelope: source.governedEnvelope,
    executionProof: null,
    receiptProof: null
  });
}

export function buildExecutionReceipt({ assignment, receipt }) {
  const source = assertBuiltAssignment(assignment);
  if (!isPlainRecord(receipt)) throw new Error("receipt must be a plain record");
  if (
    receipt.status !== "planned"
    || Object.keys(receipt).some((field) => !new Set(["id", "status"]).has(field))
  ) {
    throw new Error(
      "observed or successful execution receipts require the full evidence contract; this builder emits planned unobserved receipts only"
    );
  }
  return frozenArtifact({
    schemaVersion: SCHEMA_VERSION,
    kind: "execution-receipt",
    id: requiredString(receipt.id, "receipt.id"),
    assignmentId: source.id,
    status: "planned",
    governedEnvelope: source.governedEnvelope,
    observation: {
      observed: false,
      invocationId: null,
      startedAt: null,
      completedAt: null,
      exitCode: null,
      outputHash: null,
      taskDigest: null,
      repositoryDigest: null
    },
    executionProof: null,
    receiptProof: null
  });
}
