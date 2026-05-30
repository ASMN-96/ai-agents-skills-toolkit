#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const ROOT = process.cwd();
const execFileAsync = promisify(execFile);
const failures = [];
const warnings = [];
const checks = [];
const totals = {
  registries: 0,
  evals: 0,
  sources: 0
};

const PROVENANCE_CATEGORIES = new Set([
  "internal-artifact",
  "external-source",
  "restricted-source",
  "historical-reference",
  "local-vd-authored"
]);

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
  "defaultEnterpriseStatus"
];

const METHOD_TRACEABILITY_FIELDS = new Set([
  "sourceRef",
  "lastExtracted",
  "status"
]);

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;
const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const GITHUB_REPO_PATTERN = /^[A-Za-z0-9._-]+$/;
const SAFE_BRANCH_PATTERN = /^[A-Za-z0-9._/-]+$/;

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(check, location, message) {
  failures.push({ check, location, message });
}

function warn(check, location, message) {
  warnings.push({ check, location, message });
}

function note(check) {
  checks.push(check);
}

function failSubvalidator(check, output) {
  for (const line of output.trim().split(/\r?\n/).filter(Boolean)) {
    fail(check, check, line);
  }
}

function collectSubvalidatorWarnings(check, validator, output) {
  let currentWarning = null;
  for (const rawLine of output.trim().split(/\r?\n/).filter(Boolean)) {
    const line = rawLine.trimEnd();
    if (line.startsWith("WARN ")) {
      const message = line.replace(/^WARN\s+/, "");
      currentWarning = message;
      warn(check, validator, message);
      continue;
    }

    if (currentWarning && line.startsWith("- ")) {
      warn(check, validator, `${currentWarning} ${line}`);
      continue;
    }

    currentWarning = null;
  }
}

async function exists(relativePath) {
  try {
    await access(rootPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath, checkName) {
  const raw = await readFile(rootPath(relativePath), "utf8");
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(checkName, relativePath, `JSON parse failed: ${error.message}`);
    return null;
  }
}

async function walk(relativeDir, options = {}) {
  const root = rootPath(relativeDir);
  const output = [];

  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const normalized = rel(fullPath);
      if (entry.isDirectory()) {
        if (options.skipDirs?.has(entry.name)) {
          continue;
        }
        if (options.includeDirs) {
          output.push(normalized);
        }
        await visit(fullPath);
      } else if (!options.extension || entry.name.endsWith(options.extension)) {
        output.push(normalized);
      }
    }
  }

  await visit(root);
  return output.sort();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function byName(items, field = "name") {
  return new Map(asArray(items).map((item) => [item[field], item]));
}

function hasExactVisibility(value) {
  return Array.isArray(value) && value.length === 2 && value[0] === "repo" && value[1] === "project-sync";
}

function validateGithubSourceIdentity(source, location) {
  if (typeof source.repoOwner !== "string" || !GITHUB_OWNER_PATTERN.test(source.repoOwner)) {
    fail("source-watchlist", location, "repoOwner must be a GitHub owner name");
  }
  if (typeof source.repoName !== "string" || !GITHUB_REPO_PATTERN.test(source.repoName)) {
    fail("source-watchlist", location, "repoName must be a GitHub repository name");
  }
  if (typeof source.defaultBranch !== "string" || !SAFE_BRANCH_PATTERN.test(source.defaultBranch)) {
    fail("source-watchlist", location, "defaultBranch must use safe branch characters only");
  } else if (source.defaultBranch.includes("..") || source.defaultBranch.startsWith("/") || source.defaultBranch.endsWith("/")) {
    fail("source-watchlist", location, "defaultBranch must not contain path traversal or leading/trailing slashes");
  }

  let parsed;
  try {
    parsed = new URL(source.sourceUrl);
  } catch {
    fail("source-watchlist", location, "sourceUrl must be an https://github.com/<owner>/<repo> URL");
    return;
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== "github.com" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    fail("source-watchlist", location, "sourceUrl must be an https://github.com/<owner>/<repo> URL without credentials, query, or fragment");
    return;
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || segments[0] !== source.repoOwner || segments[1] !== source.repoName) {
    fail("source-watchlist", location, "sourceUrl must match repoOwner/repoName exactly");
  }
}

