# Infra IaC Project Tooling Profile

## Purpose

Provide an infrastructure and IaC tooling posture for cloud config, containers, GitHub Actions, SBOMs, and release risk.

## Project Type

`infra-iac`

## Task-Intake Routing Gate

Classify normal-language requests before coding: affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items.

## Default Tools

- TypeScript / typecheck where applicable
- ESLint where applicable
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- actionlint for GitHub Actions projects
- zizmor for GitHub Actions security
- Trivy for Docker/container/IaC/SBOM projects
- Checkov for IaC/cloud projects
- Semgrep for security-sensitive projects
- dependency-cruiser for architecture hardening where code structure exists
- eslint-plugin-boundaries after architecture layers are stable and owner-approved

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

- production governance docs
- release/security routing docs
- agent-command-safety method

## Active-Read-Only Resources

- code-review-graph source intelligence with no install, package change, indexing, MCP/global config, CI wiring, product repo scanning, or evidence claim without actual output

## Recommended Package Scripts

- `lint`: project-owned lint or config check.
- `test`: infra policy tests if present.
- `security:secrets`: Gitleaks or existing secret scan.
- `security:deps`: OSV Scanner or existing dependency scan.
- `security:iac`: Checkov only after owner-approved adoption or existing script.
- `security:containers`: Trivy only after owner-approved adoption or existing script.
- `workflow:lint`: actionlint only after owner-approved adoption or existing script.

## Evidence Requirements

Report IaC/container/workflow surfaces, scanner outputs when run, CI/deployment implications, skipped checks, approval status, and rollback.

## Stop Conditions

- CI/deployment config changes are requested without approval.
- Production-impacting command or environment change is possible.
- Harden-Runner, deep scan, or external permission change lacks approval.
- IaC/cloud config risk is unresolved.

## Owner Approval Requirements

All CI, deployment, cloud, workflow permission, external service, package, scanner, and deep security changes require explicit approval.

## No-Fake-Validation Rules

Do not claim IaC, workflow, container, deployment, or security readiness without actual output or explicitly documented manual review limits.

## Rollback Notes

Template copy rollback is file removal under `.ai-toolkit/tooling/`. Real infra/CI changes require separate rollback in a scoped PR.
