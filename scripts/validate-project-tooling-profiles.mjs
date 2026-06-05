#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const failures = [];
const checks = [];

const PROJECT_TYPES = [
  "react-typescript-saas",
  "backend-api",
  "infra-iac",
  "mobile-webview",
  "deep-release",
  "architecture-hardening"
];

const REQUIRED_DOCS = [
  "docs/TOOL_LANE_ARCHITECTURE.md",
  "docs/PROJECT_TOOLING_OPERATING_MODEL.md",
  "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md",
  "docs/TOOL_OVERLAP_DECISIONS.md",
  "docs/UIUX_DESIGN_RESOURCES.md",
  "docs/REVIEW_SECURITY_AGENT_ROUTING.md",
  "docs/V0_2_RELEASE_CANDIDATE_READINESS.md"
];

const REQUIRED_METHODS = [
  "methods/governance/task-intake-routing-gate.md",
  "methods/reliability/coding-time-production-readiness.md",
  "methods/api/api-contract-and-routing-readiness.md",
  "methods/performance/performance-scalability-cache-readiness.md",
  "methods/reliability/observability-readiness.md",
  "methods/security/application-security-readiness.md",
  "methods/release/release-rollback-readiness.md",
  "methods/mobile/native-mobile-app-quality.md",
  "methods/security/webview-boundary-review.md",
  "methods/architecture/cross-surface-client-contracts.md",
  "methods/repo/package-manager-workspace-migration.md",
  "methods/governance/agent-command-safety.md"
];

const REQUIRED_PROFILES = PROJECT_TYPES.map((type) => `profiles/project-tooling/${type}.md`);

const REQUIRED_TEMPLATES = [
  "templates/tooling/package-scripts.react-typescript-saas.json",
  "templates/tooling/package-scripts.backend-api.json",
  "templates/tooling/package-scripts.infra-iac.json",
  "templates/tooling/package-scripts.mobile-webview.json",
  "templates/tooling/package-scripts.deep-release.json",
  "templates/tooling/package-scripts.architecture-hardening.json",
  "templates/tooling/quality-gates.md",
  "templates/tooling/owner-approval-checklist.md",
  "templates/tooling/react-doctor-adoption-checklist.md",
  "templates/tooling/code-review-graph-read-only-checklist.md",
  "templates/tooling/reviewdog-output-policy.md"
];

const REQUIRED_SCRIPTS = [
  "install/tooling-plan.mjs",
  "install/tooling-apply.mjs"
];

const TOOL_EXPECTATIONS = new Map([
  ["eslint", "default-install"],
  ["typescript", "default-install"],
  ["typescript-eslint", "default-install"],
  ["eslint-plugin-react-hooks", "default-install"],
  ["vitest", "default-install"],
  ["testing-library", "default-install"],
  ["playwright", "default-install"],
  ["gitleaks", "default-install"],
  ["osv-scanner", "default-install"],
  ["react-doctor", "active-install-if-project-type"],
  ["oxlint", "active-install-if-project-type"],
  ["axe-playwright", "active-install-if-project-type"],
  ["lighthouse-ci", "active-install-if-project-type"],
  ["semgrep", "active-install-if-project-type"],
  ["dependency-cruiser", "active-install-if-project-type"],
  ["actionlint", "active-install-if-project-type"],
  ["zizmor", "active-install-if-project-type"],
  ["trivy", "active-install-if-project-type"],
  ["checkov", "active-install-if-project-type"],
  ["madge", "active-install-if-project-type"],
  ["jscpd", "active-install-if-project-type"],
  ["codeql", "use-if-existing"],
  ["dependabot", "use-if-existing"],
  ["renovate", "use-if-existing"],
  ["reviewdog", "use-if-existing"],
  ["coderabbit", "use-if-existing"],
  ["github-gh", "use-if-existing"],
  ["biome", "use-if-existing"],
  ["knip", "use-if-existing"],
  ["socket", "approval-required"],
  ["trufflehog", "approval-required"],
  ["owasp-zap-baseline", "approval-required"],
  ["harden-runner", "approval-required"],
  ["code-review-graph", "active-read-only"],
  ["open-design", "active-reference"],
  ["eslint-plugin-boundaries", "active-install-if-project-type"]
]);