async function validateJsonParsing() {
  note("JSON parsing");
  const registryFiles = (await walk("registries", { extension: ".json" })).filter((file) => file.startsWith("registries/"));
  const evalFiles = await walk("evals", { extension: ".json" });
  const jsonFiles = [...registryFiles, ...evalFiles, "sources/source-watchlist.json"];

  totals.registries = registryFiles.length;
  totals.evals = evalFiles.length;

  const parsed = new Map();
  for (const file of jsonFiles) {
    parsed.set(file, await readJson(file, "JSON parsing"));
  }
  return parsed;
}

async function collectSourceRecords() {
  const files = await walk("sources", { extension: ".md" });
  return new Set(files);
}

async function validateSourceProvenance(owner, entries, sourceRecords, watchlistRecordPaths) {
  if (!Array.isArray(entries)) {
    fail("sourceProvenance", owner, "sourceProvenance must be an array");
    return;
  }

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      fail("sourceProvenance", owner, "sourceProvenance entry must be an object");
      continue;
    }
    const keys = Object.keys(entry).sort();
    if (keys.length !== 2 || keys[0] !== "category" || keys[1] !== "path") {
      fail("sourceProvenance", owner, "sourceProvenance entries must use exactly { path, category }");
    }
    if (typeof entry.path !== "string" || entry.path.length === 0) {
      fail("sourceProvenance", owner, "sourceProvenance entry is missing path");
      continue;
    }
    if (typeof entry.category !== "string" || !PROVENANCE_CATEGORIES.has(entry.category)) {
      fail("sourceProvenance", `${owner}:${entry.path}`, `invalid category ${entry.category}`);
    }
    if (!(await exists(entry.path))) {
      fail("sourceProvenance", `${owner}:${entry.path}`, "referenced path does not exist");
    }
    if (["external-source", "restricted-source", "historical-reference"].includes(entry.category)) {
      if (!entry.path.startsWith("sources/") || !sourceRecords.has(entry.path)) {
        fail("sourceProvenance", `${owner}:${entry.path}`, "source category must point to a valid source record");
      }
    }
    if (entry.category === "external-source" && entry.path.includes("anthropic-skills.md")) {
      fail("source policy", `${owner}:${entry.path}`, "Anthropic must remain restricted-source, not external-source");
    }
    if (entry.category === "external-source" && entry.path.includes("vercel-")) {
      fail("source policy", `${owner}:${entry.path}`, "Vercel Labs source records must not be active external-source authority");
    }
    if (entry.category === "external-source" && sourceRecords.has(entry.path) && !watchlistRecordPaths.has(entry.path)) {
      fail("source policy", `${owner}:${entry.path}`, "active external-source record is missing from source-watchlist.json");
    }
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
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    fields[key] = value;
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
      if (!Array.isArray(parsed)) {
        fail("method sourceRef traceability", location, "sourceRef must be an array or comma-separated list");
        return [];
      }
      return parsed.map(String);
    } catch (error) {
      fail("method sourceRef traceability", location, `sourceRef JSON parse failed: ${error.message}`);
      return [];
    }
  }
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

