function array(value) {
  return Array.isArray(value) ? value : [];
}

const LOCATOR_KINDS = new Set(["repository-path-section", "document-section", "code-symbol", "url-fragment"]);
const LOCATOR_FIELDS = new Set(["kind", "value"]);
const UNSAFE_LOCATOR_VALUE = /[\r\n\0]|:\/\/|(?:token|password|cookie|authorization)=/iu;

function hasOwn(record, field) {
  return plainRecord(record) && Object.prototype.hasOwnProperty.call(record, field);
}

function plainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function stableStrings(values) {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))]
    .sort((left, right) => left.localeCompare(right));
}

function consumerReferenceId(reference) {
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

function edgeArray(record, field, reason, reasons, { required = false, nonEmpty = false } = {}) {
  if (!hasOwn(record, field)) {
    if (required) reasons.push(`missing-${reason}:${recordId(record) ?? "unknown"}`);
    return [];
  }
  if (!Array.isArray(record[field])) {
    reasons.push(`invalid-${reason}:${recordId(record) ?? "unknown"}`);
    return [];
  }
  if (nonEmpty && record[field].length === 0) {
    reasons.push(`empty-${reason}:${recordId(record) ?? "unknown"}`);
  }
  return record[field];
}

function hasTrustworthyExactLocators(input, reasons) {
  if (!hasOwn(input, "locators")) {
    reasons.push(`missing-locators:${input.id}`);
    return false;
  }
  if (!Array.isArray(input.locators)) {
    reasons.push(`invalid-locators:${input.id}`);
    return false;
  }
  if (input.locators.length === 0) {
    reasons.push(`empty-locators:${input.id}`);
    return false;
  }
  let trustworthy = true;
  for (const [index, locator] of input.locators.entries()) {
    if (
      !plainRecord(locator)
      || Object.keys(locator).some((field) => !LOCATOR_FIELDS.has(field))
      || !LOCATOR_KINDS.has(locator.kind)
      || typeof locator.value !== "string"
      || locator.value.trim() === ""
      || UNSAFE_LOCATOR_VALUE.test(locator.value)
    ) {
      reasons.push(`invalid-locator:${input.id}:${index}`);
      trustworthy = false;
    }
  }
  return trustworthy;
}

function hasTrustworthyChangedLocators(changedLocators, reasons) {
  if (!Array.isArray(changedLocators)) {
    reasons.push("invalid-changed-locators");
    return false;
  }
  let trustworthy = true;
  for (const [index, locator] of changedLocators.entries()) {
    if (
      typeof locator !== "string"
      || locator.trim() === ""
      || UNSAFE_LOCATOR_VALUE.test(locator)
    ) {
      reasons.push(`invalid-changed-locator:${index}`);
      trustworthy = false;
    }
  }
  return trustworthy;
}

function selectedInputs({ sourceId, changedLocators, comparisonState, registry, reasons }) {
  const capabilities = indexById(array(registry?.capabilities));
  const inputs = array(registry?.syntheses)
    .filter((synthesis) => activeSynthesis(synthesis, capabilities))
    .flatMap((synthesis) => edgeArray(synthesis, "inputs", "inputs", reasons)
      .filter((input) => input?.sourceId === sourceId && typeof input.id === "string")
      .map((input) => ({ synthesis, input })));
  const changed = new Set(Array.isArray(changedLocators) ? changedLocators : []);
  let exactTrustworthy = true;
  if (comparisonState === "exact") {
    if (!hasTrustworthyChangedLocators(changedLocators, reasons)) exactTrustworthy = false;
    for (const { input } of inputs) {
      if (!hasTrustworthyExactLocators(input, reasons)) exactTrustworthy = false;
    }
  }
  const stale = comparisonState === "exact"
    ? exactTrustworthy
      ? inputs.filter(({ input }) => input.locators.some((locator) => changed.has(locator.value)))
      : inputs
    : inputs;
  return { capabilities, stale };
}

function isActionableDecision(decision) {
  return ["adopted", "adapted", "delegated", "authoritative-baseline"].includes(decision?.outcome);
}

function isScopedContributionOutcome(outcome) {
  return [
    "reference-only",
    "delegated",
    "authoritative-baseline",
    "adopted",
    "adapted",
    "historical"
  ].includes(outcome);
}

function stableScopedImpacts(values) {
  return [...values].sort((left, right) => (
    left.sourceId.localeCompare(right.sourceId)
    || left.capabilityIds.join("\0").localeCompare(right.capabilityIds.join("\0"))
    || left.contributionOutcome.localeCompare(right.contributionOutcome)
    || left.affectedGateIds.join("\0").localeCompare(right.affectedGateIds.join("\0"))
    || left.affectedResourceIds.join("\0").localeCompare(right.affectedResourceIds.join("\0"))
  ));
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
  for (const [field, containerReason] of fields) {
    for (const reference of edgeArray(record, field, containerReason, reasons)) {
      const id = edgeId(reference);
      if (id) values.push(id);
      else reasons.push(invalidReason);
    }
  }
  return stableStrings(values);
}

function compilerConsumerRefs(output, reasons) {
  const field = hasOwn(output, "consumerRefs") ? "consumerRefs" : "consumers";
  const refs = [];
  for (const [index, reference] of edgeArray(output, field, "consumer-refs", reasons).entries()) {
    const consumer = consumerReferenceId(reference);
    if (consumer) refs.push(consumer);
    else reasons.push(`invalid-compiled-consumer-ref:${recordId(output) ?? "unknown"}:${index}`);
  }
  return stableStrings(refs);
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
  releasePolicy,
  hardSecurityBlocker = false
} = {}) {
  if (typeof hardSecurityBlocker !== "boolean") {
    throw new Error("capability impact hardSecurityBlocker must be boolean");
  }
  const reasons = [];
  const { capabilities, stale } = selectedInputs({ sourceId, changedLocators, comparisonState, registry, reasons });
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
  const scopedImpacts = new Map();
  let portfolioActionable = false;

  for (const { synthesis, input } of stale) {
    const capability = resolve(capabilities, synthesis.capabilityId, "capability", reasons);
    if (!capability) continue;
    capabilityIds.push(capability.id);
    const artifactEntries = edgeArray(synthesis, "artifactRefs", "artifact-definitions", reasons);
    const evaluationEntries = edgeArray(synthesis, "evaluationRefs", "evaluation-definitions", reasons);
    for (const artifact of artifactEntries) edgeArray(artifact, "decisionRefs", "artifact-decision-refs", reasons);
    for (const evaluation of evaluationEntries) edgeArray(evaluation, "decisionRefs", "evaluation-decision-refs", reasons);
    const artifacts = indexById(artifactEntries);
    const evaluations = indexById(evaluationEntries);
    const decisions = edgeArray(synthesis, "decisions", "decisions", reasons)
      .filter((decision) => typeof decision?.id === "string" && edgeArray(decision, "inputRefs", "input-refs", reasons, { required: true }).includes(input.id));
    if (decisions.length === 0) {
      reasons.push(`stale-input-without-decision:${input.id}`);
      continue;
    }
    for (const decision of decisions) {
      synthesisDecisionIds.push(decision.id);
      const declaredActionable = isActionableDecision(decision);
      const decisionArtifacts = edgeArray(decision, "artifactRefs", "artifact-refs", reasons, {
        required: declaredActionable,
        nonEmpty: declaredActionable
      });
      const decisionEvaluations = edgeArray(decision, "evaluationRefs", "evaluation-refs", reasons, {
        required: declaredActionable,
        nonEmpty: declaredActionable
      });
      const actionable = declaredActionable
        && Array.isArray(decision.artifactRefs)
        && decision.artifactRefs.length > 0
        && Array.isArray(decision.evaluationRefs)
        && decision.evaluationRefs.length > 0;
      if (actionable) portfolioActionable = true;
      else if (!declaredActionable) reasons.push(`non-actionable-decision:${decision.outcome ?? "unknown"}:${decision.id}`);
      const scopedGateIds = new Set();
      const scopedResourceIds = new Set();
      for (const artifactId of decisionArtifacts) {
        const artifact = resolve(artifacts, artifactId, "artifact", reasons);
        if (!artifact) continue;
        artifactRefs.push(artifact.id);
        if (typeof artifact.resourceId === "string" && artifact.resourceId.length > 0) {
          if (artifact.kind === "domain-gate" || artifact.id.startsWith("domain-gate:")) {
            scopedGateIds.add(artifact.resourceId);
          } else {
            scopedResourceIds.add(artifact.resourceId);
          }
        }
        if (!actionable) continue;
        if (typeof artifact.resourceId !== "string" || artifact.resourceId.length === 0) {
          reasons.push(`missing-resource:${artifact.id}`);
          continue;
        }
        const resource = resolve(resources, artifact.resourceId, "resource", reasons);
        if (!resource) continue;
        affectedResourceIds.add(resource.id);
        reachableCapabilityIds.add(capability.id);
      }
      for (const evaluationId of decisionEvaluations) {
        const evaluation = resolve(evaluations, evaluationId, "evaluation", reasons);
        if (evaluation) evaluationRefs.push(evaluation.id);
      }
      if (isScopedContributionOutcome(decision.outcome)) {
        const scopedImpact = {
          sourceId,
          capabilityIds: [capability.id],
          contributionOutcome: decision.outcome,
          synthesisState: "stale",
          hardSecurityBlocker,
          affectedGateIds: stableStrings([...scopedGateIds]),
          affectedResourceIds: stableStrings([...scopedResourceIds]),
          portfolioActionable: actionable
        };
        const key = `${sourceId}\0${capability.id}\0${decision.id}`;
        const existing = scopedImpacts.get(key);
        if (existing) {
          existing.affectedGateIds = stableStrings([...existing.affectedGateIds, ...scopedImpact.affectedGateIds]);
          existing.affectedResourceIds = stableStrings([
            ...existing.affectedResourceIds,
            ...scopedImpact.affectedResourceIds
          ]);
          existing.portfolioActionable ||= scopedImpact.portfolioActionable;
        } else {
          scopedImpacts.set(key, scopedImpact);
        }
      }
    }
  }

  for (const capabilityId of stableStrings([...reachableCapabilityIds])) {
    const capability = capabilities.unique.get(capabilityId);
    const refs = [];
    for (const [index, reference] of edgeArray(capability, "consumerRefs", "consumer-refs", reasons).entries()) {
      const consumer = consumerReferenceId(reference);
      if (consumer) refs.push(consumer);
      else reasons.push(`invalid-consumer-ref:${capabilityId}:${index}`);
    }
    const stableRefs = stableStrings(refs);
    if (stableRefs.length === 0) reasons.push(`missing-consumer:${capabilityId}`);
    for (const ref of stableRefs) consumerRefs.add(ref);
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
    const matchesConsumer = candidates.some((output) => compilerConsumerRefs(output, reasons)
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
      for (const id of edges(output, [["compiledOutputRefs", "compiled-output-refs"], ["outputRefs", "compiled-output-refs"]], "invalid-compiled-output", reasons)) enqueueOutput(id);
      for (const id of edges(output, [["mirrorOutputRefs", "mirror-output-refs"], ["mirrorOutputs", "mirror-output-refs"], ["mirrors", "mirror-output-refs"]], "invalid-mirror-output", reasons)) enqueueMirror(id);
      continue;
    }
    if (visitedMirrors.has(node.id)) continue;
    visitedMirrors.add(node.id);
    const mirror = resolve(mirrors, node.id, "mirror-output", reasons);
    if (!mirror) continue;
    mirrorOutputs.add(mirror.id);
    for (const id of edges(mirror, [["compiledOutputRefs", "compiled-output-refs"], ["outputRefs", "compiled-output-refs"]], "invalid-compiled-output", reasons)) enqueueOutput(id);
    for (const id of edges(mirror, [["mirrorOutputRefs", "mirror-output-refs"], ["mirrorOutputs", "mirror-output-refs"], ["mirrors", "mirror-output-refs"]], "invalid-mirror-output", reasons)) enqueueMirror(id);
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
    scopedImpacts: stableScopedImpacts(scopedImpacts.values()),
    reasons: stableStrings(reasons)
  };
}
