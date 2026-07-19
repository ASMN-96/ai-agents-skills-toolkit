#!/usr/bin/env node
import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import {
  assertPathContained,
  assertRegularFileWithin,
  snapshotManagedTree
} from "../../install/safe-filesystem.mjs";
import {
  ACTIVE_SKILLS,
  SOURCE_OF_TRUTH_MAP,
  TOOLKIT_VERSION,
  UNSAFE_COMMAND_PATTERNS
} from "./embedded-data.mjs";
import { collectReferenceClosureFailures } from "./reference-closure.mjs";
import { validateSourceCatalog } from "./source-governance.mjs";

const ROOT = process.cwd();
const AI_ROOT = ".ai-toolkit";
const SCRIPT_PROVENANCE_DIRECTORIES = ["scripts", "scripts/ai-toolkit"];
const failures = [];
const warnings = [];
const ENTERPRISE_RISK_FIELDS = [
  "license",
  "saasOrLocal",
  "dataSentExternally",
  "networkBehavior",
  "secretAccessRisk",
  "repositoryPermissionsRequired",
  "ciPermissionsRequired",
  "githubAppPermissionsRequired",
  "authenticationModel",
  "telemetryBehavior",
  "commercialVendorDependency",
  "maintenanceSignal",
  "lastReviewedCommit",
  "lastReviewedDate",
  "securityReviewStatus",
  "approvalOwner",
  "allowedEnvironments",
  "forbiddenEnvironments",
  "defaultEnterpriseStatus",
  "riskTier",
  "reviewedSource",
  "reviewedVersionOrCommit",
  "inspectedAreas",
  "uninspectedAreas",
  "riskRationale",
  "nextReviewDue"
];
const METHOD_TRACEABILITY_FIELDS = ["sourceRef", "lastExtracted", "status"];
const SPECIAL_METHOD_SOURCE_REFS = new Set([
  "unknown-review-required",
  "toolkit-authored"
]);

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(location, message) {
  failures.push({ location, message });
}

function warn(location, message) {
  warnings.push({ location, message });
}

async function exists(relativePath) {
  try {
    await stat(rootPath(relativePath));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readRegularFile(relativePath, "utf8", `JSON document ${relativePath}`));
  } catch (error) {
    fail(relativePath, `JSON parse failed: ${error.message}`);
    return null;
  }
}

async function readRegularFile(relativePath, encoding = null, label = `regular file ${relativePath}`) {
  const safePath = assertRegularFileWithin(ROOT, rootPath(relativePath), label);
  return readFile(safePath, encoding);
}

async function sha256(relativePath, { exactBytes = false } = {}) {
  const content = await readRegularFile(relativePath, null, `digest input ${relativePath}`);
  const digestInput = exactBytes
    ? content
    : content.toString("utf8").replace(/\r\n/g, "\n");
  return createHash("sha256").update(digestInput).digest("hex");
}

async function walk(relativeDir, output = []) {
  const managedRoot = assertPathContained(ROOT, rootPath(relativeDir), `validation tree ${relativeDir}`);
  return snapshotManagedTree(ROOT, managedRoot, `validation tree ${relativeDir}`)
    .filter((entry) => entry.type === "file")
    .map((entry) => `${relativeDir}/${entry.path}`)
    .sort((left, right) => left.localeCompare(right));
}

function scanUnsafe(relativePath, text) {
  if (relativePath.startsWith("scripts/ai-toolkit/")) {
    return;
  }
  for (const pattern of UNSAFE_COMMAND_PATTERNS) {
    if (pattern.test(text)) {
      fail(relativePath, "contains unsafe install, activation, clone, MCP, or global-config command pattern");
    }
  }
}

function isCodeRabbitIntegration(tool) {
  return tool.id === "coderabbit"
    && tool.status === "delegated-existing"
    && tool.activationStatus === "external-installed-if-enabled"
    && tool.runtimeSurface === "codex-plugin-github-app"
    && tool.sourceRecordPath === null
    && tool.integrationRecordPath === `${AI_ROOT}/integrations/coderabbit.md`;
}

