#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as sourcePolicy from "./ai-toolkit/kernel/source-policy.mjs";
import * as resourceCatalog from "./ai-toolkit/kernel/resource-catalog.mjs";
import { canonicalDigest } from "./ai-toolkit/kernel/canonical-digest.mjs";
import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { prepareExecutionPlan } from "./ai-toolkit/kernel/execution-lifecycle.mjs";
import { loadValidatedSourceCatalog } from "./ai-toolkit/kernel/source-catalog-loader.mjs";
import { readPinnedDeliveryRequest } from "./test-support/live-repository-fixture.mjs";

const NOW = "2026-07-18T00:00:00.000Z";
const SHA = "a".repeat(40);
const CONTENT_DIGEST = `sha256:${"b".repeat(64)}`;
const RECEIPT_DIGEST = `sha256:${"c".repeat(64)}`;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STARTER = path.join(ROOT, "templates", "delivery-kernel.request.example.json");

function starterRequest() {
  return readPinnedDeliveryRequest(STARTER, ROOT);
}

function source(overrides = {}) {
  return {
    id: "nist-ssdf",
    aliases: [],
    identityKey: "github:example/source",
    name: "Example source",
    authority: "official",
    lifecycle: "review-input",
    sourceType: "github-repo",
    sourceUrl: "https://github.com/example/source",
    repoOwner: "example",
    repoName: "source",
    defaultBranch: "main",
    sourceRecordPath: "sources/nist-ssdf.md",
    watchedPaths: [],
    licenseConcern: "clear",
    reviewPriority: "High",
    freshnessClass: "security-runtime",
    monitor: {
      state: "CURRENT",
      checkedAt: "2026-07-17T23:00:00.000Z",
      observedRevision: { kind: "git-sha", value: SHA },
      contentDigest: CONTENT_DIGEST,
      failureReason: null
    },
    review: {
      state: "REVIEWED_CURRENT",
      currentReceipt: `sources/reviews/nist-ssdf/${SHA}.json`,
      previousReceipt: null,
      receiptDigest: RECEIPT_DIGEST,
      previousReceiptDigest: null,
      reviewedRevision: { kind: "git-sha", value: SHA },
      reviewedDigest: CONTENT_DIGEST,
      reviewedAt: "2026-07-17T23:10:00.000Z",
      expiresAt: "2026-07-31T23:10:00.000Z",
      disposition: "SYNCED_REFERENCE"
    },
    runtimePosture: "metadata-only",
    dependentResourceIds: [],
    affectedArtifacts: ["sources/nist-ssdf.md"],
    neverAutoImport: true,
    ...overrides
  };
}

function catalog(sources = [source()]) {
  return {
    schemaVersion: "2.0.0",
    catalogId: "enterprise-source-catalog",
    policy: {
      readOnlySupplyChainInputs: true,
      neverAutoImport: true,
      freshnessNeverActivatesRuntime: true
    },
    approverPolicy: {
      authorizedIdentities: ["repository-owner:test"],
      requiresExplicitOwnerRegistration: true
    },
    freshnessClasses: {
      "security-runtime": { maxAgeDays: 14 },
      "platform-standards": { maxAgeDays: 30 },
      "general-methods": { maxAgeDays: 90 }
    },
    sources
  };
}

function gate(sourceId = "nist-ssdf") {
  return {
    id: "enterprise-security-privacy",
    authoritativeSourceRefs: [{ sourceId, locator: "SP 800-218" }]
  };
}

