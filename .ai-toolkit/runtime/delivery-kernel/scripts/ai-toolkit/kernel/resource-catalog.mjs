import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { assertRegularFileWithin } from "../../../install/safe-filesystem.mjs";
import { canonicalTextSha256, canonicalTextUtf8LfBytes } from "./canonical-digest.mjs";
import {
  DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS,
  DELIVERY_REQUEST_PLATFORM_IDS,
  assertResourceContract
} from "./contracts.mjs";
import { assertSourceReferenceSnapshot } from "./source-policy.mjs";

const SCHEMA_VERSION = "1.0.0";
const INTERNAL_ENVIRONMENT = "codex-project-runtime";
const RESOURCE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PROJECT_SCRIPT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PROJECT_COMMAND_REFERENCE_FIELDS = new Set([
  "kind",
  "manifestPath",
  "scriptName",
  "digest"
]);
const PROJECT_SCRIPT_FALLBACK_COMPETENCY = "project-script";
const PROJECT_COMMAND_COMPETENCY_BY_VERIFIER_KIND = Object.freeze({
  "static-analysis": "command-static-analysis",
  "unit-test": "command-unit-test",
  "integration-test": "command-integration-test",
  "browser-runtime": "command-browser-runtime",
  "native-build": "command-native-build",
  "simulator-device": "command-simulator-device",
  "packaging-install-rollback": "command-packaging-install-rollback"
});
const RESOURCE_ROLES = new Set(["lead", "specialist", "verifier", "support"]);
const VERIFICATION_CAPABILITIES = new Set([
  "static-analysis",
  "unit-test",
  "integration-test",
  "browser-runtime",
  "native-build",
  "simulator-device",
  "accessibility-audit",
  "security-review",
  "performance-profile",
  "packaging-install-rollback",
  "owner-review"
]);
const AUTHORITIES = new Set([
  "official-standard",
  "vendor-official",
  "internal-reviewed",
  "community-reviewed"
]);
const LIFECYCLES = new Set(["active", "experimental", "retired", "quarantined", "stale"]);
const AGENT_SANDBOX_MODES = new Set(["read-only", "workspace-write"]);
const TARGET_PLATFORMS = new Set(DELIVERY_REQUEST_PLATFORM_IDS);
const TARGET_FRAMEWORK_OVERLAYS = new Set(DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS);
const TRUSTED_CATALOG_RESOURCES = new WeakSet();
const FORBIDDEN_CATALOG_INPUTS = [
  "capabilityEvidence",
  "freshnessEvidence",
  "environment",
  "now",
  "environmentCapabilities"
];
const CATALOG_INPUTS = new Set([
  "repositoryRoot",
  "agentsRegistry",
  "skillsRegistry",
  "toolsRegistry"
]);

function fail(message) {
  throw new Error(message);
}

function hasOwn(value, field) {
  return value !== null
    && typeof value === "object"
    && Object.prototype.hasOwnProperty.call(value, field);
}

function isCanonicalRepositoryRelativePath(value, { allowDot = true } = {}) {
  if (
    typeof value !== "string"
    || value === ""
    || value !== value.trim()
    || value.includes("\\")
    || value.includes("\0")
    || value.startsWith("/")
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
  ) {
    return false;
  }
  if (value === ".") return allowDot;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function exactIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

function isPlainOwnPropertyRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function assertPlainRecord(value, label) {
  if (!isPlainOwnPropertyRecord(value)) fail(`${label} must be a plain own-property record`);
  return value;
}

function assertKnownFields(value, allowed, label) {
  assertPlainRecord(value, label);
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) fail(`${label}.${field} is not allowed`);
  }
}

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    fail(`${label} must be ${allowEmpty ? "an array" : "a non-empty array"}`);
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    if (!nonEmptyString(entry)) fail(`${label}[${index}] must be a non-empty string`);
    if (seen.has(entry)) fail(`${label}[${index}] must be unique`);
    seen.add(entry);
  });
  return [...value];
}

function assertResourceId(value, label) {
  if (!nonEmptyString(value) || !RESOURCE_ID_PATTERN.test(value)) {
    fail(`${label} must be a stable lowercase kebab-case resource id`);
  }
  return value;
}

function assertRegistryEnvelope(registry, collection, label) {
  assertPlainRecord(registry, `${label} registry`);
  if (registry.schemaVersion !== SCHEMA_VERSION) {
    fail(`${label} registry schemaVersion must be exactly ${SCHEMA_VERSION}`);
  }
  if (!Array.isArray(registry[collection])) fail(`${label} registry must contain ${collection}`);
  return registry[collection];
}

