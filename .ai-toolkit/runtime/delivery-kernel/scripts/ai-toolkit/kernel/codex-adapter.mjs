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

function uniqueReferences(values) {
  const references = [];
  const seen = new Set();
  for (const value of values) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
    const key = JSON.stringify(value);
    if (seen.has(key)) continue;
    seen.add(key);
    references.push(structuredClone(value));
  }
  return references;
}

export function buildCodexExecutionPlan({ task, selectedResources, team, context, domainPack }) {
  const validatedDomain = assertDomainSelectionResult(domainPack);
  const { taskId, validatedTeam } = validateTaskTeam({
    task,
    team,
    assertExecutionWavePlan,
    adapterName: "Codex"
  });
  validateDomainTeam(validatedDomain, validatedTeam, "Codex");
  const resources = validateSelectedResources(selectedResources, "Codex");
  validateAssignmentResources(resources, validatedTeam, "Codex");
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
  const contextReferences = buildContextReferences(context, "Codex");

  return deepFreeze({
    schemaVersion: "1.0.0",
    adapter: "codex",
    taskId,
    risk: task.risk,
    targets: structuredClone(task.targets),
    recommendationMode: "recommendations-only",
    runtimeAvailability: "unverified",
    runtimeAvailabilityProof: null,
    configurationMutation: null,
    permissionMutation: null,
    selectedResourceIds: resources.map((resource) => resource.id),
    recommendedAgents: uniqueStrings(resources
      .filter((resource) => resource.type === "agent" && resource.nativeAdapter.kind === "codex-agent")
      .map((resource) => resource.nativeAdapter.id)),
    requiredSkills: uniqueStrings(resources
      .filter((resource) => resource.type === "skill" && resource.nativeAdapter.kind === "codex-skill")
      .map((resource) => resource.nativeAdapter.id)),
    projectOwnedCommandReferences: uniqueReferences(resources
      .filter((resource) => resource.type === "tool")
      .map((resource) => resource.commandReference)),
    team: projectedTeam,
    waves: projectedTeam.waves.map((wave) => ({
      id: wave.id,
      order: wave.order,
      lead: wave.lead,
      specialists: [...wave.specialists],
      assignmentIds: wave.assignments.map((assignment) => assignment.id),
      executionProof: null,
      receiptProof: null
    })),
    contextReferences,
    assignmentContextBindings: buildAssignmentContextBindings(
      contextReferences,
      projectedTeam,
      "Codex"
    ),
    domainPackIds: [...validatedDomain.selectedPackIds],
    domainPackMaturities: structuredClone(validatedDomain.packMaturities),
    domainStatus: validatedDomain.status,
    domainReadinessCeiling: validatedDomain.readinessCeiling,
    domainBlockedGateIds: [...validatedDomain.blockedGateIds],
    domainWarnings: structuredClone(validatedDomain.warnings),
    domainPack: validatedDomain.selectedPackIds.find((id) => id !== "enterprise-core")
      ?? "enterprise-core",
    domainMaturity: validatedDomain.effectiveMaturity,
    sourceStatus: validatedDomain.sourceGovernance?.status ?? "unbound",
    sourceSnapshotDigest: validatedDomain.sourceGovernance?.snapshotDigest ?? null,
    sourceRequiredIds: [...(validatedDomain.sourceGovernance?.requiredSourceIds ?? [])],
    sourceBlockers: structuredClone(validatedDomain.sourceGovernance?.blockers ?? []),
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
