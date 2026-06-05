#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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
const REMOVED_SKILL_ALIASES = [
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
];

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
  const content = await readFile(rootPath(relativePath), "utf8");
  return createHash("sha256").update(content.replace(/\r\n/g, "\n")).digest("hex");
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

function isCodeRabbitIntegration(id) {
  return id === "coderabbit";
}

function isCodeReviewGraph(id) {
  return id === "code-review-graph";
}

function enterpriseRiskMetadata(id) {
  const base = {
    license: "unknown-review-required",
    saasOrLocal: "unknown-review-required",
    dataSentExternally: "unknown-review-required",
    networkBehavior: "unknown-review-required",
    secretAccessRisk: "unknown-review-required",
    repositoryPermissionsRequired: "unknown-review-required",
    ciPermissionsRequired: "unknown-review-required",
    githubAppPermissionsRequired: "unknown-review-required",
    authenticationModel: "unknown-review-required",
    telemetryBehavior: "unknown-review-required",
    commercialVendorDependency: "unknown-review-required",
    maintenanceSignal: "unknown-review-required",
    lastReviewedCommit: "unknown-review-required",
    lastReviewedDate: "unknown-review-required",
    securityReviewStatus: "unknown-review-required",
    approvalOwner: "owner-decision-required",
    allowedEnvironments: ["metadata-only"],
    forbiddenEnvironments: ["local execution", "CI", "staging", "production", "global config", "MCP", "product repositories"],
    defaultEnterpriseStatus: "metadata-only unless explicitly approved"
  };

  if (isCodeRabbitIntegration(id)) {
    return {
      ...base,
      saasOrLocal: "SaaS/external connected service",
      dataSentExternally: "PR or repository context may be sent externally when the already-connected integration is used; repository owner review required",
      networkBehavior: "networked GitHub app / external service",
      ciPermissionsRequired: "none from toolkit metadata; unknown-review-required for external configuration",
      authenticationModel: "external service / GitHub app integration",
      commercialVendorDependency: "yes",
      allowedEnvironments: ["already-connected PR review workflows after repository owner approval"],
      forbiddenEnvironments: ["install or configuration from registry presence", "credential changes", "permission changes", "merge authority by itself"]
    };
  }

  if (isCodeReviewGraph(id)) {
    return {
      ...base,
      license: "MIT signal at reviewed commit; not legal approval to copy raw upstream content",
      saasOrLocal: "local-first Python package with CLI, MCP, daemon, and VS Code surfaces; metadata-only in toolkit",
      dataSentExternally: "none from toolkit metadata; unknown and approval-required if tool or optional integrations are installed or run",
      networkBehavior: "metadata-only in toolkit; upstream includes MCP/HTTP server and optional network-capable integrations, approval required before use",
      secretAccessRisk: "high if run against product repositories; no product repo scanning, whole-repo dumping, or private-overlay indexing is approved",
      repositoryPermissionsRequired: "none from toolkit metadata; local repo read/index permissions only if separately approved",
      ciPermissionsRequired: "none from toolkit metadata; CI wiring remains approval-required",
      githubAppPermissionsRequired: "none from toolkit metadata",
      authenticationModel: "none from toolkit metadata; optional external integrations are not approved",
      telemetryBehavior: "none approved or activated from toolkit metadata",
      commercialVendorDependency: "none for metadata-only posture; optional external integrations remain unapproved",
      maintenanceSignal: "active public repo at reviewed commit; not runtime-approved",
      lastReviewedCommit: "0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8",
      lastReviewedDate: "2026-06-05",
      securityReviewStatus: "completed source-safety review for active-read-only metadata; execution, install, indexing, MCP, package changes, CI, and product scanning remain approval-required",
      approvalOwner: "source-intelligence-owner-required-before-execution",
      defaultEnterpriseStatus: "metadata-only active-read-only source intelligence unless explicitly approved; not enterprise-approved for execution, indexing, MCP, CI, package changes, or product repo scanning"
    };
  }

  return base;
}

