import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readSync,
  realpathSync
} from "node:fs";
import path from "node:path";
import { TextDecoder } from "node:util";

import {
  assertPathContained,
  assertRegularFileWithin
} from "../../../install/safe-filesystem.mjs";

const CONTEXT_ITEM_SCHEMA_VERSION = "1.0.0";
const PROJECT_INSPECTION_SCHEMA_VERSION = "1.0.0";
const MAX_CONTEXT_FILE_BYTES = 2 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 5 * 1024 * 1024;
const MAX_LOCKFILE_BYTES = 32 * 1024 * 1024;
const MAX_DIFF_BYTES = 8 * 1024 * 1024;
const MAX_CONTEXT_AGENT_IDS = 64;
const MAX_CONTEXT_PROVENANCE_BYTES = 256 * 1024;
const MAX_SCOPED_DIFF_CHUNK_BYTES = 18 * 1024;
const CONTEXT_KINDS = new Set([
  "explicit-reference",
  "instruction",
  "lockfile",
  "manifest",
  "project-map",
  "scoped-diff",
  "scoped-file"
]);
const DEFAULT_MANIFEST_PATHS = [
  "Cargo.toml",
  "Package.swift",
  "Podfile",
  "app.json",
  "build.gradle",
  "build.gradle.kts",
  "go.mod",
  "package.json",
  "pubspec.yaml",
  "pyproject.toml",
  "settings.gradle",
  "settings.gradle.kts"
];
const DEFAULT_LOCKFILE_PATHS = [
  "Cargo.lock",
  "Package.resolved",
  "Podfile.lock",
  "bun.lock",
  "bun.lockb",
  "go.sum",
  "gradle.lockfile",
  "npm-shrinkwrap.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "poetry.lock",
  "uv.lock",
  "yarn.lock"
];
const NPM_DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies"
];
const EXACT_SEMVER_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const PRIVATE_OVERLAY_NAMES = new Set([
  ".env",
  ".netrc",
  ".npmrc",
  ".pypirc",
  ".aws",
  ".azure",
  ".docker",
  ".gnupg",
  ".kube",
  ".ssh",
  ".private",
  ".secrets",
  "agents.local.md",
  "claude.local.md",
  "client-secret.json",
  "client-secrets.json",
  "credentials.json",
  "service-account.json",
  "settings.local.json"
]);
const trustedContextItems = new WeakSet();

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function compareStrings(left, right) {
  const leftValue = String(left);
  const rightValue = String(right);
  if (leftValue < rightValue) return -1;
  if (leftValue > rightValue) return 1;
  return 0;
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainInput(value, label, allowedKeys) {
  if (!isPlainRecord(value)) throw new Error(`${label} must be a plain own-property record`);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string")) throw new Error(`${label} contains a symbol key`);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor.enumerable || !("value" in descriptor)) {
      throw new Error(`${label}.${key} must be an enumerable data property`);
    }
    if (!allowedKeys.has(key)) throw new Error(`${label}.${key} is not allowed`);
  }
}

function requiredNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.includes("\0")) {
    throw new Error(`${field} must be a non-empty trimmed string`);
  }
  return value;
}

function canonicalRelativePath(value, field) {
  requiredNonEmptyString(value, field);
  if (
    value.includes("\\")
    || /[\u0000-\u001f\u007f]/.test(value)
    || value.startsWith("/")
    || value.startsWith(":")
    || /[*?\[\]]/.test(value)
    || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(value)
    || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value
    || value === "."
  ) {
    throw new Error(`${field} must be a canonical literal repository-relative path`);
  }
  const segments = value.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`${field} must be a canonical repository-relative path without traversal`);
  }
  return value;
}

function privateOverlayReason(relativePath) {
  const lower = relativePath.toLowerCase();
  const segments = lower.split("/");
  const base = segments.at(-1);
  if (segments[0] === ".git") return "Git private metadata";
  if (segments.some((segment) => PRIVATE_OVERLAY_NAMES.has(segment))) return "named private overlay";
  if (segments.some((segment) => segment === "private" || segment === "secrets" || segment === "credentials")) {
    return "private overlay directory";
  }
  if (
    base.startsWith(".env.")
    || base.includes(".private.")
    || base.endsWith(".private")
    || base.endsWith(".local.md")
    || base.endsWith(".local.json")
    || base.endsWith(".local.toml")
  ) {
    return "private overlay filename";
  }
  return null;
}

function isExactPlaceholder(value) {
  return /^(?:example|placeholder|redacted|changeme|replace[-_]me|your[-_](?:api[-_]?key|password|secret|token)|x{16,}|\*{16,}|<[-A-Z0-9_. ]{1,64}>|\$\{[A-Z0-9_]{1,64}\}|\{\{[-A-Z0-9_.]{1,64}\}\})$/i.test(value);
}

