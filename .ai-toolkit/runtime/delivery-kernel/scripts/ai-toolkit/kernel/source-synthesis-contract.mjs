import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertRegularFileWithin } from "../../../install/safe-filesystem.mjs";

export const SOURCE_CAPABILITY_REGISTRY_SCHEMA_VERSION = "1.0.0";
export const SOURCE_ASSESSMENT_STATES = Object.freeze([
  "pending-review",
  "assessed-current",
  "stale",
  "blocked",
  "retired"
]);
export const DECISION_OUTCOMES = Object.freeze([
  "adopted",
  "adapted",
  "delegated",
  "reference-only",
  "rejected",
  "superseded"
]);

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40}$/;
const SAFE_ID = /^[a-z0-9](?:[a-z0-9._:@-]{0,126}[a-z0-9])?$/;
const ASSESSMENT_STATES = new Set(SOURCE_ASSESSMENT_STATES);
const DECISION_OUTCOME_SET = new Set(DECISION_OUTCOMES);
const OWNER_KINDS = new Set(["method", "tool", "skill", "agent", "domain-gate", "policy"]);
const ARTIFACT_KINDS = new Set([...OWNER_KINDS, "documentation", "eval"]);
const SYNTHESIS_STATES = new Set(["draft", "approved", "superseded"]);
const SYNTHESIS_STRATEGIES = new Set([
  "authoritative-baseline",
  "best-of-breed",
  "delegated-tool",
  "reference-only",
  "retired-redundant"
]);
const INPUT_ROLES = new Set(["primary", "supporting", "constraint", "counterexample"]);
const CONTRIBUTION_KINDS = new Set([
  "idea",
  "mindset",
  "workflow",
  "skill-pattern",
  "executable-tool",
  "test",
  "standard",
  "counterexample"
]);
const EVIDENCE_KINDS = new Set([
  "static-eval",
  "deterministic-runtime",
  "observed-model-run",
  "owner-reviewed-pilot"
]);
const LOCATOR_KINDS = new Set(["repository-path-section", "document-section", "code-symbol", "url-fragment"]);
const ACTIVE_DECISION_OUTCOMES = new Set(["adopted", "adapted", "delegated"]);
const NON_EXTERNAL_METHOD_SOURCE_REFS = new Set(["toolkit-authored", "unknown-review-required"]);
const ACTIVE_SOURCE_BEHAVIORS = new Set([
  "versioned-standard",
  "living-official-guidance",
  "security-runtime-source",
  "active-tool-or-skill",
  "general-method-reference"
]);

function fail(message) {
  throw new Error(`Source synthesis: ${message}`);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value, field) {
  if (!isRecord(value)) fail(`${field} must be an object`);
  return value;
}

function rejectUnknownFields(value, allowed, field) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) fail(`unexpected ${field} field: ${key}`);
  }
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) fail(`${field} must be a non-empty string`);
  return value;
}

function requireId(value, field) {
  requireString(value, field);
  if (!SAFE_ID.test(value)) fail(`${field} must be a stable lowercase identifier`);
  return value;
}

function requireDigest(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) fail(`${field} must be a sha256 digest`);
  return value;
}

function requireRevision(value, field, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  const revision = requireRecord(value, field);
  rejectUnknownFields(revision, new Set(["kind", "value"]), field);
  if (revision.kind !== "git-sha" && revision.kind !== "content-digest") {
    fail(`${field}.kind must be git-sha or content-digest`);
  }
  if (revision.kind === "git-sha" && (typeof revision.value !== "string" || !GIT_SHA.test(revision.value))) {
    fail(`${field}.value must be an exact 40-character Git SHA`);
  }
  if (revision.kind === "content-digest") requireDigest(revision.value, `${field}.value`);
  return revision;
}

function sameRevision(left, right) {
  return Boolean(left && right && left.kind === right.kind && left.value === right.value);
}

function assertSafeRelativePath(value, field, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  requireString(value, field);
  if (
    value.includes("\\") || value.includes("\0") || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value || value === "." || value === ".."
    || value.startsWith("../") || value.split("/").some((segment) => segment.includes(":"))
  ) {
    fail(`${field} must be a safe repository-relative POSIX path`);
  }
  return value;
}