async function validateMethodFrontmatter(method, sourceIdByRecordPath, watchlistSourceIds) {
  const location = `methods.registry:${method.id}`;
  if (!method.methodPath) {
    fail("method sourceRef traceability", location, "methodPath is required for frontmatter validation");
    return;
  }

  let text;
  try {
    text = await readFile(rootPath(method.methodPath), "utf8");
  } catch (error) {
    fail("method sourceRef traceability", method.methodPath, `could not read method file: ${error.message}`);
    return;
  }

  const frontmatter = parseMethodFrontmatter(text);
  if (!frontmatter) {
    fail("method sourceRef traceability", method.methodPath, "missing method frontmatter");
    return;
  }

  for (const field of METHOD_TRACEABILITY_FIELDS) {
    if (!(field in frontmatter)) {
      fail("method sourceRef traceability", method.methodPath, `frontmatter missing ${field}`);
    }
  }

  const sourceRefs = parseSourceRefs(frontmatter.sourceRef, method.methodPath);
  if (sourceRefs.length === 0) {
    fail("method sourceRef traceability", method.methodPath, "sourceRef must contain at least one source id or unknown-review-required");
  }

  for (const sourceRef of sourceRefs) {
    if (sourceRef !== "unknown-review-required" && !watchlistSourceIds.has(sourceRef)) {
      fail("method sourceRef traceability", method.methodPath, `sourceRef does not resolve to source-watchlist id: ${sourceRef}`);
    }
  }

  const expectedRefs = new Set();
  for (const entry of asArray(method.sourceProvenance)) {
    if (entry?.path?.startsWith("sources/")) {
      expectedRefs.add(sourceIdByRecordPath.get(entry.path) || "unknown-review-required");
    }
  }
  if (expectedRefs.size === 0) {
    expectedRefs.add("unknown-review-required");
  }
  for (const expectedRef of expectedRefs) {
    if (!sourceRefs.includes(expectedRef)) {
      fail("method sourceRef traceability", method.methodPath, `sourceRef missing expected source: ${expectedRef}`);
    }
  }

  const lastExtracted = String(frontmatter.lastExtracted || "");
  if (lastExtracted !== "unknown-review-required" && !/^\d{4}-\d{2}-\d{2}$/.test(lastExtracted)) {
    fail("method sourceRef traceability", method.methodPath, "lastExtracted must be YYYY-MM-DD or unknown-review-required");
  }

  const status = String(frontmatter.status || "");
  if (status !== "unknown-review-required" && !asArray(method.status).includes(status)) {
    fail("method sourceRef traceability", method.methodPath, `frontmatter status must match registry status or unknown-review-required: ${status}`);
  }
}

function requireKnown(check, location, values, known, label) {
  for (const value of asArray(values)) {
    if (!known.has(value)) {
      fail(check, location, `unknown ${label}: ${value}`);
    }
  }
}

function normalizeAgentDisplayReference(value) {
  const cleaned = String(value || "")
    .replace(/^(especially|and)\s+/i, "")
    .trim();

  if (cleaned === "All internal agents") {
    return "ALL_INTERNAL_AGENTS";
  }
  if (cleaned.endsWith(" Agent")) {
    return cleaned;
  }

  const aliases = new Map([
    ["Product", "Product Agent"],
    ["Architect", "Architect Agent"],
    ["Frontend", "Frontend Agent"],
    ["UIUX", "UIUX Agent"],
    ["Backend Contract", "Backend Contract Agent"],
    ["Database RLS", "Database RLS Agent"],
    ["Security", "Security Agent"],
    ["QA Test", "QA Test Agent"],
    ["Reviewer", "Reviewer Agent"],
    ["Release Manager", "Release Manager Agent"],
    ["SRE Performance", "SRE Performance Agent"],
    ["Skill Scout", "Skill Scout Agent"]
  ]);
  return aliases.get(cleaned) || cleaned;
}

