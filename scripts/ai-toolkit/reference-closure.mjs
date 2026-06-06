import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync
} from "node:fs";
import path from "node:path";

export const FORBIDDEN_ACTIVE_SKILL_ALIASES = [
  "riss-governance",
  "riss-agent-governance",
  "riss-skill-governance",
  "vd-premium-uiux"
];

export const SUPPORT_ASSET_TYPES = [
  { prefix: "methods/", type: "method" },
  { prefix: "templates/tooling/", type: "template" },
  { prefix: "docs/", type: "support-doc" }
];

const SCANNED_ROOTS = [
  "AGENTS.md",
  "skills",
  ".agents/skills",
  "profiles",
  "compiled-agents",
  ".ai-toolkit/skills",
  ".ai-toolkit/profiles",
  ".ai-toolkit/compiled-agents",
  ".ai-toolkit/agents",
  ".ai-toolkit/runtime-agents",
  ".ai-toolkit/registries",
  ".ai-toolkit/tool-packs",
  ".ai-toolkit/methods",
  ".ai-toolkit/templates",
  ".ai-toolkit/docs",
  ".ai-toolkit/manifest.json",
  "docs"
];

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".cache",
  "temp",
  "scratch"
]);

const SCANNED_EXTENSIONS = new Set([
  ".md",
  ".json",
  ".toml",
  ".yaml",
  ".yml",
  ".txt"
]);

