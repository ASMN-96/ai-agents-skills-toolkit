import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  deriveSourceCapabilityWarnings,
  validateSourceCapabilityRegistry,
  validateSourceCapabilityRepository
} from "./ai-toolkit/kernel/source-synthesis-contract.mjs";

const SHA = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const REVISION = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const RECEIPT_PATH = `sources/reviews/impeccable/${REVISION}.json`;

function source(id, overrides = {}) {
  return {
    id,
    scope: "core",
    sourceBehavior: "general-method-reference",
    monitor: { state: "CURRENT", observedRevision: { kind: "git-sha", value: REVISION }, contentDigest: SHA },
    review: {
      state: "REVIEWED_CURRENT",
      currentReceipt: `sources/reviews/${id}/${REVISION}.json`,
      receiptDigest: SHA,
      reviewedRevision: { kind: "git-sha", value: REVISION },
      reviewedDigest: SHA,
      disposition: "SYNCED_ADOPTED"
    },
    ...overrides
  };
}

function validContext(overrides = {}) {
  return {
    catalog: { sources: [source("impeccable"), source("taste-skill")] },
    methods: new Map([["uiux.premium-visual-quality", { id: "uiux.premium-visual-quality", path: "methods/uiux/premium-visual-quality.md", sourceRef: ["impeccable"] }]]),
    tools: new Map([["visual-tool", { id: "visual-tool", path: "tools/visual-tool.md" }]]),
    skills: new Map([["uiux", { id: "uiux", path: "skills/uiux/SKILL.md" }]]),
    agents: new Map([["ui-reviewer", { id: "ui-reviewer", path: "agents/ui-reviewer.md" }]]),
    domainPacks: new Map([["uiux-gate", { id: "uiux-gate", path: "registries/domain-packs.registry.json" }]]),
    policies: new Map([["uiux-policy", { id: "uiux-policy", path: "docs/uiux-policy.md" }]]),
    evals: new Map([["uiux-contextual-design-controls", {
      id: "uiux-contextual-design-controls",
      path: "evals/skills/uiux-evals.json",
      caseIds: ["uiux-contextual-design-controls"]
    }]]),
    ...overrides
  };
}

function assessment(sourceId = "impeccable", overrides = {}) {
  return {
    sourceId,
    state: "assessed-current",
    assessmentRevision: { kind: "git-sha", value: REVISION },
    contentDigest: SHA,
    receiptPath: `sources/reviews/${sourceId}/${REVISION}.json`,
    receiptDigest: SHA,
    valueStatement: "Useful reviewed visual-design evidence.",
    nicheIds: ["uiux.visual-quality"],
    contributionRefs: ["uiux.visual-direction:impeccable-context"],
    overlapSourceIds: [],
    rejectedSummary: "No raw source content is adopted.",
    nextReviewTriggers: ["source-revision-changed"],
    ...overrides
  };
}

function pendingAssessment(sourceId = "taste-skill", overrides = {}) {
  return {
    sourceId,
    state: "pending-review",
    evidenceGaps: ["receipt-backed contribution assessment required"],
    plannedNicheIds: [],
    nextReviewTriggers: ["source-revision-changed"],
    ...overrides
  };
}

function input(id = "impeccable-context", sourceId = "impeccable", overrides = {}) {
  return {
    id,
    sourceId,
    role: "primary",
    receiptPath: `sources/reviews/${sourceId}/${REVISION}.json`,
    receiptDigest: SHA,
    reviewedRevision: { kind: "git-sha", value: REVISION },
    contentDigest: SHA,
    locators: [{ kind: "repository-path-section", value: "skills/impeccable/SKILL.md#context" }],
    ...overrides
  };
}

function decision(id = "adapt-context", overrides = {}) {
  return {
    id,
    outcome: "adapted",
    inputRefs: ["impeccable-context"],
    contributionKinds: ["workflow"],
    summary: "Adapted clean-room workflow.",
    adaptationMethod: "clean-room-paraphrase-and-harden",
    rationale: "Preserves safety and compatibility.",
    artifactRefs: ["method:uiux.premium-visual-quality"],
    evaluationRefs: ["eval:uiux-contextual-design-controls"],
    restrictions: ["no-upstream-prompt-copy"],
    ...overrides
  };
}

function artifact(overrides = {}) {
  return {
    id: "method:uiux.premium-visual-quality",
    kind: "method",
    resourceId: "uiux.premium-visual-quality",
    path: "methods/uiux/premium-visual-quality.md",
    contentDigest: SHA,
    decisionRefs: ["adapt-context"],
    ...overrides
  };
}