function assertEnvironmentRestrictions(value, label) {
  assertKnownFields(value, new Set(["allowed", "forbidden"]), label);
  return {
    allowed: assertStringArray(value.allowed, `${label}.allowed`, { allowEmpty: true }),
    forbidden: assertStringArray(value.forbidden, `${label}.forbidden`, { allowEmpty: true })
  };
}

function assertTargetAffinity(value, label) {
  assertKnownFields(value, new Set(["platforms", "frameworkOverlays"]), label);
  const platforms = assertStringArray(value.platforms, `${label}.platforms`, { allowEmpty: true });
  const frameworkOverlays = assertStringArray(
    value.frameworkOverlays,
    `${label}.frameworkOverlays`,
    { allowEmpty: true }
  );
  platforms.forEach((platform) => {
    if (!TARGET_PLATFORMS.has(platform)) fail(`${label} has unknown platform: ${platform}`);
  });
  frameworkOverlays.forEach((overlay) => {
    if (!TARGET_FRAMEWORK_OVERLAYS.has(overlay)) {
      fail(`${label} has unknown framework overlay: ${overlay}`);
    }
  });
  return { platforms, frameworkOverlays };
}

function canonicalKernelMetadata(record, type) {
  const id = record?.name ?? "unknown";
  const label = `invalid ${type} registry record ${id}`;
  const metadata = record?.deliveryKernel;
  const allowedFields = new Set([
      "canonicalCompetencies",
      "eligibleRoles",
      "verificationCapabilities",
      "measuredContextCost",
      "contextCostMeasurement",
      "authority",
      "lifecycle",
      "environmentRestrictions"
    ]);
  if (type === "agent") allowedFields.add("targetAffinity");
  assertKnownFields(
    metadata,
    allowedFields,
    `${label}.deliveryKernel`
  );
  const canonicalCompetencies = assertStringArray(
    metadata.canonicalCompetencies,
    `${label}.deliveryKernel.canonicalCompetencies`
  );
  const eligibleRoles = assertStringArray(
    metadata.eligibleRoles,
    `${label}.deliveryKernel.eligibleRoles`
  );
  eligibleRoles.forEach((role) => {
    if (!RESOURCE_ROLES.has(role)) fail(`${label}.deliveryKernel has unknown eligible role: ${role}`);
  });
  const verificationCapabilities = assertStringArray(
    metadata.verificationCapabilities ?? [],
    `${label}.deliveryKernel.verificationCapabilities`,
    { allowEmpty: true }
  );
  verificationCapabilities.forEach((capability) => {
    if (!VERIFICATION_CAPABILITIES.has(capability)) {
      fail(`${label}.deliveryKernel has unknown verification capability: ${capability}`);
    }
  });
  if (!Number.isInteger(metadata.measuredContextCost) || metadata.measuredContextCost < 0) {
    fail(`${label}.deliveryKernel.measuredContextCost must be a non-negative integer`);
  }
  if (!nonEmptyString(metadata.contextCostMeasurement)) {
    fail(`${label}.deliveryKernel.contextCostMeasurement must be a non-empty string`);
  }
  if (!AUTHORITIES.has(metadata.authority)) {
    fail(`${label}.deliveryKernel has unknown authority: ${metadata.authority}`);
  }
  if (!LIFECYCLES.has(metadata.lifecycle)) {
    fail(`${label}.deliveryKernel has unknown lifecycle: ${metadata.lifecycle}`);
  }
  let targetAffinity;
  if (hasOwn(metadata, "targetAffinity")) {
    targetAffinity = assertTargetAffinity(
      metadata.targetAffinity,
      `${label}.deliveryKernel.targetAffinity`
    );
  }
  return {
    canonicalCompetencies,
    eligibleRoles,
    verificationCapabilities,
    authority: metadata.authority,
    lifecycle: metadata.lifecycle,
    ...(targetAffinity === undefined ? {} : { targetAffinity }),
    environmentRestrictions: assertEnvironmentRestrictions(
      metadata.environmentRestrictions,
      `${label}.deliveryKernel.environmentRestrictions`
    )
  };
}

