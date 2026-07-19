import { DELIVERY_REQUEST_AUTHORIZED_ACTIONS } from "./contracts.mjs";

const RISK_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);
const RISK_SET = new Set(RISK_LEVELS);
const ACTION_SET = new Set(DELIVERY_REQUEST_AUTHORIZED_ACTIONS);
const INPUT_FIELDS = new Set([
  "effectiveRisk",
  "authorizedActions",
  "canonicalScopePaths",
  "changedPaths",
  "requiredGateIds"
]);
const DOCUMENT_ROOTS = new Set(["doc", "docs", "documentation"]);
const DOCUMENT_EXTENSIONS = new Set(["adoc", "asciidoc", "md", "mdx", "rst", "txt"]);
const DOCUMENT_METADATA_BASENAMES = new Set([
  "authors",
  "authors.md",
  "changelog",
  "changelog.md",
  "code_of_conduct.md",
  "contributing",
  "contributing.md",
  "license",
  "license.md",
  "migration.md",
  "notice",
  "notice.md",
  "readme",
  "readme.md",
  "security.md",
  "status.md",
  "support.md"
]);
const DOCUMENT_SAFE_ACTIONS = new Set([
  "repository-read",
  "scoped-local-write",
  "project-validation",
  "network-evidence-read"
]);
const HIGH_RISK_ACTIONS = new Set([
  "ci-change",
  "release-change",
  "deployment"
]);
const HIGH_RISK_GATE_TOKENS = new Set([
  "auth",
  "authentication",
  "authorization",
  "credential",
  "credentialed",
  "credentials",
  "deploy",
  "deployment",
  "destructive",
  "production",
  "protected",
  "release",
  "rollback",
  "security"
]);
const PROTECTED_EVIDENCE_GATE_TOKENS = new Set([
  "credential",
  "credentialed",
  "credentials",
  "protected",
  "production"
]);
const BEHAVIOR_GATE_TOKENS = new Set([
  "api",
  "browser",
  "build",
  "e2e",
  "integration",
  "migration",
  "runtime",
  "test",
  "tests",
  "typecheck"
]);

export const VALIDATION_LANES = Object.freeze([
  "documentation-only",
  "behavior-code",
  "high-risk-release"
]);

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalRepositoryPath(value) {
  if (typeof value !== "string" || value === "" || value.trim() !== value) return false;
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false;
  if (value.includes("\\") || value.startsWith("/") || value.endsWith("/")) return false;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return false;
  return value.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function validateUniqueStrings(value, field, { allowEmpty = false, path = false } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw new Error(`${field} must be ${allowEmpty ? "an array" : "a non-empty array"}`);
  }
  const seen = new Set();
  value.forEach((entry, index) => {
    if (typeof entry !== "string" || entry === "" || entry.trim() !== entry) {
      throw new Error(`${field}[${index}] must be a non-empty trimmed string`);
    }
    if (path && !isCanonicalRepositoryPath(entry)) {
      throw new Error(`${field}[${index}] must be a canonical repository-relative POSIX path`);
    }
    if (seen.has(entry)) throw new Error(`${field}[${index}] must be unique`);
    seen.add(entry);
  });
}

function validateInput(input) {
  if (!isPlainRecord(input)) {
    throw new Error("validation policy input must be a plain own-property record");
  }
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !INPUT_FIELDS.has(key)) {
      throw new Error(`validation policy input.${String(key)} is not allowed`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new Error(`validation policy input.${key} must be an own data property`);
    }
  }
  for (const field of INPUT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      throw new Error(`validation policy input.${field} is required`);
    }
  }
  if (!RISK_SET.has(input.effectiveRisk)) {
    throw new Error(`effectiveRisk must be one of: ${RISK_LEVELS.join(", ")}`);
  }
  validateUniqueStrings(input.authorizedActions, "authorizedActions");
  input.authorizedActions.forEach((action, index) => {
    if (!ACTION_SET.has(action)) {
      throw new Error(`authorizedActions[${index}] must be a DeliveryRequest v1 authorized action`);
    }
  });
  validateUniqueStrings(input.canonicalScopePaths, "canonicalScopePaths", { path: true });
  validateUniqueStrings(input.changedPaths, "changedPaths", { allowEmpty: true, path: true });
  validateUniqueStrings(input.requiredGateIds, "requiredGateIds", { allowEmpty: true });
}

function tokens(value) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean));
}