function requireArray(value, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${field} must be ${allowEmpty ? "an" : "a non-empty"} array`);
  }
  return value;
}

function requireStringArray(value, field, options = {}) {
  const values = requireArray(value, field, options);
  for (const [index, entry] of values.entries()) requireString(entry, `${field}[${index}]`);
  if (new Set(values).size !== values.length) fail(`${field} must not contain duplicates`);
  return values;
}

function requireSortedUnique(entries, field, idOf) {
  let previous = null;
  const ids = new Set();
  for (const [index, entry] of entries.entries()) {
    const id = idOf(entry, index);
    if (ids.has(id)) fail(`duplicate ${field} id: ${id}`);
    if (previous !== null && previous.localeCompare(id) > 0) fail(`${field} must be sorted by ${field === "sourceAssessment" ? "sourceId" : "id"}`);
    ids.add(id);
    previous = id;
  }
  return ids;
}

function normalizeRegistryEntries(value) {
  if (value instanceof Map) return value;
  if (Array.isArray(value)) return new Map(value.map((entry) => [entry.id, entry]));
  if (isRecord(value) && Array.isArray(value.entries)) return new Map(value.entries.map((entry) => [entry.id, entry]));
  return new Map();
}

function contextCollections(context = {}) {
  const catalog = context.catalog ?? context.sourceCatalog;
  const sources = Array.isArray(catalog?.sources) ? catalog.sources : [];
  return {
    catalog,
    sources: new Map(sources.map((entry) => [entry.id, entry])),
    methods: normalizeRegistryEntries(context.methods),
    tools: normalizeRegistryEntries(context.tools),
    skills: normalizeRegistryEntries(context.skills),
    agents: normalizeRegistryEntries(context.agents),
    domainPacks: normalizeRegistryEntries(context.domainPacks),
    policies: normalizeRegistryEntries(context.policies),
    evals: normalizeRegistryEntries(context.evals)
  };
}

function isHistoricalSource(source) {
  return source?.scope === "historical" || source?.sourceBehavior === "historical";
}

function isActiveCatalogSource(source) {
  return Boolean(source) && !isHistoricalSource(source) && ACTIVE_SOURCE_BEHAVIORS.has(source.sourceBehavior);
}

function resourceFor(kind, id, collections) {
  const map = {
    method: collections.methods,
    tool: collections.tools,
    skill: collections.skills,
    agent: collections.agents,
    "domain-gate": collections.domainPacks,
    policy: collections.policies,
    eval: collections.evals,
    documentation: new Map()
  }[kind];
  if (!map) fail(`unsupported resource kind: ${kind}`);
  return map.get(id) ?? null;
}

function validateReference(value, field, collections, allowedKinds = OWNER_KINDS) {
  const reference = requireRecord(value, field);
  rejectUnknownFields(reference, new Set(["kind", "id", "path"]), field);
  if (!allowedKinds.has(reference.kind)) fail(`${field}.kind is unsupported`);
  requireId(reference.id, `${field}.id`);
  assertSafeRelativePath(reference.path, `${field}.path`);
  const resource = resourceFor(reference.kind, reference.id, collections);
  if (resource && resource.path && resource.path !== reference.path) {
    fail(`${field}.path does not match canonical ${reference.kind} resource`);
  }
  if (!resource && reference.kind !== "documentation" && collections.catalog) {
    fail(`${field}.id does not resolve to a canonical ${reference.kind}`);
  }
  return reference;
}

function validateAssessment(entry, index, collections) {
  const assessment = requireRecord(entry, `sourceAssessments[${index}]`);
  requireId(assessment.sourceId, `sourceAssessments[${index}].sourceId`);
  if (!ASSESSMENT_STATES.has(assessment.state)) fail(`sourceAssessments[${index}].state is unsupported`);
  const source = collections.sources.get(assessment.sourceId);
  if (collections.catalog && !source) fail(`sourceAssessment sourceId does not resolve: ${assessment.sourceId}`);

  if (assessment.state === "pending-review") {
    rejectUnknownFields(assessment, new Set(["sourceId", "state", "evidenceGaps", "plannedNicheIds", "nextReviewTriggers"]), `sourceAssessments[${index}]`);
    requireStringArray(assessment.evidenceGaps, `sourceAssessments[${index}].evidenceGaps`, { allowEmpty: false });
    requireStringArray(assessment.plannedNicheIds, `sourceAssessments[${index}].plannedNicheIds`);
    requireStringArray(assessment.nextReviewTriggers, `sourceAssessments[${index}].nextReviewTriggers`, { allowEmpty: false });
    return assessment;
  }

  const fields = new Set([
    "sourceId", "state", "assessmentRevision", "contentDigest", "receiptPath", "receiptDigest",
    "valueStatement", "nicheIds", "contributionRefs", "overlapSourceIds", "rejectedSummary",
    "nextReviewTriggers", "staleReason", "blockedReason"
  ]);
  rejectUnknownFields(assessment, fields, `sourceAssessments[${index}]`);
  const revision = requireRevision(assessment.assessmentRevision, `sourceAssessments[${index}].assessmentRevision`);
  requireDigest(assessment.contentDigest, `sourceAssessments[${index}].contentDigest`);
  assertSafeRelativePath(assessment.receiptPath, `sourceAssessments[${index}].receiptPath`);
  requireDigest(assessment.receiptDigest, `sourceAssessments[${index}].receiptDigest`);
  requireString(assessment.valueStatement, `sourceAssessments[${index}].valueStatement`);
  requireStringArray(assessment.nicheIds, `sourceAssessments[${index}].nicheIds`);
  requireStringArray(assessment.contributionRefs, `sourceAssessments[${index}].contributionRefs`);
  requireStringArray(assessment.overlapSourceIds, `sourceAssessments[${index}].overlapSourceIds`);
  requireString(assessment.rejectedSummary, `sourceAssessments[${index}].rejectedSummary`);
  requireStringArray(assessment.nextReviewTriggers, `sourceAssessments[${index}].nextReviewTriggers`, { allowEmpty: false });
  if (assessment.state === "stale" && typeof assessment.staleReason !== "string") {
    fail(`sourceAssessments[${index}].staleReason is required for stale assessments`);
  }
  if (assessment.state === "blocked" && typeof assessment.blockedReason !== "string") {
    fail(`sourceAssessments[${index}].blockedReason is required for blocked assessments`);
  }
  if (assessment.state !== "stale" && assessment.staleReason !== undefined) fail(`sourceAssessments[${index}].staleReason is only allowed for stale assessments`);
  if (assessment.state !== "blocked" && assessment.blockedReason !== undefined) fail(`sourceAssessments[${index}].blockedReason is only allowed for blocked assessments`);
  if (assessment.state === "assessed-current" && source) {
    if (source.review?.state !== "REVIEWED_CURRENT") fail(`assessed-current source requires reviewed-current catalog evidence: ${assessment.sourceId}`);
    if (!sameRevision(revision, source.review?.reviewedRevision) || !sameRevision(revision, source.monitor?.observedRevision)) {
      fail(`assessmentRevision does not match current catalog source evidence: ${assessment.sourceId}`);
    }
    if (assessment.contentDigest !== source.review?.reviewedDigest || assessment.contentDigest !== source.monitor?.contentDigest) {
      fail(`assessment contentDigest does not match current catalog source evidence: ${assessment.sourceId}`);
    }
    if (assessment.receiptPath !== source.review?.currentReceipt || assessment.receiptDigest !== source.review?.receiptDigest) {
      fail(`assessment receipt does not match current catalog source evidence: ${assessment.sourceId}`);
    }
  }
  if (assessment.state === "retired" && source && isActiveCatalogSource(source)) {
    fail(`active catalog source cannot have a retired assessment: ${assessment.sourceId}`);
  }
  return assessment;
}

function validateInput(entry, field, assessments, collections) {
  const input = requireRecord(entry, field);
  rejectUnknownFields(input, new Set(["id", "sourceId", "role", "receiptPath", "receiptDigest", "reviewedRevision", "contentDigest", "locators"]), field);
  requireId(input.id, `${field}.id`);
  requireId(input.sourceId, `${field}.sourceId`);
  if (!INPUT_ROLES.has(input.role)) fail(`${field}.role is unsupported`);
  assertSafeRelativePath(input.receiptPath, `${field}.receiptPath`);
  requireDigest(input.receiptDigest, `${field}.receiptDigest`);
  const revision = requireRevision(input.reviewedRevision, `${field}.reviewedRevision`);
  requireDigest(input.contentDigest, `${field}.contentDigest`);
  const locators = requireArray(input.locators, `${field}.locators`, { allowEmpty: false });
  for (const [index, locator] of locators.entries()) {
    const location = requireRecord(locator, `${field}.locators[${index}]`);
    rejectUnknownFields(location, new Set(["kind", "value"]), `${field}.locators[${index}]`);
    if (!LOCATOR_KINDS.has(location.kind)) fail(`${field}.locators[${index}].kind is unsupported`);
    requireString(location.value, `${field}.locators[${index}].value`);
    if (/[\r\n\0]|:\/\//.test(location.value) || /(?:token|password|cookie|authorization)=/i.test(location.value)) {
      fail(`${field}.locators[${index}].value must be stable and credential-free`);
    }
  }
  const source = collections.sources.get(input.sourceId);
  if (collections.catalog && !source) fail(`${field}.sourceId does not resolve to catalog source`);
  const assessment = assessments.get(input.sourceId);
  if (!assessment) fail(`${field}.sourceId requires a source assessment`);
  if (assessment.state === "pending-review") fail(`pending assessment cannot support an approved synthesis: ${input.sourceId}`);
  if (assessment.state === "stale") fail(`stale assessment cannot support an approved synthesis: ${input.sourceId}`);
  if (assessment.state === "blocked") fail(`blocked assessment cannot support an approved synthesis: ${input.sourceId}`);
  if (assessment.state === "retired" || isHistoricalSource(source)) fail(`historical source cannot support an approved synthesis: ${input.sourceId}`);
  if (assessment.state === "assessed-current") {
    if (!sameRevision(revision, assessment.assessmentRevision)) fail(`${field}.reviewedRevision does not match its assessed current source evidence`);
    if (input.contentDigest !== assessment.contentDigest) fail(`${field}.contentDigest does not match its assessed current source evidence`);
    if (input.receiptPath !== assessment.receiptPath) fail(`${field}.receiptPath does not match its assessed current source evidence`);
    if (input.receiptDigest !== assessment.receiptDigest) fail(`${field}.receiptDigest does not match its assessed current source evidence`);
  }
  return input;
}

function validateArtifact(entry, field, decisionIds, collections) {
  const artifact = requireRecord(entry, field);
  rejectUnknownFields(artifact, new Set(["id", "kind", "resourceId", "path", "contentDigest", "decisionRefs"]), field);
  requireString(artifact.id, `${field}.id`);
  if (!ARTIFACT_KINDS.has(artifact.kind)) fail(`${field}.kind is unsupported`);
  requireId(artifact.resourceId, `${field}.resourceId`);
  if (artifact.id !== `${artifact.kind}:${artifact.resourceId}`) fail(`${field}.id must bind kind and resourceId`);
  assertSafeRelativePath(artifact.path, `${field}.path`);
  requireDigest(artifact.contentDigest, `${field}.contentDigest`);
  const refs = requireStringArray(artifact.decisionRefs, `${field}.decisionRefs`, { allowEmpty: false });
  for (const ref of refs) if (!decisionIds.has(ref)) fail(`${field}.decisionRefs contains unknown decision: ${ref}`);
  const resource = resourceFor(artifact.kind, artifact.resourceId, collections);
  if (resource && resource.path && resource.path !== artifact.path) fail(`${field}.path does not match canonical resource`);
  if (!resource && artifact.kind !== "documentation" && collections.catalog) fail(`${field}.resourceId does not resolve to a canonical resource`);
  return artifact;
}

function validateEvaluation(entry, field, decisionIds, collections) {
  const evaluation = requireRecord(entry, field);
  rejectUnknownFields(evaluation, new Set(["id", "path", "caseIds", "evidenceKind", "contentDigest", "decisionRefs"]), field);
  requireString(evaluation.id, `${field}.id`);
  if (!evaluation.id.startsWith("eval:")) fail(`${field}.id must start with eval:`);
  assertSafeRelativePath(evaluation.path, `${field}.path`);
  requireStringArray(evaluation.caseIds, `${field}.caseIds`, { allowEmpty: false });
  if (!EVIDENCE_KINDS.has(evaluation.evidenceKind)) fail(`${field}.evidenceKind is unsupported`);
  requireDigest(evaluation.contentDigest, `${field}.contentDigest`);
  const refs = requireStringArray(evaluation.decisionRefs, `${field}.decisionRefs`, { allowEmpty: false });
  for (const ref of refs) if (!decisionIds.has(ref)) fail(`${field}.decisionRefs contains unknown decision: ${ref}`);
  const canonicalId = evaluation.id.slice("eval:".length);
  const canonical = collections.evals.get(canonicalId);
  if (!canonical && collections.catalog) fail(`${field}.id does not resolve to a canonical eval`);
  if (canonical) {
    if (canonical.path && canonical.path !== evaluation.path) fail(`${field}.path does not match canonical eval`);
    if (!Array.isArray(canonical.caseIds)) fail(`canonical eval must declare exact case IDs: ${canonicalId}`);
    for (const caseId of evaluation.caseIds) {
      if (!canonical.caseIds.includes(caseId)) fail(`${field}.case ID does not resolve to canonical eval: ${caseId}`);
    }
  }
  return evaluation;
}

function validateDecision(entry, field, inputIds, artifactIds, evaluationIds) {
  const decision = requireRecord(entry, field);
  rejectUnknownFields(decision, new Set([
    "id", "outcome", "inputRefs", "contributionKinds", "summary", "adaptationMethod", "rationale",
    "artifactRefs", "evaluationRefs", "restrictions"
  ]), field);
  requireId(decision.id, `${field}.id`);
  if (!DECISION_OUTCOME_SET.has(decision.outcome)) fail(`${field}.outcome is unsupported`);
  const inputRefs = requireStringArray(decision.inputRefs, `${field}.inputRefs`, { allowEmpty: false });
  for (const inputRef of inputRefs) if (!inputIds.has(inputRef)) fail(`${field}.inputRefs contains unknown input: ${inputRef}`);
  const contributionKinds = requireStringArray(decision.contributionKinds, `${field}.contributionKinds`, { allowEmpty: false });
  for (const kind of contributionKinds) if (!CONTRIBUTION_KINDS.has(kind)) fail(`${field}.contributionKinds contains unsupported kind: ${kind}`);
  requireString(decision.summary, `${field}.summary`);
  requireString(decision.rationale, `${field}.rationale`);
  requireStringArray(decision.restrictions, `${field}.restrictions`, { allowEmpty: false });
  if (decision.outcome === "adapted") requireString(decision.adaptationMethod, `${field}.adaptationMethod`);
  if (decision.outcome !== "adapted" && decision.adaptationMethod !== null && decision.adaptationMethod !== undefined) {
    fail(`${field}.adaptationMethod is only allowed for adapted decisions`);
  }
  const artifactRefs = requireStringArray(decision.artifactRefs, `${field}.artifactRefs`);
  const evaluationRefs = requireStringArray(decision.evaluationRefs, `${field}.evaluationRefs`);
  for (const ref of artifactRefs) if (!artifactIds.has(ref)) fail(`${field}.artifactRefs contains unknown artifact: ${ref}`);
  for (const ref of evaluationRefs) if (!evaluationIds.has(ref)) fail(`${field}.evaluationRefs contains unknown evaluation: ${ref}`);
  if (ACTIVE_DECISION_OUTCOMES.has(decision.outcome) && (artifactRefs.length === 0 || evaluationRefs.length === 0)) {
    fail(`${field} requires artifact and evaluation references for ${decision.outcome}`);
  }
  if (["reference-only", "rejected", "superseded"].includes(decision.outcome) && artifactRefs.length > 0) {
    fail(`${field} cannot claim active artifacts for ${decision.outcome}`);
  }
  return decision;
}

function assertNoSynthesisCycles(syntheses) {
  const graph = new Map(syntheses.map((entry) => [entry.id, entry.updatePolicy?.dependsOnSynthesisIds ?? []]));
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) fail(`synthesis dependency cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) {
      if (!graph.has(dependency)) fail(`synthesis dependency does not resolve: ${dependency}`);
      visit(dependency);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of graph.keys()) visit(id);
}

