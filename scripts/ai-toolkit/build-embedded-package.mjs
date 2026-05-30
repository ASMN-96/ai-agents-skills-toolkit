#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import {
  ACTIVE_AGENT_FILES,
  ACTIVE_PROJECT_AGENTS,
  ACTIVE_SKILLS,
  INTERNAL_HELPER_SKILLS,
  SOURCE_OF_TRUTH_MAP,
  TOOL_ENTRIES,
  TOOLKIT_VERSION
} from "./embedded-data.mjs";

const ROOT = process.cwd();
const AI_ROOT = ".ai-toolkit";

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function toSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

async function ensureDir(relativePath) {
  await mkdir(rootPath(relativePath), { recursive: true });
}

async function writeText(relativePath, text) {
  await ensureDir(path.dirname(relativePath));
  await writeFile(rootPath(relativePath), text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

async function writeJson(relativePath, value) {
  await writeText(relativePath, JSON.stringify(value, null, 2));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
}

async function copyFileTracked(source, target, mirrors, mode = "byte-identical") {
  await ensureDir(path.dirname(target));
  await cp(rootPath(source), rootPath(target), { force: true });
  mirrors.push({
    source,
    target,
    mode,
    sha256: await sha256(target)
  });
}

async function sha256(relativePath) {
  const content = await readFile(rootPath(relativePath));
  return createHash("sha256").update(content).digest("hex");
}

function sourceRecordPath(toolId) {
  return `${AI_ROOT}/sources/records/${toolId}.md`;
}

function sourceUrl(repository) {
  return `https://github.com/${repository}`;
}

function repoParts(repository) {
  const [owner, repo] = repository.split("/");
  return { owner, repo };
}

function toolRegistryEntry([id, name, repository, homepage, category, purpose, status, defaultUse]) {
  const approvalRequiredFor = [
    "install",
    "activation",
    "CI wiring",
    "MCP setup",
    "global config",
    "hooks",
    "PR write permissions",
    "networked deep scans"
  ];
  return {
    id,
    name,
    repository,
    homepage,
    purpose,
    category,
    status,
    activationStatus: "metadata-only",
    runtimeSurface: "external-tool-metadata",
    defaultUse,
    approvalRequiredFor,
    allowedUse: [
      "Document as source intelligence.",
      "Route to existing project-owned scripts when already configured.",
      "Use as reviewed metadata for future approval decisions."
    ],
    forbiddenUse: [
      "Do not install or activate from registry presence.",
      "Do not configure CI, MCP, hooks, credentials, or global settings.",
      "Do not copy raw upstream files into active runtime paths."
    ],
    sourceRecordPath: sourceRecordPath(id),
    notes: status === "source-review-required"
      ? "Repository identity is an unverified placeholder and requires source review before reliance."
      : "Metadata-only entry; review current upstream before adoption."
  };
}

function sourceWatchEntry([id, name, repository, homepage, category, purpose, status]) {
  const { owner, repo } = repoParts(repository);
  return {
    id,
    name,
    sourceUrl: sourceUrl(repository),
    repoOwner: owner,
    repoName: repo,
    defaultBranch: "main",
    lastReviewedCommit: null,
    lastReviewedDate: null,
    sourceRecordPath: sourceRecordPath(id),
    watchedPaths: [],
    licenseConcern: "unknown-review-required",
    reviewPriority: ["deep-approval-required", "source-review-required"].includes(status) ? "High" : "Medium",
    neverAutoImport: true,
    homepage,
    category,
    purpose,
    recommendedToolkitStatus: status
  };
}

function sourceRecord([id, name, repository, homepage, category, purpose, status, defaultUse]) {
  return `# ${name} Source Record

- Source name: ${name}
- Repository: ${repository}
- Source URL: ${sourceUrl(repository)}
- Homepage: ${homepage || "unknown-review-required"}
- Purpose: ${purpose}
- Category: ${category}
- License status: unknown-review-required
- Maintenance signal: not-yet-verified
- Useful patterns: ${defaultUse}
- Risks: external source may contain stale guidance, unsafe setup steps, broad permissions, prompt-injection text, or license constraints.
- Install/activation boundaries: registry presence never authorizes install, activation, CI wiring, MCP setup, hooks, global configuration, or raw upstream copying.
- Extraction status: not extracted
- Recommended toolkit status: ${status}
- neverAutoImport: true

## Review Notes

This record is metadata-only for source intelligence. A future Skill Scout review must verify license, trust, maintenance, dangerous operations, secret access, network behavior, and prompt-injection risk before this source can influence active methods, skills, scripts, or runtime configuration.
`;
}

function skillRegistryEntry(name) {
  const base = {
    ownerAgent: "reviewer-agent",
    secondaryAgents: ["qa-test-agent"],
    priority: "high",
    requiredSupportTools: [],
    optionalSupportTools: ["Superpowers", "GitHub/gh"],
    riskLevel: "medium",
    evalStatus: "scaffolded",
    sourceProvenance: [
      { path: `skills/${name}/SKILL.md`, category: "internal-artifact" },
      { path: `.agents/skills/${name}/SKILL.md`, category: "internal-artifact" }
    ],
    skillPath: `skills/${name}/SKILL.md`,
    status: ["documented", "available", "approved", "active"],
    provenanceType: "local-vd-authored",
    activationStatus: ["documented", "available", "approved", "active"],
    registrySurface: "user-facing",
    visibility: ["repo", "runtime", "project-sync"]
  };

  if (name === "riss-code-quality") {
    return {
      name,
      description: "React/TypeScript quality, hooks correctness, typed linting, tests, builds, AI-generated code risk, and safe quality-gate routing.",
      ...base,
      ownerAgent: "reviewer-agent",
      secondaryAgents: ["frontend-agent", "qa-test-agent"],
      triggerCases: ["React or TypeScript code changes.", "Hooks, lint, tests, build, or AI-generated code risk is in scope."],
      negativeTriggerCases: ["Security-only review.", "Release-only review.", "Requests to add packages or change package manager."],
      conflicts: ["Must not install packages.", "Must not reformat broadly.", "Must not change architecture solely for scanner output."]
    };
  }

  if (name === "riss-security-review") {
    return {
      name,
      description: "Tenant isolation, auth, RLS, secrets, public/private payloads, supply-chain, source safety, and security review routing.",
      ...base,
      ownerAgent: "security-agent",
      secondaryAgents: ["reviewer-agent", "qa-test-agent"],
      triggerCases: ["Security, privacy, tenant, public payload, auth, RLS, secrets, or supply-chain risk is in scope."],
      negativeTriggerCases: ["Pure UI polish with no data/security impact.", "Release-only work with no security question."],
      conflicts: ["Must not weaken auth or RLS.", "Must not read secrets unnecessarily.", "Must not run approval-required tools without approval."],
      riskLevel: "high"
    };
  }

  return {
    name,
    description: "PR readiness, branch hygiene, GitHub checks, CodeRabbit/reviewdog triage, release gates, and post-merge readiness.",
    ...base,
    ownerAgent: "release-manager-agent",
    secondaryAgents: ["reviewer-agent", "qa-test-agent"],
    triggerCases: ["PR, CI, checks, CodeRabbit, reviewdog, publish, release, merge, or post-merge readiness is in scope."],
    negativeTriggerCases: ["Primary code implementation without release posture.", "Requests to merge with pending blockers."],
    conflicts: ["Must not push to main.", "Must not merge with pending required checks.", "Must not mark release ready without evidence."],
    riskLevel: "high"
  };
}

async function updateSkillsRegistry() {
  const registry = await readJson("registries/skills.registry.json");
  const existing = new Map(registry.skills.map((entry) => [entry.name, entry]));
  for (const name of ["riss-code-quality", "riss-security-review", "riss-release-gate"]) {
    existing.set(name, skillRegistryEntry(name));
  }
  registry.skills = Array.from(existing.values());
  await writeJson("registries/skills.registry.json", registry);
}

async function updateToolsRegistry() {
  await writeJson("registries/tools.registry.json", {
    schemaVersion: "1.0.0",
    registryType: "tools",
    activationPolicy: "Registry presence never implies install, activation, execution, CI wiring, MCP setup, approval, or runtime availability.",
    tools: TOOL_ENTRIES.map(toolRegistryEntry)
  });
}

async function updateRoutingMatrix() {
  const registry = await readJson("registries/routing-matrix.json");
  const existing = new Map(registry.scenarios.map((entry) => [entry.scenario, entry]));
  const additions = [
    {
      scenario: "react-typescript-quality-change",
      userLanguageExamples: ["Fix this TypeScript issue.", "Review hooks and tests.", "Run the fast quality gate."],
      inferredIntent: "Route React and TypeScript code changes through typed quality checks and focused tests.",
      riskLevel: "medium",
      selectedProfile: "frontend-profile",
      agents: ["frontend-agent", "reviewer-agent", "qa-test-agent"],
      skills: ["riss-governance", "riss-code-quality"],
      supportTools: ["Superpowers", "GitHub/gh"],
      stopConditions: ["Package changes are required", "Required validation cannot run"],
      validationGates: ["Typecheck/lint/tests/build if available", "No package or lockfile changes", "Changed behavior has focused validation"],
      expectedCompletionReport: ["Quality gate mode", "Commands run", "Skipped checks", "Residual risks"],
      tokenMode: "standard",
      methodReferences: ["internal.engineering-lifecycle-gates", "internal.tdd-verification-alignment"]
    },
    {
      scenario: "tenant-security-public-payload-review",
      userLanguageExamples: ["Check tenant isolation.", "Is this public payload safe?", "Review secrets and supply chain risk."],
      inferredIntent: "Review authorization, privacy, public/private data boundaries, and source/tool safety.",
      riskLevel: "high",
      selectedProfile: "security-profile",
      agents: ["security-agent", "reviewer-agent", "qa-test-agent"],
      skills: ["riss-governance", "riss-security-review"],
      supportTools: ["Superpowers", "GitHub/gh"],
      stopConditions: ["Security evidence is incomplete", "Approval-required tooling would be needed", "Auth/RLS weakening is requested"],
      validationGates: ["Findings have evidence", "Secrets and public payloads checked", "Approval-required tools not run"],
      expectedCompletionReport: ["Findings by severity", "Coverage", "Skipped checks", "Required fixes"],
      tokenMode: "detailed",
      methodReferences: ["security.differential-security-review", "backend.supabase-postgres-rls-gates"]
    },
    {
      scenario: "pr-release-coderabbit-gate",
      userLanguageExamples: ["Make the PR ready.", "Check CodeRabbit and release blockers.", "Prepare a pre-merge report."],
      inferredIntent: "Verify branch, PR, checks, review comments, and release readiness before merge.",
      riskLevel: "high",
      selectedProfile: "release-profile",
      agents: ["release-manager-agent", "reviewer-agent", "qa-test-agent"],
      skills: ["riss-governance", "riss-release-gate"],
      supportTools: ["GitHub/gh", "CodeRabbit", "Superpowers"],
      stopConditions: ["Required checks fail or are pending", "PR state cannot be verified", "Required review blockers remain"],
      validationGates: ["Branch and PR status checked", "Validation commands run", "Review status reported"],
      expectedCompletionReport: ["PR URL", "Checks", "Review status", "Blockers", "Merge recommendation"],
      tokenMode: "detailed",
      methodReferences: ["osmani.shipping-launch", "matt.git-guardrails"]
    },
    {
      scenario: "external-tool-source-update",
      userLanguageExamples: ["Add this tool to the toolkit.", "Refresh the tool watchlist.", "Can we use this scanner?"],
      inferredIntent: "Represent external tools as metadata-only source intelligence before any activation or extraction.",
      riskLevel: "high",
      selectedProfile: "security-profile",
      agents: ["skill-scout-agent", "security-agent", "reviewer-agent"],
      skills: ["riss-governance", "riss-security-review"],
      supportTools: ["web search/browser", "GitHub/gh"],
      stopConditions: ["Source identity cannot be safely represented", "License or trust review is required for adoption"],
      validationGates: ["neverAutoImport true", "Source record exists", "No install, raw import, CI, MCP, or global config change"],
      expectedCompletionReport: ["Source identity", "Recommended status", "Approval needed", "Risks"],
      tokenMode: "detailed",
      methodReferences: ["internal.source-discovery-workflow", "internal.source-safety-scoring"]
    },
    {
      scenario: "embedded-toolkit-runtime-boundary",
      userLanguageExamples: ["Create embedded .ai-toolkit package.", "Validate active Codex runtime copies.", "Check mirror drift."],
      inferredIntent: "Maintain main-toolkit embedded distribution storage while keeping runtime activation surfaces small and explicit.",
      riskLevel: "high",
      selectedProfile: "release-profile",
      agents: ["reviewer-agent", "release-manager-agent", "security-agent", "qa-test-agent"],
      skills: ["riss-governance", "riss-code-quality", "riss-security-review", "riss-release-gate"],
      supportTools: ["Superpowers", "GitHub/gh"],
      stopConditions: ["Mirror drift is detected", "Runtime helper skills become user-facing", "Package/runtime boundary is unclear"],
      validationGates: ["Aggregate validator passes", "Runtime validator passes", "Version validator passes", "Mirror hashes match"],
      expectedCompletionReport: ["Source-of-truth map", "Runtime surfaces", "Drift status", "Blockers"],
      tokenMode: "detailed",
      methodReferences: ["internal.engineering-lifecycle-gates", "internal.source-safety-scoring"]
    }
  ];
  for (const scenario of additions) {
    existing.set(scenario.scenario, scenario);
  }
  registry.scenarios = Array.from(existing.values());
  await writeJson("registries/routing-matrix.json", registry);
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

## Source Of Truth Map

${sourceMapTable}

## Approval Boundaries

- Registries are metadata only.
- Tool records are source-intelligence only.
- Source watchlist entries always use \`neverAutoImport: true\`.
- Active runtime is limited to five skills and five project custom agents.
- Helper skills remain internal and must not be copied into active runtime paths.
- Top-level folders remain canonical and are not deleted, relocated, or flattened in this pass.

## Validation

Run from the repository root:

- \`node scripts/validate-toolkit.mjs\`
- \`node scripts/ai-toolkit/validate-ai-toolkit.mjs\`
- \`node scripts/ai-toolkit/validate-codex-runtime.mjs\`
- \`node scripts/ai-toolkit/validate-version-consistency.mjs\`
- \`node scripts/ai-toolkit/run-toolkit-evals.mjs\`
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
    "riss-v2-critical-flow-gate.md": "# RISS V2 Critical Flow Gate\n\n- Viewer flow, wizard flow, dashboard flow, lead capture, publish/preview, and mobile buyer journey are considered when relevant.\n- Arabic and English UI behavior is checked when in scope.\n- Unit/project data consistency and public route behavior are protected.\n- Regression risk is stated before release claims.\n",
    "riss-v2-security-tenant-gate.md": "# RISS V2 Security Tenant Gate\n\n- Tenant isolation and role access are reviewed.\n- Public/private payload boundaries are explicit.\n- Lead data, auth/session behavior, RLS/Supabase policy, storage policy, frontend leakage, and analytics leakage are checked when present.\n",
    "riss-v2-publish-release-gate.md": "# RISS V2 Publish Release Gate\n\n- Draft, preview, publish, rollback, asset availability, cache/CDN behavior, migration risk, and public-route risk are reviewed when relevant.\n- Manual QA is required before release when runtime behavior matters.\n",
    "riss-v2-ai-generated-code-risk-gate.md": "# RISS V2 AI-Generated Code Risk Gate\n\n- Hidden rewrites, duplicated abstractions, hardcoded IDs, fake validation claims, bypassed auth/RLS, weak error handling, untested critical paths, broad refactors, and silent package changes are checked.\n",
    "pr-feedback-noise-control.md": "# PR Feedback Noise Control\n\n- CodeRabbit is the primary contextual reviewer when available.\n- reviewdog is used only for deterministic scanner output when already configured.\n- Prefer diff-only reporting.\n- Classify findings as required, scoped fix, clarify, defer, no action, or optional.\n- Do not block PRs on style-only noise unless it hides real risk.\n"
  };
  for (const [file, text] of Object.entries(checklists)) {
    await writeText(`${AI_ROOT}/checklists/${file}`, text);
  }

  const templates = {
    "web-quality-gates-template.md": "# Web Quality Gates Report\n\n- Scope:\n- Commands run:\n- Passed:\n- Failed:\n- Skipped:\n- Manual QA:\n- Risks:\n",
    "decision-log-template.md": "# Decision Log\n\n- Title:\n- Status:\n- Decision:\n- Context:\n- Risks:\n- Mitigations:\n- Follow-up:\n",
    "source-record-template.md": "# Source Record\n\n- Source name:\n- Repository:\n- Source URL:\n- License status:\n- Maintenance signal:\n- Useful patterns:\n- Risks:\n- Boundaries:\n- Recommended status:\n",
    "tool-record-template.md": "# Tool Record\n\n- Tool:\n- Purpose:\n- Category:\n- Default use:\n- Approval required for:\n- Allowed use:\n- Forbidden use:\n- Source record:\n"
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
    ]
  });

  await writeJson(`${AI_ROOT}/tool-packs/riss-v2-quality-security.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    extends: "webapp-quality-security",
    packageType: "route-metadata",
    rissConcerns: ["viewer public buyer journey", "wizard setup and publish", "dashboard analytics and leads", "lead capture", "draft preview publish rollback", "tenant isolation", "Arabic and English UI", "mobile buyer journey", "public/private payloads", "Supabase/RLS if applicable", "asset availability", "visual/runtime QA"],
    routes: [
      route("riss-critical-flow", "RISS critical buyer, wizard, dashboard, lead, and publish flow review.", ["RISS flow change", "publish path", "lead capture"], ["docs-only"], ["typecheck", "lint", "test", "build"], ["playwright", "axe-playwright"], [], ["critical flow cannot be validated"], ["flows checked", "manual QA", "risks"]),
      route("riss-security-tenant", "RISS tenant, auth, lead data, and public payload review.", ["tenant", "auth", "lead data", "public payload"], ["UI-only"], ["typecheck", "lint", "test"], ["gitleaks", "osv-scanner", "semgrep"], ["socket", "trufflehog", "owasp-zap-baseline"], ["data exposure risk unresolved"], ["security findings", "coverage", "blockers"]),
      route("riss-release", "RISS publish and release readiness gate.", ["release", "publish", "PR"], ["exploration"], ["typecheck", "lint", "test", "build"], ["github-gh", "coderabbit"], ["harden-runner"], ["required checks pending"], ["PR status", "checks", "review", "next action"])
    ]
  });
}

