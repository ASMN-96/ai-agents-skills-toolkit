import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  ManagedFilesystem,
  assertRegularFileWithin,
  recoverManagedDirectoryTransaction,
  runManagedDirectoryTransaction,
  writeManagedNewFile
} from "../../install/safe-filesystem.mjs";
import {
  FINAL_DISPOSITIONS as CONTRACT_FINAL_DISPOSITIONS,
  FRESHNESS_WINDOWS_DAYS as CONTRACT_FRESHNESS_WINDOWS_DAYS,
  MONITOR_STATES as CONTRACT_MONITOR_STATES,
  REVIEW_STATES as CONTRACT_REVIEW_STATES,
  RUNTIME_POSTURES as CONTRACT_RUNTIME_POSTURES,
  SOURCE_CATALOG_SCHEMA_VERSION as CONTRACT_SOURCE_CATALOG_SCHEMA_VERSION,
  validateSourceCatalog as validateSourceCatalogContract,
  validateSourceReviewReceipt as validateSourceReviewReceiptContract
} from "./kernel/source-catalog-contract.mjs";
import { deriveSourceReleaseAccounting } from "./kernel/source-release-accounting.mjs";
export {
  assertPlanSourceDependencyAccounting,
  derivePlanSourceDependencyAccounting,
  deriveSourceReleaseAccounting
} from "./kernel/source-release-accounting.mjs";

export const FRESHNESS_WINDOWS_DAYS = CONTRACT_FRESHNESS_WINDOWS_DAYS;
export const MONITOR_STATES = CONTRACT_MONITOR_STATES;
export const REVIEW_STATES = CONTRACT_REVIEW_STATES;
export const RUNTIME_POSTURES = CONTRACT_RUNTIME_POSTURES;
export const FINAL_DISPOSITIONS = CONTRACT_FINAL_DISPOSITIONS;
export const SOURCE_CATALOG_SCHEMA_VERSION = CONTRACT_SOURCE_CATALOG_SCHEMA_VERSION;

