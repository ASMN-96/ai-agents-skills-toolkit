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

## Activation Levels

v0.2.2 separates recommendation posture from execution posture:

- `active-reference`: guidance only; no execution.
- `active-if-detected`: if a target repo already owns the tool/config/script, Codex may recommend that project-owned path for the approved scope.
- `owner-approved-install`: the tool is valuable but absent; install/configuration requires explicit owner approval.
- `ci-advisory`: CI signal while rules, noise, artifacts, and false positives are calibrated.
- `ci-blocking-after-calibration`: release gate only after stable results and owner approval.
- `static-adopted`: static governance concepts are active in toolkit-owned methods; no runtime activation.
- `forbidden-runtime`: no runtime activation because of MCP, daemon, global, memory, watcher, persistence, or security conflict.

If a tool is already project-owned and safe for the task, prefer `active-if-detected`. If install/configuration is needed, use `owner-approved-install`. If CI may be noisy, start with `ci-advisory`. Promote to `ci-blocking-after-calibration` only after stable evidence and owner approval.

## Project Ownership

Every target project owns its package files, lockfiles, CI workflows, deployment config, MCP config, global configuration, and external service permissions. The toolkit may describe a recommended posture, but it must not edit those surfaces unless the target project owner separately approves a scoped task.

When a project already owns a tool, Codex may route to the project-owned script or documented local command as `active-if-detected`. When a tool is not already present, Codex may recommend `owner-approved-install` adoption but must not install, wire CI, grant permissions, or claim output. Package-manager detection must happen before recommending commands; npm is not the default.

## React Doctor

React Doctor is active-install-if-project-type for React projects. In the v0.2.2 activation overlay, it is `active-if-detected` when already project-owned and `owner-approved-install` when absent. That means it is a serious React-project recommendation, not pilot-only. However:

- project-local installation requires owner approval;
- GitHub Action setup requires owner approval;
- PR write permissions require owner approval;
- agent skill install or external activation requires owner approval;
- output counts only when the project-owned or approved command actually ran.

React Doctor complements ESLint, React Hooks, tests, and browser evidence. It does not replace project-owned lint, typecheck, Vitest, Testing Library, or Playwright checks.

## Oxlint, Biome, and Knip

Oxlint is `active-if-detected` for large JS/TS/React repositories and `owner-approved-install` when absent. It supplements ESLint and must not replace typed ESLint, React Hooks checks, or existing lint rules without owner approval.

Biome is use-if-existing or owner-approved migration only. Because Biome can change linting and formatting ownership, adopting it as a replacement requires a separate migration plan, owner approval, rollback path, and package-manager strategy.

Knip is not part of active full-power profiles. It is a use-if-existing cleanup candidate only. It must not drive broad deletion, dependency removal, or export cleanup unless the project already owns it and the cleanup scope is explicitly approved.

## Deep Tools and Approval

Socket, TruffleHog, OWASP ZAP baseline, Harden-Runner, deep networked scans, package-manager/workspace migrations, MCP/global config changes, and permission-granting integrations require explicit owner approval before execution or adoption. The approval must define target, scope, expected outputs, risks, and rollback.

## High-Value Tool Posture

- Playwright: `active-if-detected` when project-owned; `ci-advisory` first; `ci-blocking-after-calibration` only after stable browser evidence and owner approval.
- Gitleaks and OSV Scanner: `active-if-detected` or `owner-approved-install` as baseline security tools; do not claim findings without observed output.
- Semgrep: `active-if-detected` when rules/config exist; `owner-approved-install` when absent; `ci-advisory` until rules are scoped.
- dependency-cruiser, Madge, and jscpd: `active-if-detected` or `owner-approved-install` for architecture and duplication checks; output is evidence, not automatic refactor authority.
- actionlint and zizmor: `active-if-detected` or `owner-approved-install` for GitHub Actions hardening; no CI rewrite or permission change from metadata.
- GSD Core: first-class governed tool metadata; `active-if-detected` when already available and `owner-approved-install` when absent; no install, vendoring, package changes, CI, MCP, hooks, global config, or invocation claim without approval and observed workflow output.
- RuFlo-style concepts: `static-adopted`; task-state and handoff discipline are active in toolkit-owned methods, while memory hooks, MCP, daemon, global config, background processes, file watchers, runtime persistence, and package behavior are `forbidden-runtime`.

## Final Current-Scope Classifications

No final current-scope project-tooling resource may remain `pilot-only`. Project Context Preflight is toolkit-owned context guidance. Repomix is active-if-detected or owner-approved-install only for scoped packs/token counts, with no default install, whole-repo dump, package changes, CI wiring, MCP/global config, product repo scanning, or evidence claim without actual output. open-design is active-reference design intelligence only. eslint-plugin-boundaries is active-install-if-project-type only after architecture layers are stable and owner-approved. Impeccable project-local install mode is approval-required while normalized Impeccable guidance remains active-reference. Base UI and Figma are removed from current scope and must not appear as active/default recommendations.

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
