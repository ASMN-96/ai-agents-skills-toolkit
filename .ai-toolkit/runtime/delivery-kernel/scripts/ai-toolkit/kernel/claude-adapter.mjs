import { buildHandoffContract } from "./collaboration-contracts.mjs";
import {
  buildAssignmentContextBindings,
  buildContextReferences,
  deepFreeze,
  validateAssignmentResources,
  validateDomainTeam,
  validateSelectedResources,
  validateTaskTeam
} from "./adapter-contracts.mjs";
import { assertDomainSelectionResult } from "./domain-packs.mjs";
import {
  assertExecutionWavePlan,
  buildBlockedExecutionWavePlan
} from "./team-planner.mjs";

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean).map(String))];
}

function plannedHandoffs(team) {
  const assignmentsById = new Map(team.assignments.map((assignment) => [assignment.id, assignment]));
  const handoffs = [];
  for (const target of team.assignments) {
    for (const dependencyId of target.governedEnvelope.dependencies) {
      const source = assignmentsById.get(dependencyId);
      if (!source || source.agentId === target.agentId) continue;
      handoffs.push(buildHandoffContract({
        assignment: source,
        handoff: {
          id: `handoff-${source.id}-to-${target.id}`,
          fromAgentId: source.agentId,
          toAgentId: target.agentId,
          reason: `planned dependency handoff to ${target.id}`,
          status: "planned"
        }
      }));
    }
  }
  return handoffs;
}

export function buildClaudeExecutionPlan({ task, selectedResources, team, context, domainPack }) {
  const { taskId, validatedTeam } = validateTaskTeam({
    task,
    team,
    assertExecutionWavePlan,
    adapterName: "Claude"
  });
  const validatedDomain = assertDomainSelectionResult(domainPack);
  validateDomainTeam(validatedDomain, validatedTeam, "Claude");
  const resources = validateSelectedResources(selectedResources, "Claude");
  validateAssignmentResources(resources, validatedTeam, "Claude");
  const domainBlockers = validatedDomain.status === "blocked"
    ? validatedDomain.blockedGateIds.map((gateId) => `domain-gate-blocked:${gateId}`)
    : [];
  if (validatedDomain.status === "blocked" && domainBlockers.length === 0) {
    domainBlockers.push("domain-status:blocked");
  }
  const projectedTeam = validatedDomain.status === "blocked"
      ? buildBlockedExecutionWavePlan({
        task,
        blockers: uniqueStrings([...(validatedTeam.blockers ?? []), ...domainBlockers]),
        selectedResources: resources,
        domainSelection: validatedDomain
      })
    : validatedTeam;
  const blocked = projectedTeam.executionStatus === "blocked";
  const handoffs = blocked ? [] : plannedHandoffs(projectedTeam);
  const contextReferences = buildContextReferences(context, "Claude");

  return deepFreeze({
    schemaVersion: "1.0.0",
    adapter: "claude-code",
    taskId,
    recommendationMode: "recommendations-only",
    runtimeAvailability: "unverified",
    runtimeAvailabilityProof: null,
    configurationMutation: null,
    permissionMutation: null,
    selectedResourceIds: resources.map((resource) => resource.id),
    recommendedSubagentIds: resources
      .filter((resource) => resource.type === "agent")
      .map((resource) => resource.id),
    requiredSkillIds: resources
      .filter((resource) => resource.type === "skill")
      .map((resource) => resource.id),
    supportToolIds: resources
      .filter((resource) => resource.type === "tool")
      .map((resource) => resource.id),
    contextReferences,
    assignmentContextBindings: buildAssignmentContextBindings(
      contextReferences,
      projectedTeam,
      "Claude"
    ),
    domainPackIds: [...validatedDomain.selectedPackIds],
    domainPackMaturities: structuredClone(validatedDomain.packMaturities),
    domainMaturity: validatedDomain.effectiveMaturity,
    domainStatus: validatedDomain.status,
    domainReadinessCeiling: validatedDomain.readinessCeiling,
    domainBlockedGateIds: [...validatedDomain.blockedGateIds],
    domainWarnings: structuredClone(validatedDomain.warnings),
    sourceStatus: validatedDomain.sourceGovernance?.status ?? "unbound",
    sourceSnapshotDigest: validatedDomain.sourceGovernance?.snapshotDigest ?? null,
    sourceRequiredIds: [...(validatedDomain.sourceGovernance?.requiredSourceIds ?? [])],
    sourceBlockers: structuredClone(validatedDomain.sourceGovernance?.blockers ?? []),
    waves: projectedTeam.waves.map((wave) => ({
      id: wave.id,
      order: wave.order,
      assignmentIds: wave.assignments.map((assignment) => assignment.id),
      resourceIds: wave.assignments.map((assignment) => assignment.agentId),
      executionProof: null,
      receiptProof: null
    })),
    assignments: [...projectedTeam.assignments],
    handoffs,
    blockers: [...(projectedTeam.blockers ?? [])],
    executionStatus: blocked ? "blocked" : "recommendations-only",
    observation: {
      observed: false,
      invocationId: null,
      startedAt: null,
      completedAt: null,
      exitCode: null,
      outputHash: null
    },
    actualSpawnProof: null,
    actualExecutionProof: null,
    actualInvocationProof: null,
    actualToolOutput: null,
    receiptProof: null
  });
}
