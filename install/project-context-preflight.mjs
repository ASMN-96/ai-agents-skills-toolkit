import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  assertPathContained,
  assertRegularFileWithin
} from "./safe-filesystem.mjs";

export const PROJECT_MAP_RELATIVE_PATH = ".ai-toolkit/context/project-map.json";
export const PROJECT_MAP_MANIFEST_PATH = "context/project-map.json";
export const PROJECT_MAP_ASSET_NAME = "project-context-preflight";

const MAX_MAP_BYTES = 64 * 1024;
const MAX_STRING_BYTES = 4096;
const MAX_WALK_FILES = 2000;
const SKIP_DIRS = new Set([
  ".git",
  ".ai-toolkit",
  ".worktrees",
  ".worktree",
  "worktrees",
  ".git-worktrees",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".cache",
  ".next",
  ".nuxt",
  ".turbo",
  "out",
  "temp",
  "tmp",
  "scratch",
  "private",
  ".private"
]);
const FORBIDDEN_WORKTREE_PREFIXES = [
  ".worktrees/",
  ".worktree/",
  "worktrees/",
  ".git-worktrees/"
];
const UNSAFE_FILE_NAMES = new Set([
  ".env",
  ".npmrc",
  ".pypirc",
  ".netrc",
  "id_rsa",
  "id_ed25519"
]);
const CONFIG_CANDIDATES = [
  "README.md",
  "AGENTS.md",
  "AGENTS.override.md",
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "nx.json",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "next.config.ts",
  "next.config.js",
  "eslint.config.js",
  "eslint.config.mjs",
  "biome.json",
  "vitest.config.ts",
  "vitest.config.js",
  "playwright.config.ts",
  "playwright.config.js"
];
const VALIDATION_SCRIPT_ORDER = ["typecheck", "lint", "test", "build"];

function toSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

function normalizeRelative(filePath) {
  const normalized = toSlash(filePath).replace(/^\/+/, "");
  return normalized === "" ? "." : normalized;
}

function sortUnique(values) {
  return [...new Set(values.filter(Boolean).map(normalizeRelative))].sort((left, right) => left.localeCompare(right));
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

class ProjectContextFilesystem {
  constructor(targetRoot) {
    this.root = path.resolve(targetRoot);
    const verifiedRoot = assertPathContained(
      this.root,
      this.root,
      "project context repository root"
    );
    if (!statSync(verifiedRoot).isDirectory()) {
      throw new Error(`project context repository root must be a regular directory: ${verifiedRoot}`);
    }
  }

  resolve(candidate) {
    const resolved = path.isAbsolute(candidate)
      ? path.resolve(candidate)
      : path.resolve(this.root, candidate);
    return assertPathContained(this.root, resolved, "project context input");
  }

  directory(candidate = ".") {
    try {
      const resolved = this.resolve(candidate);
      if (!statSync(resolved).isDirectory()) return null;
      return assertPathContained(this.root, resolved, "project context directory");
    } catch {
      return null;
    }
  }

  file(candidate) {
    try {
      const resolved = path.isAbsolute(candidate)
        ? path.resolve(candidate)
        : path.resolve(this.root, candidate);
      return assertRegularFileWithin(this.root, resolved, "project context file");
    } catch {
      return null;
    }
  }

  readDirectory(candidate = ".") {
    try {
      const directory = this.directory(candidate);
      if (!directory) return [];
      const before = lstatSync(directory, { bigint: true });
      if (!before.isDirectory()) return [];
      const entries = readdirSync(directory, { withFileTypes: true });
      const rechecked = this.directory(directory);
      if (!rechecked) return [];
      const after = lstatSync(rechecked, { bigint: true });
      return sameFileIdentity(before, after) ? entries : [];
    } catch {
      return [];
    }
  }

  readRegularFile(candidate, encoding = null) {
    let descriptor;
    try {
      const file = this.file(candidate);
      if (!file) return null;
      const before = lstatSync(file, { bigint: true });
      if (!before.isFile() || before.nlink !== 1n) return null;
      descriptor = openSync(file, "r");
      const opened = fstatSync(descriptor, { bigint: true });
      if (!opened.isFile() || opened.nlink !== 1n || !sameFileIdentity(before, opened)) return null;
      const contents = encoding === null
        ? readFileSync(descriptor)
        : readFileSync(descriptor, encoding);
      const rechecked = this.file(file);
      if (!rechecked) return null;
      const after = lstatSync(rechecked, { bigint: true });
      return sameFileIdentity(opened, after) ? contents : null;
    } catch {
      return null;
    } finally {
      if (descriptor !== undefined) closeSync(descriptor);
    }
  }

  readJson(candidate) {
    try {
      const contents = this.readRegularFile(candidate, "utf8");
      return contents === null ? null : JSON.parse(contents);
    } catch {
      return null;
    }
  }

  sha256(candidate) {
    try {
      const contents = this.readRegularFile(candidate);
      return contents === null ? null : createHash("sha256").update(contents).digest("hex");
    } catch {
      return null;
    }
  }
}

function gitOutput(cwd, args) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
  } catch {
    return null;
  }
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function collectFiles(filesystem, current = filesystem.root, entries = []) {
  if (entries.length >= MAX_WALK_FILES || !filesystem.directory(current)) return entries;
  for (const entry of filesystem.readDirectory(current)) {
    const fullPath = path.join(current, entry.name);
    if (filesystem.directory(fullPath)) {
      if (!SKIP_DIRS.has(entry.name)) collectFiles(filesystem, fullPath, entries);
      continue;
    }
    if (UNSAFE_FILE_NAMES.has(entry.name) || entry.name.startsWith(".env.")) continue;
    const regularFile = filesystem.file(fullPath);
    if (regularFile) entries.push(regularFile);
    if (entries.length >= MAX_WALK_FILES) break;
  }
  return entries;
}

