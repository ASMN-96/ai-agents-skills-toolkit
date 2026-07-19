import { validateSourceCatalog } from "./source-catalog-contract.mjs";
import { canonicalDigest } from "./canonical-digest.mjs";

const SNAPSHOT_SCHEMA_VERSION = "1.0.0";
const REFERENCE_DISPOSITIONS = new Set([
  "SYNCED_ADOPTED",
  "SYNCED_REFERENCE",
  "SYNCED_PLUGIN_DELEGATED"
]);
const HASH = /^[a-f0-9]{64}$/;
const DAY_MS = 86_400_000;

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

function stableUnique(values) {
  return [...new Set(values)].sort();
}

function exactIso(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))
    || new Date(value).toISOString() !== value) {
    throw new Error(`${label} must be an exact ISO timestamp`);
  }
  return value;
}

function addDays(instant, days) {
  return new Date(Date.parse(instant) + days * DAY_MS).toISOString();
}

function compareRecords(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requireExactFields(record, fields, label) {
  if (!isPlainRecord(record)) throw new Error(`${label} must be a plain record`);
  const actual = Object.keys(record).sort();
  const expected = [...fields].sort();
  if (!compareRecords(actual, expected)) throw new Error(`${label} fields are invalid`);
}

function sourceReason(source, now) {
  if (source.monitor.state !== "CURRENT") {
    return `monitor-${source.monitor.state.toLowerCase().replaceAll("_", "-")}`;
  }
  if (source.review.expiresAt !== null && Date.parse(source.review.expiresAt) <= Date.parse(now)) {
    return "review-expired";
  }
  if (source.review.state !== "REVIEWED_CURRENT") {
    return `review-${source.review.state.toLowerCase().replaceAll("_", "-")}`;
  }
  if (source.review.currentReceipt === null) return "receipt-missing";
  if (!REFERENCE_DISPOSITIONS.has(source.review.disposition)) {
    return `disposition-${String(source.review.disposition ?? "missing").toLowerCase()}`;
  }
  return null;
}

function sourceSnapshotEntry({ sourceId, catalogById, validatedCatalog, now }) {
  const source = catalogById.get(sourceId);
  if (!source) {
    return {
      sourceId,
      monitorState: "MISSING",
      reviewState: "MISSING",
      disposition: null,
      receiptPath: null,
      receiptDigest: null,
      reviewedRevision: null,
      reviewedDigest: null,
      reviewedAt: null,
      expiresAt: null,
      freshnessClass: null,
      freshnessMaxAgeDays: null,
      monitorCheckedAt: null,
      monitorValidUntil: null,
      runtimePosture: null,
      referenceEligible: false,
      runtimeEligible: false,
      reason: "source-missing"
    };
  }
  const reason = sourceReason(source, now);
  const freshnessMaxAgeDays = validatedCatalog.freshnessClasses[source.freshnessClass].maxAgeDays;
  const monitorValidUntil = source.monitor.checkedAt === null
    ? null
    : addDays(source.monitor.checkedAt, freshnessMaxAgeDays);
  return {
    sourceId,
    monitorState: source.monitor.state,
    reviewState: source.review.state,
    disposition: source.review.disposition,
    receiptPath: source.review.currentReceipt,
    receiptDigest: source.review.receiptDigest,
    reviewedRevision: structuredClone(source.review.reviewedRevision),
    reviewedDigest: source.review.reviewedDigest,
    reviewedAt: source.review.reviewedAt,
    expiresAt: source.review.expiresAt,
    freshnessClass: source.freshnessClass,
    freshnessMaxAgeDays,
    monitorCheckedAt: source.monitor.checkedAt,
    monitorValidUntil,
    runtimePosture: source.runtimePosture,
    referenceEligible: reason === null,
    runtimeEligible: false,
    reason
  };
}

function snapshotCore(snapshot) {
  const { snapshotDigest: ignored, ...core } = snapshot;
  void ignored;
  return core;
}

export function buildSourceReferenceSnapshot({
  catalog,
  gates,
  resourceIds = [],
  now,
  receiptsValidated = false
} = {}) {
  if (receiptsValidated !== true) {
    throw new Error("source receipt chain validation is required before policy evaluation");
  }
  const evaluatedNow = exactIso(now, "source policy now");
  const validatedCatalog = validateSourceCatalog(catalog, { now: evaluatedNow });
  if (!Array.isArray(gates)) throw new Error("source policy gates must be an array");
  if (!Array.isArray(resourceIds)) throw new Error("source policy resourceIds must be an array");
  if (resourceIds.some((resourceId) => typeof resourceId !== "string" || resourceId === "")) {
    throw new Error("source policy resourceIds must contain non-empty strings");
  }
  const registeredResourceIds = new Set(resourceIds);
  if (registeredResourceIds.size !== resourceIds.length) {
    throw new Error("source policy resourceIds must be unique");
  }
  const catalogById = new Map(validatedCatalog.sources.map((source) => [source.id, source]));
  const dependencies = [];
  const dependencyKeys = new Set();
  for (const gate of gates) {
    if (!isPlainRecord(gate) || typeof gate.id !== "string" || !Array.isArray(gate.authoritativeSourceRefs)) {
      throw new Error("source policy gates must contain authoritative DomainGate references");
    }
    for (const reference of gate.authoritativeSourceRefs) {
      if (!isPlainRecord(reference) || typeof reference.sourceId !== "string") {
        throw new Error(`source policy gate ${gate.id} has an invalid authoritative source reference`);
      }
      const key = `${gate.id}\0${reference.sourceId}`;
      if (dependencyKeys.has(key)) continue;
      dependencyKeys.add(key);
      dependencies.push({ gateId: gate.id, sourceId: reference.sourceId });
    }
  }
  dependencies.sort((left, right) => (
    left.gateId.localeCompare(right.gateId) || left.sourceId.localeCompare(right.sourceId)
  ));

  const requiredSourceIds = stableUnique(dependencies.map((entry) => entry.sourceId));
  const sources = requiredSourceIds.map((sourceId) => sourceSnapshotEntry({
    sourceId,
    catalogById,
    validatedCatalog,
    now: evaluatedNow
  }));
  const bySourceId = new Map(sources.map((source) => [source.sourceId, source]));
  const blockers = dependencies
    .filter((dependency) => !bySourceId.get(dependency.sourceId)?.referenceEligible)
    .map((dependency) => ({
      code: "authoritative-source-unavailable",
      gateId: dependency.gateId,
      sourceId: dependency.sourceId,
      reason: bySourceId.get(dependency.sourceId)?.reason ?? "source-missing"
    }));
  const blockedGateIds = stableUnique(blockers.map((blocker) => blocker.gateId));

  const resourceDependencies = [];
  for (const source of validatedCatalog.sources) {
    for (const resourceId of source.dependentResourceIds) {
      if (!registeredResourceIds.has(resourceId)) {
        throw new Error(
          `source policy dependentResourceIds references unknown ResourceContract: ${source.id}:${resourceId}`
        );
      }
      resourceDependencies.push({ resourceId, sourceId: source.id });
    }
  }
  resourceDependencies.sort((left, right) => (
    left.resourceId.localeCompare(right.resourceId) || left.sourceId.localeCompare(right.sourceId)
  ));
  const resourceRequiredSourceIds = stableUnique(resourceDependencies.map((entry) => entry.sourceId));
  const resourceSources = resourceRequiredSourceIds.map((sourceId) => sourceSnapshotEntry({
    sourceId,
    catalogById,
    validatedCatalog,
    now: evaluatedNow
  }));
  const resourceSourceById = new Map(resourceSources.map((source) => [source.sourceId, source]));
  const resourceBlockers = resourceDependencies
    .filter((dependency) => !resourceSourceById.get(dependency.sourceId)?.referenceEligible)
    .map((dependency) => ({
      code: "dependent-source-unavailable",
      resourceId: dependency.resourceId,
      sourceId: dependency.sourceId,
      reason: resourceSourceById.get(dependency.sourceId)?.reason ?? "source-missing"
    }));
  const resourceGovernance = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    status: resourceBlockers.length === 0 ? "current" : "blocked",
    requiredSourceIds: resourceRequiredSourceIds,
    dependencies: resourceDependencies,
    sources: resourceSources,
    blockedResourceIds: stableUnique(resourceBlockers.map((blocker) => blocker.resourceId)),
    blockers: resourceBlockers
  };

  const allDependencySources = [...sources, ...resourceSources];
  const evidenceTimes = allDependencySources.flatMap(
    (source) => [source.monitorCheckedAt, source.reviewedAt].filter(Boolean)
  );
  const evaluatedAt = evidenceTimes.length > 0
    ? evidenceTimes.sort().at(-1)
    : evaluatedNow;
  const validityCandidates = allDependencySources.flatMap((source) => (
    source.referenceEligible ? [source.monitorValidUntil, source.expiresAt] : []
  )).filter(Boolean).sort();
  const validUntil = blockers.length === 0 ? validityCandidates[0] ?? null : null;
  const core = {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    catalogPath: "sources/source-watchlist.json",
    catalogDigest: canonicalDigest(validatedCatalog, "SourceCatalog v2"),
    evaluatedAt,
    validUntil,
    status: blockers.length === 0 ? "current" : "blocked",
    requiredSourceIds,
    dependencies,
    sources,
    blockedGateIds,
    blockers,
    resourceGovernance
  };
  return deepFreeze({
    ...core,
    snapshotDigest: canonicalDigest(core, "authoritative source policy snapshot")
  });
}

