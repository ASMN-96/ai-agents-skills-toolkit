#!/usr/bin/env node
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { applySourceFreshness, deriveSourceReleaseAccounting } from "./ai-toolkit/source-governance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIGEST = `sha256:${"a".repeat(64)}`;
const canonicalCatalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
const latestCanonicalCheck = Math.max(...canonicalCatalog.sources.map((source) => Date.parse(source.monitor.checkedAt)));
const NOW = new Date(latestCanonicalCheck + 1_000).toISOString();
const domainPacksRegistry = JSON.parse(readFileSync(path.join(ROOT, "registries", "domain-packs.registry.json"), "utf8"));

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "source-freshness-sync-"));
  cpSync(path.join(ROOT, "sources"), path.join(root, "sources"), { recursive: true });
  mkdirSync(path.join(root, "registries"), { recursive: true });
  cpSync(
    path.join(ROOT, "registries", "domain-packs.registry.json"),
    path.join(root, "registries", "domain-packs.registry.json")
  );
  return root;
}

function refreshReportAccounting(report, catalog) {
  const accounting = deriveSourceReleaseAccounting({
    catalog,
    domainPacksRegistry,
    freshnessReport: report
  });
  report.sourceCount = accounting.sourceCount;
  report.monitorCounts = accounting.monitorCounts;
  report.actionableCount = accounting.actionableCount;
  report.actionableCountsByScope = accounting.actionableCountsByScope;
  report.releaseScope = {
    supportedPackIds: accounting.supportedPackIds,
    releaseBlockingSourceCount: accounting.releaseBlockingSourceCount,
    releaseBlockingSourceIds: accounting.releaseBlockingSourceIds,
    releaseNonblockingActionableCount: accounting.releaseNonblockingActionableCount
  };
  return report;
}

function emptyCapabilityImpact(sourceId) {
  return {
    sourceId,
    staleInputIds: [],
    synthesisDecisionIds: [],
    capabilityIds: [],
    artifactRefs: [],
    consumerRefs: [],
    compiledOutputs: [],
    mirrorOutputs: [],
    evaluationRefs: [],
    portfolioActionable: false,
    releaseBlocking: false,
    blockingResourceIds: [],
    reasons: []
  };
}

function liveReport(catalog, checkedAt = NOW) {
  let changedAssigned = false;
  const sources = catalog.sources.map((source) => {
    const changed = !changedAssigned && source.sourceType === "github-repo";
    if (changed) changedAssigned = true;
    const monitorState = changed
      ? "CHANGED"
      : source.sourceType === "github-repo"
        ? "CHECK_FAILED"
        : "MANUAL_DUE";
    return {
      sourceId: source.id,
      identityKey: source.identityKey,
      scope: source.scope,
      monitorState,
      observedRevision: changed ? { kind: "git-sha", value: "f".repeat(40) } : null,
      contentDigest: changed ? DIGEST : null,
      checkedAt,
      missingCurrentReview: true,
      catalogAffectedArtifacts: [...source.affectedArtifacts].sort(),
      capabilityImpact: emptyCapabilityImpact(source.id),
      evidence: {
        observationMode: "live-read-only",
        legacyStatus: changed ? "CHANGED_HIGH_RISK" : "REVIEW_METADATA_MISSING",
        sourceType: source.sourceType,
        sourceUrl: source.sourceUrl,
        digestBasis: changed ? "git-revision-identity" : "not-observed",
        latestCommitDate: null,
        releaseSignal: "none",
        licenseSignal: "not-reviewed",
        notes: changed ? "Exact upstream revision changed." : "Review metadata remains unavailable.",
        watchedPathSignals: []
      }
    };
  });
  const report = {
    schemaVersion: "2.1.0",
    catalogIdentity: {
      schemaVersion: catalog.schemaVersion,
      catalogId: catalog.catalogId,
      sourceCount: catalog.sources.length
    },
    checkedAt,
    mode: "live",
    readOnly: true,
    disclaimer: "Observation only; no review, activation, install, or upstream execution.",
    capabilityImpactWarnings: [],
    sources
  };
  return refreshReportAccounting(report, catalog);
}

function legacyReport(catalog, checkedAt = NOW) {
  const report = liveReport(catalog, checkedAt);
  delete report.capabilityImpactWarnings;
  for (const source of report.sources) {
    delete source.catalogAffectedArtifacts;
    delete source.capabilityImpact;
  }
  return report;
}