function containsToken(value, vocabulary) {
  const valueTokens = tokens(value);
  return [...vocabulary].some((token) => valueTokens.has(token));
}

function unambiguousDocumentationOrMetadataPath(relativePath) {
  const segments = relativePath.toLowerCase().split("/");
  const basename = segments.at(-1);
  const extension = basename.includes(".") ? basename.split(".").at(-1) : "";
  if (DOCUMENT_ROOTS.has(segments[0])) {
    return segments.length === 1
      || DOCUMENT_EXTENSIONS.has(extension)
      || DOCUMENT_METADATA_BASENAMES.has(basename);
  }
  if (segments.length === 1 && DOCUMENT_METADATA_BASENAMES.has(basename)) return true;
  return segments[0] === ".github"
    && basename.endsWith(".md")
    && (
      segments.includes("issue_template")
      || basename === "pull_request_template.md"
      || segments.includes("pull_request_template")
    );
}

function deriveEvidenceBoundary(input) {
  const protectedGate = [...input.requiredGateIds]
    .sort()
    .find((gateId) => containsToken(gateId, PROTECTED_EVIDENCE_GATE_TOKENS));
  if (protectedGate) {
    return {
      evidenceBoundary: "protected-credentialed",
      evidenceBoundaryRationale: [`protected-or-credentialed-gate:${protectedGate}`]
    };
  }

  if (input.authorizedActions.includes("network-evidence-read")) {
    return {
      evidenceBoundary: "public-linked-read-only",
      evidenceBoundaryRationale: ["authorized-action:network-evidence-read"]
    };
  }

  return {
    evidenceBoundary: "local-static",
    evidenceBoundaryRationale: ["no-linked-or-protected-evidence-required"]
  };
}

function deriveLane(input) {
  if (input.effectiveRisk === "high" || input.effectiveRisk === "critical") {
    return {
      validationLane: "high-risk-release",
      rationale: [`effective-risk:${input.effectiveRisk}`]
    };
  }

  const highRiskAction = [...input.authorizedActions]
    .sort()
    .find((action) => HIGH_RISK_ACTIONS.has(action));
  if (highRiskAction) {
    return {
      validationLane: "high-risk-release",
      rationale: [`mutating-or-release-action:${highRiskAction}`]
    };
  }

  const highRiskGate = [...input.requiredGateIds]
    .sort()
    .find((gateId) => containsToken(gateId, HIGH_RISK_GATE_TOKENS));
  if (highRiskGate) {
    return {
      validationLane: "high-risk-release",
      rationale: [`credentialed-protected-security-or-release-gate:${highRiskGate}`]
    };
  }

  if (input.effectiveRisk === "medium") {
    return { validationLane: "behavior-code", rationale: ["effective-risk:medium"] };
  }

  const behaviorAction = [...input.authorizedActions]
    .sort()
    .find((action) => !DOCUMENT_SAFE_ACTIONS.has(action));
  if (behaviorAction) {
    return {
      validationLane: "behavior-code",
      rationale: [`behavior-action:${behaviorAction}`]
    };
  }

  const behaviorGate = [...input.requiredGateIds]
    .sort()
    .find((gateId) => containsToken(gateId, BEHAVIOR_GATE_TOKENS));
  if (behaviorGate) {
    return {
      validationLane: "behavior-code",
      rationale: [`behavior-gate:${behaviorGate}`]
    };
  }

  const paths = [...new Set([...input.canonicalScopePaths, ...input.changedPaths])].sort();
  const behaviorOrAmbiguousPath = paths.find(
    (relativePath) => !unambiguousDocumentationOrMetadataPath(relativePath)
  );
  if (behaviorOrAmbiguousPath) {
    return {
      validationLane: "behavior-code",
      rationale: [`behavior-or-ambiguous-path:${behaviorOrAmbiguousPath}`]
    };
  }

  return {
    validationLane: "documentation-only",
    rationale: ["unambiguous-documentation-or-metadata-paths"]
  };
}

export function deriveValidationPolicy(input) {
  validateInput(input);
  const derived = deriveLane(input);
  const evidenceBoundary = deriveEvidenceBoundary(input);
  return deepFreeze({
    schemaVersion: "1.0.0",
    ...derived,
    ...evidenceBoundary,
    provenance: {
      classification: "policy-derived",
      policy: "proportional-validation-policy-v1",
      callerOverrideAllowed: false
    }
  });
}
