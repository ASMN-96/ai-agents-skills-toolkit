import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCanonicalJsonWithin } from "./canonical-json.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const STABLE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const METHOD_REFERENCE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export const SCENARIO_POLICY_SCHEMA_VERSION = "2.0.0";
export const SCENARIO_POLICY_RISK_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);
export const SCENARIO_POLICY_TOKEN_MODES = Object.freeze(["concise", "standard", "detailed"]);
export const SCENARIO_POLICY_DOMAIN_PACK_IDS = Object.freeze([
  "enterprise-core",
  "web-saas",
  "ios",
  "android",
  "windows-desktop",
  "macos-desktop",
  "expo-react-native",
  "electron",
  "tauri"
]);

const EXPECTED_SCENARIO_IDS = Object.freeze([
  "plain-language-product-request",
  "read-only-repo-audit",
  "external-skill-source-audit",
  "frontend-ui-bug",
  "dashboard-ui-redesign",
  "frontend-performance-issue",
  "supabase-rls-migration",
  "generic-postgres-orm-data-isolation",
  "postgres-query-performance",
  "api-contract-change",
  "security-review",
  "dependency-supply-chain-review",
  "performance-regression",
  "coderabbit-pr-triage",
  "release-readiness",
  "missing-capability-skill-discovery",
  "dirty-stale-divergent-repo-state",
  "install-all-tools-request",
  "small-low-risk-typo-doc-change",
  "ambiguous-behavior-changing-request",
  "high-risk-security-data-request",
  "react-typescript-quality-change",
  "tenant-security-public-payload-review",
  "pr-release-coderabbit-gate",
  "external-tool-source-update",
  "embedded-toolkit-runtime-boundary",
  "large-governed-implementation",
  "mobile-native-app-quality",
  "desktop-native-app-quality",
  "webview-boundary-review",
  "ai-agent-system-change",
  "cross-surface-api-contracts",
  "package-manager-workspace-migration",
  "agent-command-safety",
  "react-code-quality",
  "pr-scanner-output",
  "ui-polish",
  "governance-lite-router-mode",
  "task-intake-routing-gate",
  "coding-time-production-readiness",
  "api-contract-and-routing-readiness",
  "performance-scalability-cache-readiness",
  "observability-readiness",
  "application-security-readiness",
  "release-rollback-readiness"
]);

const CANONICAL_COMPETENCIES = new Set([
  "product-discovery",
  "acceptance-criteria",
  "architecture",
  "implementation",
  "responsive-ui",
  "web-accessibility",
  "uiux",
  "accessibility",
  "design-system",
  "api-contracts",
  "contract-review",
  "data-isolation",
  "database",
  "security",
  "privacy",
  "verification",
  "testing",
  "governance",
  "release",
  "rollback",
  "performance",
  "observability",
  "reliability",
  "failure-semantics",
  "adversarial-review",
  "technical-research",
  "source-safety",
  "freshness",
  "ios-native",
  "apple-hig",
  "ios-accessibility",
  "privacy-manifest",
  "android-native",
  "android-quality",
  "android-accessibility",
  "windows-native",
  "windows-accessibility",
  "macos-native",
  "macos-accessibility",
  "expo-react-native",
  "mobile-accessibility",
  "native-boundaries",
  "electron",
  "desktop-security",
  "tauri",
  "ai-systems",
  "ai-evaluation",
  "agentic-security"
]);