function receiptDocument(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    receiptId: `nist-ssdf:${SHA}`,
    sourceId: "nist-ssdf",
    reviewedRevision: { kind: "git-sha", value: SHA },
    contentDigest: CONTENT_DIGEST,
    reviewedAt: "2026-07-17T23:10:00.000Z",
    expiresAt: "2026-07-31T23:10:00.000Z",
    licenseReview: {
      classification: "permissive",
      evidence: ["Pinned license evidence reviewed."],
      notes: "Reference-only review."
    },
    securityReview: {
      status: "passed",
      evidence: ["Source inspected without execution."],
      dangerousOperations: [],
      networkBehavior: ["No upstream code executed."],
      secretAccess: ["No credential access permitted."]
    },
    promptInjectionReview: {
      status: "passed",
      evidence: ["Instructions treated as untrusted data."],
      rejectedInstructions: []
    },
    adoption: {
      disposition: "SYNCED_REFERENCE",
      summary: "Reviewed reference-only evidence.",
      cleanRoomOnly: true,
      runtimePosture: "metadata-only"
    },
    affectedArtifacts: ["sources/nist-ssdf.md"],
    artifactEvidence: {
      mode: "reference-only-no-copy",
      noCopy: true,
      reason: "No upstream content copied."
    },
    approver: {
      identity: "repository-owner:test",
      approvedAt: "2026-07-17T23:20:00.000Z"
    },
    rollbackTarget: {
      previousReceipt: null,
      previousReceiptDigest: null,
      artifactRevision: "4654861f6a1887826e6a888b894869e1ec52bb01"
    },
    ...overrides
  };
}

function receiptText(overrides = {}) {
  return `${JSON.stringify(receiptDocument(overrides), null, 2)}\n`;
}

async function canonicalResources() {
  const [agentsRegistry, skillsRegistry, toolsRegistry] = await Promise.all([
    readFile(path.join(ROOT, "registries", "agents.registry.json"), "utf8").then(JSON.parse),
    readFile(path.join(ROOT, "registries", "skills.registry.json"), "utf8").then(JSON.parse),
    readFile(path.join(ROOT, "registries", "tools.registry.json"), "utf8").then(JSON.parse)
  ]);
  return resourceCatalog.buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry,
    skillsRegistry,
    toolsRegistry
  });
}

function quarantinedSource(overrides = {}) {
  const monitor = {
    state: "MANUAL_DUE",
    checkedAt: "2026-07-17T23:00:00.000Z",
    observedRevision: null,
    contentDigest: null,
    failureReason: "manual review due",
    ...overrides.monitor
  };
  const review = {
    state: "QUARANTINED",
    currentReceipt: null,
    previousReceipt: null,
    receiptDigest: null,
    previousReceiptDigest: null,
    reviewedRevision: null,
    reviewedDigest: null,
    reviewedAt: null,
    expiresAt: null,
    disposition: null,
    ...overrides.review
  };
  return source({
    ...overrides,
    monitor,
    review
  });
}

