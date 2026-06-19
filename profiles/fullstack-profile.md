# Fullstack Profile

## Included Agents

- Product Agent
- Architect Agent
- Frontend Agent
- Backend Contract Agent
- Database RLS Agent
- Security Agent
- QA Test Agent
- Reviewer Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- GSD Core as active-if-detected governed tool metadata for serious cross-surface work when available; owner-approved install/config only when absent.
- GitHub/gh for branch, PR, and check evidence.
- Playwright/browser when browser-visible behavior changes.
- Supabase tooling/docs only when database or RLS work is explicitly in scope.

## Default Mode

Implementation.

## Allowed Actions

- Plan and implement scoped cross-surface changes after approval.
- Coordinate frontend, backend, database, security, QA, and review gates.
- Update docs, tests, registries, and validators directly tied to the change.

## Forbidden Actions

- Install packages or change package managers without explicit approval.
- Apply database migrations, weaken auth/RLS, change production config, or touch product repos from this toolkit.
- Activate every agent or tool for every task.

## Required Output Format

- Scope and affected surfaces.
- Contract, UI, data, security, and validation impact.
- Commands run and WARN/skipped checks.
- Risks, owner decisions, and next release action.

## Required Verification Gates

- Confirm contracts and consumer impact.
- Confirm RLS/data isolation when data access is in scope.
- Confirm frontend/runtime checks when UI behavior is in scope.
- Confirm release and rollback risk before PR readiness claims.
