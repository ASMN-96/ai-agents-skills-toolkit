# Specialist Agent Activation Audit

Date: 2026-06-01

Branch: `codex/activate-specialist-agents`

Baseline: `main` at PR #50 merge commit `0c318f8de8da0a9e7764575cd2096f20310cb758`.

## Summary

This PR activates the approved specialist agents as repo-local project custom agents under `.codex/agents`. It keeps activation repo-local, keeps the agents advisory/read-only, preserves no-fake-validation boundaries, and updates compiled fallback plus embedded `.ai-toolkit` mirror and manifest evidence.

No product repository sync, RISS V2 sync, package change, lockfile change, CI change, MCP configuration, global Codex mutation, source import, scanner activation, or production-impacting operation was performed. A scoped source-freshness refresh was performed only after live validation found changed watched sources.

## Agents Active Before

- `reviewer-agent`
- `frontend-agent`
- `security-agent`
- `qa-test-agent`
- `release-manager-agent`

## Agents Active After

- `product-agent`
- `architect-agent`
- `reviewer-agent`
- `uiux-agent`
- `frontend-agent`
- `backend-contract-agent`
- `database-rls-agent`
- `security-agent`
- `qa-test-agent`
- `release-manager-agent`
- `skill-scout-agent`
- `sre-performance-agent`

The active repo-local project custom-agent count is now 12.

## Agents Intentionally Not Activated

None. The three previously deferred agents were upgraded from stubs to professional, bounded, read-only advisory specs before activation.

No `fullstack-agent`, `devops-platform-agent`, `super-agent`, `all-purpose-agent`, or RISS-specific global agent was created.

## Runtime Boundary Changes

- Added seven repo-local `.codex/agents/*.toml` files:
  - `product-agent`
  - `architect-agent`
  - `uiux-agent`
  - `backend-contract-agent`
  - `database-rls-agent`
  - `skill-scout-agent`
  - `sre-performance-agent`
- The seven newly activated TOMLs are read-only and name only canonical skills: `governance`, `uiux`, `code-quality`, `security-review`, and `pr-release-gate`.
- Each new TOML forbids package changes, CI changes, MCP configuration, global config changes, product-repository sync, secret access, production/data/destructive changes, broad automatic changes, scanner/tool/browser/runtime claims without output, and fake validation claims unless separately approved and evidenced.
- `.ai-toolkit` remains non-runtime storage. Embedded runtime-agent mirrors, packaged source mirrors, packaged compiled-agent mirrors, manifest hashes, and source-of-truth docs were updated only to keep validator evidence consistent with repo-local activation.

## Deferred-Agent Hardening

The three deferred agents were upgraded from stub specs before activation:

- `backend-contract-agent`: hardened for API route/interface inventory, OpenAPI-style contract shape, OWASP API Security Top 10 risk screens, payload/type/schema safety, auth/session assumptions, public/private payload boundaries, compatibility, contract validation evidence, rollback/migration impact, and escalation to `security-review` or `database-rls-agent`.
- `database-rls-agent`: hardened for Supabase/Postgres RLS boundaries, affected schema/table/policy review, tenant/project/user isolation, SELECT/INSERT/UPDATE/DELETE behavior, service-role/client-role separation, migration/destructive risk, seed/mock safety, public/private exposure, audit/logging, rollback, and verification-query evidence.
- `sre-performance-agent`: hardened for performance-sensitive surfaces, bundle/render/network/runtime risk, Google SRE golden signals, OpenTelemetry logs/metrics/traces assumptions, monitoring/alerting readiness, CI/runtime failure modes, rollout/revert planning, release risk, and measurement-backed performance claims.

## Profile And Routing Impact

Profiles and routing already referenced these specialist agents as selected or recommended lenses. This PR changes runtime availability for seven approved agents from compiled fallback/selected lens to repo-local `.codex/agents` visibility. It does not claim any agent spawned in the current task.

Completion reports must continue distinguishing selected/recommended agents, active repo-local TOMLs, compiled fallback material, inline lens use, and actually spawned agents.

## Global/User Skill Audit Result

Read-only global/user audit found:

- `$HOME/.agents/skills`: not present.
- `~/.codex/skills`: contains legacy/user skill directories including `riss-governance`, `vd-premium-uiux`, `riss-agent-governance`, and `riss-skill-governance`.
- `~/.codex/agents`: contains existing personal custom-agent TOMLs including specialist-agent names.

Canonical global skill names expected for any future cleanup plan are `governance`, `uiux`, `code-quality`, `security-review`, and `pr-release-gate`, but global installation is not required by this PR. No global or user files were changed. Any future cleanup requires backup, classification, owner approval, and explicit write authorization.

## Files Changed