function evaluation(overrides = {}) {
  return {
    id: "eval:uiux-contextual-design-controls",
    path: "evals/skills/uiux-evals.json",
    caseIds: ["uiux-contextual-design-controls"],
    evidenceKind: "static-eval",
    contentDigest: SHA,
    decisionRefs: ["adapt-context"],
    ...overrides
  };
}

function capability(id = "uiux.visual-direction", activeSynthesisId = "uiux.visual-direction@1", overrides = {}) {
  return {
    id,
    displayName: "Visual Direction",
    niche: "uiux.visual-quality",
    purpose: "Maintain an intentional product visual language.",
    lifecycle: "active",
    ownerRef: { kind: "method", id: "uiux.premium-visual-quality", path: "methods/uiux/premium-visual-quality.md" },
    activeSynthesisId,
    consumerRefs: [],
    ...overrides
  };
}

function synthesis(id = "uiux.visual-direction@1", inputs = [input()], overrides = {}) {
  return {
    id,
    capabilityId: "uiux.visual-direction",
    version: 1,
    state: "approved",
    strategy: "best-of-breed",
    inputs,
    decisions: [decision()],
    artifactRefs: [artifact()],
    evaluationRefs: [evaluation()],
    updatePolicy: { onSourceChange: "re-review-dependent-decisions" },
    ...overrides
  };
}

function validRegistry(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    registryType: "source-capabilities",
    sourceCatalog: "sources/source-watchlist.json",
    sourceAssessments: [assessment(), pendingAssessment()],
    capabilities: [capability()],
    syntheses: [synthesis()],
    ...overrides
  };
}

function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function createRepositoryFixture(context, options = {}) {
  const root = mkdtempSync(path.join(tmpdir(), "source-synthesis-contract-"));
  const receiptPath = `sources/reviews/impeccable/${REVISION}.json`;
  const artifactPath = options.artifactPath ?? "artifacts/evidence.md";
  const evaluationPath = "evals/fixture.json";
  const receiptText = "{\"receipt\":\"fixture\"}\n";
  const artifactText = "artifact evidence\n";
  const evaluationText = JSON.stringify({
    cases: [{ id: "uiux-contextual-design-controls" }],
    metadata: { nested: { id: "nested-fake-case" } }
  });
  mkdirSync(path.join(root, "sources", "reviews", "impeccable"), { recursive: true });
  mkdirSync(path.join(root, "artifacts"), { recursive: true });
  mkdirSync(path.join(root, "evals"), { recursive: true });
  writeFileSync(path.join(root, ...receiptPath.split("/")), receiptText, "utf8");
  if (!options.deferArtifactWrite) writeFileSync(path.join(root, ...artifactPath.split("/")), artifactText, "utf8");
  writeFileSync(path.join(root, ...evaluationPath.split("/")), evaluationText, "utf8");
  const receiptDigest = sha256Text(receiptText);
  const artifactDigest = sha256Text(artifactText);
  const evaluationDigest = sha256Text(evaluationText);
  const catalog = {
    sources: [source("impeccable", {
      monitor: { state: "CURRENT", observedRevision: { kind: "git-sha", value: REVISION }, contentDigest: SHA },
      review: {
        state: "REVIEWED_CURRENT",
        currentReceipt: receiptPath,
        receiptDigest,
        reviewedRevision: { kind: "git-sha", value: REVISION },
        reviewedDigest: SHA,
        disposition: "SYNCED_ADOPTED"
      }
    }), source("taste-skill")]
  };
  const repositoryContext = validContext({
    ...context,
    catalog,
    methods: new Map([...validContext().methods].map(([id, entry]) => [id, {
      ...entry,
      path: artifactPath,
      sourceRef: options.methodSourceRefs ?? ["impeccable"]
    }])),
    evals: new Map([["uiux-contextual-design-controls", {
      id: "uiux-contextual-design-controls",
      path: evaluationPath,
      caseIds: ["uiux-contextual-design-controls"]
    }]])
  });
  const registry = validRegistry({
    sourceAssessments: [assessment("impeccable", { receiptPath, receiptDigest }), pendingAssessment()],
    capabilities: [capability(undefined, undefined, {
      ownerRef: { kind: "method", id: "uiux.premium-visual-quality", path: artifactPath }
    })],
    syntheses: [synthesis(undefined, undefined, {
      inputs: [input(undefined, undefined, { receiptPath, receiptDigest })],
      artifactRefs: [artifact({ path: artifactPath, contentDigest: artifactDigest })],
      evaluationRefs: [evaluation({ path: evaluationPath, contentDigest: evaluationDigest })]
    })]
  });
  return { root, registry, context: repositoryContext, catalog, artifactText };
}