function validateEnterpriseRisk(tool, location) {
  if (!tool.enterpriseRisk || typeof tool.enterpriseRisk !== "object" || Array.isArray(tool.enterpriseRisk)) {
    fail(location, "missing enterpriseRisk object");
    return;
  }

  for (const field of ENTERPRISE_RISK_FIELDS) {
    if (!(field in tool.enterpriseRisk)) {
      fail(location, `enterpriseRisk missing ${field}`);
    }
  }

  if (!String(tool.enterpriseRisk.defaultEnterpriseStatus || "").includes("metadata-only")) {
    fail(location, "defaultEnterpriseStatus must remain metadata-only unless explicitly approved");
  }
  for (const field of ["riskTier", "reviewedSource", "reviewedVersionOrCommit", "riskRationale", "nextReviewDue"]) {
    if (typeof tool.enterpriseRisk[field] !== "string" || tool.enterpriseRisk[field].length === 0) {
      fail(location, `${field} must be a non-empty string`);
    }
  }
  for (const field of ["inspectedAreas", "uninspectedAreas"]) {
    if (!Array.isArray(tool.enterpriseRisk[field]) || tool.enterpriseRisk[field].length === 0) {
      fail(location, `${field} must be a non-empty array`);
    }
  }
  if (/enterprise-approved|approved/i.test(String(tool.enterpriseRisk.securityReviewStatus || ""))) {
    fail(location, "securityReviewStatus must not claim enterprise approval without evidence");
  }
  if (!Array.isArray(tool.enterpriseRisk.allowedEnvironments) || tool.enterpriseRisk.allowedEnvironments.length === 0) {
    fail(location, "allowedEnvironments must be a non-empty array");
  }
  if (!Array.isArray(tool.enterpriseRisk.forbiddenEnvironments) || tool.enterpriseRisk.forbiddenEnvironments.length === 0) {
    fail(location, "forbiddenEnvironments must be a non-empty array");
  }
}

function parseMethodFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return null;
  }
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function parseSourceRefs(value, location) {
  if (!value) {
    return [];
  }
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (error) {
      fail(location, `sourceRef JSON parse failed: ${error.message}`);
      return [];
    }
  }
  return value.split(",").map((part) => part.trim()).filter(Boolean);
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

function isSafePackagePath(relativePath) {
  const portable = String(relativePath ?? "").replace(/\\/g, "/");
  return portable.length > 0
    && portable === path.posix.normalize(portable)
    && !portable.startsWith("/")
    && !/^[A-Za-z]:\//.test(portable)
    && !portable.split("/").includes("..");
}

async function validateScriptsManifest() {
  const relativePath = `${AI_ROOT}/scripts-manifest.json`;
  const manifest = await readJson(relativePath);
  if (!manifest) return;
  if (manifest.schemaVersion !== "2.0.0") {
    fail(relativePath, "scripts manifest schemaVersion must be 2.0.0");
  }
  const scripts = Array.isArray(manifest.scripts) ? manifest.scripts : [];
  if (!Array.isArray(manifest.scripts)) {
    fail(relativePath, "scripts manifest scripts must be an array");
  }
  const expectedPaths = [];
  for (const directory of SCRIPT_PROVENANCE_DIRECTORIES) {
    const directoryPath = assertPathContained(
      ROOT,
      rootPath(directory),
      `canonical script provenance directory ${directory}`
    );
    const entries = (await readdir(directoryPath, { withFileTypes: true }))
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (!entry.name.endsWith(".mjs") || entry.name.startsWith("test-")) continue;
      const scriptPath = `${directory}/${entry.name}`;
      if (!entry.isFile()) {
        fail(relativePath, `canonical script provenance path must be a regular file: ${scriptPath}`);
        continue;
      }
      expectedPaths.push(scriptPath);
    }
  }
  expectedPaths.sort((left, right) => left.localeCompare(right));
  const manifestPaths = scripts.map((script) => script?.path);
  if (
    new Set(manifestPaths).size !== manifestPaths.length
    || JSON.stringify(manifestPaths) !== JSON.stringify(expectedPaths)
  ) {
    fail(relativePath, "scripts manifest exact closure mismatch");
  }

  for (const script of scripts) {
    if (!isSafePackagePath(script.path)) {
      fail(relativePath, `unsafe script manifest path: ${script.path}`);
      continue;
    }
    if (script.sha256 === null && script.status === "planned") {
      if (await exists(script.path)) fail(relativePath, `planned script exists without an exact-byte digest: ${script.path}`);
      continue;
    }
    if (!(await exists(script.path))) {
      fail(relativePath, `script manifest source missing: ${script.path}`);
      continue;
    }
    if (script.sha256 !== await sha256(script.path, { exactBytes: true })) {
      fail(relativePath, `script manifest exact-byte digest drift: ${script.path}`);
    }
  }
}

