# Quickstart

This repository is documentation and governance infrastructure for AI coding-agent workflows. It is not a product runtime and does not execute product features itself.

## What You Need

- Read access to the repository.
- Git installed.
- Node.js to run repository validators.
- GitHub CLI only for PR, merge, tag, or release workflows.

Reading docs alone does not require running validators.

## 5-Minute Onboarding

1. Read `AGENTS.md`.
2. Read `docs/usage-guide.md`.
3. Confirm the current release posture in `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md`.
4. Run:

```powershell
node scripts/validate-public-package.mjs
node scripts/ai-toolkit/validate-codex-runtime.mjs
```

5. Report only the checks you actually observed.

## Use With AI Coding Agents

Use the toolkit when you need:

- governed planning before implementation,
- source-safety review,
- PR and release readiness evidence,
- compact context packs for large tasks,
- dry-run-first project sync discipline,
- validation honesty for real project work.

Do not use it to install external tools, activate raw external skills, change product repositories, change package files, edit CI, configure MCP, change global/user agent config, or access secrets without explicit owner approval.

## Practical First Flow

1. Start in planning-only or review mode.
2. Select the smallest useful skill/agent set.
3. State selected/recommended agents separately from agents actually spawned.
4. Prefer project-owned checks.
5. Use dry-run-first sync when copying toolkit artifacts into a project.
6. Require a project-specific PR for any product repository change.
7. Finish with a completion report that includes files changed, commands run, WARN output, skipped checks, risks, and next action.

## Validation Sequence

Use this sequence before opening a toolkit PR:

```powershell
git status --short
git diff --check
node scripts/compile-agents.mjs --dry-run
node scripts/check-source-freshness.mjs --fail-on-change
node scripts/validate-public-package.mjs
node scripts/ai-toolkit/validate-codex-runtime.mjs
node scripts/validate-toolkit.mjs
node scripts/ai-toolkit/validate-ai-toolkit.mjs
node scripts/ai-toolkit/validate-version-consistency.mjs
node scripts/ai-toolkit/run-toolkit-evals.mjs
node scripts/scan-public-private-leaks.mjs --check
```

For small documentation-only edits, run the narrowest subset first, then broaden if release or public-readiness claims are involved.

## v0.2.2 Positioning

`v0.2.2` is the controlled AI Vibe Coding Toolkit release for agent-assisted governance. It includes v0.2 hardening, task-intake routing, project-tooling governance, no-write leak-scan validation mode, reviewed source-freshness holds, activation posture hardening, public positioning cleanup, and validated 5-skill/12-agent runtime metadata for this repository. It does not claim Level 4, Level 5, enterprise certification, production certification, automatic tool installation, package publication, marketplace submission, or broad cross-runtime active support.

## Next Step

Use `docs/usage-guide.md` for prompt patterns and `docs/REAL_PROJECT_READINESS.md` for real-project gates.