test("freshness sync accepts legacy 2.1 reports by normalizing provenance-only defaults", async () => {
  const root = createFixture();
  try {
    const catalog = JSON.parse(readFileSync(path.join(root, "sources", "source-watchlist.json"), "utf8"));
    writeFileSync(path.join(root, "legacy-freshness.json"), `${JSON.stringify(legacyReport(catalog), null, 2)}\n`, "utf8");
    const result = await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "legacy-freshness.json",
      now: NOW
    });
    assert.equal(result.mode, "dry-run");
    assert.equal(result.sourceCount, catalog.sources.length);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness sync keeps current 2.1 provenance fields strict", async () => {
  const root = createFixture();
  try {
    const catalog = JSON.parse(readFileSync(path.join(root, "sources", "source-watchlist.json"), "utf8"));
    const report = liveReport(catalog);
    report.sources[0].capabilityImpact.unexpected = true;
    writeFileSync(path.join(root, "invalid-freshness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await assert.rejects(
      applySourceFreshness({ repositoryRoot: root, freshnessReport: "invalid-freshness.json", now: NOW }),
      /unexpected.*capabilityImpact/i
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness sync is dry-run by default and confirm-write updates only monitor evidence", async () => {
  const root = createFixture();
  try {
    const catalogPath = path.join(root, "sources", "source-watchlist.json");
    const originalText = readFileSync(catalogPath, "utf8");
    const original = JSON.parse(originalText);
    const report = liveReport(original);
    const reportPath = path.join(root, "freshness.json");
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    const dryRun = await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      now: NOW
    });
    assert.equal(dryRun.mode, "dry-run");
    assert.equal(dryRun.runtimePosturesChanged, false);
    assert.equal(dryRun.reviewsApproved, false);
    assert.equal(readFileSync(catalogPath, "utf8"), originalText);

    const applied = await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      mode: "confirm-write",
      now: NOW
    });
    assert.equal(applied.mode, "confirm-write");
    assert.equal(applied.generatedMirrorsUpdated, false);
    const updated = JSON.parse(readFileSync(catalogPath, "utf8"));
    const changed = updated.sources.find((source) => source.monitor.state === "CHANGED");
    assert.ok(changed);
    assert.equal(changed.monitor.observedRevision.value, "f".repeat(40));
    assert.equal(changed.monitor.contentDigest, DIGEST);
    assert.equal(changed.monitor.checkedAt, report.checkedAt);
    assert.equal(changed.review.state, "QUARANTINED");
    assert.deepEqual(
      updated.sources.map((source) => [source.id, source.runtimePosture]),
      original.sources.map((source) => [source.id, source.runtimePosture])
    );
    assert.equal(updated.sources.some((source) => source.review.state === "REVIEWED_CURRENT"), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness sync persists a structured failed-check reason code without approving review or runtime", async () => {
  const root = createFixture();
  try {
    const catalogPath = path.join(root, "sources", "source-watchlist.json");
    const original = JSON.parse(readFileSync(catalogPath, "utf8"));
    const report = liveReport(original);
    const failed = report.sources.find((entry) => entry.monitorState === "CHECK_FAILED");
    const source = original.sources.find((entry) => entry.id === failed.sourceId);
    failed.comparisonRevision = source.monitor.observedRevision.value;
    failed.comparisonBasis = "PRIOR_MONITOR_OBSERVATION";
    failed.reasonCode = "REMOTE_CHECK_FAILED";
    const reportPath = path.join(root, "freshness.json");
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      mode: "confirm-write",
      now: NOW
    });

    const updated = JSON.parse(readFileSync(catalogPath, "utf8"));
    const updatedSource = updated.sources.find((entry) => entry.id === failed.sourceId);
    assert.equal(updatedSource.monitor.failureReason, "REMOTE_CHECK_FAILED");
    assert.equal(updatedSource.review.state, "QUARANTINED");
    assert.equal(updatedSource.runtimePosture, source.runtimePosture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness sync accepts receipt-backed manual CURRENT evidence without changing runtime posture", async () => {
  const root = createFixture();
  try {
    const catalogPath = path.join(root, "sources", "source-watchlist.json");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    const manual = catalog.sources.find((source) => source.sourceType === "manual-reviewed-doc");
    const revision = { kind: "content-digest", value: DIGEST };
    manual.monitor = {
      state: "CURRENT",
      checkedAt: NOW,
      observedRevision: revision,
      contentDigest: DIGEST,
      failureReason: null
    };
    manual.review = {
      state: "REVIEWED_CURRENT",
      currentReceipt: `sources/reviews/${manual.id}/${DIGEST.slice("sha256:".length)}.json`,
      previousReceipt: null,
      receiptDigest: `sha256:${"b".repeat(64)}`,
      previousReceiptDigest: null,
      reviewedRevision: revision,
      reviewedDigest: DIGEST,
      reviewedAt: NOW,
      expiresAt: "2026-07-31T07:00:00.000Z",
      disposition: "SYNCED_REFERENCE"
    };
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    const report = liveReport(catalog);
    const observation = report.sources.find((entry) => entry.sourceId === manual.id);
    Object.assign(observation, {
      monitorState: "CURRENT",
      observedRevision: revision,
      contentDigest: DIGEST,
      comparisonRevision: DIGEST,
      comparisonBasis: "MANUAL_REVIEW_RECEIPT",
      reasonCode: "MANUAL_CURRENT",
      missingCurrentReview: false,
      evidence: {
        ...observation.evidence,
        observationMode: "manual-receipt-only",
        digestBasis: "manual-review-receipt"
      }
    });
    refreshReportAccounting(report, catalog);
    const reportPath = path.join(root, "freshness.json");
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      mode: "confirm-write",
      now: NOW
    });

    const updated = JSON.parse(readFileSync(catalogPath, "utf8"));
    const updatedManual = updated.sources.find((source) => source.id === manual.id);
    assert.equal(updatedManual.monitor.state, "CURRENT");
    assert.deepEqual(updatedManual.monitor.observedRevision, revision);
    assert.equal(updatedManual.monitor.contentDigest, DIGEST);
    assert.equal(updatedManual.review.state, "REVIEWED_CURRENT");
    assert.equal(updatedManual.runtimePosture, manual.runtimePosture);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness sync rejects mock evidence and traversal", async () => {
  const root = createFixture();
  try {
    const catalog = JSON.parse(readFileSync(path.join(root, "sources", "source-watchlist.json"), "utf8"));
    const report = liveReport(catalog);
    report.mode = "mock";
    writeFileSync(path.join(root, "freshness.json"), `${JSON.stringify(report)}\n`, "utf8");
    await assert.rejects(
      applySourceFreshness({ repositoryRoot: root, freshnessReport: "freshness.json", now: NOW }),
      /mock freshness reports are not valid governance evidence/
    );
    await assert.rejects(
      applySourceFreshness({ repositoryRoot: root, freshnessReport: "../freshness.json", now: NOW }),
      /safe repository-relative.*path/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness sync quarantines an expired retained receipt without dropping its immutable pointer", async () => {
  const root = createFixture();
  try {
    const catalogPath = path.join(root, "sources", "source-watchlist.json");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    const reviewed = catalog.sources.find((source) => source.sourceType === "github-repo");
    const revision = { kind: "git-sha", value: "e".repeat(40) };
    reviewed.monitor = {
      state: "CURRENT",
      checkedAt: "2026-07-17T07:00:00.000Z",
      observedRevision: revision,
      contentDigest: DIGEST,
      failureReason: null
    };
    reviewed.review = {
      state: "REVIEWED_CURRENT",
      currentReceipt: `sources/reviews/${reviewed.id}/${revision.value}.json`,
      previousReceipt: null,
      receiptDigest: `sha256:${"b".repeat(64)}`,
      previousReceiptDigest: null,
      reviewedRevision: revision,
      reviewedDigest: DIGEST,
      reviewedAt: "2026-07-01T07:00:00.000Z",
      expiresAt: "2026-07-15T07:00:00.000Z",
      disposition: "SYNCED_REFERENCE"
    };
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    const report = liveReport(catalog);
    writeFileSync(path.join(root, "freshness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

    await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      mode: "confirm-write",
      now: NOW
    });

    const updated = JSON.parse(readFileSync(catalogPath, "utf8"));
    const transitioned = updated.sources.find((source) => source.id === reviewed.id);
    assert.equal(transitioned.review.state, "QUARANTINED");
    assert.equal(transitioned.review.currentReceipt, reviewed.review.currentReceipt);
    assert.equal(transitioned.review.receiptDigest, reviewed.review.receiptDigest);
    assert.equal(transitioned.review.expiresAt, reviewed.review.expiresAt);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("freshness and review share one mutation lock and recover only a provably stale owner", async () => {
  const root = createFixture();
  try {
    const catalogPath = path.join(root, "sources", "source-watchlist.json");
    const originalText = readFileSync(catalogPath, "utf8");
    const report = liveReport(JSON.parse(originalText));
    writeFileSync(path.join(root, "freshness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
    const lockPath = path.join(root, ".source-governance-mutation.lock");
    writeFileSync(lockPath, `${JSON.stringify({
      schemaVersion: "1.0.0",
      operation: "source-review",
      ownerPid: process.pid,
      token: "review-operation-holds-shared-lock",
      createdAt: NOW
    })}\n`, "utf8");

    await assert.rejects(
      applySourceFreshness({
        repositoryRoot: root,
        freshnessReport: "freshness.json",
        mode: "confirm-write",
        now: NOW
      }),
      /source governance mutation lock.*source-review/i
    );
    assert.equal(readFileSync(catalogPath, "utf8"), originalText);

    rmSync(lockPath);
    writeFileSync(lockPath, "{\"held\":true}\n", "utf8");
    await assert.rejects(
      applySourceFreshness({
        repositoryRoot: root,
        freshnessReport: "freshness.json",
        mode: "confirm-write",
        now: NOW
      }),
      /source governance mutation lock.*unverified owner/i
    );
    assert.equal(readFileSync(catalogPath, "utf8"), originalText);

    rmSync(lockPath);
    writeFileSync(lockPath, `${JSON.stringify({
      schemaVersion: "1.0.0",
      operation: "source-review",
      ownerPid: 2_147_483_647,
      token: "crashed-review-operation",
      createdAt: "2026-07-16T00:00:00.000Z"
    })}\n`, "utf8");
    const recovered = await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      mode: "confirm-write",
      now: NOW
    });
    assert.equal(recovered.mode, "confirm-write");
    assert.equal(existsSync(lockPath), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
