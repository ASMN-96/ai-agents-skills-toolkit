function array(value) {
  return Array.isArray(value) ? value : [];
}

function stableStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function referenceId(reference) {
  if (typeof reference === "string") return reference;
  if (reference && typeof reference.kind === "string" && typeof reference.id === "string") {
    return `${reference.kind}:${reference.id}`;
  }
  return null;
}

function outputId(output) {
  if (typeof output === "string") return output;
  if (!output || typeof output !== "object") return null;
  for (const field of ["id", "path", "outputPath"]) {
    if (typeof output[field] === "string" && output[field].length > 0) return output[field];
  }
  return null;
}

function catalogResources(resourceCatalog) {
  if (Array.isArray(resourceCatalog)) return resourceCatalog;
  return array(resourceCatalog?.resources);
}

function compilerOutputs(compilerInventory) {
  if (Array.isArray(compilerInventory)) return compilerInventory;
  return array(compilerInventory?.compiledOutputs ?? compilerInventory?.outputs ?? compilerInventory?.compiledAgents);
}

function isActiveSynthesis(synthesis, capabilitiesById) {
  if (synthesis?.state !== "approved") return false;
  const capability = capabilitiesById.get(synthesis.capabilityId);
  return capability?.lifecycle === "active"
    && (!capability.activeSynthesisId || capability.activeSynthesisId === synthesis.id);
}

function selectedInputs({ sourceId, changedLocators, comparisonState, registry }) {
  const capabilitiesById = new Map(array(registry?.capabilities)
    .filter((capability) => typeof capability?.id === "string")
    .map((capability) => [capability.id, capability]));
  const activeSyntheses = array(registry?.syntheses)
    .filter((synthesis) => isActiveSynthesis(synthesis, capabilitiesById));
  const inputs = activeSyntheses.flatMap((synthesis) => array(synthesis.inputs)
    .filter((input) => input?.sourceId === sourceId && typeof input.id === "string")
    .map((input) => ({ synthesis, input })));
  const changed = new Set(array(changedLocators).filter((locator) => typeof locator === "string"));
  const stale = comparisonState === "exact"
    ? inputs.filter(({ input }) => array(input.locators).some((locator) => changed.has(locator?.value)))
    : inputs;
  return { capabilitiesById, stale };
}

function isActionableDecision(decision) {
  return ["adopted", "adapted", "delegated"].includes(decision?.outcome);
}

function isSelectedSupported(resource) {
  const selected = resource?.selected ?? resource?.selection?.selected ?? resource?.releaseScope?.selected;
  const supported = resource?.supported ?? resource?.support?.supported ?? resource?.releaseScope?.supported;
  return selected === true && supported === true;
}

function blocksOnSourceChange(resource) {
  return resource?.sourceChangeBlocksRelease === true
    || resource?.releaseBlocking === true
    || resource?.release?.sourceChangeBlocksRelease === true;
}

/**
 * Derives review impact from already-reviewed source provenance. This function is
 * intentionally pure: it reports affected graph nodes but neither changes
 * freshness nor grants runtime routing authority.
 */