- `.codex/agents/architect-agent.toml`
- `.codex/agents/backend-contract-agent.toml`
- `.codex/agents/database-rls-agent.toml`
- `.codex/agents/product-agent.toml`
- `.codex/agents/skill-scout-agent.toml`
- `.codex/agents/sre-performance-agent.toml`
- `.codex/agents/uiux-agent.toml`
- `agents/backend-contract-agent.md`
- `agents/database-rls-agent.md`
- `agents/sre-performance-agent.md`
- `compiled-agents/*.compiled.md` regenerated for active/dependent compiled fallback consistency
- `.ai-toolkit/runtime-agents/*.toml` mirrors for the seven newly active agents
- `.ai-toolkit/agents/*.md` packaged mirrors for the seven newly active agents
- `.ai-toolkit/compiled-agents/*.compiled.md` packaged mirrors for active agents
- `.ai-toolkit/manifest.json`
- `.ai-toolkit/README.md`
- `.ai-toolkit/source-of-truth-map.json`
- `.ai-toolkit/registries/agents.registry.json`
- `.ai-toolkit/scripts-manifest.json`
- `registries/agents.registry.json`
- `sources/playwright.md`
- `sources/shadcn-ui.md`
- `sources/vercel-agent-skills.md`
- `sources/source-watchlist.json`
- `docs/RUNTIME_ACTIVATION_MODEL.md`
- `scripts/ai-toolkit/embedded-data.mjs`
- `scripts/ai-toolkit/build-embedded-package.mjs`
- `scripts/ai-toolkit/run-toolkit-evals.mjs`
- `scripts/ai-toolkit/validate-codex-runtime.mjs`
- `docs/SPECIALIST_AGENT_ACTIVATION_AUDIT_2026-06-01.md`

## Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | pass | expected activation and scoped source-freshness files only before commit |
| `git diff --check` | pass | no whitespace errors; Git emitted Windows LF-to-CRLF working-copy notices only |
| `node --test scripts/test-*.mjs` | pass | 26 passed, 3 skipped bash checks on Windows host |
| `node scripts/validate-toolkit.mjs` | pass | 11 checks; registries=6, evals=6, sources=22 |
| `node scripts/check-source-freshness.mjs --fail-on-change` | pass | 22 unchanged, 0 check-failed |
| `node scripts/validate-public-package.mjs` | pass | public files scanned: 29; findings: 0 |
| `node scripts/validate-level4-readiness.mjs` | blocked as expected | Level 3 current state; Level 4 evidence deferred |
| `node scripts/ai-toolkit/validate-ai-toolkit.mjs` | pass | embedded package validation |
| `node scripts/ai-toolkit/validate-codex-runtime.mjs` | pass | active runtime now validates 14 skills and 12 project agents |
| `node scripts/ai-toolkit/validate-version-consistency.mjs` | pass | version consistency preserved |
| `node scripts/ai-toolkit/run-toolkit-evals.mjs` | pass | routing/runtime evals passed |

## Source Freshness Result

Source freshness is clean:

- `UNCHANGED`: 22
- `CHANGED_LOW_RISK`: 0
- `CHANGED_REVIEW_REQUIRED`: 0
- `CHANGED_HIGH_RISK`: 0
- `CHECK_FAILED`: 0

The run used read-only GitHub metadata and `git ls-remote` fallback where reported. Playwright, shadcn/ui, and Vercel Agent Skills source records were refreshed only as source-freshness evidence. No source import, extraction, install, activation, MCP setup, package change, CI change, global config change, or product-repo change was approved or performed.

## Security And Production Risks

- Runtime surface expands from 5 to 12 repo-local project custom agents, but the seven newly active agents are read-only advisory agents.
- Backend, database/RLS, and SRE agents are activated only after stub removal and bounded advisory hardening.
- No package, lockfile, CI, MCP, global config, product repository, source import, or runtime source activation changes were made.
- No scanner, browser, source freshness, CodeRabbit, or validation result is claimed without observed output.

## Source Anchors Used For Hardening

- `backend-contract-agent`: OpenAPI Initiative / OpenAPI Specification, OWASP API Security Top 10, `code-quality`, `security-review`, `methods/osmani/api-interface-design.md`, `methods/security/differential-security-review.md`, and `docs/NO_FAKE_VALIDATION_POLICY.md`.
- `database-rls-agent`: Supabase/Postgres Row Level Security documentation, `security-review`, public/private leak gates, `methods/backend/supabase-postgres-rls-gates.md`, `methods/security/differential-security-review.md`, and `docs/NO_FAKE_VALIDATION_POLICY.md`.
- `sre-performance-agent`: Google SRE golden signals, OpenTelemetry signals, `pr-release-gate`, `methods/osmani/performance-optimization.md`, `methods/osmani/shipping-launch.md`, and `docs/NO_FAKE_VALIDATION_POLICY.md`.

## Explicit Non-Goals

- Do not merge this PR without owner review.
- Do not modify global/user Codex files.
- Do not sync RISS V2.
- Do not create broad agents such as fullstack, devops-platform, super, or all-purpose agents.
- Do not install tools, configure MCP, change CI, change package files, activate scanners, run production operations, or import upstream source content.

## Remaining Owner Decisions

- Whether to run a separate global/user Codex cleanup PR or operator task with backup and explicit write approval.
- Whether to mark PR #51 ready for review after CodeRabbit and owner review confirm the 12-agent active set.
