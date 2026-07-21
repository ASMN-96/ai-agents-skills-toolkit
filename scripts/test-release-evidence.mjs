#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  CANONICAL_TEXT_DIGEST_MODE,
  canonicalTextSha256
} from "./ai-toolkit/kernel/canonical-digest.mjs";
import {
  formatReleaseEvidenceSummary,
  renderStatusRuntimeBoundaryLines,
  renderReleaseEvidenceSummaryBlock,
  validateArtifactDigests,
  validateRepositoryState,
  validateReleaseEvidence
} from "./validate-v0-3-release-evidence.mjs";
import * as releaseEvidenceModule from "./validate-v0-3-release-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATOR = path.join(ROOT, "scripts", "validate-v0-3-release-evidence.mjs");
const RELEASE_GATE = path.join(ROOT, "scripts", "run-release-gate.mjs");
const ARTIFACT_PATHS = Object.freeze({
  sourceCatalog: "sources/source-watchlist.json",
  freshnessReport: "docs/SOURCE_FRESHNESS_REPORT.json",
  agentRegistry: "registries/agents.registry.json",
  domainPacksRegistry: "registries/domain-packs.registry.json",
  benchmarkFixture: "evals/routing/enterprise-delivery-benchmark.json",
  embeddedManifest: ".ai-toolkit/manifest.json"
});

function git(root, args) {
  const hooksPath = path.join(root, ".git-test-hooks");
  mkdirSync(hooksPath, { recursive: true });
  const result = spawnSync("git", [
    "-c", `core.hooksPath=${hooksPath}`,
    "-c", "commit.gpgsign=false",
    "-c", "user.name=Toolkit Test",
    "-c", "user.email=toolkit-test@example.invalid",
    ...args
  ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "0",
      GIT_CONFIG_GLOBAL: path.join(root, ".gitconfig-isolated"),
      GIT_CONFIG_NOSYSTEM: "1"
    },
    timeout: 15_000,
    windowsHide: true
  });
  assert.equal(result.error, undefined, result.error?.message ?? "git fixture process failed to start");
  assert.equal(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return result.stdout.trim();
}

function writeArtifactFixture(root, { pendingEmbeddedManifest = false } = {}) {
  const artifacts = {};
  for (const [id, relativePath] of Object.entries(ARTIFACT_PATHS)) {
    const filePath = path.join(root, relativePath);
    const contents = `{\n  "artifact": "${id}"\n}\n`;
    if (!(id === "embeddedManifest" && pendingEmbeddedManifest)) {
      mkdirSync(path.dirname(filePath), { recursive: true });
      writeFileSync(filePath, contents, "utf8");
    }
    artifacts[id] = {
      path: relativePath,
      sha256: id === "embeddedManifest" && pendingEmbeddedManifest
        ? null
        : canonicalTextSha256(Buffer.from(contents, "utf8")),
      ...(id === "embeddedManifest"
        ? { state: pendingEmbeddedManifest ? "regeneration-pending" : "generated-current" }
        : {})
    };
  }
  return artifacts;
}

