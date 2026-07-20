import { assertResourceContract } from "./contracts.mjs";

const AUTHORITY_RANK = new Map([
  ["official-standard", 4],
  ["vendor-official", 3],
  ["internal-reviewed", 2],
  ["community-reviewed", 1]
]);

const FRESHNESS_RANK = new Map([
  ["current", 3],
  ["manual-due", 2],
  ["stale", 1],
  ["quarantined", 0],
  ["absent", 0]
]);

const EXCLUDED_LIFECYCLES = new Set(["experimental", "retired", "quarantined", "stale"]);
const MAX_EXACT_SEARCH_CANDIDATES = 64;
const MAX_EXACT_SEARCH_NODES = 100_000;
const ROUTING_SEARCH_BUDGET_EXCEEDED = "routing-search-budget-exceeded";

function compareStableIds(left, right) {
  const leftId = String(typeof left === "object" ? left?.id : left);
  const rightId = String(typeof right === "object" ? right?.id : right);
  if (leftId === rightId) return 0;
  return leftId < rightId ? -1 : 1;
}

function routingSearchBudgetExceeded() {
  const error = new Error(ROUTING_SEARCH_BUDGET_EXCEEDED);
  error.code = ROUTING_SEARCH_BUDGET_EXCEEDED;
  return error;
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))];
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

const PREFERENCE_CATEGORIES = Object.freeze([
  Object.freeze({ field: "agentIds", type: "agent" }),
  Object.freeze({ field: "skillIds", type: "skill" }),
  Object.freeze({ field: "toolIds", type: "tool" })
]);

function resourcePreferences(task) {
  const preferences = task?.resourcePreferences;
  if (preferences === undefined) {
    return {
      all: new Set(),
      byType: { agent: new Set(), skill: new Set(), tool: new Set() }
    };
  }
  if (!isPlainRecord(preferences)) {
    throw new Error("routing task resourcePreferences must be a plain record");
  }
  const fields = PREFERENCE_CATEGORIES.map(({ field }) => field);
  for (const field of Object.keys(preferences)) {
    if (!fields.includes(field)) {
      throw new Error(`routing task resourcePreferences.${field} is not allowed`);
    }
  }
  const all = new Set();
  const byType = { agent: new Set(), skill: new Set(), tool: new Set() };
  for (const { field, type } of PREFERENCE_CATEGORIES) {
    if (!Array.isArray(preferences[field])) {
      throw new Error(`routing task resourcePreferences.${field} must be an array`);
    }
    const seen = new Set();
    preferences[field].forEach((id, index) => {
      if (typeof id !== "string" || id === "") {
        throw new Error(`routing task resourcePreferences.${field}[${index}] must be a non-empty string`);
      }
      if (seen.has(id)) {
        throw new Error(`routing task resourcePreferences.${field}[${index}] must be unique`);
      }
      if (all.has(id)) {
        throw new Error(`routing task resourcePreferences ID ${id} appears in multiple type categories`);
      }
      seen.add(id);
      all.add(id);
      byType[type].add(id);
    });
  }
  return { all, byType };
}

function isPreferredResource(resource, preferences) {
  return preferences.byType[resource?.type]?.has(resource?.id) === true;
}

function assertPreferenceResourceType(resource, preferences) {
  if (!preferences.all.has(resource.id) || isPreferredResource(resource, preferences)) return;
  const suppliedCategory = PREFERENCE_CATEGORIES.find(
    ({ type }) => preferences.byType[type].has(resource.id)
  );
  throw new Error(
    `routing task resourcePreferences.${suppliedCategory.field} contains ${resource.type} resource ${resource.id}`
  );
}

function competencies(resource) {
  return uniqueStrings(resource?.canonicalCompetencies);
}

function roles(resource) {
  return uniqueStrings(resource?.eligibleRoles);
}

function isExecutableWriter(resource) {
  return resource?.type === "agent"
    && resource.runtimePosture?.sandboxMode === "workspace-write"
    && resource.runtimePosture?.scopedLocalWrite === true
    && competencies(resource).includes("implementation");
}