function secretLikeContent(text) {
  if (/-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/.test(text)) return true;
  if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(text)) return true;
  if (/\b(?:gh[opusr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/.test(text)) {
    return true;
  }
  if (/\b(?:AIza[0-9A-Za-z_-]{35}|npm_[A-Za-z0-9]{30,}|sk_live_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/.test(text)) {
    return true;
  }
  const assignmentPattern = /(?:^|[^A-Za-z0-9_-])["']?(?:_authToken|api[_-]?key|access[_-]?token|auth[_-]?token|aws[_-]?secret[_-]?access[_-]?key|aws[_-]?session[_-]?token|client[_-]?secret|credential|password|private[_-]?key|refresh[_-]?token|secret|token)["']?\s*[:=]\s*["']?(\$\{[A-Z0-9_]{1,64}\}|\{\{[-A-Z0-9_.]{1,64}\}\}|<[-A-Z0-9_. ]{1,64}>|[^\s"';,}]{16,})/gim;
  for (const match of text.matchAll(assignmentPattern)) {
    if (!isExactPlaceholder(match[1])) return true;
  }
  const authorizationPattern = /(?:^|[^A-Za-z0-9_-])["']?Authorization["']?\s*[:=]\s*["']?(?:Basic|Bearer)\s+(\$\{[A-Z0-9_]{1,64}\}|\{\{[-A-Z0-9_.]{1,64}\}\}|<[-A-Z0-9_. ]{1,64}>|[^\s"';,}]{8,})/gim;
  for (const match of text.matchAll(authorizationPattern)) {
    if (!isExactPlaceholder(match[1])) return true;
  }
  const credentialHeaderPattern = /(?:^|[^A-Za-z0-9_-])["']?(?:api-key|x-api-key|x-auth-token)["']?\s*[:=]\s*["']?([^\s"';,}]{8,})/gim;
  for (const match of text.matchAll(credentialHeaderPattern)) {
    if (!isExactPlaceholder(match[1])) return true;
  }
  if (/\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s/@]{8,}@/i.test(text)) return true;
  return false;
}

function personalDataLikeContent(text) {
  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  for (const match of text.matchAll(emailPattern)) {
    const address = match[0].toLowerCase();
    if (!/^(?:user|test|example)@example\.(?:com|org|net|invalid)$/.test(address)) return true;
  }
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(text)) return true;
  if (/\b(?:customer|employee|person|phone|mobile)\s*(?:number|id)?\s*[:=]\s*\+?[0-9][0-9 ()-]{7,}[0-9]\b/i.test(text)) {
    return true;
  }
  return false;
}

export function assertSafeTextContent(content, label = "context content") {
  if (typeof content !== "string") throw new Error(`${label} must be UTF-8 text`);
  if (content.includes("\0")) throw new Error(`${label} must not contain binary or NUL content`);
  if (secretLikeContent(content)) throw new Error(`${label} contains secret or credential-like content`);
  if (personalDataLikeContent(content)) throw new Error(`${label} contains personal data-like content`);
  return content;
}

function safePromptMetadata(value, field, maxBytes = 512) {
  requiredNonEmptyString(value, field);
  if (Buffer.byteLength(value, "utf8") > maxBytes) throw new Error(`${field} exceeds the ${maxBytes}-byte limit`);
  assertSafeTextContent(value, field);
  return value;
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function lstatIfPresent(candidate) {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error?.code)) return null;
    throw error;
  }
}

function normalizedRealPath(candidate) {
  let normalized = realpathSync.native(path.resolve(candidate));
  if (normalized.startsWith("\\\\?\\")) normalized = normalized.slice(4);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function assertRepositoryRoot(repositoryRoot) {
  requiredNonEmptyString(repositoryRoot, "repositoryRoot");
  const resolved = path.resolve(repositoryRoot);
  assertPathContained(resolved, resolved, "project inspection repository root");
  if (!lstatSync(resolved).isDirectory()) {
    throw new Error("project inspection repository root must be a regular directory");
  }
  return resolved;
}

function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error(`${label} must contain valid UTF-8 text`);
  }
}

function stableFileSnapshot(stats) {
  return [
    stats.dev,
    stats.ino,
    stats.mode,
    stats.nlink,
    stats.size,
    stats.mtimeMs,
    stats.ctimeMs
  ].map(String).join(":");
}

function readDescriptorBounded(candidate, label, maxBytes) {
  const noFollow = Number.isInteger(constants.O_NOFOLLOW) ? constants.O_NOFOLLOW : 0;
  let descriptor;
  let before;
  let after;
  const chunks = [];
  let total = 0;
  try {
    descriptor = openSync(candidate, constants.O_RDONLY | noFollow);
    before = fstatSync(descriptor);
    if (!before.isFile()) throw new Error(`${label} must be a regular file`);
    if (before.nlink > 1) throw new Error(`${label} must not be hard linked`);
    if (!Number.isSafeInteger(before.size) || before.size < 0 || before.size > maxBytes) {
      throw new Error(`${label} exceeds the ${maxBytes}-byte inspection limit`);
    }
    const buffer = Buffer.allocUnsafe(Math.min(64 * 1024, maxBytes + 1));
    while (total <= maxBytes) {
      const remaining = (maxBytes + 1) - total;
      if (remaining <= 0) break;
      const bytesRead = readSync(descriptor, buffer, 0, Math.min(buffer.byteLength, remaining), null);
      if (bytesRead === 0) break;
      chunks.push(Buffer.from(buffer.subarray(0, bytesRead)));
      total += bytesRead;
    }
    if (total > maxBytes) throw new Error(`${label} exceeds the ${maxBytes}-byte inspection limit`);
    after = fstatSync(descriptor);
    if (stableFileSnapshot(before) !== stableFileSnapshot(after)) {
      throw new Error(`${label} changed during inspection`);
    }
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  return { bytes: Buffer.concat(chunks, total), descriptorSnapshot: after };
}

function readContainedRegularFile(repositoryRoot, relativePath, label, maxBytes, { allowBinary = false } = {}) {
  canonicalRelativePath(relativePath, `${label} path`);
  const privateReason = privateOverlayReason(relativePath);
  if (privateReason) throw new Error(`${label} rejects private overlay ${relativePath}: ${privateReason}`);
  const candidate = path.resolve(repositoryRoot, ...relativePath.split("/"));
  assertRegularFileWithin(repositoryRoot, candidate, label);
  const { bytes: contents, descriptorSnapshot } = readDescriptorBounded(candidate, label, maxBytes);
  assertRegularFileWithin(repositoryRoot, candidate, label);
  const pathSnapshot = lstatSync(candidate);
  if (
    String(descriptorSnapshot.dev) !== String(pathSnapshot.dev)
    || String(descriptorSnapshot.ino) !== String(pathSnapshot.ino)
    || String(descriptorSnapshot.size) !== String(pathSnapshot.size)
  ) {
    throw new Error(`${label} path identity changed during inspection`);
  }
  if (!allowBinary && contents.includes(0)) throw new Error(`${label} must be a UTF-8 text file without NUL bytes`);
  return contents;
}

function normalizeAgentIds(agentIds) {
  if (agentIds === undefined) return [];
  if (!Array.isArray(agentIds)) throw new Error("agentIds must be an array of unique IDs");
  if (agentIds.length > MAX_CONTEXT_AGENT_IDS) {
    throw new Error(`agentIds must contain no more than ${MAX_CONTEXT_AGENT_IDS} IDs`);
  }
  const normalized = agentIds.map((value, index) => safePromptMetadata(value, `agentIds[${index}]`, 128));
  if (new Set(normalized).size !== normalized.length) throw new Error("agentIds must be unique");
  return normalized.sort(compareStrings);
}

function trustedContextItem({
  repositoryRoot,
  id,
  source,
  kind,
  relevance,
  agentIds,
  content,
  provenanceType,
  provenanceDetails = {}
}) {
  safePromptMetadata(id, "context item id", 256);
  safePromptMetadata(source, `context item ${id} source`, 1024);
  assertSafeTextContent(content, `context item ${id}`);
  const provenanceText = JSON.stringify(provenanceDetails);
  if (Buffer.byteLength(provenanceText, "utf8") > MAX_CONTEXT_PROVENANCE_BYTES) {
    throw new Error(`context item ${id} provenance exceeds the ${MAX_CONTEXT_PROVENANCE_BYTES}-byte limit`);
  }
  assertSafeTextContent(provenanceText, `context item ${id} provenance`);
  const utf8Bytes = Buffer.byteLength(content, "utf8");
  const repositoryIdentity = sha256(realpathSync.native(repositoryRoot));
  const item = deepFreeze({
    schemaVersion: CONTEXT_ITEM_SCHEMA_VERSION,
    id,
    kind,
    source,
    provenance: {
      type: provenanceType,
      repositoryIdentity,
      ...provenanceDetails
    },
    originAttestation: {
      status: "verified",
      type: provenanceType,
      repositoryIdentity
    },
    contentTrust: "untrusted-repository-data",
    instructionAuthority: {
      classification: kind === "instruction" ? "candidate-repository-instruction" : "none",
      mayOverrideSystemPolicy: false
    },
    relevance,
    agentIds,
    sensitivity: "repository-internal",
    utf8Bytes,
    tokenEstimate: Math.ceil(utf8Bytes / 3),
    contentHash: sha256(Buffer.from(content, "utf8")),
    content
  });
  trustedContextItems.add(item);
  return item;
}

export function assertTrustedRepositoryContextItem(item) {
  if (!trustedContextItems.has(item)) {
    throw new Error("context item must come from trusted repository inspection");
  }
  return item;
}

export function inspectRepositoryContextItem(input) {
  assertPlainInput(input, "repository context inspection", new Set([
    "agentIds",
    "id",
    "kind",
    "relevance",
    "repositoryRoot",
    "source"
  ]));
  const repositoryRoot = assertRepositoryRoot(input.repositoryRoot);
  const id = requiredNonEmptyString(input.id, "id");
  const source = canonicalRelativePath(input.source, "source");
  const kind = input.kind ?? "explicit-reference";
  if (!CONTEXT_KINDS.has(kind) || kind === "scoped-diff") {
    throw new Error(`kind must be one of: ${[...CONTEXT_KINDS].filter((value) => value !== "scoped-diff").join(", ")}`);
  }
  const relevance = input.relevance ?? 0;
  if (typeof relevance !== "number" || !Number.isFinite(relevance)) {
    throw new Error("relevance must be a finite number");
  }
  const agentIds = normalizeAgentIds(input.agentIds);
  const contents = readContainedRegularFile(
    repositoryRoot,
    source,
    `repository context item ${id}`,
    MAX_CONTEXT_FILE_BYTES
  );
  const content = decodeUtf8(contents, `repository context item ${id}`);
  return trustedContextItem({
    repositoryRoot,
    id,
    source,
    kind,
    relevance,
    agentIds,
    content,
    provenanceType: "repository-regular-file",
    provenanceDetails: { path: source }
  });
}

function existingRepositoryPath(repositoryRoot, relativePath) {
  const candidate = path.resolve(repositoryRoot, ...relativePath.split("/"));
  return lstatIfPresent(candidate) !== null;
}

function inspectManifest(repositoryRoot, manifestPath) {
  const bytes = readContainedRegularFile(
    repositoryRoot,
    manifestPath,
    `project manifest ${manifestPath}`,
    MAX_MANIFEST_BYTES
  );
  const text = decodeUtf8(bytes, `project manifest ${manifestPath}`);
  if (secretLikeContent(text)) throw new Error(`${manifestPath} contains secret or credential-like content`);
  let kind = "project-manifest";
  let scriptNames = [];
  let dependencyDeclarations = [];
  if (path.posix.basename(manifestPath) === "package.json") {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`${manifestPath} must contain valid JSON`);
    }
    if (!isPlainRecord(parsed)) throw new Error(`${manifestPath} must contain a JSON object`);
    const scripts = parsed.scripts ?? {};
    if (!isPlainRecord(scripts)) throw new Error(`${manifestPath} scripts must be an object`);
    for (const [scriptName, command] of Object.entries(scripts)) {
      requiredNonEmptyString(scriptName, `${manifestPath} script name`);
      if (typeof command !== "string") throw new Error(`${manifestPath} scripts.${scriptName} must be a string`);
      if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(scriptName)) {
        throw new Error(`${manifestPath} scripts.${scriptName} must use a stable package-script name`);
      }
    }
    kind = "node-package-manifest";
    scriptNames = Object.keys(scripts).sort(compareStrings);
    dependencyDeclarations = NPM_DEPENDENCY_SECTIONS.flatMap((section) => {
      const declarations = parsed[section];
      if (declarations === undefined) return [];
      if (!isPlainRecord(declarations)) throw new Error(`${manifestPath} ${section} must be an object`);
      return Object.entries(declarations).map(([dependencyId, declaredSpec]) => {
        requiredNonEmptyString(dependencyId, `${manifestPath} ${section} dependency name`);
        if (typeof declaredSpec !== "string" || declaredSpec.trim() !== declaredSpec || declaredSpec.length === 0) {
          throw new Error(`${manifestPath} ${section}.${dependencyId} must be a non-empty trimmed string`);
        }
        return { dependencyId, declaredSpec, section };
      });
    });
  }
  return {
    record: {
      path: manifestPath,
      kind,
      sha256: sha256(bytes),
      scriptNames
    },
    dependencyDeclarations
  };
}

function inspectLockfile(repositoryRoot, lockfilePath) {
  const bytes = readContainedRegularFile(
    repositoryRoot,
    lockfilePath,
    `project lockfile ${lockfilePath}`,
    MAX_LOCKFILE_BYTES,
    { allowBinary: lockfilePath === "bun.lockb" }
  );
  const record = {
    path: lockfilePath,
    kind: "project-lockfile",
    sha256: sha256(bytes),
    size: bytes.byteLength
  };
  if (lockfilePath !== "package-lock.json") return { record, packageLockEvidence: null };

  const text = decodeUtf8(bytes, `project lockfile ${lockfilePath}`);
  if (secretLikeContent(text)) throw new Error(`${lockfilePath} contains secret or credential-like content`);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${lockfilePath} must contain valid JSON`);
  }
  if (!isPlainRecord(parsed)) throw new Error(`${lockfilePath} must contain a JSON object`);
  if (!Number.isInteger(parsed.lockfileVersion)) {
    throw new Error(`${lockfilePath} lockfileVersion must be an integer`);
  }
  if (![2, 3].includes(parsed.lockfileVersion)) {
    return {
      record,
      packageLockEvidence: {
        supported: false,
        lockfileVersion: parsed.lockfileVersion,
        packages: null
      }
    };
  }
  if (!isPlainRecord(parsed.packages)) throw new Error(`${lockfilePath} packages must be an object`);
  return {
    record,
    packageLockEvidence: {
      supported: true,
      lockfileVersion: parsed.lockfileVersion,
      packages: parsed.packages
    }
  };
}

function npmObservationStateWithoutLock(declaredSpec) {
  return EXACT_SEMVER_PATTERN.test(declaredSpec) ? "unresolved" : "declared-range";
}

function observationProvenance(manifest, lockfile = null) {
  return {
    manifestPath: manifest.path,
    manifestSha256: manifest.sha256,
    lockfilePath: lockfile?.path ?? null,
    lockfileSha256: lockfile?.sha256 ?? null
  };
}

function unresolvedNpmObservation(declaration, manifest, lockfile, reason, state = "unresolved") {
  return {
    dependencyId: declaration.dependencyId,
    declarationSection: declaration.section,
    declarationDigest: sha256(`${declaration.section}\0${declaration.dependencyId}\0${declaration.declaredSpec}`),
    ecosystem: "npm",
    state,
    observedVersion: null,
    reason,
    provenance: observationProvenance(manifest, lockfile)
  };
}

function npmVersionObservations(manifestInspections, lockfileInspections) {
  const packageManifest = manifestInspections.find(({ record }) => record.path === "package.json");
  if (!packageManifest || packageManifest.dependencyDeclarations.length === 0) return [];
  const packageLock = lockfileInspections.find(({ record }) => record.path === "package-lock.json");
  if (!packageLock || !packageLock.packageLockEvidence?.supported) {
    const reason = packageLock
      ? "unsupported-package-lock-version"
      : "no-supported-package-lock-evidence";
    return packageManifest.dependencyDeclarations.map((declaration) => unresolvedNpmObservation(
      declaration,
      packageManifest.record,
      packageLock?.record ?? null,
      reason,
      npmObservationStateWithoutLock(declaration.declaredSpec)
    )).sort((left, right) => (
      compareStrings(left.dependencyId, right.dependencyId)
      || compareStrings(left.declarationSection, right.declarationSection)
    ));
  }

  const { packages } = packageLock.packageLockEvidence;
  const rootPackage = packages[""];
  if (rootPackage !== undefined && !isPlainRecord(rootPackage)) {
    throw new Error("package-lock.json packages[\"\"] must be an object");
  }
  return packageManifest.dependencyDeclarations.map((declaration) => {
    if (rootPackage === undefined) {
      return unresolvedNpmObservation(
        declaration,
        packageManifest.record,
        packageLock.record,
        "lock-root-entry-missing"
      );
    }
    const lockedDeclarations = rootPackage[declaration.section];
    if (lockedDeclarations !== undefined && !isPlainRecord(lockedDeclarations)) {
      throw new Error(`package-lock.json packages[\"\"].${declaration.section} must be an object`);
    }
    const lockedDeclaration = lockedDeclarations?.[declaration.dependencyId];
    if (lockedDeclaration === undefined) {
      return unresolvedNpmObservation(
        declaration,
        packageManifest.record,
        packageLock.record,
        "lock-declaration-missing"
      );
    }
    if (typeof lockedDeclaration !== "string") {
      throw new Error(`package-lock.json declaration for ${declaration.dependencyId} must be a string`);
    }
    if (lockedDeclaration !== declaration.declaredSpec) {
      return unresolvedNpmObservation(
        declaration,
        packageManifest.record,
        packageLock.record,
        "lock-declaration-mismatch"
      );
    }
    const lockedPackage = packages[`node_modules/${declaration.dependencyId}`];
    if (lockedPackage === undefined) {
      return unresolvedNpmObservation(
        declaration,
        packageManifest.record,
        packageLock.record,
        "lock-entry-missing"
      );
    }
    if (!isPlainRecord(lockedPackage)) {
      throw new Error(`package-lock.json entry for ${declaration.dependencyId} must be an object`);
    }
    if (typeof lockedPackage.version !== "string" || !EXACT_SEMVER_PATTERN.test(lockedPackage.version)) {
      return unresolvedNpmObservation(
        declaration,
        packageManifest.record,
        packageLock.record,
        "lock-version-not-exact"
      );
    }
    return {
      dependencyId: declaration.dependencyId,
      declarationSection: declaration.section,
      declarationDigest: sha256(`${declaration.section}\0${declaration.dependencyId}\0${declaration.declaredSpec}`),
      ecosystem: "npm",
      state: "observed-exact",
      observedVersion: lockedPackage.version,
      reason: "verified-package-lock-entry",
      provenance: observationProvenance(packageManifest.record, packageLock.record)
    };
  }).sort((left, right) => (
    compareStrings(left.dependencyId, right.dependencyId)
    || compareStrings(left.declarationSection, right.declarationSection)
  ));
}