async function validateDeliveryKernelPackage(topManifest, expectedAgentTomlPaths) {
  const location = `${AI_ROOT}/manifest.json`;
  const packageRoot = `${AI_ROOT}/runtime/delivery-kernel`;
  const packageManifestPath = `${packageRoot}/package-manifest.json`;
  if (
    topManifest.deliveryKernelPackage?.root !== packageRoot
    || topManifest.deliveryKernelPackage?.manifestPath !== packageManifestPath
  ) {
    fail(location, "delivery kernel package coordinates must use the governed embedded path");
    return;
  }

  const packageManifest = await readJson(packageManifestPath);
  if (!packageManifest) return;
  if (packageManifest.schemaVersion !== "2.0.0") {
    fail(packageManifestPath, "delivery kernel package schemaVersion must be 2.0.0");
  }
  const packageManifestDigest = await sha256(packageManifestPath, { exactBytes: true });
  if (topManifest.deliveryKernelPackage.manifestSha256 !== packageManifestDigest) {
    fail(packageManifestPath, "delivery kernel package manifest attestation drift");
  }

  const actualFiles = (await walk(packageRoot))
    .map((file) => file.slice(`${packageRoot}/`.length))
    .filter((file) => file !== "package-manifest.json")
    .sort((left, right) => left.localeCompare(right));
  const attestedFiles = [...(packageManifest.files ?? [])]
    .sort((left, right) => String(left.path).localeCompare(String(right.path)));
  const attestedPaths = attestedFiles.map((entry) => entry.path);
  if (
    new Set(attestedPaths).size !== attestedPaths.length
    || attestedPaths.some((file) => !isSafePackagePath(file))
  ) {
    fail(packageManifestPath, "delivery kernel package manifest contains duplicate or unsafe file paths");
  }
  if (JSON.stringify(actualFiles) !== JSON.stringify(attestedPaths)) {
    fail(packageManifestPath, "delivery kernel package manifest file closure mismatch");
  }
  for (const tomlPath of expectedAgentTomlPaths) {
    if (!attestedPaths.includes(tomlPath)) {
      fail(packageManifestPath, `delivery kernel package missing canonical agent runtime: ${tomlPath}`);
    }
  }
  for (const entry of attestedFiles) {
    if (!isSafePackagePath(entry.path) || !(await exists(`${packageRoot}/${entry.path}`))) continue;
    if (entry.sha256 !== await sha256(`${packageRoot}/${entry.path}`, { exactBytes: true })) {
      fail(`${packageRoot}/${entry.path}`, "delivery kernel package byte digest mismatch");
    }
  }

  if (!isSafePackagePath(packageManifest.entrypoint)) {
    fail(packageManifestPath, "delivery kernel entrypoint is unsafe");
    return;
  }
  const packageFiles = new Set(actualFiles);
  const queue = [packageManifest.entrypoint];
  const visited = new Set();
  while (queue.length > 0) {
    const modulePath = queue.shift();
    if (visited.has(modulePath)) continue;
    if (!packageFiles.has(modulePath)) {
      fail(packageManifestPath, `delivery kernel import closure is missing: ${modulePath}`);
      continue;
    }
    visited.add(modulePath);
    const sourceText = await readRegularFile(
      `${packageRoot}/${modulePath}`,
      "utf8",
      `delivery kernel closure module ${modulePath}`
    );
    for (const specifier of moduleSpecifiers(sourceText)) {
      if (specifier.startsWith("node:")) continue;
      if (!specifier.startsWith(".")) {
        fail(`${packageRoot}/${modulePath}`, `delivery kernel import closure contains an external dependency: ${specifier}`);
        continue;
      }
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(modulePath), specifier));
      if (!isSafePackagePath(resolved)) {
        fail(`${packageRoot}/${modulePath}`, `delivery kernel import closure escapes its package: ${specifier}`);
        continue;
      }
      if (!packageFiles.has(resolved)) {
        fail(packageManifestPath, `delivery kernel import closure is missing: ${resolved}`);
        continue;
      }
      if (resolved.endsWith(".mjs")) queue.push(resolved);
    }
  }
}