function requiresExecutableWriter(task) {
  return uniqueStrings(task?.authorizedActions).includes("scoped-local-write");
}

function targetAffinityMatches(resource, task) {
  const platforms = new Set(uniqueStrings(task?.targets?.platforms));
  const overlays = new Set(uniqueStrings(task?.targets?.frameworkOverlays));
  const affinityPlatforms = uniqueStrings(resource?.targetAffinity?.platforms);
  const affinityOverlays = uniqueStrings(resource?.targetAffinity?.frameworkOverlays);
  return affinityPlatforms.some((platform) => platforms.has(platform))
    || affinityOverlays.some((overlay) => overlays.has(overlay));
}

function roleFlags(resource) {
  const eligibleRoles = roles(resource);
  const agent = resource?.type === "agent";
  return {
    lead: agent && eligibleRoles.includes("lead"),
    verifier: agent && eligibleRoles.includes("verifier")
  };
}

function exclusionDecision(resource, task, preferences) {
  if (EXCLUDED_LIFECYCLES.has(resource.lifecycle)) return resource.lifecycle;
  if (resource.lifecycle !== "active") return "quarantined";
  if (resource.eligibility?.eligible !== true) return "ineligible";
  if (Array.isArray(resource.eligibility?.reasons) && resource.eligibility.reasons.length > 0) {
    return "ineligible";
  }
  if (resource.runtimePosture?.available !== true) return "unavailable";
  if (resource.runtimePosture?.supported !== true) return "unsupported-runtime";
  if (resource.freshness?.state !== "current") return "freshness-unresolved";
  if (
    resource.runtimePosture?.sandboxMode === "workspace-write"
    && !requiresExecutableWriter(task)
  ) {
    return "task-permission-mismatch";
  }
  if (resource.runtimePosture?.sandboxMode === "workspace-write" && requiresExecutableWriter(task)) {
    if (!isExecutableWriter(resource)) return "writer-implementation-mismatch";
    if (!isPreferredResource(resource, preferences) && !targetAffinityMatches(resource, task)) {
      return "writer-target-mismatch";
    }
  }
  return null;
}

function coverageSet(resource, required) {
  return new Set(competencies(resource).filter((competency) => required.has(competency)));
}

function isSuperset(candidate, subset) {
  for (const value of subset) if (!candidate.has(value)) return false;
  return true;
}

function roleSignature(resource, requireWriter) {
  const flags = roleFlags(resource);
  return `${resource.type}:${flags.lead}:${flags.verifier}:${requireWriter && isExecutableWriter(resource)}`;
}

function dominates(
  dominant,
  candidate,
  required,
  requireIndependentVerifier,
  requireWriter,
  preferences
) {
  if (dominant.id === candidate.id || dominant.type !== candidate.type) return false;
  const dominantFlags = roleFlags(dominant);
  const candidateFlags = roleFlags(candidate);
  if (
    requireIndependentVerifier
    && (dominantFlags.lead || dominantFlags.verifier || candidateFlags.lead || candidateFlags.verifier)
  ) {
    return false;
  }
  if (roleSignature(dominant, requireWriter) !== roleSignature(candidate, requireWriter)) return false;

  const dominantCoverage = coverageSet(dominant, required);
  const candidateCoverage = coverageSet(candidate, required);
  if (!isSuperset(dominantCoverage, candidateCoverage)) return false;

  const dominantPreferred = isPreferredResource(dominant, preferences);
  const candidatePreferred = isPreferredResource(candidate, preferences);
  if (!dominantPreferred && candidatePreferred) return false;
  if (dominantPreferred && !candidatePreferred) return true;

  const dominantCost = Number(dominant.measuredContextCost ?? Number.POSITIVE_INFINITY);
  const candidateCost = Number(candidate.measuredContextCost ?? Number.POSITIVE_INFINITY);
  const dominantAuthority = AUTHORITY_RANK.get(dominant.authority) ?? 0;
  const candidateAuthority = AUTHORITY_RANK.get(candidate.authority) ?? 0;
  const dominantFreshness = FRESHNESS_RANK.get(dominant.freshness?.state) ?? 0;
  const candidateFreshness = FRESHNESS_RANK.get(candidate.freshness?.state) ?? 0;
  if (
    dominantCost > candidateCost
    || dominantAuthority < candidateAuthority
    || dominantFreshness < candidateFreshness
  ) {
    return false;
  }

  const strictCoverage = dominantCoverage.size > candidateCoverage.size;
  const strictQuality = dominantCost < candidateCost
    || dominantAuthority > candidateAuthority
    || dominantFreshness > candidateFreshness;
  const stableDuplicate = dominantCoverage.size === candidateCoverage.size
    && dominantCost === candidateCost
    && dominantAuthority === candidateAuthority
    && dominantFreshness === candidateFreshness
    && compareStableIds(dominant, candidate) < 0;
  return strictCoverage || strictQuality || stableDuplicate;
}

