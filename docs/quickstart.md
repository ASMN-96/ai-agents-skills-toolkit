# Quickstart

This repository is documentation and governance infrastructure for a Codex-first agent workflow.
It is not a product runtime and does not execute product features itself.

## What you need

- Read access to the repository.
- Git installed.
- Optional: Node.js for running validator scripts.

## 5-minute onboarding

1. `git clone` this repository and open it locally.
2. Read `AGENTS.md`.
3. Confirm this repo’s current state in:
   - `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md`
   - `docs/NO_FAKE_VALIDATION_POLICY.md`
4. Run the minimum validations:
   - `node scripts/validate-public-package.mjs`
   - `node scripts/ai-toolkit/validate-codex-runtime.mjs`
5. Review warnings and update only scoped documentation if required.

## Common first edits

- Clarify onboarding docs.
- Update contributor-facing templates.
- Align policy language after owner-approved changes.
- Keep runtime, CI, global config, and product repos untouched unless explicitly approved.

## Validation sequence

Use this sequence before opening a PR:

1. `node scripts/validate-public-package.mjs`
2. `node scripts/ai-toolkit/validate-codex-runtime.mjs`
3. `git diff --check`
4. `git status --short`

If broader evidence is needed, add:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`

## Safety and scope defaults

This quickstart is documentation-only by default:

- no package/config changes,
- no CI/deployment edits,
- no runtime behavior changes,
- no changes outside `ai-agents-skills-toolkit`.

## Next step

Use `docs/usage-guide.md` for detailed Codex prompt patterns and role modes.