export function validateSourceCapabilityRegistry(registry, context = {}) {
  const parsed = requireRecord(registry, "registry");
  rejectUnknownFields(parsed, new Set(["schemaVersion", "registryType", "sourceCatalog", "sourceAssessments", "capabilities", "syntheses"]), "registry");
  if (parsed.schemaVersion !== SOURCE_CAPABILITY_REGISTRY_SCHEMA_VERSION) fail(`registry.schemaVersion must be ${SOURCE_CAPABILITY_REGISTRY_SCHEMA_VERSION}`);
  if (parsed.registryType !== "source-capabilities") fail("registry.registryType must be source-capabilities");
  if (parsed.sourceCatalog !== "sources/source-watchlist.json") fail("registry.sourceCatalog must be sources/source-watchlist.json");
  const collections = contextCollections(context);
  if (collections.catalog === undefined) fail("context.catalog is required");

  const assessments = requireArray(parsed.sourceAssessments, "registry.sourceAssessments");
  requireSortedUnique(assessments, "sourceAssessment", (entry, index) => {
    requireRecord(entry, `sourceAssessments[${index}]`);
    return requireId(entry.sourceId, `sourceAssessments[${index}].sourceId`);
  });
  const assessmentBySource = new Map();
  for (const [index, entry] of assessments.entries()) assessmentBySource.set(entry.sourceId, validateAssessment(entry, index, collections));
  for (const source of collections.sources.values()) {
    if (isActiveCatalogSource(source) && !assessmentBySource.has(source.id)) fail(`active catalog source requires exactly one assessment: ${source.id}`);
  }

  const capabilities = requireArray(parsed.capabilities, "registry.capabilities");
  requireSortedUnique(capabilities, "capability", (entry, index) => {
    requireRecord(entry, `capabilities[${index}]`);
    return requireId(entry.id, `capabilities[${index}].id`);
  });
  const capabilityById = new Map();
  const owners = new Map();
  for (const [index, entry] of capabilities.entries()) {
    const field = `capabilities[${index}]`;
    const capability = requireRecord(entry, field);
    rejectUnknownFields(capability, new Set(["id", "displayName", "niche", "purpose", "lifecycle", "ownerRef", "activeSynthesisId", "consumerRefs"]), field);
    requireId(capability.id, `${field}.id`);
    requireString(capability.displayName, `${field}.displayName`);
    requireString(capability.niche, `${field}.niche`);
    requireString(capability.purpose, `${field}.purpose`);
    if (!["active", "retired"].includes(capability.lifecycle)) fail(`${field}.lifecycle is unsupported`);
    const owner = validateReference(capability.ownerRef, `${field}.ownerRef`, collections);
    requireString(capability.activeSynthesisId, `${field}.activeSynthesisId`);
    const consumers = requireArray(capability.consumerRefs, `${field}.consumerRefs`);
    for (const [consumerIndex, consumer] of consumers.entries()) validateReference(consumer, `${field}.consumerRefs[${consumerIndex}]`, collections);
    if (capability.lifecycle === "active") {
      const ownerKey = `${owner.kind}:${owner.id}`;
      if (owners.has(ownerKey)) fail(`active owner ${ownerKey} is assigned to multiple capabilities`);
      owners.set(ownerKey, capability.id);
    }
    capabilityById.set(capability.id, capability);
  }

  const syntheses = requireArray(parsed.syntheses, "registry.syntheses");
  requireSortedUnique(syntheses, "synthesis", (entry, index) => {
    requireRecord(entry, `syntheses[${index}]`);
    return requireId(entry.id, `syntheses[${index}].id`);
  });
  const approvedByCapability = new Map();
  for (const [index, synthesis] of syntheses.entries()) {
    const field = `syntheses[${index}]`;
    const entry = requireRecord(synthesis, field);
    rejectUnknownFields(entry, new Set(["id", "capabilityId", "version", "state", "strategy", "inputs", "decisions", "artifactRefs", "evaluationRefs", "updatePolicy"]), field);
    requireId(entry.id, `${field}.id`);
    requireId(entry.capabilityId, `${field}.capabilityId`);
    if (!capabilityById.has(entry.capabilityId)) fail(`${field}.capabilityId does not resolve`);
    if (!Number.isInteger(entry.version) || entry.version < 1 || entry.id !== `${entry.capabilityId}@${entry.version}`) fail(`${field}.id must bind capabilityId and version`);
    if (!SYNTHESIS_STATES.has(entry.state)) fail(`${field}.state is unsupported`);
    if (!SYNTHESIS_STRATEGIES.has(entry.strategy)) fail(`${field}.strategy is unsupported`);
    const updatePolicy = requireRecord(entry.updatePolicy, `${field}.updatePolicy`);
    rejectUnknownFields(updatePolicy, new Set(["onSourceChange", "dependsOnSynthesisIds"]), `${field}.updatePolicy`);
    if (updatePolicy.onSourceChange !== undefined) requireString(updatePolicy.onSourceChange, `${field}.updatePolicy.onSourceChange`);
    if (updatePolicy.dependsOnSynthesisIds !== undefined) requireStringArray(updatePolicy.dependsOnSynthesisIds, `${field}.updatePolicy.dependsOnSynthesisIds`);
    const inputs = requireArray(entry.inputs, `${field}.inputs`, { allowEmpty: entry.state !== "approved" });
    requireSortedUnique(inputs, "input", (input, inputIndex) => requireId(input?.id, `${field}.inputs[${inputIndex}].id`));
    const inputById = new Map();
    for (const [inputIndex, input] of inputs.entries()) inputById.set(input.id, validateInput(input, `${field}.inputs[${inputIndex}]`, assessmentBySource, collections));
    const decisions = requireArray(entry.decisions, `${field}.decisions`, { allowEmpty: entry.state !== "approved" });
    requireSortedUnique(decisions, "decision", (decision, decisionIndex) => requireId(decision?.id, `${field}.decisions[${decisionIndex}].id`));
    const decisionIds = new Set(decisions.map((decision) => decision.id));
    const artifacts = requireArray(entry.artifactRefs, `${field}.artifactRefs`);
    requireSortedUnique(artifacts, "artifact", (artifact, artifactIndex) => requireString(artifact?.id, `${field}.artifactRefs[${artifactIndex}].id`));
    const artifactIds = new Set(artifacts.map((artifact) => artifact.id));
    const evaluations = requireArray(entry.evaluationRefs, `${field}.evaluationRefs`);
    requireSortedUnique(evaluations, "evaluation", (evaluation, evaluationIndex) => requireString(evaluation?.id, `${field}.evaluationRefs[${evaluationIndex}].id`));
    const evaluationIds = new Set(evaluations.map((evaluation) => evaluation.id));
    const artifactById = new Map();
    for (const [artifactIndex, artifact] of artifacts.entries()) artifactById.set(artifact.id, validateArtifact(artifact, `${field}.artifactRefs[${artifactIndex}]`, decisionIds, collections));
    const evaluationById = new Map();
    for (const [evaluationIndex, evaluation] of evaluations.entries()) evaluationById.set(evaluation.id, validateEvaluation(evaluation, `${field}.evaluationRefs[${evaluationIndex}]`, decisionIds, collections));
    const decisionById = new Map();
    for (const [decisionIndex, decision] of decisions.entries()) {
      const validated = validateDecision(decision, `${field}.decisions[${decisionIndex}]`, new Set(inputById.keys()), artifactIds, evaluationIds);
      decisionById.set(validated.id, validated);
      for (const artifactId of validated.artifactRefs) if (!artifactById.get(artifactId).decisionRefs.includes(validated.id)) fail(`${field}.artifactRefs ${artifactId} must reference decision ${validated.id}`);
      for (const evaluationId of validated.evaluationRefs) if (!evaluationById.get(evaluationId).decisionRefs.includes(validated.id)) fail(`${field}.evaluationRefs ${evaluationId} must reference decision ${validated.id}`);
    }
    for (const artifact of artifactById.values()) {
      for (const decisionId of artifact.decisionRefs) {
        const linkedDecision = decisionById.get(decisionId);
        if (!linkedDecision.artifactRefs.includes(artifact.id)) {
          fail(`${field}.artifactRefs ${artifact.id} cannot claim an unreciprocated decision artifact link`);
        }
        if (["reference-only", "rejected", "superseded"].includes(linkedDecision.outcome)) {
          fail(`${field}.artifactRefs ${artifact.id} cannot claim active artifacts for ${linkedDecision.outcome}`);
        }
      }
    }
    if (entry.state === "approved") {
      if (entry.strategy === "retired-redundant") fail(`${field}.state approved is incompatible with retired-redundant strategy`);
      const prior = approvedByCapability.get(entry.capabilityId);
      if (prior) fail(`one approved active synthesis is allowed per capability: ${entry.capabilityId}`);
      approvedByCapability.set(entry.capabilityId, entry.id);
    }
  }
  assertNoSynthesisCycles(syntheses);
  for (const capability of capabilityById.values()) {
    if (capability.lifecycle === "active") {
      if (approvedByCapability.get(capability.id) !== capability.activeSynthesisId) {
        fail(`active capability ${capability.id} must reference its one approved active synthesis`);
      }
    }
  }
  return parsed;
}

