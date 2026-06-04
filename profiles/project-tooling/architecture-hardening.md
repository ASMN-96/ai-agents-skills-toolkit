# Architecture Hardening Project Tooling Profile

## Purpose

Provide a scoped tooling posture for architecture boundaries, dependency flow, circular dependencies, duplication, and token/context control.

## Project Type

`architecture-hardening`

## Default Tools

- TypeScript / typecheck where applicable
- ESLint where applicable
- typescript-eslint where applicable
- Vitest or project-owned tests where applicable
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- dependency-cruiser for architecture hardening
- Madge for circular dependency risk
- jscpd for duplication-hardening projects
- Oxlint for large JS/TS/React repos as acceleration/supplement
- Semgrep for security-sensitive projects

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

## Active-Reference Resources

- context graph/token budget methods
- changed-file neighborhood selection
- compact agent context pack
- stale context graph detection

## Pilot-Only Tools

- code-review-graph
- eslint-plugin-boundaries until architecture layers are stable
- open-design when UI architecture is in scope

## Archive/Removed Tools

- Base UI
- Figma

## Recommended Package Scripts

- `typecheck`: project-owned type check.
- `lint`: project-owned lint.
- `test`: project-owned tests.
- `arch`: dependency-cruiser only after owner-approved adoption or existing script.
- `arch:cycles`: Madge only after owner-approved adoption or existing script.
- `arch:dupes`: jscpd only after owner-approved adoption or existing script.

## Evidence Requirements

Report boundary assumptions, dependency flow, cycle/duplication findings when actually run, affected modules, changed-file neighborhood, private-overlay exclusions, and skipped tool gaps.

## Stop Conditions

- Architecture layers are not agreed but lint-boundary enforcement is requested.
- Tool-generated graph or scan output is claimed without actual output.
- code-review-graph indexing, MCP, global config, or product indexing is requested.
- Package/CI/tool installation lacks approval.

## Owner Approval Requirements

New architecture tools, lint-boundary rules, package changes, CI wiring, global/MCP configuration, and indexing require owner approval.

## No-Fake-Validation Rules

Static/manual review, metadata-only routing, and pilot-only graph ideas must be labeled separately from executed architecture tools.

## Rollback Notes

Template files are removable. Tool installs, configs, and boundary rules require separate approved rollback.