function relativeFrom(root, filePath) {
  return normalizeRelative(path.relative(root, filePath));
}

function expandWorkspacePattern(filesystem, pattern) {
  const normalized = normalizeRelative(pattern);
  if (!normalized.endsWith("/*")) return [];
  const parent = path.join(filesystem.root, ...normalized.slice(0, -2).split("/"));
  if (!filesystem.directory(parent)) return [];
  return filesystem.readDirectory(parent)
    .filter((entry) => filesystem.directory(path.join(parent, entry.name)))
    .map((entry) => normalizeRelative(`${normalized.slice(0, -2)}/${entry.name}`))
    .filter((relativePath) => filesystem.file(path.join(
      filesystem.root,
      ...relativePath.split("/"),
      "package.json"
    )));
}

function packageWorkspacePatterns(packageJson) {
  const workspaces = packageJson?.workspaces;
  if (Array.isArray(workspaces)) return workspaces;
  if (Array.isArray(workspaces?.packages)) return workspaces.packages;
  return [];
}

function detectRepoRoots(filesystem, rootPackageJson) {
  const roots = [{ path: ".", evidence: [".git"] }];
  const workspaceRoots = [];
  for (const pattern of packageWorkspacePatterns(rootPackageJson)) {
    workspaceRoots.push(...expandWorkspacePattern(filesystem, pattern));
  }
  for (const candidate of ["apps", "packages", "services"]) {
    const candidateRoot = path.join(filesystem.root, candidate);
    if (!filesystem.directory(candidateRoot)) continue;
    for (const entry of filesystem.readDirectory(candidateRoot)) {
      if (!filesystem.directory(path.join(candidateRoot, entry.name))) continue;
      const relativePath = normalizeRelative(`${candidate}/${entry.name}`);
      if (filesystem.file(path.join(candidateRoot, entry.name, "package.json"))) {
        workspaceRoots.push(relativePath);
      }
    }
  }
  for (const root of sortUnique(workspaceRoots)) {
    roots.push({ path: root, evidence: [`${root}/package.json`] });
  }
  return roots;
}

