# Specialist Agent Activation Audit

Date: 2026-06-01

Status: historical report updated for canonical runtime-name boundary.

This audit records the activation of the twelve approved repo-local project custom agents under `.codex/agents`. It must not be used as current evidence for non-canonical skill names, alias availability, public release readiness, or Level 4 readiness.

## Current Agent Boundary

Active repo-local project custom agents remain:

- `product-agent`
- `architect-agent`
- `reviewer-agent`
- `uiux-agent`
- `frontend-agent`
- `backend-contract-agent`
- `database-rls-agent`
- `security-agent`
- `qa-test-agent`
- `release-manager-agent`
- `skill-scout-agent`
- `sre-performance-agent`

## Current Skill Boundary

Active runtime skills are limited to:

- `governance`
- `uiux`
- `code-quality`
- `security-review`
- `pr-release-gate`

## Non-Goals

- No product repository sync.
- No global/user Codex file mutation.
- No package, lockfile, CI, MCP, deployment, dependency, scanner, or production-operation change.
- No public release, enterprise, or Level 4 readiness claim.

Use `docs/RUNTIME_ACTIVATION_MODEL.md`, `.ai-toolkit/manifest.json`, and `scripts/ai-toolkit/validate-codex-runtime.mjs` for current runtime evidence.
