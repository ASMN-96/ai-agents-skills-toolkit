#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  openSync,
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
  benchmarkFixture: "evals/routing/enterprise-delivery-benchmark.json",
  embeddedManifest: ".ai-toolkit/manifest.json"
});

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

export function renderReleaseEvidenceSummaryBlock(evidence) {
  const measured = evidence.benchmark.measured;
  return [
    START_MARKER,
    `> Release evidence: candidate \`${evidence.candidateVersion}\` is **${evidence.releaseState.toUpperCase()}**; controlled release remains \`${evidence.controlledRelease}\`. Static benchmark: **${evidence.benchmark.staticGatePassed ? "PASS" : "FAIL"}** (${percent(measured.mandatoryCompetencyCoverage)} competency, ${percent(measured.domainGateCoverage)} gates, ${percent(measured.exactGoldenRouting)} golden routing, ${percent(measured.medianInputTokenReduction)} median input-token reduction). Sources: ${evidence.sourceFreshness.actionableSources} actionable, ${evidence.sourceFreshness.approvedReceiptCount} approved receipts. Runtime: ${evidence.runtime.canonicalSkills} skills, ${evidence.runtime.nativeAgentDefinitions} native agents, ${evidence.runtime.compiledFallbacks} compiled fallbacks; host bridge ${evidence.runtime.hostExecutionBridge}.`,
    END_MARKER
  ].join("\n");
}

export function renderStatusRuntimeBoundaryLines(evidence) {
  const nativeOnlyAgents = [...evidence.runtime.previewNativeOnlyAgents]
    .sort()
    .map((agentId) => `\`${agentId}\``)
    .join(", ");
  return [
    `- Repo-local project agent files: ${evidence.runtime.nativeAgentDefinitions} \`.codex/agents/*.toml\` files.`,
    `- Compiled fallbacks: ${evidence.runtime.compiledFallbacks} \`compiled-agents/*.compiled.md\` files.`,
    `- Preview native-only agents: ${nativeOnlyAgents}.`
  ];
}

function validateEvidenceEnvelope(evidence) {
  if (!isPlainRecord(evidence) || evidence.schemaVersion !== "1.0.0") fail("schema-version");
  if (evidence.candidateVersion !== "0.3.0") fail("candidate-version");
  if (evidence.controlledRelease !== "0.2.5") fail("controlled-release");
  if (!new Set(["blocked", "ready"]).has(evidence.releaseState)) fail("release-state");
  if (!Array.isArray(evidence.releaseBlockers)) fail("release-blockers");
  if (evidence.releaseState === "ready" && evidence.releaseBlockers.length > 0) {
    fail("ready-state-has-blockers");
  }
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

function validateSourceState(root, evidence) {
  const catalog = readJson(root, path.join(root, "sources/source-watchlist.json"), "source-catalog");
  const counts = { CURRENT: 0, CHANGED: 0, CHECK_FAILED: 0, MANUAL_DUE: 0 };
  for (const source of catalog.sources ?? []) {
    if (!(source.monitor?.state in counts)) fail(`source-monitor-state-${source.id}`);
    counts[source.monitor.state] += 1;
  }
  const actionable = (catalog.sources ?? []).filter(
    (source) => source.monitor?.state !== "CURRENT" || source.review?.state !== "REVIEWED_CURRENT"
  ).length;
  const receipts = (catalog.sources ?? []).filter((source) => source.review?.currentReceipt).length;
  assertEqual(catalog.sources.length, evidence.sourceFreshness.sourceCount, "source-count");
  assertEqual(counts, evidence.sourceFreshness.monitorCounts, "source-monitor-counts");
  assertEqual(actionable, evidence.sourceFreshness.actionableSources, "source-actionable-count");
  assertEqual(receipts, evidence.sourceFreshness.approvedReceiptCount, "source-receipt-count");
  if (actionable > 0 && evidence.sourceFreshness.releaseEligible !== false) fail("source-release-eligibility");
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
  const nativeOnly = agents
    .filter((agent) => agent.compiledFallbackPath === null)
    .map((agent) => agent.name)
    .sort();
  assertEqual(skills.length, evidence.runtime.canonicalSkills, "runtime-skill-count");
  assertEqual(agents.length, evidence.runtime.nativeAgentDefinitions, "runtime-agent-count");
  assertEqual(fallbacks.length, evidence.runtime.compiledFallbacks, "runtime-fallback-count");
  assertEqual(nativeOnly, [...evidence.runtime.previewNativeOnlyAgents].sort(), "runtime-native-only-agents");
}

async function validateBenchmarkState(root, evidence) {
  const result = await runEnterpriseDeliveryBenchmark({ root });
  assertEqual(result.benchmarkDigest, evidence.benchmark.fixtureDigest, "benchmark-fixture-digest");
  assertEqual(result.resourceCatalogDigest, evidence.benchmark.resourceCatalogDigest, "benchmark-resource-catalog-digest");
  assertEqual(result.taskCount, evidence.benchmark.taskCount, "benchmark-task-count");
  assertEqual(result.runsPerVariant, evidence.benchmark.runsPerVariant, "benchmark-runs-per-variant");
  assertEqual(result.staticGatePassed, evidence.benchmark.staticGatePassed, "benchmark-static-gate");
  assertEqual(result.measured, evidence.benchmark.measured, "benchmark-measured");
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
  validateArtifactDigests(
    canonicalRoot,
    evidence.artifactDigestMode,
    evidence.artifacts,
    evidence.releaseState
  );
  validateRepositoryState(canonicalRoot, evidence);
  validateSourceState(canonicalRoot, evidence);
  validateRuntimeState(canonicalRoot, evidence);
  await validateBenchmarkState(canonicalRoot, evidence);
  validateDocumentSummaries(canonicalRoot, evidence);
  validateStatusRuntimeBoundary(canonicalRoot, evidence);
  return {
    schemaVersion: "1.0.0",
    consistent: true,
    candidateVersion: evidence.candidateVersion,
    controlledRelease: evidence.controlledRelease,
    releaseState: evidence.releaseState,
    releaseBlockers: [...evidence.releaseBlockers],
    warningCount: evidence.warnings.length,
    evidencePath: EVIDENCE_RELATIVE_PATH
  };
}

export function formatReleaseEvidenceSummary(result) {
  return `PASS v0.3-release-evidence candidate=${result.candidateVersion} controlled=${result.controlledRelease} warnings=${result.warningCount} release=${result.releaseState.toUpperCase()}`;
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
