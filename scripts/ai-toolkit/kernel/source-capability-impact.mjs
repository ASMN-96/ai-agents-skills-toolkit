function array(value) {
  return Array.isArray(value) ? value : [];
}

function plainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function stableStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function referenceId(reference) {
  if (typeof reference === "string") return reference;
  if (plainRecord(reference) && typeof reference.kind === "string" && typeof reference.id === "string") {
    return `${reference.kind}:${reference.id}`;
  }
  return null;
}

function recordId(record) {
  return plainRecord(record) && typeof record.id === "string" && record.id.length > 0 ? record.id : null;
}

function catalogResources(resourceCatalog) {
  return Array.isArray(resourceCatalog) ? resourceCatalog : array(resourceCatalog?.resources);
}

function compilerOutputs(compilerInventory) {
  if (Array.isArray(compilerInventory)) return compilerInventory;
  return array(compilerInventory?.compiledOutputs ?? compilerInventory?.outputs ?? compilerInventory?.compiledAgents);
}

function compilerMirrors(compilerInventory) {
  return array(compilerInventory?.mirrorOutputs ?? compilerInventory?.mirrors);
}

function indexById(records) {
  const entries = new Map();
  for (const record of records) {
    const id = recordId(record);
    if (!id) continue;
    const bucket = entries.get(id) ?? [];
    bucket.push(record);
    entries.set(id, bucket);
  }
  const unique = new Map();
  const duplicates = new Set();
  for (const [id, bucket] of entries) {
    if (bucket.length === 1) unique.set(id, bucket[0]);
    else duplicates.add(id);
  }
  return { entries, unique, duplicates };
}

function resolve(index, id, kind, reasons) {
  if (index.duplicates.has(id)) {
    reasons.push(`duplicate-${kind}:${id}`);
    return null;
  }
  const value = index.unique.get(id);
  if (!value) reasons.push(`missing-${kind}:${id}`);
  return value ?? null;
}

function activeSynthesis(synthesis, capabilities) {
  if (synthesis?.state !== "approved") return false;
  const capabilityId = synthesis.capabilityId;
  if (capabilities.duplicates.has(capabilityId) || !capabilities.unique.has(capabilityId)) return true;
  const capability = capabilities.unique.get(capabilityId);
  return capability.lifecycle === "active"
    && (!capability.activeSynthesisId || capability.activeSynthesisId === synthesis.id);
}

function selectedInputs({ sourceId, changedLocators, comparisonState, registry }) {
  const capabilities = indexById(array(registry?.capabilities));
  const inputs = array(registry?.syntheses)
    .filter((synthesis) => activeSynthesis(synthesis, capabilities))
    .flatMap((synthesis) => array(synthesis.inputs)
      .filter((input) => input?.sourceId === sourceId && typeof input.id === "string")
      .map((input) => ({ synthesis, input })));
  const changed = new Set(array(changedLocators).filter((locator) => typeof locator === "string"));
  const stale = comparisonState === "exact"
    ? inputs.filter(({ input }) => array(input.locators).some((locator) => changed.has(locator?.value)))
    : inputs;
  return { capabilities, stale };
}

function isActionableDecision(decision) {
  return ["adopted", "adapted", "delegated"].includes(decision?.outcome);
}

function validatePolicyIds(policy, field, resourceIndex, reasons) {
  const values = policy?.[field];
  if (!Array.isArray(values)) {
    reasons.push(`invalid-release-policy:${field}`);
    return { valid: false, ids: new Set() };
  }
  const seen = new Set();
  let valid = true;
  for (const id of values) {
    if (typeof id !== "string" || id.length === 0) {
      reasons.push(`invalid-${field}`);
      valid = false;
      continue;
    }
    if (seen.has(id)) {
      reasons.push(`duplicate-${policyIdLabel(field)}:${id}`);
      valid = false;
    }
    seen.add(id);
    if (!resourceIndex.unique.has(id) || resourceIndex.duplicates.has(id)) {
      reasons.push(`unknown-${policyIdLabel(field)}:${id}`);
      valid = false;
    }
  }
  return { valid, ids: seen };
}

function policyIdLabel(field) {
  return field
    .replace(/Ids$/u, "Id")
    .replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
}

function validateReleasePolicy(policy, resourceIndex, reasons) {
  if (!plainRecord(policy)) {
    reasons.push("invalid-release-policy");
    return { valid: false, selectedResourceIds: new Set(), blockingResourceIds: new Set() };
  }
  let valid = true;
  for (const field of Object.keys(policy)) {
    if (!new Set(["selectedResourceIds", "blockingResourceIds"]).has(field)) {
      reasons.push(`invalid-release-policy-field:${field}`);
      valid = false;
    }
  }
  const selected = validatePolicyIds(policy, "selectedResourceIds", resourceIndex, reasons);
  const blocking = validatePolicyIds(policy, "blockingResourceIds", resourceIndex, reasons);
  for (const id of blocking.ids) {
    if (!selected.ids.has(id)) {
      reasons.push(`blocking-resource-not-selected:${id}`);
      valid = false;
    }
  }
  return {
    valid: valid && selected.valid && blocking.valid,
    selectedResourceIds: selected.ids,
    blockingResourceIds: blocking.ids
  };
}

