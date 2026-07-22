import { canonicalDigest } from "./canonical-digest.mjs";
import { deriveCapabilityScopedBlocking } from "./source-policy.mjs";

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
const PACK_MATURITIES = new Set(["supported", "preview", "unavailable"]);
const DEPENDENCY_CLASSES = new Set(["supported", "preview"]);
const SHA256 = /^[a-f0-9]{64}$/;

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

function reportedCapabilityImpact(freshnessReport) {
  if (freshnessReport === undefined || freshnessReport === null) {
    return {
      capabilityIds: [],
      blockingCapabilityIds: [],
      blockingSourceIds: [],
      blockingResourceIds: [],
      blockingGateIds: [],
      portfolioActionableCount: 0,
      releaseBlocking: false,
      advisories: []
    };
  }
  const capabilityIds = [];
  const blockingResourceIds = [];
  const blockingSourceIds = [];
  let portfolioActionableCount = 0;
  for (const observation of freshnessReport.sources) {
    const impact = observation?.capabilityImpact;
    if (impact === null || typeof impact !== "object" || Array.isArray(impact)) continue;
    if (Array.isArray(impact.capabilityIds)) capabilityIds.push(...impact.capabilityIds);
    if (impact.portfolioActionable === true) portfolioActionableCount += 1;
    if (impact.releaseBlocking === true && Array.isArray(impact.blockingResourceIds)) {
      blockingSourceIds.push(observation.sourceId);
      blockingResourceIds.push(...impact.blockingResourceIds);
    }
  }
  return {
    capabilityIds: stableStrings(capabilityIds),
    blockingCapabilityIds: [],
    blockingSourceIds: stableStrings(blockingSourceIds),
    blockingResourceIds: stableStrings(blockingResourceIds),
    blockingGateIds: [],
    portfolioActionableCount,
    releaseBlocking: blockingResourceIds.length > 0,
    advisories: []
  };
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
  const dependencyClassifications = [];
  for (const pack of requireArray(domainPacksRegistry.packs, "domain-packs registry packs")) {
    if (pack?.lifecycle !== "active" || !["supported", "preview"].includes(pack?.maturity)) continue;
    if (pack.maturity === "supported") supportedPackIds.push(pack.id);
    for (const gate of requireArray(pack.gates, `domain pack ${pack.id} gates`)) {
      dependencyClassifications.push({
        packId: pack.id,
        gateId: gate.id,
        dependencyClass: pack.maturity === "supported" ? "supported" : "preview"
      });
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
    dependencyClassifications: dependencyClassifications.sort(
      (left, right) => (
        left.packId.localeCompare(right.packId) || left.gateId.localeCompare(right.gateId)
      )
    ),
    supported: supported.sort(compare),
    preview: preview.sort(compare)
  };
}

export function deriveSourceReleaseAccounting({
  catalog,
  domainPacksRegistry = null,
  freshnessReport = null,
  capabilityImpacts = [],
  selectedResourceIds = [],
  selectedGateIds = [],
  supportedGateIds = []
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
  const scopedCapabilityImpact = deriveCapabilityScopedBlocking({
    capabilityImpacts,
    selectedResourceIds,
    selectedGateIds,
    supportedGateIds
  });
  const capabilityImpact = capabilityImpacts.length > 0
    ? scopedCapabilityImpact
    : reportedCapabilityImpact(freshnessReport);
  const dependencyUniverseDigest = canonicalDigest({
    supportedDependencyBlockers,
    previewDependencyBlockers,
    resourceDependencyBlockers
  }, "source dependency blocker universe");
  return {
    sourceCount: sourcesById.size,
    monitorCounts,
    actionableCount: actionableSourceIds.length,
    actionableCountsByScope,
    actionableSourceIds,
    supportedPackIds: domains.supportedPackIds,
    dependencyClassifications: domains.dependencyClassifications,
    dependencyUniverseDigest,
    releaseBlockingSourceCount: releaseBlockingSourceIds.length,
    releaseBlockingSourceIds,
    releaseNonblockingActionableCount: actionableSourceIds.length - releaseBlockingSourceIds.length,
    supportedDependencyBlockers,
    previewDependencyBlockers,
    resourceDependencyBlockers,
    capabilityImpact,
    capabilityIds: capabilityImpact.capabilityIds,
    blockingCapabilityIds: capabilityImpact.blockingCapabilityIds,
    blockingResourceIds: capabilityImpact.blockingResourceIds,
    blockingGateIds: capabilityImpact.blockingGateIds,
    portfolioActionable: capabilityImpact.portfolioActionableCount > 0,
    releaseBlocking: capabilityImpact.releaseBlocking,
    globalReleaseBlocked: false,
    advisories: capabilityImpact.advisories
  };
}

function selectedIds(values, label) {
  const selected = stableStrings(requireArray(values, label));
  if (selected.some((id) => typeof id !== "string" || id === "")) {
    throw new Error(`${label} must contain non-empty strings`);
  }
  return selected;
}

function normalizedSelectedPackMaturities(values, selectedPackIds, label) {
  const entries = requireArray(values, label).map((entry) => {
    requireExactFields(
      entry,
      ["packId", "declaredMaturity", "effectiveMaturity"],
      `${label} entry`
    );
    if (typeof entry.packId !== "string" || entry.packId === "") {
      throw new Error(`${label} entry packId must be a non-empty string`);
    }
    if (!PACK_MATURITIES.has(entry.declaredMaturity)
      || !PACK_MATURITIES.has(entry.effectiveMaturity)) {
      throw new Error(`${label} entry maturity is invalid`);
    }
    return { ...entry };
  }).sort((left, right) => left.packId.localeCompare(right.packId));
  if (new Set(entries.map((entry) => entry.packId)).size !== entries.length
    || !sameJson(entries.map((entry) => entry.packId), selectedPackIds)) {
    throw new Error(`${label} must exactly cover selectedPackIds`);
  }
  return entries;
}

function normalizedDependencyClassifications(values, label) {
  const entries = requireArray(values, label).map((entry) => {
    requireExactFields(entry, ["packId", "gateId", "dependencyClass"], `${label} entry`);
    if (typeof entry.packId !== "string" || entry.packId === ""
      || typeof entry.gateId !== "string" || entry.gateId === ""
      || !DEPENDENCY_CLASSES.has(entry.dependencyClass)) {
      throw new Error(`${label} entry is invalid`);
    }
    return { ...entry };
  }).sort((left, right) => (
    left.packId.localeCompare(right.packId) || left.gateId.localeCompare(right.gateId)
  ));
  if (new Set(entries.map((entry) => entry.gateId)).size !== entries.length
    || !sameJson(entries, values)) {
    throw new Error(`${label} must bind unique gates in sorted order`);
  }
  return entries;
}

function dependencyClassForMaturity(maturity) {
  if (maturity === "supported" || maturity === "preview") return maturity;
  return null;
}

function dependencyKey(entry) {
  return entry.resourceId === undefined
    ? `${entry.packId}\0${entry.gateId}\0${entry.sourceId}`
    : `${entry.resourceId}\0${entry.sourceId}`;
}

function stableDependencies(values) {
  return [...values].sort((left, right) => {
    if (left.resourceId !== undefined || right.resourceId !== undefined) {
      return left.resourceId.localeCompare(right.resourceId)
        || left.sourceId.localeCompare(right.sourceId);
    }
    return left.packId.localeCompare(right.packId)
      || left.gateId.localeCompare(right.gateId)
      || left.sourceId.localeCompare(right.sourceId);
  });
}

export function derivePlanSourceDependencyAccounting({
  sourceAccounting,
  selectedPackIds,
  selectedPackMaturities,
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
  const packMaturities = normalizedSelectedPackMaturities(
    selectedPackMaturities,
    packs,
    "plan source accounting selectedPackMaturities"
  );
  const dependencyClassifications = normalizedDependencyClassifications(
    sourceAccounting?.dependencyClassifications,
    "plan source accounting dependencyClassifications"
  );
  const dependencyUniverseDigest = sourceAccounting?.dependencyUniverseDigest;
  if (!SHA256.test(dependencyUniverseDigest ?? "")) {
    throw new Error("plan source accounting dependencyUniverseDigest is invalid");
  }
  const gates = selectedIds(selectedGateIds, "plan source accounting selectedGateIds");
  const resources = selectedIds(selectedResourceIds, "plan source accounting selectedResourceIds");
  const selectedPacks = new Set(packs);
  const selectedGates = new Set(gates);
  const selectedResources = new Set(resources);
  const selectedSupportedDependencyBlockers = stableDependencies(
    supportedDependencyBlockers.filter(
      (entry) => selectedPacks.has(entry.packId) && selectedGates.has(entry.gateId)
    )
  );
  const diagnosticSupportedDependencyBlockers = stableDependencies(
    supportedDependencyBlockers.filter(
      (entry) => !selectedPacks.has(entry.packId) || !selectedGates.has(entry.gateId)
    )
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
    selectedPackMaturities: packMaturities,
    dependencyClassifications,
    dependencyUniverseDigest,
    selectedGateIds: gates,
    selectedResourceIds: resources,
    status: blockingSourceIds.length === 0 ? "current" : "blocked",
    blockingSourceIds,
    selectedSupportedDependencyBlockers,
    diagnosticSupportedDependencyBlockers,
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

function assertExactDependencyPartition(selected, diagnostic, isSelected, label) {
  const combined = [...selected, ...diagnostic];
  if (new Set(combined.map(dependencyKey)).size !== combined.length) {
    throw new Error(`${label} selected and diagnostic buckets must not overlap`);
  }
  const expectedSelected = stableDependencies(combined.filter(isSelected));
  const expectedDiagnostic = stableDependencies(combined.filter((entry) => !isSelected(entry)));
  if (!sameJson(selected, expectedSelected) || !sameJson(diagnostic, expectedDiagnostic)) {
    throw new Error(`${label} selected and diagnostic buckets do not match canonical selections`);
  }
}

export function assertPlanSourceDependencyAccounting(accounting, {
  selectedPackIds,
  selectedPackMaturities,
  selectedGateIds,
  selectedResourceIds,
  sourceSnapshot
} = {}) {
  requireExactFields(accounting, [
    "schemaVersion",
    "selectedPackIds",
    "selectedPackMaturities",
    "dependencyClassifications",
    "dependencyUniverseDigest",
    "selectedGateIds",
    "selectedResourceIds",
    "status",
    "blockingSourceIds",
    "selectedSupportedDependencyBlockers",
    "diagnosticSupportedDependencyBlockers",
    "selectedPreviewDependencyBlockers",
    "selectedResourceDependencyBlockers",
    "diagnosticPreviewDependencyBlockers",
    "diagnosticResourceDependencyBlockers"
  ], "sourceDependencyAccounting");
  if (accounting.schemaVersion !== "1.0.0") {
    throw new Error("sourceDependencyAccounting schemaVersion is invalid");
  }
  const expectedPacks = selectedIds(selectedPackIds, "selected domain pack IDs");
  const expectedPackMaturities = normalizedSelectedPackMaturities(
    selectedPackMaturities,
    expectedPacks,
    "selected domain pack maturities"
  );
  const expectedGates = selectedIds(selectedGateIds, "selected domain gate IDs");
  const expectedResources = selectedIds(selectedResourceIds, "routing selected resource IDs");
  if (!sameJson(accounting.selectedPackIds, expectedPacks)) {
    throw new Error("sourceDependencyAccounting selectedPackIds must exactly match domain.selectedPackIds");
  }
  if (!sameJson(accounting.selectedPackMaturities, expectedPackMaturities)) {
    throw new Error(
      "sourceDependencyAccounting selectedPackMaturities must exactly match domain.packMaturities"
    );
  }
  if (!sameJson(accounting.selectedGateIds, expectedGates)) {
    throw new Error("sourceDependencyAccounting selectedGateIds must exactly match domain.resolvedGateIds");
  }
  if (!sameJson(accounting.selectedResourceIds, expectedResources)) {
    throw new Error("sourceDependencyAccounting selectedResourceIds must exactly match routing.selected");
  }
  if (!SHA256.test(accounting.dependencyUniverseDigest ?? "")) {
    throw new Error("sourceDependencyAccounting dependencyUniverseDigest is invalid");
  }
  const dependencyClassifications = normalizedDependencyClassifications(
    accounting.dependencyClassifications,
    "sourceDependencyAccounting dependencyClassifications"
  );
  const selectedSupported = assertDependencies(
    accounting.selectedSupportedDependencyBlockers,
    "gate",
    "sourceDependencyAccounting selectedSupportedDependencyBlockers"
  );
  const diagnosticSupported = assertDependencies(
    accounting.diagnosticSupportedDependencyBlockers,
    "gate",
    "sourceDependencyAccounting diagnosticSupportedDependencyBlockers"
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
  const selectedClassByPack = new Map(expectedPackMaturities.map((entry) => [
    entry.packId,
    dependencyClassForMaturity(entry.declaredMaturity)
  ]));
  const dependencyBindingByGate = new Map(dependencyClassifications.map(
    (entry) => [entry.gateId, entry]
  ));
  for (const binding of dependencyClassifications) {
    const selectedClass = selectedClassByPack.get(binding.packId);
    if (selectedClass !== undefined && binding.dependencyClass !== selectedClass) {
      throw new Error(
        "sourceDependencyAccounting dependency classifications contradict domain pack maturity"
      );
    }
  }
  const supportedUniverse = [...selectedSupported, ...diagnosticSupported];
  const previewUniverse = [...selectedPreview, ...diagnosticPreview];
  if (selectedSupported.some((entry) => (
    !packSet.has(entry.packId)
    || !gateSet.has(entry.gateId)
    || selectedClassByPack.get(entry.packId) !== "supported"
  ))) {
    throw new Error(
      "sourceDependencyAccounting supported blockers require selected supported pack maturity and gate"
    );
  }
  if (selectedPreview.some((entry) => (
    !packSet.has(entry.packId)
    || !gateSet.has(entry.gateId)
    || selectedClassByPack.get(entry.packId) !== "preview"
  ))) {
    throw new Error(
      "sourceDependencyAccounting preview blockers require selected preview pack maturity and gate"
    );
  }
  if (supportedUniverse.some((entry) => {
    const binding = dependencyBindingByGate.get(entry.gateId);
    return binding?.packId !== entry.packId || binding.dependencyClass !== "supported";
  })) {
    throw new Error(
      "sourceDependencyAccounting supported blockers contradict canonical gate ownership or classification"
    );
  }
  if (previewUniverse.some((entry) => {
    const binding = dependencyBindingByGate.get(entry.gateId);
    return binding?.packId !== entry.packId || binding.dependencyClass !== "preview";
  })) {
    throw new Error(
      "sourceDependencyAccounting preview blockers contradict canonical gate ownership or classification"
    );
  }
  const resourceUniverse = [...selectedResources, ...diagnosticResources];
  const actualDependencyUniverseDigest = canonicalDigest({
    supportedDependencyBlockers: stableDependencies(supportedUniverse),
    previewDependencyBlockers: stableDependencies(previewUniverse),
    resourceDependencyBlockers: stableDependencies(resourceUniverse)
  }, "source dependency blocker universe");
  if (accounting.dependencyUniverseDigest !== actualDependencyUniverseDigest) {
    throw new Error(
      "sourceDependencyAccounting blocker universe does not match its canonical digest"
    );
  }
  assertExactDependencyPartition(
    selectedSupported,
    diagnosticSupported,
    (entry) => packSet.has(entry.packId) && gateSet.has(entry.gateId),
    "sourceDependencyAccounting supported blockers"
  );
  assertExactDependencyPartition(
    selectedPreview,
    diagnosticPreview,
    (entry) => packSet.has(entry.packId) && gateSet.has(entry.gateId),
    "sourceDependencyAccounting preview blockers"
  );
  assertExactDependencyPartition(
    selectedResources,
    diagnosticResources,
    (entry) => resourceSet.has(entry.resourceId),
    "sourceDependencyAccounting resource blockers"
  );
  const snapshotGateBlockers = new Set((sourceSnapshot?.blockers ?? []).map(
    (entry) => `${entry.gateId}\0${entry.sourceId}`
  ));
  const selectedGateBlockers = new Set([...selectedSupported, ...selectedPreview]
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
    ...selectedSupported.map((entry) => entry.sourceId),
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
