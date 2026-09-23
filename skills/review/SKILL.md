---
name: review
description: Review a diff, PR, or changed files before merge for bugs, security holes, performance, missing tests, and over-engineering. Use when asked to review code or check a change before merging. Read-only.
license: MIT
---

# Review route

Independent, read-only review of a change. Report findings; never edit files in this route.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## 1. Delegate when you can
- Claude Code: hand the review to the `review` agent from this plugin (independent reviewer with its own model and effort). Pass the diff or the changed paths, plus what the change is meant to do. Skip this step if you are that agent.
- Other tools: do the review inline with the steps below.

## 2. Get the change
- A diff in the conversation: review that.
- Otherwise: `git diff main...HEAD` (or the base branch the user names) plus relevant untracked files. Read the surrounding code, not only the hunks.

## 3. Review
1. Rank changed files by blast radius before reading deeply: auth and permissions, data access and RLS, payments, crypto, input parsing, and public APIs first; docs and tests last. Spend depth where a bug costs most.
2. Read `upstream/code-review-and-quality/UPSTREAM.md` and follow its five axes and severity labels.
3. Security-sensitive hunks: check them against `references/security-checklist.md`.
4. Hot paths, queries, render loops: check them against `references/performance-checklist.md`.
5. Over-engineering pass: read `upstream/ponytail-review/UPSTREAM.md` and add its one-line `delete:` / `stdlib:` / `native:` / `yagni:` / `shrink:` findings.

## Precedence (overrides upstream text)
- Where upstream mentions a `security-and-hardening` skill, use `references/security-checklist.md`; for a full audit (threat model, dependencies, secrets), recommend the `secure` route.
- The severity labels from code-review-and-quality are the only taxonomy. Ponytail findings go under a separate "Simplify" heading and never outrank a correctness or security finding.
- Never say a test, build, or scanner passed unless its output is in this session.

## Output
- Verdict first: approve, approve with nits, or request changes.
- Findings grouped by severity, each with `file:line`, the problem, and a concrete fix.
- "Simplify" section in ponytail's format when something can be cut.
- What you did not check (for example: tests not run).