function normalizedPathList(value, defaults, field) {
  const paths = value === undefined ? defaults : value;
  if (!Array.isArray(paths)) throw new Error(`${field} must be an array`);
  const normalized = paths.map((entry, index) => canonicalRelativePath(entry, `${field}[${index}]`));
  if (new Set(normalized).size !== normalized.length) throw new Error(`${field} must contain unique paths`);
  for (const relativePath of normalized) {
    const privateReason = privateOverlayReason(relativePath);
    if (privateReason) throw new Error(`${field} rejects private overlay ${relativePath}: ${privateReason}`);
  }
  return normalized.sort(compareStrings);
}

export function inspectProjectCapabilities(input) {
  assertPlainInput(input, "project capability inspection", new Set([
    "includeHostCapabilities",
    "lockfilePaths",
    "manifestPaths",
    "repositoryRoot"
  ]));
  const repositoryRoot = assertRepositoryRoot(input.repositoryRoot);
  if (input.includeHostCapabilities !== undefined && typeof input.includeHostCapabilities !== "boolean") {
    throw new Error("includeHostCapabilities must be a boolean");
  }
  const manifestPaths = normalizedPathList(input.manifestPaths, DEFAULT_MANIFEST_PATHS, "manifestPaths");
  const lockfilePaths = normalizedPathList(input.lockfilePaths, DEFAULT_LOCKFILE_PATHS, "lockfilePaths");
  const manifestInspections = manifestPaths
    .filter((manifestPath) => existingRepositoryPath(repositoryRoot, manifestPath))
    .map((manifestPath) => inspectManifest(repositoryRoot, manifestPath));
  const lockfileInspections = lockfilePaths
    .filter((lockfilePath) => existingRepositoryPath(repositoryRoot, lockfilePath))
    .map((lockfilePath) => inspectLockfile(repositoryRoot, lockfilePath));
  const manifests = manifestInspections.map(({ record }) => record);
  const lockfiles = lockfileInspections.map(({ record }) => record);
  const versionObservations = npmVersionObservations(manifestInspections, lockfileInspections);
  const commandReferences = manifests.flatMap((manifest) => manifest.scriptNames.map((scriptName) => ({
    kind: "project-script",
    manifestPath: manifest.path,
    scriptName,
    digest: manifest.sha256
  })));
  const includeHostCapabilities = input.includeHostCapabilities ?? true;
  const nodeEvidencePayload = `${path.basename(process.execPath)}\0${process.version}\0${process.platform}\0${process.arch}`;
  const executableEvidence = includeHostCapabilities ? [{
    id: "node",
    evidenceType: "observed-running-runtime",
    executableName: path.basename(process.execPath),
    version: process.version,
    platform: process.platform,
    architecture: process.arch,
    evidenceDigest: sha256(nodeEvidencePayload)
  }] : [];
  const hostCapabilities = includeHostCapabilities ? [
    {
      id: `architecture:${process.arch}`,
      evidenceType: "observed-process-host",
      value: process.arch,
      evidenceDigest: sha256(`architecture\0${process.arch}`)
    },
    {
      id: `platform:${process.platform}`,
      evidenceType: "observed-process-host",
      value: process.platform,
      evidenceDigest: sha256(`platform\0${process.platform}`)
    }
  ] : [];

  return deepFreeze({
    schemaVersion: PROJECT_INSPECTION_SCHEMA_VERSION,
    inspectionMode: "read-only",
    repositoryIdentity: sha256(realpathSync.native(repositoryRoot)),
    manifests,
    lockfiles,
    versionObservations,
    commandReferences,
    executableEvidence,
    hostCapabilities
  });
}

