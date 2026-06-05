# Tool Overlap Decisions

These decisions prevent duplicate blockers, conflicting lint/format authority, noisy PR feedback, and fake validation. They describe routing policy only.

## UI UX Pro Max vs Impeccable vs shadcn/ui vs Bencium vs Uncodixfy

- Default winner: UI UX Pro Max for internal acceptance criteria.
- Complementary tool: Impeccable for external design intelligence, shadcn/ui for component-pattern reference, Bencium for commercial/dashboard polish, Uncodixfy for anti-generic AI UI critique.
- Conflict rule: design references are not harmful overlap; raw copying, blind CLI import, and unmanaged design-system installs are blocked.
- When to activate: UI polish, dashboard, responsive, workflow, or browser-visible quality tasks.
- When to avoid: backend/security/release-only work or when no approved design source exists.
- Evidence requirement: criteria, screenshots/browser observations when claimed, and clear reference/source boundaries.

## ESLint vs Biome vs Oxlint

- Default winner: ESLint with typescript-eslint and React Hooks where relevant.
- Complementary tool: Oxlint for large-repo acceleration; Biome only when existing or owner-approved as a migration.
- Conflict rule: Biome must not silently replace ESLint/formatter ownership; Oxlint must not replace typed ESLint or hooks rules.
- When to activate: ESLint by default; Oxlint for large JS/TS/React repos; Biome when already project-owned or migration-approved.
- When to avoid: unapproved package/config changes, broad formatting churn, or duplicate lint blockers.
- Evidence requirement: actual lint output and explicit skipped/unavailable labels.

## React Doctor vs ESLint/React Hooks

- Default winner: ESLint/React Hooks for baseline React correctness.
- Complementary tool: React Doctor for React-specific smell, performance, architecture, accessibility, and AI-generated code risk.
- Conflict rule: React Doctor does not replace lint/type/test/build gates.
- When to activate: React projects with owner-approved project-local adoption or existing script.
- When to avoid: non-React projects or automation/PR writes without approval.
- Evidence requirement: React Doctor output only when actually run.

## Vitest vs Testing Library vs Playwright

- Default winner: Vitest for fast test execution.
- Complementary tool: Testing Library for component/user behavior; Playwright for browser/runtime evidence.
- Conflict rule: unit/component tests do not prove browser behavior; Playwright does not replace unit tests.
- When to activate: use Vitest/Testing Library for changed UI logic and Playwright for browser-visible workflows.
- When to avoid: backend-only changes or unavailable browser target without clearly reporting the gap.
- Evidence requirement: test output, browser output, screenshots/traces only when collected.

## Gitleaks vs TruffleHog

- Default winner: Gitleaks for baseline current-tree secret scanning.
- Complementary tool: TruffleHog for deeper secret scanning after approval.
- Conflict rule: deep history/networked scans require scope and approval.
- When to activate: Gitleaks for baseline; TruffleHog for approved deep review.
- When to avoid: unbounded secret scans or production-impacting access.
- Evidence requirement: scanner findings and current-tree blocker classification.

## OSV vs Socket

- Default winner: OSV Scanner for baseline dependency vulnerability checks.
- Complementary tool: Socket for approved supply-chain risk review.
- Conflict rule: Socket is approval-required and must not become default from metadata.
- When to activate: OSV for dependency manifests; Socket for security-sensitive owner-approved analysis.
- When to avoid: no dependency manifest or no approval.
- Evidence requirement: actual dependency scanner output.

## Semgrep vs CodeQL

- Default winner: project-owned Semgrep for security-sensitive repos when approved.
- Complementary tool: CodeQL if existing as platform code scanning.
- Conflict rule: do not duplicate findings into noisy blockers; use the project policy to decide authority.
- When to activate: Semgrep for targeted security rules; CodeQL when already enabled.
- When to avoid: style-only changes or unapproved scanner setup.
- Evidence requirement: actual scanner findings or alerts.

