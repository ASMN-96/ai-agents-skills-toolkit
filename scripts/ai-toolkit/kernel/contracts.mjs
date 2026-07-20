const SCHEMA_VERSION = "1.0.0";

const RISKS = new Set(["low", "medium", "high", "critical"]);
const CONTEXT_MODES = new Set(["concise", "standard", "detailed"]);
const PLATFORM_IDS = new Set([
  "web-saas",
  "ios",
  "android",
  "windows-desktop",
  "macos-desktop"
]);
const DEPRECATED_PLATFORM_ALIASES = new Set(["cross-platform-desktop"]);
const FRAMEWORK_OVERLAY_IDS = new Set([
  "expo-react-native",
  "electron",
  "tauri"
]);
const AUTHORIZED_ACTION_VALUES = new Set([
  "repository-read",
  "scoped-local-write",
  "project-validation",
  "network-evidence-read",
  "dependency-restore",
  "ci-change",
  "release-change",
  "deployment"
]);
const RESOURCE_TYPES = new Set(["agent", "skill", "tool"]);
const RESOURCE_ROLES = new Set(["lead", "specialist", "verifier", "support"]);
const RUNTIME_SANDBOX_MODES = new Set(["read-only", "workspace-write", "not-applicable"]);
const AUTHORITIES = new Set([
  "official-standard",
  "vendor-official",
  "internal-reviewed",
  "community-reviewed"
]);
const LIFECYCLES = new Set(["active", "experimental", "retired", "quarantined", "stale"]);
const DETECTION_STATES = new Set([
  "registry-recorded",
  "syntax-only",
  "observed",
  "absent",
  "invalid"
]);
const FRESHNESS_STATES = new Set([
  "current",
  "stale",
  "quarantined",
  "not-applicable",
  "absent",
  "invalid"
]);
const DOMAIN_GATE_VERIFIER_KIND_VALUES = new Set([
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
const DOMAIN_GATE_EVIDENCE_TYPE_VALUES = new Set([
  "repository-fact",
  "observed-command-receipt",
  "observed-verification-receipt",
  "observed-artifact",
  "review-receipt"
]);
const DOMAIN_GATE_BLOCKING_STAGE_VALUES = new Set([
  "verified-for-review",
  "verified-for-release"
]);
const GATE_ID_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const NATIVE_ADAPTER_KINDS = Object.freeze({
  agent: new Set(["codex-agent"]),
  skill: new Set(["codex-skill"]),
  tool: new Set(["project-script", "external-tool"])
});
const RESOURCE_FIELDS = new Set([
  "schemaVersion",
  "id",
  "type",
  "canonicalCompetencies",
  "eligibleRoles",
  "targetAffinity",
  "verificationCapabilities",
  "measuredContextCost",
  "contextCostUnit",
  "contextMeasurement",
  "authority",
  "lifecycle",
  "runtimePosture",
  "environmentRestrictions",
  "detectionEvidence",
  "freshness",
  "nativeAdapter",
  "commandReference",
  "eligibility"
]);
const LEGACY_CALLER_FIELDS = [
  "detectedTools",
  "projectCommands",
  "requiredEvidence",
  "resourceLifecycle",
  "freshness"
];

export const DELIVERY_REQUEST_SCHEMA_VERSION = SCHEMA_VERSION;
export const RESOURCE_CONTRACT_SCHEMA_VERSION = SCHEMA_VERSION;
export const DELIVERY_REQUEST_AUTHORIZED_ACTIONS = Object.freeze([...AUTHORIZED_ACTION_VALUES]);
export const DELIVERY_REQUEST_PLATFORM_IDS = Object.freeze([...PLATFORM_IDS]);
export const DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS = Object.freeze([...FRAMEWORK_OVERLAY_IDS]);
export const DOMAIN_GATE_VERIFIER_KINDS = Object.freeze([...DOMAIN_GATE_VERIFIER_KIND_VALUES]);
export const DOMAIN_GATE_EVIDENCE_TYPES = Object.freeze([...DOMAIN_GATE_EVIDENCE_TYPE_VALUES]);
export const DOMAIN_GATE_BLOCKING_STAGES = Object.freeze([...DOMAIN_GATE_BLOCKING_STAGE_VALUES]);
export const DELIVERY_REQUEST_V1_MIGRATION_MESSAGE =
  "DeliveryRequest v1 migration required: set schemaVersion to \"1.0.0\", wrap the previous flat task fields under \"task\", move repositoryRoot/repositoryCommit under \"repository\" as root/expectedCommit, and move modelContextTokens under \"contextPolicy\" as modelWindowTokens.";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isPlainRecord(value) {
  if (!isObject(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, field) {
  return isObject(value) && Object.prototype.hasOwnProperty.call(value, field);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function clonedFrozen(value) {
  return deepFreeze(structuredClone(value));
}

function requiredString(value, field, issues) {
  if (typeof value !== "string" || value.trim() === "") {
    issues.push(`${field} must be a non-empty string`);
  }
}

function stringArray(value, field, issues, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    issues.push(`${field} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) issues.push(`${field} must not be empty`);
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim() === "") {
      issues.push(`${field}[${index}] must be a non-empty string`);
    }
  });
  return value;
}

function uniqueStrings(value, field, issues, options) {
  const values = stringArray(value, field, issues, options);
  const seen = new Set();
  values.forEach((item, index) => {
    if (typeof item !== "string") return;
    if (seen.has(item)) issues.push(`${field}[${index}] must be unique`);
    seen.add(item);
  });
  return values;
}

function rejectUnknownFields(value, allowed, field, issues) {
  if (!isPlainRecord(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) issues.push(`${field}.${key} is not allowed by the v1 contract`);
  }
}

function requirePlainRecord(value, field, issues) {
  if (isPlainRecord(value)) return true;
  issues.push(`${field} must be a plain own-property record`);
  return false;
}

function validateGateId(value, field, issues) {
  if (typeof value === "string" && !GATE_ID_PATTERN.test(value)) {
    issues.push(`${field} must be a stable lowercase kebab-case gate ID`);
  }
}

function validateClosedValues(values, allowed, field, issues) {
  values.forEach((value, index) => {
    if (typeof value === "string" && !allowed.has(value)) {
      issues.push(`${field}[${index}] must use a value from the closed enum: ${value}`);
    }
  });
}

export function assertDomainGate(gate) {
  if (!isPlainRecord(gate)) {
    throw new Error("invalid DomainGate v1: gate must be a plain own-property record");
  }
  const issues = [];
  rejectUnknownFields(
    gate,
    new Set([
      "schemaVersion",
      "id",
      "applicability",
      "requiredCompetencies",
      "environmentRequirements",
      "verifierKinds",
      "evidenceType",
      "blockingStage",
      "authoritativeSourceRefs"
    ]),
    "domainGate",
    issues
  );
  if (gate.schemaVersion !== SCHEMA_VERSION) {
    issues.push(`schemaVersion is required and must be exactly ${SCHEMA_VERSION}`);
  }
  requiredString(gate.id, "id", issues);
  validateGateId(gate.id, "id", issues);

  if (requirePlainRecord(gate.applicability, "applicability", issues)) {
    rejectUnknownFields(
      gate.applicability,
      new Set(["platformIds", "frameworkOverlayIds", "scenarioIds", "riskLevels"]),
      "applicability",
      issues
    );
    const platformIds = uniqueStrings(
      gate.applicability.platformIds,
      "applicability.platformIds",
      issues,
      { allowEmpty: true }
    );
    platformIds.forEach((platform, index) => {
      if (typeof platform === "string" && !PLATFORM_IDS.has(platform)) {
        issues.push(`applicability.platformIds[${index}] has unknown platform: ${platform}`);
      }
    });
    const overlayIds = uniqueStrings(
      gate.applicability.frameworkOverlayIds,
      "applicability.frameworkOverlayIds",
      issues,
      { allowEmpty: true }
    );
    overlayIds.forEach((overlay, index) => {
      if (typeof overlay === "string" && !FRAMEWORK_OVERLAY_IDS.has(overlay)) {
        issues.push(`applicability.frameworkOverlayIds[${index}] has unknown framework overlay: ${overlay}`);
      }
    });
    const scenarioIds = uniqueStrings(
      gate.applicability.scenarioIds,
      "applicability.scenarioIds",
      issues,
      { allowEmpty: true }
    );
    scenarioIds.forEach((scenario, index) => validateGateId(
      scenario,
      `applicability.scenarioIds[${index}]`,
      issues
    ));
    const riskLevels = uniqueStrings(
      gate.applicability.riskLevels,
      "applicability.riskLevels",
      issues,
      { allowEmpty: true }
    );
    validateClosedValues(riskLevels, RISKS, "applicability.riskLevels", issues);
    if (
      platformIds.length === 0
      && overlayIds.length === 0
      && scenarioIds.length === 0
      && riskLevels.length === 0
    ) {
      issues.push("applicability must declare at least one explicit platform, overlay, scenario, or risk selector");
    }
  }

  const competencies = uniqueStrings(
    gate.requiredCompetencies,
    "requiredCompetencies",
    issues
  );
  competencies.forEach((competency, index) => validateGateId(
    competency,
    `requiredCompetencies[${index}]`,
    issues
  ));

  if (requirePlainRecord(gate.environmentRequirements, "environmentRequirements", issues)) {
    rejectUnknownFields(
      gate.environmentRequirements,
      new Set(["allOf", "anyOf"]),
      "environmentRequirements",
      issues
    );
    uniqueStrings(
      gate.environmentRequirements.allOf,
      "environmentRequirements.allOf",
      issues,
      { allowEmpty: true }
    );
    uniqueStrings(
      gate.environmentRequirements.anyOf,
      "environmentRequirements.anyOf",
      issues,
      { allowEmpty: true }
    );
  }

  const verifierKinds = uniqueStrings(gate.verifierKinds, "verifierKinds", issues);
  validateClosedValues(verifierKinds, DOMAIN_GATE_VERIFIER_KIND_VALUES, "verifierKinds", issues);
  if (verifierKinds.length > 1) {
    issues.push("verifierKinds must contain exactly one verifier kind; mandatory evidence dimensions require atomic gate IDs");
  }
  if (!DOMAIN_GATE_EVIDENCE_TYPE_VALUES.has(gate.evidenceType)) {
    issues.push(`evidenceType must use a value from the closed enum: ${gate.evidenceType}`);
  }
  if (!DOMAIN_GATE_BLOCKING_STAGE_VALUES.has(gate.blockingStage)) {
    issues.push(`blockingStage must use a value from the closed enum: ${gate.blockingStage}`);
  }

  if (!Array.isArray(gate.authoritativeSourceRefs)) {
    issues.push("authoritativeSourceRefs must be an array");
  } else if (gate.authoritativeSourceRefs.length === 0) {
    issues.push("authoritativeSourceRefs must not be empty");
  } else {
    gate.authoritativeSourceRefs.forEach((sourceRef, index) => {
      const field = `authoritativeSourceRefs[${index}]`;
      if (!requirePlainRecord(sourceRef, field, issues)) return;
      rejectUnknownFields(sourceRef, new Set(["sourceId", "locator"]), field, issues);
      requiredString(sourceRef.sourceId, `${field}.sourceId`, issues);
      validateGateId(sourceRef.sourceId, `${field}.sourceId`, issues);
      requiredString(sourceRef.locator, `${field}.locator`, issues);
    });
  }

  if (issues.length > 0) throw new Error(`invalid DomainGate v1: ${issues.join("; ")}`);
  return clonedFrozen(gate);
}

function registeredPolicyGateIds(options, issues) {
  const supplied = options?.policyGateIds ?? [];
  const values = supplied instanceof Set ? [...supplied] : supplied;
  if (!Array.isArray(values)) {
    issues.push("policyGateIds must be an array or set");
    return [];
  }
  const gates = uniqueStrings(values, "policyGateIds", issues, { allowEmpty: true });
  gates.forEach((gate, index) => validateGateId(gate, `policyGateIds[${index}]`, issues));
  return gates;
}

function scenarioIds(options) {
  const supplied = options?.registeredScenarios;
  if (supplied instanceof Set) return new Set([...supplied].map(String));
  if (Array.isArray(supplied)) {
    return new Set(supplied.map((entry) => typeof entry === "string" ? entry : entry?.scenario).filter(Boolean));
  }
  if (Array.isArray(options?.routingMatrix?.scenarios)) {
    return new Set(options.routingMatrix.scenarios.map((entry) => entry?.scenario).filter(Boolean));
  }
  return new Set();
}

function isLegacyPrototype(value) {
  if (!isPlainRecord(value) || hasOwn(value, "schemaVersion") || hasOwn(value, "task")) {
    return false;
  }
  const legacyFields = new Set([
    "id",
    "goal",
    "platform",
    "risk",
    "targets",
    "repositoryRoot",
    "repositoryCommit",
    "modelContextTokens",
    "contextItems",
    "detectedTools",
    "projectCommands",
    "requiredEvidence",
    "requiredCompetencies"
  ]);
  const requiredLegacyFields = [
    "id",
    "goal",
    "platform",
    "detectedTools",
    "projectCommands",
    "requiredEvidence"
  ];
  return requiredLegacyFields.every((field) => hasOwn(value, field))
    && Object.keys(value).every((field) => legacyFields.has(field));
}

function isCanonicalRepositoryPath(value, { allowRoot = true } = {}) {
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
  if (value === ".") return allowRoot;
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function validateSha256(value, field, issues) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    issues.push(`${field} must be a lowercase sha256 digest`);
    return false;
  }
  return true;
}

function validateEvidence(value, field, states, currentState, issues) {
  if (!requirePlainRecord(value, field, issues)) return false;
  rejectUnknownFields(value, new Set(["state", "evidencePath", "contentDigest"]), field, issues);
  if (!states.has(value.state)) {
    issues.push(`${field}.state must be one of: ${[...states].join(", ")}`);
  }
  const hasPath = typeof value.evidencePath === "string";
  const hasDigest = typeof value.contentDigest === "string";
  const bothNull = value.evidencePath === null && value.contentDigest === null;
  if (!bothNull && (!hasPath || !hasDigest)) {
    issues.push(`${field}.evidencePath and ${field}.contentDigest must both be null or both be present`);
  }
  if (hasPath && !isCanonicalRepositoryPath(value.evidencePath, { allowRoot: false })) {
    issues.push(`${field}.evidencePath must be a canonical POSIX repository-relative path`);
  }
  const digestValid = hasDigest
    ? validateSha256(value.contentDigest, `${field}.contentDigest`, issues)
    : false;
  if (value.state === currentState && (!hasPath || !digestValid)) {
    issues.push(`${field}.${currentState} requires evidencePath and contentDigest`);
  }
  if (value.state === "absent" && !bothNull) {
    issues.push(`${field}.absent requires null evidencePath and contentDigest`);
  }
  return value.state === currentState && hasPath && digestValid;
}

function validateDeliveryRequest(
  request,
  options = {},
  { deferCriterionGateMembership = false } = {}
) {
  if (!isPlainRecord(request)) {
    throw new Error("invalid DeliveryRequest v1: request must be a plain own-property record");
  }
  if (isLegacyPrototype(request)) throw new Error(DELIVERY_REQUEST_V1_MIGRATION_MESSAGE);
  if (!hasOwn(request, "schemaVersion") || request.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `invalid DeliveryRequest v1: schemaVersion is required and must be exactly ${SCHEMA_VERSION}`
    );
  }

  const issues = [];
  const policyGates = registeredPolicyGateIds(options, issues);

  for (const field of LEGACY_CALLER_FIELDS) {
    if (hasOwn(request, field)) {
      issues.push(`${field} is caller-controlled and forbidden; inject validated catalog evidence instead`);
    }
    if (hasOwn(request.task, field)) {
      issues.push(`task.${field} is caller-controlled and forbidden; derive gates and catalog state from canonical policy instead`);
    }
  }

  rejectUnknownFields(
    request,
    new Set(["schemaVersion", "task", "repository", "contextPolicy"]),
    "request",
    issues
  );

  const task = request.task;
  if (requirePlainRecord(task, "task", issues)) {
    rejectUnknownFields(
      task,
      new Set([
        "id",
        "goal",
        "scenario",
        "scope",
        "exclusions",
        "constraints",
        "risk",
        "targets",
        "authorizedActions",
        "acceptanceCriteria",
        "competencies",
        "gates"
      ]),
      "task",
      issues
    );
    requiredString(task.id, "task.id", issues);
    requiredString(task.goal, "task.goal", issues);
    requiredString(task.scenario, "task.scenario", issues);
    if (typeof task.scenario === "string" && !scenarioIds(options).has(task.scenario)) {
      issues.push(`task.scenario is not registered: ${task.scenario}`);
    }
    uniqueStrings(task.scope, "task.scope", issues);
    uniqueStrings(task.exclusions, "task.exclusions", issues, { allowEmpty: true });
    uniqueStrings(task.constraints, "task.constraints", issues, { allowEmpty: true });
    if (!RISKS.has(task.risk)) issues.push(`task.risk must be one of: ${[...RISKS].join(", ")}`);
    const taskGates = task.gates === undefined
      ? []
      : uniqueStrings(task.gates, "task.gates", issues, { allowEmpty: true });
    taskGates.forEach((gate, index) => validateGateId(gate, `task.gates[${index}]`, issues));
    const resolvedGateIds = new Set([...policyGates, ...taskGates]);

    if (requirePlainRecord(task.targets, "task.targets", issues)) {
      rejectUnknownFields(task.targets, new Set(["platforms", "frameworkOverlays"]), "task.targets", issues);
      const platforms = uniqueStrings(
        task.targets.platforms,
        "task.targets.platforms",
        issues,
        { allowEmpty: true }
      );
      platforms.forEach((platform, index) => {
        if (
          typeof platform === "string"
          && !PLATFORM_IDS.has(platform)
          && !DEPRECATED_PLATFORM_ALIASES.has(platform)
        ) {
          issues.push(`task.targets.platforms[${index}] has unknown platform: ${platform}`);
        }
      });
      if (
        platforms.includes("cross-platform-desktop")
        && !platforms.some((platform) => platform === "windows-desktop" || platform === "macos-desktop")
      ) {
        issues.push(
          "cross-platform-desktop is deprecated and requires at least one explicit OS target: windows-desktop or macos-desktop"
        );
      }
      const overlays = uniqueStrings(
        task.targets.frameworkOverlays ?? [],
        "task.targets.frameworkOverlays",
        issues,
        { allowEmpty: true }
      );
      overlays.forEach((overlay, index) => {
        if (typeof overlay === "string" && !FRAMEWORK_OVERLAY_IDS.has(overlay)) {
          issues.push(`task.targets.frameworkOverlays[${index}] has unknown framework overlay: ${overlay}`);
        }
      });
    }

    const actions = uniqueStrings(task.authorizedActions, "task.authorizedActions", issues);
    actions.forEach((action, index) => {
      if (typeof action === "string" && !AUTHORIZED_ACTION_VALUES.has(action)) {
        issues.push(`task.authorizedActions[${index}] must be a value from the closed enum: ${action}`);
      }
    });

    if (!Array.isArray(task.acceptanceCriteria) || task.acceptanceCriteria.length === 0) {
      issues.push("task.acceptanceCriteria must be a non-empty array");
    } else {
      const criterionIds = new Set();
      task.acceptanceCriteria.forEach((criterion, index) => {
        const field = `task.acceptanceCriteria[${index}]`;
        if (!requirePlainRecord(criterion, field, issues)) return;
        rejectUnknownFields(criterion, new Set(["id", "statement", "requiredGateIds"]), field, issues);
        requiredString(criterion.id, `${field}.id`, issues);
        if (typeof criterion.id === "string") {
          if (criterionIds.has(criterion.id)) issues.push(`${field}.id must be unique`);
          criterionIds.add(criterion.id);
        }
        requiredString(criterion.statement, `${field}.statement`, issues);
        const criterionGates = uniqueStrings(
          criterion.requiredGateIds,
          `${field}.requiredGateIds`,
          issues
        );
        criterionGates.forEach((gate, gateIndex) => {
          const gateField = `${field}.requiredGateIds[${gateIndex}]`;
          validateGateId(gate, gateField, issues);
          if (
            !deferCriterionGateMembership
            && typeof gate === "string"
            && GATE_ID_PATTERN.test(gate)
            && !resolvedGateIds.has(gate)
          ) {
            issues.push(`${gateField} is not registered by policy or task gates: ${gate}`);
          }
        });
      });
    }
    if (task.competencies !== undefined) {
      uniqueStrings(task.competencies, "task.competencies", issues, { allowEmpty: true });
    }
  }

  const repository = request.repository;
  if (requirePlainRecord(repository, "repository", issues)) {
    rejectUnknownFields(repository, new Set(["root", "expectedCommit"]), "repository", issues);
    if (!isCanonicalRepositoryPath(repository.root)) {
      issues.push("repository.root must be a canonical POSIX repository-relative path");
    }
    if (typeof repository.expectedCommit !== "string" || !/^[0-9a-f]{40}$/.test(repository.expectedCommit)) {
      issues.push("repository.expectedCommit must be an exact lowercase 40-character hexadecimal commit");
    }
  }

  const contextPolicy = request.contextPolicy;
  if (requirePlainRecord(contextPolicy, "contextPolicy", issues)) {
    rejectUnknownFields(
      contextPolicy,
      new Set(["mode", "modelWindowTokens", "maxInputFraction"]),
      "contextPolicy",
      issues
    );
    if (!CONTEXT_MODES.has(contextPolicy.mode)) {
      issues.push(`contextPolicy.mode must be one of: ${[...CONTEXT_MODES].join(", ")}`);
    }
    if (!Number.isInteger(contextPolicy.modelWindowTokens) || contextPolicy.modelWindowTokens < 2) {
      issues.push("contextPolicy.modelWindowTokens must be an integer of at least 2");
    }
    if (
      contextPolicy.maxInputFraction !== undefined
      && (
        typeof contextPolicy.maxInputFraction !== "number"
        || !Number.isFinite(contextPolicy.maxInputFraction)
        || contextPolicy.maxInputFraction <= 0
        || contextPolicy.maxInputFraction > 0.35
      )
    ) {
      issues.push("contextPolicy.maxInputFraction must be greater than 0 and no greater than 0.35");
    }
  }

  if (issues.length > 0) throw new Error(`invalid DeliveryRequest v1: ${issues.join("; ")}`);
  return clonedFrozen(request);
}

export function assertDeliveryRequestPreflight(request, options = {}) {
  return validateDeliveryRequest(request, options, { deferCriterionGateMembership: true });
}

export function assertDeliveryRequest(request, options = {}) {
  return validateDeliveryRequest(request, options);
}

export function assertResourceContract(resource) {
  const issues = [];
  if (!isPlainRecord(resource)) {
    throw new Error("invalid ResourceContract v1: resource must be a plain own-property record");
  }
  rejectUnknownFields(resource, RESOURCE_FIELDS, "resource", issues);
  if (hasOwn(resource, "command")) {
    issues.push("raw command strings are forbidden; use a structured commandReference");
  }
  if (resource.schemaVersion !== SCHEMA_VERSION) issues.push(`schemaVersion must be exactly ${SCHEMA_VERSION}`);
  requiredString(resource.id, "id", issues);
  if (!RESOURCE_TYPES.has(resource.type)) issues.push(`type must be one of: ${[...RESOURCE_TYPES].join(", ")}`);
  uniqueStrings(resource.canonicalCompetencies, "canonicalCompetencies", issues);
  const roles = uniqueStrings(resource.eligibleRoles, "eligibleRoles", issues);
  roles.forEach((role, index) => {
    if (typeof role === "string" && !RESOURCE_ROLES.has(role)) {
      issues.push(`eligibleRoles[${index}] is unknown: ${role}`);
    }
  });
  if (resource.targetAffinity !== undefined) {
    if (requirePlainRecord(resource.targetAffinity, "targetAffinity", issues)) {
      rejectUnknownFields(
        resource.targetAffinity,
        new Set(["platforms", "frameworkOverlays"]),
        "targetAffinity",
        issues
      );
      const affinityPlatforms = uniqueStrings(
        resource.targetAffinity.platforms,
        "targetAffinity.platforms",
        issues,
        { allowEmpty: true }
      );
      affinityPlatforms.forEach((platform, index) => {
        if (typeof platform === "string" && !PLATFORM_IDS.has(platform)) {
          issues.push(`targetAffinity.platforms[${index}] has unknown platform: ${platform}`);
        }
      });
      const affinityOverlays = uniqueStrings(
        resource.targetAffinity.frameworkOverlays,
        "targetAffinity.frameworkOverlays",
        issues,
        { allowEmpty: true }
      );
      affinityOverlays.forEach((overlay, index) => {
        if (typeof overlay === "string" && !FRAMEWORK_OVERLAY_IDS.has(overlay)) {
          issues.push(`targetAffinity.frameworkOverlays[${index}] has unknown framework overlay: ${overlay}`);
        }
      });
    }
    if (resource.type !== "agent") {
      issues.push("targetAffinity is supported only for agent resources");
    }
  }
  const verificationCapabilities = resource.verificationCapabilities === undefined
    ? []
    : uniqueStrings(
      resource.verificationCapabilities,
      "verificationCapabilities",
      issues,
      { allowEmpty: true }
    );
  validateClosedValues(
    verificationCapabilities,
    DOMAIN_GATE_VERIFIER_KIND_VALUES,
    "verificationCapabilities",
    issues
  );
  if (
    verificationCapabilities.length > 0
    && resource.type !== "agent"
  ) {
    issues.push("verificationCapabilities are supported only for agent resources");
  }
  if (
    verificationCapabilities.length > 0
    && !roles.some((role) => role === "specialist" || role === "verifier")
  ) {
    issues.push("verificationCapabilities require specialist or verifier role eligibility");
  }
  if (!Number.isInteger(resource.measuredContextCost) || resource.measuredContextCost < 0) {
    issues.push("measuredContextCost must be a non-negative integer");
  }
  if (resource.contextCostUnit !== "tokens") issues.push('contextCostUnit must be "tokens"');
  if (resource.contextMeasurement === null) {
    if (resource.measuredContextCost !== 0) {
      issues.push("measuredContextCost must be 0 when contextMeasurement is null");
    }
  } else if (requirePlainRecord(resource.contextMeasurement, "contextMeasurement", issues)) {
    rejectUnknownFields(
      resource.contextMeasurement,
      new Set(["method", "utf8Bytes", "evidencePath", "contentDigest"]),
      "contextMeasurement",
      issues
    );
    if (resource.contextMeasurement.method !== "conservative-token-estimate") {
      issues.push('contextMeasurement.method must be "conservative-token-estimate"');
    }
    if (
      !Number.isInteger(resource.contextMeasurement.utf8Bytes)
      || resource.contextMeasurement.utf8Bytes < 0
    ) {
      issues.push("contextMeasurement.utf8Bytes must be a non-negative integer");
    }
    if (!isCanonicalRepositoryPath(resource.contextMeasurement.evidencePath, { allowRoot: false })) {
      issues.push("contextMeasurement.evidencePath must be a canonical POSIX repository-relative path");
    }
    validateSha256(
      resource.contextMeasurement.contentDigest,
      "contextMeasurement.contentDigest",
      issues
    );
    if (
      Number.isInteger(resource.contextMeasurement.utf8Bytes)
      && resource.measuredContextCost !== Math.ceil(resource.contextMeasurement.utf8Bytes / 3)
    ) {
      issues.push("measuredContextCost must equal ceil(contextMeasurement.utf8Bytes / 3)");
    }
  }
  if (!AUTHORITIES.has(resource.authority)) {
    issues.push(`authority must be one of: ${[...AUTHORITIES].join(", ")}`);
  }
  if (!LIFECYCLES.has(resource.lifecycle)) {
    issues.push(`lifecycle must be one of: ${[...LIFECYCLES].join(", ")}`);
  }

  if (requirePlainRecord(resource.runtimePosture, "runtimePosture", issues)) {
    rejectUnknownFields(
      resource.runtimePosture,
      new Set([
        "registryPresent",
        "available",
        "supported",
        "executionProof",
        "sandboxMode",
        "scopedLocalWrite"
      ]),
      "runtimePosture",
      issues
    );
    for (const field of ["registryPresent", "available", "supported", "executionProof"]) {
      if (typeof resource.runtimePosture[field] !== "boolean") {
        issues.push(`runtimePosture.${field} must be a boolean`);
      }
    }
    if (!RUNTIME_SANDBOX_MODES.has(resource.runtimePosture.sandboxMode)) {
      issues.push(
        `runtimePosture.sandboxMode must be one of: ${[...RUNTIME_SANDBOX_MODES].join(", ")}`
      );
    }
    if (typeof resource.runtimePosture.scopedLocalWrite !== "boolean") {
      issues.push("runtimePosture.scopedLocalWrite must be a boolean");
    }
    if (
      resource.type === "agent"
      && resource.runtimePosture.sandboxMode === "not-applicable"
    ) {
      issues.push("agent runtimePosture.sandboxMode cannot be not-applicable");
    }
    if (
      (resource.type === "skill" || resource.type === "tool")
      && resource.runtimePosture.sandboxMode !== "not-applicable"
    ) {
      issues.push(`${resource.type} runtimePosture.sandboxMode must be not-applicable`);
    }
    const expectedScopedLocalWrite = resource.type === "agent"
      && resource.runtimePosture.sandboxMode === "workspace-write";
    if (
      typeof resource.runtimePosture.scopedLocalWrite === "boolean"
      && RUNTIME_SANDBOX_MODES.has(resource.runtimePosture.sandboxMode)
      && resource.runtimePosture.scopedLocalWrite !== expectedScopedLocalWrite
    ) {
      issues.push(
        "runtimePosture.scopedLocalWrite must be true exactly when an agent sandboxMode is workspace-write"
      );
    }
  }

  if (requirePlainRecord(resource.environmentRestrictions, "environmentRestrictions", issues)) {
    rejectUnknownFields(
      resource.environmentRestrictions,
      new Set(["allowed", "forbidden"]),
      "environmentRestrictions",
      issues
    );
    const allowed = uniqueStrings(
      resource.environmentRestrictions.allowed,
      "environmentRestrictions.allowed",
      issues,
      { allowEmpty: true }
    );
    const forbidden = uniqueStrings(
      resource.environmentRestrictions.forbidden,
      "environmentRestrictions.forbidden",
      issues,
      { allowEmpty: true }
    );
    const forbiddenSet = new Set(forbidden);
    allowed.forEach((environment, index) => {
      if (forbiddenSet.has(environment)) {
        issues.push(`environmentRestrictions.allowed[${index}] cannot also be forbidden`);
      }
    });
  }

  const detectionCurrent = validateEvidence(
    resource.detectionEvidence,
    "detectionEvidence",
    DETECTION_STATES,
    "observed",
    issues
  );
  const freshnessCurrent = validateEvidence(
    resource.freshness,
    "freshness",
    FRESHNESS_STATES,
    "current",
    issues
  );

  if (requirePlainRecord(resource.nativeAdapter, "nativeAdapter", issues)) {
    rejectUnknownFields(resource.nativeAdapter, new Set(["kind", "id"]), "nativeAdapter", issues);
    requiredString(resource.nativeAdapter.kind, "nativeAdapter.kind", issues);
    requiredString(resource.nativeAdapter.id, "nativeAdapter.id", issues);
    if (
      RESOURCE_TYPES.has(resource.type)
      && !NATIVE_ADAPTER_KINDS[resource.type].has(resource.nativeAdapter.kind)
    ) {
      issues.push(`nativeAdapter.kind is not valid for resource type ${resource.type}`);
    }
  }
  let validCommandReference = false;
  if (resource.commandReference !== null) {
    if (!isPlainRecord(resource.commandReference)) {
      issues.push("commandReference must be null or a structured project-script reference");
    } else {
      rejectUnknownFields(
        resource.commandReference,
        new Set(["kind", "manifestPath", "scriptName", "digest"]),
        "commandReference",
        issues
      );
      if (resource.commandReference.kind !== "project-script") {
        issues.push('commandReference.kind must be "project-script"');
      }
      if (!isCanonicalRepositoryPath(resource.commandReference.manifestPath, { allowRoot: false })) {
        issues.push("commandReference.manifestPath must be a canonical POSIX repository-relative path");
      }
      if (
        typeof resource.commandReference.scriptName !== "string"
        || !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(resource.commandReference.scriptName)
      ) {
        issues.push("commandReference.scriptName must be a stable package-script name");
      }
      const digestValid = validateSha256(
        resource.commandReference.digest,
        "commandReference.digest",
        issues
      );
      validCommandReference = resource.commandReference.kind === "project-script"
        && isCanonicalRepositoryPath(resource.commandReference.manifestPath, { allowRoot: false })
        && typeof resource.commandReference.scriptName === "string"
        && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(resource.commandReference.scriptName)
        && digestValid;
    }
  }
  if (resource.type !== "tool" && resource.commandReference !== null) {
    issues.push("commandReference must be null for agent and skill resources");
  }

  let eligibilityReasons = [];
  if (requirePlainRecord(resource.eligibility, "eligibility", issues)) {
    rejectUnknownFields(resource.eligibility, new Set(["eligible", "reasons"]), "eligibility", issues);
    if (typeof resource.eligibility.eligible !== "boolean") issues.push("eligibility.eligible must be a boolean");
    eligibilityReasons = uniqueStrings(
      resource.eligibility.reasons,
      "eligibility.reasons",
      issues,
      { allowEmpty: resource.eligibility.eligible === true }
    );
    if (resource.eligibility.eligible === true && eligibilityReasons.length > 0) {
      issues.push("eligibility.reasons must be empty when eligible is true");
    }
    if (resource.eligibility.eligible === false && eligibilityReasons.length === 0) {
      issues.push("ineligible resources must provide at least one eligibility reason");
    }
  }

  if (resource.runtimePosture?.executionProof === true) {
    issues.push("runtimePosture.executionProof must remain false until execution receipts exist");
  }
  if (resource.runtimePosture?.available === true) {
    if (resource.runtimePosture.registryPresent !== true) {
      issues.push("runtime availability requires registry presence");
    }
    if (!detectionCurrent || !freshnessCurrent) {
      issues.push("runtime availability requires current structured detection and freshness evidence");
    }
  }
  if (resource.runtimePosture?.supported === true && resource.runtimePosture.available !== true) {
    issues.push("runtime support requires verified availability");
  }
  if (resource.eligibility?.eligible === true) {
    if (resource.lifecycle !== "active") issues.push("eligible resources must have active lifecycle");
    if (resource.runtimePosture?.registryPresent !== true) {
      issues.push("eligible resources require registry presence");
    }
    if (
      resource.runtimePosture?.available !== true
      || resource.runtimePosture?.supported !== true
    ) {
      issues.push("eligible resources require verified supported runtime capability");
    }
    if (!detectionCurrent || !freshnessCurrent) {
      issues.push("eligible resources require current structured detection and freshness evidence");
    }
    if (resource.contextMeasurement === null) {
      issues.push("eligible resources require measured context evidence");
    }
    if (resource.type === "tool" && !validCommandReference) {
      issues.push("eligible tool resources require a structured command reference");
    }
  }

  if (issues.length > 0) throw new Error(`invalid ResourceContract v1: ${issues.join("; ")}`);
  return clonedFrozen(resource);
}

export function assertTaskContract() {
  throw new Error(DELIVERY_REQUEST_V1_MIGRATION_MESSAGE);
}
