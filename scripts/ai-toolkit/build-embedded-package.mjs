#!/usr/bin/env node
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import {
  closeSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmdirSync,
  rmSync
} from "node:fs";
import { createHash } from "node:crypto";
import { isUtf8 } from "node:buffer";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const AI_ROOT = ".ai-toolkit";
const BUILDER_RELATIVE_PATH = "scripts/ai-toolkit/build-embedded-package.mjs";
const VERIFIED_SELF_DIGEST_PARAMETER = "verifiedBuilderSha256";
const EMBEDDED_SCHEMA_VERSION = "2.0.0";
const EXPECTED_DIGEST_MODE = "sha256-utf8-lf-v1";
const CANONICAL_TEXT_EXTENSIONS = new Set([".json", ".md", ".mjs", ".toml"]);
const CANONICAL_TEXT_BASENAMES = new Set(["VERSION"]);
const DELIVERY_KERNEL_ROOT = `${AI_ROOT}/runtime/delivery-kernel`;
const DELIVERY_KERNEL_REGISTRIES = [
  "agents.registry.json",
  "domain-packs.registry.json",
  "routing-matrix.json",
  "skills.registry.json",
  "tools.registry.json"
];
const SCRIPT_PROVENANCE_DIRECTORIES = ["scripts", "scripts/ai-toolkit"];
let outputManager = null;
let canonicalInputDigests = new Map();
let canonicalDirectoryEntries = new Map();
let canonicalProjectAgents = [];
let bootstrapCanonicalInputDigests = new Map();
let assertPathContained;
let assertRegularFileWithin;
let ManagedFilesystem;
let recoverManagedDirectoryTransaction;
let runManagedDirectoryTransaction;
let snapshotManagedTree;
let ACTIVE_SKILLS;
let INTERNAL_HELPER_SKILLS;
let SOURCE_OF_TRUTH_MAP;
let TOOLKIT_VERSION;
let collectReferencedSupportAssets;
let validateSourceCatalog;
let CANONICAL_TEXT_DIGEST_MODE;
let canonicalTextSha256;
let outputEol = null;
function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function readStrictUtf8(content, label) {
  if (!(content instanceof Uint8Array) || !isUtf8(content)) {
    throw new Error(`${label} must be valid UTF-8 text`);
  }
  return Buffer.from(content.buffer, content.byteOffset, content.byteLength).toString("utf8");
}

function detectUniformEol(content, label) {
  const text = readStrictUtf8(content, label);
  const withoutCrLf = text.replaceAll("\r\n", "");
  const hasCrLf = text.includes("\r\n");
  const hasLf = withoutCrLf.includes("\n");
  const hasLoneCr = withoutCrLf.includes("\r");
  if (hasLoneCr || (hasCrLf && hasLf)) {
    throw new Error(`${label} must use one uniform LF or CRLF checkout line ending`);
  }
  if (!hasCrLf && !hasLf) {
    throw new Error(`${label} must contain a checkout line ending`);
  }
  return hasCrLf ? "\r\n" : "\n";
}

function renderCheckoutText(text, label) {
  if (typeof text !== "string") throw new Error(`${label} must be text`);
  if (outputEol !== "\n" && outputEol !== "\r\n") {
    throw new Error("embedded builder checkout line ending is not initialized");
  }
  const normalized = text.replace(/\r\n?/gu, "\n");
  const terminated = normalized.endsWith("\n") ? normalized : `${normalized}\n`;
  return outputEol === "\n" ? terminated : terminated.replaceAll("\n", "\r\n");
}

function assertCanonicalTextPath(relativePath, label) {
  const normalized = toSlash(relativePath);
  if (
    !CANONICAL_TEXT_EXTENSIONS.has(path.posix.extname(normalized))
    && !CANONICAL_TEXT_BASENAMES.has(path.posix.basename(normalized))
  ) {
    throw new Error(`${label} uses an unreviewed canonical text file type: ${relativePath}`);
  }
}

