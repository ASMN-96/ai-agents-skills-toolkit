---
name: plan
description: Turn an idea into a spec, acceptance criteria, a small-slice task breakdown, and API/interface design before code is written. Use before starting a feature, when requirements are vague, or when designing an API, RPC, or module boundary.
license: MIT
---

# Plan route

Turns a request into a spec the human can approve, then a task list small enough to implement safely. Runs inline; ask clarifying questions rather than guessing.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## Proportionality first
A one-line fix or an unambiguous single-file change does not need a spec — say so and skip straight to a one-line task. Full spec-and-task-breakdown is for work that is ambiguous, touches multiple files/modules, or would take more than ~30 minutes.

## 1. Specify
Read `upstream/spec-driven-development/UPSTREAM.md`, Phases 0-3 only (Scope Check, Specify, Plan, Tasks — stop before Phase 4, see Precedence). Surface assumptions and ask clarifying questions before writing the spec; don't silently fill gaps. If one request bundles several independently testable capabilities, do the Phase 0 capability map before specifying any single module.

## 2. Break into tasks
Read `upstream/planning-and-task-breakdown/UPSTREAM.md` for the dependency-graph mapping, vertical-slicing, and task-sizing mechanics (it is canonical over spec-driven-development's lighter Phase 3 template). Each task: small (≤~5 files), has acceptance criteria, a verification step, and ordered dependencies. Then check the standing bar in `references/definition-of-done.md` alongside each task's own acceptance criteria — the two are complementary, not substitutes.

## 3. Design the interface (when the work has one)
If the plan defines or changes an API, RPC, server action, or a boundary between modules/frontend/backend, read `upstream/api-and-interface-design/UPSTREAM.md` for contract-first design, error semantics, validation-at-boundaries, and idempotency-key handling. If more than one client (web + mobile, multiple services) consumes it, also work through `references/api-contract-checks.md` for compatibility classification and migration gates.

## Precedence (overrides upstream text)
- Stop at spec-driven-development's Phase 4 (Implement): its links to `incremental-implementation`, `test-driven-development`, and `context-engineering` are not vendored here. Hand off to the **build** route instead of following them.
- Where planning-and-task-breakdown or definition-of-done mention `code-review-and-quality` or `security-and-hardening`, those checks apply at implementation/review time — point to the **review** or **secure** route, not this one.
- api-and-interface-design's mention of a `deprecation-and-migration` skill is not vendored; use `references/api-contract-checks.md`'s compatibility gates instead.
- definition-of-done's mentions of `shipping-and-launch`, `observability-and-instrumentation`, and `documentation-and-adrs` are informational only (none vendored); treat them as later-stage reminders, not planning blockers.
- Never claim a test, build, browser check, or scanner passed unless its output is in this session — a plan records what verification a task *will* need, not evidence it already ran.

## Output
- A spec (or, for small work, a one-line equivalent) with objective, success criteria, and open questions.
- A task list in small, dependency-ordered, independently verifiable slices, each with acceptance criteria.
- For API/interface work: the contract (types/schema), error format, and any breaking-change or migration notes.
- Explicit open questions the human must answer before implementation starts.
- Handoff: point to the **build** route with the first task ready to implement. If the plan touches UI/UX, note the **uiux** route; if it touches Supabase/Postgres schema or RLS, note the **data** route; if it touches a native/React Native/WebView surface, note the **mobile** route.
