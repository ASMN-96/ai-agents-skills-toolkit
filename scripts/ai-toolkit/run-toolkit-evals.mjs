#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const failures = [];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(id, message) {
  failures.push({ id, message });
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
}

function findScenario(matrix, scenario) {
  return matrix.scenarios.find((entry) => entry.scenario === scenario);
}

function includesAll(actual, expected) {
  return expected.every((item) => actual.includes(item));
}

async function main() {
  const skills = await readJson("registries/skills.registry.json");
  const matrix = await readJson("registries/routing-matrix.json");
  const runtimeEvals = await readJson(".ai-toolkit/evals/runtime-activation/runtime-boundary-evals.json");
  const routingEvals = await readJson(".ai-toolkit/evals/routing/toolkit-routing-evals.json");
  const stopConditionEvals = await readJson("evals/stop-conditions/unsafe-request-evals.json");
  const tokenEfficiencyEvals = await readJson("evals/token-efficiency/low-risk-concise-routing-evals.json");
  const namingEvals = await readJson("evals/skills/generic-naming-compatibility-evals.json");
  const premiumUiuxEvals = await readJson("evals/skills/premium-uiux-review-evals.json");
  const embeddedPremiumUiuxEvals = await readJson(".ai-toolkit/evals/skills/premium-uiux-review-evals.json");

  for (const name of [
    "ai-project-governance",
    "riss-governance",
    "premium-uiux-review",
    "vd-premium-uiux",
    "webapp-code-quality",
    "riss-code-quality",
    "app-security-review",
    "riss-security-review",
    "pr-release-gate",
    "riss-release-gate"
  ]) {
    if (!skills.skills.some((skill) => skill.name === name)) {
      fail(`skill-${name}`, "expected skill missing from registry");
    }
  }

  const futureNames = new Map([
    ["riss-governance", "ai-project-governance"],
    ["riss-code-quality", "webapp-code-quality"],
    ["riss-security-review", "app-security-review"],
    ["riss-release-gate", "pr-release-gate"],
    ["vd-premium-uiux", "premium-uiux-review"]
  ]);
  for (const [currentName, futureName] of futureNames) {
    const skill = skills.skills.find((entry) => entry.name === currentName);
    if (skill?.futurePublicName !== futureName) {
      fail(`future-name-${currentName}`, `expected futurePublicName ${futureName}`);
    }
    if (skill?.namingMigrationStatus !== "deprecated") {
      fail(`naming-status-${currentName}`, "current compatibility skill must be deprecated while remaining active during migration");
    }
    const alias = skills.skills.find((entry) => entry.name === futureName);
    if (!alias) {
      fail(`public-alias-${futureName}`, "public-safe alias skill must exist");
    } else if (alias.namingMigrationStatus !== "alias-active") {
      fail(`public-alias-status-${futureName}`, "public-safe alias skill must be alias-active");
    }
  }

  const helper = skills.skills.find((skill) => skill.name === "riss-skill-governance");
  if (!helper || helper.registrySurface !== "internal-helper") {
    fail("helper-boundary", "riss-skill-governance must remain internal-helper");
  }

  const quality = findScenario(matrix, "react-typescript-quality-change");
  if (!quality || !includesAll(quality.skills || [], ["riss-governance", "riss-code-quality"])) {
    fail("quality-route", "React/TypeScript route must select riss-governance and riss-code-quality");
  }

  const security = findScenario(matrix, "tenant-security-public-payload-review");
  if (!security || !includesAll(security.skills || [], ["riss-governance", "riss-security-review"])) {
    fail("security-route", "Security route must select riss-governance and riss-security-review");
  }

  const release = findScenario(matrix, "pr-release-coderabbit-gate");
  if (!release || !includesAll(release.skills || [], ["riss-governance", "riss-release-gate"])) {
    fail("release-route", "Release route must select riss-governance and riss-release-gate");
  }

  for (const evalCase of runtimeEvals.cases || []) {
    if (evalCase.id === "ai-toolkit-not-runtime" && evalCase.expected !== "reject-runtime-activation-confusion") {
      fail(evalCase.id, ".ai-toolkit must never evaluate as runtime activation");
    }
  }

  const runtimeEvalIds = new Set((runtimeEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of ["validator-warn-visible", "metadata-not-execution"]) {
    if (!runtimeEvalIds.has(required)) {
      fail(`runtime-no-fake-${required}`, "expected embedded no-fake-validation runtime eval missing");
    }
  }

  for (const evalCase of routingEvals.cases || []) {
    if (evalCase.forbiddenActions?.includes("install") && !evalCase.forbiddenActions.includes("activate")) {
      fail(evalCase.id, "external source eval must forbid install and activation");
    }
  }

  const dryRunEval = (routingEvals.cases || []).find((evalCase) => evalCase.id === "dry-run-not-real-pass");
  if (!dryRunEval || !includesAll(dryRunEval.forbiddenClaims || [], ["real-execution", "quality-passed"])) {
    fail("dry-run-not-real-pass", "dry-run eval must forbid real execution and quality-passed claims");
  }

  const stopConditionIds = new Set((stopConditionEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "dry-run-quality-gate-not-real-pass",
    "registry-entry-not-tool-execution",
    "coderabbit-status-unavailable",
    "validator-warnings-not-hidden"
  ]) {
    if (!stopConditionIds.has(required)) {
      fail(`no-fake-validation-${required}`, "expected no-fake-validation stop-condition eval missing");
    }
  }

  const tokenEvalIds = new Set((tokenEfficiencyEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "large-task-compact-context-pack",
    "changed-file-neighborhood-no-whole-repo-dump",
    "private-overlay-exclusion-required",
    "stale-context-graph-detection-required"
  ]) {
    if (!tokenEvalIds.has(required)) {
      fail(`token-context-${required}`, "expected compact context/token governance eval missing");
    }
  }

  const namingEvalIds = new Set((namingEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "current-governance-name-still-active",
    "public-governance-alias-active",
    "premium-uiux-public-alias-active",
    "quality-public-alias-active",
    "security-public-alias-active",
    "release-public-alias-active",
    "old-names-not-deleted"
  ]) {
    if (!namingEvalIds.has(required)) {
      fail(`generic-naming-${required}`, "expected generic naming compatibility eval missing");
    }
  }

  const premiumSkill = skills.skills.find((entry) => entry.name === "vd-premium-uiux");
  if (premiumSkill?.futurePublicName !== "premium-uiux-review") {
    fail("premium-uiux-future-name", "premium UI/UX skill must keep premium-uiux-review as the future public name");
  }
  if (!premiumSkill?.evalSuites?.includes("evals/skills/premium-uiux-review-evals.json")) {
    fail("premium-uiux-eval-suite", "premium UI/UX skill registry entry must reference the generic eval suite");
  }

  if (JSON.stringify(premiumUiuxEvals) !== JSON.stringify(embeddedPremiumUiuxEvals)) {
    fail("premium-uiux-embedded-evals", "embedded premium UI/UX eval suite must match top-level eval suite");
  }

  const premiumEvalIds = new Set((premiumUiuxEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "dashboard-polish-operational",
    "responsive-layout-viewports",
    "accessibility-keyboard-contrast",
    "visual-qa-evidence-required",
    "design-system-consistency",
    "non-trigger-backend-only",
    "non-trigger-docs-only",
    "no-fake-browser-evidence-stop"
  ]) {
    if (!premiumEvalIds.has(required)) {
      fail(`premium-uiux-${required}`, "expected generic premium UI/UX eval missing");
    }
  }

  const premiumPrompts = JSON.stringify((premiumUiuxEvals.cases || []).map((evalCase) => evalCase.userPrompt || ""));
  if (/\bRISS\b|VDTwin|real estate/i.test(premiumPrompts)) {
    fail("premium-uiux-public-safe-prompts", "generic premium UI/UX eval prompts must not contain project-specific names or domains");
  }

  const noFakeBrowser = (premiumUiuxEvals.cases || []).find((evalCase) => evalCase.id === "no-fake-browser-evidence-stop");
  if (!noFakeBrowser || !includesAll(noFakeBrowser.forbiddenClaims || [], ["browser-verified", "screenshot-reviewed", "visual-qa-passed"])) {
    fail("premium-uiux-no-fake-browser", "no-fake browser eval must forbid browser, screenshot, and visual QA claims without evidence");
  }

  if (failures.length === 0) {
    console.log("PASS run-toolkit-evals");
    return;
  }

  console.log("FAIL run-toolkit-evals");
  for (const failure of failures) {
    console.log(`- ${failure.id}: ${failure.message}`);
  }
  process.exitCode = 1;
}

await main().catch((error) => {
  console.error("FAIL run-toolkit-evals");
  console.error(`fatal: ${error.message}`);
  process.exitCode = 1;
});