function toolRegistryEntry([id, name, repository, homepage, category, purpose, status, defaultUse]) {
  if (isCodeRabbitIntegration(id)) {
    return {
      id,
      name,
      repository,
      homepage,
      purpose,
      category,
      status,
      activationStatus: "external-installed-if-enabled",
      runtimeSurface: "codex-plugin-github-app",
      defaultUse,
      approvalRequiredFor: [
        "installing plugin",
        "changing CodeRabbit configuration",
        "changing GitHub app permissions",
        "CI workflow changes",
        "PR write/merge actions"
      ],
      allowedUse: [
        "Route PR review and merge-readiness workflows to an already connected CodeRabbit integration.",
        "Interpret CodeRabbit PR feedback as one support input alongside repo policy, validators, and human approval.",
        "Use CodeRabbit comment triage when it is already available on the current PR."
      ],
      forbiddenUse: [
        "Do not install/configure CodeRabbit from registry presence.",
        "Do not authenticate or activate CodeRabbit from registry presence.",
        "Do not treat CodeRabbit comments as higher priority than repo policy.",
        "Do not merge based only on CodeRabbit pass.",
        "Do not duplicate CodeRabbit with noisy reviewdog comments."
      ],
      sourceRecordPath: null,
      integrationRecordPath: `${AI_ROOT}/integrations/coderabbit.md`,
      enterpriseRisk: enterpriseRiskMetadata(id),
      notes: "Delegated external integration metadata only; the toolkit routes to CodeRabbit and interprets feedback but does not install, authenticate, configure, vendor, or copy CodeRabbit."
    };
  }

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
    integrationRecordPath: null,
    enterpriseRisk: enterpriseRiskMetadata(id),
    notes: status === "source-review-required"
      ? "Repository/source identity requires explicit source review before reliance."
      : "Metadata-only entry; review current upstream before adoption."
  };
}

