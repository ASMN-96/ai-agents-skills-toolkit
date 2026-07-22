#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertPathContained, assertRegularFileWithin } from "../install/safe-filesystem.mjs";
import { runEnterpriseDeliveryBenchmark } from "./ai-toolkit/run-enterprise-delivery-benchmark.mjs";
import {
  CANONICAL_TEXT_DIGEST_MODE,
  canonicalTextSha256
} from "./ai-toolkit/kernel/canonical-digest.mjs";
import { validateObservedEnterpriseBenchmark } from "./validate-observed-enterprise-benchmark.mjs";
import {
  deriveSourceReleaseAccounting,
  validateFreshnessReport
} from "./ai-toolkit/source-governance.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_RELATIVE_PATH = "docs/V0_3_0_RELEASE_EVIDENCE.json";
const SUMMARY_DOCUMENTS = Object.freeze([
  "README.md",
  "STATUS.md",
  "CHANGELOG.md",
  "docs/V0_3_0_RELEASE_NOTES.md"
]);
const START_MARKER = "<!-- v0.3-release-evidence:start -->";
const END_MARKER = "<!-- v0.3-release-evidence:end -->";
const MAX_INTEGRITY_FILE_BYTES = 64 * 1024 * 1024;
const REQUIRED_ARTIFACT_PATHS = Object.freeze({
  sourceCatalog: "sources/source-watchlist.json",
  freshnessReport: "docs/SOURCE_FRESHNESS_REPORT.json",
  agentRegistry: "registries/agents.registry.json",
  domainPacksRegistry: "registries/domain-packs.registry.json",
  benchmarkFixture: "evals/routing/enterprise-delivery-benchmark.json",
  embeddedManifest: ".ai-toolkit/manifest.json"
});
const HOST_EXECUTION_BRIDGE_STATES = new Set(["absent", "preview-contract", "available"]);
const PLATFORM_PACK_LIFECYCLES = new Set(["supported", "preview"]);
const NATIVE_EVIDENCE_STATUSES = new Set(["observed", "absent"]);
const OBSERVED_ENTERPRISE_CORE_FIELDS = Object.freeze([
  "status",
  "evidencePath",
  "sha256",
  "repositoryCommit",
  "ownerReview"
]);
const OWNER_REVIEW_FIELDS = Object.freeze(["ownerId", "decision", "reviewedAt"]);
const REQUIRED_ADVISORY_KEYS = Object.freeze([
  "optionalSources",
  "previewPacks",
  "hostExecutionBridge"
]);

function fail(message) {
  throw new Error(`release-evidence-inconsistent:${message}`);
}

function isPlainRecord(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function assertRepositoryPath(root, relativePath, label) {
  if (
    typeof relativePath !== "string"
    || relativePath === ""
    || path.isAbsolute(relativePath)
    || relativePath.includes("\\")
  ) {
    fail(`${label}-path-invalid`);
  }
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`${label}-path-outside-root`);
  }
  return resolved;
}

function integritySnapshot(stats) {
  return Object.freeze({
    dev: stats.dev,
    ino: stats.ino,
    mode: stats.mode,
    nlink: stats.nlink,
    size: stats.size,
    ctimeNs: stats.ctimeNs,
    mtimeNs: stats.mtimeNs,
    birthtimeNs: stats.birthtimeNs
  });
}

function assertStableSnapshot(expected, actual, label) {
  for (const field of Object.keys(expected)) {
    if (expected[field] !== actual[field]) fail(`${label}-changed-during-read:${field}`);
  }
}

function readIntegrityFile(root, filePath, label, encoding = null) {
  const resolved = assertRegularFileWithin(root, filePath, label);
  const pathBefore = lstatSync(resolved, { bigint: true });
  if (!pathBefore.isFile() || pathBefore.nlink !== 1n) fail(`${label}-not-exclusive-regular-file`);
  const expectedPathSnapshot = integritySnapshot(pathBefore);
  const noFollow = Number.isInteger(fsConstants.O_NOFOLLOW) ? fsConstants.O_NOFOLLOW : 0;
  let descriptor;
  let contents;
  try {
    descriptor = openSync(resolved, fsConstants.O_RDONLY | noFollow);
    const descriptorBefore = fstatSync(descriptor, { bigint: true });
    if (!descriptorBefore.isFile() || descriptorBefore.nlink !== 1n) {
      fail(`${label}-descriptor-not-exclusive-regular-file`);
    }
    const expectedDescriptorSnapshot = integritySnapshot(descriptorBefore);
    assertStableSnapshot(expectedPathSnapshot, expectedDescriptorSnapshot, label);
    if (descriptorBefore.size > BigInt(MAX_INTEGRITY_FILE_BYTES)) {
      fail(`${label}-exceeds-${MAX_INTEGRITY_FILE_BYTES}-byte-limit`);
    }
    const expectedSize = Number(descriptorBefore.size);
    contents = Buffer.alloc(expectedSize);
    let offset = 0;
    while (offset < expectedSize) {
      const bytesRead = readSync(descriptor, contents, offset, expectedSize - offset, offset);
      if (bytesRead === 0) fail(`${label}-truncated-during-read`);
      offset += bytesRead;
    }
    const growthProbe = Buffer.alloc(1);
    if (readSync(descriptor, growthProbe, 0, 1, expectedSize) !== 0) {
      fail(`${label}-grew-during-read`);
    }
    assertStableSnapshot(
      expectedDescriptorSnapshot,
      integritySnapshot(fstatSync(descriptor, { bigint: true })),
      label
    );
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }

  assertRegularFileWithin(root, resolved, `${label} post-read`);
  assertStableSnapshot(
    expectedPathSnapshot,
    integritySnapshot(lstatSync(resolved, { bigint: true })),
    label
  );
  return encoding === null ? contents : contents.toString(encoding);
}

