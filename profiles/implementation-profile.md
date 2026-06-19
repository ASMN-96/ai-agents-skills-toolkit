# Implementation Profile

## Included Agents

- Product Agent
- Architect Agent
- Frontend Agent
- Backend Contract Agent
- Database RLS Agent
- QA Test Agent
- Reviewer Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- GSD Core as active-if-detected governed tool metadata for serious implementation programs when available; owner-approved install/config only when absent.
- Context7 when available/configured for current library or API docs.
- Playwright when UI or runtime browser behavior is affected.

## Default Mode

Implementation.

## Allowed Actions

- Plan, implement, verify, and document scoped changes after approval.
- Update tests and docs that directly support the change.
- Coordinate specialist review for frontend, backend, database, QA, and review gates.

## Forbidden Actions

- Install or activate external skills without review.
- Touch product repos from this toolkit project.
- Modify Codex global config.
- Create project sync/install scripts before Phase 5 approval.
- Add secrets, env files, caches, logs, build outputs, or temp artifacts.

## Required Output Format

- Change summary.
- Files changed.
- Verification results.
- Risks or follow-up.

## Required Verification Gates

- Confirm the change is scoped to the approved task.
- Confirm tests or documented manual checks match the risk.
- Confirm no forbidden artifacts or activations were added.
- Confirm working tree status after commit when applicable.
