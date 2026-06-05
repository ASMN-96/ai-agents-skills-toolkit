# Tool Lane Architecture

This document defines the v0.2 project tooling lane model. The lanes guide which agents, skills, methods, references, and tools should be considered for a target project. Lane selection is metadata and routing only. It does not install tools, run tools, edit package files, wire CI, configure MCP, change global config, or touch product repositories.

## Final Lane Model

### 1. Governance, Planning, Source of Truth

- Purpose: establish scope, source of truth, branch discipline, validation honesty, owner decisions, and stop conditions before project changes.
- Owning agents/skills: governance, product-agent, architect-agent, reviewer-agent, release-manager-agent, skill-scout-agent.
- Resources/tools: AGENTS.md, README.md, docs/NO_FAKE_VALIDATION_POLICY.md, docs/REAL_PROJECT_READINESS.md, docs/PROJECT_TOOLING_OPERATING_MODEL.md, methods/governance/task-intake-routing-gate.md, GSD and Superpowers as external-only discipline tools.
- Governance-lite/router-lite posture: `methods/governance/governance-lite-router-mode.md` may be used as concise routing metadata through the existing governance skill. It is not a sixth skill and does not install, activate, configure, or execute anything.
- GSD-style discipline posture: active governance discipline/reference only when already available; no install, vendoring, package change, global config, or runtime activation without approval.
- Install posture: external-only or metadata-only; no project install from toolkit registry presence.
- Evidence required: branch, working tree, source-of-truth files read, selected profile, commands actually run, skipped checks, WARN output, owner decisions.
- Stop conditions: dirty or wrong branch, missing owner approval for package/CI/MCP/global/product changes, validation claims without output, source/license uncertainty, destructive command risk.
- When to call the lane: every serious implementation, PR, release, migration, external-source review, package-manager change, or unsafe-command decision.
- When not to call the lane: trivial one-off answers where repository state and release posture do not matter.

### 2. UI/UX Design Intelligence and Browser Evidence

- Purpose: convert product intent into concrete design acceptance criteria and verify rendered quality with browser evidence.
- Owning agents/skills: uiux, uiux-agent, frontend-agent, qa-test-agent, reviewer-agent.
- Resources/tools: UI UX Pro Max as internal premium rubric; Impeccable as primary external UI/UX design intelligence reference; shadcn/ui as design-system and component pattern reference only; Addy Osmani UI/web quality methods; Anthropic UI/frontend guidance as restricted normalized guidance only; toolkit-owned commercial dashboard polish rubric; Uncodixfy anti-generic AI UI guidance; VoltAgent design-context references if already tracked; Playwright, Axe Playwright, and Lighthouse CI as evidence tools.
- Install posture: UI/UX references are active-reference only. open-design is active-reference. Playwright is `active-if-detected` when project-owned, `owner-approved-install` when absent, `ci-advisory` first, and `ci-blocking-after-calibration` only after stable evidence and approval. Axe Playwright and Lighthouse CI are active-install-if-project-type. Impeccable project-local install is approval-required. shadcn/ui is not a default CLI/component import path.
- Evidence required: acceptance criteria, screenshots or browser observations when claimed, viewport/state/accessibility coverage, actual Playwright/Axe/Lighthouse output when reported.
- Stop conditions: unclear design criteria, unapproved external design source, raw prompt/source copying risk, CLI/component import request without approval, browser evidence unavailable while browser readiness is being claimed.
- When to call the lane: UI polish, dashboard, workflow, responsive, accessibility, mobile visual behavior, public web, design-system, and browser-visible quality tasks.
- When not to call the lane: backend-only, security-only, release-only, package-only, CI-only, or database-only changes.
- Mandatory exclusions: Base UI and Figma are removed from the v0.2 current-scope recommendation model. They are not harmful overlap as design concepts, but they are not recommended active resources here.

### 3. Frontend Coding and React Quality

