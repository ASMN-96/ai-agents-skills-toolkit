# Project Tooling Operating Model

This operating model explains how v0.2 project tooling recommendations work. It is intentionally conservative: the toolkit recommends and routes; target projects decide, install, execute, and own evidence.

## Core Rules

- Metadata is not execution.
- Registry presence is not installation.
- Tool selection is not tool output.
- Templates are suggestions only.
- Dry-run output is not an applied project change.
- Real evidence requires executable tools in the target project or target environment.
- Project-owned checks come first: use existing typecheck, lint, test, build, browser, scanner, and release scripts before recommending new tools.
- Installs are project-specific and require target project owner approval.
- No automatic install occurs from registry presence, profile selection, planner output, or template copying.
- No fake validation: Codex must not claim a tool passed unless that tool actually ran and produced current output.
- Selected/recommended tools must be reported separately from actually executed tools.
- External/global tools are not vendored into this toolkit.
- Approval-required tools need explicit approval and bounded scope before use.

## Project Ownership

Every target project owns its package files, lockfiles, CI workflows, deployment config, MCP config, global configuration, and external service permissions. The toolkit may describe a recommended posture, but it must not edit those surfaces unless the target project owner separately approves a scoped task.

When a project already owns a tool, Codex may route to the project-owned script or documented local command. When a tool is not already present, Codex may recommend adoption but must not install, wire CI, grant permissions, or claim output.

## React Doctor

React Doctor is active-install-if-project-type for React projects. That means it is a serious React-project recommendation, not pilot-only. However:

- project-local installation requires owner approval;
- GitHub Action setup requires owner approval;
- PR write permissions require owner approval;
- agent skill install or external activation requires owner approval;
- output counts only when the project-owned or approved command actually ran.

React Doctor complements ESLint, React Hooks, tests, and browser evidence. It does not replace project-owned lint, typecheck, Vitest, Testing Library, or Playwright checks.

## Oxlint, Biome, and Knip

Oxlint is active acceleration for large JS/TS/React repositories. It supplements ESLint and must not replace typed ESLint, React Hooks checks, or existing lint rules without owner approval.

Biome is use-if-existing or owner-approved migration only. Because Biome can change linting and formatting ownership, adopting it as a replacement requires a separate migration plan, owner approval, rollback path, and package-manager strategy.

Knip is not part of active full-power profiles. It is a use-if-existing cleanup candidate only. It must not drive broad deletion, dependency removal, or export cleanup unless the project already owns it and the cleanup scope is explicitly approved.

## Deep Tools and Approval

Socket, TruffleHog, OWASP ZAP baseline, Harden-Runner, deep networked scans, package-manager/workspace migrations, MCP/global config changes, and permission-granting integrations require explicit owner approval before execution or adoption. The approval must define target, scope, expected outputs, risks, and rollback.

## Final Current-Scope Classifications

No final current-scope project-tooling resource may remain `pilot-only`. code-review-graph is active-read-only source intelligence with no default install, indexing, MCP/global config, CI wiring, package changes, product repo scanning, or evidence claim without actual output. open-design is active-reference design intelligence only. eslint-plugin-boundaries is active-install-if-project-type only after architecture layers are stable and owner-approved. Impeccable project-local install mode is approval-required while normalized Impeccable guidance remains active-reference. Base UI and Figma are removed from current scope and must not appear as active/default recommendations.

## Task-Intake Routing

Normal-language tasks should pass through `methods/governance/task-intake-routing-gate.md` before coding. The front door classifies affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items so coding starts with explicit boundaries.

Governance-lite/router-lite is a concise method or mode only. It must route through the existing `governance` skill and `methods/governance/governance-lite-router-mode.md`; it must not become a sixth active skill, plugin, MCP server, package, global configuration, or runtime activation surface.

## Enterprise-Risk Metadata

Default-tool enterprise-risk review is recorded in `docs/DEFAULT_TOOL_ENTERPRISE_RISK_REVIEW.md`. Keep `unknown-review-required` wherever evidence is missing. Do not invent license, telemetry, data-flow, permission, scanner, or enterprise-readiness claims from default-install status.

## Rollback and Removal

Tooling templates must be reversible:

- apply templates into `.ai-toolkit/tooling/` only;
- do not edit package.json automatically;
- do not edit lockfiles automatically;
- do not wire CI automatically;
- do not configure MCP or global settings;
- record copied files and skipped existing files;
- remove copied template files to roll back template adoption.

Package-manager, formatting, CI, security scanner, or GitHub app changes require separate implementation PRs with explicit rollback notes.

## Reporting Boundaries

Completion reports must include:

- project type and selected profile;
- recommended tools;
- actually executed tools and exact command output;
- dry-run versus write status;
- missing scripts or unavailable tools;
- skipped checks and WARN output;
- owner approvals granted or missing;
- residual risk and next manual steps.