async function validatePackageShape() {
  for (const dir of ["skills", "agents", "compiled-agents", "registries", "tool-packs", "checklists", "sources", "integrations", "templates", "evals", "methods", "docs"]) {
    if (!(await exists(`${AI_ROOT}/${dir}`))) {
      fail(`${AI_ROOT}/${dir}`, "missing embedded package directory");
    }
  }
  for (const dir of ["agents", "compiled-agents", "registries", "methods", "sources", "profiles", "evals", "scripts", "skills"]) {
    if (!(await exists(dir))) {
      fail(dir, "top-level canonical folder missing; this pass must not delete, relocate, or flatten top-level folders");
    }
  }
  const version = (await readFile(rootPath(`${AI_ROOT}/VERSION`), "utf8")).trim();
  if (version !== TOOLKIT_VERSION) {
    fail(`${AI_ROOT}/VERSION`, `expected ${TOOLKIT_VERSION}`);
  }
}

async function validateManifest() {
  const manifest = await readJson(`${AI_ROOT}/manifest.json`);
  if (!manifest) {
    return;
  }
  if (manifest.toolkitVersion !== TOOLKIT_VERSION) {
    fail(`${AI_ROOT}/manifest.json`, "toolkitVersion mismatch");
  }
  if (!/non-runtime/i.test(manifest.runtimeBoundary || "")) {
    fail(`${AI_ROOT}/manifest.json`, "runtimeBoundary must state .ai-toolkit is non-runtime storage");
  }
  if (manifest.schemaVersion !== "2.0.0") {
    fail(`${AI_ROOT}/manifest.json`, "embedded manifest schemaVersion must be 2.0.0");
  }
  const exactBytes = true;
  for (const skill of ACTIVE_SKILLS) {
    if (!manifest.activeSkills?.includes(skill)) {
      fail(`${AI_ROOT}/manifest.json`, `missing active skill ${skill}`);
    }
  }
  const canonicalAgentRegistry = await readJson("registries/agents.registry.json");
  const expectedProjectAgents = (canonicalAgentRegistry?.agents ?? []).map((agent) => agent.name);
  const expectedAgentTomlPaths = (canonicalAgentRegistry?.agents ?? []).map((agent) => agent.runtimeFiles?.tomlPath);
  if (JSON.stringify(manifest.activeProjectAgents ?? []) !== JSON.stringify(expectedProjectAgents)) {
    fail(`${AI_ROOT}/manifest.json`, "active project agents must exactly match the canonical registry");
  }
  for (const [index, tomlPath] of expectedAgentTomlPaths.entries()) {
    const agentName = expectedProjectAgents[index];
    const expectedPath = `.codex/agents/${agentName}.toml`;
    if (tomlPath !== expectedPath) {
      fail("registries/agents.registry.json", `canonical runtime TOML mismatch for ${agentName}`);
      continue;
    }
    const runtimeTarget = `${AI_ROOT}/runtime-agents/${path.posix.basename(tomlPath)}`;
    const runtimeMirror = (manifest.mirrors ?? []).find((entry) => (
      entry.source === tomlPath && entry.target === runtimeTarget
    ));
    if (!runtimeMirror) {
      fail(`${AI_ROOT}/manifest.json`, `missing canonical agent runtime mirror for ${agentName}`);
    }
  }
  const mirrors = Array.isArray(manifest.mirrors) ? manifest.mirrors : [];
  const mirrorTargets = mirrors.map((mirror) => mirror?.target);
  if (new Set(mirrorTargets).size !== mirrorTargets.length) {
    fail(`${AI_ROOT}/manifest.json`, "embedded mirror targets must be unique");
  }
  for (const mirror of mirrors) {
    if (!(await exists(mirror.source))) {
      fail(`${AI_ROOT}/manifest.json`, `mirror source missing: ${mirror.source}`);
      continue;
    }
    if (!(await exists(mirror.target))) {
      fail(`${AI_ROOT}/manifest.json`, `mirror target missing: ${mirror.target}`);
      continue;
    }
    const actualHash = await sha256(mirror.target, { exactBytes });
    if (mirror.sha256 !== actualHash) {
      fail(mirror.target, "manifest target hash drift");
    }
    if (mirror.mode === "byte-identical") {
      const sourceText = await readFile(rootPath(mirror.source), "utf8");
      const targetText = await readFile(rootPath(mirror.target), "utf8");
      if (sourceText !== targetText) {
        fail(mirror.target, `byte-identical mirror drifts from ${mirror.source}`);
      }
    }
    if (mirror.source === "sources/source-watchlist.json") {
      const sourceHash = await sha256(mirror.source, { exactBytes });
      if (mirror.sourceSha256 !== sourceHash || mirror.targetSha256 !== actualHash) {
        fail(mirror.target, "source catalog mirror source/target digest attestation drift");
      }
    }
  }
  const generatedArtifacts = manifest.generatedArtifacts || [];
  const coderabbitIntegration = generatedArtifacts.find((artifact) => artifact.path === `${AI_ROOT}/integrations/coderabbit.md`);
  if (!coderabbitIntegration) {
    fail(`${AI_ROOT}/manifest.json`, "missing generated artifact hash for CodeRabbit integration record");
  }
  for (const artifact of generatedArtifacts) {
    if (!(await exists(artifact.path))) {
      fail(`${AI_ROOT}/manifest.json`, `generated artifact missing: ${artifact.path}`);
      continue;
    }
    const actualHash = await sha256(artifact.path, { exactBytes });
    if (artifact.sha256 !== actualHash) {
      fail(artifact.path, "manifest generated artifact hash drift");
    }
  }
  await validateDeliveryKernelPackage(manifest, expectedAgentTomlPaths.filter(Boolean));
}

