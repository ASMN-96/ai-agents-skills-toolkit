import { buildAssignmentContract } from "./collaboration-contracts.mjs";
import { buildResourceDigestBindings, canonicalDigest } from "./canonical-digest.mjs";
import { assertTrustedScopedLocalWriteResource } from "./resource-catalog.mjs";

function competencies(resource) {
  return Array.isArray(resource?.canonicalCompetencies)
    ? resource.canonicalCompetencies.map(String)
    : [];
}

function roles(resource) {
  return Array.isArray(resource?.eligibleRoles) ? resource.eligibleRoles.map(String) : [];
}

export function buildExpertTeam({ task, selectedResources }) {
  const agents = (Array.isArray(selectedResources) ? selectedResources : []).filter(
    (resource) => resource.type === "agent"
  );
  const leads = agents.filter((resource) => roles(resource).includes("lead"));
  if (leads.length !== 1) {
    throw new Error(`expert team requires exactly one accountable lead; received ${leads.length}`);
  }
  const lead = leads[0];
  const specialists = agents.filter(
    (resource) => resource.id !== lead.id && roles(resource).includes("specialist")
  );
  if (specialists.length > 2) {
    throw new Error(`expert team permits at most two specialists; received ${specialists.length}`);
  }
  const verifier = specialists.find(
    (resource) => roles(resource).includes("verifier")
      || competencies(resource).includes("verification")
  ) ?? null;
  if (["high", "critical"].includes(task?.risk) && !verifier) {
    throw new Error("high-risk expert teams require an independent verification specialist");
  }

  const assignments = [
    {
      resourceId: lead.id,
      responsibility: "accountable-lead",
      taskSlice: "integration-and-evidence",
      ownedCompetencies: competencies(lead)
    },
    ...specialists.map((resource) => ({
      resourceId: resource.id,
      responsibility: resource === verifier ? "independent-verifier" : "specialist-authority",
      taskSlice: `specialist:${resource.id}`,
      ownedCompetencies: competencies(resource)
    }))
  ];

  return {
    taskId: task?.id,
    lead: lead.id,
    specialists: specialists.map((resource) => resource.id),
    verifier: verifier?.id ?? null,
    assignments
  };
}

const WAVE_PLAN_FIELDS = new Set([
  "task",
  "resolvedGateIds",
  "selectedResources",
  "domainSelection",
  "trustedAssignmentIntents"
]);
const BUILT_EXECUTION_WAVE_PLANS = new WeakSet();

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

export function assertExecutionWavePlan(value) {
  if (!value || typeof value !== "object" || !BUILT_EXECUTION_WAVE_PLANS.has(value)) {
    throw new Error("execution manifest requires a validated planner-created execution wave plan");
  }
  return value;
}

export function buildBlockedExecutionWavePlan({
  task,
  blockers,
  selectedResources = [],
  domainSelection = null
}) {
  if (!task || typeof task.id !== "string" || task.id === "" || task.id !== task.id.trim()) {
    throw new Error("blocked execution wave plan requires a task id");
  }
  if (!Array.isArray(blockers) || blockers.length === 0) {
    throw new Error("blocked execution wave plan requires non-empty blockers");
  }
  const normalizedBlockers = [];
  const seen = new Set();
  for (const [index, blocker] of blockers.entries()) {
    if (typeof blocker !== "string" || blocker === "" || blocker !== blocker.trim()) {
      throw new Error(`blockers[${index}] must be a non-empty trimmed string`);
    }
    if (seen.has(blocker)) throw new Error(`blockers[${index}] must be unique`);
    seen.add(blocker);
    normalizedBlockers.push(blocker);
  }
  const plan = deepFreeze({
    schemaVersion: "1.0.0",
    taskId: task.id,
    taskDigest: canonicalDigest(task, "execution wave task"),
    selectedResourceDigests: buildResourceDigestBindings(selectedResources),
    domainSelectionDigest: domainSelection === null
      ? null
      : canonicalDigest(domainSelection, "execution wave domain selection"),
    lead: null,
    specialists: [],
    verifier: null,
    waves: [],
    assignments: [],
    blockers: normalizedBlockers,
    executionStatus: "blocked",
    actualExecutionProof: null,
    receiptProof: null
  });
  BUILT_EXECUTION_WAVE_PLANS.add(plan);
  return plan;
}

function pathsOverlap(left, right) {
  return left === right || left.startsWith(`${right}/`) || right.startsWith(`${left}/`);
}

