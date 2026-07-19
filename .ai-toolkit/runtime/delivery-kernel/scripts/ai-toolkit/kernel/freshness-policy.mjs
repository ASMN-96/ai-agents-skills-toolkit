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
