import { deriveCapabilityImpact } from "./source-capability-impact.mjs";

const MAX_AGE_DAYS = {
  "security-runtime": 14,
  "platform-standard": 30,
  "general-method": 90
};

function dateValue(value, label) {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`${label} must be an ISO date`);
  return parsed.valueOf();
}

export function evaluateFreshness({ source, now }) {
  if (!source?.id) throw new Error("freshness source requires id");
  const maxAgeDays = MAX_AGE_DAYS[source.tier];
  if (!maxAgeDays) throw new Error(`unsupported freshness tier: ${source.tier}`);
  const ageDays = Math.floor((dateValue(now, "now") - dateValue(source.lastSuccessfulCheck, "lastSuccessfulCheck")) / 86_400_000);
  const state = source.changedUpstream === true
    ? "quarantined"
    : ageDays > maxAgeDays
      ? "stale"
      : "active";
  return {
    id: source.id,
    tier: source.tier,
    state,
    ageDays,
    maxAgeDays,
    changedUpstream: source.changedUpstream === true,
    reviewedVersion: source.reviewedVersion ?? null,
    detectedVersion: source.detectedVersion ?? null
  };
}

export function approvePromotion({ candidate, reviews, approvedBy, rollbackTarget }) {
  if (!candidate?.id || !["quarantined", "stale"].includes(candidate.state)) {
    throw new Error("promotion requires a quarantined or stale candidate");
  }
  for (const review of ["license", "security", "compatibility"]) {
    if (reviews?.[review] !== "passed") throw new Error(`promotion requires ${review} review to pass`);
  }
  if (!approvedBy) throw new Error("promotion requires an accountable approver");
  if (!rollbackTarget) throw new Error("promotion requires a rollback target");
  return {
    ...candidate,
    state: "active",
    approvedBy,
    rollbackTarget,
    reviews: { ...reviews }
  };
}

const GLOBAL_FRESHNESS_RELEASE_POLICY = Object.freeze({
  selectedResourceIds: [],
  blockingResourceIds: []
});

function normalizedComparison(comparison) {
  if (comparison === null || typeof comparison !== "object" || Array.isArray(comparison)) {
    return { state: "unavailable", changedLocators: [] };
  }
  return {
    state: typeof comparison.state === "string" ? comparison.state : "unavailable",
    changedLocators: Array.isArray(comparison.changedLocators) ? comparison.changedLocators : comparison.changedLocators
  };
}

/**
 * Projects an observed freshness comparison through reviewed synthesis provenance.
 * The default policy is deliberately closed and empty: portfolio impact is visible,
 * but only an explicit caller-provided release scope can mark a resource blocking.
 */
export function deriveFreshnessCapabilityImpact({
  sourceId,
  comparison,
  registry,
  resourceCatalog,
  compilerInventory,
  releasePolicy = GLOBAL_FRESHNESS_RELEASE_POLICY
} = {}) {
  const normalized = normalizedComparison(comparison);
  return deriveCapabilityImpact({
    sourceId,
    comparisonState: normalized.state,
    changedLocators: normalized.changedLocators,
    registry,
    resourceCatalog,
    compilerInventory,
    releasePolicy
  });
}
