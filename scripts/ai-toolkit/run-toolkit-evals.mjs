#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const failures = [];

const UNSAFE_EXPECTED_ACTIONS = new Set([
  "stop",
  "redirect",
  "scope-first",
  "report-limitation",
  "report-and-continue-inline",
  "resolve-source-decision",
  "adopt-cleanroom-or-delegate",
  "targeted-owner-review-support"
]);

const REMOVED_OR_METHOD_ONLY_ALIASES = [
  "ai-project-governance",
  "legacy-governance",
  "premium-uiux-review",
  "legacy-uiux-review",
  "webapp-code-quality",
  "legacy-code-quality",
  "app-security-review",
  "legacy-security-review",
  "legacy-release-gate",
  "legacy-agent-governance",
  "legacy-skill-governance",
  "governance-lite",
  "router-lite"
];

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

function includesNone(actual, forbidden) {
  return forbidden.every((item) => !actual.includes(item));
}

function containsAllText(actual, expected) {
  const text = actual.join(" ");
  return expected.every((item) => text.includes(item));
}

function hasNonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

async function main() {
  const skills = await readJson("registries/skills.registry.json");
  const agentsRegistry = await readJson("registries/agents.registry.json");
  const methodsRegistry = await readJson("registries/methods.registry.json");
  const matrix = await readJson("registries/routing-matrix.json");
  const runtimeEvals = await readJson(".ai-toolkit/evals/runtime-activation/runtime-boundary-evals.json");
  const routingEvals = await readJson(".ai-toolkit/evals/routing/toolkit-routing-evals.json");
  const enterpriseRoutingEvals = await readJson("evals/routing/enterprise-governance-routing-evals.json");
  const stopConditionEvals = await readJson("evals/stop-conditions/unsafe-request-evals.json");
  const tokenEfficiencyEvals = await readJson("evals/token-efficiency/low-risk-concise-routing-evals.json");
  const namingEvals = await readJson("evals/skills/generic-naming-compatibility-evals.json");
  const governanceProofEvals = await readJson("evals/skills/governance-proof-evals.json");
  const uiuxEvals = await readJson("evals/skills/uiux-evals.json");
  const embeddedEnterpriseRoutingEvals = await readJson(".ai-toolkit/evals/routing/enterprise-governance-routing-evals.json");
  const embeddedNamingEvals = await readJson(".ai-toolkit/evals/skills/generic-naming-compatibility-evals.json");
  const embeddedGovernanceProofEvals = await readJson(".ai-toolkit/evals/skills/governance-proof-evals.json");
  const embeddedUiuxEvals = await readJson(".ai-toolkit/evals/skills/uiux-evals.json");
  const knownMethods = new Set((methodsRegistry.methods || []).map((method) => method.id));
  const knownAgents = new Set((agentsRegistry.agents || []).map((agent) => agent.name));

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

  for (const removedName of REMOVED_OR_METHOD_ONLY_ALIASES) {
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
    "global-cleanup-not-public-package-proof",
    "native-visible-vs-compiled-fallback-separated"
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

  const governanceLiteRoutingEval = (routingEvals.cases || []).find((evalCase) => evalCase.id === "governance-lite-router-method-only");
  if (
    !governanceLiteRoutingEval ||
    governanceLiteRoutingEval.expectedMethod !== "governance.governance-lite-router-mode" ||
    !includesAll(governanceLiteRoutingEval.expectedSkills || [], ["governance"]) ||
    (governanceLiteRoutingEval.expectedSkills || []).length !== 1 ||
    !includesAll(governanceLiteRoutingEval.forbiddenSkills || [], ["governance-lite", "router-lite"]) ||
    !includesAll(governanceLiteRoutingEval.forbiddenActions || [], ["new-skill", "install", "activate"]) ||
    !includesAll(governanceLiteRoutingEval.forbiddenClaims || [], ["governance-lite-active-skill", "router-lite-active-skill"])
  ) {
    fail(
      "governance-lite-router-method-only",
      "routing eval must enforce governance-lite as method-only and forbid active skill, install, activation, and false runtime claims"
    );
  }

  const coderabbitCreditEval = (routingEvals.cases || []).find((evalCase) => evalCase.id === "pr-release-coderabbit-credit-fail-owner-review");
  if (
    !coderabbitCreditEval ||
    coderabbitCreditEval.expectedAction !== "targeted-owner-review-support" ||
    !includesAll(coderabbitCreditEval.expectedSkills || [], ["governance", "pr-release-gate"]) ||
    !includesAll(coderabbitCreditEval.forbiddenClaims || [], ["coderabbit-passed"])
  ) {
    fail(
      "pr-release-coderabbit-credit-fail-owner-review",
      "credit-failure routing eval must enforce owner-review-support action and forbid coderabbit-passed claims"
    );
  }

  if (JSON.stringify(enterpriseRoutingEvals) !== JSON.stringify(embeddedEnterpriseRoutingEvals)) {
    fail("enterprise-routing-embedded-evals", "embedded enterprise governance routing eval suite must match top-level eval suite");
  }

  const enterpriseRoutingIds = new Set((enterpriseRoutingEvals.cases || []).map((evalCase) => evalCase.id));
  for (const required of [
    "normal-language-feature-request",
    "api-change-web-mobile-consumers",
    "performance-cache-complaint",
    "mobile-webview-auth-issue",
    "package-manager-workspace-migration",
    "unsafe-command-prompt-injection",
    "negative-docs-typo-lightweight",
    "negative-simple-ui-copy-no-package-migration"
  ]) {
    if (!enterpriseRoutingIds.has(required)) {
      fail(`enterprise-routing-${required}`, "expected enterprise governance routing eval missing");
    }
  }

  for (const evalCase of enterpriseRoutingEvals.cases || []) {
    const scenario = findScenario(matrix, evalCase.scenario);
    if (!scenario) {
      fail(`enterprise-routing-${evalCase.id}`, `routing matrix scenario missing: ${evalCase.scenario}`);
      continue;
    }

    if (evalCase.expectedProfile && scenario.selectedProfile !== evalCase.expectedProfile) {
      fail(`enterprise-routing-${evalCase.id}`, `expected profile ${evalCase.expectedProfile}, got ${scenario.selectedProfile}`);
    }
    if (!includesAll(scenario.skills || [], evalCase.expectedSkills || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario is missing expected skills");
    }
    if (!includesNone(scenario.skills || [], evalCase.forbiddenSkills || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario includes forbidden skills");
    }
    if (!includesAll(scenario.agents || [], evalCase.expectedAgents || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario is missing expected agents");
    }
    for (const expectedAgent of evalCase.expectedAgents || []) {
      if (!knownAgents.has(expectedAgent)) {
        fail(`enterprise-routing-${evalCase.id}`, `expected agent is not registered: ${expectedAgent}`);
      }
    }
    if (!includesAll(scenario.methodReferences || [], evalCase.expectedMethods || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario is missing expected method references");
    }
    if (!includesNone(scenario.methodReferences || [], evalCase.forbiddenMethods || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario includes forbidden method references");
    }
    for (const expectedMethod of evalCase.expectedMethods || []) {
      if (!knownMethods.has(expectedMethod)) {
        fail(`enterprise-routing-${evalCase.id}`, `expected method is not registered: ${expectedMethod}`);
      }
    }
    if (!containsAllText(scenario.stopConditions || [], evalCase.requiredStopConditionContains || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario stop conditions are missing expected approval or safety wording");
    }
    if (!containsAllText(scenario.validationGates || [], evalCase.requiredValidationGateContains || [])) {
      fail(`enterprise-routing-${evalCase.id}`, "scenario validation gates are missing expected evidence wording");
    }
    if (!Array.isArray(evalCase.forbiddenClaims) || evalCase.forbiddenClaims.length === 0) {
      fail(`enterprise-routing-${evalCase.id}`, "eval must include no-fake-validation forbiddenClaims");
    }
  }

  const governanceLiteScenario = findScenario(matrix, "governance-lite-router-mode");
  if (!governanceLiteScenario) {
    fail("governance-lite-router-mode", "routing matrix must include governance-lite/router-lite method-only scenario");
  } else {
    if (!includesAll(governanceLiteScenario.skills || [], ["governance"]) || (governanceLiteScenario.skills || []).length !== 1) {
      fail("governance-lite-router-mode", "governance-lite routing must use the existing governance skill");
    }
    if ((governanceLiteScenario.skills || []).includes("governance-lite") || (governanceLiteScenario.skills || []).includes("router-lite")) {
      fail("governance-lite-router-mode", "governance-lite/router-lite must not be active skills");
    }
    if (!includesAll(governanceLiteScenario.methodReferences || [], ["governance.governance-lite-router-mode"])) {
      fail("governance-lite-router-mode", "governance-lite routing must reference the passive governance-lite method");
    }
    if (governanceLiteScenario.tokenMode !== "concise") {
      fail("governance-lite-router-mode", "governance-lite routing must default to concise token mode");
    }
    if (!includesAll(governanceLiteScenario.stopConditions || [], ["Source freshness fails before source/utilization or release work"])) {
      fail("governance-lite-router-mode", "governance-lite routing must preserve source freshness stop condition");
    }
    if (!includesAll(governanceLiteScenario.validationGates || [], ["Branch and HEAD reported when branch/source truth matters", "Source freshness and runtime count reported when relevant"])) {
      fail("governance-lite-router-mode", "governance-lite routing must validate branch/source truth and conditional freshness/runtime evidence");
    }
    if (!includesAll(governanceLiteScenario.expectedCompletionReport || [], ["branch and HEAD", "runtime count if runtime surfaces are in scope", "source freshness and source-truth status if release/source/public-safety surfaces are in scope"])) {
      fail("governance-lite-router-mode", "governance-lite completion report must include branch, runtime, and source-truth evidence when relevant");
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
    "coderabbit-credit-failure-not-pass",
    "ambiguous-package-manager-no-npm-default",
    "mock-source-freshness-not-live-proof"
  ]) {
    if (!stopConditionIds.has(required)) {
      fail(`no-fake-validation-${required}`, "expected no-fake-validation stop-condition eval missing");
    }
  }

  for (const evalCase of stopConditionEvals.cases || []) {
    if (!UNSAFE_EXPECTED_ACTIONS.has(evalCase.expectedAction)) {
      fail(`unsafe-contract-${evalCase.id}`, `expectedAction must be controlled, got ${evalCase.expectedAction || "<missing>"}`);
    }
    if (!hasNonEmptyArray(evalCase.forbiddenClaims)) {
      fail(`unsafe-contract-${evalCase.id}`, "unsafe eval must include forbiddenClaims");
    }
    const hasSafeResponse =
      typeof evalCase.expectedSafeResponse === "string" &&
      evalCase.expectedSafeResponse.trim().length > 0;
    if (!hasNonEmptyArray(evalCase.expectedStopConditions) && !hasSafeResponse) {
      fail(`unsafe-contract-${evalCase.id}`, "unsafe eval must include expectedStopConditions or expectedSafeResponse");
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

  if (JSON.stringify(namingEvals) !== JSON.stringify(embeddedNamingEvals)) {
    fail("generic-naming-embedded-evals", "embedded generic naming eval suite must match top-level eval suite");
  }

  for (const evalCase of namingEvals.cases || []) {
    if (!includesAll(evalCase.forbiddenAliases || [], REMOVED_OR_METHOD_ONLY_ALIASES)) {
      fail(`generic-naming-forbidden-aliases-${evalCase.id}`, "generic naming eval must forbid removed aliases and method-only names");
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
    "token-discipline-large-review",
    "code-quality-active-if-detected-not-install-proof"
  ]) {
    if (!governanceProofEvalIds.has(required)) {
      fail(`governance-proof-${required}`, "expected governance proof eval missing");
    }
  }

  const governanceLiteEval = (governanceProofEvals.cases || []).find((evalCase) => evalCase.id === "governance-lite-not-sixth-skill");
  if (!governanceLiteEval || !includesAll(governanceLiteEval.forbiddenSkills || [], ["governance-lite", "router-lite"])) {
    fail("governance-proof-no-sixth-skill", "governance-lite eval must forbid governance-lite and router-lite as active skills");
  }

  for (const evalCase of governanceProofEvals.cases || []) {
    const prompt = String(evalCase.userPrompt || "").toLowerCase();
    const action = String(evalCase.expectedAction || "").toLowerCase();
    if ((prompt.includes("review") || action.includes("review")) && !hasNonEmptyArray(evalCase.expectedReviewBehaviors)) {
      fail(`governance-proof-review-behaviors-${evalCase.id}`, "review-oriented governance eval must include expectedReviewBehaviors");
    }
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
    "no-fake-browser-evidence-stop",
    "responsive-qa-without-viewport-evidence"
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
    if (evalCase.expectedCurrentSkill === "uiux" && !evalCase.expectedStopCondition && !hasNonEmptyArray(evalCase.expectedReviewBehaviors)) {
      fail(`premium-uiux-review-behaviors-${evalCase.id}`, "UI/UX review eval must include expectedReviewBehaviors unless it is a stop-condition case");
    }
  }

  const premiumPrompts = JSON.stringify((uiuxEvals.cases || []).map((evalCase) => evalCase.userPrompt || ""));
  if (/private project name|confidential project domain/i.test(premiumPrompts)) {
    fail("premium-uiux-public-safe-prompts", "generic premium UI/UX eval prompts must not contain project-specific names or domains");
  }

  const noFakeBrowser = (uiuxEvals.cases || []).find((evalCase) => evalCase.id === "no-fake-browser-evidence-stop");
  if (!noFakeBrowser || !includesAll(noFakeBrowser.forbiddenClaims || [], ["browser-verified", "screenshot-reviewed", "visual-qa-passed"])) {
    fail("premium-uiux-no-fake-browser", "no-fake browser eval must forbid browser, screenshot, and visual QA claims without evidence");
  }

  const responsiveNoEvidence = (uiuxEvals.cases || []).find((evalCase) => evalCase.id === "responsive-qa-without-viewport-evidence");
  if (!responsiveNoEvidence || !includesAll(
    responsiveNoEvidence.forbiddenClaims || [],
    ["responsive-verified", "mobile-verified", "desktop-verified", "visual-qa-passed"]
  )) {
    fail("premium-uiux-no-fake-responsive", "responsive no-evidence eval must forbid responsive, mobile, desktop, and visual QA verification claims without viewport evidence");
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