const MONITOR_STATE_SET = new Set(MONITOR_STATES);
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40}$/;
const FRESHNESS_REPORT_SCHEMA_VERSION = "2.1.0";
const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_GOVERNANCE_MUTATION_LOCK = ".source-governance-mutation.lock";
const MUTATION_LOCK_STALE_AFTER_MS = 60 * 60 * 1000;
const MUTATION_LOCK_HELD = Symbol("source-governance-mutation-lock-held");
const COMPARISON_BASES = new Set([
  "PRIOR_MONITOR_OBSERVATION",
  "REVIEWED_REVISION",
  "LEGACY_REVIEW_METADATA",
  "MANUAL_REVIEW_RECEIPT",
  "MISSING",
  "NOT_APPLICABLE"
]);
const FRESHNESS_REASON_CODES = new Set([
  "COMPARISON_MATCH",
  "UPSTREAM_CHANGED",
  "DEGRADED_COMPARISON_MATCH",
  "DEGRADED_UPSTREAM_CHANGED",
  "BASELINE_MISSING",
  "REMOTE_CHECK_FAILED",
  "IDENTITY_DRIFT_DETECTED",
  "MANUAL_EVIDENCE_REQUIRED",
  "MANUAL_DUE",
  "MANUAL_CURRENT"
]);
const MANUAL_REASON_CODES = new Set(["MANUAL_EVIDENCE_REQUIRED", "MANUAL_DUE", "MANUAL_CURRENT"]);
const GIT_COMPARISON_REASON_CODES = new Set([
  "COMPARISON_MATCH",
  "UPSTREAM_CHANGED",
  "DEGRADED_COMPARISON_MATCH",
  "DEGRADED_UPSTREAM_CHANGED",
  "BASELINE_MISSING",
  "REMOTE_CHECK_FAILED",
  "IDENTITY_DRIFT_DETECTED"
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(message) {
  throw new Error(`Source governance: ${message}`);
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

function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function requireIsoInstant(value, field, { nullable = false } = {}) {
  if (value === null && nullable) return null;
  if (typeof value !== "string" || !ISO_INSTANT.test(value) || Number.isNaN(Date.parse(value))) {
    fail(`${field} must be a canonical ISO-8601 UTC instant with milliseconds`);
  }
  if (new Date(value).toISOString() !== value) fail(`${field} must be a canonical ISO-8601 UTC instant`);
  return value;
}

function requireNow(value) {
  return requireIsoInstant(value ?? new Date().toISOString(), "now");
}

function assertSafeRelativePath(value, field, { nullable = false } = {}) {
  if (value === null && nullable) return null;
  requireString(value, field);
  if (
    value.includes("\\") ||
    value.includes("\0") ||
    path.posix.isAbsolute(value) ||
    path.posix.normalize(value) !== value ||
    value === "." ||
    value === ".." ||
    value.startsWith("../") ||
    value.split("/").some((segment) => segment.includes(":"))
  ) {
    fail(`${field} must be a safe repository-relative POSIX path`);
  }
  return value;
}

function validateRevision(value, field, { nullable = false } = {}) {
  if (value === null && nullable) return null;
  const revision = requireRecord(value, field);
  const keys = Object.keys(revision).sort();
  if (keys.join(",") !== "kind,value") fail(`${field} must contain exactly kind and value`);
  if (revision.kind === "git-sha") {
    if (typeof revision.value !== "string" || !GIT_SHA.test(revision.value)) {
      fail(`${field}.value must be an exact 40-character Git SHA`);
    }
  } else if (revision.kind === "content-digest") {
    if (typeof revision.value !== "string" || !SHA256.test(revision.value)) {
      fail(`${field}.value must be a sha256 content digest`);
    }
  } else {
    fail(`${field}.kind must be git-sha or content-digest`);
  }
  return revision;
}

function sameRevision(left, right) {
  if (left === null || right === null) return left === right;
  return Boolean(left && right && left.kind === right.kind && left.value === right.value);
}

function validateComparisonRevision(value, field) {
  if (value === null) return null;
  if (typeof value !== "string" || (!GIT_SHA.test(value) && !SHA256.test(value))) {
    fail(`${field} must be null, an exact 40-character Git SHA, or a sha256 content digest`);
  }
  return value;
}

function validateStructuredFreshnessEvidence(entry, source, index) {
  const field = `freshnessReport.sources[${index}]`;
  const fields = ["comparisonRevision", "comparisonBasis", "reasonCode"];
  const present = fields.filter((name) => Object.hasOwn(entry, name));
  if (present.length === 0) return false;
  if (present.length !== fields.length) {
    fail(`${field} structured freshness evidence requires comparisonRevision, comparisonBasis, and reasonCode together`);
  }
  const comparisonRevision = validateComparisonRevision(entry.comparisonRevision, `${field}.comparisonRevision`);
  if (!COMPARISON_BASES.has(entry.comparisonBasis)) {
    fail(`freshness comparisonBasis is unsupported for ${entry.sourceId}`);
  }
  if (!FRESHNESS_REASON_CODES.has(entry.reasonCode)) {
    fail(`freshness reasonCode is unsupported for ${entry.sourceId}`);
  }

  if (entry.reasonCode === "BASELINE_MISSING") {
    if (entry.monitorState !== "CHECK_FAILED" || comparisonRevision !== null || entry.comparisonBasis !== "MISSING") {
      fail(`BASELINE_MISSING requires CHECK_FAILED with a null comparison revision for ${entry.sourceId}`);
    }
  }
  if (entry.reasonCode === "REMOTE_CHECK_FAILED") {
    if (entry.monitorState !== "CHECK_FAILED" || entry.observedRevision !== null || entry.contentDigest !== null) {
      fail(`REMOTE_CHECK_FAILED must not claim a successful observed revision or digest for ${entry.sourceId}`);
    }
  }

  if (source.sourceType === "github-repo") {
    if (MANUAL_REASON_CODES.has(entry.reasonCode) || ["MANUAL_REVIEW_RECEIPT", "NOT_APPLICABLE"].includes(entry.comparisonBasis)) {
      fail(`manual freshness reason or basis is invalid for GitHub source ${entry.sourceId}`);
    }
    if (["CURRENT", "CHANGED"].includes(entry.monitorState)) {
      if (entry.observedRevision?.kind !== "git-sha" || comparisonRevision === null) {
        fail(`freshness ${entry.monitorState} requires an observed Git SHA and comparison revision for ${entry.sourceId}`);
      }
      if (entry.monitorState === "CURRENT") {
        if (entry.observedRevision.value !== comparisonRevision) {
          fail(`CURRENT requires a matching exact comparison revision and observed Git SHA for ${entry.sourceId}`);
        }
        if (!["COMPARISON_MATCH", "DEGRADED_COMPARISON_MATCH"].includes(entry.reasonCode)) {
          fail(`CURRENT requires a comparison-match reasonCode for ${entry.sourceId}`);
        }
      } else {
        if (entry.observedRevision.value === comparisonRevision) {
          fail(`CHANGED requires different exact comparison and observed Git SHAs for ${entry.sourceId}`);
        }
        if (!["UPSTREAM_CHANGED", "DEGRADED_UPSTREAM_CHANGED"].includes(entry.reasonCode)) {
          fail(`CHANGED requires an upstream-change reasonCode for ${entry.sourceId}`);
        }
      }
    } else if (entry.monitorState === "CHECK_FAILED") {
      const usableGitComparison = (
        comparisonRevision !== null &&
        GIT_SHA.test(comparisonRevision) &&
        ["PRIOR_MONITOR_OBSERVATION", "REVIEWED_REVISION", "LEGACY_REVIEW_METADATA"].includes(entry.comparisonBasis)
      );
      if (entry.reasonCode === "BASELINE_MISSING") {
        // Validated above: no usable comparison baseline exists.
      } else if (["REMOTE_CHECK_FAILED", "IDENTITY_DRIFT_DETECTED"].includes(entry.reasonCode)) {
        if (!usableGitComparison || entry.observedRevision !== null || entry.contentDigest !== null) {
          fail(`${entry.reasonCode} requires a Git comparison baseline without observed revision or digest for ${entry.sourceId}`);
        }
      } else {
        fail(`GitHub CHECK_FAILED requires BASELINE_MISSING, REMOTE_CHECK_FAILED, or IDENTITY_DRIFT_DETECTED for ${entry.sourceId}`);
      }
    }
  } else if (source.sourceType === "manual-reviewed-doc") {
    if (GIT_COMPARISON_REASON_CODES.has(entry.reasonCode) || ["PRIOR_MONITOR_OBSERVATION", "REVIEWED_REVISION", "LEGACY_REVIEW_METADATA"].includes(entry.comparisonBasis)) {
      fail(`Git comparison reason or basis is invalid for manual source ${entry.sourceId}`);
    }
    if (entry.reasonCode === "MANUAL_CURRENT") {
      if (
        entry.monitorState !== "CURRENT" ||
        entry.comparisonBasis !== "MANUAL_REVIEW_RECEIPT" ||
        !entry.observedRevision ||
        entry.observedRevision.value !== comparisonRevision
      ) {
        fail(`MANUAL_CURRENT requires receipt-backed current evidence matching its comparison revision for ${entry.sourceId}`);
      }
      if (
        source.review?.state !== "REVIEWED_CURRENT" ||
        !sameRevision(entry.observedRevision, source.review.reviewedRevision) ||
        entry.contentDigest !== source.review.reviewedDigest ||
        comparisonRevision !== source.review.reviewedRevision?.value ||
        Date.parse(source.review.expiresAt) <= Date.parse(entry.checkedAt)
      ) {
        fail(`MANUAL_CURRENT requires non-expired catalog receipt evidence at checkedAt for ${entry.sourceId}`);
      }
    }
    if (entry.reasonCode === "MANUAL_DUE") {
      if (entry.monitorState !== "MANUAL_DUE" || entry.comparisonBasis !== "MANUAL_REVIEW_RECEIPT" || comparisonRevision === null) {
        fail(`MANUAL_DUE requires complete receipt-backed comparison evidence for ${entry.sourceId}`);
      }
      if (
        typeof source.review?.currentReceipt !== "string" ||
        !source.review.reviewedRevision ||
        typeof source.review.reviewedDigest !== "string" ||
        comparisonRevision !== source.review.reviewedRevision.value ||
        Date.parse(source.review.expiresAt) > Date.parse(entry.checkedAt)
      ) {
        fail(`MANUAL_DUE requires expired catalog receipt evidence at checkedAt for ${entry.sourceId}`);
      }
    }
    if (entry.reasonCode === "MANUAL_EVIDENCE_REQUIRED") {
      if (entry.monitorState !== "CHECK_FAILED" || entry.comparisonBasis !== "MISSING" || comparisonRevision !== null) {
        fail(`MANUAL_EVIDENCE_REQUIRED requires CHECK_FAILED with missing comparison evidence for ${entry.sourceId}`);
      }
    }
  }
  return true;
}

export function validateSourceCatalog(catalog, options = {}) {
  return validateSourceCatalogContract(catalog, options);
}

function catalogForReviewTransition(parsedCatalog, now) {
  const catalog = structuredClone(parsedCatalog);
  const nowTime = Date.parse(now);
  for (const source of Array.isArray(catalog.sources) ? catalog.sources : []) {
    const expiresAt = Date.parse(source?.review?.expiresAt);
    if (
      source?.review?.currentReceipt !== null &&
      Number.isFinite(expiresAt) &&
      expiresAt <= nowTime
    ) {
      source.review.state = "QUARANTINED";
    }
  }
  return catalog;
}

export function evaluateDependentResourceEligibility(source, options = {}) {
  if (source.monitor?.state !== "CURRENT" || source.review?.state !== "REVIEWED_CURRENT") {
    return { eligible: false, reason: "source-not-reviewed-current" };
  }
  if (!["SYNCED_ADOPTED", "SYNCED_PLUGIN_DELEGATED"].includes(source.review?.disposition)) {
    return { eligible: false, reason: `review-disposition-${source.review?.disposition ?? "missing"}` };
  }
  if (source.runtimePosture === "metadata-only" || source.runtimePosture === "forbidden-runtime") {
    return { eligible: false, reason: `runtime-posture-${source.runtimePosture}` };
  }
  if (source.runtimePosture === "active-if-detected" && options.projectDetected !== true) {
    return { eligible: false, reason: "independent-project-detection-required" };
  }
  if (["owner-approved-install", "ci-advisory"].includes(source.runtimePosture) && options.ownerApproved !== true) {
    return { eligible: false, reason: "separate-owner-approval-required" };
  }
  return { eligible: true, reason: "reviewed-current-and-independently-detected" };
}

export function validateSourceReviewReceipt(receipt, options = {}) {
  return validateSourceReviewReceiptContract(receipt, options);
}
export function validateFreshnessReport(catalog, report, options = {}) {
  validateSourceCatalog(catalog, options);
  requireRecord(report, "freshnessReport");
  rejectUnknownFields(
    report,
    new Set([
      "schemaVersion",
      "catalogIdentity",
      "checkedAt",
      "mode",
      "readOnly",
      "disclaimer",
      "sourceCount",
      "monitorCounts",
      "actionableCount",
      "actionableCountsByScope",
      "releaseScope",
      "sources"
    ]),
    "freshnessReport"
  );
  if (report.schemaVersion !== FRESHNESS_REPORT_SCHEMA_VERSION) fail(`freshnessReport.schemaVersion must be ${FRESHNESS_REPORT_SCHEMA_VERSION}`);
  const expectedCatalogIdentity = {
    schemaVersion: catalog.schemaVersion,
    catalogId: catalog.catalogId,
    sourceCount: catalog.sources.length
  };
  if (JSON.stringify(report.catalogIdentity) !== JSON.stringify(expectedCatalogIdentity)) {
    fail("freshnessReport.catalogIdentity does not match the canonical catalog");
  }
  requireIsoInstant(report.checkedAt, "freshnessReport.checkedAt");
  const now = requireNow(options.now);
  if (report.mode === "mock" && options.allowMock !== true) {
    fail("mock freshness reports are not valid governance evidence");
  }
  if (!["live", "mock"].includes(report.mode)) fail("freshnessReport.mode must be live or mock");
  if (report.readOnly !== true) fail("freshnessReport.readOnly must be true");
  requireString(report.disclaimer, "freshnessReport.disclaimer");
  if (!Number.isInteger(report.actionableCount) || report.actionableCount < 0) {
    fail("freshnessReport.actionableCount must be a non-negative integer");
  }
  const reportTime = Date.parse(report.checkedAt);
  const nowTime = Date.parse(now);
  if (reportTime > nowTime) fail("freshnessReport.checkedAt must not be in the future");
  if (report.mode === "live" && nowTime - reportTime > DAY_MS) {
    fail("live freshness evidence is older than 24 hours");
  }
  if (!Array.isArray(report.sources)) fail("freshnessReport.sources must be an array");
  if (report.sources.length !== catalog.sources.length) fail("freshness report must include every catalog source exactly once");
  const catalogById = new Map(catalog.sources.map((entry) => [entry.id, entry]));
  const requireCatalogAgreement = options.requireCatalogAgreement !== false;
  const seen = new Set();
  let actionableCount = 0;
  for (const [index, entry] of report.sources.entries()) {
    requireRecord(entry, `freshnessReport.sources[${index}]`);
    rejectUnknownFields(
      entry,
      new Set([
        "sourceId",
        "identityKey",
        "scope",
        "monitorState",
        "observedRevision",
        "contentDigest",
        "comparisonRevision",
        "comparisonBasis",
        "reasonCode",
        "checkedAt",
        "missingCurrentReview",
        "evidence"
      ]),
      "freshnessReport source"
    );
    const source = catalogById.get(entry.sourceId);
    if (!source) fail(`freshness report contains unknown source: ${entry.sourceId}`);
    if (seen.has(entry.sourceId)) fail(`freshness report contains duplicate source: ${entry.sourceId}`);
    seen.add(entry.sourceId);
    if (entry.identityKey !== source.identityKey || entry.scope !== source.scope) {
      fail(`freshness source identity or scope does not match catalog for ${entry.sourceId}`);
    }
    if (requireCatalogAgreement && entry.monitorState !== source.monitor.state) {
      fail(`freshness monitor state does not match catalog for ${entry.sourceId}`);
    }
    if (!MONITOR_STATE_SET.has(entry.monitorState)) fail(`freshness monitor state is unsupported for ${entry.sourceId}`);
    validateRevision(entry.observedRevision, `freshnessReport.sources[${index}].observedRevision`, { nullable: true });
    const structuredEvidence = validateStructuredFreshnessEvidence(entry, source, index);
    if (["CURRENT", "CHANGED"].includes(entry.monitorState)) {
      if (!entry.observedRevision || typeof entry.contentDigest !== "string" || !SHA256.test(entry.contentDigest)) {
        fail(`freshness ${entry.monitorState} evidence requires exact revision and digest for ${entry.sourceId}`);
      }
    } else if (entry.observedRevision !== null || entry.contentDigest !== null) {
      fail(`freshness ${entry.monitorState} evidence must not claim a revision or digest for ${entry.sourceId}`);
    }
    if (requireCatalogAgreement && !sameRevision(entry.observedRevision, source.monitor.observedRevision)) {
      fail(`freshness revision does not match catalog for ${entry.sourceId}`);
    }
    if (requireCatalogAgreement && entry.contentDigest !== source.monitor.contentDigest) {
      fail(`freshness digest does not match catalog for ${entry.sourceId}`);
    }
    requireIsoInstant(entry.checkedAt, `freshnessReport.sources[${index}].checkedAt`, { nullable: true });
    if (entry.checkedAt !== report.checkedAt) fail(`freshness checkedAt must match report.checkedAt for ${entry.sourceId}`);
    if (requireCatalogAgreement && entry.checkedAt !== source.monitor.checkedAt) {
      fail(`freshness checkedAt does not match catalog for ${entry.sourceId}`);
    }
    if (typeof entry.missingCurrentReview !== "boolean") {
      fail(`freshness missingCurrentReview must be boolean for ${entry.sourceId}`);
    }
    const expectedMissingReview = (
      source.review.state !== "REVIEWED_CURRENT" ||
      !sameRevision(source.review.reviewedRevision, entry.observedRevision) ||
      source.review.reviewedDigest !== entry.contentDigest
    );
    if (entry.missingCurrentReview !== expectedMissingReview) {
      fail(`freshness missingCurrentReview does not match catalog review state for ${entry.sourceId}`);
    }
    const evidence = requireRecord(entry.evidence, `freshnessReport.sources[${index}].evidence`);
    rejectUnknownFields(
      evidence,
      new Set([
        "observationMode",
        "legacyStatus",
        "sourceType",
        "sourceUrl",
        "digestBasis",
        "latestCommitDate",
        "releaseSignal",
        "licenseSignal",
        "notes",
        "watchedPathSignals"
      ]),
      "freshness evidence"
    );
    requireString(evidence.observationMode, `freshnessReport.sources[${index}].evidence.observationMode`);
    if (!new Set(["live-read-only", "deterministic-mock", "manual-receipt-only", "manual-evidence-required"]).has(evidence.observationMode)) {
      fail(`freshness evidence observationMode is unsupported for ${entry.sourceId}`);
    }
    requireString(evidence.legacyStatus, `freshnessReport.sources[${index}].evidence.legacyStatus`);
    if (evidence.sourceType !== source.sourceType || evidence.sourceUrl !== source.sourceUrl) {
      fail(`freshness evidence source identity does not match catalog for ${entry.sourceId}`);
    }
    if (["CURRENT", "CHANGED"].includes(entry.monitorState)) {
      const expectedDigestBasis = source.sourceType === "manual-reviewed-doc"
        ? "manual-review-receipt"
        : "git-revision-identity";
      if (evidence.digestBasis !== expectedDigestBasis) {
        fail(`freshness evidence digestBasis must be ${expectedDigestBasis} for ${entry.sourceId}`);
      }
    }
    if (structuredEvidence) {
      const expectedObservationMode = report.mode === "mock"
        ? "deterministic-mock"
        : source.sourceType === "manual-reviewed-doc"
          ? entry.reasonCode === "MANUAL_EVIDENCE_REQUIRED"
            ? "manual-evidence-required"
            : "manual-receipt-only"
          : "live-read-only";
      if (evidence.observationMode !== expectedObservationMode) {
        fail(`freshness evidence observationMode must be ${expectedObservationMode} for ${entry.sourceId}`);
      }
    }
    if (!Array.isArray(evidence.watchedPathSignals)) {
      fail(`freshness evidence watchedPathSignals must be an array for ${entry.sourceId}`);
    }
    if (entry.monitorState !== "CURRENT" || entry.missingCurrentReview) actionableCount += 1;
  }
  if (report.actionableCount !== actionableCount) {
    fail("freshnessReport.actionableCount does not match source evidence");
  }
  const accounting = deriveSourceReleaseAccounting({
    catalog,
    domainPacksRegistry: options.domainPacksRegistry ?? null,
    freshnessReport: report
  });
  if (report.sourceCount !== accounting.sourceCount) fail("freshnessReport.sourceCount does not match catalog");
  if (JSON.stringify(report.monitorCounts) !== JSON.stringify(accounting.monitorCounts)) {
    fail("freshnessReport.monitorCounts do not match source evidence");
  }
  if (JSON.stringify(report.actionableCountsByScope) !== JSON.stringify(accounting.actionableCountsByScope)) {
    fail("freshnessReport.actionableCountsByScope do not match source evidence");
  }
  const expectedReleaseScope = {
    supportedPackIds: accounting.supportedPackIds,
    releaseBlockingSourceCount: accounting.releaseBlockingSourceCount,
    releaseBlockingSourceIds: accounting.releaseBlockingSourceIds,
    releaseNonblockingActionableCount: accounting.releaseNonblockingActionableCount
  };
  if (JSON.stringify(report.releaseScope) !== JSON.stringify(expectedReleaseScope)) {
    fail("freshnessReport.releaseScope does not match dependency-scoped source evidence");
  }
  return report;
}

async function readJsonDocumentWithin(repositoryRoot, relativePath, label) {
  const absolute = path.resolve(repositoryRoot, relativePath);
  assertRegularFileWithin(repositoryRoot, absolute, label);
  const text = await readFile(absolute, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    fail(`${label} must contain valid JSON: ${error.message}`);
  }
  return { parsed, text, absolute };
}

async function readJsonWithin(repositoryRoot, relativePath, label) {
  return (await readJsonDocumentWithin(repositoryRoot, relativePath, label)).parsed;
}

function receiptRelativePath(receipt) {
  const revision = receipt.reviewedRevision.value.replace(/^sha256:/, "");
  return `sources/reviews/${receipt.sourceId}/${revision}.json`;
}

function canonicalJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function verifyRollbackCommit(repositoryRoot, revision) {
  const options = {
    cwd: repositoryRoot,
    shell: false,
    stdio: "ignore",
    timeout: 5_000,
    windowsHide: true
  };
  try {
    execFileSync("git", ["cat-file", "-e", `${revision}^{commit}`], options);
    execFileSync("git", ["merge-base", "--is-ancestor", revision, "HEAD"], options);
  } catch {
    fail(`receipt.rollbackTarget.artifactRevision is not an available ancestor commit: ${revision}`);
  }
}

function sha256Bytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function parseMethodSourceRefs(text, artifactPath) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
  if (!frontmatter) return [];
  const raw = /^sourceRef:\s*(.+)$/m.exec(frontmatter)?.[1]?.trim();
  if (!raw) return [];
  let parsed;
  if (raw.startsWith("[")) {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      fail(`method ${artifactPath} has invalid sourceRef JSON: ${error.message}`);
    }
  } else {
    parsed = raw.split(",").map((entry) => entry.trim().replace(/^["']|["']$/g, ""));
  }
  if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    fail(`method ${artifactPath} sourceRef must contain source IDs`);
  }
  return parsed;
}

async function discoverMethodArtifactsBySource(repositoryRoot) {
  const methodsRoot = path.join(repositoryRoot, "methods");
  const bySource = new Map();

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) fail(`methods inventory contains a linked path: ${absolute}`);
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const safe = assertRegularFileWithin(repositoryRoot, absolute, "governed method artifact");
      const artifactPath = path.relative(repositoryRoot, safe).split(path.sep).join("/");
      const sourceRefs = parseMethodSourceRefs(await readFile(safe, "utf8"), artifactPath);
      for (const sourceRef of sourceRefs) {
        const artifacts = bySource.get(sourceRef) ?? new Set();
        artifacts.add(artifactPath);
        bySource.set(sourceRef, artifacts);
      }
    }
  }

  await visit(methodsRoot);
  return bySource;
}