function detectPackageManager(filesystem, rootPackageJson) {
  const evidence = [];
  const lockEvidence = [
    ["pnpm", "pnpm-lock.yaml"],
    ["yarn", "yarn.lock"],
    ["npm", "package-lock.json"],
    ["npm", "npm-shrinkwrap.json"],
    ["bun", "bun.lockb"],
    ["bun", "bun.lock"]
  ];
  for (const [manager, file] of lockEvidence) {
    if (filesystem.file(file)) evidence.push({ path: file, manager, kind: "lockfile" });
  }
  if (rootPackageJson) {
    evidence.push({ path: "package.json", manager: "npm", kind: "package-file" });
    if (typeof rootPackageJson.packageManager === "string" && rootPackageJson.packageManager.includes("@")) {
      const manager = rootPackageJson.packageManager.split("@")[0];
      evidence.push({ path: "package.json", manager, kind: "packageManager-field" });
    }
  }
  const preferred = evidence.find((entry) => entry.kind === "lockfile") ?? evidence.find((entry) => entry.kind === "packageManager-field");
  return {
    manager: preferred?.manager ?? (rootPackageJson ? "npm" : "none"),
    evidence: evidence.map((entry) => entry.path)
  };
}

function packageJsonPaths(filesystem, repoRoots) {
  return repoRoots
    .map((entry) => (entry.path === "." ? "package.json" : `${entry.path}/package.json`))
    .filter((relativePath) => filesystem.file(relativePath));
}

function collectScripts(filesystem, repoRoots) {
  const scripts = [];
  for (const relativePath of packageJsonPaths(filesystem, repoRoots)) {
    const packageJson = filesystem.readJson(relativePath);
    for (const [name, command] of Object.entries(packageJson?.scripts ?? {})) {
      scripts.push({ path: relativePath, name, command: String(command) });
    }
  }
  return scripts.sort((left, right) => `${left.path}:${left.name}`.localeCompare(`${right.path}:${right.name}`));
}

function commandForScript(manager, scriptName) {
  if (manager === "none") return null;
  if (manager === "bun") return `bun run ${scriptName}`;
  if (scriptName === "test") return manager === "npm" ? "npm test" : `${manager} test`;
  if (manager === "npm") return `npm run ${scriptName}`;
  return `${manager} ${scriptName}`;
}

function validationCommands(packageManager, scripts) {
  const rootScripts = new Set(scripts.filter((script) => script.path === "package.json").map((script) => script.name));
  const commands = [];
  for (const scriptName of VALIDATION_SCRIPT_ORDER) {
    if (!rootScripts.has(scriptName)) continue;
    const command = commandForScript(packageManager.manager, scriptName);
    if (command) commands.push(command);
  }
  return commands;
}

function detectLocations(filesystem, files) {
  const sourceLocations = [];
  const testLocations = [];
  const configFiles = [];
  const keyFiles = [];

  for (const relativePath of CONFIG_CANDIDATES) {
    if (filesystem.file(relativePath)) {
      configFiles.push(relativePath);
      keyFiles.push(relativePath);
    }
  }

  for (const filePath of files) {
    const regularFile = filesystem.file(filePath);
    if (!regularFile) continue;
    const relativePath = relativeFrom(filesystem.root, regularFile);
    const parts = relativePath.split("/");
    const fileName = parts.at(-1) ?? "";
    const dir = parts.slice(0, -1).join("/") || ".";

    if (fileName === "package.json" && !keyFiles.includes(relativePath)) keyFiles.push(relativePath);
    if (["src", "app", "pages", "components", "lib"].some((segment) => parts.includes(segment))) {
      const sourceIndex = parts.findIndex((segment) => ["src", "app", "pages", "components", "lib"].includes(segment));
      sourceLocations.push(parts.slice(0, sourceIndex + 1).join("/"));
    }
    if (
      parts.includes("test") ||
      parts.includes("tests") ||
      parts.includes("__tests__") ||
      /\.(test|spec)\.[cm]?[jt]sx?$/.test(fileName)
    ) {
      testLocations.push(dir);
    }
  }

  return {
    keyFiles: sortUnique(keyFiles).slice(0, 80),
    sourceLocations: sortUnique(sourceLocations).slice(0, 80),
    testLocations: sortUnique(testLocations).slice(0, 80),
    configFiles: sortUnique(configFiles).slice(0, 80)
  };
}

