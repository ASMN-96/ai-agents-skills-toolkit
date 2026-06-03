# Usage Guide

## Repository purpose

Use this repository to standardize agent behavior, source review, and release evidence before changes are synced into product projects.

## Scope rules (important)

- no package files/lockfiles edits,
- no CI or MCP changes,
- no product-repo writes,
- no global/user Codex config edits,
- no runtime behavior changes in this mode.

## Suggested Codex modes

### Planning-only review

For policy audit, risk review, or implementation sequencing:

- request a scoped assessment,
- ask for findings first,
- do not edit files.

### Controlled implementation

For approved docs or metadata work:

- state exact file scope,
- keep diffs small,
- report executed checks and WARN output,
- keep unresolved risks explicit.

### Release review

For PR-ready state:

- summarize actual runtime checks,
- list unresolved blockers,
- call out scope limits and non-goals clearly.

## Suggested prompt pattern

Use clear, constrained prompts such as:

```text
Mode: controlled implementation.
Scope is limited to docs/quickstart.md and docs/usage-guide.md.
Do not modify CI, package files, global config, or runtime behavior.
Run required validations and report PASS/WARN/skipped status.
```

## Day-to-day usage with Codex

1. Read this file and `AGENTS.md` before changes.
2. Confirm allowed files.
3. Make minimal doc-only edits.
4. Run required commands.
5. Open a PR with an explicit warning block.

## Public-readiness positioning

This repo should remain clear that:

- it is not yet public-ready,
- package checks are not full-repo proof,
- only this repo is in-scope for future publication planning,
- others remain private unless owner-approved separately.
