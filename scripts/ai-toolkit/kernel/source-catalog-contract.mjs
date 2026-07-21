import path from "node:path";

export const FRESHNESS_WINDOWS_DAYS = Object.freeze({
  "security-runtime": 14,
  "platform-standards": 30,
  "general-methods": 90
});

export const MONITOR_STATES = Object.freeze(["CURRENT", "CHANGED", "CHECK_FAILED", "MANUAL_DUE"]);
export const REVIEW_STATES = Object.freeze(["UNREVIEWED_BLOCKED", "REVIEWED_CURRENT", "QUARANTINED"]);
export const RUNTIME_POSTURES = Object.freeze([
  "metadata-only",
  "active-if-detected",
  "owner-approved-install",
  "ci-advisory",
  "forbidden-runtime"
]);
export const FINAL_DISPOSITIONS = Object.freeze([
  "SYNCED_ADOPTED",
  "SYNCED_REFERENCE",
  "SYNCED_PLUGIN_DELEGATED",
  "ARCHIVED_HARD_BLOCKER",
  "REMOVED_REDUNDANT"
]);
export const SOURCE_CATALOG_SCHEMA_VERSION = "2.1.0";
export const SOURCE_SCOPES = Object.freeze([
  "core",
  "platform-preview",
  "optional-tool",
  "community-reference",
  "historical"
]);