async function verifyReceiptArtifactCoverage(repositoryRoot, source, receipt) {
  if (receipt.adoption.disposition !== "SYNCED_ADOPTED") return;
  for (const evidence of receipt.artifactEvidence.artifacts) {
    const absolute = assertRegularFileWithin(
      repositoryRoot,
      path.resolve(repositoryRoot, evidence.path),
      `adopted artifact for ${source.id}`
    );
    const actualDigest = sha256Bytes(await readFile(absolute));
    if (actualDigest !== evidence.contentDigest) {
      fail(`artifact content digest for ${evidence.path} does not match the receipt`);
    }
  }

  const methodArtifacts = await discoverMethodArtifactsBySource(repositoryRoot);
  const catalogedArtifacts = new Set(source.affectedArtifacts);
  const sourceIdentities = [source.id, ...source.aliases];
  for (const identity of sourceIdentities) {
    for (const artifactPath of methodArtifacts.get(identity) ?? []) {
      if (!catalogedArtifacts.has(artifactPath)) {
        fail(`adopted method artifact ${artifactPath} is missing from catalog coverage for ${source.id}`);
      }
    }
  }
  if (source.dependentResourceIds.length > 0 && !catalogedArtifacts.has("registries/tools.registry.json")) {
    fail(`adopted source ${source.id} owns dependent tools but omits registries/tools.registry.json from artifact coverage`);
  }
}