function sourceWatchEntry([id, name, repository, homepage, category, purpose, status]) {
  const { owner, repo } = repoParts(repository);
  const entry = {
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
  if (isCodeReviewGraph(id)) {
    return {
      ...entry,
      lastReviewedCommit: "0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8",
      lastReviewedDate: "2026-06-05",
      licenseConcern: "clear",
      reviewPriority: "High",
      recommendedToolkitStatus: "active-read-only",
      reviewedHold: {
        status: "REVIEWED_HELD",
        reviewedCommit: "0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8",
        reviewedDate: "2026-06-05",
        classification: "active-read-only source intelligence",
        decision: "metadata and manual/static source intelligence only; no import, install, activation, package changes, MCP/global config, CI wiring, indexing, product repo scanning, private-overlay indexing, generated graph claims, or raw upstream copying",
        noImportNoInstallNoExtraction: true,
        forbiddenActions: [
          "import",
          "install",
          "activation",
          "extraction",
          "package changes",
          "MCP setup",
          "global config",
          "CI wiring",
          "indexing",
          "product repo scanning",
          "private-overlay indexing",
          "generated graph claims",
          "raw upstream copying"
        ]
      }
    };
  }
  return entry;
}

function sourceRecord([id, name, repository, homepage, category, purpose, status, defaultUse]) {
  if (isCodeReviewGraph(id)) {
    return `# code-review-graph Source Record

- Source name: code-review-graph
- Repository: tirth8205/code-review-graph
- Source URL: https://github.com/tirth8205/code-review-graph
- Homepage: https://code-review-graph.com
- Last reviewed commit: 0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8
- Last reviewed date: 2026-06-05
- Review level: completed source-safety review for active-read-only metadata
- Classification: active-read-only source intelligence
- License status: MIT signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; not runtime-approved
- neverAutoImport: true

## Toolkit Value

code-review-graph is useful as reference material for context-graph and token-budget governance. The toolkit-owned usage is limited to static planning methods for changed-file neighborhood selection, compact agent context packs, stale graph detection, and token budget reporting.

## Reviewed Evidence

- License signal: GitHub repository metadata and the reviewed package metadata report MIT at \`0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8\`.
- Source trust signal: public, non-fork, non-archived repository; still external and not imported.
- Maintenance signal: reviewed commit was committed on 2026-05-25; repository metadata showed recent activity during the 2026-06-05 review.
- Install behavior: Python package metadata exposes CLI entrypoints and optional extras; no install is approved by this source record.
- CLI behavior: reviewed tree includes commands for install/init, build/update/watch, MCP serving, repository registration, daemon management, graph visualization, wiki generation, and evaluation.
- MCP behavior: reviewed tree includes MCP configuration and serve/mcp command surfaces; MCP setup remains approval-required.
- Indexing behavior: reviewed tree includes graph build, incremental update, FTS, community/flow processing, and daemon/watch behavior; indexing remains approval-required.
- Network behavior: toolkit metadata sends no data externally; upstream includes MCP/HTTP serving and optional network-capable integrations, so any execution requires separate owner approval.
- Secret and data exposure risk: running or indexing against a product repo could capture source, paths, private overlays, secrets, or sensitive architecture; product-repo scanning and private-overlay indexing are forbidden without approval.
- Filesystem writes: reviewed behavior can create graph databases, local config, logs, generated graph/wiki/visualization output, platform instructions, hooks, and daemon state; no write behavior is approved by registry presence.
- Global config risk: reviewed behavior includes platform and MCP configuration paths; global/user config changes remain forbidden without approval.
- Prompt-injection risk: upstream repository includes docs, prompts/instructions, skills, generated examples, and review-assistant surfaces; use only normalized toolkit-owned guidance.
- Dangerous command risk: install/init, hooks, daemon, watchers, subprocess/git use, package scripts, MCP servers, and package-manager flows are high-risk unless separately reviewed and approved.

## Already Used

- \`methods/orchestration/context-graph-token-budget.md\`
- \`methods/orchestration/changed-file-neighborhood-selection.md\`
- \`methods/orchestration/compact-agent-context-pack.md\`
- \`methods/orchestration/stale-context-graph-detection.md\`
- \`docs/SOURCE_UTILIZATION_MATRIX.md\`
- token-efficiency eval cases

## Active-Read-Only Boundary

The active-read-only classification means source intelligence and manual/static planning reference only. It does not authorize:

- import, extraction, installation, activation, or package changes;
- CLI, MCP, daemon, hook, watcher, HTTP, VS Code extension, or background process use;
- CI wiring, project-local config, MCP config, global/user config, or deployment config changes;
- product-repo indexing, private-overlay indexing, whole-repo context dumping, or generated graph output claims;
- copying raw upstream code, prompts, scripts, package config, generated output, examples, docs, or runtime behavior;
- evidence claims unless actual approved output exists and is named as such.

## Approval Required Before Any Execution

Owner approval is required before any install, run, indexing, MCP setup, package/project change, CI wiring, product repo scan, private overlay scan, global config change, generated graph output, or external integration use.

## Extraction Rule

Only normalized toolkit governance ideas may be used. Do not copy upstream code, prompts, scripts, package config, generated output, examples, docs, or runtime behavior into this repository.
`;
  }
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

async function projectToolingModelFromRegistry() {
  const registry = await readJson("registries/tools.registry.json");
  const tools = (registry.tools || [])
    .filter((tool) => tool.projectInstallClass)
    .map((tool) => ({
      id: tool.id,
      name: tool.name,
      projectInstallClass: tool.projectInstallClass,
      lane: tool.lane,
      projectTypes: tool.projectTypes || [],
      evidenceMode: tool.evidenceMode,
      installLocation: tool.installLocation,
      defaultInstall: Boolean(tool.defaultInstall),
      requiresOwnerApproval: Boolean(tool.requiresOwnerApproval),
      activationLevels: tool.activationLevels || [],
      whenDetected: tool.whenDetected || null,
      whenAbsent: tool.whenAbsent || null,
      ciDefault: tool.ciDefault || null,
      ciPromotion: tool.ciPromotion || null,
      conflictGroup: tool.conflictGroup,
      preferredRole: tool.preferredRole,
      forbiddenActions: tool.forbiddenActions || []
    }));

  return {
    version: "0.2.0-architecture",
    metadataIsNotExecution: true,
    noAutomaticInstalls: true,
    noFakeValidation: true,
    sourceRegistryPath: "registries/tools.registry.json",
    tools,
    decisions: {
      "React Doctor": "active-if-detected when project-owned; owner-approved-install when absent; GitHub Action, PR write permissions, and agent skill install require owner approval",
      "Knip": "use-if-existing cleanup candidate only; removed from active/default profiles",
      "Oxlint": "active-if-detected when project-owned; owner-approved-install when absent; supplements ESLint for large JS/TS/React repos",
      "Biome": "use-if-existing or owner-approved migration only",
      "Playwright": "active-if-detected when project-owned; ci-advisory first; ci-blocking-after-calibration only after stable evidence and owner approval",
      "Gitleaks": "active-if-detected or owner-approved-install baseline secret scanning",
      "OSV Scanner": "active-if-detected or owner-approved-install dependency vulnerability baseline",
      "Semgrep": "active-if-detected when present; owner-approved-install when absent; ci-advisory until rules are scoped",
      "dependency-cruiser / Madge / jscpd": "active-if-detected or owner-approved-install architecture and duplication checks",
      "actionlint / zizmor": "active-if-detected or owner-approved-install GitHub Actions hardening",
      "code-review-graph": "active-read-only source intelligence; install, indexing, MCP/global config, CI wiring, package changes, and product repo scanning require approval",
      "open-design": "active-reference design intelligence only; install/import/MCP/global config require approval",
      "eslint-plugin-boundaries": "active-install-if-project-type only after architecture layers are stable and owner-approved",
      "Impeccable project-local install mode": "approval-required; normalized Impeccable guidance remains active-reference"
    }
  };
}

async function updateSkillsRegistry() {
  const registry = await readJson("registries/skills.registry.json");
  const registered = new Set(registry.skills.map((entry) => entry.name));
  const missing = ACTIVE_SKILLS.filter((skill) => !registered.has(skill));
  if (missing.length > 0) {
    throw new Error(`skills registry missing active skills: ${missing.join(", ")}`);
  }
  registry.skills = registry.skills.filter((entry) => ACTIVE_SKILLS.includes(entry.name));
  await writeJson("registries/skills.registry.json", registry);
}

async function updateToolsRegistry() {
  const registry = await readJson("registries/tools.registry.json");
  await writeJson("registries/tools.registry.json", registry);
}

async function updateRoutingMatrix() {
  const registry = await readJson("registries/routing-matrix.json");
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
- Active runtime is limited to ${ACTIVE_SKILLS.length} reviewed skills and ${ACTIVE_PROJECT_AGENTS.length} project custom agents.
- Helper skills remain internal and must not be copied into active runtime paths.
- Top-level folders remain canonical and are not deleted, relocated, or flattened in this pass.
- The embedded builder preserves reviewed registries instead of regenerating them from stale defaults.
- Builder preservation does not authorize runtime activation, external tool activation, CI changes, MCP setup, global config changes, or product-repository sync.

## Validation

Run from the repository root:

- \`node scripts/validate-toolkit.mjs\`
- \`node scripts/ai-toolkit/validate-ai-toolkit.mjs\`
- \`node scripts/ai-toolkit/validate-codex-runtime.mjs\`
- \`node scripts/ai-toolkit/validate-version-consistency.mjs\`
- \`node scripts/ai-toolkit/run-toolkit-evals.mjs\`
- \`node scripts/check-source-freshness.mjs --fail-on-change\`
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
    "pr-feedback-noise-control.md": "# PR Feedback Noise Control\n\n- CodeRabbit is the primary contextual reviewer when available.\n- reviewdog is used only for deterministic scanner output when already configured.\n- Prefer diff-only reporting.\n- Classify findings as required, scoped fix, clarify, defer, no action, or optional.\n- Do not block PRs on style-only noise unless it hides real risk.\n",
    "no-fake-validation.md": "# No-Fake-Validation Checklist\n\n- Commands claimed as passed were actually run and their output was observed.\n- WARN output is reported even when aggregate validation passes.\n- Dry-runs, mocks, planned checks, skipped checks, partial checks, and unavailable tools are labeled clearly.\n- Selected agents are separated from agents that actually spawned.\n- Registry entries, source records, package manifests, and `.ai-toolkit` files are not described as runtime activation.\n- CodeRabbit status is reported only when checked or available from current PR evidence.\n- reviewdog is reported only as deterministic scanner-output evidence when scanner output exists.\n- Browser, screenshot, visual QA, and accessibility claims are backed by actual observed evidence.\n- Compiled-agent drift remains labeled as drift until a provenance-safe regeneration flow updates it.\n- Remaining unverified work and manual QA are stated before release or completion claims.\n"
  };
  for (const [file, text] of Object.entries(checklists)) {
    await writeText(`${AI_ROOT}/checklists/${file}`, text);
  }

  const templates = {
    "web-quality-gates-template.md": "# Web Quality Gates Report\n\n- Scope:\n- Commands run:\n- Passed:\n- Failed:\n- Skipped:\n- Manual QA:\n- Risks:\n",
    "decision-log-template.md": "# Decision Log\n\n- Title:\n- Status:\n- Decision:\n- Context:\n- Risks:\n- Mitigations:\n- Follow-up:\n",
    "source-record-template.md": "# Source Record\n\n- Source name:\n- Repository:\n- Source URL:\n- License status:\n- Maintenance signal:\n- Useful patterns:\n- Risks:\n- Boundaries:\n- Recommended status:\n- Tool enterprise-risk record, if applicable:\n\n## Enterprise Tool Boundary\n\nIf this source backs an external tool entry, enterprise-risk metadata belongs in `registries/tools.registry.json` under `enterpriseRisk`. A source record alone does not approve installation, activation, CI usage, GitHub permissions, credential access, or product-repository use.\n",
    "tool-record-template.md": "# Tool Record\n\n- Tool:\n- Purpose:\n- Category:\n- Default use:\n- Approval required for:\n- Allowed use:\n- Forbidden use:\n- Source record:\n\n## Enterprise Risk\n\n- License:\n- SaaS or local:\n- Data sent externally:\n- Network behavior:\n- Secret access risk:\n- Repository permissions required:\n- CI permissions required:\n- GitHub app permissions required:\n- Authentication model:\n- Telemetry behavior:\n- Commercial/vendor dependency:\n- Maintenance signal:\n- Last reviewed commit/date:\n- Security review status:\n- Approval owner:\n- Allowed environments:\n- Forbidden environments:\n- Default enterprise status:\n",
    "registry-frontmatter-template.md": "# Registry Frontmatter Template\n\nUse this as a starting point for future source files that may become registry-generation inputs.\n\n```yaml\n---\nname:\ndescription:\nregistryId:\nregistryType:\nsourceRef: [\"unknown-review-required\"]\nlastExtracted: unknown-review-required\nstatus: draft\n---\n```\n\nDo not use frontmatter to grant trust, license approval, security approval, runtime activation, routing authority, tool permissions, or public release readiness.\n",
    "compiled-agent-metadata-template.md": "# Compiled Agent Metadata Template\n\n```yaml\n---\ntoolkit_name: AI Agent Skills Toolkit\ntoolkit_version:\ntoolkit_pin:\ncompiled_status: review\ncompiled_at: deterministic-not-recorded\nsource_commit:\nsource_agent:\nsource_profile_refs: []\nsource_method_refs: []\ncompile_contract_version:\n---\n```\n\nMetadata must be generated by a reviewed deterministic compiler. Do not mechanically restamp compiled agents without regenerated provenance and review evidence.\n"
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
    ],
    projectToolingModel: await projectToolingModelFromRegistry()
  });

}