const GATE_PACK = new Map([
  ["enterprise-low-risk-scope-review", "enterprise-core"],
  ["enterprise-product-acceptance", "enterprise-core"],
  ["enterprise-architecture-rollback", "enterprise-core"],
  ["enterprise-security-privacy", "enterprise-core"],
  ["enterprise-independent-verification", "enterprise-core"],
  ["enterprise-adversarial-review", "enterprise-core"],
  ["stateful-failure-semantics", "enterprise-core"],
  ["stack-version-evidence", "enterprise-core"],
  ["focused-tests", "enterprise-core"],
  ["verification-evidence", "enterprise-core"],
  ["enterprise-operability-performance", "enterprise-core"],
  ["enterprise-operability-owner-review", "enterprise-core"],
  ["enterprise-critical-owner-approval", "enterprise-core"],
  ["enterprise-critical-recovery-restore", "enterprise-core"],
  ["enterprise-critical-staged-rollout", "enterprise-core"],
  ["enterprise-critical-heightened-monitoring", "enterprise-core"],
  ["ai-versioned-behavior-contract", "enterprise-core"],
  ["ai-evaluation-regression", "enterprise-core"],
  ["ai-agentic-security-review", "enterprise-core"],
  ["ai-accountable-human-approval", "enterprise-core"],
  ["web-wcag-22-aa", "web-saas"],
  ["web-browser-interaction", "web-saas"],
  ["web-runtime-security-quality", "web-saas"],
  ["web-security-review", "web-saas"],
  ["ios-native-quality-accessibility", "ios"],
  ["ios-simulator-device-behavior", "ios"],
  ["ios-accessibility-audit", "ios"],
  ["ios-privacy-performance-release", "ios"],
  ["ios-performance-profile", "ios"],
  ["ios-packaging-install-rollback", "ios"],
  ["android-native-quality-accessibility", "android"],
  ["android-emulator-device-behavior", "android"],
  ["android-accessibility-audit", "android"],
  ["android-security-performance-release", "android"],
  ["android-performance-profile", "android"],
  ["android-packaging-install-rollback", "android"],
  ["windows-native-quality-accessibility", "windows-desktop"],
  ["windows-accessibility-audit", "windows-desktop"],
  ["windows-security-packaging-rollback", "windows-desktop"],
  ["windows-performance-profile", "windows-desktop"],
  ["windows-packaging-install-rollback", "windows-desktop"],
  ["macos-native-quality-accessibility", "macos-desktop"],
  ["macos-accessibility-audit", "macos-desktop"],
  ["macos-privacy-performance-release", "macos-desktop"],
  ["macos-performance-profile", "macos-desktop"],
  ["macos-packaging-install-rollback", "macos-desktop"],
  ["expo-native-behavior-accessibility", "expo-react-native"],
  ["expo-simulator-device-behavior", "expo-react-native"],
  ["expo-accessibility-audit", "expo-react-native"],
  ["expo-build-release", "expo-react-native"],
  ["electron-process-ipc-security", "electron"],
  ["electron-process-ipc-integration", "electron"],
  ["electron-packaging-update-rollback", "electron"],
  ["tauri-command-capability-security", "tauri"],
  ["tauri-command-capability-integration", "tauri"],
  ["tauri-packaging-update-rollback", "tauri"]
]);

const AGENT_IDS = new Set([
  "product-agent",
  "architect-agent",
  "frontend-agent",
  "uiux-agent",
  "backend-contract-agent",
  "backend-implementation-agent",
  "database-rls-agent",
  "security-agent",
  "qa-test-agent",
  "reviewer-agent",
  "release-manager-agent",
  "sre-performance-agent",
  "skill-scout-agent",
  "mobile-platform-agent",
  "desktop-platform-agent"
]);
const SKILL_IDS = new Set(["governance", "uiux", "code-quality", "security-review", "pr-release-gate"]);
const PROFILE_IDS = new Set([
  "audit-profile",
  "source-review-profile",
  "frontend-profile",
  "uiux-profile",
  "sre-profile",
  "backend-profile",
  "security-profile",
  "release-profile",
  "planning-profile",
  "implementation-profile",
  "fullstack-profile"
]);
const RESERVED_EXECUTION_FIELDS = new Set([
  "status",
  "executionStatus",
  "validationStatus",
  "actualSpawnProof",
  "actualSpawnObserved",
  "evidence",
  "proof",
  "checks",
  "passed",
  "verified",
  "executedResources",
  "invokedResources"
]);
const FORBIDDEN_CLAIM_ID_PARTS = new Set([
  "passed",
  "failed",
  "executed",
  "invoked",
  "completed",
  "verified",
  "successful",
  "success",
  "proof"
]);
const REGISTRY_FIELDS = new Set(["schemaVersion", "registryType", "tokenModes", "scenarios"]);
const SCENARIO_FIELDS = new Set([
  "scenario",
  "userLanguageExamples",
  "inferredIntent",
  "riskLevel",
  "selectedProfile",
  "agents",
  "skills",
  "supportTools",
  "stopConditions",
  "validationGates",
  "expectedCompletionReport",
  "tokenMode",
  "methodReferences",
  "requiredCompetencies",
  "requiredGateIds",
  "requiredRoles",
  "requiredDomainPackIds"
]);
const ROLE_FIELDS = new Set(["lead", "verifier"]);
const RESOLVER_FIELDS = new Set([
  "registry",
  "scenario",
  "risk",
  "tokenMode",
  "domainPolicy",
  "additions"
]);
const DOMAIN_POLICY_FIELDS = new Set([
  "requiredCompetencies",
  "requiredGateIds",
  "requiredDomainPackIds"
]);
const ADDITION_FIELDS = new Set(["competencies", "gateIds", "domainPackIds"]);

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) deepFreeze(item);
  return Object.freeze(value);
}