function detectRepomix(filesystem, rootPackageJson) {
  const configCandidates = [
    "repomix.config.json",
    "repomix.config.ts",
    "repomix.config.js",
    ".repomixrc",
    ".repomixrc.json"
  ];
  const evidence = [];
  for (const file of configCandidates) {
    if (filesystem.file(file)) evidence.push(file);
  }
  const deps = {
    ...rootPackageJson?.dependencies,
    ...rootPackageJson?.devDependencies
  };
  if (Object.prototype.hasOwnProperty.call(deps, "repomix")) evidence.push("package.json#repomix");
  return {
    posture: "active-if-detected-or-owner-approved-install",
    detected: evidence.length > 0,
    evidence: sortUnique(evidence),
    allowedUse: [
      "scoped context packs",
      "token counts",
      "owner-approved local execution only"
    ],
    forbiddenUse: [
      "automatic whole-repo dumps",
      "package edits",
      "CI gates",
      "MCP setup",
      "global config"
    ]
  };
}

function stalenessHashes(filesystem, keyFiles) {
  const files = [];
  for (const relativePath of keyFiles) {
    const sha256 = filesystem.sha256(relativePath);
    if (sha256) files.push({ path: relativePath, sha256 });
  }
  return {
    files,
    aggregateSha256: sha256Text(files.map((entry) => `${entry.path}:${entry.sha256}`).join("\n"))
  };
}

function validationPolicy() {
  return {
    evidenceClasses: {
      localStatic: {
        label: "Local/static",
        requiresCredentials: false,
        proofBoundary: "observed local command output or inspected repository artifacts",
        unavailableDisposition: "unavailable-not-passed"
      },
      remoteLinkedCredentialed: {
        label: "Remote/linked/credentialed",
        requiresExplicitAuthorization: true,
        proofBoundary: "linked remote results or credentialed receipts observed for this task",
        unavailableDisposition: "unavailable-not-passed"
      }
    },
    lanes: [
      {
        id: "documentation-only",
        label: "Documentation-only",
        useWhen: "only documentation or metadata meaning changes, with no runtime behavior or release mutation",
        localStaticEvidence: [
          "targeted diff review",
          "claim, path, command, example, and link checks that are locally available"
        ],
        remoteLinkedCredentialedEvidence: [
          "linked documentation checks or previews only when acceptance or release policy requires them"
        ]
      },
      {
        id: "behavior-code",
        label: "Behavior/code",
        useWhen: "runtime behavior, interfaces, scripts, tests, or executable configuration changes",
        localStaticEvidence: [
          "focused behavior tests",
          "applicable project-owned static checks and build evidence"
        ],
        remoteLinkedCredentialedEvidence: [
          "linked CI, integration, preview, or environment evidence when required and authorized"
        ]
      },
      {
        id: "high-risk-release",
        label: "High-risk/release",
        useWhen: "security, privacy, data, migration, production, destructive, credentialed, or release boundaries are affected",
        localStaticEvidence: [
          "risk-specific negative tests and review",
          "rollback, recovery, and observability evidence available locally"
        ],
        remoteLinkedCredentialedEvidence: [
          "linked protected checks, approvals, scans, rehearsals, or deployment evidence required by policy"
        ]
      }
    ]
  };
}

function taskStartPolicy() {
  return {
    behavior: [
      "check project-map freshness before broad exploration",
      "choose concise, standard, or detailed token mode from task risk",
      "inspect likely files from keyFiles, sourceLocations, testLocations, configFiles, and direct imports",
      "report selected context before broad exploration"
    ],
    tokenModes: {
      concise: "key files plus direct task target and one validation command when enough",
      standard: "key files, direct neighbors, relevant tests, validators, and one policy/method reference",
      detailed: "expanded architecture, security, release, or source provenance context with explicit reason"
    },
    progressiveDisclosure: {
      behavior: "start with task targets and direct evidence, then expand only when risk, uncertainty, or missing proof justifies another layer",
      lineCountPolicy: "no universal file-length optimum; cohesion, coupling, risk, and reviewability decide whether to split",
      reviewHeuristic: {
        lines: 200,
        advisoryOnly: true,
        action: "review structure and context cost; do not fail or split solely because the count is exceeded"
      }
    }
  };
}