function readJson(root, filePath, label) {
  try {
    return JSON.parse(readIntegrityFile(root, filePath, label, "utf8"));
  } catch (error) {
    fail(`${label}-unreadable:${error.message}`);
  }
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(`${label}:expected=${JSON.stringify(expected)}:actual=${JSON.stringify(actual)}`);
  }
}

function percent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function blocker(id, reasonCode, evidencePaths, dependencyIds) {
  return { id, reasonCode, evidencePaths, dependencyIds };
}

export function validateRuntimeTrustBoundary(runtime) {
  if (!isPlainRecord(runtime)) fail("runtime");
  if (!HOST_EXECUTION_BRIDGE_STATES.has(runtime.hostExecutionBridge)) {
    fail("runtime-host-execution-bridge");
  }
  if (
    runtime.hostExecutionBridge === "preview-contract"
    && runtime.trustedReadinessCeiling !== "blocked"
  ) {
    fail("preview-contract-trusted-readiness-ceiling");
  }
  if (
    runtime.hostExecutionBridge === "available"
    && runtime.trustedReadinessCeiling !== "blocked"
  ) {
    fail("release-evidence-cannot-establish-trusted-readiness");
  }
  if (
    runtime.hostExecutionBridge === "absent"
    && runtime.trustedReadinessCeiling !== "blocked"
  ) {
    fail("absent-bridge-trusted-readiness-ceiling");
  }
  if (runtime.trustedReadinessCeiling !== "blocked") {
    fail("runtime-trusted-readiness-ceiling");
  }
}

function validateOwnerReview(ownerReview, label) {
  if (
    !isPlainRecord(ownerReview)
    || JSON.stringify(Object.keys(ownerReview)) !== JSON.stringify(OWNER_REVIEW_FIELDS)
    || typeof ownerReview.ownerId !== "string"
    || ownerReview.ownerId === ""
    || ownerReview.decision !== "approved"
    || typeof ownerReview.reviewedAt !== "string"
    || Number.isNaN(Date.parse(ownerReview.reviewedAt))
  ) {
    fail(label);
  }
}

function validateObservedEnterpriseCoreDeclaration(observed) {
  if (
    !isPlainRecord(observed)
    || JSON.stringify(Object.keys(observed)) !== JSON.stringify(OBSERVED_ENTERPRISE_CORE_FIELDS)
    || !new Set(["observed", "notMeasured"]).has(observed.status)
  ) {
    fail("benchmark-observed-enterprise-core");
  }
  if (observed.status === "observed") {
    if (
      typeof observed.evidencePath !== "string"
      || observed.evidencePath === ""
      || !/^[0-9a-f]{64}$/u.test(observed.sha256)
      || typeof observed.repositoryCommit !== "string"
      || !/^[0-9a-f]{40}$/u.test(observed.repositoryCommit)
    ) {
      fail("benchmark-observed-enterprise-core-binding");
    }
    validateOwnerReview(observed.ownerReview, "benchmark-observed-enterprise-core-owner-review");
  } else if (
    observed.evidencePath !== null
    || observed.sha256 !== null
    || observed.repositoryCommit !== null
    || observed.ownerReview !== null
  ) {
    fail("benchmark-observed-enterprise-core-not-measured-binding");
  }
}

function validateObservedEnterpriseCoreEvidence(benchmark) {
  validateObservedEnterpriseCoreDeclaration(benchmark?.observedEnterpriseCore);
}

function hasObservedEnterpriseCoreEvidence(benchmark) {
  const observed = benchmark?.observedEnterpriseCore;
  return observed?.status === "observed"
    && typeof observed.evidencePath === "string"
    && /^[0-9a-f]{64}$/u.test(observed.sha256)
    && /^[0-9a-f]{40}$/u.test(observed.repositoryCommit)
    && isPlainRecord(observed.ownerReview)
    && observed.ownerReview.decision === "approved";
}

export function validateObservedEnterpriseCoreEvidenceRecord(root, observed) {
  validateObservedEnterpriseCoreDeclaration(observed);
  if (observed.status !== "observed") return;
  let record;
  try {
    record = validateObservedEnterpriseBenchmark({
      root,
      relativePath: observed.evidencePath,
      expectedCommit: observed.repositoryCommit
    });
  } catch (error) {
    fail(`observed-enterprise-core-evidence-semantic:${error.message}`);
  }
  if (record.status !== "measured-passed" || record.releaseEligible !== true) {
    fail("observed-enterprise-core-evidence-measured-passed");
  }
  assertEqual(
    record.toolkitCommit,
    observed.repositoryCommit,
    "observed-enterprise-core-evidence-commit-mismatch"
  );
  assertEqual(
    {
      ownerId: record.ownerReview.identity,
      decision: record.ownerReview.decision,
      reviewedAt: record.ownerReview.approvedAt
    },
    observed.ownerReview,
    "observed-enterprise-core-evidence-owner-review-mismatch"
  );
  assertEqual(
    record.digest?.replace(/^sha256:/u, ""),
    observed.sha256,
    "observed-enterprise-core-evidence-digest"
  );
}