function historicalReceiptSource(source, receipt) {
  return {
    ...source,
    monitor: {
      state: "CURRENT",
      checkedAt: receipt.reviewedAt,
      observedRevision: receipt.reviewedRevision,
      contentDigest: receipt.contentDigest,
      failureReason: null
    },
    runtimePosture: receipt.adoption?.runtimePosture ?? source.runtimePosture,
    affectedArtifacts: Array.isArray(receipt.affectedArtifacts)
      ? receipt.affectedArtifacts
      : source.affectedArtifacts
  };
}

async function validateImmutableReceiptChain({
  repositoryRoot,
  source,
  authorizedApproverIdentities,
  now,
  verifyHeadArtifacts = true
}) {
  let receiptPath = source.review.currentReceipt;
  let expectedDigest = source.review.receiptDigest;
  if (receiptPath === null) return { count: 0, headReceipt: null };

  const seen = new Set();
  let count = 0;
  let headReceipt = null;
  let childReviewedAt = null;
  while (receiptPath !== null) {
    assertSafeRelativePath(receiptPath, "prior receipt chain path");
    if (seen.has(receiptPath)) fail(`receipt chain for ${source.id} contains a cycle at ${receiptPath}`);
    seen.add(receiptPath);

    let document;
    try {
      document = await readJsonDocumentWithin(
        repositoryRoot,
        receiptPath,
        `prior receipt chain for ${source.id}`
      );
    } catch (error) {
      if (error?.code === "ENOENT" || /does not exist/i.test(error?.message || "")) {
        fail(`prior receipt chain for ${source.id} does not exist at ${receiptPath}`);
      }
      throw error;
    }
    if (sha256Text(document.text) !== expectedDigest) {
      fail(`receipt chain digest for ${source.id} does not match at ${receiptPath}`);
    }
    const receipt = document.parsed;
    if (receipt.sourceId !== source.id) fail(`receipt chain path ${receiptPath} belongs to a different source`);
    if (receiptRelativePath(receipt) !== receiptPath) {
      fail(`receipt chain path for ${source.id} is not the deterministic reviewed revision path`);
    }

    const isHead = count === 0;
    const rollback = isRecord(receipt.rollbackTarget) ? receipt.rollbackTarget : {};
    if (
      isHead &&
      (rollback.previousReceipt !== source.review.previousReceipt ||
        rollback.previousReceiptDigest !== source.review.previousReceiptDigest)
    ) {
      fail(`receipt chain head for ${source.id} does not match the catalog prior receipt link`);
    }
    const isCurrentReview = Boolean(
      isHead &&
      source.review.state === "REVIEWED_CURRENT" &&
      sameRevision(receipt.reviewedRevision, source.monitor.observedRevision) &&
      receipt.contentDigest === source.monitor.contentDigest
    );
    validateSourceReviewReceipt(receipt, {
      source: isCurrentReview ? source : historicalReceiptSource(source, receipt),
      now: isCurrentReview ? now : receipt.approver?.approvedAt ?? now,
      authorizedApproverIdentities,
      expectedPreviousReceipt: rollback.previousReceipt,
      expectedPreviousReceiptDigest: rollback.previousReceiptDigest
    });
    if (childReviewedAt !== null && Date.parse(receipt.reviewedAt) >= Date.parse(childReviewedAt)) {
      fail(`receipt chain reviewedAt ordering for ${source.id} is not strictly newest to oldest`);
    }
    verifyRollbackCommit(repositoryRoot, receipt.rollbackTarget.artifactRevision);
    if (isHead && verifyHeadArtifacts) {
      await verifyReceiptArtifactCoverage(repositoryRoot, source, receipt);
    }
    if (isHead) headReceipt = receipt;
    childReviewedAt = receipt.reviewedAt;
    receiptPath = rollback.previousReceipt;
    expectedDigest = rollback.previousReceiptDigest;
    count += 1;
  }
  return { count, headReceipt };
}