test("multiple sources may contribute to one synthesis", () => {
  const registry = validRegistry({
    sourceAssessments: [assessment(), assessment("taste-skill", { contributionRefs: [], nicheIds: [], valueStatement: "Useful reviewed secondary evidence." })],
    syntheses: [synthesis("uiux.visual-direction@1", [
      input("impeccable-input", "impeccable"),
      input("taste-input", "taste-skill", { role: "supporting" })
    ], { decisions: [decision("adapt-context", { inputRefs: ["impeccable-input", "taste-input"] })] })]
  });
  assert.doesNotThrow(() => validateSourceCapabilityRegistry(registry, validContext()));
});

test("pending evidence cannot become approved adoption", () => {
  const registry = validRegistry({
    sourceAssessments: [pendingAssessment("impeccable"), pendingAssessment("taste-skill")]
  });
  assert.throws(() => validateSourceCapabilityRegistry(registry, validContext()), /pending assessment cannot support an approved synthesis/);
});

test("rejects unknown fields and unsorted stable identifiers", () => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ extra: true }), validContext()), /unexpected registry field/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ sourceAssessments: [pendingAssessment("taste-skill"), assessment()] }), validContext()), /sorted by sourceId/);
});

test("rejects duplicate IDs and graph cycles", () => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ capabilities: [capability(), capability()] }), validContext()), /duplicate capability id/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, { decisions: [decision("adapt-context", { artifactRefs: ["method:uiux.premium-visual-quality"], evaluationRefs: ["eval:uiux-contextual-design-controls"] })], artifactRefs: [artifact({ decisionRefs: ["adapt-context"] })], evaluationRefs: [evaluation({ decisionRefs: ["adapt-context"] })], updatePolicy: { onSourceChange: "re-review", dependsOnSynthesisIds: ["uiux.visual-direction@1"] } })] }), validContext()), /cycle/);
});

test("rejects source receipt revision and digest mismatch", () => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, [input(undefined, undefined, { receiptPath: "sources/reviews/impeccable/not-the-revision.json" })])] }), validContext()), /receiptPath/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, [input(undefined, undefined, { contentDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" })])] }), validContext()), /contentDigest/);
});

test("rejects traversal and actual linked repository evidence", async (context) => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, { artifactRefs: [artifact({ path: "../outside.md" })] })] }), validContext()), /safe repository-relative POSIX path/);
  const fixture = createRepositoryFixture(context, { artifactPath: "artifacts/linked.md", deferArtifactWrite: true });
  const outside = path.join(fixture.root, "outside.md");
  const linked = path.join(fixture.root, "artifacts", "linked.md");
  try {
    writeFileSync(outside, fixture.artifactText, "utf8");
    try {
      symlinkSync(outside, linked, process.platform === "win32" ? "file" : "file");
    } catch (error) {
      if (["EACCES", "EPERM", "UNKNOWN"].includes(error?.code)) {
        context.skip(`host does not permit creating a file link: ${error.code}`);
        return;
      }
      throw error;
    }
    try {
      await assert.rejects(
        validateSourceCapabilityRepository({ repositoryRoot: fixture.root, catalog: fixture.catalog, registry: fixture.registry, context: fixture.context }),
        /linked|symbolic link|junction|reparse|regular file/i
      );
    } catch (error) {
      if (/fsutil\.exe EPERM/i.test(error?.message)) {
        context.skip(`host cannot inspect linked-file reparse state: ${error.message}`);
        return;
      }
      throw error;
    }
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test("allows only one active owner and approved active synthesis per capability", () => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(), synthesis("uiux.visual-direction@2", undefined, { version: 2 })] }), validContext()), /one approved active synthesis/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ capabilities: [capability(), capability("uiux.visual-direction-alt", "uiux.visual-direction@1", { ownerRef: { kind: "method", id: "uiux.premium-visual-quality", path: "methods/uiux/premium-visual-quality.md" } })] }), validContext()), /active owner/);
});

test("enforces state-dependent evidence and decision requirements", () => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ sourceAssessments: [assessment("impeccable", { state: "stale", staleReason: "source-revision-changed" }), pendingAssessment("taste-skill")] }), validContext()), /stale assessment cannot support an approved synthesis/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, { decisions: [decision("adapt-context", { evaluationRefs: [] })] })] }), validContext()), /requires artifact and evaluation references/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, { decisions: [decision("adapt-context", { outcome: "rejected", adaptationMethod: null, artifactRefs: ["method:uiux.premium-visual-quality"] })] })] }), validContext()), /cannot claim active artifacts/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, {
    decisions: [decision("reference-context", { outcome: "reference-only", adaptationMethod: null, artifactRefs: ["method:uiux.premium-visual-quality"], evaluationRefs: [] })],
    artifactRefs: [artifact({ decisionRefs: ["reference-context"] })],
    evaluationRefs: [evaluation({ decisionRefs: ["reference-context"] })]
  })] }), validContext()), /cannot claim active artifacts/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, {
    decisions: [decision("reference-context", { outcome: "reference-only", adaptationMethod: null, artifactRefs: [], evaluationRefs: [] })],
    artifactRefs: [artifact({ decisionRefs: ["reference-context"] })],
    evaluationRefs: [evaluation({ decisionRefs: ["reference-context"] })]
  })] }), validContext()), /unreciprocated|cannot claim active artifacts/);
});

