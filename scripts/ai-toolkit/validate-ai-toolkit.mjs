#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import {
  ACTIVE_PROJECT_AGENTS,
  ACTIVE_SKILLS,
  SOURCE_OF_TRUTH_MAP,
  TOOLKIT_VERSION,
  UNSAFE_COMMAND_PATTERNS
} from "./embedded-data.mjs";
import { collectReferenceClosureFailures } from "./reference-closure.mjs";

const ROOT = process.cwd();
const AI_ROOT = ".ai-toolkit";
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
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
  } catch (error) {
    fail(relativePath, `JSON parse failed: ${error.message}`);
    return null;
  }
}

async function sha256(relativePath) {
  const content = await readFile(rootPath(relativePath), "utf8");
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
}

async function walk(relativeDir, output = []) {
  let entries;
  try {
    entries = await readdir(rootPath(relativeDir), { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const child = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      await walk(child, output);
    } else {
      output.push(child);
    }
  }
  return output.sort();
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
  for (const skill of ACTIVE_SKILLS) {
    if (!manifest.activeSkills?.includes(skill)) {
      fail(`${AI_ROOT}/manifest.json`, `missing active skill ${skill}`);
    }
  }
  for (const agent of ACTIVE_PROJECT_AGENTS) {
    if (!manifest.activeProjectAgents?.includes(agent)) {
      fail(`${AI_ROOT}/manifest.json`, `missing active project agent ${agent}`);
    }
  }
  for (const mirror of manifest.mirrors || []) {
    if (!(await exists(mirror.source))) {
      fail(`${AI_ROOT}/manifest.json`, `mirror source missing: ${mirror.source}`);
      continue;
    }
    if (!(await exists(mirror.target))) {
      fail(`${AI_ROOT}/manifest.json`, `mirror target missing: ${mirror.target}`);
      continue;
    }
    const actualHash = await sha256(mirror.target);
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
    const actualHash = await sha256(artifact.path);
    if (artifact.sha256 !== actualHash) {
      fail(artifact.path, "manifest generated artifact hash drift");
    }
  }
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
  const ids = new Set();
  for (const source of watchlist.sources || []) {
    const location = `${AI_ROOT}/sources/watchlist.json:${source.id || "<unknown>"}`;
    for (const field of ["id", "name", "sourceUrl", "repoOwner", "repoName", "defaultBranch", "lastReviewedCommit", "lastReviewedDate", "sourceRecordPath", "watchedPaths", "licenseConcern", "reviewPriority", "neverAutoImport"]) {
      if (!(field in source)) {
        fail(location, `missing ${field}`);
      }
    }
    if (ids.has(source.id)) {
      fail(location, "duplicate source id");
    }
    ids.add(source.id);
    if (source.id === "coderabbit") {
      fail(location, "CodeRabbit must be represented as an integration record, not a source-watchlist entry");
    }
    if (source.neverAutoImport !== true) {
      fail(location, "neverAutoImport must be true");
    }
    if (source.lastReviewedCommit !== null || source.lastReviewedDate !== null) {
      warn(location, "review metadata is populated; ensure it came from a live review in this task");
    }
    if (source.sourceRecordPath && !(await exists(source.sourceRecordPath))) {
      fail(location, `source record missing: ${source.sourceRecordPath}`);
    }
    if (!Array.isArray(source.watchedPaths)) {
      fail(location, "watchedPaths must be an array");
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
