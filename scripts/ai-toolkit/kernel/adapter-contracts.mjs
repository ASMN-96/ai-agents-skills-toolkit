import { assertResourceContract } from "./contracts.mjs";
import { buildResourceDigestBindings, canonicalDigest } from "./canonical-digest.mjs";

const RAW_COMMAND_FIELDS = new Set([
  "command",
  "rawCommand",
  "projectCommands",
  "detectedTools"
]);
const RESOURCE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requiredString(value, field) {
  if (typeof value !== "string" || value === "" || value !== value.trim()) {
    throw new Error(`${field} must be a non-empty trimmed string`);
  }
  return value;
}

function requiredHash(value, field) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new Error(`${field} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function requiredNonNegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative safe integer`);
  }
  return value;
}

function rejectRawCommands(resource, index) {
  if (!isPlainRecord(resource)) return;
  for (const field of Object.keys(resource)) {
    if (RAW_COMMAND_FIELDS.has(field)) {
      throw new Error(`selectedResources[${index}].${field}: raw command strings are forbidden`);
    }
  }
}

export function validateSelectedResources(selectedResources, adapterName) {
  if (!Array.isArray(selectedResources)) {
    throw new Error(`${adapterName} adapter selectedResources must be an array`);
  }
  const seen = new Set();
  return selectedResources.map((resource, index) => {
    rejectRawCommands(resource, index);
    if (!isPlainRecord(resource) || !RESOURCE_ID_PATTERN.test(resource.id ?? "")) {
      throw new Error(`selectedResources[${index}].id must be a canonical resource id`);
    }
    const validated = assertResourceContract(resource);
    if (seen.has(validated.id)) {
      throw new Error(`selectedResources[${index}].id must be unique`);
    }
    seen.add(validated.id);
    if (!validated.eligibility.eligible) {
      throw new Error(`selected resource is ineligible: ${validated.id}`);
    }
    return validated;
  });
}

export function validateTaskTeam({ task, team, assertExecutionWavePlan, adapterName }) {
  const taskId = requiredString(task?.id, `${adapterName} adapter task.id`);
  const validatedTeam = assertExecutionWavePlan(team);
  if (validatedTeam.taskId !== taskId) {
    throw new Error(`${adapterName} adapter task.id must match the execution wave plan taskId`);
  }
  if (validatedTeam.taskDigest !== canonicalDigest(task, `${adapterName} adapter task`)) {
    throw new Error(`${adapterName} adapter task digest does not match the execution wave plan`);
  }
  return { taskId, validatedTeam };
}

export function validateDomainTeam(domainSelection, team, adapterName) {
  const digest = canonicalDigest(domainSelection, `${adapterName} adapter domain selection`);
  if (team.domainSelectionDigest !== digest) {
    throw new Error(`${adapterName} adapter domain digest does not match the execution wave plan`);
  }
  return domainSelection;
}

export function validateAssignmentResources(resources, team, adapterName) {
  const expectedBindings = buildResourceDigestBindings(resources);
  const plannedBindings = team.selectedResourceDigests;
  if (!Array.isArray(plannedBindings) || plannedBindings.length !== expectedBindings.length) {
    throw new Error(`${adapterName} adapter selected resource set does not match the execution wave plan`);
  }
  const plannedById = new Map(plannedBindings.map((binding) => [binding.resourceId, binding.digest]));
  for (const binding of expectedBindings) {
    if (!plannedById.has(binding.resourceId)) {
      throw new Error(`${adapterName} adapter selected resource set does not match the execution wave plan`);
    }
    if (plannedById.get(binding.resourceId) !== binding.digest) {
      throw new Error(
        `${adapterName} adapter selected resource digest does not match the execution wave plan: ${binding.resourceId}`
      );
    }
  }
  const resourceById = new Map(resources.map((resource) => [resource.id, resource]));
  for (const assignment of team.assignments) {
    if (resourceById.get(assignment.agentId)?.type !== "agent") {
      throw new Error(
        `${adapterName} adapter assignment resource is not a selected canonical agent: ${assignment.agentId}`
      );
    }
  }
  return resourceById;
}

export function buildContextReferences(context, adapterName) {
  const items = context?.items ?? [];
  if (!Array.isArray(items)) throw new Error(`${adapterName} adapter context.items must be an array`);
  const seen = new Set();
  return items.map((item, index) => {
    const field = `context.items[${index}]`;
    if (!isPlainRecord(item)) throw new Error(`${field} must be a plain record`);
    const id = requiredString(item.id, `${field}.id`);
    if (seen.has(id)) throw new Error(`${field}.id must be unique`);
    seen.add(id);
    if (item.contentTrust !== "untrusted-repository-data") {
      throw new Error(`${field}.contentTrust must remain untrusted-repository-data`);
    }
    if (!isPlainRecord(item.instructionAuthority) || item.instructionAuthority.mayOverrideSystemPolicy !== false) {
      throw new Error(`${field}.instructionAuthority must deny system-policy override`);
    }
    if (!isPlainRecord(item.originAttestation) || item.originAttestation.status !== "verified") {
      throw new Error(`${field}.originAttestation must be verified inspector evidence`);
    }
    if (!isPlainRecord(item.provenance)) throw new Error(`${field}.provenance must be a plain record`);
    const provenanceDigest = canonicalDigest(item.provenance, `${field}.provenance`);
    canonicalDigest(item.originAttestation, `${field}.originAttestation`);
    canonicalDigest(item.instructionAuthority, `${field}.instructionAuthority`);
    if (!Array.isArray(item.agentIds) || item.agentIds.some((agentId) => typeof agentId !== "string")) {
      throw new Error(`${field}.agentIds must be an array of agent IDs`);
    }
    return {
      id,
      kind: requiredString(item.kind, `${field}.kind`),
      source: requiredString(item.source, `${field}.source`),
      contentHash: requiredHash(item.contentHash, `${field}.contentHash`),
      contentTrust: item.contentTrust,
      instructionAuthority: structuredClone(item.instructionAuthority),
      originAttestation: structuredClone(item.originAttestation),
      provenance: structuredClone(item.provenance),
      provenanceDigest,
      sensitivity: requiredString(item.sensitivity, `${field}.sensitivity`),
      utf8Bytes: requiredNonNegativeInteger(item.utf8Bytes, `${field}.utf8Bytes`),
      tokenEstimate: requiredNonNegativeInteger(item.tokenEstimate, `${field}.tokenEstimate`),
      agentIds: [...item.agentIds]
    };
  });
}

export function buildAssignmentContextBindings(contextReferences, team, adapterName) {
  if (!Array.isArray(contextReferences)) {
    throw new Error(`${adapterName} adapter context references must be an array`);
  }
  return team.assignments.map((assignment) => ({
    assignmentId: assignment.id,
    agentId: assignment.agentId,
    contextReferenceIds: contextReferences
      .filter((reference) => reference.agentIds.length === 0 || reference.agentIds.includes(assignment.agentId))
      .map((reference) => reference.id)
  }));
}