function pruneDominated(resources, required, requireIndependentVerifier, requireWriter, preferences) {
  const sorted = [...resources].sort(compareStableIds);
  const dominated = new Set();
  for (const candidate of sorted) {
    for (const dominant of sorted) {
      if (dominates(
        dominant,
        candidate,
        required,
        requireIndependentVerifier,
        requireWriter,
        preferences
      )) {
        dominated.add(candidate.id);
        break;
      }
    }
  }
  return {
    candidates: sorted.filter((resource) => !dominated.has(resource.id)),
    dominated
  };
}

function roleAssignment(selected, requireIndependentVerifier) {
  const agents = selected.filter((resource) => resource.type === "agent");
  const leads = agents.filter((resource) => roleFlags(resource).lead)
    .sort(compareStableIds);
  if (leads.length === 0) return null;
  if (!requireIndependentVerifier) {
    return { lead: leads[0].id, verifier: null };
  }
  const verifiers = agents.filter((resource) => roleFlags(resource).verifier)
    .sort(compareStableIds);
  for (const lead of leads) {
    const verifier = verifiers.find((candidate) => candidate.id !== lead.id);
    if (verifier) return { lead: lead.id, verifier: verifier.id };
  }
  return null;
}

function coversRequired(selected, required) {
  const covered = new Set();
  for (const resource of selected) {
    for (const competency of competencies(resource)) {
      if (required.has(competency)) covered.add(competency);
    }
  }
  return covered;
}

function descendingQualityVector(selected, rankFor) {
  return selected.map(rankFor).sort((left, right) => right - left);
}

function compareNumberVectors(left, right, { higherIsBetter = false } = {}) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue === rightValue) continue;
    if (higherIsBetter) return leftValue > rightValue ? -1 : 1;
    return leftValue < rightValue ? -1 : 1;
  }
  return 0;
}

function solutionScore(selected, preferences) {
  return {
    count: selected.length,
    fallbackCount: selected.filter((resource) => !isPreferredResource(resource, preferences)).length,
    context: selected.reduce(
      (total, resource) => total + Number(resource.measuredContextCost ?? Number.MAX_SAFE_INTEGER),
      0
    ),
    authority: descendingQualityVector(
      selected,
      (resource) => AUTHORITY_RANK.get(resource.authority) ?? 0
    ),
    freshness: descendingQualityVector(
      selected,
      (resource) => FRESHNESS_RANK.get(resource.freshness?.state) ?? 0
    ),
    ids: selected.map(({ id }) => String(id)).sort(compareStableIds)
  };
}

function compareSolutions(left, right, preferences) {
  const leftScore = solutionScore(left, preferences);
  const rightScore = solutionScore(right, preferences);
  if (leftScore.count !== rightScore.count) return leftScore.count - rightScore.count;
  if (leftScore.fallbackCount !== rightScore.fallbackCount) {
    return leftScore.fallbackCount - rightScore.fallbackCount;
  }
  if (leftScore.context !== rightScore.context) return leftScore.context - rightScore.context;
  const authority = compareNumberVectors(leftScore.authority, rightScore.authority, { higherIsBetter: true });
  if (authority !== 0) return authority;
  const freshness = compareNumberVectors(leftScore.freshness, rightScore.freshness, { higherIsBetter: true });
  if (freshness !== 0) return freshness;
  for (let index = 0; index < leftScore.ids.length; index += 1) {
    const compared = compareStableIds(leftScore.ids[index], rightScore.ids[index]);
    if (compared !== 0) return compared;
  }
  return 0;
}

