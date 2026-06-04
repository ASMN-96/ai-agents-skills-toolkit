# Deep Release Project Tooling Profile

## Purpose

Provide a release-evidence posture for high-risk PRs and release candidates after scoped approval.

## Project Type

`deep-release`

## Default Tools

- TypeScript / typecheck where applicable
- ESLint where applicable
- typescript-eslint where applicable
- Vitest or project-owned tests
- Playwright for serious UI/browser apps
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- React Doctor for React projects
- Axe Playwright for UI/accessibility projects
- Lighthouse CI for public/mobile/performance-sensitive web apps
- Semgrep for security-sensitive projects
- dependency-cruiser for architecture hardening
- actionlint for GitHub Actions projects
- zizmor for GitHub Actions security
- Trivy for Docker/container/IaC/SBOM projects
- Checkov for IaC/cloud projects
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

- production governance docs
- no-fake-validation policy
- review/security routing docs
- owner approval checklist

## Pilot-Only Tools

- code-review-graph
- open-design
- eslint-plugin-boundaries until architecture layers are stable

## Archive/Removed Tools

- Base UI
- Figma

## Recommended Package Scripts

- `typecheck`: project-owned type check.
- `lint`: project-owned lint.
- `test`: project-owned unit/integration tests.
- `build`: project-owned build.
- `e2e`: project-owned browser/mobile E2E when relevant.
- `security:secrets`: Gitleaks or existing secret scan.
- `security:deps`: OSV Scanner or existing dependency scan.
- `release:verify`: project-owned release gate aggregation if present.

## Evidence Requirements

Report branch, PR, checks, review status, all commands run, WARN output, skipped gates, source freshness if applicable, leak/secret scan status, rollback, and post-merge verification plan.

## Stop Conditions

- Required checks fail.
- Review comments unresolved.
- Current-tree blocker exists.
- Approval-required scan/tool/config is requested without approval.
- Release claim lacks actual evidence.

## Owner Approval Requirements

Merge, release, tag, GitHub app permissions, deep scans, package/CI/deployment/MCP/global config changes, and external service changes require approval.

## No-Fake-Validation Rules

Do not claim release readiness from planned, skipped, dry-run, metadata-only, or unavailable checks.

## Rollback Notes

Template copy rollback is file removal. Real release changes require revert/rollback plan and post-merge verification.
