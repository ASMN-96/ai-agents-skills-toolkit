const MONITOR_STATES = Object.freeze(["CURRENT", "CHANGED", "CHECK_FAILED", "MANUAL_DUE"]);
const SOURCE_SCOPES = Object.freeze([
  "core",
  "platform-preview",
  "optional-tool",
  "community-reference",
  "historical"
]);
const ACTIONABILITY_REASONS = new Set([
  "SOURCE_MONITOR_ACTIONABLE",
  "SOURCE_NOT_REVIEWED_CURRENT"
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
    throw new Error("source release accounting requires the canonical domain-packs registry");
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
  freshnessReport = null
} = {}) {
  const sourcesById = sourceIndex(catalog);
  const observationsById = observationIndex(freshnessReport, sourcesById);
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
  const releaseBlockingSourceIds = stableStrings(
    supportedDependencyBlockers.map((entry) => entry.sourceId)
  );
  return {
    sourceCount: sourcesById.size,
    monitorCounts,
    actionableCount: actionableSourceIds.length,
    actionableCountsByScope,
    actionableSourceIds,
    supportedPackIds: domains.supportedPackIds,
    releaseBlockingSourceCount: releaseBlockingSourceIds.length,
    releaseBlockingSourceIds,
    releaseNonblockingActionableCount: actionableSourceIds.length - releaseBlockingSourceIds.length,
    supportedDependencyBlockers,
    previewDependencyBlockers,
    resourceDependencyBlockers
  };
}

function selectedIds(values, label) {
  const selected = stableStrings(requireArray(values, label));
  if (selected.some((id) => typeof id !== "string" || id === "")) {
    throw new Error(`${label} must contain non-empty strings`);
  }
  return selected;
}

function dependencyKey(entry) {
  return entry.resourceId === undefined
    ? `${entry.packId}\0${entry.gateId}\0${entry.sourceId}`
    : `${entry.resourceId}\0${entry.sourceId}`;
}

function stableDependencies(values) {
  return [...values].sort((left, right) => dependencyKey(left).localeCompare(dependencyKey(right)));
}