export function validatePlatformPackEvidence(platformPacks, domainPacksRegistry = undefined) {
  if (!Array.isArray(platformPacks)) fail("platform-packs");
  const ids = new Set();
  for (const [index, platformPack] of platformPacks.entries()) {
    if (
      !isPlainRecord(platformPack)
      || JSON.stringify(Object.keys(platformPack)) !== JSON.stringify([
        "id", "lifecycle", "nativeEvidenceStatus", "releaseBlocking"
      ])
    ) {
      fail(`platform-pack-${index}-fields`);
    }
    if (typeof platformPack.id !== "string" || platformPack.id === "" || ids.has(platformPack.id)) {
      fail(`platform-pack-${index}-id`);
    }
    ids.add(platformPack.id);
    if (!PLATFORM_PACK_LIFECYCLES.has(platformPack.lifecycle)) {
      fail(`platform-pack-${index}-lifecycle`);
    }
    if (!NATIVE_EVIDENCE_STATUSES.has(platformPack.nativeEvidenceStatus)) {
      fail(`platform-pack-${index}-native-evidence-status`);
    }
    const expectedReleaseBlocking = (
      platformPack.lifecycle === "supported"
      && platformPack.nativeEvidenceStatus === "absent"
    );
    if (platformPack.releaseBlocking !== expectedReleaseBlocking) {
      fail(`platform-pack-${index}-release-blocking`);
    }
  }
  if (domainPacksRegistry === undefined) return;
  if (!isPlainRecord(domainPacksRegistry) || !Array.isArray(domainPacksRegistry.packs)) {
    fail("platform-pack-registry");
  }
  const canonicalPlatformPacks = domainPacksRegistry.packs.filter((pack) => (
    pack?.kind === "platform" || pack?.kind === "framework-overlay"
  ));
  if (
    JSON.stringify(platformPacks.map((pack) => pack.id))
    !== JSON.stringify(canonicalPlatformPacks.map((pack) => pack.id))
  ) {
    fail("platform-pack-registry-projection");
  }
  for (const [index, canonicalPlatformPack] of canonicalPlatformPacks.entries()) {
    if (platformPacks[index].lifecycle !== canonicalPlatformPack.maturity) {
      fail("platform-pack-lifecycle-mismatch");
    }
  }
}

function validateAdvisories(advisories) {
  if (
    !isPlainRecord(advisories)
    || JSON.stringify(Object.keys(advisories)) !== JSON.stringify(REQUIRED_ADVISORY_KEYS)
  ) {
    fail("advisories");
  }
  for (const key of REQUIRED_ADVISORY_KEYS) {
    if (typeof advisories[key] !== "string" || advisories[key] === "") {
      fail(`advisory-${key}`);
    }
  }
}

function validateReleaseWarnings(warnings) {
  if (!Array.isArray(warnings) || new Set(warnings).size !== warnings.length) {
    fail("release-warnings");
  }
  if (warnings.some((warning) => typeof warning !== "string" || warning === "")) {
    fail("release-warning-values");
  }
}

export function inspectGeneratedArtifactState(root) {
  const canonicalPath = path.join(root, "sources", "source-watchlist.json");
  const mirrorPath = path.join(root, ".ai-toolkit", "sources", "watchlist.json");
  const manifestPath = path.join(root, ".ai-toolkit", "manifest.json");
  const canonicalBytes = readFileSync(canonicalPath);
  const mirrorBytes = readFileSync(mirrorPath);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const canonicalDigest = canonicalTextSha256(canonicalBytes, "canonical source catalog");
  const mirrorDigest = canonicalTextSha256(mirrorBytes, "generated source catalog mirror");
  const mirrorAttestation = (manifest.mirrors ?? []).find((entry) => (
    entry.source === "sources/source-watchlist.json"
    && entry.target === ".ai-toolkit/sources/watchlist.json"
  ));
  const artifactAttestation = (manifest.generatedArtifacts ?? []).find(
    (entry) => entry.path === ".ai-toolkit/sources/watchlist.json"
  );
  const manifestConsistent = (
    mirrorAttestation?.mode === "byte-identical"
    && mirrorAttestation.sha256 === canonicalDigest
    && mirrorAttestation.sourceSha256 === canonicalDigest
    && mirrorAttestation.targetSha256 === mirrorDigest
    && artifactAttestation?.sha256 === mirrorDigest
  );
  return {
    generatedArtifactDrift: !canonicalBytes.equals(mirrorBytes) || !manifestConsistent,
    canonicalDigest,
    mirrorDigest,
    manifestConsistent
  };
}