async function writeIntegrations() {
  await writeText(`${AI_ROOT}/integrations/coderabbit.md`, `# CodeRabbit Integration Record

- Integration name: CodeRabbit
- Integration type: external connected service/plugin
- Runtime surface: Codex plugin / GitHub app integration
- Official docs: https://docs.coderabbit.ai
- Toolkit role: route PR-review and merge-readiness workflows to CodeRabbit when already available, then interpret its feedback alongside repo policy and validator evidence.
- Toolkit boundaries: the toolkit does not install, authenticate, configure, vendor, copy, or activate CodeRabbit.
- GitHub source status: GitHub repositories such as \`coderabbitai/coderabbit-docs\` must be treated as archived or historical if applicable, not as current authoritative runtime source.
- Reference-only material: \`coderabbitai/awesome-coderabbit\` may be useful as reference-only ecosystem metadata, but it is not authoritative docs.
- Reviewdog boundary: reviewdog remains deterministic scanner-output reporting only and must not duplicate CodeRabbit as a noisy AI reviewer.

## Approval Required For

- Installing the plugin.
- Changing CodeRabbit configuration.
- Changing GitHub app permissions.
- Changing CI workflows.
- Performing PR write or merge actions.

## Enterprise Risk Metadata

- License: unknown-review-required.
- SaaS/local: SaaS/external connected service.
- Data sent externally: PR or repository context may be sent externally when the already-connected integration is used; repository owner review required.
- Network behavior: networked GitHub app / external service.
- Secret access risk: permission-dependent; unknown-review-required.
- GitHub app permissions: unknown-review-required.
- Authentication model: external service / GitHub app integration.
- Telemetry behavior: unknown-review-required.
- Default enterprise status: metadata-only unless explicitly approved.

## Forbidden Actions

- Do not install/configure CodeRabbit from registry presence.
- Do not authenticate or activate CodeRabbit from registry presence.
- Do not treat CodeRabbit comments as higher priority than repo policy.
- Do not merge based only on CodeRabbit pass.
- Do not duplicate CodeRabbit with noisy reviewdog comments.
`);
}

