const RISK_ORDER = Object.freeze(["low", "medium", "high", "critical"]);
const AUTHORIZED_ACTIONS = Object.freeze([
  "repository-read",
  "scoped-local-write",
  "project-validation",
  "network-evidence-read",
  "dependency-restore",
  "ci-change",
  "release-change",
  "deployment"
]);

const RISK_INDEX = new Map(RISK_ORDER.map((risk, index) => [risk, index]));
const ACTION_SET = new Set(AUTHORIZED_ACTIONS);
const INPUT_FIELDS = new Set([
  "declaredRisk",
  "scenarioFloor",
  "authorizedActions",
  "canonicalScopePaths"
]);

const DOCUMENT_EXTENSIONS = new Set(["md", "mdx", "txt", "rst", "adoc", "asciidoc"]);
const DOCUMENT_ROOTS = new Set(["doc", "docs", "documentation"]);
const DOCUMENT_BASENAMES = new Set([
  "agents.md",
  "changelog.md",
  "code_of_conduct.md",
  "contributing.md",
  "license",
  "license.md",
  "migration.md",
  "readme",
  "readme.md",
  "security.md",
  "status.md"
]);
const SOURCE_ROOTS = new Set([
  ".agents",
  ".codex",
  ".github",
  "api",
  "app",
  "apps",
  "bin",
  "build",
  "ci",
  "config",
  "database",
  "db",
  "infra",
  "infrastructure",
  "install",
  "lib",
  "migrations",
  "packages",
  "scripts",
  "server",
  "src",
  "test",
  "tests"
]);
const SOURCE_EXTENSIONS = new Set([
  "c",
  "cc",
  "cjs",
  "cpp",
  "cs",
  "css",
  "go",
  "graphql",
  "gql",
  "h",
  "hpp",
  "html",
  "java",
  "js",
  "json",
  "jsx",
  "kt",
  "kts",
  "mjs",
  "php",
  "proto",
  "ps1",
  "py",
  "rb",
  "rs",
  "scss",
  "sh",
  "sql",
  "swift",
  "toml",
  "ts",
  "tsx",
  "vue",
  "xml",
  "yaml",
  "yml"
]);

const SECURITY_TOKENS = new Set([
  "auth",
  "authn",
  "authz",
  "authenticate",
  "authentication",
  "authorization",
  "authorize",
  "credential",
  "credentials",
  "keychain",
  "keystore",
  "oauth",
  "oidc",
  "permission",
  "permissions",
  "rls",
  "secret",
  "secrets",
  "security",
  "sso",
  "tenant",
  "tenancy",
  "tenants",
  "vault"
]);
const PUBLIC_INTEGRATION_TOKENS = new Set(["openapi", "webhook", "webhooks"]);
const MIGRATION_TOKENS = new Set(["migrate", "migration", "migrations", "migrator"]);
const PAYMENT_TOKENS = new Set([
  "billing",
  "checkout",
  "invoice",
  "invoices",
  "payment",
  "payments",
  "payout",
  "payouts"
]);
const PRIVACY_TOKENS = new Set([
  "confidential",
  "gdpr",
  "pdpl",
  "pii",
  "privacy"
]);
const STRONG_AI_TOKENS = new Set([
  "agent",
  "agents",
  "ai",
  "embedding",
  "embeddings",
  "llm",
  "mcp",
  "prompt",
  "prompts",
  "rag"
]);
const SUPPORTING_AI_TOKENS = new Set([
  "memory",
  "memories",
  "model",
  "models",
  "retrieval",
  "tool",
  "tooling",
  "tools"
]);
const PRODUCTION_TOKENS = new Set(["prod", "production"]);
const ACCESS_POLICY_TOKENS = new Set([
  "abac",
  "acl",
  "entitlement",
  "entitlements",
  "iam",
  "permission",
  "permissions",
  "privilege",
  "privileges",
  "rbac",
  "role",
  "roles"
]);
const ROTATION_TOKENS = new Set(["rekey", "renew", "rotate", "rotating", "rotation"]);
const CREDENTIAL_TOKENS = new Set([
  "cert",
  "certificate",
  "certificates",
  "certs",
  "credential",
  "credentials",
  "key",
  "keys",
  "secret",
  "secrets",
  "token",
  "tokens"
]);
const DESTRUCTIVE_TOKENS = new Set([
  "delete",
  "destroy",
  "destructive",
  "drop",
  "erase",
  "purge",
  "reset",
  "truncate",
  "wipe"
]);
const DATA_TOKENS = new Set([
  "data",
  "database",
  "db",
  "migration",
  "migrations",
  "record",
  "records",
  "schema",
  "sql",
  "table",
  "tables"
]);
const STATE_CHANGING_TOOL_TOKENS = new Set([
  "change",
  "command",
  "commit",
  "create",
  "delete",
  "deploy",
  "destroy",
  "drop",
  "exec",
  "execute",
  "install",
  "merge",
  "mutate",
  "mutation",
  "publish",
  "push",
  "remove",
  "run",
  "send",
  "shell",
  "truncate",
  "update",
  "upload",
  "wipe",
  "write"
]);

