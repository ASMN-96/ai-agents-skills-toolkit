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
  const governanceProofEvals = await readJson("evals/skills/governance-proof-evals.json");
  const uiuxEvals = await readJson("evals/skills/uiux-evals.json");
  const embeddedGovernanceProofEvals = await readJson(".ai-toolkit/evals/skills/governance-proof-evals.json");
  const embeddedUiuxEvals = await readJson(".ai-toolkit/evals/skills/uiux-evals.json");

  for (const name of [
    "governance",
    "uiux",
    "code-quality",
    "security-review",
    "pr-release-gate"
  ]) {
    if (!skills.skills.some((skill) => skill.name === name)) {
      fail(`skill-${name}`, "expected skill missing from registry");
    }
  }

  for (const removedName of [
    "ai-project-governance",
    "riss-governance",
    "premium-uiux-review",
    "vd-premium-uiux",
    "webapp-code-quality",
    "riss-code-quality",
    "app-security-review",
    "riss-security-review",
    "riss-release-gate",
    "riss-agent-governance",
    "riss-skill-governance"
  ]) {
    if (skills.skills.some((entry) => entry.name === removedName)) {
      fail(`removed-skill-${removedName}`, "old alias/helper skill must not remain in the active skills registry");
    }
  }

  for (const finalName of ["governance", "uiux", "code-quality", "security-review", "pr-release-gate"]) {
    const skill = skills.skills.find((entry) => entry.name === finalName);
    if (!skill) {
      fail(`canonical-final-${finalName}`, "canonical final skill must exist");
    } else if (skill.namingMigrationStatus !== "canonical-final") {
      fail(`canonical-final-status-${finalName}`, "canonical final skill must be canonical-final");
    }
  }

  const quality = findScenario(matrix, "react-typescript-quality-change");
  if (!quality || !includesAll(quality.skills || [], ["governance", "code-quality"])) {
    fail("quality-route", "React/TypeScript route must select governance and code-quality");
  }

  const security = findScenario(matrix, "tenant-security-public-payload-review");
  if (!security || !includesAll(security.skills || [], ["governance", "security-review"])) {
    fail("security-route", "Security route must select governance and security-review");
  }

  const release = findScenario(matrix, "pr-release-coderabbit-gate");
  if (!release || !includesAll(release.skills || [], ["governance", "pr-release-gate"])) {
    fail("release-route", "Release route must select governance and pr-release-gate");
  }

  for (const evalCase of runtimeEvals.cases || []) {
    if (evalCase.id === "ai-toolkit-not-runtime" && evalCase.expected !== "reject-runtime-activation-confusion") {
      fail(evalCase.id, ".ai-toolkit must never evaluate as runtime activation");
    }
  }

  const runtimeEvalIds = new Set((runtimeEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "active-project-agent-count-12",
    "old-alias-not-active",
    "bounded-backend-database-sre-agents",
    "validator-warn-visible",
    "metadata-not-execution",
    "governance-lite-not-active-skill",
    "fresh-session-visibility-not-file-proof",
    "global-cleanup-not-public-package-proof"
  ]) {
    if (!runtimeEvalIds.has(required)) {
      fail(`runtime-no-fake-${required}`, "expected embedded no-fake-validation runtime eval missing");
    }
  }

  const activeAgentCountEval = (runtimeEvals.cases || []).find((evalCase) => evalCase.id === "active-project-agent-count-12");
  if (activeAgentCountEval?.expectedActiveProjectAgents !== 12) {
    fail("active-project-agent-count-12", "runtime eval must assert exactly 12 active project agents");
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

  const routingEvalIds = new Set((routingEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "governance-lite-router-method-only",
    "pr-release-coderabbit-credit-fail-owner-review"
  ]) {
    if (!routingEvalIds.has(required)) {
      fail(`governance-routing-${required}`, "expected governance proof routing eval missing");
    }
  }

  const governanceLiteScenario = findScenario(matrix, "governance-lite-router-mode");
  if (!governanceLiteScenario) {
    fail("governance-lite-router-mode", "routing matrix must include governance-lite/router-lite method-only scenario");
  } else {
    if (!includesAll(governanceLiteScenario.skills || [], ["governance"])) {
      fail("governance-lite-router-mode", "governance-lite routing must use the existing governance skill");
    }
    if ((governanceLiteScenario.skills || []).includes("governance-lite") || (governanceLiteScenario.skills || []).includes("router-lite")) {
      fail("governance-lite-router-mode", "governance-lite/router-lite must not be active skills");
    }
    if (!includesAll(governanceLiteScenario.methodReferences || [], ["governance.governance-lite-router-mode"])) {
      fail("governance-lite-router-mode", "governance-lite routing must reference the passive governance-lite method");
    }
  }

  const stopConditionIds = new Set((stopConditionEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "dry-run-quality-gate-not-real-pass",
    "registry-entry-not-tool-execution",
    "coderabbit-status-unavailable",
    "validator-warnings-not-hidden",
    "governance-lite-sixth-skill-request",
    "prompt-injection-generated-file",
    "global-cleanup-without-backup",
    "coderabbit-credit-failure-not-pass"
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
    "stale-context-graph-detection-required",
    "governance-lite-small-task-no-broad-context"
  ]) {
    if (!tokenEvalIds.has(required)) {
      fail(`token-context-${required}`, "expected compact context/token governance eval missing");
    }
  }

  const namingEvalIds = new Set((namingEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "canonical-governance-final-active",
    "canonical-uiux-final-active",
    "canonical-quality-final-active",
    "canonical-security-final-active",
    "canonical-release-final-active",
    "old-aliases-removed-from-runtime"
  ]) {
    if (!namingEvalIds.has(required)) {
      fail(`generic-naming-${required}`, "expected generic naming compatibility eval missing");
    }
  }

  const premiumSkill = skills.skills.find((entry) => entry.name === "uiux");
  if (premiumSkill?.namingMigrationStatus !== "canonical-final") {
    fail("premium-uiux-future-name", "uiux must be the canonical final UI/UX skill");
  }
  if (!premiumSkill?.evalSuites?.includes("evals/skills/uiux-evals.json")) {
    fail("uiux-eval-suite", "uiux skill registry entry must reference the generic eval suite");
  }

  const governanceSkill = skills.skills.find((entry) => entry.name === "governance");
  if (!governanceSkill?.evalSuites?.includes("evals/skills/governance-proof-evals.json")) {
    fail("governance-proof-eval-suite", "governance skill registry entry must reference the governance proof eval suite");
  }

  if (JSON.stringify(uiuxEvals) !== JSON.stringify(embeddedUiuxEvals)) {
    fail("uiux-embedded-evals", "embedded UI/UX eval suite must match top-level eval suite");
  }

  if (JSON.stringify(governanceProofEvals) !== JSON.stringify(embeddedGovernanceProofEvals)) {
    fail("governance-proof-embedded-evals", "embedded governance proof eval suite must match top-level eval suite");
  }

  const governanceProofEvalIds = new Set((governanceProofEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "governance-lite-not-sixth-skill",
    "code-quality-dry-run-not-pass",
    "security-review-prompt-injection",
    "pr-release-coderabbit-credit-failure",
    "runtime-visibility-not-file-proof",
    "token-discipline-large-review"
  ]) {
    if (!governanceProofEvalIds.has(required)) {
      fail(`governance-proof-${required}`, "expected governance proof eval missing");
    }
  }

  const governanceLiteEval = (governanceProofEvals.cases || []).find((evalCase) => evalCase.id === "governance-lite-not-sixth-skill");
  if (!governanceLiteEval || !includesAll(governanceLiteEval.forbiddenSkills || [], ["governance-lite", "router-lite"])) {
    fail("governance-proof-no-sixth-skill", "governance-lite eval must forbid governance-lite and router-lite as active skills");
  }

  if (uiuxEvals.canonicalSkill !== "uiux" || uiuxEvals.currentCanonicalSkill !== "uiux") {
    fail("uiux-current-canonical", "UI/UX eval suite must use uiux as canonical and current canonical skill");
  }

  const premiumEvalIds = new Set((uiuxEvals.cases || []).map((evalCase) => evalCase.id));
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

  for (const evalCase of uiuxEvals.cases || []) {
    if (evalCase.expectedCurrentSkill && evalCase.expectedCurrentSkill !== "uiux") {
      fail(`premium-uiux-current-${evalCase.id}`, "expectedCurrentSkill must be uiux when present");
    }
    if (evalCase.expectedCanonicalSkill && evalCase.expectedCanonicalSkill !== "uiux") {
      fail(`premium-uiux-canonical-${evalCase.id}`, "expectedCanonicalSkill must be uiux when present");
    }
  }

  const premiumPrompts = JSON.stringify((uiuxEvals.cases || []).map((evalCase) => evalCase.userPrompt || ""));
  if (/\bRISS\b|VDTwin|real estate/i.test(premiumPrompts)) {
    fail("premium-uiux-public-safe-prompts", "generic premium UI/UX eval prompts must not contain project-specific names or domains");
  }

  const noFakeBrowser = (uiuxEvals.cases || []).find((evalCase) => evalCase.id === "no-fake-browser-evidence-stop");
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