export function deriveReleaseBlockerAccounting(evidence, actualState = {}) {
  const blockers = [];
  const sourceFreshness = evidence.sourceFreshness ?? {};
  if (sourceFreshness.releaseBlockingSourceCount > 0) {
    blockers.push(blocker(
      "source-governance-actionable",
      "RELEASE_SCOPED_SOURCES_ACTIONABLE",
      ["sources/source-watchlist.json", "docs/SOURCE_FRESHNESS_REPORT.json"],
      [...(sourceFreshness.releaseBlockingSourceIds ?? [])]
    ));
  }
  if (evidence.approvals?.sourceApproverIdentityRecorded !== true) {
    blockers.push(blocker(
      "source-review-approver-unregistered",
      "SOURCE_APPROVER_IDENTITY_UNREGISTERED",
      ["sources/source-watchlist.json"],
      [...(sourceFreshness.supportedPackIds ?? [])]
    ));
  }
  if (
    evidence.runtime?.hostExecutionBridge !== "available"
    && !(
      evidence.runtime?.hostExecutionBridge === "preview-contract"
      && evidence.runtime?.trustedReadinessCeiling === "blocked"
    )
  ) {
    blockers.push(blocker(
      "runtime-host-bridge-unavailable",
      "RUNTIME_HOST_BRIDGE_UNAVAILABLE",
      ["docs/HOST_EXECUTION_BRIDGE.md", "docs/V0_3_0_RELEASE_EVIDENCE.json"],
      ["runtime-host-bridge"]
    ));
  }
  if (evidence.benchmark?.staticGatePassed !== true) {
    blockers.push(blocker(
      "static-benchmark-thresholds-failed",
      "STATIC_BENCHMARK_THRESHOLDS_FAILED",
      ["evals/routing/enterprise-delivery-benchmark.json"],
      ["enterprise-delivery-benchmark"]
    ));
  }
  if (!hasObservedEnterpriseCoreEvidence(evidence.benchmark)) {
    blockers.push(blocker(
      "enterprise-core-observed-evidence-not-measured",
      "ENTERPRISE_CORE_OBSERVED_EVIDENCE_NOT_MEASURED",
      ["docs/V0_3_0_RELEASE_EVIDENCE.json"],
      ["enterprise-core-observed-evidence"]
    ));
  }
  const supportedPacksMissingNativeEvidence = (evidence.platformPacks ?? [])
    .filter((platformPack) => (
      platformPack?.lifecycle === "supported"
      && platformPack.nativeEvidenceStatus === "absent"
      && platformPack.releaseBlocking === true
    ))
    .map((platformPack) => platformPack.id);
  if (supportedPacksMissingNativeEvidence.length > 0) {
    blockers.push(blocker(
      "supported-platform-native-evidence-missing",
      "SUPPORTED_PLATFORM_NATIVE_EVIDENCE_MISSING",
      ["docs/V0_3_0_RELEASE_EVIDENCE.json"],
      supportedPacksMissingNativeEvidence
    ));
  }
  if (
    evidence.repository?.reviewedMainCommit === null
    || evidence.approvals?.reviewedMainCommitApproved !== true
  ) {
    blockers.push(blocker(
      "reviewed-clean-main-commit-unavailable",
      "REVIEWED_CLEAN_MAIN_COMMIT_UNAVAILABLE",
      ["docs/V0_3_0_RELEASE_EVIDENCE.json"],
      ["reviewed-main-commit"]
    ));
  }
  if (actualState.generatedArtifactDrift === true) {
    blockers.push(blocker(
      "generated-artifact-drift",
      "GENERATED_ARTIFACT_DRIFT",
      [
        "sources/source-watchlist.json",
        ".ai-toolkit/sources/watchlist.json",
        ".ai-toolkit/manifest.json"
      ],
      ["embedded-manifest", "source-catalog-mirror"]
    ));
  }
  if (evidence.approvals?.tagAuthorized !== true || evidence.approvals?.releaseAuthorized !== true) {
    const missing = [];
    if (evidence.approvals?.tagAuthorized !== true) missing.push("tag-authorization");
    if (evidence.approvals?.releaseAuthorized !== true) missing.push("release-authorization");
    blockers.push(blocker(
      "tag-and-release-authorization-absent",
      "TAG_OR_RELEASE_AUTHORIZATION_ABSENT",
      ["docs/V0_3_0_RELEASE_EVIDENCE.json"],
      missing
    ));
  }
  if ((evidence.warnings ?? []).length > 0) {
    blockers.push(blocker(
      "unwaived-release-warnings",
      "UNWAIVED_RELEASE_WARNINGS",
      ["docs/V0_3_0_RELEASE_EVIDENCE.json"],
      [...evidence.warnings]
    ));
  }
  return blockers;
}