export function deriveCapabilityImpact({
  sourceId,
  changedLocators = [],
  comparisonState = "unavailable",
  registry,
  resourceCatalog,
  compilerInventory
} = {}) {
  const { capabilitiesById, stale } = selectedInputs({ sourceId, changedLocators, comparisonState, registry });
  const staleInputIds = stableStrings(stale.map(({ input }) => input.id));
  const synthesisDecisionIds = [];
  const capabilityIds = [];
  const artifactRefs = [];
  const consumerRefs = [];
  const compiledOutputs = [];
  const mirrorOutputs = [];
  const evaluationRefs = [];
  const blockingResourceIds = [];
  const reasons = [];
  const resourcesById = new Map(catalogResources(resourceCatalog)
    .filter((resource) => typeof resource?.id === "string")
    .map((resource) => [resource.id, resource]));
  const artifactsBySynthesis = new Map();
  const evaluationsBySynthesis = new Map();
  const actionableConsumers = new Set();
  const affectedResourceIds = new Set();
  const reachableCapabilityIds = new Set();
  let portfolioActionable = false;

  for (const { synthesis, input } of stale) {
    const capability = capabilitiesById.get(synthesis.capabilityId);
    if (!capability) continue;
    capabilityIds.push(capability.id);
    const artifacts = artifactsBySynthesis.get(synthesis) ?? new Map(array(synthesis.artifactRefs)
      .filter((artifact) => typeof artifact?.id === "string")
      .map((artifact) => [artifact.id, artifact]));
    artifactsBySynthesis.set(synthesis, artifacts);
    const evaluations = evaluationsBySynthesis.get(synthesis) ?? new Map(array(synthesis.evaluationRefs)
      .filter((evaluation) => typeof evaluation?.id === "string")
      .map((evaluation) => [evaluation.id, evaluation]));
    evaluationsBySynthesis.set(synthesis, evaluations);

    for (const decision of array(synthesis.decisions)) {
      if (!array(decision?.inputRefs).includes(input.id) || typeof decision.id !== "string") continue;
      synthesisDecisionIds.push(decision.id);
      if (isActionableDecision(decision)) portfolioActionable = true;

      for (const artifactRef of array(decision.artifactRefs)) {
        const artifact = artifacts.get(artifactRef);
        if (!artifact) {
          reasons.push(`missing-artifact:${artifactRef}`);
          continue;
        }
        artifactRefs.push(artifact.id);
        if (typeof artifact.resourceId !== "string" || artifact.resourceId.length === 0) {
          reasons.push(`missing-resource:${artifact.id}`);
          continue;
        }
        const resource = resourcesById.get(artifact.resourceId);
        if (!resource) {
          reasons.push(`missing-resource:${artifact.resourceId}`);
          continue;
        }
        affectedResourceIds.add(resource.id);
        reachableCapabilityIds.add(capability.id);
      }

      for (const evaluationRef of array(decision.evaluationRefs)) {
        const evaluation = evaluations.get(evaluationRef);
        if (!evaluation) {
          reasons.push(`missing-evaluation:${evaluationRef}`);
          continue;
        }
        evaluationRefs.push(evaluation.id);
      }
    }
  }

  for (const capabilityId of stableStrings(capabilityIds)) {
    const capability = capabilitiesById.get(capabilityId);
    if (!reachableCapabilityIds.has(capabilityId)) continue;
    const refs = stableStrings(array(capability?.consumerRefs).map(referenceId));
    if (portfolioActionable && refs.length === 0) reasons.push(`missing-consumer:${capabilityId}`);
    for (const ref of refs) actionableConsumers.add(ref);
  }
  consumerRefs.push(...actionableConsumers);

  const outputById = new Map(compilerOutputs(compilerInventory)
    .map((output) => [outputId(output), output])
    .filter(([id]) => id));
  for (const [id, output] of outputById) {
    const outputConsumers = stableStrings(array(output?.consumerRefs ?? output?.consumers).map(referenceId));
    if (!outputConsumers.some((consumer) => actionableConsumers.has(consumer))) continue;
    compiledOutputs.push(id);
    mirrorOutputs.push(...array(output?.mirrorOutputs ?? output?.mirrors).map(outputId));
  }

  for (const resourceId of affectedResourceIds) {
    const resource = resourcesById.get(resourceId);
    if (blocksOnSourceChange(resource) && isSelectedSupported(resource)) blockingResourceIds.push(resource.id);
  }

  const sortedBlockingResourceIds = stableStrings(blockingResourceIds);
  return {
    sourceId,
    staleInputIds,
    synthesisDecisionIds: stableStrings(synthesisDecisionIds),
    capabilityIds: stableStrings(capabilityIds),
    artifactRefs: stableStrings(artifactRefs),
    consumerRefs: stableStrings(consumerRefs),
    compiledOutputs: stableStrings(compiledOutputs),
    mirrorOutputs: stableStrings(mirrorOutputs),
    evaluationRefs: stableStrings(evaluationRefs),
    portfolioActionable,
    releaseBlocking: sortedBlockingResourceIds.length > 0,
    blockingResourceIds: sortedBlockingResourceIds,
    reasons: stableStrings(reasons)
  };
}