function remainingCanCover(candidates, start, covered, required) {
  const possible = new Set(covered);
  for (let index = start; index < candidates.length; index += 1) {
    for (const competency of competencies(candidates[index])) {
      if (required.has(competency)) possible.add(competency);
    }
  }
  return required.size === possible.size;
}

function remainingCanSatisfyRoles(candidates, start, selected, requireIndependentVerifier) {
  const possible = [...selected, ...candidates.slice(start)];
  return roleAssignment(possible, requireIndependentVerifier) !== null;
}

function remainingCanSatisfyWriter(candidates, start, selected, requireWriter) {
  if (!requireWriter) return true;
  return [...selected, ...candidates.slice(start)].some(isExecutableWriter);
}

function exactCover(candidates, required, requireIndependentVerifier, requireWriter, preferences) {
  let best = null;
  let visitedNodes = 0;

  const search = (index, selected, covered) => {
    visitedNodes += 1;
    if (visitedNodes > MAX_EXACT_SEARCH_NODES) throw routingSearchBudgetExceeded();

    if (required.size === covered.size) {
      const assignment = roleAssignment(selected, requireIndependentVerifier);
      const writerSatisfied = !requireWriter || selected.some(isExecutableWriter);
      if (assignment && writerSatisfied) {
        if (best === null || compareSolutions(selected, best, preferences) < 0) best = [...selected];
        return;
      }
    }
    if (index >= candidates.length) return;
    if (best && selected.length >= best.length) return;
    if (!remainingCanCover(candidates, index, covered, required)) return;
    if (!remainingCanSatisfyRoles(candidates, index, selected, requireIndependentVerifier)) return;
    if (!remainingCanSatisfyWriter(candidates, index, selected, requireWriter)) return;

    const candidate = candidates[index];
    const withCoverage = new Set(covered);
    for (const competency of competencies(candidate)) {
      if (required.has(competency)) withCoverage.add(competency);
    }
    search(index + 1, [...selected, candidate], withCoverage);
    search(index + 1, selected, covered);
  };

  search(0, [], new Set());
  return best;
}

function selectedOrder(selected, assignment) {
  const byId = new Map(selected.map((resource) => [resource.id, resource]));
  const orderedIds = [];
  if (assignment?.lead) orderedIds.push(assignment.lead);
  if (assignment?.verifier && assignment.verifier !== assignment.lead) orderedIds.push(assignment.verifier);
  for (const id of [...byId.keys()].sort(compareStableIds)) {
    if (!orderedIds.includes(id)) orderedIds.push(id);
  }
  return orderedIds.map((id) => byId.get(id));
}

function requiresIndependentVerifier(task) {
  const policy = task?.requiredRoles;
  if (policy === undefined) return ["high", "critical"].includes(task?.risk);
  if (
    policy === null
    || typeof policy !== "object"
    || Array.isArray(policy)
    || (Object.getPrototypeOf(policy) !== Object.prototype && Object.getPrototypeOf(policy) !== null)
    || Object.keys(policy).some((field) => field !== "lead" && field !== "verifier")
    || policy.lead !== "required"
    || !["none", "independent"].includes(policy.verifier)
  ) {
    throw new Error("routing task requiredRoles must be { lead: required, verifier: none|independent }");
  }
  return policy.verifier === "independent" || ["high", "critical"].includes(task?.risk);
}