function assertAgentRecord(agent) {
  const id = assertResourceId(agent?.name, "agent registry record name");
  const label = `invalid agent registry record ${id}`;
  assertPlainRecord(agent, label);
  assertStringArray(agent.status, `${label}.status`);
  if (!nonEmptyString(agent.nativeCodexAgentName)) fail(`${label}.nativeCodexAgentName must be a non-empty string`);
  assertKnownFields(
    agent.runtimeFiles,
    new Set(["tomlPath", "tomlPresent", "compiledFallbackPath", "compiledFallbackPresent"]),
    `${label}.runtimeFiles`
  );
  if (!isCanonicalRepositoryRelativePath(agent.runtimeFiles.tomlPath, { allowDot: false })) {
    fail(`${label}.runtimeFiles.tomlPath must be a canonical POSIX repository-relative path`);
  }
  if (typeof agent.runtimeFiles.tomlPresent !== "boolean") {
    fail(`${label}.runtimeFiles.tomlPresent must be a boolean`);
  }
  return { record: agent, metadata: canonicalKernelMetadata(agent, "agent") };
}

function assertSkillRecord(skill) {
  const id = assertResourceId(skill?.name, "skill registry record name");
  const label = `invalid skill registry record ${id}`;
  assertPlainRecord(skill, label);
  assertStringArray(skill.status, `${label}.status`);
  if (!isCanonicalRepositoryRelativePath(skill.skillPath, { allowDot: false })) {
    fail(`${label}.skillPath must be a canonical POSIX repository-relative path`);
  }
  return { record: skill, metadata: canonicalKernelMetadata(skill, "skill") };
}

function assertToolRecord(tool) {
  const id = assertResourceId(tool?.id, "tool registry record id");
  const label = `invalid tool registry record ${id}`;
  assertPlainRecord(tool, label);
  if (!nonEmptyString(tool.category)) fail(`${label}.category must be a non-empty string`);
  if (tool.lane !== undefined && tool.lane !== null && !nonEmptyString(tool.lane)) {
    fail(`${label}.lane must be a non-empty string when present`);
  }
  if (!nonEmptyString(tool.activationStatus)) fail(`${label}.activationStatus must be a non-empty string`);
  if (tool.repository !== undefined && tool.repository !== null && !nonEmptyString(tool.repository)) {
    fail(`${label}.repository must be a non-empty string when present`);
  }
  const enterpriseRisk = assertPlainRecord(tool.enterpriseRisk, `${label}.enterpriseRisk`);
  if (!nonEmptyString(enterpriseRisk.reviewState)) {
    fail(`${label}.enterpriseRisk.reviewState must be a non-empty string`);
  }
  if (!nonEmptyString(enterpriseRisk.lastReviewedDate)) {
    fail(`${label}.enterpriseRisk.lastReviewedDate must be a non-empty string`);
  }
  assertStringArray(
    enterpriseRisk.allowedEnvironments,
    `${label}.enterpriseRisk.allowedEnvironments`,
    { allowEmpty: true }
  );
  assertStringArray(
    enterpriseRisk.forbiddenEnvironments,
    `${label}.enterpriseRisk.forbiddenEnvironments`,
    { allowEmpty: true }
  );
  if (tool.detection !== undefined) {
    const detection = assertPlainRecord(tool.detection, `${label}.detection`);
    if (!nonEmptyString(detection.state)) fail(`${label}.detection.state must be a non-empty string`);
  }
  return tool;
}

function validateRegistries({ agentsRegistry, skillsRegistry, toolsRegistry }) {
  const agents = assertRegistryEnvelope(agentsRegistry, "agents", "agent").map(assertAgentRecord);
  const skills = assertRegistryEnvelope(skillsRegistry, "skills", "skill").map(assertSkillRecord);
  const tools = assertRegistryEnvelope(toolsRegistry, "tools", "tool").map(assertToolRecord);
  const ids = new Set();
  for (const id of [
    ...agents.map(({ record }) => record.name),
    ...skills.map(({ record }) => record.name),
    ...tools.map((tool) => tool.id)
  ]) {
    if (ids.has(id)) fail(`duplicate resource id: ${id}`);
    ids.add(id);
  }
  return { agents, skills, tools };
}

