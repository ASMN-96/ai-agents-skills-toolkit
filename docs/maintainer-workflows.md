# Maintainer Workflows

## Purpose

This guide defines maintainer actions that do not alter runtime behavior unless explicitly approved.

## Documentation polish workflow

1. Read current blockers and policy state in:
   - `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md`
   - `docs/NO_FAKE_VALIDATION_POLICY.md`
2. Edit only scoped documentation assets.
3. Run required validators.
4. Record outcomes and remaining blockers in PR description.

## Required checks before PR

- `node scripts/validate-public-package.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `git diff --check`
- `git status --short`

Optional when scope permits:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`

## Merge-readiness review points

- Confirm no hidden claims of enterprise/public status.
- Confirm repo-wide warning remains visible.
- Confirm only this repo is referenced for publication planning.
- Confirm no product repos or global config changed.

## Incident and rollback

- If a warning or boundary is accidentally removed, restore from previous commit and rerun checks.
- If unknown blockers appear, close the change and document them before retrying.

## PR draft structure

Use the repository PR template. Include:

- summary,
- files changed,
- command output,
- known limitations,
- remaining blockers,
- non-goals.