async function validateRegistries(parsed, sourceRecords, watchlist) {
  note("Registry and reference integrity");
  note("Method sourceRef traceability");

  const skillsRegistry = parsed.get("registries/skills.registry.json");
  const agentsRegistry = parsed.get("registries/agents.registry.json");
  const profilesRegistry = parsed.get("registries/profiles.registry.json");
  const methodsRegistry = parsed.get("registries/methods.registry.json");
  const toolsRegistry = parsed.get("registries/tools.registry.json");
  const routingMatrix = parsed.get("registries/routing-matrix.json");

  const skills = byName(skillsRegistry?.skills);
  const agents = byName(agentsRegistry?.agents);
  const agentDisplays = new Set(asArray(agentsRegistry?.agents).map((agent) => agent.displayName));
  const profiles = byName(profilesRegistry?.profiles);
  const methods = byName(methodsRegistry?.methods, "id");
  const tools = byName(toolsRegistry?.tools, "id");
  const watchlistRecordPaths = new Set(asArray(watchlist?.sources).map((source) => source.sourceRecordPath));
  const watchlistSourceIds = new Set(asArray(watchlist?.sources).map((source) => source.id));
  const sourceIdByRecordPath = new Map(asArray(watchlist?.sources).map((source) => [source.sourceRecordPath, source.id]));

  for (const [name, skill] of skills) {
    requireKnown("referenced agents", `skills.registry:${name}`, [skill.ownerAgent], agents, "agent");
    requireKnown("referenced agents", `skills.registry:${name}`, skill.secondaryAgents, agents, "agent");
    if (skill.skillPath && !(await exists(skill.skillPath))) {
      fail("referenced skills", `skills.registry:${name}`, `skillPath does not exist: ${skill.skillPath}`);
    }
    await validateSourceProvenance(`skills.registry:${name}`, skill.sourceProvenance, sourceRecords, watchlistRecordPaths);
  }

  for (const [name, agent] of agents) {
    requireKnown("referenced profiles", `agents.registry:${name}`, agent.profiles, profiles, "profile");
    requireKnown("referenced skills", `agents.registry:${name}`, agent.ownedSkills, skills, "skill");
    requireKnown("referenced skills", `agents.registry:${name}`, agent.secondarySkills, skills, "skill");
    if (agent.compiledFallbackPath && !(await exists(agent.compiledFallbackPath))) {
      fail("referenced agents", `agents.registry:${name}`, `compiledFallbackPath does not exist: ${agent.compiledFallbackPath}`);
    }
    await validateSourceProvenance(`agents.registry:${name}`, agent.sourceProvenance, sourceRecords, watchlistRecordPaths);
  }

  for (const [name, profile] of profiles) {
    requireKnown("referenced agents", `profiles.registry:${name}`, profile.agents, agents, "agent");
    requireKnown("referenced skills", `profiles.registry:${name}`, profile.skills, skills, "skill");
    await validateSourceProvenance(`profiles.registry:${name}`, profile.sourceProvenance, sourceRecords, watchlistRecordPaths);
  }

  for (const [id, method] of methods) {
    if (method.methodPath && !(await exists(method.methodPath))) {
      fail("referenced methods", `methods.registry:${id}`, `methodPath does not exist: ${method.methodPath}`);
    }
    for (const consumer of asArray(method.passiveConsumerAgents)) {
      const normalizedConsumer = normalizeAgentDisplayReference(consumer);
      if (normalizedConsumer === "ALL_INTERNAL_AGENTS") {
        continue;
      }
      if (!agents.has(normalizedConsumer) && !agentDisplays.has(normalizedConsumer)) {
        fail("referenced agents", `methods.registry:${id}`, `unknown passiveConsumerAgent: ${consumer}`);
      }
    }
    await validateSourceProvenance(`methods.registry:${id}`, method.sourceProvenance, sourceRecords, watchlistRecordPaths);
    await validateMethodFrontmatter(method, sourceIdByRecordPath, watchlistSourceIds);
  }

  for (const scenario of asArray(routingMatrix?.scenarios)) {
    const location = `routing-matrix:${scenario.scenario || "<unknown>"}`;
    requireKnown("referenced profiles", location, [scenario.selectedProfile], profiles, "profile");
    requireKnown("referenced agents", location, scenario.agents, agents, "agent");
    requireKnown("referenced skills", location, scenario.skills, skills, "skill");
    requireKnown("referenced methods", location, scenario.methodReferences, methods, "method");
  }

  return { skills, agents, profiles, methods, tools, routingMatrix };
}

