import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

export const PROJECT_MAP_RELATIVE_PATH = ".ai-toolkit/context/project-map.json";
export const PROJECT_MAP_MANIFEST_PATH = "context/project-map.json";
export const PROJECT_MAP_ASSET_NAME = "project-context-preflight";

const MAX_MAP_BYTES = 64 * 1024;
const MAX_STRING_BYTES = 4096;
const MAX_WALK_FILES = 2000;
const SKIP_DIRS = new Set([
  ".git",
  ".ai-toolkit",
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

function readJsonIfExists(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
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

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256Text(text) {
  return createHash("sha256").update(text).digest("hex");
}

function collectFiles(root, current = root, entries = []) {
  if (entries.length >= MAX_WALK_FILES || !existsSync(current)) return entries;
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) collectFiles(root, fullPath, entries);
      continue;
    }
    if (UNSAFE_FILE_NAMES.has(entry.name) || entry.name.startsWith(".env.")) continue;
    entries.push(fullPath);
    if (entries.length >= MAX_WALK_FILES) break;
  }
  return entries;
}

function relativeFrom(root, filePath) {
  return normalizeRelative(path.relative(root, filePath));
}

function expandWorkspacePattern(targetRoot, pattern) {
  const normalized = normalizeRelative(pattern);
  if (!normalized.endsWith("/*")) return [];
  const parent = path.join(targetRoot, ...normalized.slice(0, -2).split("/"));
  if (!existsSync(parent) || !statSync(parent).isDirectory()) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => normalizeRelative(`${normalized.slice(0, -2)}/${entry.name}`))
    .filter((relativePath) => existsSync(path.join(targetRoot, ...relativePath.split("/"), "package.json")));
}

function packageWorkspacePatterns(packageJson) {
  const workspaces = packageJson?.workspaces;
  if (Array.isArray(workspaces)) return workspaces;
  if (Array.isArray(workspaces?.packages)) return workspaces.packages;
  return [];
}

