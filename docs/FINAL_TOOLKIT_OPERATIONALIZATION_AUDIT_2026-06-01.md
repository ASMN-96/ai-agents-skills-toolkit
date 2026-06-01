# Final Toolkit Operationalization Audit

Date: 2026-06-01

Branch: `codex/final-toolkit-operationalization`

Baseline: PR #49 merged into `main` at `55799d4bef5eff5a9a93a70f8e7cad0663ff97e8`.

## Scope

This audit records the post-PR #49 operationalization state for the toolkit before any RISS V2 sync, plus the final source-freshness cleanup required by live upstream movement on 2026-06-01. It is evidence and split planning only. It does not sync product repositories, install dependencies, activate upstream content, configure MCP, change CI, change package files, change global Codex config, regenerate compiled agents, or promote Level 4/public readiness.

## Current Inventory

| Surface | Count | Current state |
| --- | ---: | --- |
| Profiles | 11 | `audit-profile`, `backend-profile`, `frontend-profile`, `fullstack-profile`, `implementation-profile`, `planning-profile`, `release-profile`, `security-profile`, `source-review-profile`, `sre-profile`, `uiux-profile` |
| Canonical/helper skill directories | 16 | 14 active runtime skills plus 2 internal helper skills |
| Active repo runtime skills | 14 | Five final names, four intermediate aliases, and five old compatibility aliases |
| Internal helper skills | 2 | `riss-agent-governance`, `riss-skill-governance`; not user-facing runtime skills |
| Agent specs | 12 | Markdown specs under `agents/` |
| Compiled agents | 12 | Fallback docs under `compiled-agents/` |
| Active repo project custom agents | 5 | `reviewer-agent`, `frontend-agent`, `security-agent`, `qa-test-agent`, `release-manager-agent` |
| Global Codex agent TOMLs observed | 13 | Existing user-global state; not changed by this audit |
| Global Codex skill dirs observed | 20 | Existing user-global state, including system/runtime support dirs; not changed by this audit |
| Source records | 25 | 22 tracked in `sources/source-watchlist.json` |

## Naming And Routing Findings

- Final names are the preferred profile and routing surface: `governance`, `uiux`, `code-quality`, `security-review`, and `pr-release-gate`.
- Intermediate aliases remain intentionally active: `ai-project-governance`, `premium-uiux-review`, `webapp-code-quality`, and `app-security-review`.
- Old compatibility aliases remain intentionally active: `riss-governance`, `vd-premium-uiux`, `riss-code-quality`, `riss-security-review`, and `riss-release-gate`.
- Profiles currently reference final skill names only. Alias usage is preserved for compatibility prompts and runtime discovery, not as independent behavior forks.
- The 14 active skills are intentional and validated by `.ai-toolkit/manifest.json`, `docs/RUNTIME_ACTIVATION_MODEL.md`, and the runtime validators.

## Agent Activation Finding

The current repo-local `.codex/agents` surface is limited to five active project custom agents. Adding repo-local TOML files for `product-agent`, `architect-agent`, `uiux-agent`, or `skill-scout-agent` would expand persistent runtime activation and requires an explicit owner-approved PR.

The safe current state is:

- Use the 5 active repo TOMLs when runtime-visible.
- Use the remaining 7 agent specs and compiled agents as documented fallback material only.
- Do not claim an agent spawned unless current runtime evidence proves it.
- Do not change global `~/.codex/agents` or global `~/.codex/skills` from this audit.

## Embedded Builder Review

The embedded builder preserves reviewed registries and mirrors selected active runtime surfaces into `.ai-toolkit/`. The current safe boundary is:

- Builder preservation does not authorize new runtime activation.
- `.ai-toolkit/` remains non-runtime storage.
- Manifest hashes and byte-identity validators catch mirror drift.
- No compiled-agent regeneration is required for this audit.
- No package, lockfile, CI, MCP, global config, or product-repository change is part of this scope.

## Source Freshness

Live source freshness is clean after final source-record refresh:

- `UNCHANGED`: 22
- `CHANGED_LOW_RISK`: 0
- `CHANGED_REVIEW_REQUIRED`: 0
- `CHANGED_HIGH_RISK`: 0
- `CHECK_FAILED`: 0
- Impeccable reviewed commit: `ea3e66b9844f`

The final cleanup rerun initially found three `CHANGED_LOW_RISK` sources and no `CHECK_FAILED` sources. Anthropic Skills and OpenAI Skills retried clean as unchanged. The refreshed source records are:

- Microsoft Playwright: `3edc77fc943ae9398161fbde2de0b29cb8e56725` to `c3c74e4b10c6232fec28b8f8bee4b664ddaf36d3`; one test-spec change, Apache-2.0 license signal retained.
- shadcn/ui: `460ad60d84617836762a8800755fafef37f662df` to `adac7cae1f5bb08c210483b73732100cec51987c`; registry, CLI, MCP, skill, package, and lockfile upstream signals remain passive source intelligence only, MIT license signal retained.
- RuFlo: `28eb57543be916abf5191f71114268a3985cb001` to `f57b69876ba1c4e6bf4e317d0d1529a5481692c4`; README/data/proof movement only, MIT license signal retained.

GitHub API 403/429 fallbacks were limited to `git ls-remote` default-branch checks where reported by the freshness script. No fallback imported, copied, installed, or activated source content.

## GSD And Superpowers

GSD and Superpowers remain external governance/execution-discipline support tools. They are not vendored into the toolkit and should not be duplicated here.

Operational use should remain:

- GSD: phase/state tracking for serious multi-step work when available and approved.
- Superpowers: execution discipline for planning, review, debugging, TDD, and verification-before-completion.
- Toolkit: source-of-truth, routing, profile, source, validation, and release-boundary governance.

## RISS V2 Sync Readiness

No RISS V2 sync was performed in this audit. A future RISS V2 sync remains allowed only through the existing Level 3 controlled process:

- clean upstream-aligned product branch,
- dry-run sync first,
- owner review of exact write scope,
- confirm-write only after approval,
- project install validation,
- project checks,
- PR review,
- no overwrite of project-owned `AGENTS.md`, package files, CI, MCP, global config, or product source outside the approved sync scope.

## Validation Evidence

Fresh commands run on this branch:

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | pass | clean baseline before source refresh; source freshness records/report and this audit are the only expected changed files before commit |
| `git diff --check` | pass | no whitespace errors; Git emitted Windows LF-to-CRLF working-copy notices only |
| `node --test scripts/test-*.mjs` | pass | 26 passed, 3 skipped bash checks on Windows host |
| `node scripts/validate-toolkit.mjs` | pass | 11 checks; registries=6, evals=6, sources=22 |
| `node scripts/check-source-freshness.mjs --fail-on-change` | pass | 22 unchanged; GitHub API 403 fallbacks stayed read-only `git ls-remote` checks |
| `node scripts/validate-public-package.mjs` | pass | public files scanned: 29; findings: 0 |
| `node scripts/validate-level4-readiness.mjs` | blocked as expected | Level 3 current state; Level 4 evidence deferred |
| `node scripts/ai-toolkit/validate-ai-toolkit.mjs` | pass | embedded package validation |
| `node scripts/ai-toolkit/validate-codex-runtime.mjs` | pass | 14 skills and 5 project agents |
| `node scripts/ai-toolkit/validate-version-consistency.mjs` | pass | no WARN output |
| `node scripts/ai-toolkit/run-toolkit-evals.mjs` | pass | routing/runtime evals passed |

## Split Plan

### PR A - Evidence-Only Operationalization Report

Status: this branch.

Scope:

- Record final audit evidence and split plan.
- Refresh source-freshness evidence if live upstream metadata moves before merge.
- Do not activate new repo agents.
- Do not touch global Codex state.
- Do not sync RISS V2.
- Do not change package, lockfile, CI, MCP, compiled agents, or product repositories.

### PR B - Repo-Local Specialist Agent Activation

Requires explicit owner approval because it expands persistent repo runtime activation.

Proposed scope:

- Add repo-local read-only TOMLs for `product-agent`, `architect-agent`, `uiux-agent`, and `skill-scout-agent`.
- Update `scripts/ai-toolkit/embedded-data.mjs`, runtime docs, embedded manifest/mirrors, and validators/evals.
- Keep backend, database, SRE, and any high-risk execution agents fallback-only unless separately approved.
- Re-run the full validator spine.

### PR C - Global Codex Cleanup Audit

Requires explicit owner approval and backup because it touches user-global state outside the repo.

Proposed scope:

- Back up global `~/.codex/agents` and `~/.codex/skills`.
- Classify duplicate global skills as keep, archive, or remove-candidate.
- Do not delete or modify global files without owner approval after the classification report.

### PR D - Source/Tool Utilization Follow-Up

Optional later hardening.

Proposed scope:

- Convert approved `planned-extraction` source intelligence into normalized toolkit-owned methods or evals.
- Keep all source records `neverAutoImport`.
- Do not install, clone, run, copy, or activate upstream content.

## Recommendation

Proceed with PR A as a draft evidence PR. Treat PR B as the next operationalization decision: it is valuable for high-grade coding work, but it is a real runtime-surface expansion and should not be bundled with evidence cleanup or global cleanup.