- Purpose: keep React, TypeScript, hooks, tests, and UI code quality grounded in project-owned executable checks.
- Owning agents/skills: code-quality, frontend-agent, reviewer-agent, qa-test-agent.
- Resources/tools: TypeScript/typecheck, ESLint, typescript-eslint, eslint-plugin-react-hooks, Vitest, Testing Library, Playwright, React Doctor, Oxlint, Biome, Knip.
- Install posture: TypeScript, ESLint, typescript-eslint, eslint-plugin-react-hooks, Vitest, Testing Library, and serious-app Playwright remain recommendation metadata for relevant projects. React Doctor is `active-if-detected` when project-owned and `owner-approved-install` when absent; GitHub Action, PR writes, and agent skill install remain approval-required. Oxlint is `active-if-detected` or `owner-approved-install` for large JS/TS/React acceleration. Biome is use-if-existing or owner-approved migration only. Knip is use-if-existing cleanup/archive only and removed from active/default profiles.
- Evidence required: project-owned typecheck/lint/test/build output, React Doctor output only when actually run, Playwright output only when actually run, clear skipped/unavailable labels.
- Stop conditions: missing owner approval for new dependencies or package-manager change, ESLint/Biome/Oxlint conflict unresolved, scanner output being treated as architecture authority, unverified React quality claim.
- When to call the lane: React/TypeScript implementation, hook changes, frontend tests, build quality, AI-generated code review, large repo lint acceleration.
- When not to call the lane: security-only review, backend-only contract review, package-manager migration without separate approval.

### 4. Backend, Security, Data Safety

- Purpose: protect trust boundaries, auth, authorization, public/private payloads, secrets, dependencies, containers, IaC, and data safety.
- Owning agents/skills: security-review, security-agent, backend-contract-agent, database-rls-agent, reviewer-agent.
- Resources/tools: Gitleaks, OSV Scanner, Semgrep, CodeQL, Trivy, Checkov, Socket, TruffleHog, OWASP ZAP baseline, Harden-Runner.
- Install posture: Gitleaks and OSV Scanner are `active-if-detected` or `owner-approved-install` baseline security tools. Semgrep is `active-if-detected` when project rules/config exist and `owner-approved-install` when absent; start as `ci-advisory` until rules are scoped. CodeQL is use-if-existing/platform code scanning. Trivy is active-install-if-project-type when containers/IaC/SBOM exist. Checkov is active-install-if-project-type when IaC/cloud config exists. Socket, TruffleHog, OWASP ZAP, Harden-Runner, and deep networked scans are approval-required.
- Evidence required: actual scanner output when claimed, affected auth/data boundaries, dependency/container/IaC scope, skipped deep-scan rationale, owner approval for approval-required tools.
- Stop conditions: possible secret exposure, unclear auth boundary, public/private payload uncertainty, tenant isolation risk, production-impacting scan request, deep tool approval missing.
- When to call the lane: auth, security, secrets, dependency risk, public payloads, tenant data, API trust boundaries, WebView native bridge risk, IaC/container risk.
- When not to call the lane: style-only UI changes with no data/security impact.

### 5. Mobile, WebView, and Cross-Surface Contracts

- Purpose: handle mobile-native quality, WebView boundaries, and API/client contract compatibility across web, mobile, backend, and release surfaces.
- Owning agents/skills: uiux, code-quality, security-review, backend-contract-agent, database-rls-agent, qa-test-agent, sre-performance-agent.
- Resources/tools: methods/mobile/native-mobile-app-quality.md, methods/security/webview-boundary-review.md, methods/architecture/cross-surface-client-contracts.md, Playwright for web surfaces, release-like mobile build evidence when available.
- Install posture: method-led by default; tools are project-specific and owner-approved where not already present.
- Evidence required: affected consumers, platform validation evidence, simulator/device/build mode, WebView allowlist and bridge review, API compatibility checks, contract tests or documented gaps.
- Stop conditions: auth boundary unclear, WebView origin or bridge risk unresolved, breaking API change without approval, mobile validation not performed but mobile readiness claimed.
- When to call the lane: native mobile, Expo/mobile web, WebView, deep links, cross-surface API, shared schemas, mobile release readiness.
- When not to call the lane: web-only backend or UI changes with no mobile/WebView/API consumer impact.

### 6. Architecture, Repo Intelligence, and Token Context