async function writeSources() {
  const watchlist = TOOL_ENTRIES.map(sourceWatchEntry);
  await writeJson(`${AI_ROOT}/sources/watchlist.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    policy: "Source watchlist is metadata-only and never authorizes import, install, activation, extraction, CI wiring, MCP setup, or global config changes.",
    sources: watchlist
  });
  for (const tool of TOOL_ENTRIES) {
    await writeText(sourceRecordPath(tool[0]), sourceRecord(tool));
  }
}

async function writeEvals() {
  await writeJson(`${AI_ROOT}/evals/runtime-activation/runtime-boundary-evals.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    cases: [
      { id: "ai-toolkit-not-runtime", input: "Use .ai-toolkit skill directly", expected: "reject-runtime-activation-confusion" },
      { id: "active-skill-visible", input: "Use riss-code-quality for a TypeScript change", expected: "route-active-skill" },
      { id: "helper-not-user-facing", input: "Use riss-skill-governance directly", expected: "redirect-to-riss-governance" }
    ]
  });
  await writeJson(`${AI_ROOT}/evals/routing/toolkit-routing-evals.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    cases: [
      { id: "quality", input: "Review this React TypeScript diff", expectedSkills: ["riss-governance", "riss-code-quality"] },
      { id: "security", input: "Check tenant isolation and secrets", expectedSkills: ["riss-governance", "riss-security-review"] },
      { id: "release", input: "Prepare PR and CodeRabbit release gate", expectedSkills: ["riss-governance", "riss-release-gate"] },
      { id: "source", input: "Add this external scanner", expectedSkills: ["riss-governance", "riss-security-review"], forbiddenActions: ["install", "activate", "raw-import"] }
    ]
  });
}

async function copyMirrors() {
  const mirrors = [];
  for (const skill of ACTIVE_SKILLS) {
    await copyFileTracked(`skills/${skill}/SKILL.md`, `.agents/skills/${skill}/SKILL.md`, mirrors);
    await copyFileTracked(`skills/${skill}/SKILL.md`, `${AI_ROOT}/skills/${skill}/SKILL.md`, mirrors);
  }

  for (const file of ACTIVE_AGENT_FILES) {
    const name = file.replace(/\.toml$/, "");
    await copyFileTracked(`.codex/agents/${file}`, `${AI_ROOT}/runtime-agents/${file}`, mirrors);
    const sourceAgent = `agents/${name}.md`;
    try {
      await stat(rootPath(sourceAgent));
      await copyFileTracked(sourceAgent, `${AI_ROOT}/agents/${name}.md`, mirrors, "packaged-source-hash");
    } catch {
      // Runtime TOML still remains the active copy; missing markdown source is validated separately if required later.
    }
  }

  for (const file of await readdir(rootPath("registries"))) {
    if (file.endsWith(".json")) {
      await copyFileTracked(`registries/${file}`, `${AI_ROOT}/registries/${file}`, mirrors);
    }
  }

  for (const file of ["reviewer-agent.compiled.md", "frontend-agent.compiled.md", "security-agent.compiled.md", "qa-test-agent.compiled.md", "release-manager-agent.compiled.md"]) {
    await copyFileTracked(`compiled-agents/${file}`, `${AI_ROOT}/compiled-agents/${file}`, mirrors, "packaged-source-hash");
  }

  return mirrors;
}

async function writeManifest(mirrors) {
  const scripts = [
    "scripts/validate-toolkit.mjs",
    "scripts/check-source-freshness.mjs",
    "scripts/ai-toolkit/validate-ai-toolkit.mjs",
    "scripts/ai-toolkit/validate-codex-runtime.mjs",
    "scripts/ai-toolkit/validate-version-consistency.mjs",
    "scripts/ai-toolkit/run-toolkit-evals.mjs",
    "scripts/ai-toolkit/check-source-freshness.mjs",
    "scripts/ai-toolkit/run-quality-gate.mjs"
  ];
  const existingScripts = [];
  for (const script of scripts) {
    try {
      await stat(rootPath(script));
      existingScripts.push({ path: script, sha256: await sha256(script) });
    } catch {
      existingScripts.push({ path: script, sha256: null, status: "planned" });
    }
  }

  await writeJson(`${AI_ROOT}/scripts-manifest.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    scripts: existingScripts
  });

  await writeJson(`${AI_ROOT}/manifest.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    packageModel: "main-toolkit-embedded-distribution-governance-package",
    runtimeBoundary: ".ai-toolkit is non-runtime storage; active runtime is limited to .agents/skills and .codex/agents files listed here.",
    activeSkills: ACTIVE_SKILLS,
    internalHelperSkills: INTERNAL_HELPER_SKILLS,
    activeProjectAgents: ACTIVE_PROJECT_AGENTS,
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
    mirrors,
    generatedBy: "scripts/ai-toolkit/build-embedded-package.mjs"
  });
}

async function main() {
  await updateSkillsRegistry();
  await updateToolsRegistry();
  await updateRoutingMatrix();
  await writePackageDocs();
  await writeChecklistsAndTemplates();
  await writeToolPacks();
  await writeSources();
  await writeEvals();
  const mirrors = await copyMirrors();
  await writeManifest(mirrors);
  console.log(`Built ${AI_ROOT} package for ${TOOLKIT_VERSION}`);
}

await main().catch((error) => {
  console.error(`Failed to build embedded package: ${error.message}`);
  process.exitCode = 1;
});