test("release artifact digests are UTF-8 LF-normalized and otherwise content-sensitive", () => {
  const lf = "{\n  \"label\": \"café\",\n  \"enabled\": true\n}\n";
  const crlf = lf.replace(/\n/gu, "\r\n");
  const cr = lf.replace(/\n/gu, "\r");
  const changed = lf.replace("true", "false");
  const fixture = mkdtempSync(path.join(tmpdir(), "release-artifact-digest-"));
  try {
    writeFileSync(path.join(fixture, "lf.json"), lf, "utf8");
    writeFileSync(path.join(fixture, "crlf.json"), crlf, "utf8");
    writeFileSync(path.join(fixture, "cr.json"), cr, "utf8");
    writeFileSync(path.join(fixture, "changed.json"), changed, "utf8");
    const digest = canonicalTextSha256(Buffer.from(lf, "utf8"));

    assert.equal(CANONICAL_TEXT_DIGEST_MODE, "sha256-utf8-lf-v1");
    assert.equal(canonicalTextSha256(Buffer.from(crlf, "utf8")), digest);
    assert.equal(canonicalTextSha256(Buffer.from(cr, "utf8")), digest);
    assert.notEqual(canonicalTextSha256(Buffer.from(changed, "utf8")), digest);
    const artifacts = writeArtifactFixture(fixture);
    const catalogPath = path.join(fixture, ARTIFACT_PATHS.sourceCatalog);
    writeFileSync(catalogPath, crlf, "utf8");
    artifacts.sourceCatalog.sha256 = digest;
    assert.doesNotThrow(() => validateArtifactDigests(
      fixture,
      CANONICAL_TEXT_DIGEST_MODE,
      artifacts,
      "blocked"
    ));
    assert.throws(
      () => validateArtifactDigests(fixture, "sha256-raw-bytes-v1", artifacts, "blocked"),
      /artifact-digest-mode/u
    );
    writeFileSync(catalogPath, changed, "utf8");
    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, artifacts, "blocked"),
      /artifact-sourceCatalog-digest/u
    );
    const pending = writeArtifactFixture(fixture, { pendingEmbeddedManifest: true });
    assert.doesNotThrow(() => validateArtifactDigests(
      fixture,
      CANONICAL_TEXT_DIGEST_MODE,
      pending,
      "blocked"
    ));
    assert.throws(
      () => validateArtifactDigests(
        fixture,
        CANONICAL_TEXT_DIGEST_MODE,
        pending,
        "ready"
      ),
      /ready-state-artifact-embeddedManifest-pending/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("structured release blockers are exactly derived and retain the ordered compatibility projection", () => {
  const { deriveReleaseBlockerAccounting, validateReleaseBlockerAccounting } = releaseEvidenceModule;
  assert.equal(typeof deriveReleaseBlockerAccounting, "function");
  assert.equal(typeof validateReleaseBlockerAccounting, "function");
  const ready = {
    releaseState: "ready",
    repository: { reviewedMainCommit: "a".repeat(40), worktreeState: "clean" },
    artifacts: { embeddedManifest: { state: "generated-current", sha256: "b".repeat(64) } },
    sourceFreshness: {
      supportedPackIds: ["enterprise-core"],
      releaseBlockingSourceCount: 0,
      releaseBlockingSourceIds: []
    },
    runtime: { hostExecutionBridge: "available", trustedReadinessCeiling: "blocked" },
    benchmark: {
      staticGatePassed: true,
      observedEnterpriseCore: {
        status: "observed",
        evidencePath: "docs/observed-enterprise-core-evidence.json",
        sha256: "c".repeat(64),
        repositoryCommit: "d".repeat(40),
        ownerReview: {
          ownerId: "owner@example.invalid",
          decision: "approved",
          reviewedAt: "2026-07-21T00:00:00.000Z"
        }
      },
      notMeasured: { nativePilots: { status: "measured" } }
    },
    platformPacks: [],
    warnings: [],
    approvals: {
      sourceApproverIdentityRecorded: true,
      reviewedMainCommitApproved: true,
      tagAuthorized: true,
      releaseAuthorized: true
    }
  };
  assert.deepEqual(deriveReleaseBlockerAccounting(ready, { generatedArtifactDrift: false }), []);

  const blocked = structuredClone(ready);
  blocked.releaseState = "blocked";
  blocked.sourceFreshness.releaseBlockingSourceCount = 2;
  blocked.sourceFreshness.releaseBlockingSourceIds = ["a-source", "z-source"];
  blocked.runtime.hostExecutionBridge = "absent";
  blocked.benchmark.staticGatePassed = false;
  blocked.benchmark.observedEnterpriseCore = {
    status: "notMeasured",
    evidencePath: null,
    sha256: null,
    repositoryCommit: null,
    ownerReview: null
  };
  blocked.platformPacks = [{
    id: "supported-platform",
    lifecycle: "supported",
    nativeEvidenceStatus: "absent",
    releaseBlocking: true
  }];
  blocked.warnings = ["release-warning"];
  blocked.repository.reviewedMainCommit = null;
  blocked.artifacts.embeddedManifest = { state: "regeneration-pending", sha256: null };
  blocked.approvals = {
    sourceApproverIdentityRecorded: false,
    reviewedMainCommitApproved: false,
    tagAuthorized: false,
    releaseAuthorized: false
  };
  const accounting = deriveReleaseBlockerAccounting(blocked, { generatedArtifactDrift: true });
  const projection = accounting.map((entry) => entry.id);
  assert.deepEqual(projection, [
    "source-governance-actionable",
    "source-review-approver-unregistered",
    "runtime-host-bridge-unavailable",
    "static-benchmark-thresholds-failed",
    "enterprise-core-observed-evidence-not-measured",
    "supported-platform-native-evidence-missing",
    "reviewed-clean-main-commit-unavailable",
    "generated-artifact-drift",
    "tag-and-release-authorization-absent",
    "unwaived-release-warnings"
  ]);
  assert.deepEqual(accounting[0].dependencyIds, ["a-source", "z-source"]);
  assert.deepEqual(
    validateReleaseBlockerAccounting({
      ...blocked,
      releaseBlockerAccounting: accounting,
      releaseBlockers: projection
    }, { generatedArtifactDrift: true }),
    accounting
  );
  assert.throws(
    () => validateReleaseBlockerAccounting({
      ...blocked,
      releaseBlockerAccounting: [...accounting, accounting[0]],
      releaseBlockers: [...projection, projection[0]]
    }, { generatedArtifactDrift: true }),
    /duplicate|exact derivation/u
  );
  assert.throws(
    () => validateReleaseBlockerAccounting({
      ...blocked,
      releaseBlockerAccounting: accounting,
      releaseBlockers: [...projection].reverse()
    }, { generatedArtifactDrift: true }),
    /compatibility.projection/u
  );
  assert.throws(
    () => validateReleaseBlockerAccounting({
      ...ready,
      releaseState: "blocked",
      releaseBlockerAccounting: [],
      releaseBlockers: []
    }, { generatedArtifactDrift: false }),
    /blocked-state-has-no-blockers/u
  );
});

function releaseReadyEvidence() {
  return {
    candidateVersion: "0.3.0",
    controlledRelease: "0.2.5",
    releaseState: "ready",
    repository: { reviewedMainCommit: "a".repeat(40), worktreeState: "clean" },
    artifacts: { embeddedManifest: { state: "generated-current", sha256: "b".repeat(64) } },
    sourceFreshness: {
      supportedPackIds: ["enterprise-core"],
      actionableSources: 0,
      releaseBlockingSourceCount: 0,
      releaseBlockingSourceIds: [],
      releaseNonblockingActionableCount: 0,
      approvedReceiptCount: 0
    },
    runtime: {
      canonicalSkills: 0,
      nativeAgentDefinitions: 0,
      compiledFallbacks: 0,
      hostExecutionBridge: "available",
      trustedReadinessCeiling: "blocked"
    },
    benchmark: {
      staticGatePassed: true,
      observedEnterpriseCore: {
        status: "observed",
        evidencePath: "docs/observed-enterprise-core-evidence.json",
        sha256: "c".repeat(64),
        repositoryCommit: "d".repeat(40),
        ownerReview: {
          ownerId: "owner@example.invalid",
          decision: "approved",
          reviewedAt: "2026-07-21T00:00:00.000Z"
        }
      },
      notMeasured: { nativePilots: { status: "measured" } },
      measured: {
        mandatoryCompetencyCoverage: 1,
        domainGateCoverage: 1,
        exactGoldenRouting: 1,
        medianInputTokenReduction: 0.5
      }
    },
    platformPacks: [],
    warnings: [],
    advisories: {
      optionalSources: "Optional-source limitations remain outside the enterprise-core release scope.",
      previewPacks: "Preview platform packs lack native evidence and remain preview.",
      hostExecutionBridge: "The fail-closed bridge contract cannot yield trusted readiness."
    },
    approvals: {
      sourceApproverIdentityRecorded: true,
      reviewedMainCommitApproved: true,
      tagAuthorized: true,
      releaseAuthorized: true
    }
  };
}

test("preview bridge contracts are publication-compatible but cap trusted readiness", () => {
  const {
    deriveReleaseBlockerAccounting,
    validateReleaseBlockerAccounting,
    validateRuntimeTrustBoundary
  } = releaseEvidenceModule;
  assert.equal(typeof validateRuntimeTrustBoundary, "function");
  const previewContract = releaseReadyEvidence();
  previewContract.runtime = {
    hostExecutionBridge: "preview-contract",
    trustedReadinessCeiling: "blocked"
  };

  assert.doesNotThrow(() => validateRuntimeTrustBoundary(previewContract.runtime));
  const accounting = deriveReleaseBlockerAccounting(
    previewContract,
    { generatedArtifactDrift: false }
  );
  assert.equal(accounting.some((entry) => entry.id === "runtime-host-bridge-unavailable"), false);
  assert.doesNotThrow(() => validateReleaseBlockerAccounting({
    ...previewContract,
    releaseBlockerAccounting: accounting,
    releaseBlockers: accounting.map((entry) => entry.id)
  }, { generatedArtifactDrift: false }));
  assert.throws(
    () => validateRuntimeTrustBoundary({
      hostExecutionBridge: "preview-contract",
      trustedReadinessCeiling: "trusted"
    }),
    /preview-contract-trusted-readiness-ceiling/u
  );
});

test("release evidence cannot self-declare trusted readiness for an available host bridge", () => {
  const { validateRuntimeTrustBoundary } = releaseEvidenceModule;
  assert.throws(
    () => validateRuntimeTrustBoundary({
      hostExecutionBridge: "available",
      trustedReadinessCeiling: "trusted"
    }),
    /release-evidence-cannot-establish-trusted-readiness/u
  );
  assert.doesNotThrow(() => validateRuntimeTrustBoundary({
    hostExecutionBridge: "available",
    trustedReadinessCeiling: "blocked"
  }));
});

test("observed enterprise-core evidence rejects arbitrary local JSON despite a declared digest", () => {
  const { validateObservedEnterpriseCoreEvidenceRecord } = releaseEvidenceModule;
  assert.equal(typeof validateObservedEnterpriseCoreEvidenceRecord, "function");
  const fixture = mkdtempSync(path.join(tmpdir(), "release-observed-evidence-"));
  try {
    const docs = path.join(fixture, "docs");
    mkdirSync(docs, { recursive: true });
    const ownerReview = {
      ownerId: "owner@example.invalid",
      decision: "approved",
      reviewedAt: "2026-07-21T00:00:00.000Z"
    };
    const arbitraryPath = path.join(docs, "arbitrary.json");
    writeFileSync(arbitraryPath, "{\n  \"claim\": \"observed\"\n}\n", "utf8");
    const arbitrary = {
      status: "observed",
      evidencePath: "docs/arbitrary.json",
      sha256: canonicalTextSha256(readFileSync(arbitraryPath)),
      repositoryCommit: "a".repeat(40),
      ownerReview
    };
    assert.throws(
      () => validateObservedEnterpriseCoreEvidenceRecord(fixture, arbitrary),
      /observed-enterprise-core-evidence-semantic/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("platform evidence lifecycle must exactly match the canonical registry projection", () => {
  const { validatePlatformPackEvidence } = releaseEvidenceModule;
  const registry = {
    packs: [
      { id: "enterprise-core", kind: "core", maturity: "supported" },
      { id: "ios", kind: "platform", maturity: "preview" }
    ]
  };
  assert.throws(
    () => validatePlatformPackEvidence([{
      id: "ios",
      lifecycle: "supported",
      nativeEvidenceStatus: "observed",
      releaseBlocking: false
    }], registry),
    /platform-pack-lifecycle-mismatch/u
  );
});

test("release artifact integrity includes the canonical platform-pack registry", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-domain-pack-artifact-"));
  try {
    const artifacts = writeArtifactFixture(fixture);
    const pathName = "registries/domain-packs.registry.json";
    const filePath = path.join(fixture, pathName);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, "{\n  \"registryType\": \"domain-packs\"\n}\n", "utf8");
    artifacts.domainPacksRegistry = {
      path: pathName,
      sha256: canonicalTextSha256(readFileSync(filePath))
    };
    assert.doesNotThrow(() => validateArtifactDigests(
      fixture,
      CANONICAL_TEXT_DIGEST_MODE,
      artifacts,
      "blocked"
    ));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("native evidence blocks supported platform packs but remains advisory for preview packs", () => {
  const { deriveReleaseBlockerAccounting } = releaseEvidenceModule;
  const preview = releaseReadyEvidence();
  preview.platformPacks = [{
    id: "ios",
    lifecycle: "preview",
    nativeEvidenceStatus: "absent",
    releaseBlocking: false
  }];
  assert.equal(
    deriveReleaseBlockerAccounting(preview, { generatedArtifactDrift: false })
      .some((entry) => entry.id === "supported-platform-native-evidence-missing"),
    false
  );

  const supported = structuredClone(preview);
  supported.platformPacks = [{
    id: "enterprise-web",
    lifecycle: "supported",
    nativeEvidenceStatus: "absent",
    releaseBlocking: true
  }];
  assert.equal(
    deriveReleaseBlockerAccounting(supported, { generatedArtifactDrift: false })
      .some((entry) => entry.id === "supported-platform-native-evidence-missing"),
    true
  );
});

test("missing observed enterprise-core evidence blocks the v0.3 candidate", () => {
  const { deriveReleaseBlockerAccounting } = releaseEvidenceModule;
  const evidence = releaseReadyEvidence();
  evidence.benchmark.observedEnterpriseCore = {
    status: "notMeasured",
    evidencePath: null,
    sha256: null,
    repositoryCommit: null,
    ownerReview: null
  };
  assert.equal(
    deriveReleaseBlockerAccounting(evidence, { generatedArtifactDrift: false })
      .some((entry) => entry.id === "enterprise-core-observed-evidence-not-measured"),
    true
  );
});

test("release readiness is prohibited while release warnings remain unwaived", () => {
  const { validateReleaseBlockerAccounting } = releaseEvidenceModule;
  const evidence = releaseReadyEvidence();
  evidence.warnings = ["release-warning"];
  const accounting = releaseEvidenceModule.deriveReleaseBlockerAccounting(
    evidence,
    { generatedArtifactDrift: false }
  );
  assert.ok(accounting.some((entry) => entry.id === "unwaived-release-warnings"));
  assert.throws(
    () => validateReleaseBlockerAccounting({
      ...evidence,
      releaseBlockerAccounting: accounting,
      releaseBlockers: accounting.map((entry) => entry.id)
    }, { generatedArtifactDrift: false }),
    /ready-state-has-blockers|unwaived-release-warnings/u
  );
});

test("release summaries keep optional-source, preview-pack, and bridge limitations visible as advisories", () => {
  const summary = renderReleaseEvidenceSummaryBlock(releaseReadyEvidence());
  assert.match(summary, /Advisories:/u);
  assert.match(summary, /native agent definitions \(native visibility unobserved\)/u);
  assert.doesNotMatch(summary, /native agents, \d+ compiled fallbacks/u);
  assert.match(summary, /Optional-source limitations/u);
  assert.match(summary, /Preview platform packs/u);
  assert.match(summary, /fail-closed bridge contract/u);
});

test("generated artifact drift is recomputed from canonical mirror and manifest bytes", () => {
  const { inspectGeneratedArtifactState } = releaseEvidenceModule;
  assert.equal(typeof inspectGeneratedArtifactState, "function");
  const fixture = mkdtempSync(path.join(tmpdir(), "release-generated-drift-"));
  try {
    mkdirSync(path.join(fixture, "sources"), { recursive: true });
    mkdirSync(path.join(fixture, ".ai-toolkit", "sources"), { recursive: true });
    const canonical = "{\n  \"schemaVersion\": \"2.1.0\"\n}\n";
    const stale = "{\n  \"schemaVersion\": \"2.0.0\"\n}\n";
    writeFileSync(path.join(fixture, "sources", "source-watchlist.json"), canonical, "utf8");
    writeFileSync(path.join(fixture, ".ai-toolkit", "sources", "watchlist.json"), stale, "utf8");
    writeFileSync(path.join(fixture, ".ai-toolkit", "manifest.json"), `${JSON.stringify({
      mirrors: [{
        source: "sources/source-watchlist.json",
        target: ".ai-toolkit/sources/watchlist.json",
        mode: "byte-identical",
        sha256: "0".repeat(64),
        sourceSha256: "0".repeat(64),
        targetSha256: "0".repeat(64)
      }],
      generatedArtifacts: [{
        path: ".ai-toolkit/sources/watchlist.json",
        sha256: "0".repeat(64)
      }]
    }, null, 2)}\n`, "utf8");

    assert.equal(inspectGeneratedArtifactState(fixture).generatedArtifactDrift, true);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("release artifacts require the exact canonical IDs and paths", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-artifact-contract-"));
  try {
    const artifacts = writeArtifactFixture(fixture);
    const missing = structuredClone(artifacts);
    delete missing.freshnessReport;
    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, missing, "blocked"),
      /artifact-ids/u
    );

    const extra = structuredClone(artifacts);
    extra.unreviewed = { path: "unreviewed.json", sha256: "0".repeat(64) };
    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, extra, "blocked"),
      /artifact-ids/u
    );

    const swapped = structuredClone(artifacts);
    [swapped.sourceCatalog.path, swapped.freshnessReport.path] = [
      swapped.freshnessReport.path,
      swapped.sourceCatalog.path
    ];
    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, swapped, "blocked"),
      /artifact-sourceCatalog-path/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("release artifact state cannot contradict its digest or release state", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-artifact-state-"));
  try {
    const current = writeArtifactFixture(fixture);
    assert.doesNotThrow(() => validateArtifactDigests(
      fixture,
      CANONICAL_TEXT_DIGEST_MODE,
      current,
      "ready"
    ));

    const digestPending = structuredClone(current);
    digestPending.embeddedManifest.state = "regeneration-pending";
    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, digestPending, "blocked"),
      /artifact-embeddedManifest-state-contradiction/u
    );

    const missingCurrent = writeArtifactFixture(fixture, { pendingEmbeddedManifest: true });
    missingCurrent.embeddedManifest.state = "generated-current";
    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, missingCurrent, "blocked"),
      /artifact-embeddedManifest-state-contradiction/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("release artifact reads reject a nested external junction or symlink", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-artifact-link-root-"));
  const outside = mkdtempSync(path.join(tmpdir(), "release-artifact-link-outside-"));
  try {
    const artifacts = writeArtifactFixture(fixture);
    const catalogContents = readFileSync(path.join(fixture, ARTIFACT_PATHS.sourceCatalog));
    rmSync(path.join(fixture, "sources"), { recursive: true, force: true });
    mkdirSync(path.join(outside, "sources"), { recursive: true });
    writeFileSync(path.join(outside, "sources", "source-watchlist.json"), catalogContents);
    symlinkSync(
      path.join(outside, "sources"),
      path.join(fixture, "sources"),
      process.platform === "win32" ? "junction" : "dir"
    );

    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, artifacts, "blocked"),
      /linked|reparse/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("release artifact reads reject a final hard-linked file", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-artifact-hardlink-"));
  try {
    const artifacts = writeArtifactFixture(fixture);
    const catalogPath = path.join(fixture, ARTIFACT_PATHS.sourceCatalog);
    const backingPath = path.join(fixture, "catalog-backing.json");
    writeFileSync(backingPath, readFileSync(catalogPath));
    rmSync(catalogPath);
    linkSync(backingPath, catalogPath);

    assert.throws(
      () => validateArtifactDigests(fixture, CANONICAL_TEXT_DIGEST_MODE, artifacts, "blocked"),
      /hard-linked/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("release evidence path rejects a linked evidence file before parsing", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-evidence-linked-"));
  try {
    mkdirSync(path.join(fixture, "docs"), { recursive: true });
    const backingPath = path.join(fixture, "evidence-backing.json");
    const evidencePath = path.join(fixture, "docs", "V0_3_0_RELEASE_EVIDENCE.json");
    writeFileSync(backingPath, "{}\n", "utf8");
    linkSync(backingPath, evidencePath);

    await assert.rejects(
      validateReleaseEvidence({ root: fixture, evidencePath }),
      /hard-linked/u
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("STATUS runtime inventory is derived from the release evidence record", () => {
  const evidence = JSON.parse(readFileSync(path.join(ROOT, "docs", "V0_3_0_RELEASE_EVIDENCE.json"), "utf8"));
  const status = readFileSync(path.join(ROOT, "STATUS.md"), "utf8");
  for (const line of renderStatusRuntimeBoundaryLines(evidence)) {
    assert.ok(status.includes(line), `STATUS.md must contain evidence-derived line: ${line}`);
  }
});

test("preview maturity and compiled-fallback availability are independent runtime inventories", () => {
  const evidence = JSON.parse(readFileSync(path.join(ROOT, "docs", "V0_3_0_RELEASE_EVIDENCE.json"), "utf8"));
  assert.deepEqual(evidence.runtime.previewAgents, [
    "backend-implementation-agent",
    "desktop-platform-agent",
    "mobile-platform-agent"
  ]);
  assert.deepEqual(evidence.runtime.agentsWithoutCompiledFallbacks, []);
  assert.equal(Object.hasOwn(evidence.runtime, "previewNativeOnlyAgents"), false);
  assert.deepEqual(renderStatusRuntimeBoundaryLines(evidence), [
    "- Repo-local project agent files: 15 `.codex/agents/*.toml` files.",
    "- Compiled fallbacks: 15 `compiled-agents/*.compiled.md` files.",
    "- Preview agents: `backend-implementation-agent`, `desktop-platform-agent`, `mobile-platform-agent`.",
    "- Agents without compiled fallbacks: none."
  ]);
});

test("managed release summaries distinguish global actionable and release-blocking sources", () => {
  const evidence = JSON.parse(readFileSync(path.join(ROOT, "docs", "V0_3_0_RELEASE_EVIDENCE.json"), "utf8"));
  const summary = renderReleaseEvidenceSummaryBlock(evidence);
  assert.match(summary, /72 actionable globally/u);
  assert.match(summary, /0 release-blocking/u);
  assert.match(summary, /enterprise-core/u);
});

test("release-boundary prose keeps nonblocking source limitations visible without treating them as release-scoped blockers", () => {
  for (const relativePath of ["STATUS.md", "docs/V0_3_0_RELEASE_NOTES.md"]) {
    const contents = readFileSync(path.join(ROOT, relativePath), "utf8");
    assert.match(contents, /72 nonblocking advisory sources/u);
    assert.match(contents, /missing observed enterprise-core evidence/u);
    assert.match(contents, /reviewed-main evidence/u);
    assert.match(contents, /tag\/release authorization/u);
    assert.doesNotMatch(contents, /actionable source freshness\/review state/u);
    assert.doesNotMatch(contents, /unresolved source review\/freshness state/u);
  }
});

test("release evidence accepts source and compiler commits that are ancestors of generated HEAD", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-evidence-ancestor-"));
  try {
    git(fixture, ["init"]);
    writeFileSync(path.join(fixture, "source.txt"), "source\n", "utf8");
    git(fixture, ["add", "source.txt"]);
    git(fixture, ["commit", "-m", "source"]);
    const sourceCommit = git(fixture, ["rev-parse", "HEAD"]);
    writeFileSync(path.join(fixture, "generated.txt"), "generated\n", "utf8");
    git(fixture, ["add", "generated.txt"]);
    git(fixture, ["commit", "-m", "generated"]);
    writeFileSync(path.join(fixture, "uncommitted.txt"), "uncommitted\n", "utf8");

    assert.doesNotThrow(() => validateRepositoryState(fixture, {
      repository: {
        sourceCommit,
        compilerCommit: sourceCommit,
        worktreeState: "uncommitted"
      }
    }));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("candidate release evidence is internally consistent while honestly blocked", async () => {
  const result = await validateReleaseEvidence({ root: ROOT });

  assert.equal(result.consistent, true);
  assert.equal(result.releaseState, "blocked");
  assert.equal(result.controlledRelease, "0.2.5");
  assert.equal(result.candidateVersion, "0.3.0");
  assert.ok(result.releaseBlockers.length > 0);
  assert.match(formatReleaseEvidenceSummary(result), /^PASS v0\.3-release-evidence .*release=BLOCKED/u);
});

test("release evidence CLI passes consistency check but fails release-ready mode", () => {
  const checked = spawnSync(process.execPath, [VALIDATOR, "--check"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(checked.status, 0, `${checked.stdout ?? ""}${checked.stderr ?? ""}`);
  assert.match(checked.stdout, /^PASS v0\.3-release-evidence /u);

  const release = spawnSync(process.execPath, [VALIDATOR, "--require-release-ready"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.notEqual(release.status, 0);
  assert.match(`${release.stdout ?? ""}${release.stderr ?? ""}`, /release-evidence-state-blocked/u);
});

test("release gate profiles include consistency and release-ready evidence checks", () => {
  const pr = spawnSync(process.execPath, [RELEASE_GATE, "pr", "--list", "--json"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const release = spawnSync(process.execPath, [RELEASE_GATE, "release", "--list", "--json"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(pr.status, 0, `${pr.stdout ?? ""}${pr.stderr ?? ""}`);
  assert.equal(release.status, 0, `${release.stdout ?? ""}${release.stderr ?? ""}`);
  const prCommands = JSON.parse(pr.stdout).commands;
  const releaseCommands = JSON.parse(release.stdout).commands;
  assert.ok(prCommands.some((command) => command.id === "release-evidence-check"));
  assert.ok(releaseCommands.some((command) => command.id === "release-evidence-ready"
    && command.args.includes("--require-release-ready")));
});