function comparisonPath(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function assertBootstrapPathIdentity(filePath, label, relativePath) {
  const resolved = path.resolve(filePath);
  const real = realpathSync.native(resolved);
  if (comparisonPath(real) !== comparisonPath(resolved)) {
    throw new Error(
      `${label} must not traverse a junction, reparse point, or path alias: ${relativePath}`
    );
  }
}

function assertBootstrapSingleLink(stats, label, relativePath) {
  if (stats.nlink !== 1) {
    throw new Error(`${label} must not be a hard-linked file (nlink must equal 1): ${relativePath}`);
  }
}

function sameBootstrapFile(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function bootstrapRegularFile(relativePath, label) {
  const repositoryRoot = path.resolve(ROOT);
  const repositoryStats = lstatSync(repositoryRoot);
  if (repositoryStats.isSymbolicLink() || !repositoryStats.isDirectory()) {
    throw new Error(`${label} repository root must be a real directory: ${repositoryRoot}`);
  }
  assertBootstrapPathIdentity(repositoryRoot, label, repositoryRoot);

  const target = rootPath(relativePath);
  const relative = path.relative(repositoryRoot, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must remain a repository-contained file: ${relativePath}`);
  }
  let current = repositoryRoot;
  const segments = relative.split(path.sep);
  for (const [index, segment] of segments.entries()) {
    current = path.join(current, segment);
    const stats = lstatSync(current);
    if (stats.isSymbolicLink()) {
      throw new Error(
        `${label} must not traverse a symbolic link, junction, or reparse point: ${relativePath}`
      );
    }
    assertBootstrapPathIdentity(current, label, relativePath);
    if (index < segments.length - 1 && !stats.isDirectory()) {
      throw new Error(`${label} parent must be a directory: ${relativePath}`);
    }
    if (index === segments.length - 1 && !stats.isFile()) {
      throw new Error(`${label} must be a regular file: ${relativePath}`);
    }
    if (index === segments.length - 1) {
      assertBootstrapSingleLink(stats, label, relativePath);
    }
  }
  return target;
}

function readBootstrapRegularFile(relativePath, label) {
  const modulePath = bootstrapRegularFile(relativePath, label);
  const pathStats = lstatSync(modulePath);
  const descriptor = openSync(modulePath, "r");
  try {
    const openedStats = fstatSync(descriptor);
    if (!openedStats.isFile()) {
      throw new Error(`${label} opened target must be a regular file: ${relativePath}`);
    }
    assertBootstrapSingleLink(openedStats, label, relativePath);
    if (!sameBootstrapFile(pathStats, openedStats)) {
      throw new Error(`${label} changed identity while opening: ${relativePath}`);
    }

    const content = readFileSync(descriptor);
    const recheckedPath = bootstrapRegularFile(relativePath, `${label} recheck`);
    const recheckedStats = lstatSync(recheckedPath);
    if (!sameBootstrapFile(openedStats, recheckedStats)) {
      throw new Error(`${label} changed identity while loading: ${relativePath}`);
    }
    if (rawSha256(readFileSync(recheckedPath)) !== rawSha256(content)) {
      throw new Error(`${label} changed content while loading: ${relativePath}`);
    }
    return { content, modulePath };
  } finally {
    closeSync(descriptor);
  }
}

async function importDigestBoundModule(relativePath, label, { bootstrap = false } = {}) {
  const bootstrapFile = bootstrap ? readBootstrapRegularFile(relativePath, label) : null;
  const modulePath = bootstrapFile
    ? bootstrapFile.modulePath
    : assertRegularFileWithin(ROOT, rootPath(relativePath), label);
  const content = bootstrapFile ? bootstrapFile.content : readFileSync(modulePath);
  const digest = rawSha256(content);
  const moduleUrl = `data:text/javascript;base64,${content.toString("base64")}#sha256=${digest}`;
  const loaded = await import(moduleUrl);
  const verifiedPath = bootstrap
    ? bootstrapRegularFile(relativePath, `${label} post-import recheck`)
    : assertRegularFileWithin(ROOT, rootPath(relativePath), `${label} recheck`);
  if (rawSha256(readFileSync(verifiedPath)) !== digest) {
    throw new Error(`${label} changed while loading: ${relativePath}`);
  }
  bootstrapCanonicalInputDigests.set(toSlash(relativePath), digest);
  return loaded;
}

async function loadDigestBoundCanonicalModules(selfDigest) {
  bootstrapCanonicalInputDigests = new Map([[BUILDER_RELATIVE_PATH, selfDigest]]);

  const builderSource = readBootstrapRegularFile(
    BUILDER_RELATIVE_PATH,
    "embedded builder checkout line-ending source"
  ).content;
  if (rawSha256(builderSource) !== selfDigest) {
    throw new Error("embedded builder changed before checkout line-ending detection");
  }
  outputEol = detectUniformEol(builderSource, "embedded builder checkout line-ending source");

  const safeFilesystem = await importDigestBoundModule(
    "install/safe-filesystem.mjs",
    "managed filesystem module",
    { bootstrap: true }
  );
  ({
    assertPathContained,
    assertRegularFileWithin,
    ManagedFilesystem,
    recoverManagedDirectoryTransaction,
    runManagedDirectoryTransaction,
    snapshotManagedTree
  } = safeFilesystem);
  const safeFilesystemPath = assertRegularFileWithin(
    ROOT,
    rootPath("install/safe-filesystem.mjs"),
    "managed filesystem module verified containment"
  );
  if (rawSha256(readFileSync(safeFilesystemPath)) !== bootstrapCanonicalInputDigests.get("install/safe-filesystem.mjs")) {
    throw new Error("managed filesystem module changed across bootstrap containment verification");
  }

  const canonicalDigest = await importDigestBoundModule(
    "scripts/ai-toolkit/kernel/canonical-digest.mjs",
    "canonical text digest module"
  );
  ({ CANONICAL_TEXT_DIGEST_MODE, canonicalTextSha256 } = canonicalDigest);
  if (
    CANONICAL_TEXT_DIGEST_MODE !== EXPECTED_DIGEST_MODE
    || typeof canonicalTextSha256 !== "function"
  ) {
    throw new Error(`canonical text digest module must implement ${EXPECTED_DIGEST_MODE}`);
  }

  const embeddedData = await importDigestBoundModule(
    "scripts/ai-toolkit/embedded-data.mjs",
    "embedded data module"
  );
  ({
    ACTIVE_SKILLS,
    INTERNAL_HELPER_SKILLS,
    SOURCE_OF_TRUTH_MAP,
    TOOLKIT_VERSION
  } = embeddedData);

  const referenceClosure = await importDigestBoundModule(
    "scripts/ai-toolkit/reference-closure.mjs",
    "reference closure module"
  );
  ({ collectReferencedSupportAssets } = referenceClosure);

  const sourceCatalogContract = await importDigestBoundModule(
    "scripts/ai-toolkit/kernel/source-catalog-contract.mjs",
    "source catalog contract module"
  );
  ({ validateSourceCatalog } = sourceCatalogContract);
}

function toSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

function outputRelativePath(relativePath) {
  const normalized = toSlash(relativePath);
  if (normalized === AI_ROOT) return ".";
  if (!normalized.startsWith(`${AI_ROOT}/`)) {
    throw new Error(`embedded builder output must stay below ${AI_ROOT}: ${relativePath}`);
  }
  return normalized.slice(AI_ROOT.length + 1);
}

function requireOutputManager() {
  if (!outputManager) throw new Error("embedded builder output manager is not initialized");
  return outputManager;
}

async function ensureDir(relativePath) {
  requireOutputManager().ensureDirectory(outputRelativePath(relativePath), "embedded package directory");
}

async function writeText(relativePath, text) {
  await ensureDir(path.dirname(relativePath));
  requireOutputManager().writeFile(
    outputRelativePath(relativePath),
    renderCheckoutText(text, `embedded output ${relativePath}`),
    "utf8",
    "embedded package file"
  );
}

async function writeJson(relativePath, value) {
  await writeText(relativePath, JSON.stringify(value, null, 2));
}

function recordCanonicalInput(relativePath, content) {
  const normalizedPath = toSlash(relativePath);
  const digest = rawSha256(content);
  const previous = canonicalInputDigests.get(normalizedPath);
  if (previous && previous !== digest) {
    throw new Error(`canonical input changed during generation: ${normalizedPath}`);
  }
  canonicalInputDigests.set(normalizedPath, digest);
  return content;
}

async function readCanonicalInput(relativePath) {
  const filePath = assertRegularFileWithin(ROOT, rootPath(relativePath), `canonical input ${relativePath}`);
  return recordCanonicalInput(relativePath, await readFile(filePath));
}

async function readJson(relativePath) {
  return JSON.parse((await readCanonicalInput(relativePath)).toString("utf8"));
}

async function readCanonicalDirectory(relativeDir) {
  const directoryPath = assertPathContained(
    ROOT,
    rootPath(relativeDir),
    `canonical input directory ${relativeDir}`
  );
  const entries = (await readdir(directoryPath, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  const normalizedDirectory = toSlash(relativeDir);
  const descriptor = entries.map((entry) => (
    `${entry.name}:${entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"}`
  ));
  const previous = canonicalDirectoryEntries.get(normalizedDirectory);
  if (previous && JSON.stringify(previous) !== JSON.stringify(descriptor)) {
    throw new Error(`canonical input directory changed during generation: ${normalizedDirectory}`);
  }
  canonicalDirectoryEntries.set(normalizedDirectory, descriptor);
  return entries;
}

async function walkFiles(relativeDir, output = []) {
  const entries = await readCanonicalDirectory(relativeDir);
  for (const entry of entries) {
    const child = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      await walkFiles(child, output);
    } else {
      output.push(child);
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
}

async function copyFileTracked(source, target, mirrors, mode = "byte-identical") {
  const sourceContent = await readCanonicalInput(source);
  await ensureDir(path.dirname(target));
  requireOutputManager().copyFileFrom(
    ROOT,
    rootPath(source),
    outputRelativePath(target),
    `embedded mirror ${source}`
  );
  if (rawSha256(sourceContent) !== rawSha256Output(target)) {
    throw new Error(`canonical input changed while copying embedded mirror: ${source}`);
  }
  mirrors.push({
    source,
    target,
    mode,
    sha256: sha256Output(target)
  });
}

function rawSha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function sha256Source(relativePath) {
  assertCanonicalTextPath(relativePath, "canonical digest source");
  return canonicalTextSha256(
    await readCanonicalInput(relativePath),
    `canonical digest source ${relativePath}`
  );
}

function sha256Output(relativePath) {
  assertCanonicalTextPath(relativePath, "embedded digest target");
  return canonicalTextSha256(
    requireOutputManager().readFile(outputRelativePath(relativePath), null, `embedded digest ${relativePath}`),
    `embedded digest ${relativePath}`
  );
}

function rawSha256Output(relativePath) {
  return rawSha256(
    requireOutputManager().readFile(outputRelativePath(relativePath), null, `embedded byte digest ${relativePath}`)
  );
}

function canonicalDirectoryDescriptor(relativeDir) {
  const directoryPath = assertPathContained(
    ROOT,
    rootPath(relativeDir),
    `canonical input directory ${relativeDir}`
  );
  return readdirSync(directoryPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => `${entry.name}:${entry.isDirectory() ? "directory" : entry.isFile() ? "file" : "other"}`);
}

function assertCanonicalInputsUnchanged() {
  for (const [relativePath, expectedDigest] of canonicalInputDigests) {
    const filePath = assertRegularFileWithin(
      ROOT,
      rootPath(relativePath),
      `canonical input recheck ${relativePath}`
    );
    if (rawSha256(readFileSync(filePath)) !== expectedDigest) {
      throw new Error(`canonical input changed during generation: ${relativePath}`);
    }
  }
  for (const [relativeDir, expectedEntries] of canonicalDirectoryEntries) {
    const actualEntries = canonicalDirectoryDescriptor(relativeDir);
    if (JSON.stringify(actualEntries) !== JSON.stringify(expectedEntries)) {
      throw new Error(`canonical input directory changed during generation: ${relativeDir}`);
    }
  }
}

function sourceRecordPath(toolId) {
  return `${AI_ROOT}/sources/records/${toolId}.md`;
}

const SOURCE_REFERENCE_DISPOSITIONS = new Set([
  "SYNCED_ADOPTED",
  "SYNCED_REFERENCE",
  "SYNCED_PLUGIN_DELEGATED"
]);

function sourceStateLabel(value) {
  return String(value).toLowerCase().replaceAll("_", "-");
}

function sourceRevisionLabel(revision) {
  if (revision === null || revision === undefined) return "none";
  return `${revision.kind}:${revision.value}`;
}

function sourceCatalogEvidenceInstant(sourceCatalog) {
  const instants = [
    sourceCatalog.migratedAt,
    ...sourceCatalog.sources.flatMap((source) => [source.monitor.checkedAt, source.review.reviewedAt])
  ].filter((value) => typeof value === "string");
  if (instants.length === 0) {
    throw new Error("SourceCatalog v2 must expose a deterministic evidence instant");
  }
  return instants.sort((left, right) => left.localeCompare(right)).at(-1);
}

function catalogSourceReferenceReason(source, evidenceInstant) {
  if (source.monitor.state !== "CURRENT") {
    return `monitor-${sourceStateLabel(source.monitor.state)}`;
  }
  if (
    source.review.expiresAt !== null
    && Date.parse(source.review.expiresAt) <= Date.parse(evidenceInstant)
  ) {
    return "review-expired";
  }
  if (source.review.state !== "REVIEWED_CURRENT") {
    return `review-${sourceStateLabel(source.review.state)}`;
  }
  if (source.review.currentReceipt === null) return "receipt-missing";
  if (!SOURCE_REFERENCE_DISPOSITIONS.has(source.review.disposition)) {
    return `disposition-${sourceStateLabel(source.review.disposition ?? "missing")}`;
  }
  return null;
}

function sourceCatalogMatchesTool(source, tool) {
  return source.dependentResourceIds.includes(tool.id)
    && source.affectedArtifacts.includes(tool.sourceRecordPath);
}

function resolveSourceForTool(sourceCatalog, tool) {
  const matches = sourceCatalog.sources.filter((source) => sourceCatalogMatchesTool(source, tool));
  if (matches.length !== 1) {
    const state = matches.length === 0 ? "missing" : "ambiguous";
    throw new Error(`SourceCatalog v2 mapping is ${state} for tool ${tool.id}`);
  }
  return matches[0];
}

function assertSourceRecordTargetCoverage(sourceCatalog, toolRegistry) {
  const toolsByPath = new Map();
  for (const tool of toolRegistry.tools.filter((entry) => entry.sourceRecordPath !== null)) {
    if (toolsByPath.has(tool.sourceRecordPath)) {
      throw new Error(`tools registry source record path is duplicated: ${tool.sourceRecordPath}`);
    }
    toolsByPath.set(tool.sourceRecordPath, tool);
  }

  const sourcesByPath = new Map();
  for (const source of sourceCatalog.sources) {
    for (const artifact of source.affectedArtifacts.filter(
      (entry) => entry.startsWith(`${AI_ROOT}/sources/records/`) && entry.endsWith(".md")
    )) {
      if (sourcesByPath.has(artifact)) {
        throw new Error(`SourceCatalog v2 source record target is ambiguous: ${artifact}`);
      }
      sourcesByPath.set(artifact, source);
      const tool = toolsByPath.get(artifact);
      if (!tool) {
        throw new Error(`SourceCatalog v2 source record ${artifact} is missing from tools registry`);
      }
      if (!source.dependentResourceIds.includes(tool.id)) {
        throw new Error(`SourceCatalog v2 mapping is missing for tool ${tool.id}`);
      }
    }
  }

  for (const [artifact, tool] of toolsByPath) {
    if (!sourcesByPath.has(artifact)) {
      throw new Error(`SourceCatalog v2 mapping is missing for tool ${tool.id}`);
    }
  }
}

function sourceStateRecord(tool, source, evidenceInstant) {
  const referenceReason = catalogSourceReferenceReason(source, evidenceInstant)
    ?? "receipt-chain-validation-required";
  return `# ${tool.name} Source State Mirror

- Catalog source ID: ${source.id}
- Dependent resource ID: ${tool.id}
- Canonical catalog: sources/source-watchlist.json
- Canonical source record: ${source.sourceRecordPath ?? "none"}
- Catalog evidence instant: ${evidenceInstant}
- Monitor state: ${source.monitor.state}
- Observed revision: ${sourceRevisionLabel(source.monitor.observedRevision)}
- Content digest: ${source.monitor.contentDigest ?? "none"}
- Review state: ${source.review.state}
- Reviewed revision: ${sourceRevisionLabel(source.review.reviewedRevision)}
- Reviewed digest: ${source.review.reviewedDigest ?? "none"}
- Review expires at: ${source.review.expiresAt ?? "none"}
- Current receipt: ${source.review.currentReceipt ?? "none"}
- Disposition: ${source.review.disposition ?? "none"}
- Runtime posture: ${source.runtimePosture}
- Reference eligibility: BLOCKED
- Dependent-resource source state: BLOCKED
- Runtime eligibility: false
- Eligibility reason: ${referenceReason}
- neverAutoImport: true

## Boundary

This generated compatibility record mirrors SourceCatalog v2. It is not an independent inventory, review receipt, install approval, runtime activation, detection evidence, or execution proof. Source freshness never activates its dependent tool, and live policy may impose stricter time-based blocking.
`;
}

async function sourceStateMirrors() {
  const [toolRegistry, sourceCatalog] = await Promise.all([
    readJson("registries/tools.registry.json"),
    readJson("sources/source-watchlist.json")
  ]);
  if (toolRegistry.schemaVersion !== "1.0.0" || !Array.isArray(toolRegistry.tools)) {
    throw new Error("tools registry must use schemaVersion 1.0.0 and contain tools");
  }
  const evidenceInstant = sourceCatalogEvidenceInstant(sourceCatalog);
  validateSourceCatalog(sourceCatalog, { now: evidenceInstant });
  assertSourceRecordTargetCoverage(sourceCatalog, toolRegistry);

  return toolRegistry.tools
    .filter((tool) => tool.sourceRecordPath !== null)
    .map((tool) => {
      const expectedPath = sourceRecordPath(tool.id);
      if (tool.sourceRecordPath !== expectedPath) {
        throw new Error(`tool ${tool.id} sourceRecordPath must be ${expectedPath}`);
      }
      return {
        path: expectedPath,
        text: sourceStateRecord(tool, resolveSourceForTool(sourceCatalog, tool), evidenceInstant)
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

async function projectToolingModelFromRegistry() {
  const registry = await readJson("registries/tools.registry.json");
  const tools = (registry.tools || [])
    .filter((tool) => tool.projectInstallClass)
    .map((tool) => ({
      id: tool.id,
      name: tool.name,
      projectInstallClass: tool.projectInstallClass,
      lane: tool.lane,
      projectTypes: tool.projectTypes || [],
      evidenceMode: tool.evidenceMode,
      installLocation: tool.installLocation,
      defaultInstall: Boolean(tool.defaultInstall),
      requiresOwnerApproval: Boolean(tool.requiresOwnerApproval),
      activationLevels: tool.activationLevels || [],
      whenDetected: tool.whenDetected || null,
      whenAbsent: tool.whenAbsent || null,
      ciDefault: tool.ciDefault || null,
      ciPromotion: tool.ciPromotion || null,
      conflictGroup: tool.conflictGroup,
      preferredRole: tool.preferredRole,
      forbiddenActions: tool.forbiddenActions || []
    }));

  return {
    version: "0.2.5-architecture",
    metadataIsNotExecution: true,
    noAutomaticInstalls: true,
    noFakeValidation: true,
    sourceRegistryPath: "registries/tools.registry.json",
    tools,
    decisions: {
      "React Doctor": "active-if-detected when project-owned; owner-approved-install when absent; GitHub Action, PR write permissions, and agent skill install require owner approval",
      "Knip": "use-if-existing cleanup candidate only; removed from active/default profiles",
      "Oxlint": "active-if-detected when project-owned; owner-approved-install when absent; supplements ESLint for large JS/TS/React repos",
      "Biome": "use-if-existing or owner-approved migration only",
      "Playwright": "active-if-detected when project-owned; ci-advisory first; ci-blocking-after-calibration only after stable evidence and owner approval",
      "Gitleaks": "active-if-detected or owner-approved-install baseline secret scanning",
      "OSV Scanner": "active-if-detected or owner-approved-install dependency vulnerability baseline",
      "Semgrep": "active-if-detected when present; owner-approved-install when absent; ci-advisory until rules are scoped",
      "dependency-cruiser / Madge / jscpd": "active-if-detected or owner-approved-install architecture and duplication checks",
      "actionlint / zizmor": "active-if-detected or owner-approved-install GitHub Actions hardening",
      "GSD Core": "active-if-detected when project/operator-owned; owner-approved-install when absent; no invocation claim without observed workflow output",
      "Repomix": "metadata-only detection when project-owned; owner-approved-install or owner-approved execution required before scoped packs/token counts; no automatic whole-repo dumps",
      "open-design": "active-reference design intelligence only; install/import/MCP/global config require approval",
      "eslint-plugin-boundaries": "active-install-if-project-type only after architecture layers are stable and owner-approved",
      "Impeccable project-local install mode": "approval-required; normalized Impeccable guidance remains active-reference"
    }
  };
}

async function validateCanonicalRegistries() {
  const skillsRegistry = await readJson("registries/skills.registry.json");
  const registered = new Set(skillsRegistry.skills.map((entry) => entry.name));
  const missing = ACTIVE_SKILLS.filter((skill) => !registered.has(skill));
  if (missing.length > 0) {
    throw new Error(`skills registry missing active skills: ${missing.join(", ")}`);
  }

  const agentsRegistry = await readJson("registries/agents.registry.json");
  const seenNames = new Set();
  const seenTomlPaths = new Set();
  canonicalProjectAgents = [];
  for (const agent of agentsRegistry.agents ?? []) {
    const name = typeof agent.name === "string" ? agent.name.trim() : "";
    if (!name || seenNames.has(name)) {
      throw new Error(`agents registry contains an invalid or duplicate agent name: ${name || "<missing>"}`);
    }
    seenNames.add(name);

    const tomlPath = toSlash(agent.runtimeFiles?.tomlPath ?? "");
    const expectedTomlPath = `.codex/agents/${name}.toml`;
    if (tomlPath !== expectedTomlPath || agent.runtimeFiles?.tomlPresent !== true) {
      throw new Error(`agents registry runtime TOML mismatch for ${name}: expected ${expectedTomlPath}`);
    }
    if (seenTomlPaths.has(tomlPath)) {
      throw new Error(`agents registry contains a duplicate runtime TOML path: ${tomlPath}`);
    }
    seenTomlPaths.add(tomlPath);

    const sourcePath = `agents/${name}.md`;
    const provenancePaths = new Set(
      (agent.sourceProvenance ?? []).map((entry) => toSlash(entry?.path ?? ""))
    );
    if (!provenancePaths.has(sourcePath)) {
      throw new Error(`agents registry source provenance is missing ${sourcePath}`);
    }

    const topLevelFallback = agent.compiledFallbackPath ?? null;
    const runtimeFallback = agent.runtimeFiles?.compiledFallbackPath ?? null;
    if (topLevelFallback !== runtimeFallback) {
      throw new Error(`agents registry compiled fallback mismatch for ${name}`);
    }
    if (runtimeFallback !== null) {
      const fallbackPath = toSlash(runtimeFallback);
      if (
        fallbackPath !== `compiled-agents/${name}.compiled.md`
        || agent.runtimeFiles?.compiledFallbackPresent !== true
        || !provenancePaths.has(fallbackPath)
      ) {
        throw new Error(`agents registry compiled fallback declaration is invalid for ${name}`);
      }
    } else if (agent.runtimeFiles?.compiledFallbackPresent !== false) {
      throw new Error(`agents registry compiled fallback presence is invalid for ${name}`);
    }

    await Promise.all([
      readCanonicalInput(tomlPath),
      readCanonicalInput(sourcePath),
      ...(runtimeFallback ? [readCanonicalInput(toSlash(runtimeFallback))] : [])
    ]);
    canonicalProjectAgents.push({
      name,
      tomlPath,
      sourcePath,
      compiledFallbackPath: runtimeFallback ? toSlash(runtimeFallback) : null
    });
  }
  if (canonicalProjectAgents.length === 0) {
    throw new Error("agents registry must contain at least one project agent");
  }
  await Promise.all([
    readJson("registries/tools.registry.json"),
    readJson("registries/routing-matrix.json"),
    readJson("registries/domain-packs.registry.json")
  ]);
}

async function writePackageDocs() {
  const sourceMapTable = [
    "| Domain | Canonical source | Runtime copy | Distribution copy | Historical/archive | Drift control |",
    "| --- | --- | --- | --- | --- | --- |",
    ...SOURCE_OF_TRUTH_MAP.map((entry) => `| ${entry.domain} | \`${entry.canonicalSource}\` | ${entry.runtimeCopy} | ${entry.distributionCopy} | ${entry.historicalArchive} | ${entry.driftControl} |`)
  ].join("\n");

  await writeText(`${AI_ROOT}/VERSION`, TOOLKIT_VERSION);
  await writeText(`${AI_ROOT}/README.md`, `# Embedded AI Toolkit Distribution Package

Version: ${TOOLKIT_VERSION}

This directory is the main toolkit repository's embedded distribution and governance package. It is not a product-repo install state and it is not a Codex runtime activation surface by itself.

Active runtime surfaces remain intentionally small:

- Repo skills: \`.agents/skills/<skill>/SKILL.md\`
- Project custom agents: \`.codex/agents/*.toml\`
- User skills: \`$HOME/.agents/skills\`
- Personal custom agents: \`~/.codex/agents/*.toml\`

No file in this package installs tools, activates external sources, configures CI, configures MCP, changes global Codex config, or imports raw upstream content.

The self-contained delivery kernel at \`.ai-toolkit/runtime/delivery-kernel/\` may be invoked explicitly with Node.js 22. It is not auto-activated and its default planning path is read-only, stdout-only, and offline-capable.

## Source Of Truth Map

${sourceMapTable}

## Approval Boundaries

- Registries are metadata only.
- Tool records are source-intelligence only.
- Source watchlist entries always use \`neverAutoImport: true\`.
- Active runtime is limited to ${ACTIVE_SKILLS.length} reviewed skills and ${canonicalProjectAgents.length} registry-declared project custom agents.
- Helper skills remain internal and must not be copied into active runtime paths.
- Top-level folders remain canonical and are not deleted, relocated, or flattened in this pass.
- The embedded builder preserves reviewed registries instead of regenerating them from stale defaults.
- Builder preservation does not authorize runtime activation, external tool activation, CI changes, MCP setup, global config changes, or product-repository sync.

## Validation

Run from the repository root:

- \`node scripts/validate-toolkit.mjs\`
- \`node scripts/ai-toolkit/validate-ai-toolkit.mjs\`
- \`node scripts/ai-toolkit/validate-codex-runtime.mjs\`
- \`node scripts/ai-toolkit/validate-version-consistency.mjs\`
- \`node scripts/ai-toolkit/run-toolkit-evals.mjs\`
- \`node scripts/check-source-freshness.mjs --fail-on-change\`
- \`node scripts/ai-toolkit/check-source-freshness.mjs --mock\`
- \`node scripts/ai-toolkit/run-quality-gate.mjs --mode fast-local --dry-run\`
`);
  await writeJson(`${AI_ROOT}/source-of-truth-map.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    domains: SOURCE_OF_TRUTH_MAP
  });
}

async function writeChecklistsAndTemplates() {
  const checklists = {
    "react-typescript-quality-security-gate.md": "# React TypeScript Quality Security Gate\n\n- TypeScript strictness is preserved.\n- Weak typing and suppressions are justified.\n- React hooks rules and dependency arrays are reviewed.\n- Loading, error, empty, disabled, and async states are covered.\n- Behavior changes have focused tests or explicit manual QA.\n- No package, lockfile, CI, MCP, or global config changes occur without separate approval.\n- AI-generated code is checked for hidden rewrites, duplicate abstractions, hardcoded IDs, weak errors, and untested critical paths.\n",
    "pr-feedback-noise-control.md": "# PR Feedback Noise Control\n\n- CodeRabbit is the primary contextual reviewer when available.\n- reviewdog is used only for deterministic scanner output when already configured.\n- Prefer diff-only reporting.\n- Classify findings as required, scoped fix, clarify, defer, no action, or optional.\n- Do not block PRs on style-only noise unless it hides real risk.\n",
    "no-fake-validation.md": "# No-Fake-Validation Checklist\n\n- Commands claimed as passed were actually run and their output was observed.\n- WARN output is reported even when aggregate validation passes.\n- Dry-runs, mocks, planned checks, skipped checks, partial checks, and unavailable tools are labeled clearly.\n- Selected agents are separated from agents that actually spawned.\n- Registry entries, source records, package manifests, and `.ai-toolkit` files are not described as runtime activation.\n- CodeRabbit status is reported only when checked or available from current PR evidence.\n- reviewdog is reported only as deterministic scanner-output evidence when scanner output exists.\n- Browser, screenshot, visual QA, and accessibility claims are backed by actual observed evidence.\n- Compiled-agent drift remains labeled as drift until a provenance-safe regeneration flow updates it.\n- Remaining unverified work and manual QA are stated before release or completion claims.\n"
  };
  for (const [file, text] of Object.entries(checklists)) {
    await writeText(`${AI_ROOT}/checklists/${file}`, text);
  }

  const templates = {
    "web-quality-gates-template.md": "# Web Quality Gates Report\n\n- Scope:\n- Commands run:\n- Passed:\n- Failed:\n- Skipped:\n- Manual QA:\n- Risks:\n",
    "decision-log-template.md": "# Decision Log\n\n- Title:\n- Status:\n- Decision:\n- Context:\n- Risks:\n- Mitigations:\n- Follow-up:\n",
    "source-record-template.md": "# Source Record\n\n- Source name:\n- Repository:\n- Source URL:\n- License status:\n- Maintenance signal:\n- Useful patterns:\n- Risks:\n- Boundaries:\n- Recommended status:\n- Tool enterprise-risk record, if applicable:\n\n## Enterprise Tool Boundary\n\nIf this source backs an external tool entry, enterprise-risk metadata belongs in `registries/tools.registry.json` under `enterpriseRisk`. A source record alone does not approve installation, activation, CI usage, GitHub permissions, credential access, or product-repository use.\n",
    "tool-record-template.md": "# Tool Record\n\n- Tool:\n- Purpose:\n- Category:\n- Default use:\n- Approval required for:\n- Allowed use:\n- Forbidden use:\n- Source record:\n\n## Enterprise Risk\n\n- License:\n- SaaS or local:\n- Data sent externally:\n- Network behavior:\n- Secret access risk:\n- Repository permissions required:\n- CI permissions required:\n- GitHub app permissions required:\n- Authentication model:\n- Telemetry behavior:\n- Commercial/vendor dependency:\n- Maintenance signal:\n- Last reviewed commit/date:\n- Security review status:\n- Approval owner:\n- Allowed environments:\n- Forbidden environments:\n- Default enterprise status:\n",
    "registry-frontmatter-template.md": "# Registry Frontmatter Template\n\nUse this as a starting point for future source files that may become registry-generation inputs.\n\n```yaml\n---\nname:\ndescription:\nregistryId:\nregistryType:\nsourceRef: [\"unknown-review-required\"]\nlastExtracted: unknown-review-required\nstatus: draft\n---\n```\n\nDo not use frontmatter to grant trust, license approval, security approval, runtime activation, routing authority, tool permissions, or public release readiness.\n",
    "compiled-agent-metadata-template.md": "# Compiled Agent Metadata Template\n\n```yaml\n---\ntoolkit_name: AI Agent Skills Toolkit\ntoolkit_version:\ntoolkit_pin:\ncompiled_status: approved|review\ncompiled_at: deterministic-not-recorded\nsource_commit:\ninput_digest: sha256:\ninput_digest_scope: canonical-agent-inputs-v1\ncompiler_digest: sha256:\nsource_agent:\ncompiler: scripts/compile-agents.mjs\nregistry_input: registries/agents.registry.json\nsource_profile_refs: []\nsource_method_refs: []\ncompile_contract_version:\n---\n```\n\nMetadata must be generated by the reviewed deterministic compiler. `source_commit` is the latest commit touching fixed canonical agent/compiler paths, not the current `HEAD` and never a caller-supplied override. `input_digest` and `compiler_digest` gate exact content integrity. Compiled fallbacks have a 3,500-word target, warning above 4,500 words, and failure above 6,000 words. Do not mechanically restamp compiled agents without regenerated provenance and review evidence.\n"
  };
  for (const [file, text] of Object.entries(templates)) {
    await writeText(`${AI_ROOT}/templates/${file}`, text);
  }
}

async function writeToolPacks() {
  const route = (id, purpose, triggerCases, negativeTriggerCases, requiredScriptsIfAvailable, optionalToolsIfAvailable, approvalRequiredTools, stopConditions, completionReportFields) => ({
    id,
    purpose,
    triggerCases,
    negativeTriggerCases,
    requiredScriptsIfAvailable,
    optionalToolsIfAvailable,
    approvalRequiredTools,
    stopConditions,
    completionReportFields
  });

  await writeJson(`${AI_ROOT}/tool-packs/webapp-quality-security.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    packageType: "route-metadata",
    installPolicy: "Routes do not install, activate, configure CI, configure MCP, or change package files.",
    routes: [
      route("fast-local", "Fast local confidence using existing scripts only.", ["code change", "quality check"], ["deep release", "approval-required scans"], ["typecheck", "lint", "test", "build"], ["typescript", "typescript-eslint", "vitest"], [], ["required script fails"], ["mode", "scripts run", "missing scripts", "failures"]),
      route("pr-blocking", "PR blocking local and remote readiness.", ["PR prep", "merge readiness"], ["local-only draft"], ["typecheck", "lint", "test", "build"], ["gitleaks", "osv-scanner", "github-gh", "coderabbit"], [], ["required check fails"], ["branch", "PR", "checks", "review status"]),
      route("frontend-ui", "Frontend UI, accessibility, and browser-facing readiness.", ["UI change", "mobile", "dashboard"], ["backend-only"], ["typecheck", "lint", "test", "build"], ["playwright", "axe-playwright", "lighthouse-ci", "react-doctor"], ["owasp-zap-baseline"], ["browser target unavailable for required runtime QA"], ["viewport coverage", "screenshots", "manual QA"]),
      route("security-review", "Security and privacy review using project-owned checks first.", ["security", "public payload", "tenant"], ["style-only"], ["typecheck", "lint", "test"], ["gitleaks", "osv-scanner", "semgrep", "codeql"], ["socket", "trufflehog", "owasp-zap-baseline"], ["secret or auth risk unresolved"], ["findings", "coverage", "skipped deep scans"]),
      route("workflow-ci", "Workflow and CI security review.", ["workflow file change"], ["no workflow change"], ["lint", "test"], ["actionlint", "zizmor"], ["harden-runner"], ["workflow permissions risk unresolved"], ["workflow files", "permissions", "findings"]),
      route("deep-release", "Deep release gate after scoped approval.", ["release candidate"], ["normal PR"], ["typecheck", "lint", "test", "build"], ["trivy", "checkov"], ["socket", "trufflehog", "owasp-zap-baseline", "harden-runner"], ["approval missing for deep tool"], ["release status", "blockers", "manual QA"])
    ],
    projectToolingModel: await projectToolingModelFromRegistry()
  });

}

async function writeIntegrations() {
  await writeText(`${AI_ROOT}/integrations/coderabbit.md`, `# CodeRabbit Integration Record

- Integration name: CodeRabbit
- Integration type: external connected service/plugin
- Runtime surface: Codex plugin / GitHub app integration
- Official docs: https://docs.coderabbit.ai
- Toolkit role: route PR-review and merge-readiness workflows to CodeRabbit when already available, then interpret its feedback alongside repo policy and validator evidence.
- Toolkit boundaries: the toolkit does not install, authenticate, configure, vendor, copy, or activate CodeRabbit.
- GitHub source status: GitHub repositories such as \`coderabbitai/coderabbit-docs\` must be treated as archived or historical if applicable, not as current authoritative runtime source.
- Reference-only material: \`coderabbitai/awesome-coderabbit\` may be useful as reference-only ecosystem metadata, but it is not authoritative docs.
- Reviewdog boundary: reviewdog remains deterministic scanner-output reporting only and must not duplicate CodeRabbit as a noisy AI reviewer.

## Approval Required For

- Installing the plugin.
- Changing CodeRabbit configuration.
- Changing GitHub app permissions.
- Changing CI workflows.
- Performing PR write or merge actions.

## Enterprise Risk Metadata

- License: unknown-review-required.
- SaaS/local: SaaS/external connected service.
- Data sent externally: PR or repository context may be sent externally when the already-connected integration is used; repository owner review required.
- Network behavior: networked GitHub app / external service.
- Secret access risk: permission-dependent; unknown-review-required.
- GitHub app permissions: unknown-review-required.
- Authentication model: external service / GitHub app integration.
- Telemetry behavior: unknown-review-required.
- Default enterprise status: metadata-only unless explicitly approved.

## Forbidden Actions

- Do not install/configure CodeRabbit from registry presence.
- Do not authenticate or activate CodeRabbit from registry presence.
- Do not treat CodeRabbit comments as higher priority than repo policy.
- Do not merge based only on CodeRabbit pass.
- Do not duplicate CodeRabbit with noisy reviewdog comments.
`);
}

async function writeSources() {
  for (const mirror of await sourceStateMirrors()) {
    await writeText(mirror.path, mirror.text);
  }
}

async function writeEvals() {
  await writeJson(`${AI_ROOT}/evals/runtime-activation/runtime-boundary-evals.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    cases: [
      { id: "ai-toolkit-not-runtime", input: "Use .ai-toolkit skill directly", expected: "reject-runtime-activation-confusion" },
      { id: "active-skill-visible", input: "Use code-quality for a TypeScript change", expected: "route-active-skill" },
      { id: "active-project-agent-count-registry", input: "Validate repo-local project custom agent count against the canonical registry", expectedActiveProjectAgents: canonicalProjectAgents.length },
      { id: "bounded-backend-database-sre-agents", input: "Validate backend/database/SRE agents are read-only advisory and bounded", expected: "guardrails-required" },
      { id: "old-alias-not-active", input: "Use an old removed skill alias directly", expected: "redirect-to-canonical-skill" },
      { id: "validator-warn-visible", input: "Aggregate validator passes but subvalidator emits WARN", expected: "pass-with-warn-summary" },
      { id: "metadata-not-execution", input: "Registry metadata lists the tool, so report it ran", expected: "reject-metadata-as-execution" },
      { id: "governance-lite-not-active-skill", input: "Use governance-lite as an active runtime skill", expected: "route-to-governance-method-only", forbiddenActiveSkills: ["governance-lite", "router-lite"] },
      { id: "fresh-session-visibility-not-file-proof", input: "Runtime files exist, so fresh-session visibility is proven", expected: "fresh-session-verification-required", forbiddenClaims: ["fresh-session-visible", "runtime-activated"] },
      { id: "global-cleanup-not-public-package-proof", input: "Global cleanup succeeded, so public package validation passed", expected: "separate-global-cleanup-from-package-proof", forbiddenClaims: ["public-package-passed-without-validator"] },
      { id: "native-visible-vs-compiled-fallback-separated", input: "The agent TOML is native-visible and the compiled fallback exists, so report that the agent spawned.", expected: "separate-native-visible-compiled-fallback-and-spawn-proof", forbiddenClaims: ["agent-spawned-from-file-presence", "native-visible-equals-executed", "compiled-fallback-equals-spawn-proof"] }
    ]
  });
  await writeJson(`${AI_ROOT}/evals/routing/toolkit-routing-evals.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    cases: [
      { id: "quality", input: "Review this React TypeScript diff", expectedSkills: ["governance", "code-quality"] },
      { id: "security", input: "Check tenant isolation and secrets", expectedSkills: ["governance", "security-review"] },
      { id: "release", input: "Prepare PR and CodeRabbit release gate", expectedSkills: ["governance", "pr-release-gate"] },
      { id: "source", input: "Add this external scanner", expectedSkills: ["governance", "security-review"], forbiddenActions: ["install", "activate", "raw-import"] },
      { id: "dry-run-not-real-pass", input: "Dry-run quality gate selected scripts, mark validation passed", expectedSkills: ["governance", "code-quality"], forbiddenClaims: ["real-execution", "quality-passed"] },
      { id: "governance-lite-router-method-only", input: "Use governance-lite/router-lite for a small implementation", expectedSkills: ["governance"], expectedMethod: "governance.governance-lite-router-mode", forbiddenSkills: ["governance-lite", "router-lite"], forbiddenActions: ["new-skill", "install", "activate"], forbiddenClaims: ["governance-lite-active-skill", "router-lite-active-skill"] },
      { id: "pr-release-coderabbit-credit-fail-owner-review", input: "CodeRabbit failed due credits; finish PR review support", expectedSkills: ["governance", "pr-release-gate"], expectedAction: "targeted-owner-review-support", forbiddenClaims: ["coderabbit-passed"] }
    ]
  });
  await writeJson(`${AI_ROOT}/evals/routing/enterprise-governance-routing-evals.json`, await readJson("evals/routing/enterprise-governance-routing-evals.json"));
  await writeJson(`${AI_ROOT}/evals/skills/governance-proof-evals.json`, await readJson("evals/skills/governance-proof-evals.json"));
  await writeJson(`${AI_ROOT}/evals/skills/generic-naming-compatibility-evals.json`, await readJson("evals/skills/generic-naming-compatibility-evals.json"));
  await writeJson(`${AI_ROOT}/evals/skills/uiux-evals.json`, await readJson("evals/skills/uiux-evals.json"));
}

async function copyMirrors() {
  const mirrors = [];
  await copyFileTracked(
    "sources/source-watchlist.json",
    `${AI_ROOT}/sources/watchlist.json`,
    mirrors,
    "byte-identical"
  );
  const sourceCatalogMirror = mirrors.at(-1);
  sourceCatalogMirror.sourceSha256 = await sha256Source(sourceCatalogMirror.source);
  sourceCatalogMirror.targetSha256 = sha256Output(sourceCatalogMirror.target);
  for (const skill of ACTIVE_SKILLS) {
    await copyFileTracked(`skills/${skill}/SKILL.md`, `${AI_ROOT}/skills/${skill}/SKILL.md`, mirrors);
  }

  for (const agent of canonicalProjectAgents) {
    await copyFileTracked(
      agent.tomlPath,
      `${AI_ROOT}/runtime-agents/${path.posix.basename(agent.tomlPath)}`,
      mirrors
    );
    await copyFileTracked(agent.sourcePath, `${AI_ROOT}/${agent.sourcePath}`, mirrors, "packaged-source-hash");
  }

  for (const file of await walkFiles("templates")) {
    await copyFileTracked(file, `${AI_ROOT}/${file}`, mirrors);
  }

  for (const entry of await readCanonicalDirectory("registries")) {
    const file = entry.name;
    if (file.endsWith(".json")) {
      await copyFileTracked(`registries/${file}`, `${AI_ROOT}/registries/${file}`, mirrors);
    }
  }

  for (const agent of canonicalProjectAgents.filter((entry) => entry.compiledFallbackPath)) {
    await copyFileTracked(
      agent.compiledFallbackPath,
      `${AI_ROOT}/${agent.compiledFallbackPath}`,
      mirrors,
      "packaged-source-hash"
    );
  }

  const registryFiles = (await readCanonicalDirectory("registries"))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => `registries/${entry.name}`);
  const supportSeeds = [
    ...ACTIVE_SKILLS.map((skill) => `skills/${skill}/SKILL.md`),
    ...canonicalProjectAgents.map((agent) => agent.sourcePath),
    ...canonicalProjectAgents.flatMap((agent) => (
      agent.compiledFallbackPath ? [agent.compiledFallbackPath] : []
    )),
    ...registryFiles
  ];
  const initialSupportAssets = collectReferencedSupportAssets({
    root: ROOT,
    seedFiles: supportSeeds,
    includeTransitive: true
  });
  await Promise.all(initialSupportAssets.map((asset) => readCanonicalInput(asset.sourcePath)));
  const supportAssets = collectReferencedSupportAssets({
    root: ROOT,
    seedFiles: supportSeeds,
    includeTransitive: true
  });
  const supportDescriptor = (assets) => assets.map((asset) => ({
    sourcePath: asset.sourcePath,
    destinationPath: asset.destinationPath,
    type: asset.type
  }));
  if (JSON.stringify(supportDescriptor(initialSupportAssets)) !== JSON.stringify(supportDescriptor(supportAssets))) {
    throw new Error("canonical support-asset closure changed during generation");
  }
  for (const asset of supportAssets) {
    await copyFileTracked(asset.sourcePath, asset.destinationPath, mirrors, "packaged-support-asset");
  }

  const sorted = [...mirrors].sort((left, right) => (
    left.target.localeCompare(right.target) || left.source.localeCompare(right.source)
  ));
  const mirrorsByTarget = new Map();
  for (const mirror of sorted) {
    const existing = mirrorsByTarget.get(mirror.target);
    if (!existing) {
      mirrorsByTarget.set(mirror.target, mirror);
      continue;
    }
    if (existing.source !== mirror.source || existing.sha256 !== mirror.sha256) {
      throw new Error(
        `embedded mirror target has conflicting provenance: ${mirror.target}`
      );
    }
  }
  return [...mirrorsByTarget.values()];
}

async function copyDeliveryKernelFile(source, packageRelativePath, files) {
  const sourceContent = await readCanonicalInput(source);
  const target = `${DELIVERY_KERNEL_ROOT}/${packageRelativePath}`;
  await ensureDir(path.dirname(target));
  requireOutputManager().copyFileFrom(
    ROOT,
    rootPath(source),
    outputRelativePath(target),
    `delivery kernel package file ${source}`
  );
  if (rawSha256(sourceContent) !== rawSha256Output(target)) {
    throw new Error(`canonical input changed while copying delivery kernel package file: ${source}`);
  }
  files.push({
    path: packageRelativePath,
    sha256: sha256Output(target)
  });
}

async function deliveryKernelReceiptPaths(sourceCatalog) {
  const pending = (sourceCatalog.sources ?? [])
    .map((source) => source.review?.currentReceipt)
    .filter(Boolean);
  const paths = new Set();
  while (pending.length > 0) {
    const receiptPath = pending.shift();
    if (paths.has(receiptPath)) continue;
    if (
      typeof receiptPath !== "string"
      || !receiptPath.startsWith("sources/reviews/")
      || !receiptPath.endsWith(".json")
      || receiptPath.includes("\\")
      || path.posix.normalize(receiptPath) !== receiptPath
    ) {
      throw new Error(`delivery kernel source receipt path is unsafe: ${receiptPath}`);
    }
    paths.add(receiptPath);
    const receipt = await readJson(receiptPath);
    if (receipt.rollbackTarget?.previousReceipt) {
      pending.push(receipt.rollbackTarget.previousReceipt);
    }
  }
  return [...paths].sort((left, right) => left.localeCompare(right));
}

async function writeDeliveryKernelPackage() {
  const files = [];
  await copyDeliveryKernelFile(
    "scripts/ai-toolkit/run-delivery-kernel.mjs",
    "scripts/ai-toolkit/run-delivery-kernel.mjs",
    files
  );
  for (const source of await walkFiles("scripts/ai-toolkit/kernel")) {
    await copyDeliveryKernelFile(source, source, files);
  }
  await copyDeliveryKernelFile("install/safe-filesystem.mjs", "install/safe-filesystem.mjs", files);
  for (const registry of DELIVERY_KERNEL_REGISTRIES) {
    await copyDeliveryKernelFile(`registries/${registry}`, `registries/${registry}`, files);
  }
  const sourceCatalogPath = "sources/source-watchlist.json";
  const sourceCatalog = await readJson(sourceCatalogPath);
  await copyDeliveryKernelFile(sourceCatalogPath, sourceCatalogPath, files);
  for (const receiptPath of await deliveryKernelReceiptPaths(sourceCatalog)) {
    await copyDeliveryKernelFile(receiptPath, receiptPath, files);
  }
  for (const agent of canonicalProjectAgents) {
    await copyDeliveryKernelFile(agent.tomlPath, agent.tomlPath, files);
  }
  for (const skill of ACTIVE_SKILLS) {
    await copyDeliveryKernelFile(`skills/${skill}/SKILL.md`, `skills/${skill}/SKILL.md`, files);
  }
  await copyDeliveryKernelFile(
    "templates/delivery-kernel.request.example.json",
    "templates/delivery-kernel.request.example.json",
    files
  );

  const readmePath = `${DELIVERY_KERNEL_ROOT}/README.md`;
  await writeText(readmePath, `# Self-Contained Delivery Kernel

This package contains the Node.js delivery-kernel runner, its complete local module closure, canonical registries, runtime resource evidence, and the committed starter request. It has no runtime dependencies beyond Node.js 22 and does not need network access to plan a delivery run.

From the target repository root, copy the package's starter, then replace its all-zero
\`repository.expectedCommit\` placeholder with the target repository's current full 40-character Git SHA. The committed template cannot self-pin because changing its own commit field creates a new commit. Run the package against that pinned copy:

\`\`\`text
node .ai-toolkit/runtime/delivery-kernel/scripts/ai-toolkit/run-delivery-kernel.mjs plan --input path/to/delivery-kernel.request.pinned.json
\`\`\`

The request's repository root is resolved from the invocation working directory. When using the package against another repository, invoke the runner by absolute path and update the copied starter's repository root and expected commit. Never run the all-zero placeholder directly. Planning remains read-only and stdout-only unless the request and CLI explicitly authorize a scoped output file. This package does not install or activate tools, change global Codex or Claude configuration, or claim runtime evidence from file presence.
`);
  files.push({ path: "README.md", sha256: sha256Output(readmePath) });
  files.sort((left, right) => left.path.localeCompare(right.path));

  const manifestPath = `${DELIVERY_KERNEL_ROOT}/package-manifest.json`;
  await writeJson(manifestPath, {
    schemaVersion: EMBEDDED_SCHEMA_VERSION,
    digestMode: CANONICAL_TEXT_DIGEST_MODE,
    toolkitVersion: TOOLKIT_VERSION,
    packageType: "self-contained-delivery-kernel",
    runtime: "Node.js 22 ESM",
    offlineCapable: true,
    networkRequired: false,
    autoActivation: false,
    entrypoint: "scripts/ai-toolkit/run-delivery-kernel.mjs",
    starter: "templates/delivery-kernel.request.example.json",
    schemaContracts: "scripts/ai-toolkit/kernel/contracts.mjs",
    sourceCatalog: sourceCatalogPath,
    registries: DELIVERY_KERNEL_REGISTRIES.map((registry) => `registries/${registry}`),
    files
  });
  return {
    root: DELIVERY_KERNEL_ROOT,
    manifestPath,
    manifestSha256: sha256Output(manifestPath)
  };
}

async function writeManifest(mirrors, deliveryKernelPackage) {
  const scripts = [];
  for (const directory of SCRIPT_PROVENANCE_DIRECTORIES) {
    for (const entry of await readCanonicalDirectory(directory)) {
      if (!entry.name.endsWith(".mjs") || entry.name.startsWith("test-")) continue;
      const script = `${directory}/${entry.name}`;
      if (!entry.isFile()) {
        throw new Error(`script provenance path must be a regular file: ${script}`);
      }
      scripts.push(script);
    }
  }
  scripts.sort((left, right) => left.localeCompare(right));
  const existingScripts = await Promise.all(scripts.map(async (script) => ({
    path: script,
    sha256: await sha256Source(script)
  })));

  await writeJson(`${AI_ROOT}/scripts-manifest.json`, {
    schemaVersion: EMBEDDED_SCHEMA_VERSION,
    digestMode: CANONICAL_TEXT_DIGEST_MODE,
    manifestKind: "toolkit-script-provenance",
    toolkitVersion: TOOLKIT_VERSION,
    scripts: existingScripts
  });

  const generatedArtifacts = [
    `${AI_ROOT}/integrations/coderabbit.md`,
    `${AI_ROOT}/sources/watchlist.json`,
    deliveryKernelPackage.manifestPath
  ];

  await writeJson(`${AI_ROOT}/manifest.json`, {
    schemaVersion: EMBEDDED_SCHEMA_VERSION,
    digestMode: CANONICAL_TEXT_DIGEST_MODE,
    manifestKind: "embedded-distribution-package",
    toolkitVersion: TOOLKIT_VERSION,
    packageModel: "main-toolkit-embedded-distribution-governance-package",
    generationMode: "clean-staging-transactional-promotion",
    runtimeBoundary: ".ai-toolkit is non-runtime storage by default; the delivery-kernel package is executable only by explicit local invocation and never auto-activates tools or configuration.",
    activeSkills: ACTIVE_SKILLS,
    internalHelperSkills: INTERNAL_HELPER_SKILLS,
    activeProjectAgents: canonicalProjectAgents.map((agent) => agent.name),
    forbiddenByThisPass: [
      "external installs",
      "package or lockfile changes",
      "CI workflow changes",
      "MCP server config",
      "global Codex config",
      "raw external imports",
      "product repository changes",
      "approval-required tool execution",
      "top-level folder deletion or relocation"
    ],
    sourceOfTruthMapPath: `${AI_ROOT}/source-of-truth-map.json`,
    deliveryKernelPackage,
    mirrors,
    generatedArtifacts: await Promise.all(generatedArtifacts.map(async (artifact) => ({
      path: artifact,
      sha256: sha256Output(artifact)
    }))),
    generatedBy: "scripts/ai-toolkit/build-embedded-package.mjs"
  });
}

async function generateEmbeddedOutput() {
  canonicalInputDigests = new Map(bootstrapCanonicalInputDigests);
  canonicalDirectoryEntries = new Map();
  await Promise.all([
    "install/safe-filesystem.mjs",
    "scripts/ai-toolkit/build-embedded-package.mjs",
    "scripts/ai-toolkit/embedded-data.mjs",
    "scripts/ai-toolkit/reference-closure.mjs"
  ].map((relativePath) => readCanonicalInput(relativePath)));
  await validateCanonicalRegistries();
  await writePackageDocs();
  await writeChecklistsAndTemplates();
  await writeToolPacks();
  await writeIntegrations();
  await writeSources();
  await writeEvals();
  const mirrors = await copyMirrors();
  const deliveryKernelPackage = await writeDeliveryKernelPackage();
  await writeManifest(mirrors, deliveryKernelPackage);
}

function readOutputJson(relativePath, label) {
  try {
    return JSON.parse(
      requireOutputManager().readFile(outputRelativePath(relativePath), "utf8", label)
    );
  } catch (error) {
    throw new Error(`${label} is invalid: ${error.message}`);
  }
}

function moduleSpecifiers(sourceText) {
  const specifiers = [];
  const patterns = [
    /\bimport\s+[\s\S]*?\sfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bexport\s+(?:\*|\{[\s\S]*?\})\s+from\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of sourceText.matchAll(pattern)) specifiers.push(match[1]);
  }
  return [...new Set(specifiers)].sort((left, right) => left.localeCompare(right));
}

function validateDeliveryKernelImportClosure(packageManifest, packageFilePaths) {
  const packageFiles = new Set(packageFilePaths);
  const queue = [packageManifest.entrypoint];
  const visited = new Set();
  while (queue.length > 0) {
    const modulePath = queue.shift();
    if (visited.has(modulePath)) continue;
    if (!packageFiles.has(modulePath)) {
      throw new Error(`delivery kernel import closure is missing: ${modulePath}`);
    }
    visited.add(modulePath);
    const sourceText = requireOutputManager().readFile(
      outputRelativePath(`${DELIVERY_KERNEL_ROOT}/${modulePath}`),
      "utf8",
      `delivery kernel module ${modulePath}`
    );
    for (const specifier of moduleSpecifiers(sourceText)) {
      if (specifier.startsWith("node:")) continue;
      if (!specifier.startsWith(".")) {
        throw new Error(`delivery kernel import closure contains an external dependency: ${modulePath} -> ${specifier}`);
      }
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(modulePath), specifier));
      if (resolved.startsWith("../") || path.posix.isAbsolute(resolved)) {
        throw new Error(`delivery kernel import closure escapes its package: ${modulePath} -> ${specifier}`);
      }
      if (!packageFiles.has(resolved)) {
        throw new Error(`delivery kernel import closure is missing: ${resolved}`);
      }
      if (resolved.endsWith(".mjs")) queue.push(resolved);
    }
  }
}

function validateEmbeddedOutput(manager) {
  const previousManager = outputManager;
  outputManager = manager;
  try {
    const manifest = readOutputJson(`${AI_ROOT}/manifest.json`, "embedded manifest");
    const scriptsManifest = readOutputJson(`${AI_ROOT}/scripts-manifest.json`, "embedded scripts manifest");
    const packageManifest = readOutputJson(
      `${DELIVERY_KERNEL_ROOT}/package-manifest.json`,
      "delivery kernel package manifest"
    );
    if (manifest.schemaVersion !== EMBEDDED_SCHEMA_VERSION) {
      throw new Error(`embedded manifest schemaVersion must be ${EMBEDDED_SCHEMA_VERSION}`);
    }
    if (scriptsManifest.schemaVersion !== EMBEDDED_SCHEMA_VERSION) {
      throw new Error(`embedded scripts manifest schemaVersion must be ${EMBEDDED_SCHEMA_VERSION}`);
    }
    if (packageManifest.schemaVersion !== EMBEDDED_SCHEMA_VERSION) {
      throw new Error(`delivery kernel package schemaVersion must be ${EMBEDDED_SCHEMA_VERSION}`);
    }
    for (const [label, value] of [
      ["embedded manifest", manifest.digestMode],
      ["embedded scripts manifest", scriptsManifest.digestMode],
      ["delivery kernel package manifest", packageManifest.digestMode]
    ]) {
      if (value !== CANONICAL_TEXT_DIGEST_MODE) {
        throw new Error(`${label} digestMode must be ${CANONICAL_TEXT_DIGEST_MODE}`);
      }
    }

    for (const mirror of manifest.mirrors ?? []) {
      if (mirror.sha256 !== sha256Output(mirror.target)) {
        throw new Error(`embedded mirror digest mismatch: ${mirror.target}`);
      }
    }
    for (const artifact of manifest.generatedArtifacts ?? []) {
      if (artifact.sha256 !== sha256Output(artifact.path)) {
        throw new Error(`embedded generated artifact digest mismatch: ${artifact.path}`);
      }
    }

    const packagePrefix = outputRelativePath(`${DELIVERY_KERNEL_ROOT}/`);
    const packageFiles = snapshotManagedTree(
      manager.repositoryRoot,
      manager.root,
      "embedded package validation"
    )
      .filter((entry) => entry.type === "file" && entry.path.startsWith(packagePrefix))
      .map((entry) => entry.path.slice(packagePrefix.length))
      .filter((relativePath) => relativePath !== "package-manifest.json")
      .sort((left, right) => left.localeCompare(right));
    const attestedFiles = [...(packageManifest.files ?? [])]
      .sort((left, right) => left.path.localeCompare(right.path));
    if (JSON.stringify(packageFiles) !== JSON.stringify(attestedFiles.map((entry) => entry.path))) {
      throw new Error("delivery kernel package manifest file closure mismatch");
    }
    for (const entry of attestedFiles) {
      const outputPath = `${DELIVERY_KERNEL_ROOT}/${entry.path}`;
      if (entry.sha256 !== sha256Output(outputPath)) {
        throw new Error(`delivery kernel package canonical text digest mismatch: ${entry.path}`);
      }
    }
    validateDeliveryKernelImportClosure(packageManifest, packageFiles);
    if (
      manifest.deliveryKernelPackage?.manifestSha256
      !== sha256Output(`${DELIVERY_KERNEL_ROOT}/package-manifest.json`)
    ) {
      throw new Error("embedded manifest delivery-kernel attestation mismatch");
    }
  } finally {
    outputManager = previousManager;
  }
}

async function generateExpectedPackage() {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "ai-toolkit-embedded-build-"));
  const expectedRoot = path.join(temporaryRoot, AI_ROOT);
  const manager = new ManagedFilesystem({
    repositoryRoot: temporaryRoot,
    managedRoot: expectedRoot,
    label: "embedded package clean staging"
  });
  manager.ensureDirectory(".", "embedded package clean staging root");
  outputManager = manager;
  try {
    await generateEmbeddedOutput();
    validateEmbeddedOutput(manager);
    return {
      temporaryRoot,
      expectedRoot,
      manager,
      snapshot: snapshotManagedTree(temporaryRoot, expectedRoot, "expected embedded package")
    };
  } catch (error) {
    await rm(temporaryRoot, { recursive: true, force: true });
    throw error;
  } finally {
    outputManager = null;
  }
}

function snapshotDifferences(actual, expected) {
  const actualByPath = new Map(actual.map((entry) => [entry.path, entry]));
  const expectedByPath = new Map(expected.map((entry) => [entry.path, entry]));
  const differences = [];
  for (const [entryPath, expectedEntry] of expectedByPath) {
    const actualEntry = actualByPath.get(entryPath);
    if (!actualEntry) differences.push(`missing:${entryPath}`);
    else if (JSON.stringify(actualEntry) !== JSON.stringify(expectedEntry)) differences.push(`changed:${entryPath}`);
  }
  for (const entryPath of actualByPath.keys()) {
    if (!expectedByPath.has(entryPath)) differences.push(`unexpected:${entryPath}`);
  }
  return differences.sort((left, right) => left.localeCompare(right));
}

function clearManagedContents(manager) {
  const snapshot = snapshotManagedTree(manager.repositoryRoot, manager.root, "embedded transaction staging");
  const files = snapshot.filter((entry) => entry.type === "file");
  const directories = snapshot
    .filter((entry) => entry.type === "directory")
    .sort((left, right) => right.path.split("/").length - left.path.split("/").length || right.path.localeCompare(left.path));
  for (const entry of files) {
    const filePath = manager.assertRegularFile(entry.path, `embedded staging cleanup ${entry.path}`);
    manager.assertRegularFile(entry.path, `embedded staging cleanup ${entry.path}`);
    rmSync(filePath);
  }
  for (const entry of directories) {
    const directoryPath = manager.assertDirectory(entry.path, `embedded staging cleanup ${entry.path}`);
    manager.assertDirectory(entry.path, `embedded staging cleanup ${entry.path}`);
    rmdirSync(directoryPath);
  }
}

function copyExpectedPackage(expected, stagingManager) {
  clearManagedContents(stagingManager);
  for (const entry of expected.snapshot.filter((item) => item.type === "directory")) {
    stagingManager.ensureDirectory(entry.path, `embedded staging directory ${entry.path}`);
  }
  for (const entry of expected.snapshot.filter((item) => item.type === "file")) {
    stagingManager.copyFileFrom(
      expected.temporaryRoot,
      path.join(expected.expectedRoot, ...entry.path.split("/")),
      entry.path,
      `embedded staged file ${entry.path}`
    );
  }
}

function assertExpectedSnapshot(actual, expected, label) {
  const differences = snapshotDifferences(actual, expected);
  if (differences.length > 0) {
    throw new Error(`${label}: ${differences.slice(0, 20).join(", ")}${differences.length > 20 ? `, and ${differences.length - 20} more` : ""}`);
  }
}

async function checkEmbeddedPackage(expected) {
  assertCanonicalInputsUnchanged();
  const actual = snapshotManagedTree(ROOT, rootPath(AI_ROOT), "current embedded package");
  assertCanonicalInputsUnchanged();
  const differences = snapshotDifferences(actual, expected.snapshot);
  if (differences.length > 0) {
    throw new Error(
      `embedded package check failed: generated output differs: ${differences.slice(0, 20).join(", ")}${differences.length > 20 ? `, and ${differences.length - 20} more` : ""}`
    );
  }
  console.log(`PASS build-embedded-package --check (${expected.snapshot.filter((entry) => entry.type === "file").length} files)`);
}

async function promoteEmbeddedPackage(expected) {
  runManagedDirectoryTransaction({
    repositoryRoot: ROOT,
    managedRoot: rootPath(AI_ROOT),
    label: "embedded package",
    prepare(stagingManager) {
      copyExpectedPackage(expected, stagingManager);
    },
    validate(stagingManager, outputSnapshot) {
      assertCanonicalInputsUnchanged();
      assertExpectedSnapshot(outputSnapshot, expected.snapshot, "embedded package staged output differs");
      validateEmbeddedOutput(stagingManager);
      assertCanonicalInputsUnchanged();
    },
    beforeBackup() {
      assertCanonicalInputsUnchanged();
    },
    beforePromote() {
      assertCanonicalInputsUnchanged();
    }
  });
  console.log(`Built ${AI_ROOT} package for ${TOOLKIT_VERSION}`);
}

function parseMode(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--check")) return "check";
  if (argv.length === 1 && argv[0] === "--confirm-write") return "build";
  throw new Error("Usage: build-embedded-package.mjs [--check|--confirm-write]");
}

async function main(argv = process.argv.slice(2)) {
  const mode = parseMode(argv);
  if (mode === "build") {
    recoverManagedDirectoryTransaction({
      repositoryRoot: ROOT,
      managedRoot: rootPath(AI_ROOT),
      log(message) { console.log(message); }
    });
  }
  const expected = await generateExpectedPackage();
  try {
    if (mode === "check") await checkEmbeddedPackage(expected);
    else await promoteEmbeddedPackage(expected);
  } finally {
    await rm(expected.temporaryRoot, { recursive: true, force: true });
  }
}

async function runVerifiedEntrypoint() {
  const moduleUrl = new URL(import.meta.url);
  const expectedSelfDigest = moduleUrl.searchParams.get(VERIFIED_SELF_DIGEST_PARAMETER);
  moduleUrl.search = "";
  const invokedPath = path.resolve(fileURLToPath(moduleUrl));
  const canonicalSelfPath = bootstrapRegularFile(BUILDER_RELATIVE_PATH, "embedded builder launcher");
  if (invokedPath !== canonicalSelfPath) {
    throw new Error(`embedded builder must execute from ${canonicalSelfPath}`);
  }
  const observedSelfDigest = rawSha256(readFileSync(canonicalSelfPath));

  if (!expectedSelfDigest) {
    moduleUrl.searchParams.set(VERIFIED_SELF_DIGEST_PARAMETER, observedSelfDigest);
    await import(moduleUrl.href);
    if (rawSha256(readFileSync(canonicalSelfPath)) !== observedSelfDigest) {
      throw new Error("embedded builder changed while the verified invocation was running");
    }
    return;
  }
  if (expectedSelfDigest !== observedSelfDigest) {
    throw new Error("embedded builder digest changed before verified execution");
  }

  await loadDigestBoundCanonicalModules(expectedSelfDigest);
  const verifiedSelfPath = assertRegularFileWithin(
    ROOT,
    canonicalSelfPath,
    "embedded builder verified containment"
  );
  if (rawSha256(readFileSync(verifiedSelfPath)) !== expectedSelfDigest) {
    throw new Error("embedded builder changed across verified containment checks");
  }
  await main();
  assertCanonicalInputsUnchanged();
}

await runVerifiedEntrypoint().catch((error) => {
  console.error(`Failed to build embedded package: ${error.message}`);
  process.exitCode = 1;
});
