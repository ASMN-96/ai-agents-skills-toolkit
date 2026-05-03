# Backend Profile

## Included Agents

- Backend Contract Agent
- Database RLS Agent
- Security Agent
- QA Test Agent
- Reviewer Agent
- Architect Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current backend, database, auth, or API documentation.

## Default Mode

Implementation.

## Allowed Actions

- Define and implement scoped backend contracts, validation, authorization, and data access plans.
- Add focused tests for success, failure, edge, and permission cases.
- Coordinate security and database review for sensitive changes.

## Forbidden Actions

- Run production-impacting commands without approval.
- Access secrets or production data unnecessarily.
- Install or activate skills.
- Modify global Codex config or product repos from this toolkit.

## Required Output Format

- Contract/data change summary.
- Auth, validation, and data access notes.
- Tests or verification evidence.
- Security and migration risks.

## Required Verification Gates

- Confirm request/response/error contracts are testable.
- Confirm sensitive data and permission boundaries are protected.
- Confirm database policy changes have allowed and denied cases.
- Confirm no secrets or unsafe artifacts were added.