test("runtime catalog loading validates exact immutable receipt bytes and rejects tampering", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "delivery-kernel-source-catalog-"));
  try {
    const text = receiptText();
    const digest = `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
    const receiptPath = `sources/reviews/nist-ssdf/${SHA}.json`;
    const reviewedSource = source({
      review: {
        ...source().review,
        receiptDigest: digest
      }
    });
    await mkdir(path.join(root, "sources", "reviews", "nist-ssdf"), { recursive: true });
    await writeFile(path.join(root, ...receiptPath.split("/")), text, "utf8");
    await writeFile(
      path.join(root, "sources", "source-watchlist.json"),
      `${JSON.stringify(catalog([reviewedSource]), null, 2)}\n`,
      "utf8"
    );

    const loaded = await loadValidatedSourceCatalog({ repositoryRoot: root, now: NOW });
    assert.equal(loaded.validation.receiptCount, 1);
    assert.equal(loaded.validation.immutableReceiptChainsValidated, true);

    await writeFile(path.join(root, ...receiptPath.split("/")), `${text}\n`, "utf8");
    await assert.rejects(
      () => loadValidatedSourceCatalog({ repositoryRoot: root, now: NOW }),
      /receipt chain digest.*does not match/i
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runtime catalog loading binds mutable head review metadata to the immutable receipt", async (context) => {
  const cases = [
    {
      name: "reviewedAt",
      review: { reviewedAt: "2026-07-17T23:11:00.000Z" },
      expected: /catalog reviewedAt does not match immutable head receipt/i
    },
    {
      name: "expiresAt extension",
      review: { expiresAt: "2026-08-01T23:10:00.000Z" },
      expected: /catalog expiresAt does not match immutable head receipt/i
    },
    {
      name: "blocked disposition cannot be promoted in the catalog",
      review: {},
      receipt: {
        adoption: {
          disposition: "ARCHIVED_HARD_BLOCKER",
          summary: "Immutable review evidence blocks this source.",
          cleanRoomOnly: true,
          runtimePosture: "metadata-only"
        }
      },
      expected: /catalog disposition does not match immutable head receipt/i
    }
  ];

  for (const scenario of cases) {
    await context.test(scenario.name, async () => {
      const root = await mkdtemp(path.join(tmpdir(), "delivery-kernel-source-head-binding-"));
      try {
        const text = receiptText(scenario.receipt);
        const digest = `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
        const receiptPath = `sources/reviews/nist-ssdf/${SHA}.json`;
        const reviewedSource = source({
          review: {
            ...source().review,
            receiptDigest: digest,
            ...scenario.review
          }
        });
        await mkdir(path.join(root, "sources", "reviews", "nist-ssdf"), { recursive: true });
        await writeFile(path.join(root, ...receiptPath.split("/")), text, "utf8");
        await writeFile(
          path.join(root, "sources", "source-watchlist.json"),
          `${JSON.stringify(catalog([reviewedSource]), null, 2)}\n`,
          "utf8"
        );

        await assert.rejects(
          () => loadValidatedSourceCatalog({ repositoryRoot: root, now: NOW }),
          scenario.expected
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

test("runtime catalog loading rejects post-review tampering of an adopted artifact", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "delivery-kernel-source-artifact-"));
  try {
    const artifactPath = "sources/nist-ssdf.md";
    const artifactText = "# Clean-room adopted guidance\n";
    const artifactDigest = `sha256:${createHash("sha256").update(artifactText, "utf8").digest("hex")}`;
    const text = receiptText({
      adoption: {
        disposition: "SYNCED_ADOPTED",
        summary: "Clean-room artifact adopted with exact byte evidence.",
        cleanRoomOnly: true,
        runtimePosture: "metadata-only"
      },
      artifactEvidence: {
        mode: "exact-content-digests",
        artifacts: [{ path: artifactPath, contentDigest: artifactDigest }]
      }
    });
    const digest = `sha256:${createHash("sha256").update(text, "utf8").digest("hex")}`;
    const receiptPath = `sources/reviews/nist-ssdf/${SHA}.json`;
    const reviewedSource = source({
      review: {
        ...source().review,
        receiptDigest: digest,
        disposition: "SYNCED_ADOPTED"
      }
    });
    await mkdir(path.join(root, "sources", "reviews", "nist-ssdf"), { recursive: true });
    await writeFile(path.join(root, ...receiptPath.split("/")), text, "utf8");
    await writeFile(path.join(root, ...artifactPath.split("/")), artifactText, "utf8");
    await writeFile(
      path.join(root, "sources", "source-watchlist.json"),
      `${JSON.stringify(catalog([reviewedSource]), null, 2)}\n`,
      "utf8"
    );

    const loaded = await loadValidatedSourceCatalog({ repositoryRoot: root, now: NOW });
    assert.equal(loaded.validation.receiptCount, 1);

    await writeFile(path.join(root, ...artifactPath.split("/")), `${artifactText}tampered\n`, "utf8");
    await assert.rejects(
      () => loadValidatedSourceCatalog({ repositoryRoot: root, now: NOW }),
      /adopted artifact content digest.*does not match/i
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reviewed-current metadata-only sources can satisfy authoritative reference gates without runtime activation", () => {
  assert.equal(typeof sourcePolicy.buildSourceReferenceSnapshot, "function");
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: catalog(),
    gates: [gate()],
    now: NOW,
    receiptsValidated: true
  });

  assert.equal(snapshot.status, "current");
  assert.deepEqual(snapshot.requiredSourceIds, ["nist-ssdf"]);
  assert.deepEqual(snapshot.blockedGateIds, []);
  assert.equal(snapshot.sources[0].referenceEligible, true);
  assert.equal(snapshot.sources[0].runtimeEligible, false);
  assert.match(snapshot.catalogDigest, /^[a-f0-9]{64}$/);
  assert.match(snapshot.snapshotDigest, /^[a-f0-9]{64}$/);
  assert.equal(snapshot.evaluatedAt, "2026-07-17T23:10:00.000Z");
  assert.equal(snapshot.validUntil, "2026-07-31T23:00:00.000Z");
  assert.equal(snapshot.sources[0].monitorValidUntil, "2026-07-31T23:00:00.000Z");

  const plannedDomain = sourcePolicy.applySourceReferenceSnapshotToDomain({
    status: "planned",
    resolvedGateIds: ["enterprise-security-privacy"],
    blockedGateIds: []
  }, snapshot);
  assert.equal(plannedDomain.status, "planned");
  assert.deepEqual(plannedDomain.blockedGateIds, []);
});