function boundedWorkCyclePolicy() {
  return {
    cycle: ["orient-from-map", "inspect-focused-context", "act-or-review", "verify", "stop-and-report"],
    loopAgents: "forbidden",
    stopOn: [
      "stale map",
      "repeated blocker",
      "missing owner approval",
      "unavailable validation",
      "no new evidence"
    ]
  };
}

export function buildProjectMap({
  targetRoot,
  selectedAgents = [],
  selectedProfiles = [],
  selectedSkills = [],
  toolkitCommit = null,
  toolkitVersion = null
}) {
  const filesystem = new ProjectContextFilesystem(targetRoot);
  const rootPackageJson = filesystem.readJson("package.json");
  const files = collectFiles(filesystem);
  const repoRoots = detectRepoRoots(filesystem, rootPackageJson);
  const packageManager = detectPackageManager(filesystem, rootPackageJson);
  const scripts = collectScripts(filesystem, repoRoots);
  const locations = detectLocations(filesystem, files);
  const gitHead = gitOutput(filesystem.root, ["rev-parse", "HEAD"]);
  const gitBranch = gitOutput(filesystem.root, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const gitDirty = Boolean(gitOutput(filesystem.root, ["status", "--porcelain"]));
  const keyFiles = locations.keyFiles;

  return {
    schemaVersion: "1.0.0",
    mapType: "project-context-preflight",
    generatedBy: "ai-agents-skills-toolkit",
    generatedAtUtc: new Date().toISOString(),
    toolkit: {
      version: toolkitVersion,
      commit: toolkitCommit
    },
    target: {
      gitHead,
      gitHeadPosture: "provenance-advisory",
      gitBranch,
      gitDirty,
      stalenessHashes: stalenessHashes(filesystem, keyFiles)
    },
    repoRoots,
    keyFiles,
    packageManager,
    scripts,
    validationCommands: validationCommands(packageManager, scripts),
    sourceLocations: locations.sourceLocations,
    testLocations: locations.testLocations,
    configFiles: locations.configFiles,
    selectedToolkitAssets: {
      agents: selectedAgents.map(String).sort((left, right) => left.localeCompare(right)),
      profiles: selectedProfiles.map(String).sort((left, right) => left.localeCompare(right)),
      skills: selectedSkills.map(String).sort((left, right) => left.localeCompare(right))
    },
    exclusions: [
      ".env",
      ".env.*",
      ".git",
      ".worktrees",
      ".worktree",
      "worktrees",
      ".git-worktrees",
      ".ai-toolkit/private",
      "node_modules",
      "dist",
      "build",
      "coverage",
      "private overlays",
      "secrets",
      "raw full-file dumps"
    ],
    repomix: detectRepomix(filesystem, rootPackageJson),
    validationPolicy: validationPolicy(),
    taskStart: taskStartPolicy(),
    boundedWorkCycle: boundedWorkCyclePolicy()
  };
}

function stringLooksAbsolute(value) {
  return /^[A-Za-z]:[\\/]/.test(value) || value.startsWith("\\\\") || /^\/(?:Users|home|var|etc|tmp|private|opt|workspace|mnt)\b/.test(value);
}

function stringLooksSecret(value) {
  return (
    /sk-(?:proj|live|test)?-[A-Za-z0-9_-]{16,}/i.test(value) ||
    /(?:api[_-]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{8,}/i.test(value) ||
    /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/.test(value)
  );
}

function stringLooksPrivatePath(value) {
  const normalized = value.replace(/\\/g, "/").toLowerCase();
  return /(^|\/)(private|\.private)(\/|$)/.test(normalized) || /(^|\/)overlays\/private(\/|$)/.test(normalized);
}

function stringLooksWorktreePath(value) {
  const normalized = normalizeRelative(value).replace(/\\/g, "/");
  return FORBIDDEN_WORKTREE_PREFIXES.some((prefix) => (
    normalized === prefix.slice(0, -1) ||
    normalized.startsWith(prefix)
  ));
}

function stringLooksRawContent(value) {
  return value.length > 1000 && value.split(/\r?\n/).length > 12;
}

function inspectValue(value, pathStack, issues) {
  if (typeof value === "string") {
    const location = pathStack.join(".");
    const parentKey = pathStack.at(-2) ?? "";
    if (Buffer.byteLength(value, "utf8") > MAX_STRING_BYTES) {
      issues.push(`oversized string at ${location}`);
    }
    if (stringLooksAbsolute(value)) issues.push(`absolute path rejected at ${location}`);
    if (stringLooksSecret(value)) issues.push(`secret-like value rejected at ${location}`);
    if (parentKey !== "exclusions" && stringLooksPrivatePath(value)) {
      issues.push(`private overlay path rejected at ${location}`);
    }
    if (parentKey !== "exclusions" && (value === ".env" || value.startsWith(".env."))) {
      issues.push(`environment file path rejected at ${location}`);
    }
    if (parentKey !== "exclusions" && stringLooksWorktreePath(value)) {
      issues.push(`worktree checkout path rejected at ${location}`);
    }
    if (stringLooksRawContent(value)) issues.push(`raw full-file content rejected at ${location}`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectValue(entry, [...pathStack, String(index)], issues));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) inspectValue(nested, [...pathStack, key], issues);
  }
}

function normalizedSafeMapPath(relativePath) {
  const rawPath = String(relativePath || "");
  const normalized = path.posix.normalize(rawPath);
  const parts = rawPath.replace(/\\/g, "/").split("/");
  if (
    !rawPath ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    parts.includes("..") ||
    stringLooksAbsolute(rawPath) ||
    stringLooksPrivatePath(rawPath) ||
    stringLooksWorktreePath(rawPath)
  ) {
    return null;
  }
  return normalized;
}

function isPlainRecord(value) {
  return value !== null
    && typeof value === "object"
    && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function canonicalSafeMapPath(value, { allowRoot = false } = {}) {
  if (allowRoot && value === ".") return ".";
  const normalized = normalizedSafeMapPath(value);
  return normalized === value && !String(value).includes("\\") ? normalized : null;
}

function validatePathArray(value, label, issues, { allowRoot = false } = {}) {
  if (!Array.isArray(value)) {
    issues.push(`project map ${label} must be an array`);
    return;
  }
  for (const entry of value) {
    const safePath = canonicalSafeMapPath(entry, { allowRoot });
    if (!safePath) {
      issues.push(`invalid project map path at ${label}: ${String(entry ?? "")}`);
    }
  }
}

function validateStringArray(value, label, issues) {
  if (!Array.isArray(value)) {
    issues.push(`project map ${label} must be an array`);
    return;
  }
  if (value.some((entry) => typeof entry !== "string")) {
    issues.push(`project map ${label} must contain only strings`);
  }
}

function validateRequiredStructure(projectMap, issues) {
  if (projectMap?.generatedBy !== "ai-agents-skills-toolkit") {
    issues.push("project map generatedBy must be ai-agents-skills-toolkit");
  }
  if (
    typeof projectMap?.generatedAtUtc !== "string"
    || !Number.isFinite(Date.parse(projectMap.generatedAtUtc))
  ) {
    issues.push("project map generatedAtUtc must be an ISO timestamp");
  }
  if (!isPlainRecord(projectMap?.toolkit)) issues.push("project map toolkit must be an object");
  if (!isPlainRecord(projectMap?.target)) issues.push("project map target must be an object");
  if (projectMap?.target?.gitHeadPosture !== "provenance-advisory") {
    issues.push("project map target.gitHeadPosture must be provenance-advisory");
  }
  if (
    projectMap?.target?.gitHead !== null
    && (
      typeof projectMap?.target?.gitHead !== "string"
      || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u.test(projectMap.target.gitHead)
    )
  ) {
    issues.push("project map target.gitHead must be a canonical Git object ID or null");
  }
  if (projectMap?.target?.gitBranch !== null && typeof projectMap?.target?.gitBranch !== "string") {
    issues.push("project map target.gitBranch must be a string or null");
  }
  if (typeof projectMap?.target?.gitDirty !== "boolean") {
    issues.push("project map target.gitDirty must be boolean");
  }

  if (!Array.isArray(projectMap?.repoRoots)) {
    issues.push("project map repoRoots must be an array");
  } else {
    for (const [index, entry] of projectMap.repoRoots.entries()) {
      if (!isPlainRecord(entry)) {
        issues.push(`project map repoRoots.${index} must be an object`);
        continue;
      }
      validatePathArray([entry.path], `repoRoots.${index}.path`, issues, { allowRoot: true });
      validatePathArray(entry.evidence, `repoRoots.${index}.evidence`, issues);
    }
  }
  validatePathArray(projectMap?.keyFiles, "keyFiles", issues);
  validatePathArray(projectMap?.sourceLocations, "sourceLocations", issues, { allowRoot: true });
  validatePathArray(projectMap?.testLocations, "testLocations", issues, { allowRoot: true });
  validatePathArray(projectMap?.configFiles, "configFiles", issues);

  if (!isPlainRecord(projectMap?.packageManager)) {
    issues.push("project map packageManager must be an object");
  } else {
    if (!["npm", "pnpm", "yarn", "bun", "none"].includes(projectMap.packageManager.manager)) {
      issues.push("project map packageManager.manager is invalid");
    }
    validatePathArray(projectMap.packageManager.evidence, "packageManager.evidence", issues);
  }
  if (!Array.isArray(projectMap?.scripts)) {
    issues.push("project map scripts must be an array");
  } else {
    for (const [index, script] of projectMap.scripts.entries()) {
      if (!isPlainRecord(script)) {
        issues.push(`project map scripts.${index} must be an object`);
        continue;
      }
      validatePathArray([script.path], `scripts.${index}.path`, issues);
      if (typeof script.name !== "string") issues.push(`project map scripts.${index}.name must be a string`);
      if (typeof script.command !== "string") issues.push(`project map scripts.${index}.command must be a string`);
    }
  }
  validateStringArray(projectMap?.validationCommands, "validationCommands", issues);

  if (!isPlainRecord(projectMap?.selectedToolkitAssets)) {
    issues.push("project map selectedToolkitAssets must be an object");
  } else {
    for (const assetType of ["agents", "profiles", "skills"]) {
      validateStringArray(
        projectMap.selectedToolkitAssets[assetType],
        `selectedToolkitAssets.${assetType}`,
        issues
      );
    }
  }
  validateStringArray(projectMap?.exclusions, "exclusions", issues);
  if (!isPlainRecord(projectMap?.repomix)) issues.push("project map repomix must be an object");

  if (!isDeepStrictEqual(projectMap?.validationPolicy, validationPolicy())) {
    issues.push("project map validationPolicy must match the canonical evidence classes and three validation lanes");
  }
  if (!isDeepStrictEqual(projectMap?.taskStart?.progressiveDisclosure, taskStartPolicy().progressiveDisclosure)) {
    issues.push("project map taskStart.progressiveDisclosure must preserve advisory 200-line semantics");
  }
  if (!isDeepStrictEqual(projectMap?.taskStart, taskStartPolicy())) {
    issues.push("project map taskStart must match the canonical progressive-disclosure policy");
  }
  if (!isDeepStrictEqual(projectMap?.boundedWorkCycle, boundedWorkCyclePolicy())) {
    issues.push("project map boundedWorkCycle must match the canonical bounded non-looping cycle");
  }
}

function validateStalenessHashes(projectMap, issues, filesystem) {
  const hashes = projectMap?.target?.stalenessHashes;
  if (!isPlainRecord(hashes) || !Array.isArray(hashes.files)) {
    issues.push("project map target.stalenessHashes.files must be an array");
    if (!isPlainRecord(hashes) || typeof hashes?.aggregateSha256 !== "string") {
      issues.push("project map target.stalenessHashes.aggregateSha256 must be a sha256 digest");
    }
    return;
  }

  const paths = [];
  for (const entry of hashes.files) {
    const relativePath = String(entry?.path || "");
    const normalizedPath = canonicalSafeMapPath(relativePath);
    if (!normalizedPath) {
      issues.push(`invalid staleness hash path: ${relativePath}`);
      continue;
    }
    paths.push(normalizedPath);
    if (!/^[a-f0-9]{64}$/.test(String(entry?.sha256 || ""))) {
      issues.push(`missing staleness hash for: ${normalizedPath}`);
      continue;
    }
    if (!filesystem) continue;
    const observedSha256 = filesystem.sha256(normalizedPath);
    if (!observedSha256) {
      issues.push(`unsafe or missing hashed file: ${normalizedPath}`);
      continue;
    }
    if (observedSha256 !== entry.sha256) issues.push(`stale file hash: ${normalizedPath}`);
  }

  const sortedPaths = [...new Set(paths)].sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(paths, sortedPaths)) {
    issues.push("project map target.stalenessHashes.files must use unique sorted canonical paths");
  }
  const expectedAggregate = sha256Text(
    hashes.files.map((entry) => `${String(entry?.path || "")}:${String(entry?.sha256 || "")}`).join("\n")
  );
  if (!/^[a-f0-9]{64}$/.test(String(hashes.aggregateSha256 || ""))) {
    issues.push("project map target.stalenessHashes.aggregateSha256 must be a sha256 digest");
  } else if (hashes.aggregateSha256 !== expectedAggregate) {
    issues.push("staleness aggregateSha256 mismatch");
  }
}

function compareRepositoryObservations(projectMap, targetRoot, issues) {
  let observed;
  try {
    observed = buildProjectMap({
      targetRoot,
      selectedAgents: Array.isArray(projectMap?.selectedToolkitAssets?.agents)
        ? projectMap.selectedToolkitAssets.agents
        : [],
      selectedProfiles: Array.isArray(projectMap?.selectedToolkitAssets?.profiles)
        ? projectMap.selectedToolkitAssets.profiles
        : [],
      selectedSkills: Array.isArray(projectMap?.selectedToolkitAssets?.skills)
        ? projectMap.selectedToolkitAssets.skills
        : [],
      toolkitCommit: projectMap?.toolkit?.commit ?? null,
      toolkitVersion: projectMap?.toolkit?.version ?? null
    });
  } catch {
    issues.push("repository observation rederivation failed");
    return;
  }

  for (const field of [
    "repoRoots",
    "keyFiles",
    "packageManager",
    "scripts",
    "validationCommands",
    "sourceLocations",
    "testLocations",
    "configFiles",
    "exclusions",
    "repomix",
    "validationPolicy",
    "taskStart",
    "boundedWorkCycle"
  ]) {
    if (!isDeepStrictEqual(projectMap?.[field], observed[field])) {
      issues.push(`repository observation mismatch: ${field}`);
    }
  }
  if (!isDeepStrictEqual(projectMap?.target?.stalenessHashes, observed.target.stalenessHashes)) {
    issues.push("repository observation mismatch: target.stalenessHashes");
  }
}

export function validateProjectMap(projectMap, { targetRoot } = {}) {
  const issues = [];
  const mapText = JSON.stringify(projectMap) ?? "null";
  if (Buffer.byteLength(mapText, "utf8") > MAX_MAP_BYTES) issues.push("oversized project map rejected");
  if (projectMap?.schemaVersion !== "1.0.0") issues.push("project map schemaVersion must be 1.0.0");
  if (projectMap?.mapType !== "project-context-preflight") issues.push("project map mapType must be project-context-preflight");
  inspectValue(projectMap, ["projectMap"], issues);

  validateRequiredStructure(projectMap, issues);
  let filesystem = null;
  if (targetRoot) {
    try {
      filesystem = new ProjectContextFilesystem(targetRoot);
    } catch (error) {
      issues.push(`unsafe project repository root: ${error.message}`);
    }
  }
  validateStalenessHashes(projectMap, issues, filesystem);
  if (filesystem) compareRepositoryObservations(projectMap, filesystem.root, issues);

  return issues;
}
