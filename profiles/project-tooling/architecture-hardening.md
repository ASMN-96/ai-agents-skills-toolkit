# Architecture Hardening Project Tooling Profile

## Purpose

Provide a scoped tooling posture for architecture boundaries, dependency flow, circular dependencies, duplication, and token/context control.

## Project Type

`architecture-hardening`

## Task-Intake Routing Gate

Classify normal-language requests before coding: affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items.

## Default Tools

- TypeScript / typecheck where applicable
- ESLint where applicable
- typescript-eslint where applicable
- Vitest or project-owned tests where applicable
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- dependency-cruiser for architecture hardening
- eslint-plugin-boundaries after architecture layers are stable and owner-approved
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
- Repomix install/execution, package changes, CI wiring, MCP/global config, whole-repo packing, or product repo scanning

## Active-Reference Resources

- project context preflight
- changed-file neighborhood selection
- compact agent context pack
- project map staleness check

## Active-Read-Only Resources

- Project Context Preflight and project-map staleness guidance with no external tool execution, context-pack, token-count, or validation claim without observed output

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
- Tool-generated context pack, token count, graph, or scan output is claimed without actual output.
- Repomix whole-repo packing, package changes, MCP, global config, CI wiring, or product scanning is requested.
- Package/CI/tool installation lacks approval.

## Owner Approval Requirements

New architecture tools, lint-boundary rules, package changes, CI wiring, global/MCP configuration, and indexing require owner approval.

## No-Fake-Validation Rules

Static/manual review, metadata-only routing, and read-only source intelligence must be labeled separately from executed architecture tools.

## Rollback Notes

Template files are removable. Tool installs, configs, and boundary rules require separate approved rollback.