async function validateEnterpriseToolMetadata(registryState) {
  note("Enterprise external-tool risk metadata");

  for (const [id, tool] of registryState.tools) {
    const location = `tools.registry:${id}`;
    if (!tool.enterpriseRisk || typeof tool.enterpriseRisk !== "object" || Array.isArray(tool.enterpriseRisk)) {
      fail("enterprise tool metadata", location, "missing enterpriseRisk object");
      continue;
    }

    for (const field of ENTERPRISE_RISK_FIELDS) {
      if (!(field in tool.enterpriseRisk)) {
        fail("enterprise tool metadata", location, `enterpriseRisk missing ${field}`);
      }
    }

    if (!String(tool.enterpriseRisk.defaultEnterpriseStatus || "").includes("metadata-only")) {
      fail("enterprise tool metadata", location, "defaultEnterpriseStatus must remain metadata-only unless explicitly approved");
    }
    if (/enterprise-approved|approved/i.test(String(tool.enterpriseRisk.securityReviewStatus || ""))) {
      fail("enterprise tool metadata", location, "securityReviewStatus must not claim enterprise approval without evidence");
    }
    if (!Array.isArray(tool.enterpriseRisk.allowedEnvironments) || tool.enterpriseRisk.allowedEnvironments.length === 0) {
      fail("enterprise tool metadata", location, "allowedEnvironments must be a non-empty array");
    }
    if (!Array.isArray(tool.enterpriseRisk.forbiddenEnvironments) || tool.enterpriseRisk.forbiddenEnvironments.length === 0) {
      fail("enterprise tool metadata", location, "forbiddenEnvironments must be a non-empty array");
    }
  }
}

async function validateSkills(registryState) {
  note("Skill checks");
  const skillFiles = [
    ...(await walk("skills", { extension: "SKILL.md" })),
    ...(await walk(".agents/skills", { extension: "SKILL.md" }))
  ];

  for (const file of skillFiles) {
    const text = await readFile(rootPath(file), "utf8");
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) {
      fail("skill frontmatter", file, "missing YAML frontmatter");
      continue;
    }
    const frontmatter = match[1];
    if (!/^name:\s*.+$/m.test(frontmatter)) {
      fail("skill frontmatter", file, "missing name");
    }
    if (!/^description:\s*.+$/m.test(frontmatter)) {
      fail("skill frontmatter", file, "missing description");
    }
  }

  const primary = await readFile(rootPath("skills/vd-premium-uiux/SKILL.md"));
  const mirror = await readFile(rootPath(".agents/skills/vd-premium-uiux/SKILL.md"));
  if (!primary.equals(mirror)) {
    fail("vd-premium-uiux mirror", "skills/vd-premium-uiux/SKILL.md", "repo and .agents copies are not byte-identical");
  }

  const vdSkill = registryState.skills.get("vd-premium-uiux");
  if (!hasExactVisibility(vdSkill?.visibility)) {
    fail("vd-premium-uiux visibility", "registries/skills.registry.json", "vd-premium-uiux visibility must remain [\"repo\",\"project-sync\"]");
  }

  for (const helperName of ["riss-agent-governance", "riss-skill-governance"]) {
    const helper = registryState.skills.get(helperName);
    if (!helper || helper.registrySurface !== "internal-helper") {
      fail("helper skill boundary", `registries/skills.registry.json:${helperName}`, "helper skill must remain internal-helper");
    }
  }

  const commandPattern = /^\s*(?:[$>]\s*)?(?:git\s+clone|npm\s+(?:install|i)\b|pnpm\s+(?:add|install)\b|yarn\s+(?:add|install)\b|bun\s+add\b|pip3?\s+install\b|brew\s+install\b|winget\s+install\b|npx\s+skills\s+(?:add|install|update|check)\b|npx\s+shadcn\b|curl\b.*\|\s*(?:sh|bash)|wget\b.*\|\s*(?:sh|bash))/i;
  for (const file of skillFiles) {
    const lines = (await readFile(rootPath(file), "utf8")).split(/\r?\n/);
    lines.forEach((line, index) => {
      if (commandPattern.test(line)) {
        fail("active skill command scan", `${file}:${index + 1}`, "active skill text contains a raw install/copy/activation-style command");
      }
    });
  }
}