async function validateSourceMap() {
  const sourceMap = await readJson(`${AI_ROOT}/source-of-truth-map.json`);
  if (!sourceMap) {
    return;
  }
  const domains = new Set((sourceMap.domains || []).map((entry) => entry.domain));
  for (const expected of SOURCE_OF_TRUTH_MAP.map((entry) => entry.domain)) {
    if (!domains.has(expected)) {
      fail(`${AI_ROOT}/source-of-truth-map.json`, `missing source-of-truth domain ${expected}`);
    }
  }
}

async function validateToolRegistry() {
  const registry = await readJson(`${AI_ROOT}/registries/tools.registry.json`);
  if (!registry) {
    return;
  }
  if (!/never implies install/i.test(registry.activationPolicy || "")) {
    fail(`${AI_ROOT}/registries/tools.registry.json`, "activationPolicy must forbid install/activation by registry presence");
  }
  const ids = new Set();
  const required = ["id", "name", "repository", "homepage", "purpose", "category", "status", "activationStatus", "runtimeSurface", "defaultUse", "approvalRequiredFor", "allowedUse", "forbiddenUse", "sourceRecordPath", "integrationRecordPath", "enterpriseRisk", "notes"];
  for (const tool of registry.tools || []) {
    const location = `${AI_ROOT}/registries/tools.registry.json:${tool.id || "<unknown>"}`;
    for (const field of required) {
      if (!(field in tool)) {
        fail(location, `missing ${field}`);
      }
    }
    if ("currentPosture" in tool) {
      fail(location, "currentPosture is retired; use status, activationStatus, defaultUse, activationLevels, and enterpriseRisk.reviewState");
    }
    validateEnterpriseRisk(tool, location);
    if (ids.has(tool.id)) {
      fail(location, "duplicate tool id");
    }
    ids.add(tool.id);
    if (tool.id === "coderabbit") {
      if (!isCodeRabbitIntegration(tool)) {
        fail(location, "CodeRabbit is the only allowed integration-backed tool and must use the approved delegated integration schema");
      }
      if (!(await exists(`${AI_ROOT}/integrations/coderabbit.md`))) {
        fail(location, "CodeRabbit integration record is missing");
      }
      const approval = JSON.stringify(tool.approvalRequiredFor || []).toLowerCase();
      for (const requiredApproval of ["installing plugin", "changing coderabbit configuration", "changing github app permissions", "ci workflow changes", "pr write/merge actions"]) {
        if (!approval.includes(requiredApproval)) {
          fail(location, `approvalRequiredFor must include ${requiredApproval}`);
        }
      }
      const forbidden = JSON.stringify(tool.forbiddenUse || []).toLowerCase();
      for (const requiredBoundary of ["install/configure", "authenticate or activate", "repo policy", "merge based only", "noisy reviewdog"]) {
        if (!forbidden.includes(requiredBoundary)) {
          fail(location, `forbiddenUse must block ${requiredBoundary}`);
        }
      }
      continue;
    }
    if (tool.activationStatus !== "metadata-only") {
      fail(location, "activationStatus must be metadata-only");
    }
    if (!tool.sourceRecordPath || typeof tool.sourceRecordPath !== "string") {
      fail(location, "sourceRecordPath is required for normal external-source tool metadata");
    } else if (!(await exists(tool.sourceRecordPath))) {
      fail(location, `source record missing: ${tool.sourceRecordPath}`);
    }
    if (tool.integrationRecordPath !== null) {
      fail(location, "integrationRecordPath is only allowed for the CodeRabbit delegated integration");
    }
    const forbidden = JSON.stringify(tool.forbiddenUse || []).toLowerCase();
    if (!forbidden.includes("do not install") || !forbidden.includes("raw upstream")) {
      fail(location, "forbiddenUse must block installs and raw upstream copying");
    }
  }
}