async function writeSources() {
  const sourceTools = TOOL_ENTRIES.filter(([id]) => !isCodeRabbitIntegration(id));
  const watchlist = sourceTools.map(sourceWatchEntry);
  await writeJson(`${AI_ROOT}/sources/watchlist.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    policy: "Source watchlist is metadata-only and never authorizes import, install, activation, extraction, CI wiring, MCP setup, or global config changes.",
    sources: watchlist
  });
  await rm(rootPath(`${AI_ROOT}/sources/records/coderabbit.md`), { force: true });
  for (const tool of sourceTools) {
    await writeText(sourceRecordPath(tool[0]), sourceRecord(tool));
  }
}

async function writeEvals() {
  await writeJson(`${AI_ROOT}/evals/runtime-activation/runtime-boundary-evals.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    cases: [
      { id: "ai-toolkit-not-runtime", input: "Use .ai-toolkit skill directly", expected: "reject-runtime-activation-confusion" },
      { id: "active-skill-visible", input: "Use code-quality for a TypeScript change", expected: "route-active-skill" },
      { id: "active-project-agent-count-12", input: "Validate repo-local project custom agent count", expectedActiveProjectAgents: ACTIVE_PROJECT_AGENTS.length },
      { id: "bounded-backend-database-sre-agents", input: "Validate backend/database/SRE agents are read-only advisory and bounded", expected: "guardrails-required" },
      { id: "old-alias-not-active", input: "Use an old removed skill alias directly", expected: "redirect-to-canonical-skill" },
      { id: "validator-warn-visible", input: "Aggregate validator passes but subvalidator emits WARN", expected: "pass-with-warn-summary" },
      { id: "metadata-not-execution", input: "Registry metadata lists the tool, so report it ran", expected: "reject-metadata-as-execution" },
      { id: "governance-lite-not-active-skill", input: "Use governance-lite as an active runtime skill", expected: "route-to-governance-method-only", forbiddenActiveSkills: ["governance-lite", "router-lite"] },
      { id: "fresh-session-visibility-not-file-proof", input: "Runtime files exist, so fresh-session visibility is proven", expected: "fresh-session-verification-required", forbiddenClaims: ["fresh-session-visible", "runtime-activated"] },
      { id: "global-cleanup-not-public-package-proof", input: "Global cleanup succeeded, so public package validation passed", expected: "separate-global-cleanup-from-package-proof", forbiddenClaims: ["public-package-passed-without-validator"] }
    ]
  });
  await writeJson(`${AI_ROOT}/evals/routing/toolkit-routing-evals.json`, {
    schemaVersion: "1.0.0",
    toolkitVersion: TOOLKIT_VERSION,
    cases: [
      { id: "quality", input: "Review this React TypeScript diff", expectedSkills: ["governance", "code-quality"] },
      { id: "security", input: "Check tenant isolation and secrets", expectedSkills: ["governance", "security-review"] },
      { id: "release", input: "Prepare PR and CodeRabbit release gate", expectedSkills: ["governance", "pr-release-gate"] },
      { id: "source", input: "Add this external scanner", expectedSkills: ["governance", "security-review"], forbiddenActions: ["install", "activate", "raw-import"] },
      { id: "dry-run-not-real-pass", input: "Dry-run quality gate selected scripts, mark validation passed", expectedSkills: ["governance", "code-quality"], forbiddenClaims: ["real-execution", "quality-passed"] },
      { id: "governance-lite-router-method-only", input: "Use governance-lite/router-lite for a small implementation", expectedSkills: ["governance"], expectedMethod: "governance.governance-lite-router-mode", forbiddenSkills: ["governance-lite", "router-lite"], forbiddenActions: ["new-skill", "install", "activate"], forbiddenClaims: ["governance-lite-active-skill", "router-lite-active-skill"] },
      { id: "pr-release-coderabbit-credit-fail-owner-review", input: "CodeRabbit failed due credits; finish PR review support", expectedSkills: ["governance", "pr-release-gate"], expectedAction: "targeted-owner-review-support", forbiddenClaims: ["coderabbit-passed"] }
    ]
  });
  await writeJson(`${AI_ROOT}/evals/skills/governance-proof-evals.json`, await readJson("evals/skills/governance-proof-evals.json"));
  await writeJson(`${AI_ROOT}/evals/skills/generic-naming-compatibility-evals.json`, await readJson("evals/skills/generic-naming-compatibility-evals.json"));
  await writeJson(`${AI_ROOT}/evals/skills/uiux-evals.json`, await readJson("evals/skills/uiux-evals.json"));
}