export const RISK_POLICY_LEVELS = RISK_ORDER;
export const RISK_POLICY_AUTHORIZED_ACTIONS = AUTHORIZED_ACTIONS;

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function hasAny(tokens, candidates) {
  for (const token of tokens) {
    if (candidates.has(token)) return true;
  }
  return false;
}

function compareStrings(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function maxRisk(...risks) {
  return risks.reduce((highest, risk) => (
    RISK_INDEX.get(risk) > RISK_INDEX.get(highest) ? risk : highest
  ), "low");
}

function validateRisk(value, field) {
  if (!RISK_INDEX.has(value)) {
    throw new Error(`${field} must be one of: ${RISK_ORDER.join(", ")}`);
  }
}

function validateStringEnumArray(value, field, allowed) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a non-empty array`);
  }
  const seen = new Set();
  value.forEach((item, index) => {
    if (typeof item !== "string" || !allowed.has(item)) {
      throw new Error(`${field}[${index}] must be one of: ${[...allowed].join(", ")}`);
    }
    if (seen.has(item)) throw new Error(`${field}[${index}] must be unique`);
    seen.add(item);
  });
}

function isCanonicalScopePath(value) {
  if (typeof value !== "string" || value === "" || value.trim() !== value) return false;
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false;
  if (value.includes("\\") || value.startsWith("/") || value.endsWith("/")) return false;
  if (/^[a-z][a-z0-9+.-]*:/iu.test(value)) return false;
  const segments = value.split("/");
  return segments.every((segment) => segment !== "" && segment !== "." && segment !== "..");
}

function validateScopePaths(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("canonicalScopePaths must be a non-empty array");
  }
  const seen = new Set();
  value.forEach((scopePath, index) => {
    if (!isCanonicalScopePath(scopePath)) {
      throw new Error(
        `canonicalScopePaths[${index}] must be a canonical repository-relative POSIX path`
      );
    }
    if (seen.has(scopePath)) throw new Error(`canonicalScopePaths[${index}] must be unique`);
    seen.add(scopePath);
  });
}

function validateInput(input) {
  if (!isPlainRecord(input)) {
    throw new Error("risk policy input must be a plain own-property record");
  }

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !INPUT_FIELDS.has(key)) {
      throw new Error(`risk policy input.${String(key)} is not allowed`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (!descriptor || !("value" in descriptor)) {
      throw new Error(`risk policy input.${key} must be an own data property`);
    }
  }
  for (const field of INPUT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) {
      throw new Error(`risk policy input.${field} is required`);
    }
  }

  validateRisk(input.declaredRisk, "declaredRisk");
  validateRisk(input.scenarioFloor, "scenarioFloor");
  validateStringEnumArray(input.authorizedActions, "authorizedActions", ACTION_SET);
  validateScopePaths(input.canonicalScopePaths);
}

function pathFacts(scopePath) {
  const lower = scopePath.toLowerCase();
  const segments = lower.split("/");
  const basename = segments.at(-1);
  const extension = basename.includes(".") ? basename.split(".").at(-1) : "";
  const tokens = new Set(lower.split(/[^a-z0-9]+/u).filter(Boolean));
  const documentation = DOCUMENT_ROOTS.has(segments[0])
    || DOCUMENT_EXTENSIONS.has(extension)
    || DOCUMENT_BASENAMES.has(basename);
  const sourceLike = !documentation && (
    SOURCE_ROOTS.has(segments[0])
    || SOURCE_EXTENSIONS.has(extension)
    || basename === "dockerfile"
    || basename.startsWith("package.")
  );
  const strongAi = hasAny(tokens, STRONG_AI_TOKENS);
  const supportingAiCount = [...SUPPORTING_AI_TOKENS]
    .reduce((count, token) => count + Number(tokens.has(token)), 0);

  return {
    documentation,
    sourceLike,
    tokens,
    extension,
    aiSystem: strongAi || supportingAiCount >= 2,
    aiTool: (tokens.has("tool") || tokens.has("tooling") || tokens.has("tools"))
      && (strongAi || supportingAiCount >= 2)
  };
}

function addReason(reasons, reason) {
  const key = `${reason.code}\u0000${reason.minimumRisk}\u0000${JSON.stringify(reason.evidence)}`;
  if (!reasons.has(key)) reasons.set(key, reason);
}

function scopePathReason(code, minimumRisk, path) {
  return { code, minimumRisk, evidence: { kind: "scope-path", path } };
}

function collectReasons(authorizedActions, canonicalScopePaths) {
  const reasons = new Map();
  const actions = new Set(authorizedActions);

  if (actions.has("deployment")) {
    addReason(reasons, {
      code: "deployment-action",
      minimumRisk: "critical",
      evidence: { kind: "authorized-action", action: "deployment" }
    });
  }
  for (const action of ["ci-change", "release-change"]) {
    if (!actions.has(action)) continue;
    addReason(reasons, {
      code: `${action}-action`,
      minimumRisk: "high",
      evidence: { kind: "authorized-action", action }
    });
  }

  for (const scopePath of canonicalScopePaths) {
    const facts = pathFacts(scopePath);
    if (facts.documentation) continue;

    if (actions.has("scoped-local-write") && facts.sourceLike) {
      addReason(reasons, {
        code: "source-code-write",
        minimumRisk: "medium",
        evidence: { kind: "scope-and-action", path: scopePath, action: "scoped-local-write" }
      });
    }

    if (hasAny(facts.tokens, SECURITY_TOKENS)) {
      addReason(reasons, scopePathReason("security-sensitive-path", "high", scopePath));
    }
    if (
      hasAny(facts.tokens, PUBLIC_INTEGRATION_TOKENS)
      || (facts.tokens.has("public") && facts.tokens.has("api"))
    ) {
      addReason(reasons, scopePathReason("public-integration-path", "high", scopePath));
    }
    if (hasAny(facts.tokens, MIGRATION_TOKENS)) {
      addReason(reasons, scopePathReason("migration-path", "high", scopePath));
    }
    if (hasAny(facts.tokens, PAYMENT_TOKENS)) {
      addReason(reasons, scopePathReason("payment-billing-path", "high", scopePath));
    }
    if (
      hasAny(facts.tokens, PRIVACY_TOKENS)
      || (facts.tokens.has("personal") && facts.tokens.has("data"))
    ) {
      addReason(reasons, scopePathReason("privacy-sensitive-path", "high", scopePath));
    }
    if (facts.aiSystem) {
      addReason(reasons, scopePathReason("ai-system-path", "high", scopePath));
    }

    if (
      hasAny(facts.tokens, PRODUCTION_TOKENS)
      && (
        hasAny(facts.tokens, ACCESS_POLICY_TOKENS)
        || (facts.tokens.has("access") && facts.tokens.has("policy"))
      )
    ) {
      addReason(reasons, scopePathReason("production-access-policy", "critical", scopePath));
    }
    if (hasAny(facts.tokens, ROTATION_TOKENS) && hasAny(facts.tokens, CREDENTIAL_TOKENS)) {
      addReason(reasons, scopePathReason("credential-rotation", "critical", scopePath));
    }
    if (
      hasAny(facts.tokens, DESTRUCTIVE_TOKENS)
      && (hasAny(facts.tokens, DATA_TOKENS) || facts.extension === "sql")
    ) {
      addReason(reasons, scopePathReason("destructive-data-operation", "critical", scopePath));
    }
    if (facts.aiTool && hasAny(facts.tokens, STATE_CHANGING_TOOL_TOKENS)) {
      addReason(reasons, scopePathReason("state-changing-ai-tool", "critical", scopePath));
    }
  }

  return [...reasons.values()].sort((left, right) => {
    const riskDelta = RISK_INDEX.get(right.minimumRisk) - RISK_INDEX.get(left.minimumRisk);
    if (riskDelta !== 0) return riskDelta;
    const codeDelta = compareStrings(left.code, right.code);
    if (codeDelta !== 0) return codeDelta;
    return compareStrings(JSON.stringify(left.evidence), JSON.stringify(right.evidence));
  });
}

export function assessRiskPolicy(input) {
  validateInput(input);
  const baselineRisk = maxRisk(input.declaredRisk, input.scenarioFloor);
  const allReasons = collectReasons(input.authorizedActions, input.canonicalScopePaths);
  const effectiveRisk = maxRisk(baselineRisk, ...allReasons.map((reason) => reason.minimumRisk));
  const elevationReasons = allReasons.filter(
    (reason) => RISK_INDEX.get(reason.minimumRisk) > RISK_INDEX.get(baselineRisk)
  );

  return deepFreeze({
    declaredRisk: input.declaredRisk,
    scenarioFloor: input.scenarioFloor,
    effectiveRisk,
    elevationReasons
  });
}