async function validateMethodTraceability() {
  const registry = await readJson(`${AI_ROOT}/registries/methods.registry.json`);
  const watchlist = await readJson("sources/source-watchlist.json");
  if (!registry || !watchlist) {
    return;
  }

  const sourceIdByRecordPath = new Map((watchlist.sources || []).map((source) => [source.sourceRecordPath, source.id]));
  const sourceIds = new Set((watchlist.sources || []).map((source) => source.id));
  for (const method of registry.methods || []) {
    const location = `${AI_ROOT}/registries/methods.registry.json:${method.id || "<unknown>"}`;
    if (!method.methodPath || !(await exists(method.methodPath))) {
      fail(location, `methodPath missing or unreadable: ${method.methodPath || "<missing>"}`);
      continue;
    }

    const text = await readFile(rootPath(method.methodPath), "utf8");
    const frontmatter = parseMethodFrontmatter(text);
    if (!frontmatter) {
      fail(method.methodPath, "missing method sourceRef frontmatter");
      continue;
    }
    for (const field of METHOD_TRACEABILITY_FIELDS) {
      if (!(field in frontmatter)) {
        fail(method.methodPath, `frontmatter missing ${field}`);
      }
    }

    const sourceRefs = parseSourceRefs(frontmatter.sourceRef, method.methodPath);
    for (const sourceRef of sourceRefs) {
      if (!SPECIAL_METHOD_SOURCE_REFS.has(sourceRef) && !sourceIds.has(sourceRef)) {
        fail(method.methodPath, `sourceRef does not resolve to source-watchlist id: ${sourceRef}`);
      }
    }

    const expectedRefs = new Set();
    let hasToolkitAuthoredProvenance = false;
    for (const entry of method.sourceProvenance || []) {
      if (entry?.category === "toolkit-authored") {
        hasToolkitAuthoredProvenance = true;
      }
      if (entry?.path?.startsWith("sources/")) {
        expectedRefs.add(sourceIdByRecordPath.get(entry.path) || "unknown-review-required");
      }
    }
    if (expectedRefs.size === 0) {
      expectedRefs.add(hasToolkitAuthoredProvenance && sourceRefs.includes("toolkit-authored") ? "toolkit-authored" : "unknown-review-required");
    }
    for (const expectedRef of expectedRefs) {
      if (!sourceRefs.includes(expectedRef)) {
        fail(method.methodPath, `sourceRef missing expected source: ${expectedRef}`);
      }
    }
    if (frontmatter.lastExtracted !== "unknown-review-required" && !/^\d{4}-\d{2}-\d{2}$/.test(String(frontmatter.lastExtracted || ""))) {
      fail(method.methodPath, "lastExtracted must be YYYY-MM-DD or unknown-review-required");
    }
    const status = String(frontmatter.status || "");
    if (status !== "unknown-review-required" && (!Array.isArray(method.status) || !method.status.includes(status))) {
      fail(method.methodPath, "frontmatter status must match registry status or unknown-review-required");
    }
  }
}