function assertSnapshotSourceEntries(sources, requiredSourceIds, label) {
  if (!Array.isArray(sources) || !Array.isArray(requiredSourceIds)) {
    throw new Error(`${label} collections are invalid`);
  }
  if (!compareRecords(requiredSourceIds, stableUnique(requiredSourceIds))) {
    throw new Error(`${label} requiredSourceIds must be unique and sorted`);
  }
  const sourceById = new Map();
  for (const source of sources) {
    requireExactFields(source, [
      "sourceId", "monitorState", "reviewState", "disposition", "receiptPath",
      "receiptDigest", "reviewedRevision", "reviewedDigest", "reviewedAt", "expiresAt",
      "freshnessClass", "freshnessMaxAgeDays", "monitorCheckedAt", "monitorValidUntil",
      "runtimePosture", "referenceEligible", "runtimeEligible", "reason"
    ], `${label} entry`);
    if (typeof source.sourceId !== "string" || sourceById.has(source.sourceId)) {
      throw new Error(`${label} entry IDs must be unique strings`);
    }
    if (source.runtimeEligible !== false) {
      throw new Error(`${label} runtimeEligible must remain false`);
    }
    if (source.referenceEligible === true) {
      if (source.reason !== null || source.monitorState !== "CURRENT"
        || source.reviewState !== "REVIEWED_CURRENT" || source.receiptPath === null
        || !REFERENCE_DISPOSITIONS.has(source.disposition)) {
        throw new Error(`${label} reference eligibility is inconsistent`);
      }
      exactIso(source.monitorCheckedAt, `source ${source.sourceId} monitorCheckedAt`);
      exactIso(source.reviewedAt, `source ${source.sourceId} reviewedAt`);
      exactIso(source.expiresAt, `source ${source.sourceId} expiresAt`);
      if (!Number.isSafeInteger(source.freshnessMaxAgeDays) || source.freshnessMaxAgeDays < 1
        || source.monitorValidUntil !== addDays(source.monitorCheckedAt, source.freshnessMaxAgeDays)) {
        throw new Error(`source ${source.sourceId} monitor validity is inconsistent`);
      }
    } else if (typeof source.reason !== "string" || source.reason === "") {
      throw new Error(`ineligible ${label} entry requires a reason`);
    }
    sourceById.set(source.sourceId, source);
  }
  if (!compareRecords([...sourceById.keys()], requiredSourceIds)) {
    throw new Error(`${label} entries must exactly match requiredSourceIds in order`);
  }
  return sourceById;
}

