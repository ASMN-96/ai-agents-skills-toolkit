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

function competencies(resource) {
  return uniqueStrings(resource?.canonicalCompetencies);
}

function roles(resource) {
  return uniqueStrings(resource?.eligibleRoles);
}

function roleFlags(resource) {
  const eligibleRoles = roles(resource);
  const agent = resource?.type === "agent";
  return {
    lead: agent && eligibleRoles.includes("lead"),
    verifier: agent && eligibleRoles.includes("verifier")
  };
}

function exclusionDecision(resource, task) {
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
    && !uniqueStrings(task?.authorizedActions).includes("scoped-local-write")
  ) {
    return "task-permission-mismatch";
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

function roleSignature(resource) {
  const flags = roleFlags(resource);
  return `${resource.type}:${flags.lead}:${flags.verifier}`;
}

function dominates(dominant, candidate, required, requireIndependentVerifier) {
  if (dominant.id === candidate.id || dominant.type !== candidate.type) return false;
  const dominantFlags = roleFlags(dominant);
  const candidateFlags = roleFlags(candidate);
  if (
    requireIndependentVerifier
    && (dominantFlags.lead || dominantFlags.verifier || candidateFlags.lead || candidateFlags.verifier)
  ) {
    return false;
  }
  if (roleSignature(dominant) !== roleSignature(candidate)) return false;

  const dominantCoverage = coverageSet(dominant, required);
  const candidateCoverage = coverageSet(candidate, required);
  if (!isSuperset(dominantCoverage, candidateCoverage)) return false;

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

function pruneDominated(resources, required, requireIndependentVerifier) {
  const sorted = [...resources].sort(compareStableIds);
  const dominated = new Set();
  for (const candidate of sorted) {
    for (const dominant of sorted) {
      if (dominates(dominant, candidate, required, requireIndependentVerifier)) {
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

function solutionScore(selected) {
  return {
    count: selected.length,
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

function compareSolutions(left, right) {
  const leftScore = solutionScore(left);
  const rightScore = solutionScore(right);
  if (leftScore.count !== rightScore.count) return leftScore.count - rightScore.count;
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

function exactCover(candidates, required, requireIndependentVerifier) {
  let best = null;
  let visitedNodes = 0;

  const search = (index, selected, covered) => {
    visitedNodes += 1;
    if (visitedNodes > MAX_EXACT_SEARCH_NODES) throw routingSearchBudgetExceeded();

    if (required.size === covered.size) {
      const assignment = roleAssignment(selected, requireIndependentVerifier);
      if (assignment) {
        if (best === null || compareSolutions(selected, best) < 0) best = [...selected];
        return;
      }
    }
    if (index >= candidates.length) return;
    if (best && selected.length >= best.length) return;
    if (!remainingCanCover(candidates, index, covered, required)) return;
    if (!remainingCanSatisfyRoles(candidates, index, selected, requireIndependentVerifier)) return;

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
    const excluded = exclusionDecision(resource, task);
    if (excluded) decisions.set(resource.id, excluded);
    else eligible.push(resource);
  }

  const contributors = eligible.filter((resource) => {
    const flags = roleFlags(resource);
    return coverageSet(resource, required).size > 0
      || flags.lead
      || (requireIndependentVerifier && flags.verifier);
  });

  if (contributors.length > MAX_EXACT_SEARCH_CANDIDATES) {
    throw routingSearchBudgetExceeded();
  }

  const { candidates, dominated } = pruneDominated(
    contributors,
    required,
    requireIndependentVerifier
  );
  const aggregateRoleAssignment = roleAssignment(candidates, requireIndependentVerifier);
  const rolesSatisfiable = aggregateRoleAssignment !== null;
  const aggregateCovered = coversRequired(candidates, required);
  const best = exactCover(candidates, required, requireIndependentVerifier);
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
    else decisions.set(resource.id, "eligible-not-selected");
  }

  const blockedReasons = [];
  if (!aggregateRoleAssignment?.lead) blockedReasons.push("required-lead-unavailable");
  if (requireIndependentVerifier && !aggregateRoleAssignment?.verifier) {
    blockedReasons.push("independent-verifier-unavailable");
  }
  for (const competency of requiredList) {
    if (!aggregateCovered.has(competency)) blockedReasons.push(`competency-uncovered:${competency}`);
  }

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
    blockedReasons
  };
}
