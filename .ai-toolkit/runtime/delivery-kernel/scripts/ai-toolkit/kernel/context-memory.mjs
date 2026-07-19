import { createHash } from "node:crypto";

import {
  assertSafeTextContent,
  assertTrustedRepositoryContextItem
} from "./project-inspector.mjs";
import { canonicalDigest } from "./canonical-digest.mjs";

const MEMORY_CATEGORIES = new Set(["decision", "repository-fact", "learning", "unresolved-risk"]);
const CONTEXT_MODES = Object.freeze({
  concise: Object.freeze({ aggregateTokenLimit: 4000, perAgentTokenLimit: 4000 }),
  standard: Object.freeze({ aggregateTokenLimit: 24000, perAgentTokenLimit: 12000 }),
  detailed: Object.freeze({ aggregateTokenLimit: 72000, perAgentTokenLimit: 24000 })
});
const DEFAULT_POLICY_VERSION = "delivery-kernel-context-policy-v1";
const DEFAULT_TTL_POLICY = Object.freeze({ id: "no-cache", ttlSeconds: 0, generation: 0 });
const MAX_RETRIEVAL_FRACTION = 0.35;
const MINIMUM_RESERVE_FRACTION = 0.4;
const HANDOFF_TOKEN_LIMIT = 1000;
const MEMORY_RECORD_LIMIT = 100;
const MEMORY_PROPOSAL_TOKEN_LIMIT = 12000;
const MAX_CONTEXT_AGENT_IDS = 64;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareStrings(left, right) {
  const leftValue = String(left);
  const rightValue = String(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertClosedInput(value, label, allowedKeys) {
  if (!isPlainRecord(value)) throw new Error(`${label} must be a plain own-property record`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) throw new Error(`${label} contains a symbol key`);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !("value" in descriptor)) {
      throw new Error(`${label}.${key} must be an enumerable data property`);
    }
    if (!allowedKeys.has(key)) throw new Error(`${label}.${key} is not allowed`);
  }
}

function requiredNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.includes("\0")) {
    throw new Error(`${field} must be a non-empty trimmed string`);
  }
  return value;
}