function resourceById(selectedResources) {
  if (!Array.isArray(selectedResources)) {
    throw new Error("selectedResources must be an array");
  }
  const agents = new Map();
  for (const resource of selectedResources) {
    if (resource?.type !== "agent") continue;
    if (typeof resource.id !== "string" || resource.id === "" || resource.id !== resource.id.trim()) {
      throw new Error("selected agent resources require non-empty trimmed ids");
    }
    if (agents.has(resource.id)) throw new Error(`selected agent id must be unique: ${resource.id}`);
    agents.set(resource.id, resource);
  }
  return agents;
}

function validateAssignedRole(assignment, resource) {
  if (!resource) {
    throw new Error(`assignment ${assignment.id} references unselected agent ${assignment.agentId}`);
  }
  if (!roles(resource).includes(assignment.role)) {
    throw new Error(
      `assignment ${assignment.id} role ${assignment.role} is not eligible for agent ${assignment.agentId}`
    );
  }
  if (assignment.governedEnvelope.ownership.mode === "write") {
    assertTrustedScopedLocalWriteResource(resource, assignment.id);
  } else if (resource.runtimePosture?.sandboxMode === "workspace-write") {
    throw new Error(
      `read-only assignment ${assignment.id} cannot use fixed workspace-write capability`
    );
  }
}

function validateDependencies(assignments) {
  const byId = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  for (const assignment of assignments) {
    for (const dependencyId of assignment.governedEnvelope.dependencies) {
      const dependency = byId.get(dependencyId);
      if (!dependency) {
        throw new Error(
          `assignment ${assignment.id} dependency ${dependencyId} does not identify an assignment`
        );
      }
      if (dependency.wave >= assignment.wave) {
        throw new Error(
          `assignment ${assignment.id} dependency ${dependencyId} must belong to an earlier wave`
        );
      }
    }
  }
}

function validateWriterOwnership(assignments) {
  const ownership = assignments.flatMap((assignment) => {
    if (assignment.governedEnvelope.ownership.mode !== "write") return [];
    return assignment.governedEnvelope.ownership.ownedPaths.map((ownedPath) => ({
      assignmentId: assignment.id,
      ownedPath
    }));
  });
  for (let leftIndex = 0; leftIndex < ownership.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ownership.length; rightIndex += 1) {
      const left = ownership[leftIndex];
      const right = ownership[rightIndex];
      if (left.assignmentId === right.assignmentId) continue;
      if (pathsOverlap(left.ownedPath, right.ownedPath)) {
        throw new Error(
          `writer ownership overlap: ${left.ownedPath} (${left.assignmentId}) conflicts with ${right.ownedPath} (${right.assignmentId})`
        );
      }
    }
  }
}

function validateHighRiskVerifier({ task, assignments, waves, lead }) {
  if (!["high", "critical"].includes(task.risk)) return null;
  const finalWave = waves.at(-1);
  const verifierAssignments = assignments.filter((assignment) => assignment.role === "verifier");
  if (
    verifierAssignments.length !== 1
    || verifierAssignments[0].wave !== finalWave.order
  ) {
    throw new Error(
      "high-risk execution waves require one verifier assignment in the final wave"
    );
  }
  const verifier = verifierAssignments[0];
  if (verifier.agentId === lead) {
    throw new Error("verifier must be distinct from the accountable lead");
  }
  if (verifier.governedEnvelope.ownership.mode !== "read-only") {
    throw new Error("verifier must be read-only");
  }
  const writers = assignments.filter(
    (assignment) => assignment.governedEnvelope.ownership.mode === "write"
  );
  if (writers.some((assignment) => assignment.agentId === verifier.agentId)) {
    throw new Error("verifier must be independent of every writer");
  }
  const dependencies = new Set(verifier.governedEnvelope.dependencies);
  const missingWriterDependencies = writers
    .map((assignment) => assignment.id)
    .filter((assignmentId) => !dependencies.has(assignmentId));
  if (missingWriterDependencies.length > 0) {
    throw new Error(
      `verifier must depend on every writer assignment; missing: ${missingWriterDependencies.join(", ")}`
    );
  }
  return verifier.agentId;
}

function validateVerifierWriterDependencies(assignments) {
  const writers = assignments.filter(
    (assignment) => assignment.governedEnvelope.ownership.mode === "write"
  );
  if (writers.length === 0) return;
  const writerIds = writers.map((assignment) => assignment.id);
  for (const verifier of assignments.filter((assignment) => assignment.role === "verifier")) {
    if (verifier.governedEnvelope.ownership.mode !== "read-only") {
      throw new Error("verifier must be read-only");
    }
    if (writers.some((writer) => writer.agentId === verifier.agentId)) {
      throw new Error("verifier must be independent of every writer");
    }
    const dependencies = new Set(verifier.governedEnvelope.dependencies);
    const missing = writerIds.filter((assignmentId) => !dependencies.has(assignmentId));
    if (missing.length > 0) {
      throw new Error(
        `verifier must depend on every writer assignment; missing: ${missing.join(", ")}`
      );
    }
  }
}