test("current dependent source evidence never activates an otherwise ineligible resource", async () => {
  const resources = await canonicalResources();
  const sourceCatalog = catalog([source({ dependentResourceIds: ["playwright"] })]);
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: sourceCatalog,
    gates: [],
    resourceIds: resources.map((resource) => resource.id),
    now: NOW,
    receiptsValidated: true
  });

  assert.deepEqual(snapshot.resourceGovernance.dependencies, [{
    resourceId: "playwright",
    sourceId: "nist-ssdf"
  }]);
  assert.equal(snapshot.resourceGovernance.status, "current");
  assert.equal(snapshot.resourceGovernance.sources[0].referenceEligible, true);
  assert.equal(snapshot.resourceGovernance.sources[0].runtimeEligible, false);

  const before = resources.find((resource) => resource.id === "playwright");
  const governed = resourceCatalog.applySourceReferenceSnapshotToResources(resources, snapshot);
  const after = governed.find((resource) => resource.id === "playwright");
  assert.equal(before.eligibility.eligible, false);
  assert.equal(after.eligibility.eligible, false);
  assert.deepEqual(after.eligibility.reasons, before.eligibility.reasons);
});

test("multiple changed or failed dependency sources deterministically quarantine a detected agent", async () => {
  const resources = await canonicalResources();
  const manualDue = quarantinedSource({ dependentResourceIds: ["architect-agent"] });
  const checkFailed = quarantinedSource({
    id: "second-source",
    identityKey: "github:example/second-source",
    name: "Second source",
    sourceUrl: "https://github.com/example/second-source",
    repoName: "second-source",
    sourceRecordPath: "sources/second-source.md",
    affectedArtifacts: ["sources/second-source.md"],
    dependentResourceIds: ["architect-agent"],
    monitor: {
      state: "CHECK_FAILED",
      checkedAt: "2026-07-17T22:00:00.000Z",
      observedRevision: null,
      contentDigest: null,
      failureReason: "upstream check failed"
    }
  });
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: catalog([checkFailed, manualDue]),
    gates: [],
    resourceIds: resources.map((resource) => resource.id),
    now: NOW,
    receiptsValidated: true
  });

  assert.equal(snapshot.resourceGovernance.status, "blocked");
  assert.deepEqual(snapshot.resourceGovernance.blockedResourceIds, ["architect-agent"]);
  assert.deepEqual(snapshot.resourceGovernance.blockers, [
    {
      code: "dependent-source-unavailable",
      resourceId: "architect-agent",
      sourceId: "nist-ssdf",
      reason: "monitor-manual-due"
    },
    {
      code: "dependent-source-unavailable",
      resourceId: "architect-agent",
      sourceId: "second-source",
      reason: "monitor-check-failed"
    }
  ]);

  const governed = resourceCatalog.applySourceReferenceSnapshotToResources(resources, snapshot);
  const architect = governed.find((resource) => resource.id === "architect-agent");
  assert.equal(architect.detectionEvidence.state, "observed");
  assert.equal(architect.eligibility.eligible, false);
  assert.deepEqual(architect.eligibility.reasons, [
    "source-dependency-unavailable:nist-ssdf:monitor-manual-due",
    "source-dependency-unavailable:second-source:monitor-check-failed"
  ]);
  assert.equal(resourceCatalog.hasTrustedScopedLocalWriteCapability(architect), false);
});