async function validateGovernanceBoundaries(registryState) {
  note("Governance and routing boundaries");
  const uiPattern = /(ui|ux|frontend|dashboard|visual|responsive|design|accessibility|mobile|browser-visible|layout)/i;
  const nonUiPattern = /(backend|rls|database|security|release|docs-only|supabase|postgres|api-contract|coderabbit|dependency)/i;

  for (const scenario of asArray(registryState.routingMatrix?.scenarios)) {
    const skills = asArray(scenario.skills);
    if (!skills.includes("vd-premium-uiux")) {
      continue;
    }
    const text = [
      scenario.scenario,
      scenario.inferredIntent,
      ...asArray(scenario.userLanguageExamples)
    ].join(" ");
    if (!uiPattern.test(text)) {
      fail("vd-premium-uiux routing", `routing-matrix:${scenario.scenario}`, "vd-premium-uiux is selected for a non-UI/UX scenario");
    }
    if (nonUiPattern.test(scenario.scenario) && !/frontend-ui-bug|dashboard-ui-redesign/i.test(scenario.scenario)) {
      fail("vd-premium-uiux routing", `routing-matrix:${scenario.scenario}`, "backend/security/release/docs-only scenario must not select vd-premium-uiux");
    }
  }

  const riss = registryState.skills.get("riss-governance");
  if (!riss || riss.registrySurface !== "user-facing") {
    fail("riss-governance boundary", "registries/skills.registry.json:riss-governance", "riss-governance must remain the user-facing controller/router/safety skill");
  }
  const rissText = await readFile(rootPath("skills/riss-governance/SKILL.md"), "utf8");
  if (!/source-of-truth/i.test(rissText) || !/safety/i.test(rissText) || !/routing/i.test(rissText)) {
    fail("riss-governance boundary", "skills/riss-governance/SKILL.md", "riss-governance must preserve source-of-truth, safety, and routing language");
  }
}

async function validateSourcePolicy(watchlist, registryState) {
  note("Source policy checks");
  const sources = asArray(watchlist?.sources);
  totals.sources = sources.length;
  const ids = new Set();

  for (const source of sources) {
    const location = `sources/source-watchlist.json:${source.id || "<unknown>"}`;
    for (const field of ["id", "name", "sourceUrl", "repoOwner", "repoName", "defaultBranch", "sourceRecordPath", "watchedPaths", "neverAutoImport"]) {
      if (!(field in source)) {
        fail("source-watchlist", location, `missing ${field}`);
      }
    }
    if (ids.has(source.id)) {
      fail("source-watchlist", location, "duplicate source id");
    }
    ids.add(source.id);
    if (source.neverAutoImport !== true) {
      fail("source policy", location, "neverAutoImport must be true");
    }
    validateGithubSourceIdentity(source, location);
    if (source.lastReviewedCommit !== null && (typeof source.lastReviewedCommit !== "string" || !COMMIT_SHA_PATTERN.test(source.lastReviewedCommit))) {
      fail("source-watchlist", location, "lastReviewedCommit must be null or a 40-character Git commit SHA");
    }
    if (source.sourceRecordPath && !(await exists(source.sourceRecordPath))) {
      fail("source-watchlist", location, `sourceRecordPath does not exist: ${source.sourceRecordPath}`);
    }
    if (!Array.isArray(source.watchedPaths)) {
      fail("source-watchlist", location, "watchedPaths must be an array");
    }
  }

  for (const required of ["impeccable", "uncodixfy"]) {
    const source = sources.find((entry) => entry.id === required);
    if (!source || source.neverAutoImport !== true) {
      fail("source policy", `sources/source-watchlist.json:${required}`, "required governed source must exist with neverAutoImport: true");
    }
  }

  for (const vercelRecord of ["sources/vercel-agent-skills.md", "sources/vercel-find-skills.md"]) {
    if (await exists(vercelRecord)) {
      const text = await readFile(rootPath(vercelRecord), "utf8");
      if (!/Historical\/reference-only/i.test(text) || !/Not active authority/i.test(text)) {
        fail("source policy", vercelRecord, "Vercel Labs sources must remain historical/reference-only and not active authority");
      }
    }
  }

  const anthropic = await readFile(rootPath("sources/anthropic-skills.md"), "utf8");
  for (const requiredText of ["restricted", "not active authority", "must not be copied, extracted, installed, or used as method authority"]) {
    if (!anthropic.toLowerCase().includes(requiredText)) {
      fail("source policy", "sources/anthropic-skills.md", `Anthropic restricted policy text missing: ${requiredText}`);
    }
  }

  for (const method of registryState.methods.values()) {
    for (const entry of asArray(method.sourceProvenance)) {
      if (entry.path === "sources/anthropic-skills.md" && entry.category !== "restricted-source") {
        fail("source policy", `methods.registry:${method.id}`, "Anthropic source references must remain restricted-source");
      }
    }
  }
}