function agentSandboxMode(contents, resourceId) {
  let source;
  try {
    source = new TextDecoder("utf-8", { fatal: true }).decode(contents);
  } catch {
    fail(`agent capability ${resourceId} TOML must be valid UTF-8`);
  }

  const values = [];
  let multilineDelimiter = null;
  let tableSeen = false;
  for (const line of source.split(/\r?\n/u)) {
    if (multilineDelimiter !== null) {
      if (line.includes(multilineDelimiter)) multilineDelimiter = null;
      continue;
    }

    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("[")) {
      tableSeen = true;
      continue;
    }
    if (/^sandbox_mode(?:\s*=|\s)/u.test(trimmed)) {
      if (tableSeen) fail(`agent capability ${resourceId} sandbox_mode is ambiguous`);
      const match = /^sandbox_mode\s*=\s*"([^"\r\n]*)"\s*(?:#.*)?$/u.exec(trimmed);
      if (!match) fail(`agent capability ${resourceId} sandbox_mode is ambiguous`);
      if (!AGENT_SANDBOX_MODES.has(match[1])) {
        fail(`agent capability ${resourceId} has unknown sandbox_mode: ${match[1]}`);
      }
      values.push(match[1]);
    }

    const beforeComment = trimmed.split("#", 1)[0];
    for (const delimiter of ['"""', "'''"]) {
      const occurrences = beforeComment.split(delimiter).length - 1;
      if (occurrences % 2 === 1) {
        multilineDelimiter = delimiter;
        break;
      }
    }
  }

  if (values.length === 0) fail(`agent capability ${resourceId} sandbox_mode is missing`);
  if (values.length > 1) fail(`agent capability ${resourceId} sandbox_mode is duplicated`);
  return values[0];
}

function capabilityForFile(repositoryRoot, resourceId, type, evidencePath, nativeAdapter) {
  if (!isCanonicalRepositoryRelativePath(evidencePath, { allowDot: false })) {
    fail(`invalid ${type} registry record ${resourceId}: capability path must be canonical`);
  }
  const candidate = path.resolve(repositoryRoot, ...evidencePath.split("/"));
  const label = `${type} capability ${resourceId}`;
  const trustedPath = assertRegularFileWithin(repositoryRoot, candidate, label);
  const contents = readFileSync(trustedPath);
  assertRegularFileWithin(repositoryRoot, trustedPath, label);
  const canonicalContents = canonicalTextUtf8LfBytes(contents, label);
  const utf8Bytes = canonicalContents.byteLength;
  const sandboxMode = type === "agent"
    ? agentSandboxMode(contents, resourceId)
    : "not-applicable";
  return Object.freeze({
    resourceId,
    type,
    state: "available",
    evidencePath,
    contentDigest: canonicalTextSha256(canonicalContents, label),
    utf8Bytes,
    measuredContextCost: Math.ceil(utf8Bytes / 3),
    measurementMethod: "conservative-token-estimate",
    sandboxMode,
    nativeAdapter: Object.freeze({ ...nativeAdapter })
  });
}

function registerTrustedCatalogResource(resource) {
  TRUSTED_CATALOG_RESOURCES.add(resource);
  return resource;
}

export function assertTrustedScopedLocalWriteResource(resource, assignmentId = "unknown") {
  if (!hasTrustedScopedLocalWriteCapability(resource)) {
    fail(
      `write assignment ${assignmentId} requires trusted catalog-derived workspace-write capability`
    );
  }
  return resource;
}

export function hasTrustedScopedLocalWriteCapability(resource) {
  return TRUSTED_CATALOG_RESOURCES.has(resource)
    && resource?.type === "agent"
    && resource.eligibility?.eligible === true
    && resource.runtimePosture?.sandboxMode === "workspace-write"
    && resource.runtimePosture?.scopedLocalWrite === true;
}

export function inspectInternalCapabilities(options) {
  assertPlainRecord(options, "internal capability inspection options");
  assertKnownFields(
    options,
    new Set(["repositoryRoot", "agentsRegistry", "skillsRegistry"]),
    "internal capability inspection options"
  );
  if (!nonEmptyString(options.repositoryRoot)) fail("internal capability inspection requires repositoryRoot");
  const agents = assertRegistryEnvelope(options.agentsRegistry, "agents", "agent").map(assertAgentRecord);
  const skills = assertRegistryEnvelope(options.skillsRegistry, "skills", "skill").map(assertSkillRecord);
  const ids = new Set();
  const capabilities = [];
  for (const { record } of agents) {
    if (ids.has(record.name)) fail(`duplicate resource id: ${record.name}`);
    ids.add(record.name);
    capabilities.push(capabilityForFile(
      options.repositoryRoot,
      record.name,
      "agent",
      record.runtimeFiles.tomlPath,
      { kind: "codex-agent", id: record.nativeCodexAgentName }
    ));
  }
  for (const { record } of skills) {
    if (ids.has(record.name)) fail(`duplicate resource id: ${record.name}`);
    ids.add(record.name);
    capabilities.push(capabilityForFile(
      options.repositoryRoot,
      record.name,
      "skill",
      record.skillPath,
      { kind: "codex-skill", id: record.name }
    ));
  }
  capabilities.sort((left, right) => {
    if (left.resourceId < right.resourceId) return -1;
    if (left.resourceId > right.resourceId) return 1;
    return left.type < right.type ? -1 : left.type > right.type ? 1 : 0;
  });
  return Object.freeze(capabilities);
}