function rejectUnknownFields(record, allowed, label, issues, replacementMessage = false) {
  for (const field of Object.keys(record)) {
    if (allowed.has(field)) continue;
    if (RESERVED_EXECUTION_FIELDS.has(field)) {
      issues.push(`${label}.${field} is forbidden because scenario policy cannot contain execution status or proof`);
    } else if (replacementMessage) {
      issues.push(`${label}.${field} is not allowed; callers may add requirements but never replace them`);
    } else {
      issues.push(`${label}.${field} is not allowed`);
    }
  }
}

function requireNonEmptyString(value, label, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${label} must be a non-empty string`);
    return "";
  }
  return value;
}

function requireStableId(value, label, issues) {
  if (typeof value !== "string" || !STABLE_ID.test(value)) {
    issues.push(`${label} must be a stable lowercase ID`);
    return "";
  }
  return value;
}

function requireUniqueStrings(value, label, issues, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    issues.push(`${label} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) issues.push(`${label} must not be empty`);
  const seen = new Set();
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim() === "") {
      issues.push(`${label}[${index}] must be a non-empty string`);
      continue;
    }
    if (seen.has(item)) issues.push(`${label}[${index}] must be unique`);
    seen.add(item);
  }
  return value;
}

function validateKnownValues(values, known, label, noun, issues) {
  for (const [index, value] of values.entries()) {
    if (!known.has(value)) issues.push(`${label}[${index}] ${value} is not ${noun}`);
  }
}

function validateAdditiveIds(values, label, noun, issues) {
  for (const [index, value] of values.entries()) {
    if (typeof value !== "string" || !STABLE_ID.test(value)) {
      issues.push(`${label}[${index}] must be a stable lowercase kebab-case ${noun} ID`);
      continue;
    }
    if (value.split("-").some((part) => FORBIDDEN_CLAIM_ID_PARTS.has(part))) {
      issues.push(`${label}[${index}] must name an obligation, not execution status or proof: ${value}`);
    }
  }
}

function validateGatePackClosure(gateIds, packIds, label, issues) {
  const selectedPacks = new Set(packIds);
  for (const gateId of gateIds) {
    const requiredPack = GATE_PACK.get(gateId);
    if (requiredPack && !selectedPacks.has(requiredPack)) {
      issues.push(`${label} ${gateId} requires domain pack ${requiredPack}`);
    }
  }
}

function validateRoles(value, label, risk, issues) {
  if (!isPlainRecord(value)) {
    issues.push(`${label} must be a plain record`);
    return;
  }
  rejectUnknownFields(value, ROLE_FIELDS, label, issues);
  if (value.lead !== "required") issues.push(`${label}.lead must be required`);
  if (value.verifier !== "none" && value.verifier !== "independent") {
    issues.push(`${label}.verifier must be none or independent`);
  }
  if ((risk === "high" || risk === "critical") && value.verifier !== "independent") {
    issues.push(`${risk} risk requires an independent verifier`);
  }
}