- Purpose: harden module boundaries, dependency flow, duplication risk, circular dependency risk, and context selection for large-agent work.
- Owning agents/skills: governance, architect-agent, reviewer-agent, sre-performance-agent, code-quality.
- Resources/tools: dependency-cruiser as first architecture hardening tool, Madge for circular dependency risk, eslint-plugin-boundaries only after layers are stable and owner-approved, jscpd for duplication detection, code-review-graph active-read-only source intelligence, context graph/token-budget methods.
- Install posture: dependency-cruiser, Madge, and jscpd are `active-if-detected` when project-owned and `owner-approved-install` when absent. eslint-plugin-boundaries is active-install-if-project-type only after layers are stable and owner-approved. code-review-graph is active-read-only with no MCP/global config/product indexing or scanning by default.
- Evidence required: architecture map, affected boundaries, actual tool output if run, changed-file neighborhood, token/context compacting decisions.
- Stop conditions: whole-repo dump request, private-overlay exposure, unstable layers for eslint-plugin-boundaries, tool-generated graph claimed without output, indexing/global/MCP request without approval.
- When to call the lane: architecture hardening, module boundary issues, large repo context planning, circular dependency suspicion, duplication hardening.
- When not to call the lane: small local edits where existing tests and review are sufficient.

### 7. Review, PR Feedback, and Release Evidence

- Purpose: combine deterministic check output, human/agent review, PR status, release risk, and post-merge verification without duplicate merge authorities.
- Owning agents/skills: reviewer-agent, qa-test-agent, release-manager-agent, pr-release-gate.
- Resources/tools: CodeRabbit if already connected, reviewdog for deterministic scanner-output reporting only, GitHub CLI as external/local operator tool, project-owned checks, release templates.
- Install posture: CodeRabbit and GitHub CLI are external-only/use-if-existing operator resources. reviewdog is use-if-existing and must not duplicate CodeRabbit AI review.
- Evidence required: branch/PR/check status, review comments, actual scanner output before reviewdog reporting, validation outputs, WARN/skipped checks, merge and rollback posture.
- Stop conditions: required checks failing, review comments unresolved, duplicate PR-comment path, CodeRabbit/reviewdog treated as merge authority, release claim without validation output.
- When to call the lane: PR prep, review comments, merge readiness, release gates, post-merge verification, deterministic scanner-output publication.
- When not to call the lane: local draft work with no PR/release decision.

### 8. External Source Safety and Skill Scouting

- Purpose: review external repositories, tools, plugins, skills, design references, and methods before they influence active toolkit or project behavior.
- Owning agents/skills: skill-scout-agent, security-agent, governance, security-review, reviewer-agent.
- Resources/tools: sources/source-watchlist.json, docs/EXTERNAL_SOURCE_FRESHNESS_POLICY.md, docs/SOURCE_FRESHNESS_REPORT.md, methods/internal/source-safety-scoring.md, checklists/prompt-injection-review.md.
- Install posture: metadata-only unless separately approved. External sources are never active automatically.
- Evidence required: source identity, license/trust/maintenance review, prompt-injection screen, dangerous command check, secret/network behavior review, explicit import/install/activation/extraction decision.
- Stop conditions: license uncertainty, dangerous scripts, prompt-injection instructions, secret access, global config/MCP/package/CI/product-repo write request, raw source copy request.
- When to call the lane: any new external source, source freshness drift, tool adoption, skill scouting, design reference adoption.
- When not to call the lane: internally authored docs with no external source dependency.

## Global Lane Rules

- Metadata is not execution.
- Normal-language tasks enter through the task-intake routing gate before coding.
- Governance-lite/router-lite remains method/profile/routing metadata only; runtime stays at the approved canonical skill count.
- Project-owned checks come first.
- Project-owned tools may be recommended as `active-if-detected` when safe for the approved scope.
- Missing tools remain `owner-approved-install`; package-manager detection is required before command recommendations.
- CI starts as `ci-advisory` for noisy or newly adopted tools and becomes `ci-blocking-after-calibration` only with stable evidence and owner approval.
- RuFlo-style concepts are `static-adopted`; task-state and handoff discipline are active in toolkit-owned methods, while hooks, memory, MCP, daemon, global config, watchers, and runtime persistence are `forbidden-runtime`.
- Registry presence does not install, activate, configure, or run tools.
- Selected or recommended tools must be reported separately from actually executed tools.
- Owner approval is required for new project installs, package-manager changes, CI changes, MCP/global config changes, deep scans, and permission-granting integrations.
- WARN output remains visible even when aggregate validators pass.