async function validateForbiddenArtifacts() {
  note("Forbidden artifact scan");
  const forbiddenNames = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "node_modules", "dist", "build", ".cache", "temp", "scratch"]);

  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".git") {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      const normalized = rel(fullPath);
      if (entry.name === ".env" || entry.name.startsWith(".env.")) {
        fail("forbidden artifacts", normalized, "environment file is forbidden");
      }
      if (forbiddenNames.has(entry.name)) {
        fail("forbidden artifacts", normalized, "forbidden generated/dependency artifact is present");
      }
      if (!entry.isDirectory() && entry.name.endsWith(".log")) {
        fail("forbidden artifacts", normalized, "log file is forbidden");
      }
      if (entry.isDirectory()) {
        await visit(fullPath);
      }
    }
  }

  await visit(ROOT);
}

async function runAiToolkitSubvalidators() {
  note("Embedded AI Toolkit validators");
  const validators = [
    "scripts/ai-toolkit/validate-ai-toolkit.mjs",
    "scripts/ai-toolkit/validate-codex-runtime.mjs",
    "scripts/ai-toolkit/validate-version-consistency.mjs",
    "scripts/ai-toolkit/run-toolkit-evals.mjs"
  ];

  for (const validator of validators) {
    try {
      const result = await execFileAsync(process.execPath, [validator], {
        cwd: ROOT,
        timeout: 60_000,
        maxBuffer: 1024 * 1024 * 10
      });
      for (const line of `${result.stdout}${result.stderr}`.trim().split(/\r?\n/).filter(Boolean)) {
        if (line.startsWith("FAIL")) {
          fail("embedded validator", validator, line);
        }
      }
      collectSubvalidatorWarnings("embedded validator", validator, `${result.stdout}${result.stderr}`);
    } catch (error) {
      fail("embedded validator", validator, `subvalidator failed with exit ${error.code ?? "unknown"}`);
      failSubvalidator("embedded validator", `${error.stdout || ""}${error.stderr || error.message || ""}`);
      collectSubvalidatorWarnings("embedded validator", validator, `${error.stdout || ""}${error.stderr || ""}`);
    }
  }
}

async function main() {
  const parsed = await validateJsonParsing();
  const sourceRecords = await collectSourceRecords();
  const watchlist = parsed.get("sources/source-watchlist.json");
  const registryState = await validateRegistries(parsed, sourceRecords, watchlist);

  await validateSkills(registryState);
  await validateGovernanceBoundaries(registryState);
  await validateSourcePolicy(watchlist, registryState);
  await validateEnterpriseToolMetadata(registryState);
  await validateForbiddenArtifacts();
  await runAiToolkitSubvalidators();

  const status = failures.length === 0 ? "PASS" : "FAIL";
  console.log(status);
  console.log(`checks run: ${checks.length}`);
  for (const check of checks) {
    console.log(`- ${check}`);
  }
  console.log(`totals: registries=${totals.registries}, evals=${totals.evals}, sources=${totals.sources}`);

  if (warnings.length > 0) {
    console.log("WARN summary:");
    for (const warning of warnings) {
      console.log(`- [${warning.check}] ${warning.location}: ${warning.message}`);
    }
  }

  if (failures.length > 0) {
    console.log("failures:");
    for (const failure of failures) {
      console.log(`- [${failure.check}] ${failure.location}: ${failure.message}`);
    }
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error("FAIL");
  console.error(`fatal: ${error.message}`);
  process.exitCode = 1;
});