export function validateReleaseBlockerAccounting(evidence, actualState = {}) {
  if (!Array.isArray(evidence.releaseBlockerAccounting)) fail("release-blocker-accounting");
  if (!Array.isArray(evidence.releaseBlockers)) fail("release-blockers");
  const ids = evidence.releaseBlockerAccounting.map((entry) => entry?.id);
  if (new Set(ids).size !== ids.length) fail("release-blocker-accounting-duplicate-id");
  for (const [index, entry] of evidence.releaseBlockerAccounting.entries()) {
    if (!isPlainRecord(entry)) fail(`release-blocker-accounting-${index}`);
    if (JSON.stringify(Object.keys(entry)) !== JSON.stringify([
      "id", "reasonCode", "evidencePaths", "dependencyIds"
    ])) fail(`release-blocker-accounting-${index}-fields`);
    if (typeof entry.id !== "string" || typeof entry.reasonCode !== "string") {
      fail(`release-blocker-accounting-${index}-identity`);
    }
    if (!Array.isArray(entry.evidencePaths) || !Array.isArray(entry.dependencyIds)) {
      fail(`release-blocker-accounting-${index}-collections`);
    }
    if (
      new Set(entry.evidencePaths).size !== entry.evidencePaths.length
      || new Set(entry.dependencyIds).size !== entry.dependencyIds.length
      || entry.evidencePaths.some((value) => typeof value !== "string" || value === "")
      || entry.dependencyIds.some((value) => typeof value !== "string" || value === "")
    ) {
      fail(`release-blocker-accounting-${index}-values`);
    }
  }
  const expected = deriveReleaseBlockerAccounting(evidence, actualState);
  assertEqual(evidence.releaseBlockerAccounting, expected, "release-blocker-accounting-exact-derivation");
  const projection = expected.map((entry) => entry.id);
  if (JSON.stringify(evidence.releaseBlockers) !== JSON.stringify(projection)) {
    fail("release-blockers-compatibility-projection");
  }
  if (evidence.releaseState === "ready" && expected.length > 0) fail("ready-state-has-blockers");
  if (evidence.releaseState === "blocked" && expected.length === 0) fail("blocked-state-has-no-blockers");
  return expected;
}

export function renderReleaseEvidenceSummaryBlock(evidence) {
  const measured = evidence.benchmark.measured;
  const advisories = evidence.advisories;
  return [
    START_MARKER,
    `> Release evidence: candidate \`${evidence.candidateVersion}\` is **${evidence.releaseState.toUpperCase()}**; controlled release remains \`${evidence.controlledRelease}\`. Static benchmark: **${evidence.benchmark.staticGatePassed ? "PASS" : "FAIL"}** (${percent(measured.mandatoryCompetencyCoverage)} competency, ${percent(measured.domainGateCoverage)} gates, ${percent(measured.exactGoldenRouting)} golden routing, ${percent(measured.medianInputTokenReduction)} median input-token reduction). Sources: ${evidence.sourceFreshness.actionableSources} actionable globally, ${evidence.sourceFreshness.releaseBlockingSourceCount} release-blocking for ${evidence.sourceFreshness.supportedPackIds.join(", ")}, ${evidence.sourceFreshness.releaseNonblockingActionableCount} release-nonblocking, ${evidence.sourceFreshness.approvedReceiptCount} approved receipts. Runtime: ${evidence.runtime.canonicalSkills} skills, ${evidence.runtime.nativeAgentDefinitions} native agent definitions (native visibility unobserved), ${evidence.runtime.compiledFallbacks} compiled fallbacks; host bridge ${evidence.runtime.hostExecutionBridge}, trusted readiness ceiling ${evidence.runtime.trustedReadinessCeiling}. Advisories: ${advisories.optionalSources} ${advisories.previewPacks} ${advisories.hostExecutionBridge}`,
    END_MARKER
  ].join("\n");
}

export function renderStatusRuntimeBoundaryLines(evidence) {
  const previewAgents = [...evidence.runtime.previewAgents]
    .sort()
    .map((agentId) => `\`${agentId}\``)
    .join(", ");
  const agentsWithoutCompiledFallbacks = [...evidence.runtime.agentsWithoutCompiledFallbacks]
    .sort()
    .map((agentId) => `\`${agentId}\``)
    .join(", ") || "none";
  return [
    `- Repo-local project agent files: ${evidence.runtime.nativeAgentDefinitions} \`.codex/agents/*.toml\` files.`,
    `- Compiled fallbacks: ${evidence.runtime.compiledFallbacks} \`compiled-agents/*.compiled.md\` files.`,
    `- Preview agents: ${previewAgents}.`,
    `- Agents without compiled fallbacks: ${agentsWithoutCompiledFallbacks}.`
  ];
}

function validateEvidenceEnvelope(evidence) {
  if (!isPlainRecord(evidence) || evidence.schemaVersion !== "1.2.0") fail("schema-version");
  if (evidence.candidateVersion !== "0.3.0") fail("candidate-version");
  if (evidence.controlledRelease !== "0.2.5") fail("controlled-release");
  if (!new Set(["blocked", "ready"]).has(evidence.releaseState)) fail("release-state");
  validateRuntimeTrustBoundary(evidence.runtime);
  validateObservedEnterpriseCoreEvidence(evidence.benchmark);
  validatePlatformPackEvidence(evidence.platformPacks);
  validateReleaseWarnings(evidence.warnings);
  validateAdvisories(evidence.advisories);
}