function validateScenario(entry, index, seenIds, issues) {
  const label = `scenarios[${index}]`;
  if (!isPlainRecord(entry)) {
    issues.push(`${label} must be a plain record`);
    return;
  }
  rejectUnknownFields(entry, SCENARIO_FIELDS, label, issues);

  const scenarioId = requireStableId(entry.scenario, `${label}.scenario`, issues);
  if (seenIds.has(scenarioId)) issues.push(`scenario is duplicated: ${scenarioId}`);
  seenIds.add(scenarioId);
  requireUniqueStrings(entry.userLanguageExamples, `${label}.userLanguageExamples`, issues);
  requireNonEmptyString(entry.inferredIntent, `${label}.inferredIntent`, issues);
  if (!SCENARIO_POLICY_RISK_LEVELS.includes(entry.riskLevel)) {
    issues.push(`${label}.riskLevel is invalid: ${entry.riskLevel}`);
  }
  if (!PROFILE_IDS.has(entry.selectedProfile)) {
    issues.push(`${label}.selectedProfile is not a canonical profile: ${entry.selectedProfile}`);
  }

  const agents = requireUniqueStrings(entry.agents, `${label}.agents`, issues);
  validateKnownValues(agents, AGENT_IDS, `${label}.agents`, "a canonical agent", issues);
  const skills = requireUniqueStrings(entry.skills, `${label}.skills`, issues);
  validateKnownValues(skills, SKILL_IDS, `${label}.skills`, "a canonical active skill", issues);
  requireUniqueStrings(entry.supportTools, `${label}.supportTools`, issues, { allowEmpty: true });
  requireUniqueStrings(entry.stopConditions, `${label}.stopConditions`, issues);
  requireUniqueStrings(entry.validationGates, `${label}.validationGates`, issues);
  requireUniqueStrings(entry.expectedCompletionReport, `${label}.expectedCompletionReport`, issues);
  if (!SCENARIO_POLICY_TOKEN_MODES.includes(entry.tokenMode)) {
    issues.push(`${label}.tokenMode is invalid: ${entry.tokenMode}`);
  }
  const methodReferences = requireUniqueStrings(entry.methodReferences, `${label}.methodReferences`, issues);
  for (const [methodIndex, reference] of methodReferences.entries()) {
    if (!METHOD_REFERENCE.test(reference)) {
      issues.push(`${label}.methodReferences[${methodIndex}] is not a stable method reference`);
    }
  }

  const competencies = requireUniqueStrings(
    entry.requiredCompetencies,
    `${label}.requiredCompetencies`,
    issues
  );
  validateKnownValues(
    competencies,
    CANONICAL_COMPETENCIES,
    `${label}.requiredCompetencies`,
    "a canonical competency",
    issues
  );
  const gateIds = requireUniqueStrings(entry.requiredGateIds, `${label}.requiredGateIds`, issues);
  validateKnownValues(
    gateIds,
    new Set(GATE_PACK.keys()),
    `${label}.requiredGateIds`,
    "a canonical obligation gate",
    issues
  );
  validateRoles(entry.requiredRoles, `${label}.requiredRoles`, entry.riskLevel, issues);
  const domainPackIds = requireUniqueStrings(
    entry.requiredDomainPackIds,
    `${label}.requiredDomainPackIds`,
    issues
  );
  validateKnownValues(
    domainPackIds,
    new Set(SCENARIO_POLICY_DOMAIN_PACK_IDS),
    `${label}.requiredDomainPackIds`,
    "a canonical domain pack",
    issues
  );
  if (domainPackIds[0] !== "enterprise-core") {
    issues.push(`${label}.requiredDomainPackIds must begin with enterprise-core`);
  }
  validateGatePackClosure(gateIds, domainPackIds, `${label}.requiredGateIds`, issues);
}