function environmentMatches(policyValue, environment) {
  const policy = String(policyValue ?? "").trim().toLowerCase();
  const target = String(environment ?? "").trim().toLowerCase();
  return policy !== "" && target !== "" && policy === target;
}

function environmentRestrictionReasons(restrictions, environment) {
  const reasons = [];
  if (restrictions.forbidden.some((entry) => environmentMatches(entry, environment))) {
    reasons.push("environment-forbidden");
  }
  if (
    restrictions.allowed.length > 0
    && !restrictions.allowed.some((entry) => environmentMatches(entry, environment))
  ) {
    reasons.push("environment-not-allowed");
  }
  return reasons;
}

function evidenceFromCapability(capability, state) {
  return {
    state,
    evidencePath: capability.evidencePath,
    contentDigest: capability.contentDigest
  };
}

function measurementFromCapability(capability) {
  return {
    method: capability.measurementMethod,
    utf8Bytes: capability.utf8Bytes,
    evidencePath: capability.evidencePath,
    contentDigest: capability.contentDigest
  };
}

function buildAgentResource(entry, capability) {
  const { record: agent, metadata } = entry;
  const restrictions = metadata.environmentRestrictions;
  const reasons = [];
  if (!agent.status.includes("approved") || metadata.lifecycle !== "active") {
    reasons.push("registry-not-approved");
  }
  if (agent.runtimeFiles.tomlPresent !== true) reasons.push("registry-runtime-file-not-present");
  if (capability.state !== "available") reasons.push("runtime-capability-absent");
  reasons.push(...environmentRestrictionReasons(restrictions, INTERNAL_ENVIRONMENT));
  const eligible = reasons.length === 0;
  return assertResourceContract({
    schemaVersion: SCHEMA_VERSION,
    id: agent.name,
    type: "agent",
    canonicalCompetencies: metadata.canonicalCompetencies,
    eligibleRoles: metadata.eligibleRoles,
    ...(metadata.targetAffinity === undefined ? {} : { targetAffinity: metadata.targetAffinity }),
    verificationCapabilities: metadata.verificationCapabilities,
    measuredContextCost: capability.measuredContextCost,
    contextCostUnit: "tokens",
    contextMeasurement: measurementFromCapability(capability),
    authority: metadata.authority,
    lifecycle: metadata.lifecycle,
    runtimePosture: {
      registryPresent: true,
      available: capability.state === "available",
      supported: capability.nativeAdapter.kind === "codex-agent",
      executionProof: false,
      sandboxMode: capability.sandboxMode,
      scopedLocalWrite: capability.sandboxMode === "workspace-write"
    },
    environmentRestrictions: restrictions,
    detectionEvidence: evidenceFromCapability(capability, "observed"),
    freshness: evidenceFromCapability(capability, "current"),
    nativeAdapter: capability.nativeAdapter,
    commandReference: null,
    eligibility: { eligible, reasons }
  });
}