export function buildExecutionWavePlan(input) {
  if (!isPlainRecord(input)) throw new Error("execution wave planner input must be a plain record");
  for (const field of Object.keys(input)) {
    if (!WAVE_PLAN_FIELDS.has(field)) {
      throw new Error(`execution wave planner input ${field} is not allowed`);
    }
  }
  const {
    task,
    resolvedGateIds,
    selectedResources,
    domainSelection = null,
    trustedAssignmentIntents
  } = input;
  if (!Array.isArray(trustedAssignmentIntents) || trustedAssignmentIntents.length === 0) {
    throw new Error("trustedAssignmentIntents must be a non-empty internal planner array");
  }
  const agents = resourceById(selectedResources);
  const assignmentIds = new Set();
  const assignments = trustedAssignmentIntents.map((intent) => {
    const assignment = buildAssignmentContract({ task, resolvedGateIds, assignment: intent });
    if (assignmentIds.has(assignment.id)) {
      throw new Error(`assignment id must be unique: ${assignment.id}`);
    }
    assignmentIds.add(assignment.id);
    validateAssignedRole(assignment, agents.get(assignment.agentId));
    return assignment;
  });

  const leadIdentities = new Set(
    assignments
      .filter((assignment) => assignment.role === "lead")
      .map((assignment) => assignment.agentId)
  );
  if (leadIdentities.size !== 1) {
    throw new Error(
      `execution waves require exactly one accountable lead identity; received ${leadIdentities.size}`
    );
  }
  const lead = [...leadIdentities][0];
  const sortedAssignments = assignments
    .map((assignment, index) => ({ assignment, index }))
    .sort((left, right) => left.assignment.wave - right.assignment.wave || left.index - right.index)
    .map(({ assignment }) => assignment);
  const waveOrders = [...new Set(sortedAssignments.map((assignment) => assignment.wave))];
  const waves = waveOrders.map((order) => {
    const waveAssignments = sortedAssignments.filter((assignment) => assignment.wave === order);
    const leadAssignments = waveAssignments.filter((assignment) => assignment.role === "lead");
    const specialistAssignments = waveAssignments.filter((assignment) => assignment.role !== "lead");
    if (leadAssignments.length > 1) {
      throw new Error(
        `wave ${order} permits at most one lead assignment; received ${leadAssignments.length}`
      );
    }
    if (specialistAssignments.length > 2) {
      throw new Error(
        `wave ${order} permits at most two specialists; received ${specialistAssignments.length}`
      );
    }
    const waveAgentIds = waveAssignments.map((assignment) => assignment.agentId);
    if (new Set(waveAgentIds).size !== waveAgentIds.length) {
      throw new Error(`wave ${order} may assign each agent at most once`);
    }
    return {
      id: `wave-${order}`,
      order,
      lead: leadAssignments[0]?.agentId ?? null,
      specialists: specialistAssignments.map((assignment) => assignment.agentId),
      assignments: waveAssignments
    };
  });

  validateDependencies(sortedAssignments);
  validateWriterOwnership(sortedAssignments);
  const highRiskVerifier = validateHighRiskVerifier({
    task,
    assignments: sortedAssignments,
    waves,
    lead
  });
  validateVerifierWriterDependencies(sortedAssignments);
  const verifier = highRiskVerifier
    ?? sortedAssignments.find((assignment) => assignment.role === "verifier")?.agentId
    ?? null;

  const plan = deepFreeze({
    schemaVersion: "1.0.0",
    taskId: sortedAssignments[0].governedEnvelope.taskId,
    taskDigest: canonicalDigest(task, "execution wave task"),
    selectedResourceDigests: buildResourceDigestBindings(selectedResources),
    domainSelectionDigest: domainSelection === null
      ? null
      : canonicalDigest(domainSelection, "execution wave domain selection"),
    lead,
    specialists: [...new Set(
      sortedAssignments
        .filter((assignment) => assignment.role !== "lead")
        .map((assignment) => assignment.agentId)
    )],
    verifier,
    waves,
    assignments: sortedAssignments,
    executionStatus: "planned",
    actualExecutionProof: null,
    receiptProof: null
  });
  BUILT_EXECUTION_WAVE_PLANS.add(plan);
  return plan;
}