export function validateArtifactDigests(root, artifactDigestMode, artifacts, releaseState = "blocked") {
  if (artifactDigestMode !== CANONICAL_TEXT_DIGEST_MODE) fail("artifact-digest-mode");
  if (!isPlainRecord(artifacts)) fail("artifacts");
  const requiredIds = Object.keys(REQUIRED_ARTIFACT_PATHS).sort();
  if (JSON.stringify(Object.keys(artifacts).sort()) !== JSON.stringify(requiredIds)) {
    fail("artifact-ids");
  }
  for (const id of Object.keys(REQUIRED_ARTIFACT_PATHS)) {
    const artifact = artifacts[id];
    if (!isPlainRecord(artifact)) fail(`artifact-${id}`);
    if (artifact.path !== REQUIRED_ARTIFACT_PATHS[id]) fail(`artifact-${id}-path`);
    if (id !== "embeddedManifest" && Object.hasOwn(artifact, "state")) {
      fail(`artifact-${id}-state-unexpected`);
    }
    const filePath = assertRepositoryPath(root, artifact.path, `artifact-${id}`);
    if (artifact.sha256 === null) {
      if (releaseState === "ready") {
        fail(`ready-state-artifact-${id}-pending`);
      }
      if (id !== "embeddedManifest" || artifact.state !== "regeneration-pending") {
        fail(id === "embeddedManifest"
          ? `artifact-${id}-state-contradiction`
          : `artifact-${id}-digest-missing`);
      }
      continue;
    }
    if (!/^[0-9a-f]{64}$/u.test(artifact.sha256)) fail(`artifact-${id}-digest-format`);
    if (id === "embeddedManifest" && artifact.state !== "generated-current") {
      fail(`artifact-${id}-state-contradiction`);
    }
    let actualDigest;
    try {
      actualDigest = canonicalTextSha256(
        readIntegrityFile(root, filePath, `release artifact ${id}`),
        `release artifact ${id}`
      );
    } catch (error) {
      fail(`artifact-${id}-digest-unreadable:${error.message}`);
    }
    assertEqual(actualDigest, artifact.sha256, `artifact-${id}-digest`);
  }
}

function assertCommitAncestor(root, commit, head, label) {
  if (typeof commit !== "string" || !/^[0-9a-f]{40}$/u.test(commit)) {
    fail(`${label}-format`);
  }
  try {
    execFileSync("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true
    });
  } catch {
    fail(`${label}-unavailable`);
  }
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, head], {
      cwd: root,
      stdio: "ignore",
      windowsHide: true
    });
  } catch {
    fail(`${label}-not-ancestor-of-head`);
  }
}

export function validateRepositoryState(root, evidence) {
  const head = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true
  }).trim();
  assertCommitAncestor(root, evidence.repository.sourceCommit, head, "source-commit");
  assertCommitAncestor(root, evidence.repository.compilerCommit, head, "compiler-commit");
  const status = execFileSync("git", ["status", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024
  }).trim();
  if (evidence.repository.worktreeState === "uncommitted" && status === "") fail("worktree-expected-dirty");
  if (evidence.repository.worktreeState === "clean" && status !== "") fail("worktree-expected-clean");
}

function supportedReleaseGateIds(domainPacksRegistry) {
  if (!isPlainRecord(domainPacksRegistry) || !Array.isArray(domainPacksRegistry.packs)) {
    fail("source-capability-domain-packs");
  }
  return [...new Set(domainPacksRegistry.packs.flatMap((pack) => (
    pack?.lifecycle === "active" && pack?.maturity === "supported" && Array.isArray(pack.gates)
      ? pack.gates.map((gate) => gate?.id).filter((id) => typeof id === "string" && id !== "")
      : []
  )))].sort((left, right) => left.localeCompare(right));
}

export function deriveReleaseSourceCapabilityImpact({ catalog, report, domainPacksRegistry }) {
  const supportedGateIds = supportedReleaseGateIds(domainPacksRegistry);
  return deriveSourceReleaseAccounting({
    catalog,
    domainPacksRegistry,
    freshnessReport: report,
    selectedResourceIds: [],
    selectedGateIds: supportedGateIds,
    supportedGateIds
  });
}

