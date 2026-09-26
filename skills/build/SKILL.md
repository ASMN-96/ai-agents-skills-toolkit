---
name: build
description: Implement a feature or code change in code, test-first: write the failing test, then the smallest working increment, keep the build green. Use for TDD in React/TS, Node/TS, Supabase clients, or React Native. Not for reviews.
license: MIT
---

# Build route

Implement code changes test-first, in small verifiable slices, with the smallest implementation that passes.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## 1. Discover the stack
Before writing anything, find the project's test framework, build command, and lint command (`package.json`, existing tests, README/CONTRIBUTING). Use those exact commands for every step below; never assume `npm test` by default. `references/tools.md` lists the common JS/TS toolset this route expects — use what the project already has.

## 2. Read the base skills
1. `upstream/test-driven-development/UPSTREAM.md` — the red-green-refactor loop and the Prove-It Pattern for bug fixes. For JS/TS test patterns (Jest, RTL, Supertest, Playwright), read `references/testing-patterns.md`.
2. `upstream/incremental-implementation/UPSTREAM.md` — thin vertical slices, one thing at a time, feature flags for incomplete work. Before calling a task done, check it against `references/definition-of-done.md`.
3. `upstream/ponytail/UPSTREAM.md` — the minimalism ladder: once a test is red, climb it (YAGNI → reuse existing code → stdlib → native platform feature → an already-installed dependency → one line → minimum code) to pick the smallest implementation that turns it green.

## 3. Implement
1. Write the failing test first (RED). Run it; confirm it fails for the expected reason.
2. Climb ponytail's ladder to the smallest implementation that makes it pass (GREEN). Stop at the first rung that holds.
3. Refactor with tests green.
4. For a React/TS or Node/TS increment, check it against `references/react-ts-quality.md` (strict types, hook rules, error/loading/empty states, no secrets in client code) before moving on.
5. Re-run the project's test and lint/build commands after each slice; commit before starting the next one.

## Precedence (overrides upstream text)
- Ponytail says tests are YAGNI unless asked, and to use it on any coding task. Here, TDD always runs first: write the failing test, then use ponytail's ladder only to pick the implementation. Ponytail never removes input validation, error handling, security checks, or accessibility, even when skipping them would shrink the diff.
- The project's existing test framework, file layout, and naming conventions win over both upstream skills' examples.
- TDD's upstream text points to a `browser-testing-with-devtools` skill for runtime/browser verification; that skill is not vendored here — for browser-based checks, use the `uiux` route.
- Incremental-implementation's upstream text points to a `git-workflow-and-versioning` skill for commit conventions; that skill is not vendored here — use the project's own conventions, or the `ship` route when finishing a branch.
- Ponytail's `/ponytail lite|full|ultra` slash command, its hooks, and its "pair with Caveman" note are not shipped; this route always applies ponytail's `full` ladder inline — no intensity levels apply.
- For reviewing a finished diff (correctness, security, over-engineering) use the `review` route instead of this one.
- Never claim a test, build, lint, or browser check passed unless its output is in this session.

## Output
- The failing test (shown red), then the passing implementation (shown green).
- One line per slice on what was skipped and when to add it back, ponytail's `skipped: X, add when Y` format — never a design essay.
- What you did not run (for example: full suite not run, lint not run, browser not checked).