export function assertScenarioPolicyRegistry(registry) {
  if (!isPlainRecord(registry)) {
    throw new Error("invalid scenario-policy registry v2: registry must be a plain record");
  }
  const issues = [];
  rejectUnknownFields(registry, REGISTRY_FIELDS, "registry", issues);
  if (registry.schemaVersion !== SCENARIO_POLICY_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be exactly ${SCENARIO_POLICY_SCHEMA_VERSION}`);
  }
  if (registry.registryType !== "routing-matrix") {
    issues.push("registryType must be routing-matrix");
  }
  if (JSON.stringify(registry.tokenModes) !== JSON.stringify(SCENARIO_POLICY_TOKEN_MODES)) {
    issues.push(`tokenModes must be exactly: ${SCENARIO_POLICY_TOKEN_MODES.join(", ")}`);
  }

  const seenIds = new Set();
  if (!Array.isArray(registry.scenarios)) {
    issues.push("scenarios must be an array");
  } else {
    registry.scenarios.forEach((entry, index) => validateScenario(entry, index, seenIds, issues));
    const actualIds = registry.scenarios.map((entry) => entry?.scenario);
    if (JSON.stringify(actualIds) !== JSON.stringify(EXPECTED_SCENARIO_IDS)) {
      issues.push("scenarios must contain the exact canonical 45 IDs in deterministic order");
    }
  }
  if (issues.length > 0) {
    throw new Error(`invalid scenario-policy registry v2: ${issues.join("; ")}`);
  }
  return deepFreeze(structuredClone(registry));
}

export async function loadScenarioPolicyRegistry(
  registryPath = path.join(ROOT, "registries", "routing-matrix.json"),
  repositoryRoot = ROOT
) {
  let parsed;
  try {
    parsed = await readCanonicalJsonWithin(repositoryRoot, registryPath, "scenario-policy registry");
  } catch (error) {
    throw new Error(`could not load scenario-policy registry: ${error.message}`);
  }
  return assertScenarioPolicyRegistry(parsed);
}

function validateRequiredPolicy(value, label) {
  const issues = [];
  if (!isPlainRecord(value)) throw new Error(`invalid ${label}: ${label} must be a plain record`);
  rejectUnknownFields(value, DOMAIN_POLICY_FIELDS, label, issues);
  for (const field of DOMAIN_POLICY_FIELDS) {
    if (!Object.hasOwn(value, field)) issues.push(`${label} requires ${field}`);
  }
  const requiredCompetencies = requireUniqueStrings(
    value.requiredCompetencies,
    `${label}.requiredCompetencies`,
    issues,
    { allowEmpty: true }
  );
  validateKnownValues(
    requiredCompetencies,
    CANONICAL_COMPETENCIES,
    `${label}.requiredCompetencies`,
    "a canonical competency",
    issues
  );
  const requiredGateIds = requireUniqueStrings(
    value.requiredGateIds,
    `${label}.requiredGateIds`,
    issues,
    { allowEmpty: true }
  );
  validateKnownValues(
    requiredGateIds,
    new Set(GATE_PACK.keys()),
    `${label}.requiredGateIds`,
    "a canonical obligation gate",
    issues
  );
  const requiredDomainPackIds = requireUniqueStrings(
    value.requiredDomainPackIds,
    `${label}.requiredDomainPackIds`,
    issues,
    { allowEmpty: true }
  );
  validateKnownValues(
    requiredDomainPackIds,
    new Set(SCENARIO_POLICY_DOMAIN_PACK_IDS),
    `${label}.requiredDomainPackIds`,
    "a canonical domain pack",
    issues
  );
  if (issues.length > 0) throw new Error(`invalid ${label}: ${issues.join("; ")}`);
  return { requiredCompetencies, requiredGateIds, requiredDomainPackIds };
}

function validateAdditions(value) {
  if (value === undefined) {
    return { competencies: [], gateIds: [], domainPackIds: [] };
  }
  const issues = [];
  if (!isPlainRecord(value)) throw new Error("invalid additions: additions must be a plain record");
  rejectUnknownFields(value, ADDITION_FIELDS, "additions", issues, true);
  const competencies = requireUniqueStrings(
    value.competencies ?? [],
    "additions.competencies",
    issues,
    { allowEmpty: true }
  );
  validateAdditiveIds(competencies, "additions.competencies", "competency", issues);
  const gateIds = requireUniqueStrings(
    value.gateIds ?? [],
    "additions.gateIds",
    issues,
    { allowEmpty: true }
  );
  validateAdditiveIds(gateIds, "additions.gateIds", "gate", issues);
  const domainPackIds = requireUniqueStrings(
    value.domainPackIds ?? [],
    "additions.domainPackIds",
    issues,
    { allowEmpty: true }
  );
  validateKnownValues(
    domainPackIds,
    new Set(SCENARIO_POLICY_DOMAIN_PACK_IDS),
    "additions.domainPackIds",
    "a canonical domain pack",
    issues
  );
  if (issues.length > 0) throw new Error(`invalid additions: ${issues.join("; ")}`);
  return { competencies, gateIds, domainPackIds };
}

function unionInSourceOrder(...arrays) {
  const result = [];
  const seen = new Set();
  for (const values of arrays) {
    for (const value of values) {
      if (seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

function assertFloor(kind, requested, floor, values) {
  if (requested === undefined) return floor;
  const requestedIndex = values.indexOf(requested);
  if (requestedIndex < 0) throw new Error(`${kind} is invalid: ${requested}`);
  if (requestedIndex < values.indexOf(floor)) {
    throw new Error(`${kind} cannot downgrade scenario floor ${floor} to ${requested}`);
  }
  return requested;
}

export function resolveScenarioPolicy(input) {
  if (!isPlainRecord(input)) throw new Error("resolver input must be a plain record");
  const inputIssues = [];
  rejectUnknownFields(input, RESOLVER_FIELDS, "resolver", inputIssues);
  if (!Object.hasOwn(input, "registry")) inputIssues.push("resolver requires registry");
  if (!Object.hasOwn(input, "scenario")) inputIssues.push("resolver requires scenario");
  if (inputIssues.length > 0) throw new Error(`invalid scenario-policy resolver input: ${inputIssues.join("; ")}`);

  const registry = assertScenarioPolicyRegistry(input.registry);
  const policy = registry.scenarios.find((entry) => entry.scenario === input.scenario);
  if (!policy) throw new Error(`scenario policy is not registered: ${input.scenario}`);
  const risk = assertFloor("risk", input.risk, policy.riskLevel, SCENARIO_POLICY_RISK_LEVELS);
  const tokenMode = assertFloor(
    "tokenMode",
    input.tokenMode,
    policy.tokenMode,
    SCENARIO_POLICY_TOKEN_MODES
  );
  const domainPolicy = input.domainPolicy === undefined
    ? { requiredCompetencies: [], requiredGateIds: [], requiredDomainPackIds: [] }
    : validateRequiredPolicy(input.domainPolicy, "domainPolicy");
  const additions = validateAdditions(input.additions);

  const requiredCompetencies = unionInSourceOrder(
    policy.requiredCompetencies,
    domainPolicy.requiredCompetencies,
    additions.competencies
  );
  const requiredGateIds = unionInSourceOrder(
    policy.requiredGateIds,
    domainPolicy.requiredGateIds,
    additions.gateIds
  );
  const requiredDomainPackIds = unionInSourceOrder(
    policy.requiredDomainPackIds,
    domainPolicy.requiredDomainPackIds,
    additions.domainPackIds
  );
  const closureIssues = [];
  validateGatePackClosure(requiredGateIds, requiredDomainPackIds, "requiredGateIds", closureIssues);
  if (closureIssues.length > 0) {
    throw new Error(`invalid resolved scenario policy: ${closureIssues.join("; ")}`);
  }

  const verifierEscalated = (risk === "high" || risk === "critical")
    && policy.requiredRoles.verifier !== "independent";
  const requiredRoles = {
    lead: "required",
    verifier: policy.requiredRoles.verifier === "independent" || risk === "high" || risk === "critical"
      ? "independent"
      : "none"
  };
  const resourcePreferences = {
    agentIds: [...policy.agents],
    skillIds: [...policy.skills],
    toolIds: policy.supportTools.filter(
      (value) => STABLE_ID.test(value) && !AGENT_IDS.has(value) && !SKILL_IDS.has(value)
    )
  };
  const result = {
    scenario: policy.scenario,
    risk,
    tokenMode,
    resourcePreferences,
    requiredCompetencies,
    requiredGateIds,
    requiredRoles,
    requiredDomainPackIds,
    provenance: {
      floors: {
        risk: policy.riskLevel,
        tokenMode: policy.tokenMode
      },
      requested: {
        risk: input.risk ?? null,
        tokenMode: input.tokenMode ?? null
      },
      requiredRoles: {
        lead: "scenario-policy",
        verifier: verifierEscalated ? "effective-risk" : "scenario-policy"
      },
      resourcePreferences: "scenario-policy",
      sources: [
        {
          source: "scenario-policy",
          requiredCompetencies: [...policy.requiredCompetencies],
          requiredGateIds: [...policy.requiredGateIds],
          requiredDomainPackIds: [...policy.requiredDomainPackIds]
        },
        {
          source: "domain-policy",
          requiredCompetencies: [...domainPolicy.requiredCompetencies],
          requiredGateIds: [...domainPolicy.requiredGateIds],
          requiredDomainPackIds: [...domainPolicy.requiredDomainPackIds]
        },
        {
          source: "caller-additions",
          requiredCompetencies: [...additions.competencies],
          requiredGateIds: [...additions.gateIds],
          requiredDomainPackIds: [...additions.domainPackIds]
        }
      ]
    }
  };
  return deepFreeze(result);
}