function validateSourceState(root, evidence) {
  const catalog = readJson(root, path.join(root, "sources/source-watchlist.json"), "source-catalog");
  const report = readJson(root, path.join(root, "docs/SOURCE_FRESHNESS_REPORT.json"), "source-freshness-report");
  const domainPacksRegistry = readJson(
    root,
    path.join(root, "registries/domain-packs.registry.json"),
    "domain-packs-registry"
  );
  validatePlatformPackEvidence(evidence.platformPacks, domainPacksRegistry);
  validateFreshnessReport(catalog, report, {
    now: new Date(Math.max(Date.now(), Date.parse(report.checkedAt))).toISOString(),
    domainPacksRegistry
  });
  const accounting = deriveReleaseSourceCapabilityImpact({ catalog, report, domainPacksRegistry });
  const receipts = (catalog.sources ?? []).filter((source) => source.review?.currentReceipt).length;
  assertEqual(report.checkedAt, evidence.sourceFreshness.checkedAt, "source-checked-at");
  assertEqual(accounting.sourceCount, evidence.sourceFreshness.sourceCount, "source-count");
  assertEqual(accounting.monitorCounts, evidence.sourceFreshness.monitorCounts, "source-monitor-counts");
  assertEqual(accounting.actionableCount, evidence.sourceFreshness.actionableSources, "source-actionable-count");
  assertEqual(
    accounting.actionableCountsByScope,
    evidence.sourceFreshness.actionableCountsByScope,
    "source-actionable-counts-by-scope"
  );
  assertEqual(accounting.supportedPackIds, evidence.sourceFreshness.supportedPackIds, "source-supported-pack-ids");
  assertEqual(
    accounting.releaseBlockingSourceCount,
    evidence.sourceFreshness.releaseBlockingSourceCount,
    "source-release-blocking-count"
  );
  assertEqual(
    accounting.releaseBlockingSourceIds,
    evidence.sourceFreshness.releaseBlockingSourceIds,
    "source-release-blocking-ids"
  );
  assertEqual(
    accounting.releaseNonblockingActionableCount,
    evidence.sourceFreshness.releaseNonblockingActionableCount,
    "source-release-nonblocking-count"
  );
  assertEqual(receipts, evidence.sourceFreshness.approvedReceiptCount, "source-receipt-count");
  assertEqual(
    accounting.releaseBlockingSourceCount === 0,
    evidence.sourceFreshness.releaseEligible,
    "source-release-eligibility"
  );
  assertEqual(
    catalog.approverPolicy?.authorizedIdentities?.length > 0,
    evidence.approvals.sourceApproverIdentityRecorded,
    "source-approver-identity-state"
  );
  return accounting;
}

function validateRuntimeState(root, evidence) {
  const agents = readJson(root, path.join(root, "registries/agents.registry.json"), "agent-registry").agents ?? [];
  const skills = readJson(root, path.join(root, "registries/skills.registry.json"), "skill-registry").skills ?? [];
  const fallbackRoot = assertPathContained(
    root,
    path.join(root, "compiled-agents"),
    "compiled-agent inventory"
  );
  const fallbackRootBefore = lstatSync(fallbackRoot, { bigint: true });
  if (!fallbackRootBefore.isDirectory()) fail("compiled-agent-inventory-not-directory");
  const fallbacks = readdirSync(fallbackRoot, { withFileTypes: true })
    .filter((entry) => entry.name.endsWith(".compiled.md"))
    .map((entry) => {
      assertRegularFileWithin(
        root,
        path.join(fallbackRoot, entry.name),
        `compiled-agent output ${entry.name}`
      );
      return entry;
    });
  assertPathContained(root, fallbackRoot, "compiled-agent inventory post-read");
  assertStableSnapshot(
    integritySnapshot(fallbackRootBefore),
    integritySnapshot(lstatSync(fallbackRoot, { bigint: true })),
    "compiled-agent-inventory"
  );
  const previewAgents = agents
    .filter((agent) => Array.isArray(agent.status) && agent.status.includes("preview"))
    .map((agent) => agent.name)
    .sort();
  const agentsWithoutCompiledFallbacks = agents
    .filter((agent) => !agent.compiledFallbackPath)
    .map((agent) => agent.name)
    .sort();
  assertEqual(skills.length, evidence.runtime.canonicalSkills, "runtime-skill-count");
  assertEqual(agents.length, evidence.runtime.nativeAgentDefinitions, "runtime-agent-count");
  assertEqual(fallbacks.length, evidence.runtime.compiledFallbacks, "runtime-fallback-count");
  assertEqual(previewAgents, [...evidence.runtime.previewAgents].sort(), "runtime-preview-agents");
  assertEqual(
    agentsWithoutCompiledFallbacks,
    [...evidence.runtime.agentsWithoutCompiledFallbacks].sort(),
    "runtime-agents-without-compiled-fallbacks"
  );
  validateRuntimeTrustBoundary(evidence.runtime);
}

async function validateBenchmarkState(root, evidence) {
  const result = await runEnterpriseDeliveryBenchmark({ root });
  assertEqual(result.benchmarkDigest, evidence.benchmark.fixtureDigest, "benchmark-fixture-digest");
  assertEqual(result.resourceCatalogDigest, evidence.benchmark.resourceCatalogDigest, "benchmark-resource-catalog-digest");
  assertEqual(result.taskCount, evidence.benchmark.taskCount, "benchmark-task-count");
  assertEqual(result.runsPerVariant, evidence.benchmark.runsPerVariant, "benchmark-runs-per-variant");
  assertEqual(result.staticGatePassed, evidence.benchmark.staticGatePassed, "benchmark-static-gate");
  assertEqual(result.measured, evidence.benchmark.measured, "benchmark-measured");
  validateObservedEnterpriseCoreEvidence(evidence.benchmark);
  if (evidence.benchmark.observedEnterpriseCore.status === "observed") {
    const observed = evidence.benchmark.observedEnterpriseCore;
    validateObservedEnterpriseCoreEvidenceRecord(root, observed);
    assertEqual(
      observed.repositoryCommit,
      evidence.repository.sourceCommit,
      "observed-enterprise-core-release-commit"
    );
  }
}