async function validateWatchlist() {
  const watchlist = await readJson(`${AI_ROOT}/sources/watchlist.json`);
  if (!watchlist) {
    return;
  }
  try {
    validateSourceCatalog(watchlist);
  } catch (error) {
    fail(`${AI_ROOT}/sources/watchlist.json`, error.message);
    return;
  }
  const canonicalText = await readFile(rootPath("sources/source-watchlist.json"), "utf8");
  const mirrorText = await readFile(rootPath(`${AI_ROOT}/sources/watchlist.json`), "utf8");
  if (canonicalText !== mirrorText) {
    fail(`${AI_ROOT}/sources/watchlist.json`, "generated source catalog mirror is not byte-identical to canonical input");
  }
  const ids = new Set();
  for (const source of watchlist.sources || []) {
    const location = `${AI_ROOT}/sources/watchlist.json:${source.id || "<unknown>"}`;
    if (ids.has(source.id)) {
      fail(location, "duplicate source id");
    }
    ids.add(source.id);
    if (source.sourceRecordPath && !(await exists(source.sourceRecordPath))) {
      fail(location, `source record missing: ${source.sourceRecordPath}`);
    }
    if (source.id === "coderabbit" && source.lifecycle !== "service-integration") {
      fail(location, "CodeRabbit must remain a governed service-integration source");
    }
  }
  if (await exists(`${AI_ROOT}/sources/records/coderabbit.md`)) {
    fail(`${AI_ROOT}/sources/records/coderabbit.md`, "CodeRabbit must not be emitted as a source record");
  }
}

async function validateUnsafeText() {
  const files = await walk(AI_ROOT);
  for (const file of files) {
    if (!/\.(md|json|toml)$/i.test(file)) {
      continue;
    }
    scanUnsafe(file, await readFile(rootPath(file), "utf8"));
  }
}

async function validateRuntimeBoundaryDocs() {
  const runtimeDoc = await readFile(rootPath("docs/RUNTIME_ACTIVATION_MODEL.md"), "utf8").catch(() => "");
  for (const required of [".agents/skills", "$HOME/.agents/skills", ".codex/agents", "~/.codex/agents", ".ai-toolkit"]) {
    if (!runtimeDoc.includes(required)) {
      fail("docs/RUNTIME_ACTIVATION_MODEL.md", `missing runtime boundary text for ${required}`);
    }
  }
  if (!/non-runtime|not runtime activation/i.test(runtimeDoc)) {
    fail("docs/RUNTIME_ACTIVATION_MODEL.md", "must state .ai-toolkit is non-runtime storage");
  }
}

function validateReferenceClosure() {
  for (const failure of collectReferenceClosureFailures({ root: ROOT })) {
    fail(failure.location, `[${failure.check}] ${failure.message}`);
  }
}

async function main() {
  await validatePackageShape();
  await validateManifest();
  await validateScriptsManifest();
  await validateSourceMap();
  await validateToolRegistry();
  await validateMethodTraceability();
  await validateWatchlist();
  await validateUnsafeText();
  await validateRuntimeBoundaryDocs();
  validateReferenceClosure();

  if (warnings.length > 0) {
    console.log("WARN validate-ai-toolkit");
    for (const warning of warnings) {
      console.log(`- ${warning.location}: ${warning.message}`);
    }
  }

  if (failures.length === 0) {
    console.log("PASS validate-ai-toolkit");
    return;
  }

  console.log("FAIL validate-ai-toolkit");
  for (const failure of failures) {
    console.log(`- ${failure.location}: ${failure.message}`);
  }
  process.exitCode = 1;
}

await main().catch((error) => {
  console.error("FAIL validate-ai-toolkit");
  console.error(`fatal: ${error.message}`);
  process.exitCode = 1;
});