function buildSkillResource(entry, capability) {
  const { record: skill, metadata } = entry;
  const restrictions = metadata.environmentRestrictions;
  const reasons = [];
  if (!skill.status.includes("active") || metadata.lifecycle !== "active") {
    reasons.push("registry-not-active");
  }
  if (capability.state !== "available") reasons.push("runtime-capability-absent");
  reasons.push(...environmentRestrictionReasons(restrictions, INTERNAL_ENVIRONMENT));
  const eligible = reasons.length === 0;
  return assertResourceContract({
    schemaVersion: SCHEMA_VERSION,
    id: skill.name,
    type: "skill",
    canonicalCompetencies: metadata.canonicalCompetencies,
    eligibleRoles: metadata.eligibleRoles,
    verificationCapabilities: [],
    measuredContextCost: capability.measuredContextCost,
    contextCostUnit: "tokens",
    contextMeasurement: measurementFromCapability(capability),
    authority: metadata.authority,
    lifecycle: metadata.lifecycle,
    runtimePosture: {
      registryPresent: true,
      available: capability.state === "available",
      supported: capability.nativeAdapter.kind === "codex-skill",
      executionProof: false,
      sandboxMode: "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: restrictions,
    detectionEvidence: evidenceFromCapability(capability, "observed"),
    freshness: evidenceFromCapability(capability, "current"),
    nativeAdapter: capability.nativeAdapter,
    commandReference: null,
    eligibility: { eligible, reasons }
  });
}

function blockedReviewReasons(tool) {
  const reasons = [];
  const activation = String(tool.activationStatus).toLowerCase();
  const reviewState = String(tool.enterpriseRisk.reviewState).toLowerCase();
  if (activation.includes("metadata-only")) reasons.push("registry-metadata-only");
  if (reviewState.includes("unreviewed-blocked")) reasons.push("registry-unreviewed-blocked");
  if (reviewState.includes("owner-review-required")) reasons.push("registry-owner-review-required");
  if (
    reviewState !== "reviewed"
    && !reviewState.includes("unreviewed-blocked")
    && !reviewState.includes("owner-review-required")
  ) {
    reasons.push("registry-review-state-unknown");
  }
  if (!exactIsoDate(tool.enterpriseRisk.lastReviewedDate)) {
    reasons.push("registry-review-date-invalid");
  }
  return reasons;
}

function buildToolResource(tool) {
  const restrictions = {
    allowed: [...tool.enterpriseRisk.allowedEnvironments],
    forbidden: [...tool.enterpriseRisk.forbiddenEnvironments]
  };
  const reasons = ["trusted-capability-inspector-unavailable", ...blockedReviewReasons(tool)];
  if (tool.detection?.state === "syntax-only") reasons.push("syntax-only-detection-not-capability");
  reasons.push(...environmentRestrictionReasons(restrictions, INTERNAL_ENVIRONMENT));
  const canonicalCompetencies = [...new Set([tool.category, tool.lane].filter(nonEmptyString))];
  return assertResourceContract({
    schemaVersion: SCHEMA_VERSION,
    id: tool.id,
    type: "tool",
    canonicalCompetencies,
    eligibleRoles: ["support"],
    verificationCapabilities: [],
    measuredContextCost: 0,
    contextCostUnit: "tokens",
    contextMeasurement: null,
    authority: nonEmptyString(tool.repository) ? "vendor-official" : "community-reviewed",
    lifecycle: "quarantined",
    runtimePosture: {
      registryPresent: true,
      available: false,
      supported: false,
      executionProof: false,
      sandboxMode: "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: restrictions,
    detectionEvidence: { state: "absent", evidencePath: null, contentDigest: null },
    freshness: { state: "absent", evidencePath: null, contentDigest: null },
    nativeAdapter: { kind: "external-tool", id: tool.id },
    commandReference: null,
    eligibility: { eligible: false, reasons: [...new Set(reasons)] }
  });
}

function inspectedCommandResourceId(commandReference) {
  const slug = commandReference.scriptName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 32);
  const identityDigest = createHash("sha256")
    .update(commandReference.manifestPath)
    .update("\0")
    .update(commandReference.scriptName)
    .update("\0")
    .update(commandReference.digest)
    .digest("hex")
    .slice(0, 12);
  return `project-script-${slug}-${identityDigest}`;
}

export function commandCompetencyForVerifierKind(verifierKind) {
  return Object.prototype.hasOwnProperty.call(
    PROJECT_COMMAND_COMPETENCY_BY_VERIFIER_KIND,
    verifierKind
  )
    ? PROJECT_COMMAND_COMPETENCY_BY_VERIFIER_KIND[verifierKind]
    : null;
}

function inferProjectScriptVerifierKinds(scriptName) {
  const normalized = scriptName.toLowerCase();
  if (normalized === "test") return [];
  const categories = [
    ["static-analysis", /^(?:lint(?::.+)?|typecheck(?::.+)?|type-check(?::.+)?|check:types?(?::.+)?|static-analysis(?::.+)?)$/u],
    ["unit-test", /^(?:unit(?:-test)?(?::.+)?|test:(?:unit|focused)(?::.+)?)$/u],
    ["integration-test", /^(?:integration(?:-test)?(?::.+)?|test:integration(?::.+)?)$/u],
    ["browser-runtime", /^(?:e2e(?::.+)?|browser(?:-test)?(?::.+)?|test:(?:e2e|browser|playwright|cypress)(?::.+)?|(?:playwright|cypress)(?::.+)?)$/u],
    ["native-build", /^(?:native-build(?::.+)?|build:(?:native|ios|android|macos|windows|electron|tauri)(?::.+)?|(?:ios|android|macos|windows|electron|tauri):build(?::.+)?)$/u],
    ["simulator-device", /^(?:(?:simulator|emulator|device)(?::.+)?|test:(?:simulator|emulator|device)(?::.+)?|(?:simulator|emulator|device):test(?::.+)?)$/u],
    ["packaging-install-rollback", /^(?:(?:package|packaging|pack|rollback)(?::.+)?|(?:test|verify|check):(?:package|packaging|install|rollback)(?::.+)?)$/u]
  ];
  const match = categories.find(([, pattern]) => pattern.test(normalized));
  return match ? [match[0]] : [];
}

function inspectCommandReference(repositoryRoot, commandReference, index) {
  const label = `inspected project command reference[${index}]`;
  assertKnownFields(commandReference, PROJECT_COMMAND_REFERENCE_FIELDS, label);
  if (commandReference.kind !== "project-script") {
    fail(`${label}.kind must be project-script`);
  }
  if (!isCanonicalRepositoryRelativePath(commandReference.manifestPath, { allowDot: false })) {
    fail(`${label}.manifestPath must be a canonical repository-relative path`);
  }
  if (path.posix.basename(commandReference.manifestPath) !== "package.json") {
    fail(`${label}.manifestPath must identify an inspected package.json`);
  }
  if (!PROJECT_SCRIPT_NAME_PATTERN.test(commandReference.scriptName)) {
    fail(`${label}.scriptName must be a stable package-script name`);
  }
  if (!SHA256_PATTERN.test(commandReference.digest)) {
    fail(`${label}.digest must be a lowercase sha256 digest`);
  }

  const candidate = path.resolve(repositoryRoot, ...commandReference.manifestPath.split("/"));
  const trustedPath = assertRegularFileWithin(repositoryRoot, candidate, label);
  const contents = readFileSync(trustedPath);
  assertRegularFileWithin(repositoryRoot, trustedPath, label);
  const manifestDigest = createHash("sha256").update(contents).digest("hex");
  if (manifestDigest !== commandReference.digest) {
    fail(`${label}.digest must match the inspected manifest`);
  }
  let manifest;
  try {
    manifest = JSON.parse(contents.toString("utf8"));
  } catch {
    fail(`${label}.manifestPath must contain valid JSON`);
  }
  if (!isPlainOwnPropertyRecord(manifest) || !isPlainOwnPropertyRecord(manifest.scripts)) {
    fail(`${label}.manifestPath must contain a scripts object`);
  }
  if (
    !hasOwn(manifest.scripts, commandReference.scriptName)
    || typeof manifest.scripts[commandReference.scriptName] !== "string"
  ) {
    fail(`${label}.scriptName must exist in the inspected manifest`);
  }
  return {
    commandReference: Object.freeze({ ...commandReference }),
    contentDigest: manifestDigest,
    utf8Bytes: contents.byteLength
  };
}

export function buildInspectedProjectCommandResources(options) {
  assertPlainRecord(options, "inspected project command resource options");
  assertKnownFields(
    options,
    new Set(["repositoryRoot", "commandReferences"]),
    "inspected project command resource options"
  );
  if (!nonEmptyString(options.repositoryRoot)) {
    fail("inspected project command resources require repositoryRoot");
  }
  if (!Array.isArray(options.commandReferences)) {
    fail("inspected project command resources require commandReferences");
  }
  const identities = new Set();
  const resourceIds = new Set();
  const resources = options.commandReferences.map((reference, index) => {
    const inspected = inspectCommandReference(options.repositoryRoot, reference, index);
    const verifierKinds = inferProjectScriptVerifierKinds(reference.scriptName);
    const inferredCompetencies = verifierKinds.map((kind) => commandCompetencyForVerifierKind(kind));
    const canonicalCompetencies = inferredCompetencies.length > 0
      ? inferredCompetencies
      : [PROJECT_SCRIPT_FALLBACK_COMPETENCY];
    const identity = `${reference.manifestPath}\0${reference.scriptName}`;
    if (identities.has(identity)) {
      fail(`inspected project command reference[${index}] duplicates ${reference.manifestPath}:${reference.scriptName}`);
    }
    identities.add(identity);
    const id = inspectedCommandResourceId(reference);
    if (resourceIds.has(id)) fail(`inspected project command resource id collision: ${id}`);
    resourceIds.add(id);
    const resource = assertResourceContract({
      schemaVersion: SCHEMA_VERSION,
      id,
      type: "tool",
      canonicalCompetencies,
      eligibleRoles: ["support"],
      verificationCapabilities: [],
      measuredContextCost: Math.ceil(inspected.utf8Bytes / 3),
      contextCostUnit: "tokens",
      contextMeasurement: {
        method: "conservative-token-estimate",
        utf8Bytes: inspected.utf8Bytes,
        evidencePath: reference.manifestPath,
        contentDigest: inspected.contentDigest
      },
      authority: "internal-reviewed",
      lifecycle: "active",
      runtimePosture: {
        registryPresent: true,
        available: true,
        supported: true,
        executionProof: false,
        sandboxMode: "not-applicable",
        scopedLocalWrite: false
      },
      environmentRestrictions: {
        allowed: [INTERNAL_ENVIRONMENT],
        forbidden: []
      },
      detectionEvidence: {
        state: "observed",
        evidencePath: reference.manifestPath,
        contentDigest: inspected.contentDigest
      },
      freshness: {
        state: "current",
        evidencePath: reference.manifestPath,
        contentDigest: inspected.contentDigest
      },
      nativeAdapter: { kind: "project-script", id },
      commandReference: inspected.commandReference,
      eligibility: { eligible: true, reasons: [] }
    });
    return registerTrustedCatalogResource(resource);
  });
  return Object.freeze(resources);
}

export function buildResourceCatalog(options) {
  assertPlainRecord(options, "resource catalog options");
  for (const field of FORBIDDEN_CATALOG_INPUTS) {
    if (hasOwn(options, field)) fail(`caller-injected ${field} is forbidden`);
  }
  for (const field of Object.keys(options)) {
    if (!CATALOG_INPUTS.has(field)) fail(`resource catalog option ${field} is not allowed`);
  }
  if (!nonEmptyString(options.repositoryRoot)) fail("resource catalog requires repositoryRoot");

  const validated = validateRegistries(options);
  const capabilities = inspectInternalCapabilities({
    repositoryRoot: options.repositoryRoot,
    agentsRegistry: options.agentsRegistry,
    skillsRegistry: options.skillsRegistry
  });
  const capabilityIndex = new Map(capabilities.map((entry) => [`${entry.type}:${entry.resourceId}`, entry]));
  const agents = validated.agents.map((entry) => registerTrustedCatalogResource(
    buildAgentResource(entry, capabilityIndex.get(`agent:${entry.record.name}`))
  ));
  const skills = validated.skills.map((entry) => registerTrustedCatalogResource(
    buildSkillResource(entry, capabilityIndex.get(`skill:${entry.record.name}`))
  ));
  const tools = validated.tools.map((tool) => registerTrustedCatalogResource(buildToolResource(tool)));
  return Object.freeze([...agents, ...skills, ...tools]);
}

export function applySourceReferenceSnapshotToResources(resources, snapshot) {
  if (!Array.isArray(resources)) fail("source governance resources must be an array");
  const validatedSnapshot = assertSourceReferenceSnapshot(snapshot);
  const resourceById = new Map();
  for (const resource of resources) {
    if (!TRUSTED_CATALOG_RESOURCES.has(resource)) {
      fail("source governance requires trusted catalog-derived resources");
    }
    assertResourceContract(resource);
    if (resourceById.has(resource.id)) fail(`duplicate resource id: ${resource.id}`);
    resourceById.set(resource.id, resource);
  }

  for (const dependency of validatedSnapshot.resourceGovernance.dependencies) {
    if (!resourceById.has(dependency.resourceId)) {
      fail(`source governance references unknown catalog resource: ${dependency.resourceId}`);
    }
  }

  const blockersByResource = new Map();
  for (const blocker of validatedSnapshot.resourceGovernance.blockers) {
    const reasons = blockersByResource.get(blocker.resourceId) ?? [];
    reasons.push(`source-dependency-unavailable:${blocker.sourceId}:${blocker.reason}`);
    blockersByResource.set(blocker.resourceId, reasons);
  }

  const governed = resources.map((resource) => {
    const sourceReasons = blockersByResource.get(resource.id) ?? [];
    if (sourceReasons.length === 0) return resource;
    const reasons = [...new Set([...resource.eligibility.reasons, ...sourceReasons])];
    return registerTrustedCatalogResource(assertResourceContract({
      ...structuredClone(resource),
      eligibility: { eligible: false, reasons }
    }));
  });
  return Object.freeze(governed);
}