function validateDocumentSummaries(root, evidence) {
  const expected = renderReleaseEvidenceSummaryBlock(evidence);
  for (const relativePath of SUMMARY_DOCUMENTS) {
    const contents = readIntegrityFile(root, path.join(root, relativePath), `summary document ${relativePath}`, "utf8");
    const start = contents.indexOf(START_MARKER);
    const end = contents.indexOf(END_MARKER);
    if (start === -1 || end === -1 || end < start) fail(`summary-marker-missing:${relativePath}`);
    const actual = contents.slice(start, end + END_MARKER.length).replace(/\r\n/gu, "\n");
    assertEqual(actual, expected, `summary-drift:${relativePath}`);
  }
}

function validateStatusRuntimeBoundary(root, evidence) {
  const contents = readIntegrityFile(root, path.join(root, "STATUS.md"), "STATUS runtime boundary", "utf8");
  for (const expectedLine of renderStatusRuntimeBoundaryLines(evidence)) {
    if (!contents.includes(expectedLine)) fail("status-runtime-boundary-drift");
  }
}

export async function validateReleaseEvidence({
  root = MODULE_ROOT,
  evidencePath = path.join(root, EVIDENCE_RELATIVE_PATH)
} = {}) {
  const canonicalRoot = path.resolve(root);
  const resolvedEvidencePath = assertRepositoryPath(
    canonicalRoot,
    path.relative(canonicalRoot, evidencePath).replace(/\\/gu, "/"),
    "release-evidence"
  );
  const evidence = readJson(canonicalRoot, resolvedEvidencePath, "release-evidence");
  validateEvidenceEnvelope(evidence);
  const generatedArtifactState = inspectGeneratedArtifactState(canonicalRoot);
  const expectedEmbeddedState = generatedArtifactState.generatedArtifactDrift
    ? { state: "regeneration-pending", sha256: null }
    : { state: "generated-current", sha256: evidence.artifacts.embeddedManifest.sha256 };
  if (
    evidence.artifacts.embeddedManifest.state !== expectedEmbeddedState.state
    || evidence.artifacts.embeddedManifest.sha256 !== expectedEmbeddedState.sha256
  ) {
    fail("generated-artifact-state-does-not-match-repository");
  }
  validateArtifactDigests(
    canonicalRoot,
    evidence.artifactDigestMode,
    evidence.artifacts,
    evidence.releaseState
  );
  validateRepositoryState(canonicalRoot, evidence);
  const sourceAccounting = validateSourceState(canonicalRoot, evidence);
  validateRuntimeState(canonicalRoot, evidence);
  await validateBenchmarkState(canonicalRoot, evidence);
  validateReleaseBlockerAccounting(evidence, generatedArtifactState);
  validateDocumentSummaries(canonicalRoot, evidence);
  validateStatusRuntimeBoundary(canonicalRoot, evidence);
  return {
    schemaVersion: "1.2.0",
    consistent: true,
    candidateVersion: evidence.candidateVersion,
    controlledRelease: evidence.controlledRelease,
    releaseState: evidence.releaseState,
    releaseBlockers: [...evidence.releaseBlockers],
    releaseBlockerAccounting: structuredClone(evidence.releaseBlockerAccounting),
    sourceCapabilityImpact: structuredClone(sourceAccounting.capabilityImpact),
    warningCount: evidence.warnings.length,
    evidencePath: EVIDENCE_RELATIVE_PATH
  };
}

export function formatReleaseEvidenceSummary(result) {
  const impact = result.sourceCapabilityImpact ?? {
    capabilityIds: [],
    blockingCapabilityIds: [],
    blockingResourceIds: [],
    blockingGateIds: [],
    portfolioActionableCount: 0,
    advisories: []
  };
  const pinnedBasisAdvisoryCount = impact.advisories.filter(
    (advisory) => advisory.includes("pinned reviewed basis")
  ).length;
  return `PASS v0.3-release-evidence candidate=${result.candidateVersion} controlled=${result.controlledRelease} warnings=${result.warningCount} release=${result.releaseState.toUpperCase()} capabilities=${impact.capabilityIds.join(",") || "none"} blocking-capabilities=${impact.blockingCapabilityIds.join(",") || "none"} blocking-resources=${impact.blockingResourceIds.join(",") || "none"} blocking-gates=${impact.blockingGateIds.join(",") || "none"} portfolio-actionable=${impact.portfolioActionableCount} pinned-basis-advisories=${pinnedBasisAdvisoryCount}`;
}

function parseArgs(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--check")) return { requireReady: false };
  if (argv.length === 1 && argv[0] === "--require-release-ready") return { requireReady: true };
  throw new Error("usage: node scripts/validate-v0-3-release-evidence.mjs [--check|--require-release-ready]");
}

function isDirectExecution() {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

if (isDirectExecution()) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = await validateReleaseEvidence();
    process.stdout.write(`${formatReleaseEvidenceSummary(result)}\n`);
    if (args.requireReady && (result.releaseState !== "ready" || result.releaseBlockers.length > 0)) {
      throw new Error(`release-evidence-state-blocked:${result.releaseBlockers.join(",")}`);
    }
  } catch (error) {
    process.stderr.write(`FAIL v0.3-release-evidence: ${error.message}\n`);
    process.exitCode = 1;
  }
}
