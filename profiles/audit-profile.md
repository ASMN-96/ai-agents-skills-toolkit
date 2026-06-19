# Audit Profile

## Included Agents

- Skill Scout Agent
- Security Agent
- Reviewer Agent
- QA Test Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- GSD Core as active-if-detected governed tool metadata for serious audits when available; owner-approved install/config only when absent.
- Context7 when available/configured for current official documentation or API reference checks.

## Default Mode

Read-only.

## Allowed Actions

- Inspect repository files, diffs, source records, method files, and documentation.
- Classify findings, risks, and required approvals.
- Recommend fixes or follow-up work without applying implementation changes unless separately approved.

## Forbidden Actions

- Install or activate skills.
- Clone external repositories.
- Run third-party scripts.
- Modify product repos or Codex global config.
- Add secrets, env files, caches, logs, build outputs, or temp artifacts.

## Required Output Format

- Executive status.
- Findings ordered by severity.
- Safety gate table.
- Recommended next action.

## Required Verification Gates

- Confirm no raw external sources are active.
- Confirm no unsafe files or nested repos were added.
- Confirm source/license uncertainty is documented.
- Confirm working tree status when operating in a Git repo.