test("binds evaluation references to canonical eval IDs and exact top-level cases", () => {
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, {
    evaluationRefs: [evaluation({ id: "eval:unknown-eval", caseIds: ["unknown-eval"] })],
    decisions: [decision("adapt-context", { evaluationRefs: ["eval:unknown-eval"] })]
  })] }), validContext()), /canonical eval/);
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry({ syntheses: [synthesis(undefined, undefined, {
    evaluationRefs: [evaluation({ caseIds: ["nested-fake-case"] })]
  })] }), validContext()), /case ID does not resolve/);
});

test("domain-gate references must resolve through the canonical domain-pack collection", () => {
  const known = validRegistry({ capabilities: [capability(undefined, undefined, {
    ownerRef: { kind: "domain-gate", id: "uiux-gate", path: "registries/domain-packs.registry.json" }
  })] });
  assert.doesNotThrow(() => validateSourceCapabilityRegistry(known, validContext()));
  const unknown = validRegistry({ capabilities: [capability(undefined, undefined, {
    ownerRef: { kind: "domain-gate", id: "missing-gate", path: "registries/domain-packs.registry.json" }
  })] });
  assert.throws(() => validateSourceCapabilityRegistry(unknown, validContext()), /canonical domain-gate/);
});

test("method source provenance accepts only approved inputs or explicit pending assessments", async (context) => {
  const unknown = createRepositoryFixture(context, { methodSourceRefs: ["unknown-source"] });
  try {
    await assert.rejects(
      validateSourceCapabilityRepository({ repositoryRoot: unknown.root, catalog: unknown.catalog, registry: unknown.registry, context: unknown.context }),
      /unknown method sourceRef/
    );
  } finally {
    rmSync(unknown.root, { recursive: true, force: true });
  }
  for (const state of ["draft", "superseded"]) {
    const fixture = createRepositoryFixture(context, { methodSourceRefs: ["taste-skill"] });
    try {
      fixture.registry.sourceAssessments = [
        assessment("impeccable", { receiptPath: fixture.catalog.sources[0].review.currentReceipt, receiptDigest: fixture.catalog.sources[0].review.receiptDigest }),
        assessment("taste-skill", { contributionRefs: [], nicheIds: [], valueStatement: "Current secondary evidence." })
      ];
      fixture.registry.syntheses.push(synthesis("uiux.visual-direction@2", [input("taste-input", "taste-skill")], {
        version: 2,
        state,
        decisions: [],
        artifactRefs: [],
        evaluationRefs: []
      }));
      await assert.rejects(
        validateSourceCapabilityRepository({ repositoryRoot: fixture.root, catalog: fixture.catalog, registry: fixture.registry, context: fixture.context }),
        /approved synthesis input/
      );
    } finally {
      rmSync(fixture.root, { recursive: true, force: true });
    }
  }
  const pending = createRepositoryFixture(context, { methodSourceRefs: ["taste-skill"] });
  try {
    let result;
    try {
      result = await validateSourceCapabilityRepository({ repositoryRoot: pending.root, catalog: pending.catalog, registry: pending.registry, context: pending.context });
    } catch (error) {
      if (/fsutil\.exe EPERM/i.test(error?.message)) {
        context.skip(`host cannot inspect method provenance fixture: ${error.message}`);
        return;
      }
      throw error;
    }
    assert.deepEqual(result.warnings, [{ code: "pending-method-source-assessment", methodId: "uiux.premium-visual-quality", sourceId: "taste-skill" }]);
  } finally {
    rmSync(pending.root, { recursive: true, force: true });
  }
});

test("rejects historical sources from active capabilities and exposes honest warnings", () => {
  const context = validContext({ catalog: { sources: [source("impeccable", { scope: "historical", sourceBehavior: "historical" }), source("taste-skill")] } });
  assert.throws(() => validateSourceCapabilityRegistry(validRegistry(), context), /historical source cannot support an approved synthesis/);
  assert.deepEqual(deriveSourceCapabilityWarnings(validRegistry({ syntheses: [], capabilities: [] }), validContext()), [{ code: "pending-source-assessment", sourceId: "taste-skill" }]);
});