export function selectResources({ task, resources }) {
  const requiredList = uniqueStrings(task?.requiredCompetencies).sort();
  const required = new Set(requiredList);
  const requireIndependentVerifier = requiresIndependentVerifier(task);
  const requireWriter = requiresExecutableWriter(task);
  const preferences = resourcePreferences(task);
  const inputResources = Array.isArray(resources)
    ? resources.map((resource) => assertResourceContract(resource))
    : [];
  const ids = new Set();
  const decisions = new Map();
  const eligible = [];

  for (const resource of inputResources) {
    if (typeof resource?.id !== "string" || resource.id === "") {
      throw new Error("every resource requires a non-empty id");
    }
    if (ids.has(resource.id)) throw new Error(`duplicate resource id: ${resource.id}`);
    ids.add(resource.id);
    assertPreferenceResourceType(resource, preferences);
    const excluded = exclusionDecision(resource, task, preferences);
    if (excluded) decisions.set(resource.id, excluded);
    else eligible.push(resource);
  }

  const contributors = eligible.filter((resource) => {
    const flags = roleFlags(resource);
    return coverageSet(resource, required).size > 0
      || flags.lead
      || (requireIndependentVerifier && flags.verifier)
      || (requireWriter && isExecutableWriter(resource));
  });

  if (contributors.length > MAX_EXACT_SEARCH_CANDIDATES) {
    throw routingSearchBudgetExceeded();
  }

  const { candidates, dominated } = pruneDominated(
    contributors,
    required,
    requireIndependentVerifier,
    requireWriter,
    preferences
  );
  const aggregateRoleAssignment = roleAssignment(candidates, requireIndependentVerifier);
  const rolesSatisfiable = aggregateRoleAssignment !== null;
  const writerSatisfiable = !requireWriter || candidates.some(isExecutableWriter);
  const aggregateCovered = coversRequired(candidates, required);
  const best = exactCover(
    candidates,
    required,
    requireIndependentVerifier,
    requireWriter,
    preferences
  );
  const assignment = best ? roleAssignment(best, requireIndependentVerifier) : null;
  const selected = best ? selectedOrder(best, assignment) : [];
  const selectedIds = new Set(selected.map(({ id }) => id));

  for (const resource of eligible) {
    if (selectedIds.has(resource.id)) {
      decisions.set(resource.id, "selected");
      continue;
    }
    if (dominated.has(resource.id)) decisions.set(resource.id, "dominated");
    else if (best === null && !rolesSatisfiable) decisions.set(resource.id, "blocked-by-role");
    else if (best === null && !writerSatisfiable) decisions.set(resource.id, "blocked-by-writer");
    else decisions.set(resource.id, "eligible-not-selected");
  }

  const blockedReasons = [];
  if (!aggregateRoleAssignment?.lead) blockedReasons.push("required-lead-unavailable");
  if (requireIndependentVerifier && !aggregateRoleAssignment?.verifier) {
    blockedReasons.push("independent-verifier-unavailable");
  }
  if (requireWriter && !writerSatisfiable) {
    blockedReasons.push("scoped-local-write:no-eligible-implementation-writer");
  }
  for (const competency of requiredList) {
    if (!aggregateCovered.has(competency)) blockedReasons.push(`competency-uncovered:${competency}`);
  }

  const selectedPreferredResourceIds = selected
    .filter((resource) => isPreferredResource(resource, preferences))
    .map(({ id }) => id)
    .sort(compareStableIds);
  const selectedFallbackResourceIds = selected
    .filter((resource) => !isPreferredResource(resource, preferences))
    .map(({ id }) => id)
    .sort(compareStableIds);
  const selectedIdSet = new Set(selected.map(({ id }) => id));

  return {
    selected,
    decisions: inputResources.map((resource) => ({
      id: resource.id,
      decision: decisions.get(resource.id)
    })),
    uncoveredCompetencies: requiredList.filter((competency) => !aggregateCovered.has(competency)),
    requiredRoles: {
      lead: assignment?.lead ?? null,
      verifier: assignment?.verifier ?? null
    },
    preferenceAccounting: {
      preferredResourceIds: [...preferences.all].sort(compareStableIds),
      selectedPreferredResourceIds,
      selectedFallbackResourceIds,
      unselectedPreferredResourceIds: [...preferences.all]
        .filter((id) => !selectedIdSet.has(id))
        .sort(compareStableIds)
    },
    blockedReasons
  };
}