function removeMutationLock(repositoryRoot, lockPath) {
  const safeLock = assertRegularFileWithin(repositoryRoot, lockPath, "source governance mutation lock");
  rmSync(safeLock);
}

function readMutationLockIfPresent(repositoryRoot, lockPath) {
  let safeLock;
  try {
    safeLock = assertRegularFileWithin(repositoryRoot, lockPath, "source governance mutation lock");
  } catch (error) {
    if (error?.code === "ENOENT" || /does not exist/i.test(error?.message || "")) return null;
    throw error;
  }
  const text = readFileSync(safeLock, "utf8");
  let parsed = null;
  try {
    const candidate = JSON.parse(text);
    if (
      isRecord(candidate) &&
      candidate.schemaVersion === "1.0.0" &&
      ["source-review", "source-freshness"].includes(candidate.operation) &&
      Number.isInteger(candidate.ownerPid) &&
      candidate.ownerPid > 0 &&
      typeof candidate.token === "string" &&
      candidate.token.length > 0 &&
      typeof candidate.createdAt === "string" &&
      ISO_INSTANT.test(candidate.createdAt) &&
      !Number.isNaN(Date.parse(candidate.createdAt))
    ) {
      parsed = candidate;
    }
  } catch {
    // An invalid lock is never safe to reclaim automatically.
  }
  return { safeLock, text, parsed };
}

