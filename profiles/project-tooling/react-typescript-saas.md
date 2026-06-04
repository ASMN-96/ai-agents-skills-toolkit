# React TypeScript SaaS Project Tooling Profile

## Purpose

Provide a full-power but owner-controlled tooling posture for serious React/TypeScript SaaS web applications.

## Project Type

`react-typescript-saas`

## Default Tools

- TypeScript / typecheck
- ESLint
- typescript-eslint
- eslint-plugin-react-hooks
- Vitest
- Testing Library
- Playwright for serious UI/browser apps
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- React Doctor for React projects
- Oxlint for large JS/TS/React repos as acceleration/supplement
- Axe Playwright for UI/accessibility projects
- Lighthouse CI for public/mobile/performance-sensitive web apps
- Semgrep for security-sensitive projects
- dependency-cruiser for architecture hardening
- Madge for circular dependency risk
- jscpd for duplication-hardening projects

## Use-If-Existing Tools

- CodeQL
- Dependabot or Renovate, choose one per repo
- reviewdog
- CodeRabbit
- GitHub CLI
- Biome
- Knip only as cleanup candidate if already present

## External-Only Tools

- GSD
- Superpowers
- CodeRabbit as service
- GitHub CLI as operator tool

## Approval-Required Tools

- Socket
- TruffleHog
- OWASP ZAP baseline
- Harden-Runner
- deep networked scans
- MCP/global config changes
- React Doctor GitHub Action / PR write permissions / agent skill install
- package-manager/workspace migrations

## Active-Reference Resources

- UI UX Pro Max
- Impeccable normalized design guidance
- shadcn/ui reference only
- Addy Osmani UI/web quality methods
- Anthropic UIUX normalized guidance
- Bencium dashboard/commercial polish references
- Uncodixfy anti-generic AI UI guidance
- VoltAgent design references if already tracked

## Pilot-Only Tools

- code-review-graph
- open-design
- eslint-plugin-boundaries until architecture layers are stable
- Impeccable project-local install mode

## Archive/Removed Tools

- Base UI
- Figma

## Recommended Package Scripts

- `typecheck`: project-owned TypeScript check.
- `lint`: project-owned ESLint check.
- `test`: Vitest or existing unit test command.
- `test:ui`: Testing Library-focused component tests if separated.
- `e2e`: Playwright browser flow tests.
- `security:secrets`: Gitleaks or existing secret scan.
- `security:deps`: OSV Scanner or existing dependency scan.
- `react:doctor`: React Doctor only after owner-approved project-local adoption.

## Evidence Requirements

Report exact typecheck, lint, test, build, browser, scanner, and React Doctor output only when actually run. Browser claims require rendered evidence. Accessibility and Lighthouse claims require actual reports.

## Stop Conditions

- Owner approval missing for new install, package, CI, MCP, global config, PR write, or GitHub Action changes.
- React Doctor automation requested without approval.
- Biome migration requested without migration approval.
- Knip cleanup would delete files without explicit scope.
- Browser/UI readiness claimed without browser evidence.

## Owner Approval Requirements

New dependencies, package-manager changes, CI wiring, React Doctor automation, CodeRabbit/reviewdog configuration, deep scans, and package scripts require target project owner approval.

## No-Fake-Validation Rules

Recommended scripts are not executed scripts. Dry-run planner output is not project validation. Report skipped, unavailable, metadata-only, and dry-run checks separately.

## Rollback Notes

Templates copy only into `.ai-toolkit/tooling/`. Remove copied templates to roll back. Any package, CI, or tool install change must be handled in a separate approved PR with its own rollback.
