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
  "docs/REVIEW_SECURITY_AGENT_ROUTING.md"
];

const REQUIRED_METHODS = [
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
  "templates/tooling/code-review-graph-pilot-checklist.md",
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
  ["code-review-graph", "pilot-only"],
  ["open-design", "pilot-only"],
  ["eslint-plugin-boundaries", "pilot-only"]
]);

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

  if (!applyText.includes("--confirm-write") || !applyText.includes("Default mode is dry-run") || !applyText.includes("Mode: dry-run; no files will be written.")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must default to dry-run and require --confirm-write for writes");
  }
  if (!applyText.includes(".ai-toolkit") || !applyText.includes("tooling")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must copy into <target>/.ai-toolkit/tooling/");
  }
  if (!applyText.includes("package.json") || !applyText.includes("run package managers") || !applyText.includes("configure MCP")) {
    fail("tooling planner/apply behavior", "install/tooling-apply.mjs", "apply script must state forbidden package/CI/MCP/global behavior");
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

  for (const required of ["No automatic install", "No fake validation"]) {
    if (!operating.includes(required) && !matrix.includes(required)) {
      fail("project tooling document boundaries", "docs/PROJECT_TOOLING_OPERATING_MODEL.md", `missing boundary text: ${required}`);
    }
  }
  if (!uiux.includes("No Base UI") || !uiux.includes("No Figma")) {
    fail("project tooling document boundaries", "docs/UIUX_DESIGN_RESOURCES.md", "Base UI and Figma must be excluded from current-scope recommendations");
  }
  for (const row of ["| Base UI |", "| Figma |"]) {
    if (!matrix.includes(row) || !matrix.includes("archive/remove-from-active")) {
      fail("project tooling document boundaries", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", `${row} must be classified archive/remove-from-active`);
    }
  }
  if (!matrix.includes("React Doctor for React projects | Frontend Coding and React Quality | active-install-if-project-type")) {
    fail("project tooling document boundaries", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", "React Doctor must be active-install-if-project-type for React projects");
  }
}

async function validateProfiles() {
  note("project tooling profiles");
  for (const profile of REQUIRED_PROFILES) {
    const text = await read(profile);
    const requiredSections = [
      "## Purpose",
      "## Project Type",
      "## Default Tools",
      "## Active-Install-If-Project-Type Tools",
      "## Use-If-Existing Tools",
      "## External-Only Tools",
      "## Approval-Required Tools",
      "## Active-Reference Resources",
      "## Pilot-Only Tools",
      "## Archive/Removed Tools",
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
    if (/Knip/i.test(defaultTools) || /Knip/i.test(activeTools)) {
      fail("project tooling profiles", profile, "Knip must not be in default or active-install-if-project-type tools");
    }
    if (!text.includes("No-Fake-Validation")) {
      fail("project tooling profiles", profile, "profile must include no-fake-validation rules");
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

  const tools = new Map((toolsRegistry?.tools || []).map((tool) => [tool.id, tool]));
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

  for (const [id, expected] of TOOL_EXPECTATIONS) {
    if (!installMatrix.toLowerCase().includes(expected.toLowerCase())) {
      fail("project tooling registry consistency", "docs/PROJECT_TOOL_INSTALLATION_MATRIX.md", `missing classification text ${expected}`);
    }
    if (!sourceMatrix.includes(id) || !sourceMatrix.includes(expected)) {
      fail("project tooling registry consistency", "docs/SOURCE_UTILIZATION_MATRIX.md", `missing ${id} with ${expected}`);
    }
  }

  const packText = JSON.stringify(toolPack || {});
  for (const required of ["projectInstallClass", "React Doctor", "Knip", "Oxlint", "Biome"]) {
    if (!packText.includes(required)) {
      fail("project tooling registry consistency", ".ai-toolkit/tool-packs/webapp-quality-security.json", `missing ${required}`);
    }
  }

  const methodIds = new Set((methodsRegistry?.methods || []).map((method) => method.id));
  for (const id of [
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