function detectRepoRoots(targetRoot, rootPackageJson) {
  const roots = [{ path: ".", evidence: [".git"] }];
  const workspaceRoots = [];
  for (const pattern of packageWorkspacePatterns(rootPackageJson)) {
    workspaceRoots.push(...expandWorkspacePattern(targetRoot, pattern));
  }
  for (const candidate of ["apps", "packages", "services"]) {
    const candidateRoot = path.join(targetRoot, candidate);
    if (!existsSync(candidateRoot) || !statSync(candidateRoot).isDirectory()) continue;
    for (const entry of readdirSync(candidateRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const relativePath = normalizeRelative(`${candidate}/${entry.name}`);
      if (existsSync(path.join(candidateRoot, entry.name, "package.json"))) workspaceRoots.push(relativePath);
    }
  }
  for (const root of sortUnique(workspaceRoots)) {
    roots.push({ path: root, evidence: [`${root}/package.json`] });
  }
  return roots;
}

function detectPackageManager(targetRoot, rootPackageJson) {
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
    if (existsSync(path.join(targetRoot, file))) evidence.push({ path: file, manager, kind: "lockfile" });
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

function packageJsonPaths(targetRoot, repoRoots) {
  return repoRoots
    .map((entry) => (entry.path === "." ? "package.json" : `${entry.path}/package.json`))
    .filter((relativePath) => existsSync(path.join(targetRoot, ...relativePath.split("/"))));
}

function collectScripts(targetRoot, repoRoots) {
  const scripts = [];
  for (const relativePath of packageJsonPaths(targetRoot, repoRoots)) {
    const packageJson = readJsonIfExists(path.join(targetRoot, ...relativePath.split("/")));
    for (const [name, command] of Object.entries(packageJson?.scripts ?? {})) {
      scripts.push({ path: relativePath, name, command: String(command) });
    }
  }
  return scripts.sort((left, right) => `${left.path}:${left.name}`.localeCompare(`${right.path}:${right.name}`));
}

function commandForScript(manager, scriptName) {
  if (manager === "none") return null;
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

function detectLocations(targetRoot, files) {
  const sourceLocations = [];
  const testLocations = [];
  const configFiles = [];
  const keyFiles = [];

  for (const relativePath of CONFIG_CANDIDATES) {
    if (existsSync(path.join(targetRoot, ...relativePath.split("/")))) {
      configFiles.push(relativePath);
      keyFiles.push(relativePath);
    }
  }

  for (const filePath of files) {
    const relativePath = relativeFrom(targetRoot, filePath);
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

function detectRepomix(targetRoot, rootPackageJson) {
  const configCandidates = [
    "repomix.config.json",
    "repomix.config.ts",
    "repomix.config.js",
    ".repomixrc",
    ".repomixrc.json"
  ];
  const evidence = [];
  for (const file of configCandidates) {
    if (existsSync(path.join(targetRoot, file))) evidence.push(file);
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

function stalenessHashes(targetRoot, keyFiles) {
  const files = [];
  for (const relativePath of keyFiles) {
    const fullPath = path.join(targetRoot, ...relativePath.split("/"));
    if (existsSync(fullPath) && statSync(fullPath).isFile()) {
      files.push({ path: relativePath, sha256: sha256File(fullPath) });
    }
  }
  return {
    files,
    aggregateSha256: sha256Text(files.map((entry) => `${entry.path}:${entry.sha256}`).join("\n"))
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
  const rootPackageJson = readJsonIfExists(path.join(targetRoot, "package.json"));
  const files = collectFiles(targetRoot);
  const repoRoots = detectRepoRoots(targetRoot, rootPackageJson);
  const packageManager = detectPackageManager(targetRoot, rootPackageJson);
  const scripts = collectScripts(targetRoot, repoRoots);
  const locations = detectLocations(targetRoot, files);
  const gitHead = gitOutput(targetRoot, ["rev-parse", "HEAD"]);
  const gitBranch = gitOutput(targetRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const gitDirty = Boolean(gitOutput(targetRoot, ["status", "--porcelain"]));
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
      gitBranch,
      gitDirty,
      stalenessHashes: stalenessHashes(targetRoot, keyFiles)
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
      ".ai-toolkit/private",
      "node_modules",
      "dist",
      "build",
      "coverage",
      "private overlays",
      "secrets",
      "raw full-file dumps"
    ],
    repomix: detectRepomix(targetRoot, rootPackageJson),
    taskStart: {
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
      }
    },
    boundedWorkCycle: {
      cycle: ["orient-from-map", "inspect-focused-context", "act-or-review", "verify", "stop-and-report"],
      loopAgents: "forbidden",
      stopOn: [
        "stale map",
        "repeated blocker",
        "missing owner approval",
        "unavailable validation",
        "no new evidence"
      ]
    }
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

export function validateProjectMap(projectMap, { targetRoot } = {}) {
  const issues = [];
  const mapText = JSON.stringify(projectMap);
  if (Buffer.byteLength(mapText, "utf8") > MAX_MAP_BYTES) issues.push("oversized project map rejected");
  if (projectMap?.schemaVersion !== "1.0.0") issues.push("project map schemaVersion must be 1.0.0");
  if (projectMap?.mapType !== "project-context-preflight") issues.push("project map mapType must be project-context-preflight");
  inspectValue(projectMap, ["projectMap"], issues);

  if (targetRoot && projectMap?.target?.gitHead) {
    const currentHead = gitOutput(targetRoot, ["rev-parse", "HEAD"]);
    if (currentHead && currentHead !== projectMap.target.gitHead) {
      issues.push(`stale git head: map has ${projectMap.target.gitHead}, current is ${currentHead}`);
    }
  }

  if (targetRoot && Array.isArray(projectMap?.target?.stalenessHashes?.files)) {
    for (const entry of projectMap.target.stalenessHashes.files) {
      const relativePath = String(entry.path || "");
      if (!relativePath || stringLooksAbsolute(relativePath) || stringLooksPrivatePath(relativePath)) continue;
      const fullPath = path.join(targetRoot, ...relativePath.split("/"));
      if (existsSync(fullPath) && statSync(fullPath).isFile()) {
        const actualHash = sha256File(fullPath);
        if (actualHash !== entry.sha256) issues.push(`stale file hash: ${relativePath}`);
      }
    }
  }

  return issues;
}

export function projectMapOutputPath(targetRoot) {
  return path.join(targetRoot, ...PROJECT_MAP_RELATIVE_PATH.split("/"));
}

export function writeProjectMap(targetRoot, projectMap) {
  const outputPath = projectMapOutputPath(targetRoot);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(projectMap, null, 2)}\n`, "utf8");
  return outputPath;
}