const MONITOR_STATE_SET = new Set(MONITOR_STATES);
const REVIEW_STATE_SET = new Set(REVIEW_STATES);
const RUNTIME_POSTURE_SET = new Set(RUNTIME_POSTURES);
const FINAL_DISPOSITION_SET = new Set(FINAL_DISPOSITIONS);
const SOURCE_SCOPE_SET = new Set(SOURCE_SCOPES);
const AUTHORITIES = new Set(["official", "community", "aggregator", "historical", "vendor-service"]);
const LIFECYCLES = new Set(["review-input", "historical-reference", "service-integration"]);
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40}$/;
const SAFE_ID = /^[a-z0-9](?:[a-z0-9-]{0,126}[a-z0-9])?$/;
const GITHUB_SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9_.-]{0,98}[A-Za-z0-9_])?$/;
const PLACEHOLDER_IDENTITY = /^(?:unknown|n\/a|none|tbd|todo|owner|repository-owner|owner-decision-required|approval-required|unassigned)$/i;
const RECEIPT_SCHEMA_VERSION = "1.0.0";
const CATALOG_SCHEMA_VERSION = SOURCE_CATALOG_SCHEMA_VERSION;
const DAY_MS = 24 * 60 * 60 * 1000;
const SOURCE_FIELDS = new Set([
  "id",
  "aliases",
  "identityKey",
  "name",
  "scope",
  "authority",
  "lifecycle",
  "sourceType",
  "sourceUrl",
  "repoOwner",
  "repoName",
  "defaultBranch",
  "sourceRecordPath",
  "watchedPaths",
  "licenseConcern",
  "reviewPriority",
  "freshnessClass",
  "monitor",
  "review",
  "runtimePosture",
  "dependentResourceIds",
  "affectedArtifacts",
  "neverAutoImport",
  "lastReviewedCommit",
  "lastReviewedDate",
  "reviewDecision",
  "watchMode",
  "manualReview",
  "purpose",
  "homepage"
]);
const REVIEW_FIELDS = new Set([
  "state",
  "currentReceipt",
  "previousReceipt",
  "receiptDigest",
  "previousReceiptDigest",
  "reviewedRevision",
  "reviewedDigest",
  "reviewedAt",
  "expiresAt",
  "disposition"
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function validateEvidenceArray(value, field) {
  return requireStringArray(value, field, { allowEmpty: false });
}

export function validateSourceReviewReceipt(receipt, options = {}) {
  requireRecord(receipt, "receipt");
  rejectUnknownFields(receipt, new Set([
    "schemaVersion",
    "receiptId",
    "sourceId",
    "reviewedRevision",
    "contentDigest",
    "reviewedAt",
    "expiresAt",
    "licenseReview",
    "securityReview",
    "promptInjectionReview",
    "adoption",
    "affectedArtifacts",
    "artifactEvidence",
    "approver",
    "rollbackTarget"
  ]), "receipt");
  const source = requireRecord(options.source, "source");
  const now = requireNow(options.now);
  if (!["CURRENT", "CHANGED"].includes(source.monitor?.state)) {
    fail("receipt review requires source monitor state CURRENT or CHANGED");
  }
  const authorizedApproverIdentities = requireStringArray(
    options.authorizedApproverIdentities,
    "authorizedApproverIdentities"
  );
  if (!Object.hasOwn(options, "expectedPreviousReceipt")) {
    fail("expectedPreviousReceipt must be supplied by trusted catalog state");
  }
  if (!Object.hasOwn(options, "expectedPreviousReceiptDigest")) {
    fail("expectedPreviousReceiptDigest must be supplied by trusted catalog state");
  }
  const expectedPreviousReceipt = assertSafeRelativePath(
    options.expectedPreviousReceipt,
    "expectedPreviousReceipt",
    { nullable: true }
  );
  const expectedPreviousReceiptDigest = options.expectedPreviousReceiptDigest;
  if (
    expectedPreviousReceiptDigest !== null &&
    (typeof expectedPreviousReceiptDigest !== "string" || !SHA256.test(expectedPreviousReceiptDigest))
  ) {
    fail("expectedPreviousReceiptDigest must be null or a sha256 digest");
  }
  if ((expectedPreviousReceipt === null) !== (expectedPreviousReceiptDigest === null)) {
    fail("expected prior receipt and digest must both be null or both be present");
  }
  if (receipt.schemaVersion !== RECEIPT_SCHEMA_VERSION) fail(`receipt.schemaVersion must be ${RECEIPT_SCHEMA_VERSION}`);
  requireString(receipt.sourceId, "receipt.sourceId");
  if (receipt.sourceId !== source.id) fail("receipt.sourceId does not match source");
  const revision = validateRevision(receipt.reviewedRevision, "receipt.reviewedRevision");
  if (!sameRevision(revision, source.monitor?.observedRevision)) {
    fail("receipt.reviewedRevision does not match the observed revision");
  }
  if (typeof receipt.contentDigest !== "string" || !SHA256.test(receipt.contentDigest)) {
    fail("receipt.contentDigest must be a sha256 digest");
  }
  if (receipt.contentDigest !== source.monitor?.contentDigest) {
    fail("receipt content digest does not match the observed digest");
  }
  if (receipt.receiptId !== `${source.id}:${revision.value}`) {
    fail("receipt.receiptId must bind sourceId and reviewed revision");
  }
  requireIsoInstant(receipt.reviewedAt, "receipt.reviewedAt");
  requireIsoInstant(receipt.expiresAt, "receipt.expiresAt");
  if (Date.parse(receipt.reviewedAt) > Date.parse(now)) fail("receipt.reviewedAt must not be in the future");
  if (source.monitor?.checkedAt && Date.parse(receipt.reviewedAt) < Date.parse(source.monitor.checkedAt)) {
    fail("receipt.reviewedAt must not predate the monitor observation");
  }
  if (Date.parse(receipt.expiresAt) <= Date.parse(receipt.reviewedAt) || Date.parse(receipt.expiresAt) <= Date.parse(now)) {
    fail("receipt.expiresAt must be after reviewedAt and current validation time");
  }
  if (Date.parse(receipt.expiresAt) - Date.parse(receipt.reviewedAt) > FRESHNESS_WINDOWS_DAYS[source.freshnessClass] * DAY_MS) {
    fail("receipt.expiresAt exceeds the source freshness class validity window");
  }

  const license = requireRecord(receipt.licenseReview, "receipt.licenseReview");
  rejectUnknownFields(license, new Set(["classification", "evidence", "notes"]), "receipt.licenseReview");
  if (!["permissive", "mixed", "non-permissive", "unknown"].includes(license.classification)) {
    fail("receipt.licenseReview.classification is unsupported");
  }
  validateEvidenceArray(license.evidence, "receipt.licenseReview.evidence");
  requireString(license.notes, "receipt.licenseReview.notes");

  const security = requireRecord(receipt.securityReview, "receipt.securityReview");
  rejectUnknownFields(
    security,
    new Set(["status", "evidence", "dangerousOperations", "networkBehavior", "secretAccess"]),
    "receipt.securityReview"
  );
  if (!["passed", "restricted", "failed"].includes(security.status)) {
    fail("receipt.securityReview.status is unsupported");
  }
  validateEvidenceArray(security.evidence, "receipt.securityReview.evidence");
  requireStringArray(security.dangerousOperations, "receipt.securityReview.dangerousOperations");
  validateEvidenceArray(security.networkBehavior, "receipt.securityReview.networkBehavior");
  validateEvidenceArray(security.secretAccess, "receipt.securityReview.secretAccess");

  const promptInjection = requireRecord(receipt.promptInjectionReview, "receipt.promptInjectionReview");
  rejectUnknownFields(
    promptInjection,
    new Set(["status", "evidence", "rejectedInstructions"]),
    "receipt.promptInjectionReview"
  );
  if (!["passed", "restricted", "failed"].includes(promptInjection.status)) {
    fail("receipt.promptInjectionReview.status is unsupported");
  }
  validateEvidenceArray(promptInjection.evidence, "receipt.promptInjectionReview.evidence");
  requireStringArray(promptInjection.rejectedInstructions, "receipt.promptInjectionReview.rejectedInstructions");

  const adoption = requireRecord(receipt.adoption, "receipt.adoption");
  rejectUnknownFields(
    adoption,
    new Set(["disposition", "summary", "cleanRoomOnly", "runtimePosture"]),
    "receipt.adoption"
  );
  if (!FINAL_DISPOSITION_SET.has(adoption.disposition)) fail("receipt.adoption.disposition is unsupported");
  requireString(adoption.summary, "receipt.adoption.summary");
  if (adoption.cleanRoomOnly !== true) fail("receipt.adoption.cleanRoomOnly must be true");
  if (!RUNTIME_POSTURE_SET.has(adoption.runtimePosture)) fail("receipt.adoption.runtimePosture is unsupported");
  if (adoption.runtimePosture !== source.runtimePosture) {
    fail("receipt.adoption.runtimePosture must match the catalog posture");
  }
  if (
    ["mixed", "non-permissive", "unknown"].includes(license.classification) &&
    !["SYNCED_REFERENCE", "ARCHIVED_HARD_BLOCKER", "REMOVED_REDUNDANT"].includes(adoption.disposition)
  ) {
    fail(`${license.classification} license sources default to reference-only or blocked dispositions`);
  }
  if (
    [security.status, promptInjection.status].includes("failed") &&
    !["ARCHIVED_HARD_BLOCKER", "REMOVED_REDUNDANT"].includes(adoption.disposition)
  ) {
    fail("failed security or prompt-injection review requires a blocked disposition");
  }
  if (
    [security.status, promptInjection.status].includes("restricted") &&
    !["SYNCED_REFERENCE", "ARCHIVED_HARD_BLOCKER", "REMOVED_REDUNDANT"].includes(adoption.disposition)
  ) {
    fail("restricted security or prompt-injection review requires a non-runtime disposition");
  }

  requireStringArray(receipt.affectedArtifacts, "receipt.affectedArtifacts", { allowEmpty: false });
  const allowedArtifacts = source.affectedArtifacts || [];
  for (const [index, artifact] of receipt.affectedArtifacts.entries()) {
    assertSafeRelativePath(artifact, `receipt.affectedArtifacts[${index}]`);
  }
  if (!sameStringSet(receipt.affectedArtifacts, allowedArtifacts)) {
    fail("receipt.affectedArtifacts must exactly match every cataloged affected artifact");
  }

  const artifactEvidence = requireRecord(receipt.artifactEvidence, "receipt.artifactEvidence");
  if (adoption.disposition === "SYNCED_ADOPTED") {
    if (artifactEvidence.mode !== "exact-content-digests") {
      fail("adopted receipts require exact content digest evidence for every affected artifact");
    }
    rejectUnknownFields(
      artifactEvidence,
      new Set(["mode", "artifacts"]),
      "receipt.artifactEvidence"
    );
    if (!Array.isArray(artifactEvidence.artifacts) || artifactEvidence.artifacts.length === 0) {
      fail("receipt artifact evidence must contain every adopted artifact and exact content digest");
    }
    const evidencePaths = [];
    for (const [index, entry] of artifactEvidence.artifacts.entries()) {
      requireRecord(entry, `receipt.artifactEvidence.artifacts[${index}]`);
      rejectUnknownFields(
        entry,
        new Set(["path", "contentDigest"]),
        `receipt.artifactEvidence.artifacts[${index}]`
      );
      assertSafeRelativePath(entry.path, `receipt.artifactEvidence.artifacts[${index}].path`);
      if (typeof entry.contentDigest !== "string" || !SHA256.test(entry.contentDigest)) {
        fail(`receipt.artifactEvidence.artifacts[${index}].contentDigest must be a sha256 digest`);
      }
      evidencePaths.push(entry.path);
    }
    if (new Set(evidencePaths).size !== evidencePaths.length) {
      fail("receipt artifact evidence must not contain duplicate artifact paths");
    }
    if (!sameStringSet(evidencePaths, receipt.affectedArtifacts)) {
      fail("receipt artifact evidence paths must exactly match every affected artifact");
    }
  } else {
    if (artifactEvidence.mode !== "reference-only-no-copy" || artifactEvidence.noCopy !== true) {
      fail("reference-only and non-adopted receipts require an explicit immutable no-copy record");
    }
    rejectUnknownFields(
      artifactEvidence,
      new Set(["mode", "noCopy", "reason"]),
      "receipt.artifactEvidence"
    );
    requireString(artifactEvidence.reason, "receipt.artifactEvidence.reason");
  }

  const approver = requireRecord(receipt.approver, "receipt.approver");
  rejectUnknownFields(approver, new Set(["identity", "approvedAt"]), "receipt.approver");
  requireString(approver.identity, "receipt.approver.identity");
  if (PLACEHOLDER_IDENTITY.test(approver.identity.trim())) fail("receipt requires an actual approver identity");
  if (!authorizedApproverIdentities.includes(approver.identity)) {
    fail("receipt approver identity is not registered in catalog approver policy");
  }
  requireIsoInstant(approver.approvedAt, "receipt.approver.approvedAt");
  if (Date.parse(approver.approvedAt) > Date.parse(now)) fail("receipt.approver.approvedAt must not be in the future");
  if (
    Date.parse(approver.approvedAt) < Date.parse(receipt.reviewedAt) ||
    Date.parse(approver.approvedAt) >= Date.parse(receipt.expiresAt)
  ) {
    fail("receipt.approver.approvedAt must be within the review validity window");
  }

  const rollback = requireRecord(receipt.rollbackTarget, "receipt.rollbackTarget");
  rejectUnknownFields(
    rollback,
    new Set(["previousReceipt", "previousReceiptDigest", "artifactRevision"]),
    "receipt.rollbackTarget"
  );
  assertSafeRelativePath(rollback.previousReceipt, "receipt.rollbackTarget.previousReceipt", { nullable: true });
  if (
    rollback.previousReceiptDigest !== null &&
    (typeof rollback.previousReceiptDigest !== "string" || !SHA256.test(rollback.previousReceiptDigest))
  ) {
    fail("receipt.rollbackTarget.previousReceiptDigest must be null or a sha256 digest");
  }
  if (
    rollback.previousReceipt !== expectedPreviousReceipt ||
    rollback.previousReceiptDigest !== expectedPreviousReceiptDigest
  ) {
    fail("receipt.rollbackTarget previousReceipt and digest must match the expected prior receipt chain");
  }
  if (typeof rollback.artifactRevision !== "string" || !GIT_SHA.test(rollback.artifactRevision)) {
    fail("receipt.rollbackTarget.artifactRevision must be a 40-character Git SHA");
  }
  return receipt;
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

function requireBoolean(value, field) {
  if (typeof value !== "boolean") fail(`${field} must be boolean`);
  return value;
}

function sameStringSet(left, right) {
  return left.length === right.length && [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function requireStringArray(value, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${field} must be ${allowEmpty ? "a" : "a non-empty"} string array`);
  }
  if (value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    fail(`${field} must contain only non-empty strings`);
  }
  if (new Set(value).size !== value.length) fail(`${field} must not contain duplicates`);
  return value;
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

function receiptRelativePath(receipt) {
  const revision = receipt.reviewedRevision.value.replace(/^sha256:/, "");
  return `sources/reviews/${receipt.sourceId}/${revision}.json`;
}

function validateCatalogPolicy(catalog) {
  const policy = requireRecord(catalog.policy, "policy");
  rejectUnknownFields(
    policy,
    new Set(["readOnlySupplyChainInputs", "neverAutoImport", "freshnessNeverActivatesRuntime"]),
    "policy"
  );
  for (const field of ["readOnlySupplyChainInputs", "neverAutoImport", "freshnessNeverActivatesRuntime"]) {
    if (policy[field] !== true) fail(`policy.${field} must be true`);
  }
  const classes = requireRecord(catalog.freshnessClasses, "freshnessClasses");
  for (const [id, maxAgeDays] of Object.entries(FRESHNESS_WINDOWS_DAYS)) {
    const entry = requireRecord(classes[id], `freshnessClasses.${id}`);
    if (entry.maxAgeDays !== maxAgeDays) fail(`freshnessClasses.${id}.maxAgeDays must be ${maxAgeDays}`);
  }
  const unexpected = Object.keys(classes).filter((id) => !(id in FRESHNESS_WINDOWS_DAYS));
  if (unexpected.length > 0) fail(`freshnessClasses contains unsupported class ${unexpected[0]}`);

  const approverPolicy = requireRecord(catalog.approverPolicy, "approverPolicy");
  rejectUnknownFields(
    approverPolicy,
    new Set(["authorizedIdentities", "requiresExplicitOwnerRegistration"]),
    "approverPolicy"
  );
  const identities = requireStringArray(approverPolicy.authorizedIdentities, "approverPolicy.authorizedIdentities");
  for (const identity of identities) {
    if (PLACEHOLDER_IDENTITY.test(identity.trim()) || !/^[a-z][a-z0-9-]*:[A-Za-z0-9][A-Za-z0-9._@-]*$/.test(identity)) {
      fail("approverPolicy.authorizedIdentities must contain explicit namespaced owner identities");
    }
  }
  if (approverPolicy.requiresExplicitOwnerRegistration !== true) {
    fail("approverPolicy.requiresExplicitOwnerRegistration must be true");
  }
}

function validateGithubIdentity(source, field) {
  for (const key of ["repoOwner", "repoName", "defaultBranch"]) requireString(source[key], `${field}.${key}`);
  if (
    !GITHUB_SEGMENT.test(source.repoOwner) ||
    !GITHUB_SEGMENT.test(source.repoName) ||
    source.repoName.toLowerCase().endsWith(".git") ||
    source.repoOwner.includes("%") ||
    source.repoName.includes("%")
  ) {
    fail(`${field} must use canonical GitHub owner and repository segments without aliases`);
  }
  let parsed;
  try {
    parsed = new URL(source.sourceUrl);
  } catch {
    fail(`${field}.sourceUrl must be a valid URL`);
  }
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    segments.length !== 2 ||
    segments[0] !== source.repoOwner ||
    segments[1] !== source.repoName
  ) {
    fail(`${field}.sourceUrl must exactly match https://github.com/<repoOwner>/<repoName>`);
  }
}

function validateManualDocumentIdentity(source, field) {
  let parsed;
  try {
    parsed = new URL(source.sourceUrl);
  } catch {
    fail(`${field}.sourceUrl must be a valid URL`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    !parsed.hostname ||
    parsed.pathname.includes("%")
  ) {
    fail(`${field} manual-reviewed-doc sourceUrl must be credential-free HTTPS without query, fragment, or encoded aliases`);
  }
  const canonicalUrl = parsed.toString().replace(/\/$/, "").toLowerCase();
  const expectedIdentity = `url:${canonicalUrl}`;
  if (source.identityKey !== expectedIdentity) fail(`${field}.identityKey must be ${expectedIdentity}`);
}

function validateSourceEntry(source, index, now) {
  const field = `sources[${index}]`;
  requireRecord(source, field);
  rejectUnknownFields(source, SOURCE_FIELDS, "source");
  requireString(source.id, `${field}.id`);
  if (!SAFE_ID.test(source.id)) fail(`${field}.id must use lowercase kebab-case`);
  requireStringArray(source.aliases, `${field}.aliases`);
  for (const alias of source.aliases) {
    if (!SAFE_ID.test(alias)) fail(`${field}.aliases must use lowercase kebab-case`);
  }
  requireString(source.name, `${field}.name`);
  requireString(source.identityKey, `${field}.identityKey`);
  if (!SOURCE_SCOPE_SET.has(source.scope)) fail(`${field}.scope is unsupported`);
  if (!AUTHORITIES.has(source.authority)) fail(`${field}.authority is unsupported`);
  if (!LIFECYCLES.has(source.lifecycle)) fail(`${field}.lifecycle is unsupported`);
  requireString(source.sourceType, `${field}.sourceType`);
  requireString(source.sourceUrl, `${field}.sourceUrl`);
  if (source.sourceType === "github-repo") {
    validateGithubIdentity(source, field);
    const expectedIdentity = `github:${source.repoOwner.toLowerCase()}/${source.repoName.toLowerCase()}`;
    if (source.identityKey !== expectedIdentity) fail(`${field}.identityKey must be ${expectedIdentity}`);
  } else if (source.sourceType !== "manual-reviewed-doc") {
    fail(`${field}.sourceType must be github-repo or manual-reviewed-doc`);
  } else {
    validateManualDocumentIdentity(source, field);
  }
  if (
    source.lifecycle === "historical-reference"
    && (
      source.authority !== "historical"
      || source.runtimePosture !== "forbidden-runtime"
      || source.scope !== "historical"
    )
  ) {
    fail(`${field} historical-reference sources require historical authority, historical scope, and forbidden-runtime posture`);
  }
  assertSafeRelativePath(source.sourceRecordPath, `${field}.sourceRecordPath`);
  requireStringArray(source.watchedPaths, `${field}.watchedPaths`);
  source.watchedPaths.forEach((entry, watchedIndex) => {
    assertSafeRelativePath(entry, `${field}.watchedPaths[${watchedIndex}]`);
  });
  requireString(source.licenseConcern, `${field}.licenseConcern`);
  requireString(source.reviewPriority, `${field}.reviewPriority`);
  if (!(source.freshnessClass in FRESHNESS_WINDOWS_DAYS)) {
    fail(`${field}.freshnessClass is unsupported`);
  }
  if (source.neverAutoImport !== true) fail(`${field}.neverAutoImport must be true`);
  if (!RUNTIME_POSTURE_SET.has(source.runtimePosture)) fail(`${field}.runtimePosture is unsupported`);
  requireStringArray(source.dependentResourceIds, `${field}.dependentResourceIds`);
  source.dependentResourceIds.forEach((entry) => {
    if (!SAFE_ID.test(entry)) fail(`${field}.dependentResourceIds must use lowercase kebab-case IDs`);
  });
  if (source.lifecycle === "historical-reference" && source.dependentResourceIds.length !== 0) {
    fail(`${field} historical-reference sources must not have dependent resources`);
  }
  requireStringArray(source.affectedArtifacts, `${field}.affectedArtifacts`, { allowEmpty: false });
  source.affectedArtifacts.forEach((entry, artifactIndex) => {
    assertSafeRelativePath(entry, `${field}.affectedArtifacts[${artifactIndex}]`);
  });
  if (!source.affectedArtifacts.includes(source.sourceRecordPath)) {
    fail(`${field}.affectedArtifacts must include the canonical sourceRecordPath`);
  }

  if (source.lastReviewedCommit !== undefined && source.lastReviewedCommit !== null && !GIT_SHA.test(source.lastReviewedCommit)) {
    fail(`${field}.lastReviewedCommit must be null or an exact Git SHA`);
  }
  if (
    source.lastReviewedDate !== undefined &&
    source.lastReviewedDate !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(source.lastReviewedDate)
  ) {
    fail(`${field}.lastReviewedDate must be null or YYYY-MM-DD`);
  }
  for (const optionalText of ["purpose", "homepage", "watchMode"]) {
    if (source[optionalText] !== undefined && source[optionalText] !== null) {
      requireString(source[optionalText], `${field}.${optionalText}`);
    }
  }
  if (source.manualReview !== undefined) {
    const manualReview = requireRecord(source.manualReview, `${field}.manualReview`);
    rejectUnknownFields(
      manualReview,
      new Set(["publisher", "cadence", "reason", "forbiddenClaims"]),
      "manualReview"
    );
    for (const key of ["publisher", "cadence", "reason"]) requireString(manualReview[key], `${field}.manualReview.${key}`);
    requireStringArray(manualReview.forbiddenClaims, `${field}.manualReview.forbiddenClaims`, { allowEmpty: false });
  }
  if (source.reviewDecision !== undefined) {
    const legacyDecision = requireRecord(source.reviewDecision, `${field}.reviewDecision`);
    rejectUnknownFields(
      legacyDecision,
      new Set(["outcome", "reviewedCommit", "reviewedDate", "summary", "boundaries"]),
      "reviewDecision"
    );
    if (!FINAL_DISPOSITION_SET.has(legacyDecision.outcome)) fail(`${field}.reviewDecision.outcome is unsupported`);
    if (legacyDecision.reviewedCommit !== null && !GIT_SHA.test(legacyDecision.reviewedCommit)) {
      fail(`${field}.reviewDecision.reviewedCommit must be null or an exact Git SHA`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(legacyDecision.reviewedDate)) {
      fail(`${field}.reviewDecision.reviewedDate must be YYYY-MM-DD`);
    }
    requireString(legacyDecision.summary, `${field}.reviewDecision.summary`);
    requireStringArray(legacyDecision.boundaries, `${field}.reviewDecision.boundaries`, { allowEmpty: false });
  }

  const monitor = requireRecord(source.monitor, `${field}.monitor`);
  rejectUnknownFields(
    monitor,
    new Set(["state", "checkedAt", "observedRevision", "contentDigest", "failureReason"]),
    "monitor"
  );
  if (!MONITOR_STATE_SET.has(monitor.state)) fail(`${field}.monitor.state is unsupported`);
  requireIsoInstant(monitor.checkedAt, `${field}.monitor.checkedAt`, { nullable: true });
  validateRevision(monitor.observedRevision, `${field}.monitor.observedRevision`, { nullable: true });
  if (monitor.contentDigest !== null && (typeof monitor.contentDigest !== "string" || !SHA256.test(monitor.contentDigest))) {
    fail(`${field}.monitor.contentDigest must be null or a sha256 digest`);
  }
  if (["CURRENT", "CHANGED"].includes(monitor.state)) {
    if (!monitor.checkedAt || !monitor.observedRevision || !monitor.contentDigest) {
      fail(`${field}.monitor ${monitor.state} requires checkedAt, observedRevision, and contentDigest`);
    }
    if (monitor.failureReason !== null) fail(`${field}.monitor.failureReason must be null for ${monitor.state}`);
    const checkedAt = Date.parse(monitor.checkedAt);
    const nowTime = Date.parse(now);
    if (checkedAt > nowTime) fail(`${field}.monitor.checkedAt must not be in the future`);
    if (nowTime - checkedAt > FRESHNESS_WINDOWS_DAYS[source.freshnessClass] * DAY_MS) {
      fail(`${field}.monitor.checkedAt exceeds the ${source.freshnessClass} freshness window`);
    }
  } else if (monitor.state === "CHECK_FAILED") {
    requireString(monitor.failureReason, `${field}.monitor.failureReason`);
  }

  const review = requireRecord(source.review, `${field}.review`);
  rejectUnknownFields(review, REVIEW_FIELDS, "review");
  if (!REVIEW_STATE_SET.has(review.state)) fail(`${field}.review.state is unsupported`);
  assertSafeRelativePath(review.currentReceipt, `${field}.review.currentReceipt`, { nullable: true });
  assertSafeRelativePath(review.previousReceipt, `${field}.review.previousReceipt`, { nullable: true });
  for (const digestField of ["receiptDigest", "previousReceiptDigest"]) {
    if (review[digestField] !== null && (typeof review[digestField] !== "string" || !SHA256.test(review[digestField]))) {
      fail(`${field}.review.${digestField} must be null or a sha256 digest`);
    }
  }
  validateRevision(review.reviewedRevision, `${field}.review.reviewedRevision`, { nullable: true });
  if (review.reviewedDigest !== null && (typeof review.reviewedDigest !== "string" || !SHA256.test(review.reviewedDigest))) {
    fail(`${field}.review.reviewedDigest must be null or a sha256 digest`);
  }
  requireIsoInstant(review.reviewedAt, `${field}.review.reviewedAt`, { nullable: true });
  requireIsoInstant(review.expiresAt, `${field}.review.expiresAt`, { nullable: true });

  if (["CHANGED", "CHECK_FAILED", "MANUAL_DUE"].includes(monitor.state) && review.state !== "QUARANTINED") {
    fail(`${field} ${monitor.state} sources must be QUARANTINED`);
  }
  if (review.currentReceipt !== null) {
    for (const key of ["receiptDigest", "reviewedRevision", "reviewedDigest", "reviewedAt", "expiresAt", "disposition"]) {
      if (review[key] === null) fail(`${field}.review.${key} is required with currentReceipt`);
    }
    if (!FINAL_DISPOSITION_SET.has(review.disposition)) fail(`${field}.review.disposition is unsupported`);
    const expectedReceipt = receiptRelativePath({ sourceId: source.id, reviewedRevision: review.reviewedRevision });
    if (review.currentReceipt !== expectedReceipt) {
      fail(`${field}.review.currentReceipt must match the exact reviewed revision path ${expectedReceipt}`);
    }
    if ((review.previousReceipt === null) !== (review.previousReceiptDigest === null)) {
      fail(`${field}.review.previousReceipt and previousReceiptDigest must both be null or both be present`);
    }
    if (review.state === "REVIEWED_CURRENT") {
      if (monitor.state !== "CURRENT") fail(`${field} REVIEWED_CURRENT requires CURRENT monitor state`);
      if (!sameRevision(review.reviewedRevision, monitor.observedRevision)) {
        fail(`${field}.review.reviewedRevision must match the observed revision`);
      }
      if (review.reviewedDigest !== monitor.contentDigest) {
        fail(`${field}.review.reviewedDigest must match the observed digest`);
      }
    }
    if (Date.parse(review.expiresAt) <= Date.parse(now) && review.state !== "QUARANTINED") {
      fail(`${field} expired reviews must be QUARANTINED`);
    }
  } else {
    for (const key of [
      "previousReceipt",
      "receiptDigest",
      "previousReceiptDigest",
      "reviewedRevision",
      "reviewedDigest",
      "reviewedAt",
      "expiresAt",
      "disposition"
    ]) {
      if (review[key] !== null) fail(`${field}.review.${key} must be null without currentReceipt`);
    }
  }
  return source;
}

export function validateManualSourceObservation(source, observation) {
  requireRecord(source, "source");
  if (source.sourceType !== "manual-reviewed-doc") {
    fail("manual source observation requires a manual-reviewed-doc source");
  }
  const candidate = requireRecord(observation, "manual source observation");
  rejectUnknownFields(
    candidate,
    new Set(["observedRevision", "contentDigest"]),
    "manual source observation"
  );
  const revision = validateRevision(candidate.observedRevision, "manual source observation.observedRevision");
  if (revision.kind !== "content-digest") {
    fail("manual source observation requires a content-digest revision");
  }
  if (typeof candidate.contentDigest !== "string" || !SHA256.test(candidate.contentDigest)) {
    fail("manual source observation contentDigest must be a sha256 digest");
  }
  if (revision.value !== candidate.contentDigest) {
    fail("manual source observation revision must match the content digest");
  }
  return candidate;
}

function graphSourceIndex(catalog) {
  if (!isRecord(catalog) || !Array.isArray(catalog.sources)) {
    fail("scope derivation requires a catalog with sources");
  }
  const sourcesById = new Map();
  for (const source of catalog.sources) {
    if (!isRecord(source) || typeof source.id !== "string" || source.id === "") {
      fail("scope derivation catalog sources require stable IDs");
    }
    if (sourcesById.has(source.id)) fail(`scope derivation duplicate source ID: ${source.id}`);
    sourcesById.set(source.id, source);
  }
  return sourcesById;
}

function registeredToolIds(toolsRegistry) {
  if (!isRecord(toolsRegistry) || toolsRegistry.registryType !== "tools" || !Array.isArray(toolsRegistry.tools)) {
    fail("scope derivation requires the canonical tools registry");
  }
  const toolIds = new Set();
  for (const tool of toolsRegistry.tools) {
    if (!isRecord(tool) || typeof tool.id !== "string" || tool.id === "") {
      fail("scope derivation tools registry requires stable tool IDs");
    }
    if (toolIds.has(tool.id)) fail(`scope derivation duplicate tool ID: ${tool.id}`);
    toolIds.add(tool.id);
  }
  return toolIds;
}

function gateSourceIdsByMaturity(domainPacksRegistry, sourcesById) {
  if (
    !isRecord(domainPacksRegistry)
    || domainPacksRegistry.registryType !== "domain-packs"
    || !Array.isArray(domainPacksRegistry.packs)
  ) {
    fail("scope derivation requires the canonical domain-packs registry");
  }
  const supported = new Set();
  const preview = new Set();
  for (const pack of domainPacksRegistry.packs) {
    if (!isRecord(pack) || !Array.isArray(pack.gates)) {
      fail("scope derivation domain packs require gates");
    }
    if (pack.lifecycle !== "active" || !["supported", "preview"].includes(pack.maturity)) continue;
    for (const gate of pack.gates) {
      if (!isRecord(gate) || typeof gate.id !== "string" || !Array.isArray(gate.authoritativeSourceRefs)) {
        fail("scope derivation domain gates require authoritative source references");
      }
      for (const reference of gate.authoritativeSourceRefs) {
        if (!isRecord(reference) || typeof reference.sourceId !== "string" || reference.sourceId === "") {
          fail(`scope derivation gate ${gate.id} has an invalid authoritative source reference`);
        }
        if (!sourcesById.has(reference.sourceId)) {
          fail(`scope derivation gate ${gate.id} references unknown source: ${reference.sourceId}`);
        }
        if (pack.maturity === "supported") supported.add(reference.sourceId);
        else preview.add(reference.sourceId);
      }
    }
  }
  return { supported, preview };
}

function assertMethodSourceIds(methodSourceIds, sourcesById) {
  if (!Array.isArray(methodSourceIds)) fail("scope derivation methodSourceIds must be an array");
  for (const sourceId of methodSourceIds) {
    if (typeof sourceId !== "string" || sourceId === "") {
      fail("scope derivation methodSourceIds must contain source IDs");
    }
    if (!sourcesById.has(sourceId)) fail(`scope derivation method references unknown source: ${sourceId}`);
  }
}

export function deriveSourceScopes({ catalog, domainPacksRegistry, toolsRegistry, methodSourceIds = [] } = {}) {
  const sourcesById = graphSourceIndex(catalog);
  const toolIds = registeredToolIds(toolsRegistry);
  const gateSourceIds = gateSourceIdsByMaturity(domainPacksRegistry, sourcesById);
  assertMethodSourceIds(methodSourceIds, sourcesById);
  const methodSourceIdSet = new Set(methodSourceIds);
  const scopes = new Map();

  for (const source of sourcesById.values()) {
    if (!Array.isArray(source.dependentResourceIds)) {
      fail(`scope derivation source ${source.id} dependentResourceIds must be an array`);
    }
    for (const resourceId of source.dependentResourceIds) {
      if (!toolIds.has(resourceId)) {
        fail(`scope derivation source ${source.id} references unknown tool resource: ${resourceId}`);
      }
    }
    if (source.lifecycle === "historical-reference") {
      if (source.runtimePosture !== "forbidden-runtime" || source.dependentResourceIds.length !== 0) {
        fail(`scope derivation historical source ${source.id} must be forbidden-runtime without dependent resources`);
      }
      if (gateSourceIds.supported.has(source.id) || gateSourceIds.preview.has(source.id)) {
        fail(`scope derivation historical source ${source.id} must not back an active gate`);
      }
      if (methodSourceIdSet.has(source.id)) {
        fail(`scope derivation historical source ${source.id} must not back an active method`);
      }
      scopes.set(source.id, "historical");
    } else if (gateSourceIds.supported.has(source.id)) {
      scopes.set(source.id, "core");
    } else if (gateSourceIds.preview.has(source.id)) {
      scopes.set(source.id, "platform-preview");
    } else if (source.dependentResourceIds.length > 0) {
      scopes.set(source.id, "optional-tool");
    } else {
      scopes.set(source.id, "community-reference");
    }
  }
  return scopes;
}

export function validateSourceCatalogGraph(catalog, options = {}) {
  const validated = validateSourceCatalog(catalog, { now: options.now });
  const scopes = deriveSourceScopes({
    catalog: validated,
    domainPacksRegistry: options.domainPacksRegistry,
    toolsRegistry: options.toolsRegistry,
    methodSourceIds: options.methodSourceIds ?? []
  });
  for (const source of validated.sources) {
    const expectedScope = scopes.get(source.id);
    if (source.scope !== expectedScope) {
      fail(`scope drift for ${source.id}: expected ${expectedScope}, received ${source.scope}`);
    }
  }
  return validated;
}

export function validateSourceCatalog(catalog, options = {}) {
  requireRecord(catalog, "catalog");
  rejectUnknownFields(
    catalog,
    new Set([
      "schemaVersion",
      "catalogId",
      "migratedAt",
      "purpose",
      "legacyCompatibility",
      "policy",
      "approverPolicy",
      "freshnessClasses",
      "sources"
    ]),
    "catalog"
  );
  if (catalog.schemaVersion !== CATALOG_SCHEMA_VERSION) fail(`schemaVersion must be ${CATALOG_SCHEMA_VERSION}`);
  if (catalog.catalogId !== "enterprise-source-catalog") fail("catalogId must be enterprise-source-catalog");
  if (catalog.migratedAt !== undefined) requireIsoInstant(catalog.migratedAt, "catalog.migratedAt");
  if (catalog.purpose !== undefined) requireString(catalog.purpose, "catalog.purpose");
  if (catalog.legacyCompatibility !== undefined) {
    const legacy = requireRecord(catalog.legacyCompatibility, "catalog.legacyCompatibility");
    rejectUnknownFields(
      legacy,
      new Set(["migratedFromSchema", "retainedFields", "authoritativeForCurrentReview"]),
      "catalog.legacyCompatibility"
    );
    requireString(legacy.migratedFromSchema, "catalog.legacyCompatibility.migratedFromSchema");
    requireStringArray(legacy.retainedFields, "catalog.legacyCompatibility.retainedFields");
    if (legacy.authoritativeForCurrentReview !== false) {
      fail("catalog.legacyCompatibility.authoritativeForCurrentReview must be false");
    }
  }
  validateCatalogPolicy(catalog);
  if (!Array.isArray(catalog.sources) || catalog.sources.length === 0) fail("sources must be a non-empty array");
  const now = requireNow(options.now);
  const identities = new Set();
  const canonicalIdentities = new Set();
  catalog.sources.forEach((source, index) => {
    validateSourceEntry(source, index, now);
    if (canonicalIdentities.has(source.identityKey)) fail(`duplicate source identity: ${source.identityKey}`);
    canonicalIdentities.add(source.identityKey);
    for (const identity of [source.id, ...source.aliases]) {
      if (identities.has(identity)) fail(`duplicate source identity or alias: ${identity}`);
      identities.add(identity);
    }
  });
  return catalog;
}