export function inspectApplicableInstructions(input) {
  assertPlainInput(input, "instruction inspection", new Set(["repositoryRoot", "targetPaths"]));
  const repositoryRoot = assertRepositoryRoot(input.repositoryRoot);
  if (!Array.isArray(input.targetPaths) || input.targetPaths.length === 0) {
    throw new Error("targetPaths must be a non-empty array");
  }
  const candidates = new Set(["AGENTS.md"]);
  for (const [index, targetPath] of input.targetPaths.entries()) {
    const normalized = canonicalRelativePath(targetPath, `targetPaths[${index}]`);
    const segments = normalized.split("/");
    for (let depth = 1; depth <= segments.length; depth += 1) {
      candidates.add(`${segments.slice(0, depth).join("/")}/AGENTS.md`);
    }
  }
  return [...candidates]
    .filter((candidate) => existingRepositoryPath(repositoryRoot, candidate))
    .sort((left, right) => left.split("/").length - right.split("/").length || compareStrings(left, right))
    .map((source, index) => inspectRepositoryContextItem({
      repositoryRoot,
      id: `instruction-${index + 1}-${sha256(source).slice(0, 12)}`,
      source,
      kind: "instruction",
      relevance: 1000 - index,
      agentIds: []
    }));
}

function runReadOnlyGit(repositoryRoot, argumentsList, maxBuffer = MAX_DIFF_BYTES) {
  const inheritedPath = process.env.PATH;
  const gitEnvironment = {
    GIT_ATTR_NOSYSTEM: "1",
    GIT_CEILING_DIRECTORIES: path.dirname(path.dirname(repositoryRoot)),
    GIT_CONFIG_COUNT: "0",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_LITERAL_PATHSPECS: "1",
    GIT_OPTIONAL_LOCKS: "0",
    GIT_PAGER: "cat",
    GIT_PROTOCOL_FROM_USER: "0",
    GIT_TERMINAL_PROMPT: "0",
    LANG: "C",
    LC_ALL: "C"
  };
  for (const key of ["COMSPEC", "PATH", "PATHEXT", "SystemRoot", "TEMP", "TMP", "TMPDIR", "WINDIR"]) {
    const value = key === "PATH" ? inheritedPath : process.env[key];
    if (typeof value === "string" && value.length > 0) gitEnvironment[key] = value;
  }
  const result = spawnSync("git", ["-C", repositoryRoot, "--no-pager", ...argumentsList], {
    encoding: null,
    env: gitEnvironment,
    maxBuffer,
    shell: false,
    timeout: 30_000,
    windowsHide: true
  });
  if (result.error) throw new Error(`scoped diff inspection failed: ${result.error.message}`);
  if (result.signal || result.status === null) throw new Error("scoped diff inspection did not complete");
  if (result.status !== 0) {
    const detail = decodeUtf8(result.stderr ?? Buffer.alloc(0), "Git error output").trim().split(/\r?\n/, 1)[0];
    throw new Error(`scoped diff inspection failed with exit ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return decodeUtf8(result.stdout ?? Buffer.alloc(0), "Git inspection output");
}

function parseNulTerminatedPaths(output) {
  if (output === "") return [];
  if (!output.endsWith("\0")) throw new Error("scoped diff path inventory must be NUL terminated");
  return output.slice(0, -1).split("\0");
}

function assertChangedPathSafe(repositoryRoot, changedPath) {
  const relativePath = canonicalRelativePath(changedPath, "scoped diff changed path");
  const privateReason = privateOverlayReason(relativePath);
  if (privateReason) {
    throw new Error(`scoped diff rejects private overlay ${relativePath}: ${privateReason}`);
  }
  const candidate = path.resolve(repositoryRoot, ...relativePath.split("/"));
  const stats = lstatIfPresent(candidate);
  if (stats) {
    assertRegularFileWithin(repositoryRoot, candidate, `scoped diff changed path ${relativePath}`);
  } else {
    assertPathContained(repositoryRoot, candidate, `scoped diff deleted path ${relativePath}`);
  }
  return relativePath;
}

export function inspectScopedDiff(input) {
  assertPlainInput(input, "scoped diff inspection", new Set([
    "agentIds",
    "expectedCommit",
    "id",
    "relevance",
    "repositoryRoot",
    "scope"
  ]));
  const repositoryRoot = assertRepositoryRoot(input.repositoryRoot);
  const expectedCommit = requiredNonEmptyString(input.expectedCommit, "expectedCommit").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedCommit)) throw new Error("expectedCommit must be a full 40-character Git SHA");
  if (!Array.isArray(input.scope) || input.scope.length === 0) throw new Error("scope must be a non-empty array");
  const scope = input.scope.map((entry, index) => canonicalRelativePath(entry, `scope[${index}]`));
  if (new Set(scope).size !== scope.length) throw new Error("scope paths must be unique");
  const relevance = input.relevance ?? 900;
  if (typeof relevance !== "number" || !Number.isFinite(relevance)) {
    throw new Error("relevance must be a finite number");
  }
  for (const scopePath of scope) {
    const privateReason = privateOverlayReason(scopePath);
    if (privateReason) throw new Error(`scoped diff rejects private overlay ${scopePath}: ${privateReason}`);
  }
  const observedTopLevel = runReadOnlyGit(
    repositoryRoot,
    ["rev-parse", "--show-toplevel"],
    64 * 1024
  ).trim();
  if (!observedTopLevel || normalizedRealPath(observedTopLevel) !== normalizedRealPath(repositoryRoot)) {
    throw new Error("scoped diff repositoryRoot must be the verified Git top level realpath");
  }
  const observedHead = runReadOnlyGit(
    repositoryRoot,
    ["rev-parse", "--verify", "HEAD^{commit}"],
    64 * 1024
  ).trim().toLowerCase();
  if (observedHead !== expectedCommit) {
    throw new Error(`repository HEAD ${observedHead || "unknown"} does not match expectedCommit ${expectedCommit}`);
  }
  const trackedChangedPaths = parseNulTerminatedPaths(runReadOnlyGit(repositoryRoot, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--name-only",
    "-z",
    expectedCommit,
    "--",
    ...scope
  ])).map((changedPath) => assertChangedPathSafe(repositoryRoot, changedPath));
  const untrackedPaths = parseNulTerminatedPaths(runReadOnlyGit(repositoryRoot, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    ...scope
  ])).map((changedPath) => assertChangedPathSafe(repositoryRoot, changedPath));
  const changedPaths = [...new Set([...trackedChangedPaths, ...untrackedPaths])].sort(compareStrings);
  const trackedContent = runReadOnlyGit(repositoryRoot, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--unified=3",
    expectedCommit,
    "--",
    ...scope
  ]);
  let content = trackedContent;
  let contentBytes = Buffer.byteLength(content, "utf8");
  const untrackedContents = new Map();
  if (contentBytes > MAX_DIFF_BYTES) {
    throw new Error(`scoped diff inspection exceeds the ${MAX_DIFF_BYTES}-byte inspection limit`);
  }
  for (const untrackedPath of [...untrackedPaths].sort(compareStrings)) {
    const header = `${content.length > 0 && !content.endsWith("\n") ? "\n" : ""}--- Untracked repository file: ${untrackedPath} ---\n`;
    const headerBytes = Buffer.byteLength(header, "utf8");
    const remainingBytes = MAX_DIFF_BYTES - contentBytes - headerBytes;
    if (remainingBytes < 0) {
      throw new Error(`scoped diff inspection exceeds the ${MAX_DIFF_BYTES}-byte inspection limit`);
    }
    const bytes = readContainedRegularFile(
      repositoryRoot,
      untrackedPath,
      `scoped diff untracked file ${untrackedPath}`,
      remainingBytes
    );
    const untrackedContent = decodeUtf8(bytes, `scoped diff untracked file ${untrackedPath}`);
    assertSafeTextContent(untrackedContent, `scoped diff untracked file ${untrackedPath}`);
    untrackedContents.set(untrackedPath, bytes);
    content += `${header}${untrackedContent}`;
    contentBytes += headerBytes + Buffer.byteLength(untrackedContent, "utf8");
  }
  const finalTrackedChangedPaths = parseNulTerminatedPaths(runReadOnlyGit(repositoryRoot, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--name-only",
    "-z",
    expectedCommit,
    "--",
    ...scope
  ])).map((changedPath) => assertChangedPathSafe(repositoryRoot, changedPath));
  const finalUntrackedPaths = parseNulTerminatedPaths(runReadOnlyGit(repositoryRoot, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    ...scope
  ])).map((changedPath) => assertChangedPathSafe(repositoryRoot, changedPath));
  const finalTrackedContent = runReadOnlyGit(repositoryRoot, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--no-renames",
    "--unified=3",
    expectedCommit,
    "--",
    ...scope
  ]);
  if (
    JSON.stringify([...trackedChangedPaths].sort(compareStrings))
      !== JSON.stringify([...finalTrackedChangedPaths].sort(compareStrings))
    || JSON.stringify([...untrackedPaths].sort(compareStrings))
      !== JSON.stringify([...finalUntrackedPaths].sort(compareStrings))
    || finalTrackedContent !== trackedContent
  ) {
    throw new Error("repository changed during scoped diff inspection");
  }
  for (const [untrackedPath, initialBytes] of untrackedContents) {
    const finalBytes = readContainedRegularFile(
      repositoryRoot,
      untrackedPath,
      `scoped diff final untracked file ${untrackedPath}`,
      initialBytes.byteLength
    );
    if (!finalBytes.equals(initialBytes)) {
      throw new Error("repository changed during scoped diff inspection");
    }
  }
  const scopeDigest = sha256(JSON.stringify([...scope].sort(compareStrings))).slice(0, 16);
  return trustedContextItem({
    repositoryRoot,
    id: input.id ?? `scoped-diff-${scopeDigest}`,
    source: `git-diff:${expectedCommit}:${scopeDigest}`,
    kind: "scoped-diff",
    relevance,
    agentIds: normalizeAgentIds(input.agentIds),
    content,
    provenanceType: "repository-scoped-git-diff",
    provenanceDetails: {
      expectedCommit,
      scope: [...scope].sort(compareStrings),
      changedPaths
    }
  });
}

function splitUtf8Chunks(content, maxBytes) {
  const bytes = Buffer.from(content, "utf8");
  const chunks = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + maxBytes, bytes.length);
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
    if (end <= start) throw new Error("could not split scoped diff at a UTF-8 boundary");
    const newline = bytes.lastIndexOf(0x0a, end - 1);
    if (newline >= start + Math.floor(maxBytes / 2)) end = newline + 1;
    chunks.push(decodeUtf8(bytes.subarray(start, end), "scoped diff chunk"));
    start = end;
  }
  return chunks;
}

export function inspectScopedDiffChunks(input) {
  const inspected = inspectScopedDiff(input);
  if (inspected.content.length === 0) return [];
  if (inspected.utf8Bytes <= MAX_SCOPED_DIFF_CHUNK_BYTES) return [inspected];
  const chunks = splitUtf8Chunks(inspected.content, MAX_SCOPED_DIFF_CHUNK_BYTES);
  return chunks.map((content, index) => trustedContextItem({
    repositoryRoot: input.repositoryRoot,
    id: `${inspected.id}-part-${index + 1}-of-${chunks.length}`,
    source: `${inspected.source}:part-${index + 1}-of-${chunks.length}`,
    kind: "scoped-diff",
    relevance: inspected.relevance - (index / 1000),
    agentIds: [...inspected.agentIds],
    content,
    provenanceType: "repository-scoped-git-diff-chunk",
    provenanceDetails: {
      originalContentHash: inspected.contentHash,
      originalProvenance: inspected.provenance,
      part: index + 1,
      parts: chunks.length
    }
  }));
}