test("expired retained review evidence blocks its dependent resource with an explicit reason", async () => {
  const resources = await canonicalResources();
  const expired = source({
    dependentResourceIds: ["architect-agent"],
    review: {
      ...source().review,
      state: "QUARANTINED",
      expiresAt: "2026-07-17T23:59:59.000Z"
    }
  });
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: catalog([expired]),
    gates: [],
    resourceIds: resources.map((resource) => resource.id),
    now: NOW,
    receiptsValidated: true
  });

  assert.deepEqual(snapshot.resourceGovernance.blockers, [{
    code: "dependent-source-unavailable",
    resourceId: "architect-agent",
    sourceId: "nist-ssdf",
    reason: "review-expired"
  }]);
  const governed = resourceCatalog.applySourceReferenceSnapshotToResources(resources, snapshot);
  assert.deepEqual(
    governed.find((resource) => resource.id === "architect-agent").eligibility.reasons,
    ["source-dependency-unavailable:nist-ssdf:review-expired"]
  );
});

test("dangling dependentResourceIds fail closed before a source snapshot is emitted", () => {
  assert.throws(
    () => sourcePolicy.buildSourceReferenceSnapshot({
      catalog: catalog([source({ dependentResourceIds: ["missing-resource"] })]),
      gates: [],
      resourceIds: ["architect-agent"],
      now: NOW,
      receiptsValidated: true
    }),
    /dependentResourceIds references unknown ResourceContract: nist-ssdf:missing-resource/
  );
});

test("MANUAL_DUE and QUARANTINED source state produces stable gate blockers", () => {
  const blockedSource = source({
    monitor: {
      state: "MANUAL_DUE",
      checkedAt: "2026-07-17T23:00:00.000Z",
      observedRevision: null,
      contentDigest: null,
      failureReason: "manual review due"
    },
    review: {
      state: "QUARANTINED",
      currentReceipt: null,
      previousReceipt: null,
      receiptDigest: null,
      previousReceiptDigest: null,
      reviewedRevision: null,
      reviewedDigest: null,
      reviewedAt: null,
      expiresAt: null,
      disposition: null
    }
  });
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: catalog([blockedSource]),
    gates: [gate()],
    now: NOW,
    receiptsValidated: true
  });

  assert.equal(snapshot.status, "blocked");
  assert.equal(snapshot.validUntil, null);
  assert.deepEqual(snapshot.blockedGateIds, ["enterprise-security-privacy"]);
  assert.deepEqual(snapshot.blockers, [{
    code: "authoritative-source-unavailable",
    gateId: "enterprise-security-privacy",
    sourceId: "nist-ssdf",
    reason: "monitor-manual-due"
  }]);
});

test("missing authoritative source and unvalidated receipts fail closed", () => {
  assert.throws(
    () => sourcePolicy.buildSourceReferenceSnapshot({
      catalog: catalog(),
      gates: [gate()],
      now: NOW,
      receiptsValidated: false
    }),
    /receipt chain validation is required/
  );
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: catalog(),
    gates: [gate("missing-source")],
    now: NOW,
    receiptsValidated: true
  });
  assert.deepEqual(snapshot.blockers, [{
    code: "authoritative-source-unavailable",
    gateId: "enterprise-security-privacy",
    sourceId: "missing-source",
    reason: "source-missing"
  }]);
});