export function derivePlanSourceDependencyAccounting({
  sourceAccounting,
  selectedPackIds,
  selectedGateIds,
  selectedResourceIds
} = {}) {
  const supportedDependencyBlockers = requireArray(
    sourceAccounting?.supportedDependencyBlockers,
    "plan source accounting supportedDependencyBlockers"
  );
  const previewDependencyBlockers = requireArray(
    sourceAccounting?.previewDependencyBlockers,
    "plan source accounting previewDependencyBlockers"
  );
  const resourceDependencyBlockers = requireArray(
    sourceAccounting?.resourceDependencyBlockers,
    "plan source accounting resourceDependencyBlockers"
  );
  const packs = selectedIds(selectedPackIds, "plan source accounting selectedPackIds");
  const gates = selectedIds(selectedGateIds, "plan source accounting selectedGateIds");
  const resources = selectedIds(selectedResourceIds, "plan source accounting selectedResourceIds");
  const selectedPacks = new Set(packs);
  const selectedGates = new Set(gates);
  const selectedResources = new Set(resources);
  const selectedSupportedDependencyBlockers = stableDependencies(
    supportedDependencyBlockers.filter((entry) => selectedPacks.has(entry.packId))
  );
  const selectedPreviewDependencyBlockers = stableDependencies(
    previewDependencyBlockers.filter(
      (entry) => selectedPacks.has(entry.packId) && selectedGates.has(entry.gateId)
    )
  );
  const selectedResourceDependencyBlockers = stableDependencies(
    resourceDependencyBlockers.filter((entry) => selectedResources.has(entry.resourceId))
  );
  const diagnosticPreviewDependencyBlockers = stableDependencies(
    previewDependencyBlockers.filter(
      (entry) => !selectedPacks.has(entry.packId) || !selectedGates.has(entry.gateId)
    )
  );
  const diagnosticResourceDependencyBlockers = stableDependencies(
    resourceDependencyBlockers.filter((entry) => !selectedResources.has(entry.resourceId))
  );
  const blockingSourceIds = stableStrings([
    ...selectedSupportedDependencyBlockers.map((entry) => entry.sourceId),
    ...selectedPreviewDependencyBlockers.map((entry) => entry.sourceId),
    ...selectedResourceDependencyBlockers.map((entry) => entry.sourceId)
  ]);
  return {
    schemaVersion: "1.0.0",
    selectedPackIds: packs,
    selectedGateIds: gates,
    selectedResourceIds: resources,
    status: blockingSourceIds.length === 0 ? "current" : "blocked",
    blockingSourceIds,
    supportedDependencyBlockers: selectedSupportedDependencyBlockers,
    selectedPreviewDependencyBlockers,
    selectedResourceDependencyBlockers,
    diagnosticPreviewDependencyBlockers,
    diagnosticResourceDependencyBlockers
  };
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function requireExactFields(record, fields, label) {
  if (!isPlainRecord(record)) throw new Error(`${label} must be a plain record`);
  if (!sameJson(Object.keys(record).sort(), [...fields].sort())) {
    throw new Error(`${label} fields are invalid`);
  }
}

function assertDependencies(entries, kind, label) {
  requireArray(entries, label);
  const fields = kind === "resource"
    ? ["resourceId", "sourceId", "reasonCode"]
    : ["packId", "gateId", "sourceId", "reasonCode"];
  for (const entry of entries) {
    requireExactFields(entry, fields, `${label} entry`);
    for (const field of fields) {
      if (typeof entry[field] !== "string" || entry[field] === "") {
        throw new Error(`${label} entry ${field} must be a non-empty string`);
      }
    }
    if (!ACTIONABILITY_REASONS.has(entry.reasonCode)) {
      throw new Error(`${label} entry reasonCode is unsupported`);
    }
  }
  const stable = stableDependencies(entries);
  if (!sameJson(entries, stable) || new Set(entries.map(dependencyKey)).size !== entries.length) {
    throw new Error(`${label} must be unique and sorted`);
  }
  return entries;
}

export function assertPlanSourceDependencyAccounting(accounting, {
  selectedPackIds,
  selectedGateIds,
  selectedResourceIds,
  sourceSnapshot
} = {}) {
  requireExactFields(accounting, [
    "schemaVersion",
    "selectedPackIds",
    "selectedGateIds",
    "selectedResourceIds",
    "status",
    "blockingSourceIds",
    "supportedDependencyBlockers",
    "selectedPreviewDependencyBlockers",
    "selectedResourceDependencyBlockers",
    "diagnosticPreviewDependencyBlockers",
    "diagnosticResourceDependencyBlockers"
  ], "sourceDependencyAccounting");
  if (accounting.schemaVersion !== "1.0.0") {
    throw new Error("sourceDependencyAccounting schemaVersion is invalid");
  }
  const expectedPacks = selectedIds(selectedPackIds, "selected domain pack IDs");
  const expectedGates = selectedIds(selectedGateIds, "selected domain gate IDs");
  const expectedResources = selectedIds(selectedResourceIds, "routing selected resource IDs");
  if (!sameJson(accounting.selectedPackIds, expectedPacks)) {
    throw new Error("sourceDependencyAccounting selectedPackIds must exactly match domain.selectedPackIds");
  }
  if (!sameJson(accounting.selectedGateIds, expectedGates)) {
    throw new Error("sourceDependencyAccounting selectedGateIds must exactly match domain.resolvedGateIds");
  }
  if (!sameJson(accounting.selectedResourceIds, expectedResources)) {
    throw new Error("sourceDependencyAccounting selectedResourceIds must exactly match routing.selected");
  }
  const supported = assertDependencies(
    accounting.supportedDependencyBlockers,
    "gate",
    "sourceDependencyAccounting supportedDependencyBlockers"
  );
  const selectedPreview = assertDependencies(
    accounting.selectedPreviewDependencyBlockers,
    "gate",
    "sourceDependencyAccounting selectedPreviewDependencyBlockers"
  );
  const selectedResources = assertDependencies(
    accounting.selectedResourceDependencyBlockers,
    "resource",
    "sourceDependencyAccounting selectedResourceDependencyBlockers"
  );
  const diagnosticPreview = assertDependencies(
    accounting.diagnosticPreviewDependencyBlockers,
    "gate",
    "sourceDependencyAccounting diagnosticPreviewDependencyBlockers"
  );
  const diagnosticResources = assertDependencies(
    accounting.diagnosticResourceDependencyBlockers,
    "resource",
    "sourceDependencyAccounting diagnosticResourceDependencyBlockers"
  );
  const packSet = new Set(expectedPacks);
  const gateSet = new Set(expectedGates);
  const resourceSet = new Set(expectedResources);
  if (supported.some((entry) => !packSet.has(entry.packId))) {
    throw new Error("sourceDependencyAccounting supported blockers must belong to a selected pack");
  }
  if (selectedPreview.some((entry) => !packSet.has(entry.packId) || !gateSet.has(entry.gateId))) {
    throw new Error("sourceDependencyAccounting preview blockers must belong to selected packs and gates");
  }
  if (diagnosticPreview.some((entry) => packSet.has(entry.packId) && gateSet.has(entry.gateId))) {
    throw new Error("sourceDependencyAccounting selected preview blockers cannot remain diagnostic");
  }
  if (selectedResources.some((entry) => !resourceSet.has(entry.resourceId))) {
    throw new Error("sourceDependencyAccounting resource blockers must belong to selected resources");
  }
  if (diagnosticResources.some((entry) => resourceSet.has(entry.resourceId))) {
    throw new Error("sourceDependencyAccounting selected resource blockers cannot remain diagnostic");
  }
  const snapshotGateBlockers = new Set((sourceSnapshot?.blockers ?? []).map(
    (entry) => `${entry.gateId}\0${entry.sourceId}`
  ));
  const selectedGateBlockers = new Set([...supported, ...selectedPreview]
    .filter((entry) => gateSet.has(entry.gateId))
    .map((entry) => `${entry.gateId}\0${entry.sourceId}`));
  for (const key of snapshotGateBlockers) {
    if (!selectedGateBlockers.has(key)) {
      throw new Error("sourceDependencyAccounting omits a selected gate source blocker");
    }
  }
  for (const key of selectedGateBlockers) {
    if (!snapshotGateBlockers.has(key)) {
      throw new Error("sourceDependencyAccounting selected gate blocker contradicts source snapshot");
    }
  }
  const snapshotSelectedResourceBlockers = new Set((sourceSnapshot?.resourceGovernance?.blockers ?? [])
    .filter((entry) => resourceSet.has(entry.resourceId))
    .map((entry) => `${entry.resourceId}\0${entry.sourceId}`));
  const accountingSelectedResourceBlockers = new Set(selectedResources.map(
    (entry) => `${entry.resourceId}\0${entry.sourceId}`
  ));
  if (!sameJson([...snapshotSelectedResourceBlockers].sort(), [...accountingSelectedResourceBlockers].sort())) {
    throw new Error("sourceDependencyAccounting selected resource blockers contradict source snapshot");
  }
  const expectedBlockingSourceIds = stableStrings([
    ...supported.map((entry) => entry.sourceId),
    ...selectedPreview.map((entry) => entry.sourceId),
    ...selectedResources.map((entry) => entry.sourceId)
  ]);
  if (!sameJson(accounting.blockingSourceIds, expectedBlockingSourceIds)) {
    throw new Error("sourceDependencyAccounting blockingSourceIds do not match blockers");
  }
  const expectedStatus = expectedBlockingSourceIds.length === 0 ? "current" : "blocked";
  if (accounting.status !== expectedStatus) {
    throw new Error("sourceDependencyAccounting status does not match blockers");
  }
  return accounting;
}