export function deriveSourceCapabilityWarnings(registry, context = {}) {
  const parsed = validateSourceCapabilityRegistry(registry, context);
  return parsed.sourceAssessments
    .filter((assessment) => ["pending-review", "stale", "blocked"].includes(assessment.state))
    .map((assessment) => ({
      code: `${assessment.state.replace(/-review$/, "")}-source-assessment`,
      sourceId: assessment.sourceId
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId) || left.code.localeCompare(right.code));
}

function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

async function readVerifiedText(repositoryRoot, relativePath, label) {
  const candidate = path.resolve(repositoryRoot, ...relativePath.split("/"));
  const trustedPath = assertRegularFileWithin(repositoryRoot, candidate, label);
  const text = await readFile(trustedPath, "utf8");
  assertRegularFileWithin(repositoryRoot, trustedPath, `${label} recheck`);
  return { text, digest: sha256Text(text) };
}

export async function validateSourceCapabilityRepository({ repositoryRoot, catalog, registry, context = {} } = {}) {
  const root = path.resolve(requireString(repositoryRoot, "repositoryRoot"));
  const validated = validateSourceCapabilityRegistry(registry, { ...context, catalog });
  const inputsBySource = new Set(validated.syntheses
    .filter((synthesis) => synthesis.state === "approved")
    .flatMap((synthesis) => synthesis.inputs.map((input) => input.sourceId)));
  const assessments = new Map(validated.sourceAssessments.map((assessment) => [assessment.sourceId, assessment]));
  const warnings = [];
  for (const [methodId, method] of normalizeRegistryEntries(context.methods)) {
    const sourceRefs = Array.isArray(method.sourceRef) ? method.sourceRef : [];
    for (const sourceId of sourceRefs) {
      if (NON_EXTERNAL_METHOD_SOURCE_REFS.has(sourceId)) continue;
      if (!catalog?.sources?.some((source) => source.id === sourceId)) {
        fail(`unknown method sourceRef ${sourceId}: ${methodId}`);
      }
      if (inputsBySource.has(sourceId)) continue;
      const assessment = assessments.get(sourceId);
      if (assessment?.state === "pending-review") {
        warnings.push({ code: "pending-method-source-assessment", methodId, sourceId });
      } else {
        fail(`method sourceRef ${sourceId} does not resolve to an approved synthesis input or pending assessment: ${methodId}`);
      }
    }
  }
  const evidence = new Map();
  for (const synthesis of validated.syntheses) {
    for (const input of synthesis.inputs) {
      const observed = await readVerifiedText(root, input.receiptPath, `synthesis receipt ${input.id}`);
      if (observed.digest !== input.receiptDigest) fail(`receipt digest mismatch at ${input.receiptPath}`);
      evidence.set(input.receiptPath, observed.digest);
    }
    for (const artifact of synthesis.artifactRefs) {
      const observed = await readVerifiedText(root, artifact.path, `synthesis artifact ${artifact.id}`);
      if (observed.digest !== artifact.contentDigest) fail(`artifact content digest mismatch at ${artifact.path}`);
      evidence.set(artifact.path, observed.digest);
    }
    for (const evaluation of synthesis.evaluationRefs) {
      const observed = await readVerifiedText(root, evaluation.path, `synthesis evaluation ${evaluation.id}`);
      if (observed.digest !== evaluation.contentDigest) fail(`evaluation content digest mismatch at ${evaluation.path}`);
      let parsed;
      try {
        parsed = JSON.parse(observed.text);
      } catch {
        fail(`evaluation reference must be JSON: ${evaluation.path}`);
      }
      const caseIds = new Set(Array.isArray(parsed.cases)
        ? parsed.cases.map((entry) => entry?.id).filter((id) => typeof id === "string")
        : []);
      for (const caseId of evaluation.caseIds) if (!caseIds.has(caseId)) fail(`evaluation case ID does not resolve: ${caseId}`);
      evidence.set(evaluation.path, observed.digest);
    }
  }
  for (const [relativePath, digest] of evidence) {
    const observed = await readVerifiedText(root, relativePath, `synthesis evidence recheck ${relativePath}`);
    if (observed.digest !== digest) fail(`repository evidence changed during validation: ${relativePath}`);
  }
  return { registry: validated, warnings };
}