function processIsAlive(pid) {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function acquireMutationLock(repositoryRoot, operation, now) {
  const lockPath = path.join(repositoryRoot, SOURCE_GOVERNANCE_MUTATION_LOCK);
  const existing = readMutationLockIfPresent(repositoryRoot, lockPath);
  if (existing) {
    const age = existing.parsed ? Date.parse(now) - Date.parse(existing.parsed.createdAt) : -1;
    const stale = Boolean(
      existing.parsed &&
      age > MUTATION_LOCK_STALE_AFTER_MS &&
      !processIsAlive(existing.parsed.ownerPid)
    );
    if (!stale) {
      const holder = existing.parsed?.operation ?? "an unverified owner";
      fail(`source governance mutation lock is held by ${holder}; retry after that mutation completes`);
    }
    if (readFileSync(existing.safeLock, "utf8") !== existing.text) {
      fail("source governance mutation lock changed during stale-lock recovery");
    }
    removeMutationLock(repositoryRoot, lockPath);
  }

  const lock = {
    schemaVersion: "1.0.0",
    operation,
    ownerPid: process.pid,
    token: randomUUID(),
    createdAt: now
  };
  const contents = `${JSON.stringify(lock)}\n`;
  try {
    writeManagedNewFile({
      root: repositoryRoot,
      candidate: lockPath,
      contents,
      label: "source governance mutation lock"
    });
  } catch (error) {
    fail(`source governance mutation lock could not be acquired: ${error.message}`);
  }
  return { lockPath, contents };
}

function releaseMutationLock(repositoryRoot, lock) {
  const safeLock = assertRegularFileWithin(repositoryRoot, lock.lockPath, "source governance mutation lock");
  if (readFileSync(safeLock, "utf8") !== lock.contents) {
    fail("source governance mutation lock ownership changed before release");
  }
  removeMutationLock(repositoryRoot, lock.lockPath);
}

export async function applySourceReview(options = {}) {
  const repositoryRoot = path.resolve(requireString(options.repositoryRoot, "repositoryRoot"));
  const mode = options.mode ?? "dry-run";
  if (!new Set(["dry-run", "confirm-write"]).has(mode)) fail("mode must be dry-run or confirm-write");
  const now = requireNow(options.now);
  if (mode === "confirm-write" && options[MUTATION_LOCK_HELD] !== true) {
    const mutationLock = acquireMutationLock(repositoryRoot, "source-review", now);
    try {
      recoverManagedDirectoryTransaction({
        repositoryRoot,
        managedRoot: path.join(repositoryRoot, "sources")
      });
      return await applySourceReview({
        ...options,
        repositoryRoot,
        mode,
        now,
        [MUTATION_LOCK_HELD]: true
      });
    } finally {
      releaseMutationLock(repositoryRoot, mutationLock);
    }
  }
  const catalogDocument = await readJsonDocumentWithin(
    repositoryRoot,
    "sources/source-watchlist.json",
    "source catalog"
  );
  const catalog = catalogForReviewTransition(catalogDocument.parsed, now);
  validateSourceCatalog(catalog, { now });
  const receiptInputPath = assertSafeRelativePath(options.receiptPath, "receiptPath");
  const receipt = await readJsonWithin(repositoryRoot, receiptInputPath, "source review receipt input");
  const source = catalog.sources.find((entry) => entry.id === receipt.sourceId);
  if (!source) fail(`receipt references unknown source: ${receipt.sourceId}`);
  await validateImmutableReceiptChain({
    repositoryRoot,
    source,
    authorizedApproverIdentities: catalog.approverPolicy.authorizedIdentities,
    now
  });
  const destination = receiptRelativePath(receipt);
  const receiptText = canonicalJson(receipt);
  const receiptDigest = sha256Text(receiptText);
  const alreadyCurrent = source.review.currentReceipt === destination && source.review.receiptDigest === receiptDigest;
  const expectedPreviousReceipt = alreadyCurrent
    ? source.review.previousReceipt
    : source.review.currentReceipt;
  const expectedPreviousReceiptDigest = alreadyCurrent
    ? source.review.previousReceiptDigest
    : source.review.receiptDigest;
  validateSourceReviewReceipt(receipt, {
    source,
    now,
    authorizedApproverIdentities: catalog.approverPolicy.authorizedIdentities,
    expectedPreviousReceipt,
    expectedPreviousReceiptDigest
  });
  await verifyReceiptArtifactCoverage(repositoryRoot, source, receipt);
  verifyRollbackCommit(repositoryRoot, receipt.rollbackTarget.artifactRevision);
  const blocked = ["ARCHIVED_HARD_BLOCKER", "REMOVED_REDUNDANT"].includes(receipt.adoption.disposition);
  const updated = structuredClone(catalog);
  const updatedSource = updated.sources.find((entry) => entry.id === source.id);
  updatedSource.monitor.state = "CURRENT";
  updatedSource.monitor.failureReason = null;
  updatedSource.review = {
    state: blocked ? "QUARANTINED" : "REVIEWED_CURRENT",
    currentReceipt: destination,
    previousReceipt: expectedPreviousReceipt,
    receiptDigest,
    previousReceiptDigest: expectedPreviousReceiptDigest,
    reviewedRevision: structuredClone(receipt.reviewedRevision),
    reviewedDigest: receipt.contentDigest,
    reviewedAt: receipt.reviewedAt,
    expiresAt: receipt.expiresAt,
    disposition: receipt.adoption.disposition
  };
  validateSourceCatalog(updated, { now });

  const result = {
    mode,
    sourceId: source.id,
    disposition: receipt.adoption.disposition,
    receiptPath: destination,
    catalogPath: "sources/source-watchlist.json",
    receiptDigest,
    alreadyCurrent,
    generatedMirrorsUpdated: false
  };
  if (mode === "dry-run") return result;

  const destinationAbsolute = path.resolve(repositoryRoot, destination);
  let existing = null;
  try {
    existing = await readFile(assertRegularFileWithin(repositoryRoot, destinationAbsolute, "existing source review receipt"), "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT" && !/does not exist/i.test(error?.message || "")) throw error;
  }
  if (existing !== null && existing !== receiptText) {
    fail("immutable receipt already exists with different content");
  }

  if (alreadyCurrent && existing === receiptText) return result;

  if (readFileSync(catalogDocument.absolute, "utf8") !== catalogDocument.text) {
    fail("canonical source catalog changed after validation; retry the review application");
  }
  runManagedDirectoryTransaction({
    repositoryRoot,
    managedRoot: path.join(repositoryRoot, "sources"),
    label: "source review application",
    prepare(staging) {
      if (staging.readFile("source-watchlist.json", "utf8") !== catalogDocument.text) {
        fail("canonical source catalog changed before transaction staging; retry the review application");
      }
      if (existing === null) {
        staging.writeFile(
          destination.replace(/^sources\//, ""),
          receiptText,
          "utf8",
          "immutable source review receipt"
        );
      }
      staging.writeFile(
        "source-watchlist.json",
        canonicalJson(updated),
        "utf8",
        "canonical source catalog update"
      );
    },
    beforeBackup() {
      if (readFileSync(catalogDocument.absolute, "utf8") !== catalogDocument.text) {
        fail("canonical source catalog changed before atomic backup; retry the review application");
      }
    },
    validate(staging) {
      const stagedCatalog = JSON.parse(staging.readFile("source-watchlist.json", "utf8"));
      validateSourceCatalog(stagedCatalog, { now });
      const stagedSource = stagedCatalog.sources.find((entry) => entry.id === source.id);
      const stagedReceiptText = staging.readFile(destination.replace(/^sources\//, ""), "utf8");
      if (sha256Text(stagedReceiptText) !== stagedSource.review.receiptDigest) {
        fail("staged receipt digest does not match the catalog");
      }
      const stagedReceipt = JSON.parse(stagedReceiptText);
      validateSourceReviewReceipt(stagedReceipt, {
        source: stagedSource,
        now,
        authorizedApproverIdentities: stagedCatalog.approverPolicy.authorizedIdentities,
        expectedPreviousReceipt: stagedSource.review.previousReceipt,
        expectedPreviousReceiptDigest: stagedSource.review.previousReceiptDigest
      });
    }
  });
  return result;
}

export async function applySourceFreshness(options = {}) {
  const repositoryRoot = path.resolve(requireString(options.repositoryRoot, "repositoryRoot"));
  const mode = options.mode ?? "dry-run";
  if (!new Set(["dry-run", "confirm-write"]).has(mode)) fail("mode must be dry-run or confirm-write");
  const now = requireNow(options.now);
  if (mode === "confirm-write" && options[MUTATION_LOCK_HELD] !== true) {
    const mutationLock = acquireMutationLock(repositoryRoot, "source-freshness", now);
    try {
      recoverManagedDirectoryTransaction({
        repositoryRoot,
        managedRoot: path.join(repositoryRoot, "sources")
      });
      return await applySourceFreshness({
        ...options,
        repositoryRoot,
        mode,
        now,
        [MUTATION_LOCK_HELD]: true
      });
    } finally {
      releaseMutationLock(repositoryRoot, mutationLock);
    }
  }
  const catalogDocument = await readJsonDocumentWithin(
    repositoryRoot,
    "sources/source-watchlist.json",
    "source catalog"
  );
  const catalog = catalogForReviewTransition(catalogDocument.parsed, now);
  validateSourceCatalog(catalog, { now });
  const reportPath = assertSafeRelativePath(options.freshnessReport, "freshnessReport");
  const report = await readJsonWithin(repositoryRoot, reportPath, "source freshness report");
  const domainPacksRegistry = await readJsonWithin(
    repositoryRoot,
    "registries/domain-packs.registry.json",
    "domain packs registry"
  );
  validateFreshnessReport(catalog, report, {
    now,
    requireCatalogAgreement: false,
    domainPacksRegistry
  });

  const updated = structuredClone(catalog);
  const reportBySourceId = new Map(report.sources.map((entry) => [entry.sourceId, entry]));
  for (const source of updated.sources) {
    const observation = reportBySourceId.get(source.id);
    source.monitor = {
      state: observation.monitorState,
      checkedAt: observation.checkedAt,
      observedRevision: structuredClone(observation.observedRevision),
      contentDigest: observation.contentDigest,
      failureReason: ["CURRENT", "CHANGED"].includes(observation.monitorState)
        ? null
        : observation.reasonCode || observation.evidence.notes || observation.evidence.legacyStatus
    };
    if (observation.monitorState !== "CURRENT" || observation.missingCurrentReview) {
      source.review.state = "QUARANTINED";
    }
  }
  validateSourceCatalog(updated, { now });
  validateFreshnessReport(updated, report, { now, domainPacksRegistry });
  const counts = Object.fromEntries(MONITOR_STATES.map((state) => [state, 0]));
  for (const source of updated.sources) counts[source.monitor.state] += 1;
  const result = {
    mode,
    catalogPath: "sources/source-watchlist.json",
    freshnessReport: reportPath,
    checkedAt: report.checkedAt,
    sourceCount: updated.sources.length,
    actionableCount: report.actionableCount,
    counts,
    generatedMirrorsUpdated: false,
    runtimePosturesChanged: false,
    reviewsApproved: false
  };
  if (mode === "dry-run") return result;

  if (readFileSync(catalogDocument.absolute, "utf8") !== catalogDocument.text) {
    fail("canonical source catalog changed after freshness validation; retry the sync");
  }
  runManagedDirectoryTransaction({
    repositoryRoot,
    managedRoot: path.join(repositoryRoot, "sources"),
    label: "source freshness sync",
    prepare(staging) {
      if (staging.readFile("source-watchlist.json", "utf8") !== catalogDocument.text) {
        fail("canonical source catalog changed before freshness staging; retry the sync");
      }
      staging.writeFile(
        "source-watchlist.json",
        canonicalJson(updated),
        "utf8",
        "canonical source freshness update"
      );
    },
    beforeBackup() {
      if (readFileSync(catalogDocument.absolute, "utf8") !== catalogDocument.text) {
        fail("canonical source catalog changed before freshness backup; retry the sync");
      }
    },
    validate(staging) {
      const stagedCatalog = JSON.parse(staging.readFile("source-watchlist.json", "utf8"));
      validateSourceCatalog(stagedCatalog, { now });
      validateFreshnessReport(stagedCatalog, report, { now, domainPacksRegistry });
    }
  });
  return result;
}

export async function mirrorSourceCatalog(options = {}) {
  const repositoryRoot = path.resolve(requireString(options.repositoryRoot, "repositoryRoot"));
  const sourcePath = assertRegularFileWithin(
    repositoryRoot,
    path.join(repositoryRoot, "sources", "source-watchlist.json"),
    "canonical source catalog"
  );
  const text = await readFile(sourcePath, "utf8");
  const mirror = new ManagedFilesystem({
    repositoryRoot,
    managedRoot: path.join(repositoryRoot, ".ai-toolkit", "sources"),
    label: "generated source mirror"
  });
  mirror.ensureDirectory(".", "generated source mirror root");
  mirror.writeFile("watchlist.json", text, "utf8", "generated source catalog mirror");
  return { source: "sources/source-watchlist.json", target: ".ai-toolkit/sources/watchlist.json" };
}

export async function validateSourceGovernanceRepository(options = {}) {
  const repositoryRoot = path.resolve(requireString(options.repositoryRoot, "repositoryRoot"));
  const now = requireNow(options.now);
  const catalog = await readJsonWithin(repositoryRoot, "sources/source-watchlist.json", "source catalog");
  validateSourceCatalog(catalog, { now });
  const canonicalPath = assertRegularFileWithin(
    repositoryRoot,
    path.join(repositoryRoot, "sources", "source-watchlist.json"),
    "canonical source catalog"
  );
  const mirrorPath = assertRegularFileWithin(
    repositoryRoot,
    path.join(repositoryRoot, ".ai-toolkit", "sources", "watchlist.json"),
    "generated source catalog mirror"
  );
  if (await readFile(canonicalPath, "utf8") !== await readFile(mirrorPath, "utf8")) {
    fail("generated source catalog mirror drift detected");
  }
  const toolRegistry = await readJsonWithin(repositoryRoot, "registries/tools.registry.json", "tool registry");
  const domainPacksRegistry = await readJsonWithin(
    repositoryRoot,
    "registries/domain-packs.registry.json",
    "domain packs registry"
  );
  const toolIds = new Set((toolRegistry.tools || []).map((tool) => tool.id));
  const dependentOwners = new Map();
  for (const source of catalog.sources) {
    assertRegularFileWithin(
      repositoryRoot,
      path.resolve(repositoryRoot, source.sourceRecordPath),
      `source record for ${source.id}`
    );
    for (const artifact of source.affectedArtifacts) {
      assertRegularFileWithin(
        repositoryRoot,
        path.resolve(repositoryRoot, artifact),
        `affected artifact for ${source.id}`
      );
    }
    for (const resourceId of source.dependentResourceIds) {
      if (!toolIds.has(resourceId)) fail(`source ${source.id} references unknown dependent resource ${resourceId}`);
      if (dependentOwners.has(resourceId)) {
        fail(`dependent resource ${resourceId} has multiple source owners`);
      }
      dependentOwners.set(resourceId, source.id);
    }
  }
  let receiptCount = 0;
  const receiptsBySourceId = new Map();
  for (const source of catalog.sources) {
    if (!source.review.currentReceipt) continue;
    const chain = await validateImmutableReceiptChain({
      repositoryRoot,
      source,
      authorizedApproverIdentities: catalog.approverPolicy.authorizedIdentities,
      now,
      verifyHeadArtifacts: true
    });
    receiptsBySourceId.set(source.id, chain.headReceipt);
    receiptCount += chain.count;
  }
  if (options.freshnessReport) {
    const reportPath = assertSafeRelativePath(options.freshnessReport, "freshnessReport");
    const report = await readJsonWithin(repositoryRoot, reportPath, "source freshness report");
    validateFreshnessReport(catalog, report, { now, domainPacksRegistry });
  }
  const counts = {
    CURRENT: 0,
    CHANGED: 0,
    CHECK_FAILED: 0,
    MANUAL_DUE: 0,
    UNREVIEWED_BLOCKED: 0,
    REVIEWED_CURRENT: 0,
    QUARANTINED: 0
  };
  for (const source of catalog.sources) {
    counts[source.monitor.state] += 1;
    counts[source.review.state] += 1;
  }
  const releaseAccounting = deriveSourceReleaseAccounting({ catalog, domainPacksRegistry });
  const actionableCount = releaseAccounting.actionableCount;
  return {
    schemaVersion: FRESHNESS_REPORT_SCHEMA_VERSION,
    sourceCount: catalog.sources.length,
    receiptCount,
    releaseEligible: releaseAccounting.releaseBlockingSourceCount === 0,
    actionableCount,
    actionableCountsByScope: releaseAccounting.actionableCountsByScope,
    supportedPackIds: releaseAccounting.supportedPackIds,
    releaseBlockingSourceCount: releaseAccounting.releaseBlockingSourceCount,
    releaseBlockingSourceIds: releaseAccounting.releaseBlockingSourceIds,
    releaseNonblockingActionableCount: releaseAccounting.releaseNonblockingActionableCount,
    counts
  };
}