function boundedSafeString(value, field, maxBytes) {
  requiredNonEmptyString(value, field);
  if (Buffer.byteLength(value, "utf8") > maxBytes) throw new Error(`${field} exceeds the ${maxBytes}-byte limit`);
  assertSafeTextContent(value, field);
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function normalizeIds(values, field) {
  if (!Array.isArray(values)) throw new Error(`${field} must be an array`);
  if (values.length > MAX_CONTEXT_AGENT_IDS) {
    throw new Error(`${field} must contain no more than ${MAX_CONTEXT_AGENT_IDS} IDs`);
  }
  const ids = values.map((value, index) => boundedSafeString(value, `${field}[${index}]`, 128));
  if (new Set(ids).size !== ids.length) throw new Error(`${field} must contain unique IDs`);
  return ids.sort(compareStrings);
}

function normalizeTtlPolicy(value) {
  if (!isPlainRecord(value)) throw new Error("ttlPolicy must be a plain own-property record");
  const allowed = new Set(["generation", "id", "ttlSeconds"]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new Error(`ttlPolicy.${key} is not allowed`);
  }
  const id = boundedSafeString(value.id, "ttlPolicy.id", 128);
  if (!Number.isSafeInteger(value.ttlSeconds) || value.ttlSeconds < 0) {
    throw new Error("ttlPolicy.ttlSeconds must be a non-negative safe integer");
  }
  const generation = value.generation ?? 0;
  if (!Number.isSafeInteger(generation) || generation < 0) {
    throw new Error("ttlPolicy.generation must be a non-negative safe integer");
  }
  return { id, ttlSeconds: value.ttlSeconds, generation };
}

export function estimateConservativeTokens(value) {
  if (typeof value !== "string" && !Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new Error("token estimation requires a string or byte sequence");
  }
  return Math.ceil(Buffer.byteLength(value) / 3);
}

export function resolveContextLimits({
  mode,
  modelContextTokens,
  maxInputFraction = MAX_RETRIEVAL_FRACTION
}) {
  if (!Object.hasOwn(CONTEXT_MODES, mode)) {
    throw new Error(`mode must be one of: ${Object.keys(CONTEXT_MODES).join(", ")}`);
  }
  if (!Number.isInteger(modelContextTokens) || modelContextTokens < 2) {
    throw new Error("modelContextTokens must be an integer of at least 2");
  }
  if (
    typeof maxInputFraction !== "number"
    || !Number.isFinite(maxInputFraction)
    || maxInputFraction <= 0
    || maxInputFraction > MAX_RETRIEVAL_FRACTION
  ) {
    throw new Error("maxInputFraction must be greater than 0 and no greater than 0.35");
  }
  const configured = CONTEXT_MODES[mode];
  const fractionTokenLimit = Math.floor(modelContextTokens * maxInputFraction);
  const aggregateTokenLimit = configured.aggregateTokenLimit;
  const tokenBudget = Math.min(fractionTokenLimit, aggregateTokenLimit);
  const perAgentTokenLimit = Math.min(configured.perAgentTokenLimit, tokenBudget);
  const minimumReservedTokens = Math.ceil(modelContextTokens * MINIMUM_RESERVE_FRACTION);
  const reservedTokens = modelContextTokens - tokenBudget;
  if (reservedTokens < minimumReservedTokens) {
    throw new Error("context limits must reserve at least 40 percent of the model window");
  }
  return {
    mode,
    modelContextTokens,
    retrievalFraction: maxInputFraction,
    fractionTokenLimit,
    aggregateTokenLimit,
    perAgentTokenLimit,
    tokenBudget,
    minimumReservedTokens,
    reservedTokens
  };
}

function resolveBundleAgents(items, providedAgentIds) {
  const observed = [...new Set(items.flatMap((item) => item.agentIds))].sort(compareStrings);
  if (providedAgentIds !== undefined) {
    const provided = normalizeIds(providedAgentIds, "agentIds");
    if (provided.length > 0) return provided;
  }
  return observed.length > 0 ? observed : ["shared"];
}

function assertItemIntegrity(item) {
  assertTrustedRepositoryContextItem(item);
  if (item.contentHash !== sha256(Buffer.from(item.content, "utf8"))) {
    throw new Error(`context item ${item.id} content hash does not match content`);
  }
  const utf8Bytes = Buffer.byteLength(item.content, "utf8");
  if (item.utf8Bytes !== utf8Bytes || item.tokenEstimate !== Math.ceil(utf8Bytes / 3)) {
    throw new Error(`context item ${item.id} measured context cost is invalid`);
  }
  return item;
}

function itemDeliveryTokenEstimate(item) {
  return estimateConservativeTokens(JSON.stringify(item));
}

function bundleCacheKey({
  taskDigest,
  repositoryCommit,
  policyVersion,
  modelContextTokens,
  mode,
  maxInputFraction,
  ttlPolicy,
  agentIds,
  items
}) {
  const cacheContract = {
    schemaVersion: "1.0.0",
    taskDigest,
    repositoryCommit,
    policyVersion,
    modelContextTokens,
    mode,
    maxInputFraction,
    ttlPolicy,
    resolvedAgentIds: agentIds,
    contentItems: [...items]
      .sort((left, right) => compareStrings(left.id, right.id))
      .map((item) => ({
        id: item.id,
        schemaVersion: item.schemaVersion,
        kind: item.kind,
        source: item.source,
        provenance: item.provenance,
        originAttestation: item.originAttestation,
        contentTrust: item.contentTrust,
        instructionAuthority: item.instructionAuthority,
        sensitivity: item.sensitivity,
        contentHash: item.contentHash,
        utf8Bytes: item.utf8Bytes,
        tokenEstimate: item.tokenEstimate,
        relevance: item.relevance,
        agentIds: item.agentIds
      }))
  };
  return canonicalDigest(cacheContract, "context cache contract");
}

export function buildContextBundle({
  taskId,
  taskDigest,
  repositoryCommit,
  policyVersion,
  modelContextTokens,
  mode = "standard",
  maxInputFraction = MAX_RETRIEVAL_FRACTION,
  ttlPolicy,
  agentIds,
  items
}) {
  boundedSafeString(taskId, "context bundle taskId", 128);
  if (typeof repositoryCommit !== "string" || !/^[0-9a-f]{40}$/i.test(repositoryCommit)) {
    throw new Error("repositoryCommit must be a full 40-character Git SHA");
  }
  const providedItems = Array.isArray(items) ? items : [];
  if (items !== undefined && !Array.isArray(items)) throw new Error("items must be an array");
  const effectiveTaskDigest = taskDigest ?? canonicalDigest({ taskId }, "context fallback task identity");
  if (!/^[0-9a-f]{64}$/i.test(effectiveTaskDigest)) {
    throw new Error("taskDigest must be a 64-character SHA-256 digest");
  }
  if (providedItems.length > 0 && taskDigest === undefined) {
    throw new Error("non-empty context requires the full taskDigest");
  }
  const effectivePolicyVersion = policyVersion ?? DEFAULT_POLICY_VERSION;
  boundedSafeString(effectivePolicyVersion, "policyVersion", 256);
  if (providedItems.length > 0 && policyVersion === undefined) {
    throw new Error("non-empty context requires policyVersion");
  }
  const effectiveTtlPolicy = normalizeTtlPolicy(ttlPolicy ?? DEFAULT_TTL_POLICY);
  if (providedItems.length > 0 && ttlPolicy === undefined) {
    throw new Error("non-empty context requires ttlPolicy");
  }
  const limits = resolveContextLimits({ mode, modelContextTokens, maxInputFraction });
  const candidates = providedItems.map(assertItemIntegrity);
  const ids = candidates.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("context item IDs must be unique");
  const resolvedAgentIds = resolveBundleAgents(candidates, agentIds);
  const declaredAgents = new Set(resolvedAgentIds);
  for (const item of candidates) {
    for (const itemAgentId of item.agentIds) {
      if (!declaredAgents.has(itemAgentId)) {
        throw new Error(`context item ${item.id} references undeclared agent ${itemAgentId}`);
      }
    }
  }
  candidates.sort(
    (left, right) => Number(right.relevance) - Number(left.relevance) || compareStrings(left.id, right.id)
  );

  const selected = [];
  const itemCosts = [];
  const exclusions = [];
  const perAgentTokens = Object.fromEntries(resolvedAgentIds.map((agentId) => [agentId, 0]));
  let tokensUsed = 0;
  for (const item of candidates) {
    const assignedAgentIds = item.agentIds.length > 0 ? item.agentIds : resolvedAgentIds;
    const deliveryTokenEstimate = itemDeliveryTokenEstimate(item);
    const aggregateDeliveryTokens = deliveryTokenEstimate * assignedAgentIds.length;
    if (tokensUsed + aggregateDeliveryTokens > limits.tokenBudget) {
      exclusions.push({ id: item.id, reason: "aggregate-context-budget" });
      continue;
    }
    const overBudgetAgentIds = assignedAgentIds.filter(
      (agentId) => perAgentTokens[agentId] + deliveryTokenEstimate > limits.perAgentTokenLimit
    );
    if (overBudgetAgentIds.length > 0) {
      exclusions.push({
        id: item.id,
        reason: "per-agent-context-budget",
        agentIds: [...overBudgetAgentIds]
      });
      continue;
    }
    selected.push(item);
    itemCosts.push({
      id: item.id,
      deliveryTokenEstimate,
      assignedAgentIds: [...assignedAgentIds],
      aggregateDeliveryTokens
    });
    tokensUsed += aggregateDeliveryTokens;
    for (const agentId of assignedAgentIds) perAgentTokens[agentId] += deliveryTokenEstimate;
  }

  const cacheKey = bundleCacheKey({
    taskDigest: effectiveTaskDigest.toLowerCase(),
    repositoryCommit: repositoryCommit.toLowerCase(),
    policyVersion: effectivePolicyVersion,
    modelContextTokens,
    mode,
    maxInputFraction,
    ttlPolicy: effectiveTtlPolicy,
    agentIds: resolvedAgentIds,
    items: candidates
  });

  return deepFreeze({
    schemaVersion: "1.0.0",
    taskId,
    taskDigest: effectiveTaskDigest.toLowerCase(),
    repositoryCommit: repositoryCommit.toLowerCase(),
    policyVersion: effectivePolicyVersion,
    modelContextTokens,
    mode,
    maxInputFraction,
    ttlPolicy: effectiveTtlPolicy,
    tokenBudget: limits.tokenBudget,
    aggregateTokenLimit: limits.aggregateTokenLimit,
    perAgentTokenLimit: limits.perAgentTokenLimit,
    minimumReservedTokens: limits.minimumReservedTokens,
    reservedTokens: limits.reservedTokens,
    tokensUsed,
    perAgentTokens,
    cacheKey,
    items: selected,
    itemCosts,
    exclusions
  });
}

export function buildHandoffSummary(input) {
  assertClosedInput(input, "handoff summary", new Set([
    "content",
    "fromAgentId",
    "provenance",
    "taskId",
    "toAgentId"
  ]));
  const taskId = boundedSafeString(input.taskId, "handoff taskId", 128);
  const fromAgentId = boundedSafeString(input.fromAgentId, "handoff fromAgentId", 128);
  const toAgentId = boundedSafeString(input.toAgentId, "handoff toAgentId", 128);
  if (fromAgentId === toAgentId) throw new Error("handoff agents must be independent identities");
  const provenance = boundedSafeString(input.provenance, "handoff provenance", 512);
  const content = boundedSafeString(input.content, "handoff content", 12000);
  const promptVisible = { taskId, fromAgentId, toAgentId, provenance, content };
  const tokenEstimate = estimateConservativeTokens(JSON.stringify(promptVisible));
  if (tokenEstimate > HANDOFF_TOKEN_LIMIT) {
    throw new Error(`handoff summary exceeds the ${HANDOFF_TOKEN_LIMIT}-token limit`);
  }
  return deepFreeze({
    schemaVersion: "1.0.0",
    taskId,
    fromAgentId,
    toAgentId,
    provenance,
    contentHash: sha256(Buffer.from(content, "utf8")),
    utf8Bytes: Buffer.byteLength(content, "utf8"),
    contentTokenEstimate: estimateConservativeTokens(content),
    tokenEstimate,
    content
  });
}

export function buildMemoryProposal(input) {
  assertClosedInput(input, "memory proposal", new Set(["records", "taskId"]));
  const taskId = boundedSafeString(input.taskId, "memory proposal taskId", 128);
  const { records } = input;
  if (!Array.isArray(records)) throw new Error("memory proposal records must be an array");
  if (records.length > MEMORY_RECORD_LIMIT) {
    throw new Error(`memory proposal exceeds the ${MEMORY_RECORD_LIMIT}-record limit`);
  }
  const accepted = [];
  const rejected = [];

  for (const [index, record] of records.entries()) {
    assertClosedInput(record, `memory proposal records[${index}]`, new Set([
      "category",
      "confidence",
      "id",
      "provenance",
      "statement"
    ]));
    const id = boundedSafeString(record.id ?? "unknown", `memory proposal records[${index}].id`, 128);
    if (!MEMORY_CATEGORIES.has(record.category)) {
      rejected.push({ id, reason: "unsupported-category" });
      continue;
    }
    if (
      typeof record.statement !== "string"
      || !record.statement.trim()
      || typeof record.provenance !== "string"
      || !record.provenance.trim()
    ) {
      rejected.push({ id, reason: "missing-provenance-or-statement" });
      continue;
    }
    const provenance = boundedSafeString(
      record.provenance,
      `memory proposal records[${index}].provenance`,
      512
    );
    if (Buffer.byteLength(record.statement, "utf8") > 4096) {
      rejected.push({ id, reason: "statement-too-large" });
      continue;
    }
    try {
      assertSafeTextContent(record.statement, `memory record ${id}`);
    } catch (error) {
      rejected.push({
        id,
        reason: /secret|credential/i.test(error?.message ?? "")
          ? "secret-like-content"
          : "personal-data-like-content"
      });
      continue;
    }
    const requiredConfidence = record.category === "decision" ? "approved" : "verified";
    if (record.confidence !== requiredConfidence) {
      rejected.push({ id, reason: `confidence-must-be-${requiredConfidence}` });
      continue;
    }
    boundedSafeString(record.confidence, `memory proposal records[${index}].confidence`, 32);
    accepted.push({
      id,
      category: record.category,
      statement: record.statement,
      provenance,
      confidence: record.confidence
    });
  }

  const visibleTokenEstimate = estimateConservativeTokens(JSON.stringify({ taskId, accepted, rejected }));
  if (visibleTokenEstimate > MEMORY_PROPOSAL_TOKEN_LIMIT) {
    throw new Error(`memory proposal exceeds the ${MEMORY_PROPOSAL_TOKEN_LIMIT}-token limit`);
  }

  return deepFreeze({
    schemaVersion: "1.0.0",
    taskId,
    requiresUserReview: true,
    automaticTrackedWriteAllowed: false,
    visibleTokenEstimate,
    accepted,
    rejected
  });
}
