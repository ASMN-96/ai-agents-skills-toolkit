---
name: ship
description: Finish already-implemented work for merge or release - verify before claiming done, write commits and PR descriptions, plan releases and rollbacks. Use when wrapping up a branch or deciding how to integrate it. Not for writing code.
license: MIT
---

# Ship route

Finish work that is already implemented: verify it, decide how to integrate it, and describe it honestly. This route never edits application code — it verifies, commits, and describes.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## 1. Verify before any completion claim
Read `upstream/verification-before-completion/UPSTREAM.md` and follow its Iron Law: no completion claim without fresh verification evidence run in this session. Before saying tests pass, a build succeeds, or a bug is fixed, identify the command that proves it, run the full command now, and read its actual output. A prior run, "should pass," or an agent's self-report is not evidence.

## 2. Decide how to integrate
Read `upstream/finishing-a-development-branch/UPSTREAM.md` and follow its flow: verify tests first (stop and report failures if they fail — do not proceed to the menu), detect whether this is a normal repo, a named-branch worktree, or a detached HEAD, confirm the base branch, then present the matching options menu and wait for the human's choice before merging, pushing, or discarding anything.

## 3. Write the artifacts
- Commit messages and PR descriptions: use `references/pr-description.md`. The "How verified" section is mandatory and must name real command output, including anything skipped.
- Release notes and rollback planning, especially for schema/migration/flag-sensitive changes: use `references/release-checks.md`.

## Precedence (overrides upstream text)
- The project's own scripts and CI define "verified," not this skill's judgment. If the project has a test/build/lint command, run that command — do not substitute a partial check.
- Upstream's discard-the-work path in `finishing-a-development-branch` only ever runs on an explicit, exact request from the human (the literal word "discard" per upstream's confirmation step). Never infer consent to discard, merge, push, or force-push from enthusiasm or vague agreement.
- Remove only worktrees this session created; leave host-managed ones (for example `.claude/worktrees/`) in place.
- Never force-push, skip hooks, or push to the default/shared branch unless the human explicitly asks for that specific action in this conversation. If asked to force-push to main or skip a failing check to unblock a merge, refuse and propose the safe path instead (fix the failure, or push a new branch and open a PR).
- Code review of the diff itself belongs to the `review` route; security sign-off (auth, secrets, dependency, supply-chain risk) belongs to the `secure` route. This route may point to them but does not replace them.
- Never claim a test, build, browser check, or scan passed unless its output is in this session. If something was not run, say so in the report instead of assuming it would pass.

## Output
- State of verification: what ran, what passed/failed, what was skipped, with actual output or counts — not adjectives.
- The integration menu from `finishing-a-development-branch/UPSTREAM.md`, and the human's choice once given.
- A PR description or commit message using `references/pr-description.md` when one is needed.
- For anything release-shaped (new column, new flag, schema change, production impact): rollback path and monitoring plan from `references/release-checks.md`.
