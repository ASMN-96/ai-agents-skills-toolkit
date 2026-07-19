const MONITOR_STATES = Object.freeze(["CURRENT", "CHANGED", "CHECK_FAILED", "MANUAL_DUE"]);
const SOURCE_SCOPES = Object.freeze([
  "core",
  "platform-preview",
  "optional-tool",
  "community-reference",
  "historical"
]);

function stableStrings(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value;
}

function sourceReason(source, observation) {
  const monitorState = observation?.monitorState ?? source.monitor?.state;
  const missingCurrentReview = observation?.missingCurrentReview
    ?? source.review?.state !== "REVIEWED_CURRENT";
  if (monitorState !== "CURRENT") return "SOURCE_MONITOR_ACTIONABLE";
  if (missingCurrentReview) return "SOURCE_NOT_REVIEWED_CURRENT";
  return null;
}

function sourceIndex(catalog) {
  const sources = requireArray(catalog?.sources, "source release accounting catalog.sources");
  const byId = new Map();
  for (const source of sources) {
    if (typeof source?.id !== "string" || source.id === "" || byId.has(source.id)) {
      throw new Error("source release accounting requires unique source IDs");
    }
    if (!SOURCE_SCOPES.includes(source.scope)) {
      throw new Error(`source release accounting source ${source.id} has unsupported scope`);
    }
    byId.set(source.id, source);
  }
  return byId;
}

function observationIndex(freshnessReport, sourcesById) {
  if (freshnessReport === undefined || freshnessReport === null) return new Map();
  const observations = requireArray(
    freshnessReport.sources,
    "source release accounting freshnessReport.sources"
  );
  if (observations.length !== sourcesById.size) {
    throw new Error("source release accounting freshness report must include every source");
  }
  const byId = new Map();
  for (const observation of observations) {
    if (!sourcesById.has(observation?.sourceId) || byId.has(observation.sourceId)) {
      throw new Error("source release accounting freshness report source IDs must be known and unique");
    }
    byId.set(observation.sourceId, observation);
  }
  return byId;
}

function domainDependencies(domainPacksRegistry, sourcesById) {
  if (domainPacksRegistry === undefined || domainPacksRegistry === null) {
    return { supportedPackIds: [], supported: [], preview: [] };
  }
  if (domainPacksRegistry.registryType !== "domain-packs") {
    throw new Error("source release accounting requires the canonical domain-packs registry");
  }
  const supportedPackIds = [];
  const supported = [];
  const preview = [];
  for (const pack of requireArray(domainPacksRegistry.packs, "domain-packs registry packs")) {
    if (pack?.lifecycle !== "active" || !["supported", "preview"].includes(pack?.maturity)) continue;
    if (pack.maturity === "supported") supportedPackIds.push(pack.id);
    for (const gate of requireArray(pack.gates, `domain pack ${pack.id} gates`)) {
      for (const reference of requireArray(
        gate.authoritativeSourceRefs,
        `domain gate ${gate.id} authoritativeSourceRefs`
      )) {
        if (!sourcesById.has(reference?.sourceId)) {
          throw new Error(`domain gate ${gate.id} references unknown source ${reference?.sourceId}`);
        }
        const dependency = { packId: pack.id, gateId: gate.id, sourceId: reference.sourceId };
        (pack.maturity === "supported" ? supported : preview).push(dependency);
      }
    }
  }
  const compare = (left, right) => (
    left.packId.localeCompare(right.packId)
    || left.gateId.localeCompare(right.gateId)
    || left.sourceId.localeCompare(right.sourceId)
  );
  return {
    supportedPackIds: stableStrings(supportedPackIds),
    supported: supported.sort(compare),
    preview: preview.sort(compare)
  };
}

export function deriveSourceReleaseAccounting({
  catalog,
  domainPacksRegistry = null,
  freshnessReport = null,
  trustedSelectedResourceIds = []
} = {}) {
  const sourcesById = sourceIndex(catalog);
  const observationsById = observationIndex(freshnessReport, sourcesById);
  const selectedResourceIds = stableStrings(requireArray(
    trustedSelectedResourceIds,
    "trustedSelectedResourceIds"
  ));
  if (selectedResourceIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("trustedSelectedResourceIds must contain non-empty strings");
  }
  const monitorCounts = Object.fromEntries(MONITOR_STATES.map((state) => [state, 0]));
  const actionableCountsByScope = Object.fromEntries(SOURCE_SCOPES.map((scope) => [scope, 0]));
  const reasonBySourceId = new Map();
  for (const source of sourcesById.values()) {
    const observation = observationsById.get(source.id);
    const monitorState = observation?.monitorState ?? source.monitor?.state;
    if (!Object.hasOwn(monitorCounts, monitorState)) {
      throw new Error(`source release accounting source ${source.id} has unsupported monitor state`);
    }
    monitorCounts[monitorState] += 1;
    const reasonCode = sourceReason(source, observation);
    if (reasonCode !== null) {
      actionableCountsByScope[source.scope] += 1;
      reasonBySourceId.set(source.id, reasonCode);
    }
  }
  const actionableSourceIds = stableStrings(reasonBySourceId.keys());
  const domains = domainDependencies(domainPacksRegistry, sourcesById);
  const blockerFor = (dependency) => ({
    ...dependency,
    reasonCode: reasonBySourceId.get(dependency.sourceId)
  });
  const supportedDependencyBlockers = domains.supported
    .filter((dependency) => reasonBySourceId.has(dependency.sourceId))
    .map(blockerFor);
  const previewDependencyBlockers = domains.preview
    .filter((dependency) => reasonBySourceId.has(dependency.sourceId))
    .map(blockerFor);
  const resourceDependencies = [];
  for (const source of sourcesById.values()) {
    for (const resourceId of requireArray(
      source.dependentResourceIds ?? [],
      `source ${source.id} dependentResourceIds`
    )) {
      resourceDependencies.push({ resourceId, sourceId: source.id });
    }
  }
  resourceDependencies.sort((left, right) => (
    left.resourceId.localeCompare(right.resourceId) || left.sourceId.localeCompare(right.sourceId)
  ));
  const resourceDependencyBlockers = resourceDependencies
    .filter((dependency) => reasonBySourceId.has(dependency.sourceId))
    .map(blockerFor);
  const selectedSet = new Set(selectedResourceIds);
  const releaseBlockingSourceIds = stableStrings([
    ...supportedDependencyBlockers.map((entry) => entry.sourceId),
    ...resourceDependencyBlockers
      .filter((entry) => selectedSet.has(entry.resourceId))
      .map((entry) => entry.sourceId)
  ]);
  return {
    sourceCount: sourcesById.size,
    monitorCounts,
    actionableCount: actionableSourceIds.length,
    actionableCountsByScope,
    actionableSourceIds,
    supportedPackIds: domains.supportedPackIds,
    trustedSelectedResourceIds: selectedResourceIds,
    releaseBlockingSourceCount: releaseBlockingSourceIds.length,
    releaseBlockingSourceIds,
    releaseNonblockingActionableCount: actionableSourceIds.length - releaseBlockingSourceIds.length,
    supportedDependencyBlockers,
    previewDependencyBlockers,
    resourceDependencyBlockers
  };
}
