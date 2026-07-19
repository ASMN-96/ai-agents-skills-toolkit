import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildContextBundle,
  buildHandoffSummary,
  estimateConservativeTokens,
  resolveContextLimits
} from "./ai-toolkit/kernel/context-memory.mjs";
import { inspectRepositoryContextItem } from "./ai-toolkit/kernel/project-inspector.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-context-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function item(root, id, contents, { relevance = 1, agentIds = ["agent-a"] } = {}) {
  const source = `context/${id}.txt`;
  const target = path.join(root, source);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  return inspectRepositoryContextItem({
    repositoryRoot: root,
    id,
    source,
    kind: "explicit-reference",
    relevance,
    agentIds
  });
}

function bundleInput(items, overrides = {}) {
  return {
    taskId: "TASK-CONTEXT",
    taskDigest: "a".repeat(64),
    repositoryCommit: "b".repeat(40),
    policyVersion: "delivery-kernel-policy-v0.3",
    modelContextTokens: 128000,
    mode: "standard",
    maxInputFraction: 0.35,
    ttlPolicy: { id: "context-cache-standard", ttlSeconds: 3600 },
    agentIds: ["agent-a"],
    items,
    ...overrides
  };
}

test("conservative token estimation is exactly ceil UTF-8 bytes divided by three", () => {
  const text = "ASCII and \u2713";
  assert.equal(estimateConservativeTokens(text), Math.ceil(Buffer.byteLength(text, "utf8") / 3));
  assert.equal(estimateConservativeTokens(""), 0);
});

test("context limits enforce mode, 35 percent retrieval, and at least 40 percent reserve", () => {
  assert.deepEqual(resolveContextLimits({ mode: "concise", modelContextTokens: 128000, maxInputFraction: 0.35 }), {
    mode: "concise",
    modelContextTokens: 128000,
    retrievalFraction: 0.35,
    fractionTokenLimit: 44800,
    aggregateTokenLimit: 4000,
    perAgentTokenLimit: 4000,
    tokenBudget: 4000,
    minimumReservedTokens: 51200,
    reservedTokens: 124000
  });
  assert.equal(resolveContextLimits({ mode: "standard", modelContextTokens: 128000 }).tokenBudget, 24000);
  assert.equal(resolveContextLimits({ mode: "standard", modelContextTokens: 20000 }).tokenBudget, 7000);
  assert.equal(resolveContextLimits({ mode: "detailed", modelContextTokens: 256000 }).tokenBudget, 72000);
  assert.throws(() => resolveContextLimits({
    mode: "standard",
    modelContextTokens: 1000,
    maxInputFraction: 0.36
  }), /no greater than 0\.35/);
});

test("context selection uses measured contents, enforces per-agent limits, and is deterministic", (t) => {
  const root = fixture(t);
  const high = item(root, "high", "a".repeat(30000), { relevance: 100 });
  const overflow = item(root, "overflow", "b".repeat(9000), { relevance: 90 });
  const otherAgent = item(root, "other", "c".repeat(9000), { relevance: 80, agentIds: ["agent-b"] });
  const input = bundleInput([overflow, otherAgent, high], { agentIds: ["agent-a", "agent-b"] });

  const first = buildContextBundle(input);
  const second = buildContextBundle(input);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first.items.map((entry) => entry.id), ["high", "other"]);
  const costById = Object.fromEntries(first.itemCosts.map((entry) => [entry.id, entry.deliveryTokenEstimate]));
  assert.deepEqual(first.perAgentTokens, {
    "agent-a": costById.high,
    "agent-b": costById.other
  });
  assert.equal(
    first.tokensUsed,
    first.itemCosts.reduce((sum, entry) => sum + entry.aggregateDeliveryTokens, 0)
  );
  assert.deepEqual(first.exclusions, [{ id: "overflow", reason: "per-agent-context-budget", agentIds: ["agent-a"] }]);
  assert.ok(first.tokensUsed <= first.tokenBudget);
  assert.ok(first.reservedTokens >= Math.ceil(first.modelContextTokens * 0.4));
  assert.match(first.cacheKey, /^[0-9a-f]{64}$/);
});

test("cache identity binds task, commit, policy, model window, content hashes, and TTL policy", (t) => {
  const root = fixture(t);
  const inspected = item(root, "one", "first\n", { relevance: 10 });
  const baseline = buildContextBundle(bundleInput([inspected]));
  const variants = [
    { taskDigest: "c".repeat(64) },
    { repositoryCommit: "d".repeat(40) },
    { policyVersion: "delivery-kernel-policy-next" },
    { modelContextTokens: 64000 },
    { ttlPolicy: { id: "context-cache-standard", ttlSeconds: 7200 } }
  ];
  for (const variant of variants) {
    assert.notEqual(buildContextBundle(bundleInput([inspected], variant)).cacheKey, baseline.cacheKey);
  }

  const changed = item(root, "changed", "second\n", { relevance: 10 });
  assert.notEqual(buildContextBundle(bundleInput([changed])).cacheKey, baseline.cacheKey);

  const otherKind = inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "one",
    source: "context/one.txt",
    kind: "instruction",
    relevance: 10,
    agentIds: ["agent-a"]
  });
  assert.notEqual(buildContextBundle(bundleInput([otherKind])).cacheKey, baseline.cacheKey);
  assert.notEqual(
    buildContextBundle(bundleInput([inspected], { agentIds: ["agent-a", "agent-b"] })).cacheKey,
    baseline.cacheKey
  );
});