function edgeId(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function edges(record, fields, invalidReason, reasons) {
  const values = [];
  for (const field of fields) {
    if (record?.[field] === undefined) continue;
    for (const reference of array(record[field])) {
      const id = edgeId(reference);
      if (id) values.push(id);
      else reasons.push(invalidReason);
    }
  }
  return stableStrings(values);
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
  compilerInventory,
  releasePolicy
} = {}) {
  const reasons = [];
  const { capabilities, stale } = selectedInputs({ sourceId, changedLocators, comparisonState, registry });
  const resources = indexById(catalogResources(resourceCatalog));
  const policy = validateReleasePolicy(releasePolicy, resources, reasons);
  const staleInputIds = stableStrings(stale.map(({ input }) => input.id));
  const synthesisDecisionIds = [];
  const capabilityIds = [];
  const artifactRefs = [];
  const evaluationRefs = [];
  const consumerRefs = new Set();
  const affectedResourceIds = new Set();
  const reachableCapabilityIds = new Set();
  let portfolioActionable = false;

  for (const { synthesis, input } of stale) {
    const capability = resolve(capabilities, synthesis.capabilityId, "capability", reasons);
    if (!capability) continue;
    capabilityIds.push(capability.id);
    const artifacts = indexById(array(synthesis.artifactRefs));
    const evaluations = indexById(array(synthesis.evaluationRefs));
    const decisions = array(synthesis.decisions)
      .filter((decision) => typeof decision?.id === "string" && array(decision.inputRefs).includes(input.id));
    if (decisions.length === 0) {
      reasons.push(`stale-input-without-decision:${input.id}`);
      continue;
    }
    for (const decision of decisions) {
      synthesisDecisionIds.push(decision.id);
      if (isActionableDecision(decision)) portfolioActionable = true;
      for (const artifactId of array(decision.artifactRefs)) {
        const artifact = resolve(artifacts, artifactId, "artifact", reasons);
        if (!artifact) continue;
        artifactRefs.push(artifact.id);
        if (typeof artifact.resourceId !== "string" || artifact.resourceId.length === 0) {
          reasons.push(`missing-resource:${artifact.id}`);
          continue;
        }
        const resource = resolve(resources, artifact.resourceId, "resource", reasons);
        if (!resource) continue;
        affectedResourceIds.add(resource.id);
        reachableCapabilityIds.add(capability.id);
      }
      for (const evaluationId of array(decision.evaluationRefs)) {
        const evaluation = resolve(evaluations, evaluationId, "evaluation", reasons);
        if (evaluation) evaluationRefs.push(evaluation.id);
      }
    }
  }

  for (const capabilityId of stableStrings([...reachableCapabilityIds])) {
    const capability = capabilities.unique.get(capabilityId);
    const refs = stableStrings(array(capability?.consumerRefs).map(referenceId));
    if (refs.length === 0) reasons.push(`missing-consumer:${capabilityId}`);
    for (const ref of refs) consumerRefs.add(ref);
  }

  const outputs = indexById(compilerOutputs(compilerInventory));
  const mirrors = indexById(compilerMirrors(compilerInventory));
  const compiledOutputs = new Set();
  const mirrorOutputs = new Set();
  const visitedOutputs = new Set();
  const visitedMirrors = new Set();
  const queue = [];
  const enqueueOutput = (id) => queue.push({ type: "output", id });
  const enqueueMirror = (id) => queue.push({ type: "mirror", id });

  for (const [id, candidates] of outputs.entries) {
    const matchesConsumer = candidates.some((output) => stableStrings(array(output.consumerRefs ?? output.consumers).map(referenceId))
      .some((consumer) => consumerRefs.has(consumer)));
    if (matchesConsumer) enqueueOutput(id);
  }
  while (queue.length > 0) {
    const node = queue.shift();
    if (node.type === "output") {
      if (visitedOutputs.has(node.id)) continue;
      visitedOutputs.add(node.id);
      const output = resolve(outputs, node.id, "compiled-output", reasons);
      if (!output) continue;
      compiledOutputs.add(output.id);
      for (const id of edges(output, ["compiledOutputRefs", "outputRefs"], "invalid-compiled-output", reasons)) enqueueOutput(id);
      for (const id of edges(output, ["mirrorOutputRefs", "mirrorOutputs", "mirrors"], "invalid-mirror-output", reasons)) enqueueMirror(id);
      continue;
    }
    if (visitedMirrors.has(node.id)) continue;
    visitedMirrors.add(node.id);
    const mirror = resolve(mirrors, node.id, "mirror-output", reasons);
    if (!mirror) continue;
    mirrorOutputs.add(mirror.id);
    for (const id of edges(mirror, ["compiledOutputRefs", "outputRefs"], "invalid-compiled-output", reasons)) enqueueOutput(id);
    for (const id of edges(mirror, ["mirrorOutputRefs", "mirrorOutputs", "mirrors"], "invalid-mirror-output", reasons)) enqueueMirror(id);
  }

  const blockingResourceIds = [];
  if (policy.valid) {
    for (const resourceId of affectedResourceIds) {
      const resource = resources.unique.get(resourceId);
      if (
        resource?.runtimePosture?.supported === true
        && policy.selectedResourceIds.has(resourceId)
        && policy.blockingResourceIds.has(resourceId)
      ) blockingResourceIds.push(resourceId);
    }
  }
  const sortedBlockingResourceIds = stableStrings(blockingResourceIds);
  return {
    sourceId,
    staleInputIds,
    synthesisDecisionIds: stableStrings(synthesisDecisionIds),
    capabilityIds: stableStrings(capabilityIds),
    artifactRefs: stableStrings(artifactRefs),
    consumerRefs: stableStrings([...consumerRefs]),
    compiledOutputs: stableStrings([...compiledOutputs]),
    mirrorOutputs: stableStrings([...mirrorOutputs]),
    evaluationRefs: stableStrings(evaluationRefs),
    portfolioActionable,
    releaseBlocking: sortedBlockingResourceIds.length > 0,
    blockingResourceIds: sortedBlockingResourceIds,
    reasons: stableStrings(reasons)
  };
}