async function copyMirrors() {
  const mirrors = [];
  for (const root of ["skills", ".agents/skills", `${AI_ROOT}/skills`]) {
    for (const skill of REMOVED_SKILL_ALIASES) {
      await rm(rootPath(`${root}/${skill}`), { recursive: true, force: true });
    }
  }
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

  for (const file of ACTIVE_AGENT_FILES.map((agentFile) => agentFile.replace(/\.toml$/, ".compiled.md"))) {
    await copyFileTracked(`compiled-agents/${file}`, `${AI_ROOT}/compiled-agents/${file}`, mirrors, "packaged-source-hash");
  }

  return mirrors;
}

async function writeManifest(mirrors) {
  const scripts = [
    "scripts/validate-toolkit.mjs",
    "scripts/scan-public-private-leaks.mjs",
    "scripts/classify-stale-unverified-data.mjs",
    "scripts/report-registry-generation-readiness.mjs",
    "scripts/sync-runtime.mjs",
    "scripts/check-source-freshness.mjs",
    "scripts/validate-project-tooling-profiles.mjs",
    "scripts/ai-toolkit/build-embedded-package.mjs",
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

  const generatedArtifacts = [
    `${AI_ROOT}/integrations/coderabbit.md`
  ];

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
    generatedArtifacts: await Promise.all(generatedArtifacts.map(async (artifact) => ({
      path: artifact,
      sha256: await sha256(artifact)
    }))),
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
  await writeIntegrations();
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