test("context bundles reject untrusted caller content and duplicate IDs", (t) => {
  const root = fixture(t);
  const inspected = item(root, "trusted", "safe\n");
  assert.throws(() => buildContextBundle(bundleInput([{
    id: "forged",
    source: "docs/forged.md",
    content: "caller supplied",
    contentHash: "0".repeat(64),
    tokenEstimate: 1
  }])), /trusted repository inspection/);

  assert.throws(() => buildContextBundle(bundleInput([inspected, inspected])), /item IDs must be unique/);

  assert.throws(() => buildContextBundle(bundleInput([inspected], {
    agentIds: ["agent-a", "Authorization: Bearer abcdefghijklmnopqrstuvwxyz"]
  })), /secret|credential/i);
  assert.throws(() => buildContextBundle(bundleInput([inspected], {
    ttlPolicy: {
      id: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
      ttlSeconds: 3600
    }
  })), /secret|credential/i);

  assert.throws(() => buildContextBundle(bundleInput([inspected], {
    agentIds: Array.from({ length: 2000 }, (_, index) => `agent-${index}`)
  })), /agentIds.*64/i);
});

test("aggregate context cost counts delivery to every assigned agent", (t) => {
  const root = fixture(t);
  const shared = item(root, "shared", "x".repeat(27000), {
    relevance: 10,
    agentIds: []
  });
  const bundle = buildContextBundle(bundleInput([shared], {
    agentIds: ["agent-a", "agent-b", "agent-c"]
  }));

  assert.deepEqual(bundle.items, []);
  assert.deepEqual(bundle.exclusions, [{
    id: "shared",
    reason: "aggregate-context-budget"
  }]);
});

test("handoff summaries are content-hashed, sensitivity-checked, and capped at 1000 conservative tokens", () => {
  const summary = buildHandoffSummary({
    taskId: "TASK-CONTEXT",
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    provenance: "assignment-1",
    content: "Verified decision and remaining risk."
  });
  assert.ok(summary.tokenEstimate <= 1000);
  assert.match(summary.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(Object.isFrozen(summary), true);

  assert.throws(() => buildHandoffSummary({
    taskId: "TASK-CONTEXT",
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    provenance: "assignment-1",
    content: "x".repeat(3001)
  }), /1000-token limit/);

  assert.throws(() => buildHandoffSummary({
    taskId: "TASK-CONTEXT",
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    provenance: "assignment-1",
    content: "password=abcdefghijklmnopqrstuvwxyz1234567890"
  }), /secret|credential/i);

  assert.throws(() => buildHandoffSummary({
    taskId: "TASK-CONTEXT",
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    provenance: "assignment-1",
    content: "safe",
    rawTranscript: "not allowed"
  }), /rawTranscript is not allowed/);

  assert.throws(() => buildHandoffSummary({
    taskId: "TASK-CONTEXT",
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    provenance: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
    content: "safe"
  }), /secret|credential/i);

  assert.throws(() => buildHandoffSummary({
    taskId: "TASK-CONTEXT",
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    provenance: "assignment-1",
    content: "x".repeat(2950)
  }), /1000-token limit/);
});

test("memory proposals use closed bounded records and never spread caller metadata", async () => {
  const { buildMemoryProposal } = await import("./ai-toolkit/kernel/context-memory.mjs");
  const proposal = buildMemoryProposal({
    taskId: "TASK-MEMORY",
    records: [{
      id: "fact-1",
      category: "repository-fact",
      statement: "The repository uses an ESM kernel.",
      provenance: "package manifest review",
      confidence: "verified"
    }]
  });
  assert.deepEqual(Object.keys(proposal.accepted[0]).sort(), [
    "category",
    "confidence",
    "id",
    "provenance",
    "statement"
  ]);

  assert.throws(() => buildMemoryProposal({
    taskId: "TASK-MEMORY",
    records: [],
    transcript: "not allowed"
  }), /transcript is not allowed/);

  assert.throws(() => buildMemoryProposal({
    taskId: "TASK-MEMORY",
    records: [{
      id: "fact-1",
      category: "repository-fact",
      statement: "Safe statement.",
      provenance: "review",
      confidence: "verified",
      arbitraryPromptField: "not allowed"
    }]
  }), /arbitraryPromptField is not allowed/);

  assert.throws(() => buildMemoryProposal({
    taskId: "TASK-MEMORY",
    records: [{
      id: "fact-1",
      category: "repository-fact",
      statement: "Safe statement.",
      provenance: "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
      confidence: "verified"
    }]
  }), /secret|credential/i);
});