const ACTIVATION_LEVELS = new Set([
  "active-reference",
  "active-if-detected",
  "owner-approved-install",
  "ci-advisory",
  "ci-blocking-after-calibration",
  "held-static-only",
  "forbidden-runtime"
]);

const ACTIVATION_EXPECTATIONS = new Map([
  ["react-doctor", {
    levels: ["active-if-detected", "owner-approved-install"],
    whenDetected: "project-owned",
    whenAbsent: "Owner-approved install",
    ciDefault: "ci-advisory",
    ciPromotion: "ci-blocking-after-calibration"
  }],
  ["playwright", {
    levels: ["active-if-detected", "owner-approved-install", "ci-advisory", "ci-blocking-after-calibration"],
    whenDetected: "project-owned Playwright",
    whenAbsent: "Owner-approved install",
    ciDefault: "ci-advisory first",
    ciPromotion: "ci-blocking-after-calibration"
  }],
  ["gitleaks", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["osv-scanner", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["semgrep", { levels: ["active-if-detected", "owner-approved-install", "ci-advisory"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["oxlint", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["dependency-cruiser", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["madge", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["jscpd", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["actionlint", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }],
  ["zizmor", { levels: ["active-if-detected", "owner-approved-install"], whenDetected: "project-owned", whenAbsent: "owner-approved install", ciDefault: "ci-advisory", ciPromotion: "ci-blocking-after-calibration" }]
]);

const ENTERPRISE_READINESS_METHOD_IDS = [
  "governance.task-intake-routing-gate",
  "reliability.coding-time-production-readiness",
  "api.api-contract-and-routing-readiness",
  "performance.performance-scalability-cache-readiness",
  "reliability.observability-readiness",
  "security.application-security-readiness",
  "release.release-rollback-readiness"
];

const ENTERPRISE_READINESS_SCENARIOS = [
  "task-intake-routing-gate",
  "coding-time-production-readiness",
  "api-contract-and-routing-readiness",
  "performance-scalability-cache-readiness",
  "observability-readiness",
  "application-security-readiness",
  "release-rollback-readiness"
];

const CURRENT_SCOPE_CLASSIFICATION_FILES = [
  "install/tooling-plan.mjs",
  "install/tooling-apply.mjs",
  ".ai-toolkit/tool-packs/webapp-quality-security.json",
  "registries/tools.registry.json",
  "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md",
  "docs/SOURCE_UTILIZATION_MATRIX.md",
  ...REQUIRED_PROFILES
];

const REMOVED_CURRENT_SCOPE_RESOURCES = ["Base UI", "Figma"];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(check, location, message) {
  failures.push({ check, location, message });
}

function note(check) {
  checks.push(check);
}

async function exists(relativePath) {
  try {
    await access(rootPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function read(relativePath) {
  return readFile(rootPath(relativePath), "utf8");
}

async function readJson(relativePath, check) {
  try {
    return JSON.parse(await read(relativePath));
  } catch (error) {
    fail(check, relativePath, `JSON parse failed: ${error.message}`);
    return null;
  }
}

async function requireFiles(files, check) {
  note(check);
  for (const file of files) {
    if (!(await exists(file))) {
      fail(check, file, "missing required file");
    }
  }
}

function section(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`## ${escaped}\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |$)`, "i"));
  return match ? match[1] : "";
}

function includesIgnoreCase(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function requireTextIncludes(check, location, text, required) {
  if (!includesIgnoreCase(text || "", required)) {
    fail(check, location, `missing required text: ${required}`);
  }
}

async function validatePlannerAndApply() {
  note("tooling planner/apply behavior");
  const planText = await read("install/tooling-plan.mjs");
  const applyText = await read("install/tooling-apply.mjs");

  for (const type of PROJECT_TYPES) {
    if (!planText.includes(type) || !applyText.includes(type)) {
      fail("tooling planner/apply behavior", type, "project type missing from planner or apply script");
    }
  }

  for (const required of ["never writes files", "installs packages", "modifies CI", "configures MCP", "touches product repositories"]) {
    if (!planText.includes(required)) {
      fail("tooling planner/apply behavior", "install/tooling-plan.mjs", `missing safety text: ${required}`);
    }
  }

  if (/pilot-only/i.test(planText) || /pilot-only/i.test(applyText)) {
    fail("tooling planner/apply behavior", "install/tooling-plan.mjs", "planner/apply must not expose pilot-only current-scope classifications");
  }
  if (!planText.includes("active-read-only resources") || !planText.includes("code-review-graph source intelligence")) {
    fail("tooling planner/apply behavior", "install/tooling-plan.mjs", "planner must expose code-review-graph as active-read-only source intelligence");
  }
  for (const resource of REMOVED_CURRENT_SCOPE_RESOURCES) {
    if (includesIgnoreCase(planText, resource) || includesIgnoreCase(applyText, resource)) {
      fail("tooling planner/apply behavior", "install/tooling-plan.mjs", `${resource} must not appear in planner/apply output`);
    }
  }

  if (!applyText.includes("--confirm-write") || !applyText.includes("Default mode is dry-run") || !applyText.includes("Mode: dry-run; no files will be written.")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must default to dry-run and require --confirm-write for writes");
  }
  if (!applyText.includes(".ai-toolkit") || !applyText.includes("tooling")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must copy into <target>/.ai-toolkit/tooling/");
  }
  if (!applyText.includes("package.json") || !applyText.includes("run package managers") || !applyText.includes("configure MCP")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must state forbidden package/CI/MCP/global behavior");
  }
  if (!applyText.includes("code-review-graph-read-only-checklist.md")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must use the read-only code-review-graph checklist");
  }

  const packageManagerInstallPattern = /\b(?:npm|pnpm|yarn|bun)\s+(?:install|i|add|dlx|create)\b/i;
  for (const [file, text] of [["install/tooling-plan.mjs", planText], ["install/tooling-apply.mjs", applyText]]) {
    if (packageManagerInstallPattern.test(text)) {
      fail("tooling planner/apply behavior", file, "planner/apply script contains package-manager install command text");
    }
  }
}

async function validateDocBoundaries() {
  note("project tooling document boundaries");
  const operating = await read("docs/PROJECT_TOOLING_OPERATING_MODEL.md");
  const matrix = await read("docs/PROJECT_TOOL_INSTALLATION_MATRIX.md");
  const uiux = await read("docs/UIUX_DESIGN_RESOURCES.md");
  const releaseCandidate = await read("docs/V0_2_RELEASE_CANDIDATE_READINESS.md");

  for (const required of ["No automatic install", "No fake validation"]) {
    if (!operating.includes(required) && !matrix.includes(required)) {
      fail("project tooling document boundaries", "docs/PROJECT_TOOLING_OPERATING_MODEL.md", `missing boundary text: ${required}`);
    }
  }
  if (!uiux.includes("No Base UI") || !uiux.includes("No Figma")) {
    fail("project tooling document boundaries", "docs/UIUX_DESIGN_RESOURCES.md", "Base UI and Figma must be excluded from current-scope recommendations");
  }
  if (!matrix.includes("React Doctor for React projects | Frontend Coding and React Quality | active-install-if-project-type")) {
    fail("project tooling document boundaries", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", "React Doctor must be active-install-if-project-type for React projects");
  }
  if (!operating.includes("methods/governance/task-intake-routing-gate.md") || !operating.includes("No final current-scope project-tooling resource may remain `pilot-only`")) {
    fail("project tooling document boundaries", "docs/PROJECT_TOOLING_OPERATING_MODEL.md", "operating model must document task intake and no-pilot-only boundaries");
  }
  if (!matrix.includes("code-review-graph | Architecture, Repo Intelligence, and Token Context | active-read-only")) {
    fail("project tooling document boundaries", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", "code-review-graph must be active-read-only");
  }
  if (!matrix.includes("open-design | UI/UX Design Intelligence and Browser Evidence | active-reference")) {
    fail("project tooling document boundaries", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", "open-design must be active-reference");
  }
  for (const required of [
    "active-if-detected",
    "owner-approved-install",
    "ci-advisory",
    "ci-blocking-after-calibration",
    "held-static-only",
    "forbidden-runtime",
    "GSD-style discipline",
    "RuFlo-style concepts"
  ]) {
    if (!matrix.includes(required) && !operating.includes(required)) {
      fail("project tooling document boundaries", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", `missing activation-model wording: ${required}`);
    }
  }
  for (const required of ["controlled open-source Codex use as a v0.2 release candidate", "not Level 4", "not Level 5", "not enterprise-certified", "not cross-runtime active support", "not automatic tool installation", "controlled dry-run adoption"]) {
    if (!releaseCandidate.includes(required)) {
      fail("project tooling document boundaries", "docs/V0_2_RELEASE_CANDIDATE_READINESS.md", `missing release-candidate wording: ${required}`);
    }
  }
}

async function validateProfiles() {
  note("project tooling profiles");
  for (const profile of REQUIRED_PROFILES) {
    const text = await read(profile);
    const requiredSections = [
      "## Purpose",
      "## Project Type",
      "## Task-Intake Routing Gate",
      "## Default Tools",
      "## Active-Install-If-Project-Type Tools",
      "## Use-If-Existing Tools",
      "## External-Only Tools",
      "## Approval-Required Tools",
      "## Active-Reference Resources",
      "## Active-Read-Only Resources",
      "## Recommended Package Scripts",
      "## Evidence Requirements",
      "## Stop Conditions",
      "## Owner Approval Requirements",
      "## No-Fake-Validation Rules",
      "## Rollback Notes"
    ];
    for (const heading of requiredSections) {
      if (!text.includes(heading)) {
        fail("project tooling profiles", profile, `missing section ${heading}`);
      }
    }
    const defaultTools = section(text, "Default Tools");
    const activeTools = section(text, "Active-Install-If-Project-Type Tools");
    const activeReference = section(text, "Active-Reference Resources");
    const activeReadOnly = section(text, "Active-Read-Only Resources");
    if (/Knip/i.test(defaultTools) || /Knip/i.test(activeTools)) {
      fail("project tooling profiles", profile, "Knip must not be in default or active-install-if-project-type tools");
    }
    if (/pilot-only/i.test(text) || text.includes("## Pilot-Only Tools")) {
      fail("project tooling profiles", profile, "pilot-only must not remain in current-scope project tooling profiles");
    }
    for (const resource of REMOVED_CURRENT_SCOPE_RESOURCES) {
      if (includesIgnoreCase(text, resource)) {
        fail("project tooling profiles", profile, `${resource} must not appear in project tooling profiles`);
      }
      if (includesIgnoreCase(activeReference, resource) || includesIgnoreCase(activeReadOnly, resource) || includesIgnoreCase(defaultTools, resource) || includesIgnoreCase(activeTools, resource)) {
        fail("project tooling profiles", profile, `${resource} must not appear in active/default/current-scope sections`);
      }
    }
    if (!activeReadOnly.includes("code-review-graph")) {
      fail("project tooling profiles", profile, "code-review-graph must be active-read-only source intelligence");
    }
    if (includesIgnoreCase(activeReference, "code-review-graph") || includesIgnoreCase(defaultTools, "code-review-graph") || includesIgnoreCase(activeTools, "code-review-graph")) {
      fail("project tooling profiles", profile, "code-review-graph must be exclusively in Active-Read-Only Resources");
    }
    if (!text.includes("No-Fake-Validation")) {
      fail("project tooling profiles", profile, "profile must include no-fake-validation rules");
    }
    if (!text.includes("Classify normal-language requests before coding")) {
      fail("project tooling profiles", profile, "profile must include task-intake routing gate wording");
    }
  }

  const reactProfile = await read("profiles/project-tooling/react-typescript-saas.md");
  if (!section(reactProfile, "Active-Install-If-Project-Type Tools").includes("React Doctor")) {
    fail("project tooling profiles", "profiles/project-tooling/react-typescript-saas.md", "React Doctor must be active-install-if-project-type");
  }
}

async function validateTemplates() {
  note("tooling templates");
  for (const template of REQUIRED_TEMPLATES) {
    const text = await read(template);
    for (const required of ["owner", "Codex must not claim output", "Package-manager changes require separate approval"]) {
      if (!text.toLowerCase().includes(required.toLowerCase())) {
        fail("tooling templates", template, `missing required template safety text: ${required}`);
      }
    }
  }
}

async function validateRegistryConsistency() {
  note("project tooling registry consistency");
  const toolsRegistry = await readJson("registries/tools.registry.json", "project tooling registry consistency");
  const toolPack = await readJson(".ai-toolkit/tool-packs/webapp-quality-security.json", "project tooling registry consistency");
  const methodsRegistry = await readJson("registries/methods.registry.json", "project tooling registry consistency");
  const routing = await readJson("registries/routing-matrix.json", "project tooling registry consistency");
  const sourceMatrix = await read("docs/SOURCE_UTILIZATION_MATRIX.md");
  const installMatrix = await read("docs/PROJECT_TOOL_INSTALLATION_MATRIX.md");
  const codeReviewGraphSource = await read("sources/code-review-graph.md");

  const tools = new Map((toolsRegistry?.tools || []).map((tool) => [tool.id, tool]));
  for (const tool of toolsRegistry?.tools || []) {
    for (const level of tool.activationLevels || []) {
      if (!ACTIVATION_LEVELS.has(level)) {
        fail("project tooling registry consistency", `registries/tools.registry.json:${tool.id}`, `unknown activation level ${level}`);
      }
    }
  }
  for (const [id, expected] of TOOL_EXPECTATIONS) {
    const tool = tools.get(id);
    if (!tool) {
      fail("project tooling registry consistency", `registries/tools.registry.json:${id}`, "missing required tool entry");
      continue;
    }
    if (tool.projectInstallClass !== expected) {
      fail("project tooling registry consistency", `registries/tools.registry.json:${id}`, `expected projectInstallClass ${expected}, got ${tool.projectInstallClass || "missing"}`);
    }
  }
  for (const [id, expected] of ACTIVATION_EXPECTATIONS) {
    const tool = tools.get(id);
    if (!tool) {
      fail("project tooling registry consistency", `registries/tools.registry.json:${id}`, "missing required activation-model tool entry");
      continue;
    }
    for (const level of expected.levels) {
      if (!tool.activationLevels?.includes(level)) {
        fail("project tooling registry consistency", `registries/tools.registry.json:${id}`, `missing activation level ${level}`);
      }
    }
    requireTextIncludes("project tooling registry consistency", `registries/tools.registry.json:${id}:whenDetected`, tool.whenDetected, expected.whenDetected);
    requireTextIncludes("project tooling registry consistency", `registries/tools.registry.json:${id}:whenAbsent`, tool.whenAbsent, expected.whenAbsent);
    requireTextIncludes("project tooling registry consistency", `registries/tools.registry.json:${id}:ciDefault`, tool.ciDefault, expected.ciDefault);
    requireTextIncludes("project tooling registry consistency", `registries/tools.registry.json:${id}:ciPromotion`, tool.ciPromotion, expected.ciPromotion);
  }
  const codeReviewGraph = tools.get("code-review-graph");
  if (codeReviewGraph?.status !== "active-read-only") {
    fail("project tooling registry consistency", "registries/tools.registry.json:code-review-graph", "code-review-graph status must be active-read-only");
  }
  for (const required of ["indexing", "product repo scanning", "package changes"]) {
    if (!codeReviewGraph?.approvalRequiredFor?.includes(required)) {
      fail("project tooling registry consistency", "registries/tools.registry.json:code-review-graph", `code-review-graph approvalRequiredFor must include ${required}`);
    }
    if (!JSON.stringify(codeReviewGraph?.forbiddenActions || []).toLowerCase().includes(required)) {
      fail("project tooling registry consistency", "registries/tools.registry.json:code-review-graph", `code-review-graph forbiddenActions must include ${required}`);
    }
  }
  const codeReviewGraphRisk = codeReviewGraph?.enterpriseRisk || {};
  for (const field of ["license", "maintenanceSignal", "lastReviewedCommit", "lastReviewedDate", "securityReviewStatus", "defaultEnterpriseStatus"]) {
    if (!codeReviewGraphRisk[field] || /unknown-review-required|not-yet-verified|source-review-required/i.test(String(codeReviewGraphRisk[field]))) {
      fail("project tooling registry consistency", "registries/tools.registry.json:code-review-graph", `code-review-graph enterpriseRisk.${field} must record completed source-safety review evidence`);
    }
  }
  for (const required of [
    "completed source-safety review",
    "active-read-only source intelligence",
    "MIT signal",
    "no install",
    "package changes",
    "MCP setup",
    "product repo scan",
    "private-overlay indexing",
    "raw upstream"
  ]) {
    if (!codeReviewGraphSource.toLowerCase().includes(required.toLowerCase())) {
      fail("project tooling registry consistency", "sources/code-review-graph.md", `code-review-graph source record missing review boundary: ${required}`);
    }
  }
  const eslintBoundaries = tools.get("eslint-plugin-boundaries");
  if (eslintBoundaries?.status !== "active-install-if-project-type") {
    fail("project tooling registry consistency", "registries/tools.registry.json:eslint-plugin-boundaries", "eslint-plugin-boundaries status must be active-install-if-project-type");
  }
  for (const tool of toolsRegistry?.tools || []) {
    if (tool.projectInstallClass === "pilot-only" || tool.status === "pilot-only") {
      fail("project tooling registry consistency", `registries/tools.registry.json:${tool.id}`, "pilot-only must not remain in current-scope tool registry classification");
    }
  }

  for (const [id, expected] of TOOL_EXPECTATIONS) {
    if (!installMatrix.toLowerCase().includes(expected.toLowerCase())) {
      fail("project tooling registry consistency", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", `missing classification text ${expected}`);
    }
    if (!sourceMatrix.includes(id) || !sourceMatrix.includes(expected)) {
      fail("project tooling registry consistency", "docs/SOURCE_UTILIZATION_MATRIX.md", `missing ${id} with ${expected}`);
    }
  }

  const packText = JSON.stringify(toolPack || {});
  for (const required of ["projectInstallClass", "activationLevels", "active-if-detected", "owner-approved-install", "React Doctor", "Knip", "Oxlint", "Biome"]) {
    if (!packText.includes(required)) {
      fail("project tooling registry consistency", ".ai-toolkit/tool-packs/webapp-quality-security.json", `missing ${required}`);
    }
  }
  if (/pilot-only/i.test(packText)) {
    fail("project tooling registry consistency", ".ai-toolkit/tool-packs/webapp-quality-security.json", "tool pack must not expose pilot-only current-scope classifications");
  }
  for (const resource of REMOVED_CURRENT_SCOPE_RESOURCES) {
    if (includesIgnoreCase(packText, resource)) {
      fail("project tooling registry consistency", ".ai-toolkit/tool-packs/webapp-quality-security.json", `${resource} must not appear in tool-pack routes/model`);
    }
  }
  if (!packText.includes("active-read-only") || !packText.includes("active-reference")) {
    fail("project tooling registry consistency", ".ai-toolkit/tool-packs/webapp-quality-security.json", "tool pack must carry active-read-only and active-reference classifications");
  }

  const methodIds = new Set((methodsRegistry?.methods || []).map((method) => method.id));
  for (const id of [
    ...ENTERPRISE_READINESS_METHOD_IDS,
    "mobile.native-mobile-app-quality",
    "security.webview-boundary-review",
    "architecture.cross-surface-client-contracts",
    "repo.package-manager-workspace-migration",
    "governance.agent-command-safety"
  ]) {
    if (!methodIds.has(id)) {
      fail("project tooling registry consistency", `registries/methods.registry.json:${id}`, "missing method registry entry");
    }
  }

  const scenarioIds = new Set((routing?.scenarios || []).map((scenario) => scenario.scenario));
  for (const scenario of [
    ...ENTERPRISE_READINESS_SCENARIOS,
    "mobile-native-app-quality",
    "webview-boundary-review",
    "cross-surface-api-contracts",
    "package-manager-workspace-migration",
    "agent-command-safety",
    "react-code-quality",
    "pr-scanner-output",
    "ui-polish"
  ]) {
    if (!scenarioIds.has(scenario)) {
      fail("project tooling registry consistency", `registries/routing-matrix.json:${scenario}`, "missing routing scenario");
    }
  }
  const scenariosById = new Map((routing?.scenarios || []).map((scenario) => [scenario.scenario, scenario]));
  for (const scenario of ["mobile-native-app-quality", "webview-boundary-review"]) {
    const methodReferences = scenariosById.get(scenario)?.methodReferences || [];
    if (methodReferences[0] !== "governance.task-intake-routing-gate") {
      fail("project tooling registry consistency", `registries/routing-matrix.json:${scenario}`, "normal-language mobile/WebView scenarios must route through task-intake first");
    }
  }
  const routedMethodIds = new Set();
  for (const scenario of routing?.scenarios || []) {
    for (const methodReference of scenario.methodReferences || []) {
      routedMethodIds.add(methodReference);
    }
  }
  for (const id of ENTERPRISE_READINESS_METHOD_IDS) {
    if (!routedMethodIds.has(id)) {
      fail("project tooling registry consistency", `registries/routing-matrix.json:${id}`, "enterprise readiness method is not routed");
    }
  }
}

async function validateNoCurrentScopePilotOnly() {
  note("no current-scope pilot-only classifications");
  for (const file of CURRENT_SCOPE_CLASSIFICATION_FILES) {
    const text = await read(file);
    if (/pilot-only/i.test(text)) {
      fail("no current-scope pilot-only classifications", file, "pilot-only remains in a current-scope classification surface");
    }
  }
}

async function validateNoRemovedResourcesInCurrentScope() {
  note("removed resources excluded from current scope");
  const currentScopeFiles = [
    "install/tooling-plan.mjs",
    "install/tooling-apply.mjs",
    ".ai-toolkit/tool-packs/webapp-quality-security.json",
    ...REQUIRED_PROFILES
  ];
  for (const file of currentScopeFiles) {
    const text = await read(file);
    for (const resource of REMOVED_CURRENT_SCOPE_RESOURCES) {
      if (includesIgnoreCase(text, resource)) {
        fail("removed resources excluded from current scope", file, `${resource} appears in a current-scope planner/profile/tool-pack surface`);
      }
    }
  }
}

async function main() {
  await requireFiles(REQUIRED_DOCS, "required project tooling docs");
  await requireFiles(REQUIRED_METHODS, "required project tooling methods");
  await requireFiles(REQUIRED_PROFILES, "required project tooling profiles");
  await requireFiles(REQUIRED_TEMPLATES, "required tooling templates");
  await requireFiles(REQUIRED_SCRIPTS, "required tooling scripts");
  await validatePlannerAndApply();
  await validateDocBoundaries();
  await validateProfiles();
  await validateTemplates();
  await validateRegistryConsistency();
  await validateNoCurrentScopePilotOnly();
  await validateNoRemovedResourcesInCurrentScope();

  const status = failures.length === 0 ? "PASS" : "FAIL";
  console.log(status);
  console.log(`checks run: ${checks.length}`);
  for (const check of checks) {
    console.log(`- ${check}`);
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