test("source snapshot digest binds integrity while structural invariants reject rehashed contradictions", () => {
  const snapshot = sourcePolicy.buildSourceReferenceSnapshot({
    catalog: catalog(),
    gates: [gate()],
    now: NOW,
    receiptsValidated: true
  });
  assert.equal(sourcePolicy.assertSourceReferenceSnapshot(snapshot), snapshot);
  const forged = structuredClone(snapshot);
  forged.sources[0].reviewedDigest = `sha256:${"d".repeat(64)}`;
  assert.throws(
    () => sourcePolicy.assertSourceReferenceSnapshot(forged),
    /snapshotDigest does not match/
  );

  const rehashedInconsistent = structuredClone(snapshot);
  rehashedInconsistent.status = "blocked";
  const { snapshotDigest: ignored, ...core } = rehashedInconsistent;
  void ignored;
  rehashedInconsistent.snapshotDigest = canonicalDigest(core, "rehashed inconsistent snapshot");
  assert.throws(
    () => sourcePolicy.assertSourceReferenceSnapshot(rehashedInconsistent),
    /status does not match derived source eligibility/
  );
});

test("the materialized committed starter derives dependencies and stays blocked", async () => {
  const request = await starterRequest();
  const plan = await planDeliveryRun({ request }, { invocationRoot: ROOT });

  assert.equal(plan.domain.sourceGovernance.status, "blocked");
  assert.ok(plan.domain.sourceGovernance.requiredSourceIds.includes("nist-ssdf"));
  assert.ok(plan.domain.sourceGovernance.blockedGateIds.length > 0);
  assert.ok(plan.domain.sourceGovernance.resourceGovernance.dependencies.length > 0);
  const selectedResourceIds = new Set(plan.routing.selected.map((resource) => resource.id));
  for (const blocker of plan.domain.sourceGovernance.resourceGovernance.blockers) {
    assert.equal(selectedResourceIds.has(blocker.resourceId), false);
  }
  assert.equal(plan.readinessState, "blocked");
  assert.equal(plan.team.executionStatus, "blocked");
  assert.deepEqual(plan.team.assignments, []);
  assert.equal(plan.codex.executionStatus, "blocked");
  assert.equal(plan.claude.executionStatus, "blocked");
  assert.equal(plan.codex.sourceSnapshotDigest, plan.domain.sourceGovernance.snapshotDigest);
  assert.equal(plan.claude.sourceSnapshotDigest, plan.domain.sourceGovernance.snapshotDigest);
});

test("execution preparation rejects a forged authoritative source snapshot", async () => {
  const request = await starterRequest();
  const plan = structuredClone(await planDeliveryRun({ request }, { invocationRoot: ROOT }));
  plan.domain.sourceGovernance.sources[0].reason = "forged-current";
  assert.throws(
    () => prepareExecutionPlan(plan, { createdAt: NOW }),
    /blockers do not match dependencies/
  );
});

test("execution preparation requires the canonical source snapshot and adapter bindings", async () => {
  const request = await starterRequest();
  const missing = structuredClone(await planDeliveryRun({ request }, { invocationRoot: ROOT }));
  delete missing.domain.sourceGovernance;
  assert.throws(
    () => prepareExecutionPlan(missing, { createdAt: NOW }),
    /requires domain\.sourceGovernance/
  );

  const unbound = structuredClone(await planDeliveryRun({ request }, { invocationRoot: ROOT }));
  unbound.codex.sourceSnapshotDigest = null;
  assert.throws(
    () => prepareExecutionPlan(unbound, { createdAt: NOW }),
    /adapters must bind the authoritative source snapshot digest/
  );
});
