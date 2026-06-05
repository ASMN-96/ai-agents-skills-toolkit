# Backend API Project Tooling Profile

## Purpose

Provide a secure, contract-first tooling posture for backend APIs, RPCs, services, and server-client contracts.

## Project Type

`backend-api`

## Task-Intake Routing Gate

Classify normal-language requests before coding: affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items.

## Default Tools

- TypeScript / typecheck
- ESLint
- typescript-eslint
- Vitest
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- Semgrep for security-sensitive projects
- dependency-cruiser for architecture hardening
- eslint-plugin-boundaries after architecture layers are stable and owner-approved
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
- package-manager/workspace migrations
- code-review-graph install, indexing, MCP/global config, or product repo scanning

## Active-Reference Resources

- Addy Osmani API/interface and security methods
- cross-surface client contracts method
- WebView boundary review when embedded/native clients consume the API

## Active-Read-Only Resources

- code-review-graph source intelligence with no install, package change, indexing, MCP/global config, CI wiring, product repo scanning, or evidence claim without actual output

## Recommended Package Scripts

- `typecheck`: project-owned TypeScript check.
- `lint`: project-owned ESLint check.
- `test`: backend unit/integration tests.
- `security:secrets`: Gitleaks or existing secret scan.
- `security:deps`: OSV Scanner or existing dependency scan.
- `security:sast`: Semgrep only after owner-approved adoption or existing script.
- `arch`: dependency-cruiser only after owner-approved adoption or existing script.

## Evidence Requirements

Report API contract inventory, affected consumers, auth/data boundary review, actual validation output, scanner output when run, skipped checks, and rollback implications.

## Stop Conditions

- Auth/session/public-private payload boundary unclear.
- Breaking contract possible without owner approval.
- Database/RLS/migration risk unresolved.
- Approval-required scanner or package change requested without approval.

## Owner Approval Requirements

New tools, package changes, CI/deployment command changes, database migrations, auth/RLS changes, deep scans, and service permissions require explicit approval.

## No-Fake-Validation Rules

Do not claim endpoint, scanner, contract, or integration tests passed without current output.

## Rollback Notes

Tooling templates are removable from `.ai-toolkit/tooling/`. Runtime package/config changes require separate approved rollback.
