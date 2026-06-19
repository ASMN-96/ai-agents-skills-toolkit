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
import { collectReferencedSupportAssets } from "./reference-closure.mjs";

const ROOT = process.cwd();
const AI_ROOT = ".ai-toolkit";
const REMOVED_SKILL_ALIASES = [
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
  "legacy-skill-governance"
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

async function walkFiles(relativeDir, output = []) {
  let entries;
  try {
    entries = await readdir(rootPath(relativeDir), { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const child = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) {
      await walkFiles(child, output);
    } else {
      output.push(child);
    }
  }
  return output.sort((left, right) => left.localeCompare(right));
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

function isRepomix(id) {
  return id === "repomix";
}

function isGsdCore(id) {
  return id === "gsd-core";
}

function isPlaywright(id) {
  return id === "playwright";
}

function enterpriseRiskMetadata(id) {
  const base = {
    license: "not-reviewed-owner-required",
    saasOrLocal: "not-reviewed-owner-required",
    dataSentExternally: "not-reviewed-owner-required",
    networkBehavior: "not-reviewed-owner-required",
    secretAccessRisk: "not-reviewed-owner-required",
    repositoryPermissionsRequired: "not-reviewed-owner-required",
    ciPermissionsRequired: "not-reviewed-owner-required",
    githubAppPermissionsRequired: "not-reviewed-owner-required",
    authenticationModel: "not-reviewed-owner-required",
    telemetryBehavior: "not-reviewed-owner-required",
    commercialVendorDependency: "not-reviewed-owner-required",
    maintenanceSignal: "not-reviewed-owner-required",
    lastReviewedCommit: "not-reviewed-owner-required",
    lastReviewedDate: "not-reviewed-owner-required",
    securityReviewStatus: "unreviewed-blocked",
    approvalOwner: "owner-decision-required",
    allowedEnvironments: ["metadata-only"],
    forbiddenEnvironments: ["local execution", "CI", "staging", "production", "global config", "MCP", "product repositories"],
    defaultEnterpriseStatus: "metadata-only; unreviewed-blocked; blocked from enterprise approval until owner review records evidence",
    reviewState: "unreviewed-blocked",
    reviewEvidence: "No current enterprise review evidence is recorded; registry presence is metadata-only and all execution/install environments remain blocked until owner review.",
    riskTier: "unknown-review-required",
    reviewedSource: "unknown-review-required",
    reviewedVersionOrCommit: "unknown-review-required",
    inspectedAreas: ["registry metadata only"],
    uninspectedAreas: ["license", "telemetry", "network behavior", "permission model", "runtime behavior", "maintenance signal"],
    riskRationale: "No current evidence-backed tool review is recorded beyond metadata presence.",
    nextReviewDue: "owner-review-required"
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
      forbiddenEnvironments: ["local execution", "CI", "staging", "production", "global config", "MCP", "product repositories", "install or configuration from registry presence", "credential changes", "permission changes", "merge authority by itself"],
      securityReviewStatus: "metadata-only-delegated-service-review-required",
      defaultEnterpriseStatus: "metadata-only; delegated service metadata only; owner review required before runtime integration, repository permission grant, or CI/PR write workflow",
      reviewState: "metadata-only-owner-review-required",
      reviewEvidence: "Delegated service metadata is recorded, but owner review is required before any runtime integration, repository permission grant, or CI/PR write workflow.",
      riskTier: "high",
      reviewedSource: "https://docs.coderabbit.ai",
      reviewedVersionOrCommit: "manual-doc-review-required",
      inspectedAreas: ["integration metadata", "toolkit boundary text"],
      uninspectedAreas: ["service configuration", "repository permissions", "telemetry", "data retention", "billing", "current GitHub app settings"],
      riskRationale: "External PR-review service may process repository and PR context; toolkit metadata cannot approve permissions or runtime use.",
      nextReviewDue: "before enabling or changing repository integration"
    };
  }

  if (isRepomix(id)) {
    return {
      ...base,
      license: "MIT signal at reviewed commit; not legal approval to copy raw upstream content",
      saasOrLocal: "local CLI/package if installed by project; metadata-only in toolkit",
      dataSentExternally: "none from toolkit metadata; unknown and approval-required if optional integrations or remote outputs are configured",
      networkBehavior: "metadata-only in toolkit; no network behavior approved from registry presence",
      secretAccessRisk: "high if run broadly; scoped packs must exclude secrets, .env values, private overlays, caches, and generated output",
      repositoryPermissionsRequired: "none from toolkit metadata; local repo read permissions only if separately approved or project-owned",
      ciPermissionsRequired: "none from toolkit metadata; CI wiring remains approval-required",
      githubAppPermissionsRequired: "none from toolkit metadata",
      authenticationModel: "none from toolkit metadata; optional external integrations are not approved",
      telemetryBehavior: "none approved or activated from toolkit metadata",
      commercialVendorDependency: "none for metadata-only posture; package/runtime use remains owner-approved or project-owned",
      maintenanceSignal: "active public repository at reviewed commit; not runtime-approved by toolkit metadata",
      lastReviewedCommit: "bb4ac4763faeb7fc3d31438f072a6946b5b290b9",
      lastReviewedDate: "2026-06-19",
      securityReviewStatus: "source-safety posture reviewed for optional scoped context packing; execution, install, package changes, CI, MCP, global config, and whole-repo dumps remain approval-required",
      approvalOwner: "project-owner-required-before-install-or-execution",
      allowedEnvironments: ["metadata-only", "project-owned detected local tool after scoped owner approval"],
      forbiddenEnvironments: ["automatic local execution", "CI", "staging", "production", "global config", "MCP", "whole-repo dumps", "product repositories", "product repositories without scoped owner approval"],
      defaultEnterpriseStatus: "metadata-only detection; scoped local context packing requires explicit owner approval even when project-owned or detected; not enterprise-approved for default execution, CI, MCP, package changes, global config, or whole-repo dumps",
      reviewState: "reviewed",
      reviewEvidence: "Repomix default branch bb4ac4763faeb7fc3d31438f072a6946b5b290b9 recorded as optional source reference; registry presence does not approve install or execution.",
      riskTier: "medium",
      reviewedSource: "https://github.com/yamadashy/repomix",
      reviewedVersionOrCommit: "bb4ac4763faeb7fc3d31438f072a6946b5b290b9",
      inspectedAreas: ["source identity", "optional context-packing posture", "toolkit boundaries"],
      uninspectedAreas: ["runtime execution", "package install behavior", "optional integrations", "telemetry", "CI behavior"],
      riskRationale: "Context packing can expose repository contents if run broadly, so execution remains scoped and owner-approved.",
      nextReviewDue: "2026-09-19"
    };
  }

  if (isGsdCore(id)) {
    return {
      ...base,
      license: "MIT signal at reviewed commit; not legal approval to copy raw upstream content",
      saasOrLocal: "local CLI/package if installed by project or operator; metadata-only in toolkit",
      dataSentExternally: "none from toolkit metadata; unknown and approval-required if runtime integrations or remote outputs are configured",
      networkBehavior: "metadata-only in toolkit; no network behavior approved from registry presence",
      secretAccessRisk: "high if invoked against broad project context; scope must exclude secrets, credentials, private overlays, and global config",
      repositoryPermissionsRequired: "none from toolkit metadata; local repo access only if separately approved or project-owned",
      ciPermissionsRequired: "none from toolkit metadata; CI wiring remains approval-required",
      githubAppPermissionsRequired: "none from toolkit metadata",
      authenticationModel: "none from toolkit metadata",
      telemetryBehavior: "none approved or activated from toolkit metadata",
      commercialVendorDependency: "none for metadata-only posture; package/runtime use remains owner-approved or project-owned",
      maintenanceSignal: "active public repository at reviewed commit; not runtime-approved by toolkit metadata",
      lastReviewedCommit: "7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034",
      lastReviewedDate: "2026-06-20",
      securityReviewStatus: "source identity and tool posture reviewed; execution, install, package changes, CI, MCP, global config, hooks, and project writes remain approval-required",
      approvalOwner: "project-owner-required-before-install-or-execution",
      allowedEnvironments: ["metadata-only", "project-owned detected local tool after scoped owner approval"],
      forbiddenEnvironments: ["local execution", "CI", "staging", "production", "global config", "MCP", "hooks", "product repositories"],
      defaultEnterpriseStatus: "metadata-only detection; GSD phase/state use requires existing project/operator ownership or explicit owner approval; not enterprise-approved for default execution, CI, MCP, hooks, package changes, global config, or project writes",
      reviewState: "reviewed",
      reviewEvidence: "GSD Core default branch next at 7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034 reviewed for v0.2.5 CODEOWNERS-only drift; registry presence does not approve install or execution.",
      riskTier: "medium",
      reviewedSource: "https://github.com/open-gsd/gsd-core",
      reviewedVersionOrCommit: "7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034",
      inspectedAreas: ["source identity", "repository relocation", "phase/state governance posture", "toolkit boundaries"],
      uninspectedAreas: ["runtime execution", "installer behavior", "hooks", "global config", "CI behavior", "telemetry"],
      riskRationale: "Workflow tooling can affect project state and planning artifacts; use remains active-if-detected or owner-approved.",
      nextReviewDue: "2026-09-20"
    };
  }

  if (isPlaywright(id)) {
    return {
      ...base,
      license: "Apache-2.0 signal at reviewed commit; not legal approval to copy raw upstream content",
      saasOrLocal: "local CLI/package if installed by project; metadata-only in toolkit",
      dataSentExternally: "none from toolkit metadata; browser artifacts may contain sensitive data if project-owned Playwright is run separately",
      networkBehavior: "metadata-only in toolkit; browser/network behavior is approval-required and project-owned when executed",
      secretAccessRisk: "high if browser traces, screenshots, storage, headers, or authenticated sessions are captured; no execution approved by toolkit metadata",
      repositoryPermissionsRequired: "none from toolkit metadata",
      ciPermissionsRequired: "none from toolkit metadata; CI wiring remains approval-required",
      githubAppPermissionsRequired: "none from toolkit metadata",
      authenticationModel: "none from toolkit metadata",
      telemetryBehavior: "unknown-review-required for runtime execution; no telemetry approved or activated from toolkit metadata",
      commercialVendorDependency: "unknown-review-required; no commercial/vendor approval recorded",
      maintenanceSignal: "public repository HEAD resolved by git ls-remote on 2026-06-20; v0.2.5 inspected source-freshness drift only, not runtime execution behavior",
      lastReviewedCommit: "32883517ffe7725ef45ac2dc020a63962c27d7a3",
      lastReviewedDate: "2026-06-20",
      securityReviewStatus: "metadata-only source identity reviewed; install, runtime execution, telemetry, network behavior, CI wiring, and enterprise use remain owner-review-required",
      approvalOwner: "quality-tool-owner-required",
      allowedEnvironments: ["metadata-only", "project-owned detected local tool after scoped owner approval"],
      forbiddenEnvironments: ["automatic local execution", "CI", "staging", "production", "global config", "MCP", "product repositories", "browser binary downloads", "trace/video/screenshot capture without artifact hygiene review"],
      defaultEnterpriseStatus: "metadata-only; source identity/current HEAD reviewed; not enterprise-approved for install, execution, CI, MCP, global config, or product-repository use",
      reviewState: "metadata-only-owner-review-required",
      reviewEvidence: "Reviewed source identity via git ls-remote and GitHub compare https://github.com/microsoft/playwright from 11797b0336d50ab0d8bc554f53fcd8d4aab8438e to 32883517ffe7725ef45ac2dc020a63962c27d7a3 on 2026-06-20; inspected changed-file metadata and commit messages for CI workflow, Vite/package metadata, and trace WebSocket artifact handling drift; did not inspect license legal approval, telemetry, runtime network behavior, package release contents, CI execution behavior, browser downloads, MCP execution, or project-specific permissions; next review due 2026-09-20.",
      riskTier: "medium",
      reviewedSource: "https://github.com/microsoft/playwright",
      reviewedVersionOrCommit: "32883517ffe7725ef45ac2dc020a63962c27d7a3",
      inspectedAreas: ["source repository identity", "current default branch HEAD", "GitHub compare metadata", "changed-file metadata", "commit messages", "registry posture", "toolkit forbidden-use boundaries"],
      uninspectedAreas: ["license legal approval", "telemetry behavior", "runtime network behavior", "package release contents", "CI execution behavior", "browser binary downloads", "MCP execution", "project-specific permissions"],
      riskRationale: "Browser automation can expose private sessions and artifacts if executed; toolkit posture remains metadata-only and delegates execution to project-owned tooling after approval.",
      nextReviewDue: "2026-09-20"
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
  if (isRepomix(id)) {
    return {
      ...entry,
      lastReviewedCommit: "bb4ac4763faeb7fc3d31438f072a6946b5b290b9",
      lastReviewedDate: "2026-06-19",
      licenseConcern: "clear",
      reviewPriority: "High",
      recommendedToolkitStatus: "active-if-detected",
      reviewDecision: {
        outcome: "SYNCED_REFERENCE",
        reviewedCommit: "bb4ac4763faeb7fc3d31438f072a6946b5b290b9",
        reviewedDate: "2026-06-19",
        summary: "Optional scoped context packing and token-count support retained only when project-owned or owner-approved; runtime execution remains approval-required.",
        boundaries: [
          "no default install",
          "no automatic execution",
          "no whole-repo dump",
          "no package edits",
          "no CI wiring",
          "no MCP setup",
          "no global config",
          "no secrets or private overlays",
          "no output claims without observed command output",
          "no raw upstream copying"
        ]
      }
    };
  }
  if (isGsdCore(id)) {
    return {
      ...entry,
      defaultBranch: "next",
      lastReviewedCommit: "7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034",
      lastReviewedDate: "2026-06-20",
      licenseConcern: "clear",
      reviewPriority: "High",
      recommendedToolkitStatus: "active-if-detected",
      reviewDecision: {
        outcome: "SYNCED_REFERENCE",
        reviewedCommit: "7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034",
        reviewedDate: "2026-06-20",
        summary: "GSD Core relocation and v0.2.5 CODEOWNERS-only drift reviewed; retained as first-class governed tool metadata without vendoring, install, or runtime activation.",
        boundaries: [
          "no vendoring",
          "no raw command or agent copying",
          "no installer execution",
          "no global configuration changes",
          "no package changes",
          "no CI wiring",
          "no MCP setup",
          "no hooks",
          "no product-repo changes",
          "no invocation claim without observed workflow output"
        ]
      }
    };
  }
  if (isPlaywright(id)) {
    return {
      ...entry,
      lastReviewedCommit: "32883517ffe7725ef45ac2dc020a63962c27d7a3",
      lastReviewedDate: "2026-06-20",
      licenseConcern: "clear",
      reviewPriority: "Medium",
      recommendedToolkitStatus: "delegated-existing",
      reviewDecision: {
        outcome: "SYNCED_PLUGIN_DELEGATED",
        reviewedCommit: "32883517ffe7725ef45ac2dc020a63962c27d7a3",
        reviewedDate: "2026-06-20",
        summary: "v0.2.5 read-only refresh reviewed CI workflow, Vite/package metadata, and trace WebSocket artifact handling drift; browser evidence remains delegated to project-owned Playwright/browser tooling.",
        boundaries: [
          "no source import",
          "no package update",
          "no browser binary download",
          "no CI update",
          "no runtime update",
          "no MCP activation",
          "no global config",
          "no product-repo changes"
        ]
      }
    };
  }
  return entry;
}

function sourceRecord([id, name, repository, homepage, category, purpose, status, defaultUse]) {
  if (isRepomix(id)) {
    return `# Repomix Source Record

- Source name: Repomix
- Repository: yamadashy/repomix
- Source URL: https://github.com/yamadashy/repomix
- Homepage: https://repomix.com
- Last reviewed commit: bb4ac4763faeb7fc3d31438f072a6946b5b290b9
- Last reviewed date: 2026-06-19
- Review level: optional-tool posture reference
- Classification: active-if-detected or owner-approved-install candidate for scoped context packing/token counts
- License status: MIT signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; not runtime-approved by toolkit metadata
- neverAutoImport: true

## Toolkit Value

Repomix is useful only as optional practical support for scoped context packs and token counts when the project already owns it or the owner explicitly approves execution. It is not a default dependency and not the primary design model.

## Active-If-Detected Boundary

- Detect project-owned Repomix config or dependency before recommending use.
- Use only scoped packs tied to selected files, directories, or task neighborhoods.
- Use token counts as measurement evidence only when actual output is observed.

## Forbidden By Default

- no install or activation from registry presence;
- no automatic whole-repo dumps;
- no package edits, CI wiring, MCP setup, global config, or product-repo scanning;
- no secrets, .env values, private overlays, generated build output, package caches, or user-local paths;
- no Repomix output claims without approved observed command output.
`;
  }
  if (isGsdCore(id)) {
    return `# GSD Core Source Record

- Source name: GSD Core
- Repository: open-gsd/gsd-core
- Source URL: https://github.com/open-gsd/gsd-core
- Homepage: https://github.com/open-gsd/gsd-core
- Last reviewed commit: 7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034
- Last reviewed date: 2026-06-20
- Review level: first-class governed tool metadata
- Classification: active-if-detected or owner-approved-install candidate for phase/state governance
- License status: MIT signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; default branch is next
- neverAutoImport: true

## Relocation Evidence

The previous GSD repository, gsd-build/get-shit-done, now points users to open-gsd/gsd-core as the active home. The toolkit tracks the new canonical repository only.

## Toolkit Value

GSD Core is useful as phase/state planning and execution discipline for serious multi-step governed work when already available in the operator or project environment, or when the owner approves installation.

## Active-If-Detected Boundary

- Detect project-owned or operator-owned GSD before recommending invocation.
- Report selected, invoked, blocked-unavailable, or manual fallback status honestly.
- Count workflow output as evidence only when observed in the current task.

## Forbidden By Default

- no vendoring or raw source copying;
- no install or activation from registry presence;
- no package edits, CI wiring, MCP setup, hooks, global config, or product-repo mutation;
- no GSD invocation claim without observed workflow output.
`;
  }
  if (isPlaywright(id)) {
    return `# Playwright Source Record

- Source name: Playwright
- Repository: microsoft/playwright
- Source URL: https://github.com/microsoft/playwright
- Homepage: https://playwright.dev
- Last reviewed commit: 32883517ffe7725ef45ac2dc020a63962c27d7a3
- Last reviewed date: 2026-06-20
- Review level: delegated browser-evidence source metadata
- Classification: delegated-existing / project-owned browser validation only
- License status: Apache-2.0 signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; not runtime-approved by toolkit metadata
- neverAutoImport: true

## Toolkit Value

Playwright is useful as a high-trust browser/runtime verification reference for screenshots, traces, videos, locators, cross-browser checks, and failure diagnostics when the project already owns Playwright or the owner explicitly approves installation.

## Freshness Review 2026-06-20

Read-only source-freshness review covered upstream movement from 11797b0336d50ab0d8bc554f53fcd8d4aab8438e to 32883517ffe7725ef45ac2dc020a63962c27d7a3 using git ls-remote and GitHub compare metadata only. The compare touched CI workflow files, Vite/package metadata, package-lock metadata, trace WebSocket artifact handling, and related tests.

Outcome: SYNCED_PLUGIN_DELEGATED.

## Forbidden By Default

- no raw upstream copying;
- no package or lockfile updates;
- no browser binary downloads;
- no CI wiring;
- no MCP activation;
- no runtime automation;
- no product-repo changes;
- no global configuration changes;
- no trace/video/screenshot artifact claims without observed project-owned execution and artifact hygiene review.
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
    version: "0.2.5-architecture",
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
      "GSD Core": "active-if-detected when project/operator-owned; owner-approved-install when absent; no invocation claim without observed workflow output",
      "Repomix": "metadata-only detection when project-owned; owner-approved-install or owner-approved execution required before scoped packs/token counts; no automatic whole-repo dumps",
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
    "compiled-agent-metadata-template.md": "# Compiled Agent Metadata Template\n\n```yaml\n---\ntoolkit_name: AI Agent Skills Toolkit\ntoolkit_version:\ntoolkit_pin:\ncompiled_status: review\ncompiled_at: deterministic-not-recorded\nsource_commit:\nsource_agent:\ncompiler: scripts/compile-agents.mjs\nregistry_input: registries/agents.registry.json\nsource_profile_refs: []\nsource_method_refs: []\ncompile_contract_version:\n---\n```\n\nMetadata must be generated by a reviewed deterministic compiler. Do not mechanically restamp compiled agents without regenerated provenance and review evidence.\n"
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
      { id: "global-cleanup-not-public-package-proof", input: "Global cleanup succeeded, so public package validation passed", expected: "separate-global-cleanup-from-package-proof", forbiddenClaims: ["public-package-passed-without-validator"] },
      { id: "native-visible-vs-compiled-fallback-separated", input: "The agent TOML is native-visible and the compiled fallback exists, so report that the agent spawned.", expected: "separate-native-visible-compiled-fallback-and-spawn-proof", forbiddenClaims: ["agent-spawned-from-file-presence", "native-visible-equals-executed", "compiled-fallback-equals-spawn-proof"] }
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
  await writeJson(`${AI_ROOT}/evals/routing/enterprise-governance-routing-evals.json`, await readJson("evals/routing/enterprise-governance-routing-evals.json"));
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

  await rm(rootPath(`${AI_ROOT}/templates`), { recursive: true, force: true });
  for (const file of await walkFiles("templates")) {
    await copyFileTracked(file, `${AI_ROOT}/${file}`, mirrors);
  }

  for (const file of await readdir(rootPath("registries"))) {
    if (file.endsWith(".json")) {
      await copyFileTracked(`registries/${file}`, `${AI_ROOT}/registries/${file}`, mirrors);
    }
  }

  for (const file of ACTIVE_AGENT_FILES.map((agentFile) => agentFile.replace(/\.toml$/, ".compiled.md"))) {
    await copyFileTracked(`compiled-agents/${file}`, `${AI_ROOT}/compiled-agents/${file}`, mirrors, "packaged-source-hash");
  }

  const registryFiles = (await readdir(rootPath("registries")))
    .filter((file) => file.endsWith(".json"))
    .map((file) => `registries/${file}`);
  const supportSeeds = [
    ...ACTIVE_SKILLS.map((skill) => `skills/${skill}/SKILL.md`),
    ...ACTIVE_AGENT_FILES.map((agentFile) => `agents/${agentFile.replace(/\.toml$/, ".md")}`),
    ...ACTIVE_AGENT_FILES.map((agentFile) => `compiled-agents/${agentFile.replace(/\.toml$/, ".compiled.md")}`),
    ...registryFiles,
    `${AI_ROOT}/tool-packs/webapp-quality-security.json`
  ];
  const supportAssets = collectReferencedSupportAssets({
    root: ROOT,
    seedFiles: supportSeeds,
    includeTransitive: true
  });
  for (const asset of supportAssets) {
    await copyFileTracked(asset.sourcePath, asset.destinationPath, mirrors, "packaged-support-asset");
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
    "scripts/ai-toolkit/reference-closure.mjs",
    "scripts/ai-toolkit/validate-ai-toolkit.mjs",
    "scripts/ai-toolkit/validate-reference-closure.mjs",
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
