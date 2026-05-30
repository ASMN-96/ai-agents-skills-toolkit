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

const ROOT = process.cwd();
const AI_ROOT = ".ai-toolkit";
const failures = [];
const warnings = [];

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

async function validatePackageShape() {
  for (const dir of ["skills", "agents", "compiled-agents", "registries", "tool-packs", "checklists", "sources", "templates", "evals"]) {
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
  const required = ["id", "name", "repository", "homepage", "purpose", "category", "status", "activationStatus", "runtimeSurface", "defaultUse", "approvalRequiredFor", "allowedUse", "forbiddenUse", "sourceRecordPath", "notes"];
  for (const tool of registry.tools || []) {
    const location = `${AI_ROOT}/registries/tools.registry.json:${tool.id || "<unknown>"}`;
    for (const field of required) {
      if (!(field in tool)) {
        fail(location, `missing ${field}`);
      }
    }
    if (ids.has(tool.id)) {
      fail(location, "duplicate tool id");
    }
    ids.add(tool.id);
    if (tool.activationStatus !== "metadata-only") {
      fail(location, "activationStatus must be metadata-only");
    }
    if (tool.sourceRecordPath && !(await exists(tool.sourceRecordPath))) {
      fail(location, `source record missing: ${tool.sourceRecordPath}`);
    }
    const forbidden = JSON.stringify(tool.forbiddenUse || []).toLowerCase();
    if (!forbidden.includes("do not install") || !forbidden.includes("raw upstream")) {
      fail(location, "forbiddenUse must block installs and raw upstream copying");
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

async function main() {
  await validatePackageShape();
  await validateManifest();
  await validateSourceMap();
  await validateToolRegistry();
  await validateWatchlist();
  await validateUnsafeText();
  await validateRuntimeBoundaryDocs();

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