const REFERENCE_PATTERN = /(?:^|[^\w./-])((?:\.ai-toolkit\/)?(?:(?:\.agents\/skills)|skills|profiles|compiled-agents|agents|registries|methods|templates\/tooling|docs)\/[A-Za-z0-9._~+@% -]+(?:\/[A-Za-z0-9._~+@% -]+)*\.(?:md|json|toml|ya?ml))(?:#[A-Za-z0-9._-]+)?/g;
const HISTORICAL_MARKER_PATTERN = /\b(?:historical|history|legacy|deprecated|removed|migration|archive|not active|former|old alias)\b/i;
const PROJECT_LOCAL_MARKER_PATTERN = /\b(?:project-local|target project|target repository|project sync|mock sync|rehearsal|would be copied|must not be created|must not be overwritten)\b/i;
const PROJECT_LOCAL_REFERENCE_PATTERNS = [
  /^docs\/ai\/(?:STATE|DECISIONS|PROJECT_CONTEXT|RELEASE_GATES)\.md$/,
  /^\.ai-toolkit\/profiles\/[a-z0-9-]+-profile\.md$/
];

export function normalizeRelative(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function rootPath(root, relativePath) {
  return path.join(root, ...normalizeRelative(relativePath).split("/"));
}

function pathExists(root, relativePath) {
  return existsSync(rootPath(root, relativePath));
}

function isFile(root, relativePath) {
  const fullPath = rootPath(root, relativePath);
  return existsSync(fullPath) && statSync(fullPath).isFile();
}

function isScannableFile(relativePath) {
  const basename = path.basename(relativePath);
  if (basename === "AGENTS.md") return true;
  return SCANNED_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

function walkFiles(root, relativePath) {
  const normalized = normalizeRelative(relativePath);
  const fullPath = rootPath(root, normalized);
  if (!existsSync(fullPath)) return [];
  const stats = statSync(fullPath);
  if (stats.isFile()) return isScannableFile(normalized) ? [normalized] : [];
  if (!stats.isDirectory()) return [];

  const output = [];
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const child = `${normalized}/${entry.name}`;
    if (entry.isDirectory()) output.push(...walkFiles(root, child));
    else if (isScannableFile(child)) output.push(child);
  }
  return output;
}

export function collectDefaultScanFiles(root) {
  return [...new Set(SCANNED_ROOTS.flatMap((scanRoot) => walkFiles(root, scanRoot)))].sort();
}

export function supportAssetTypeForSourcePath(relativePath) {
  const normalized = normalizeRelative(relativePath).replace(/^\.ai-toolkit\//, "");
  return SUPPORT_ASSET_TYPES.find((entry) => normalized.startsWith(entry.prefix))?.type ?? null;
}

export function supportDestinationForSourcePath(relativePath) {
  const normalized = normalizeRelative(relativePath).replace(/^\.ai-toolkit\//, "");
  return `.ai-toolkit/${normalized}`;
}

function stripTrailingPunctuation(reference) {
  return normalizeRelative(reference).replace(/[),.;:]+$/, "");
}

export function extractReferences(text) {
  const references = [];
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    references.push(stripTrailingPunctuation(match[1]));
  }
  return [...new Set(references)];
}

function supportSourcePathFromReference(reference) {
  const normalized = stripTrailingPunctuation(reference).replace(/^\.ai-toolkit\//, "");
  return supportAssetTypeForSourcePath(normalized) ? normalized : null;
}

function resolveReference(root, sourceFile, reference) {
  const normalized = stripTrailingPunctuation(reference);
  const sourceIsPackaged = normalizeRelative(sourceFile).startsWith(".ai-toolkit/");

  if (normalized.startsWith(".ai-toolkit/")) {
    return {
      expectedPath: normalized,
      exists: pathExists(root, normalized)
    };
  }

  const sourcePath = supportSourcePathFromReference(normalized);
  if (sourceIsPackaged && sourcePath) {
    const expectedPath = supportDestinationForSourcePath(sourcePath);
    return {
      expectedPath,
      exists: pathExists(root, expectedPath)
    };
  }

  return {
    expectedPath: normalized,
    exists: pathExists(root, normalized)
  };
}

function shouldValidateReference(reference) {
  const normalized = stripTrailingPunctuation(reference);
  return Boolean(supportSourcePathFromReference(normalized))
    || normalized.startsWith(".ai-toolkit/")
    || normalized.startsWith(".agents/skills/")
    || normalized.startsWith("skills/");
}

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function lineWindow(lines, lineNumber) {
  const index = lineNumber - 1;
  return lines.slice(Math.max(0, index - 2), Math.min(lines.length, index + 3)).join("\n");
}

function isHistoricalAllowed(file, context) {
  const normalized = normalizeRelative(file);
  const historicalSurface = normalized.startsWith("docs/")
    || normalized.startsWith(".ai-toolkit/docs/")
    || normalized.startsWith("sources/")
    || normalized.startsWith(".ai-toolkit/sources/");
  return historicalSurface && HISTORICAL_MARKER_PATTERN.test(context);
}

function isProjectLocalPlaceholderAllowed(file, reference, context) {
  const normalizedFile = normalizeRelative(file);
  if (!normalizedFile.startsWith("docs/") && !normalizedFile.startsWith(".ai-toolkit/docs/")) {
    return false;
  }
  const normalizedReference = normalizeRelative(reference);
  const fileContextAllowsProjectLocal = /(?:PROJECT_SYNC_WORKFLOW|UPDATE_POLICY|MOCK_SYNC_REHEARSAL|PROJECT_SYNC_VALIDATION_REPORT)/i.test(normalizedFile);
  return PROJECT_LOCAL_REFERENCE_PATTERNS.some((pattern) => pattern.test(normalizedReference))
    && (PROJECT_LOCAL_MARKER_PATTERN.test(context) || fileContextAllowsProjectLocal);
}

function collectForbiddenAliasFailures(file, text) {
  const failures = [];
  const lines = text.split(/\r?\n/);
  for (const alias of FORBIDDEN_ACTIVE_SKILL_ALIASES) {
    const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
    for (const match of text.matchAll(pattern)) {
      const lineNumber = lineNumberForIndex(text, match.index ?? 0);
      const context = lineWindow(lines, lineNumber);
      if (isHistoricalAllowed(file, context)) continue;
      failures.push({
        check: "forbidden active skill alias",
        location: `${file}:${lineNumber}`,
        message: `active reference to removed skill alias '${alias}'`
      });
    }
  }
  return failures;
}

function readJsonIfPresent(root, relativePath) {
  if (!isFile(root, relativePath)) return null;
  return JSON.parse(readFileSync(rootPath(root, relativePath), "utf8"));
}

function installManifestAssets(root) {
  const manifest = readJsonIfPresent(root, ".ai-toolkit/.ai-toolkit-manifest.json");
  const assets = new Map();
  for (const asset of Array.isArray(manifest?.assets) ? manifest.assets : []) {
    if (asset?.path) assets.set(normalizeRelative(String(asset.path)), asset);
  }
  return assets;
}

function embeddedManifestTargets(root) {
  const manifest = readJsonIfPresent(root, ".ai-toolkit/manifest.json");
  return new Set((manifest?.mirrors || []).map((mirror) => normalizeRelative(String(mirror.target || ""))).filter(Boolean));
}

function manifestFailuresForReference(root, sourceFile, resolvedPath) {
  const normalized = normalizeRelative(resolvedPath);
  const sourcePath = normalized.replace(/^\.ai-toolkit\//, "");
  const assetType = supportAssetTypeForSourcePath(sourcePath);
  if (!assetType || !normalized.startsWith(".ai-toolkit/")) return [];

  const failures = [];
  const installAssets = installManifestAssets(root);
  if (installAssets.size > 0) {
    const asset = installAssets.get(sourcePath);
    if (!asset) {
      failures.push({
        check: "project install manifest closure",
        location: sourceFile,
        message: `manifest is missing ${assetType} asset: ${sourcePath}`
      });
    } else if (asset.type !== assetType) {
      failures.push({
        check: "project install manifest closure",
        location: sourceFile,
        message: `manifest asset ${sourcePath} has type '${asset.type}', expected '${assetType}'`
      });
    }
  }

  const embeddedTargets = embeddedManifestTargets(root);
  if (embeddedTargets.size > 0 && !embeddedTargets.has(normalized)) {
    failures.push({
      check: "embedded package manifest closure",
      location: sourceFile,
      message: `.ai-toolkit/manifest.json mirrors missing target: ${normalized}`
    });
  }

  return failures;
}

export function collectReferencedSupportAssets({ root, seedFiles, includeTransitive = true }) {
  const queue = [...new Set(seedFiles.map(normalizeRelative))];
  const visited = new Set();
  const supportAssets = new Map();

  while (queue.length > 0) {
    const file = queue.shift();
    if (!file || visited.has(file) || !isFile(root, file)) continue;
    visited.add(file);

    const text = readFileSync(rootPath(root, file), "utf8");
    for (const reference of extractReferences(text)) {
      const sourcePath = supportSourcePathFromReference(reference);
      if (!sourcePath || !isFile(root, sourcePath)) continue;
      const type = supportAssetTypeForSourcePath(sourcePath);
      supportAssets.set(sourcePath, {
        type,
        name: sourcePath,
        sourcePath,
        destinationPath: supportDestinationForSourcePath(sourcePath)
      });
      if (includeTransitive && !visited.has(sourcePath)) queue.push(sourcePath);
    }
  }

  return [...supportAssets.values()].sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));
}

export function collectReferenceClosureFailures({ root = process.cwd(), scanFiles } = {}) {
  const normalizedRoot = path.resolve(root);
  const files = scanFiles ? scanFiles.map(normalizeRelative).filter((file) => isFile(normalizedRoot, file)) : collectDefaultScanFiles(normalizedRoot);
  const failures = [];

  for (const file of files) {
    const text = readFileSync(rootPath(normalizedRoot, file), "utf8");
    failures.push(...collectForbiddenAliasFailures(file, text));

    for (const reference of extractReferences(text)) {
      if (!shouldValidateReference(reference)) {
        continue;
      }
      const lineNumber = lineNumberForIndex(text, text.indexOf(reference));
      const context = lineWindow(text.split(/\r?\n/), lineNumber);
      if (isProjectLocalPlaceholderAllowed(file, reference, context)) {
        continue;
      }
      const resolved = resolveReference(normalizedRoot, file, reference);
      if (!resolved.exists) {
        failures.push({
          check: "reference closure",
          location: file,
          message: `missing reference '${reference}' expected at '${resolved.expectedPath}'`
        });
        continue;
      }
      failures.push(...manifestFailuresForReference(normalizedRoot, file, resolved.expectedPath));
    }
  }

  return failures;
}
