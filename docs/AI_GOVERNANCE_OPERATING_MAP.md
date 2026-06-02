# AI Governance Operating Map

## Roles

- `governance` is the user-facing governance/router and safety source-of-truth for scoped serious work.
- `uiux` is the execution skill for frontend UX/UI premium polish when UI behavior is explicitly in scope.
- `profiles/` define task-mode bundles for execution expectations (audit/read-only, implementation, frontend, backend, UI/UX, security, SRE, release).
- `agents/` define specialist role behavior and are the selection layer for deeper routing.
- `methods/` are passive reference material; they inform agents but do not execute.
- `sources/` and `sources/source-watchlist.json` are provenance and freshness evidence; they do not run actions.

## Core Routing

- Start with `governance` when governance, safety, source checks, release posture, or multi-step project work is needed.
- Use `governance` to select agents/profiles/support tools, then switch to focused skills only as allowed by request scope.
- Use `uiux` when the request is primarily dashboard/UI polish, premium frontend quality, responsive/layout/accessibility checks, or visual QA.
- Do not treat keyword overlap as execution selection: UI/UX execution must be explicitly selected through scenario/scoping signals (for example dashboard/user-facing redesign language), not through matching words alone.

## Scope Boundaries

- `governance` does not replace normal behavior for unrelated tasks unless the user explicitly opts into toolkit governance.
- `uiux` should not be selected for backend-only, RLS/database-only, security-only, release-only, or docs-only work unless UI behavior is directly impacted.
- Retired helper names are not active runtime skills and should not be treated as direct user entrypoints.
- `governance` always remains router/safety/source-of-truth; `uiux` only executes UI/UX workflow after route selection.

## When To Stop

- Stop if required branch/source-of-truth checks fail or cannot be verified.
- Stop if required validation cannot run and the risk is material.
- Stop if required support checks are pending with unresolved risks (security, auth/public payload, release gates, or dependency/risk blockers).
- Stop if routing would require broad installs, global activations, or silent fallback from unavailable native assets.

## Validation Before Completion

- Branch and repo state reported (`git status`, branch tracking, clean tree).
- Registry JSON files and all `.json` evals parse successfully.
- Source freshness report parsed; no `CHECK_FAILED` and no unresolved high-risk hold violations.
- Provenance map checked (`sources/`, `source-watchlist.json`, `sourceProvenance`, `sourceRecordPath` references).
- Forbidden artifacts absent (`.env*`, package locks, logs, build outputs, temp/cache directories).
- Confirm no changes outside requested scope; no product repos synced by toolkit-only audit.

## Provenance Semantics (Machine-Readable)

- `sourceProvenance` entries are objects inside a list, each with `path` and `category`.
- Allowed categories:
  - `internal-artifact`
  - `external-source`
  - `historical-reference`
  - `restricted-source`
  - `local-vd-authored`
- External authority sources must have source records and watchlist entries.
- Historical/reference and restricted sources are non-authority by default and should not be used for method/skill execution.
- `sourceRecordPath` in watchlist records identifies the source intake record and is not itself executable authority.

## Routing Boundary Invariants

- Retired helper names are never direct UI/UX execution.
- `uiux` must not be included in routing for:
  - backend-only tasks,
  - RLS-only migrations,
  - security-only audits,
  - release-only checks,
  - docs-only edits,
  - external-source audits.

## Forbidden Actions

- No external source cloning, install, activation, sync, or global Codex config updates from this audit.
- No product repository writes or `main` branch direct push as part of readiness certification.
- No changes to supply-chain configuration, auth/billing/deployment/backend policy, or runtime environment without explicit scoped approval.
- No silent fallback claims: if a selected helper/agent/tool is missing, report it explicitly.