export function assertSourceReferenceSnapshot(snapshot) {
  if (!isPlainRecord(snapshot) || snapshot.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error("source reference snapshot schemaVersion is invalid");
  }
  if (!HASH.test(snapshot.catalogDigest ?? "") || !HASH.test(snapshot.snapshotDigest ?? "")) {
    throw new Error("source reference snapshot digests are invalid");
  }
  requireExactFields(snapshot, [
    "schemaVersion", "catalogPath", "catalogDigest", "evaluatedAt", "validUntil",
    "status", "requiredSourceIds", "dependencies", "sources", "blockedGateIds",
    "blockers", "resourceGovernance", "snapshotDigest"
  ], "source reference snapshot");
  exactIso(snapshot.evaluatedAt, "source reference snapshot evaluatedAt");
  if (snapshot.catalogPath !== "sources/source-watchlist.json") {
    throw new Error("source reference snapshot catalogPath is not canonical");
  }
  if (!new Set(["current", "blocked"]).has(snapshot.status)) {
    throw new Error("source reference snapshot status is invalid");
  }
  if (!Array.isArray(snapshot.dependencies) || !Array.isArray(snapshot.sources)
    || !Array.isArray(snapshot.requiredSourceIds) || !Array.isArray(snapshot.blockedGateIds)
    || !Array.isArray(snapshot.blockers)) {
    throw new Error("source reference snapshot collections are invalid");
  }
  if (!compareRecords(snapshot.requiredSourceIds, stableUnique(snapshot.requiredSourceIds))) {
    throw new Error("source reference snapshot requiredSourceIds must be unique and sorted");
  }
  const dependencies = snapshot.dependencies.map((dependency) => {
    requireExactFields(dependency, ["gateId", "sourceId"], "source dependency");
    if (typeof dependency.gateId !== "string" || typeof dependency.sourceId !== "string") {
      throw new Error("source dependency IDs must be strings");
    }
    return dependency;
  });
  const sortedDependencies = [...dependencies].sort((left, right) => (
    left.gateId.localeCompare(right.gateId) || left.sourceId.localeCompare(right.sourceId)
  ));
  if (!compareRecords(dependencies, sortedDependencies)
    || new Set(dependencies.map((entry) => `${entry.gateId}\0${entry.sourceId}`)).size !== dependencies.length) {
    throw new Error("source reference snapshot dependencies must be unique and sorted");
  }
  const derivedSourceIds = stableUnique(dependencies.map((entry) => entry.sourceId));
  if (!compareRecords(snapshot.requiredSourceIds, derivedSourceIds)) {
    throw new Error("source reference snapshot requiredSourceIds do not match dependencies");
  }
  const sourceById = assertSnapshotSourceEntries(
    snapshot.sources,
    snapshot.requiredSourceIds,
    "source snapshot"
  );
  const derivedBlockers = dependencies
    .filter((dependency) => !sourceById.get(dependency.sourceId)?.referenceEligible)
    .map((dependency) => ({
      code: "authoritative-source-unavailable",
      gateId: dependency.gateId,
      sourceId: dependency.sourceId,
      reason: sourceById.get(dependency.sourceId)?.reason ?? "source-missing"
    }));
  if (!compareRecords(snapshot.blockers, derivedBlockers)) {
    throw new Error("source reference snapshot blockers do not match dependencies");
  }
  const derivedBlockedGateIds = stableUnique(derivedBlockers.map((blocker) => blocker.gateId));
  if (!compareRecords(snapshot.blockedGateIds, derivedBlockedGateIds)) {
    throw new Error("source reference snapshot blockedGateIds do not match blockers");
  }
  const derivedStatus = derivedBlockers.length === 0 ? "current" : "blocked";
  if (snapshot.status !== derivedStatus) {
    throw new Error("source reference snapshot status does not match derived source eligibility");
  }

  const resourceGovernance = snapshot.resourceGovernance;
  requireExactFields(resourceGovernance, [
    "schemaVersion", "status", "requiredSourceIds", "dependencies", "sources",
    "blockedResourceIds", "blockers"
  ], "resource source governance");
  if (resourceGovernance.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    throw new Error("resource source governance schemaVersion is invalid");
  }
  if (!new Set(["current", "blocked"]).has(resourceGovernance.status)) {
    throw new Error("resource source governance status is invalid");
  }
  if (!Array.isArray(resourceGovernance.dependencies)
    || !Array.isArray(resourceGovernance.sources)
    || !Array.isArray(resourceGovernance.requiredSourceIds)
    || !Array.isArray(resourceGovernance.blockedResourceIds)
    || !Array.isArray(resourceGovernance.blockers)) {
    throw new Error("resource source governance collections are invalid");
  }
  const resourceDependencies = resourceGovernance.dependencies.map((dependency) => {
    requireExactFields(dependency, ["resourceId", "sourceId"], "resource source dependency");
    if (typeof dependency.resourceId !== "string" || dependency.resourceId === ""
      || typeof dependency.sourceId !== "string" || dependency.sourceId === "") {
      throw new Error("resource source dependency IDs must be non-empty strings");
    }
    return dependency;
  });
  const sortedResourceDependencies = [...resourceDependencies].sort((left, right) => (
    left.resourceId.localeCompare(right.resourceId) || left.sourceId.localeCompare(right.sourceId)
  ));
  if (!compareRecords(resourceDependencies, sortedResourceDependencies)
    || new Set(resourceDependencies.map(
      (entry) => `${entry.resourceId}\0${entry.sourceId}`
    )).size !== resourceDependencies.length) {
    throw new Error("resource source dependencies must be unique and sorted");
  }
  const derivedResourceSourceIds = stableUnique(resourceDependencies.map((entry) => entry.sourceId));
  if (!compareRecords(resourceGovernance.requiredSourceIds, derivedResourceSourceIds)) {
    throw new Error("resource source governance requiredSourceIds do not match dependencies");
  }
  const resourceSourceById = assertSnapshotSourceEntries(
    resourceGovernance.sources,
    resourceGovernance.requiredSourceIds,
    "resource source snapshot"
  );
  const derivedResourceBlockers = resourceDependencies
    .filter((dependency) => !resourceSourceById.get(dependency.sourceId)?.referenceEligible)
    .map((dependency) => ({
      code: "dependent-source-unavailable",
      resourceId: dependency.resourceId,
      sourceId: dependency.sourceId,
      reason: resourceSourceById.get(dependency.sourceId)?.reason ?? "source-missing"
    }));
  if (!compareRecords(resourceGovernance.blockers, derivedResourceBlockers)) {
    throw new Error("resource source governance blockers do not match dependencies");
  }
  const derivedBlockedResourceIds = stableUnique(
    derivedResourceBlockers.map((blocker) => blocker.resourceId)
  );
  if (!compareRecords(resourceGovernance.blockedResourceIds, derivedBlockedResourceIds)) {
    throw new Error("resource source governance blockedResourceIds do not match blockers");
  }
  const derivedResourceStatus = derivedResourceBlockers.length === 0 ? "current" : "blocked";
  if (resourceGovernance.status !== derivedResourceStatus) {
    throw new Error("resource source governance status does not match dependency eligibility");
  }

  const validityCandidates = [...snapshot.sources, ...resourceGovernance.sources].flatMap((source) => (
    source.referenceEligible ? [source.monitorValidUntil, source.expiresAt] : []
  )).filter(Boolean).sort();
  const derivedValidUntil = derivedStatus === "current" ? validityCandidates[0] ?? null : null;
  if (snapshot.validUntil !== derivedValidUntil) {
    throw new Error("source reference snapshot validUntil does not match required source validity");
  }
  if (snapshot.validUntil !== null) exactIso(snapshot.validUntil, "source reference snapshot validUntil");
  const actualDigest = canonicalDigest(snapshotCore(snapshot), "authoritative source policy snapshot");
  if (actualDigest !== snapshot.snapshotDigest) {
    throw new Error("source reference snapshot snapshotDigest does not match its contents");
  }
  return snapshot;
}

export function applySourceReferenceSnapshotToDomain(domainSelection, snapshot) {
  if (!isPlainRecord(domainSelection) || !Array.isArray(domainSelection.resolvedGateIds)) {
    throw new Error("source policy requires a resolved domain selection");
  }
  const validatedSnapshot = assertSourceReferenceSnapshot(snapshot);
  const resolvedGateIds = new Set(domainSelection.resolvedGateIds);
  for (const gateId of validatedSnapshot.blockedGateIds) {
    if (!resolvedGateIds.has(gateId)) {
      throw new Error(`source snapshot blocks unresolved DomainGate: ${gateId}`);
    }
  }
  const blockedGateIds = stableUnique([
    ...(domainSelection.blockedGateIds ?? []),
    ...validatedSnapshot.blockedGateIds
  ]);
  return deepFreeze({
    ...structuredClone(domainSelection),
    status: blockedGateIds.length > 0 ? "blocked" : domainSelection.status,
    blockedGateIds,
    sourceGovernance: structuredClone(validatedSnapshot)
  });
}