## Trivy vs Checkov

- Default winner: Trivy for container/image/SBOM-oriented risk.
- Complementary tool: Checkov for IaC/cloud configuration.
- Conflict rule: classify target surface before running either tool.
- When to activate: Trivy when Docker/container/IaC/SBOM exists; Checkov when IaC/cloud config exists.
- When to avoid: no matching project surface.
- Evidence requirement: tool output and target-surface inventory.

## Playwright vs Axe vs Lighthouse

- Default winner: Playwright for browser workflow evidence.
- Complementary tool: Axe for accessibility checks; Lighthouse for performance/public web quality.
- Conflict rule: each tool answers a different question and must not be reported as proof of the others.
- When to activate: Playwright for flows, Axe for accessibility, Lighthouse for performance-sensitive/public/mobile web.
- When to avoid: no browser target or backend-only scope.
- Evidence requirement: actual report, screenshots, traces, or documented unavailability.

## dependency-cruiser vs Madge vs eslint-plugin-boundaries vs code-review-graph

- Default winner: dependency-cruiser for architecture hardening.
- Complementary tool: Madge for circular dependency risk, jscpd for duplication, eslint-plugin-boundaries after layers stabilize and owner approval exists, code-review-graph as active-read-only source intelligence.
- Conflict rule: do not install graph/indexing/MCP/global tooling or scan product repos by default; do not enforce boundaries before layers are agreed.
- When to activate: architecture hardening, cycles, dependency boundaries, large-context planning.
- When to avoid: small local changes or unapproved indexing.
- Evidence requirement: tool output when run, architecture assumptions, and context-selection rationale.

## CodeRabbit vs reviewdog

- Default winner: CodeRabbit for external contextual AI PR review if already connected.
- Complementary tool: reviewdog for deterministic scanner-output transport only.
- Conflict rule: reviewdog must not duplicate CodeRabbit AI review or become merge authority.
- When to activate: CodeRabbit on connected PRs; reviewdog only after deterministic scanner output exists.
- When to avoid: no PR, no scanner output, or no owner approval for PR writes/config.
- Evidence requirement: PR comments/status and scanner output source.

## reviewer-agent vs CodeRabbit

- Default winner: reviewer-agent for toolkit policy, local diff reasoning, and readiness recommendations.
- Complementary tool: CodeRabbit as external contextual PR feedback if connected.
- Conflict rule: CodeRabbit does not outrank repository policy or human/owner decisions.
- When to activate: reviewer-agent for every review; CodeRabbit when connected and useful.
- When to avoid: installing/configuring CodeRabbit from toolkit metadata.
- Evidence requirement: review findings, PR comment links/status when observed.

## release-manager-agent vs GitHub CLI

- Default winner: release-manager-agent for release reasoning.
- Complementary tool: GitHub CLI for observed PR/check/merge command output.
- Conflict rule: GitHub CLI is an operator tool, not release authority.
- When to activate: release gate, checks, PR merge/post-merge verification.
- When to avoid: write/merge actions without explicit task or approval.
- Evidence requirement: exact command output and PR state.

## GSD vs governance skill

- Default winner: governance skill inside this toolkit.
- Complementary tool: GSD as external execution discipline when available.
- Conflict rule: do not duplicate or vendor GSD in the toolkit.
- When to activate: planning or execution discipline when the external plugin is already available.
- When to avoid: simple tasks or any request to install/activate from registry metadata.
- Evidence requirement: selected/not invoked status or actual observed tool output.

## Superpowers vs governance skill

- Default winner: governance skill for toolkit policy and source-of-truth enforcement.
- Complementary tool: Superpowers as external planning, debugging, TDD, and verification discipline.
- Conflict rule: do not duplicate Superpowers or treat it as project dependency.
- When to activate: complex implementation or validation loops when available and useful.
- When to avoid: package/global/plugin installation requests without approval.
- Evidence requirement: selected/not invoked status or actual observed tool output.
