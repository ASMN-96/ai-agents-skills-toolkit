# Specialist Agent Activation Audit

Date: 2026-06-01

Branch: `codex/activate-specialist-agents`

Baseline: `main` at PR #50 merge commit `0c318f8de8da0a9e7764575cd2096f20310cb758`.

## Summary

This PR activates the approved missing specialist agents as repo-local project custom agents under `.codex/agents`. It keeps activation repo-local, keeps the agents advisory/read-only, preserves no-fake-validation boundaries, and updates embedded `.ai-toolkit` mirrors and manifest evidence.

No product repository sync, RISS V2 sync, package change, lockfile change, CI change, MCP configuration, global Codex mutation, source-record update, or top-level compiled-agent regeneration was performed.

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
- `security-agent`
- `qa-test-agent`
- `release-manager-agent`
- `skill-scout-agent`

The active repo-local project custom-agent count is now 9.

## Agents Intentionally Not Activated

- `backend-contract-agent`: deferred because the top-level agent spec is still a stub and backend contract work can affect payloads, auth, compatibility, and public/private boundaries.
- `database-rls-agent`: deferred because the top-level agent spec is still a stub and database/RLS work can affect data isolation, migrations, destructive operations, and production safety.
- `sre-performance-agent`: deferred because the top-level agent spec is still a stub and SRE work can affect production operations, performance claims, rollout safety, monitoring, and incident posture.

No `fullstack-agent`, `devops-platform-agent`, `super-agent`, `all-purpose-agent`, or RISS-specific global agent was created.

## Runtime Boundary Changes

- Added four repo-local `.codex/agents/*.toml` files:
  - `product-agent`
  - `architect-agent`
  - `uiux-agent`
  - `skill-scout-agent`
- Each new TOML is read-only and names only canonical skills: `governance`, `uiux`, `code-quality`, `security-review`, and `pr-release-gate`.
- Each new TOML forbids package changes, CI changes, MCP configuration, global config changes, product-repository sync, secret access, broad automatic changes, and fake tool/validation claims unless separately approved and evidenced.
- `.ai-toolkit` remains non-runtime storage. Embedded runtime-agent mirrors, packaged source mirrors, packaged compiled-agent mirrors, manifest hashes, and source-of-truth docs were updated only to keep validator evidence consistent with repo-local activation.

## Profile And Routing Impact

Profiles and routing already referenced these specialist agents as selected or recommended lenses. This PR changes runtime availability for four approved agents from compiled fallback/selected lens to repo-local `.codex/agents` visibility. It does not claim any agent spawned in the current task.

Completion reports must continue distinguishing selected/recommended agents, active repo-local TOMLs, compiled fallback material, inline lens use, and actually spawned agents.

## Global/User Skill Audit Result

Read-only global/user audit found:

- `$HOME/.agents/skills`: not present.
- `~/.codex/skills`: contains legacy/user skill directories including `riss-governance`, `vd-premium-uiux`, `riss-agent-governance`, and `riss-skill-governance`.
- `~/.codex/agents`: contains existing personal custom-agent TOMLs including specialist-agent names.

Canonical global skill names expected for any future cleanup plan are `governance`, `uiux`, `code-quality`, `security-review`, and `pr-release-gate`, but global installation is not required by this PR. No global or user files were changed. Any future cleanup requires backup, classification, owner approval, and explicit write authorization.

## Files Changed

- `.codex/agents/architect-agent.toml`
- `.codex/agents/product-agent.toml`
- `.codex/agents/skill-scout-agent.toml`
- `.codex/agents/uiux-agent.toml`
- `.ai-toolkit/runtime-agents/*.toml` mirrors for the four new active agents
- `.ai-toolkit/agents/*.md` packaged mirrors for the four new active agents
- `.ai-toolkit/compiled-agents/*.compiled.md` packaged mirrors for the four new active agents
- `.ai-toolkit/manifest.json`
- `.ai-toolkit/README.md`
- `.ai-toolkit/source-of-truth-map.json`
- `.ai-toolkit/registries/agents.registry.json`
- `.ai-toolkit/scripts-manifest.json`
- `registries/agents.registry.json`
- `docs/RUNTIME_ACTIVATION_MODEL.md`
- `scripts/ai-toolkit/embedded-data.mjs`
- `scripts/ai-toolkit/validate-codex-runtime.mjs`
- `docs/SPECIALIST_AGENT_ACTIVATION_AUDIT_2026-06-01.md`

## Validation Results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | pass | expected activation files only before commit |
| `git diff --check` | pass | no whitespace errors; Git emitted Windows LF-to-CRLF working-copy notices only |
| `node --test scripts/test-*.mjs` | pass | 26 passed, 3 skipped bash checks on Windows host |
| `node scripts/validate-toolkit.mjs` | pass | 11 checks; registries=6, evals=6, sources=22 |
| `node scripts/check-source-freshness.mjs --fail-on-change` | pass | 22 unchanged, 0 check-failed |
| `node scripts/validate-public-package.mjs` | pass | public files scanned: 29; findings: 0 |
| `node scripts/validate-level4-readiness.mjs` | blocked as expected | Level 3 current state; Level 4 evidence deferred |
| `node scripts/ai-toolkit/validate-ai-toolkit.mjs` | pass | embedded package validation |
| `node scripts/ai-toolkit/validate-codex-runtime.mjs` | pass | active runtime now validates 14 skills and 9 project agents |
| `node scripts/ai-toolkit/validate-version-consistency.mjs` | pass | version consistency preserved |
| `node scripts/ai-toolkit/run-toolkit-evals.mjs` | pass | routing/runtime evals passed |

## Source Freshness Result

Source freshness is clean:

- `UNCHANGED`: 22
- `CHANGED_LOW_RISK`: 0
- `CHANGED_REVIEW_REQUIRED`: 0
- `CHANGED_HIGH_RISK`: 0
- `CHECK_FAILED`: 0

The run used read-only GitHub metadata and `git ls-remote` fallback where reported. No source records were changed in this PR.

## Security And Production Risks

- Runtime surface expands from 5 to 9 repo-local project custom agents, but the four new agents are read-only advisory agents.
- Backend, database/RLS, and SRE agents remain deferred to avoid activating high-risk stubbed domains.
- No package, lockfile, CI, MCP, global config, product repository, or source-record changes were made.
- No scanner, browser, source freshness, CodeRabbit, or validation result is claimed without observed output.

## Explicit Non-Goals

- Do not merge this PR without owner review.
- Do not activate backend/database/SRE agents in this PR.
- Do not modify global/user Codex files.
- Do not sync RISS V2.
- Do not create broad agents such as fullstack, devops-platform, super, or all-purpose agents.
- Do not install tools, configure MCP, change CI, change package files, regenerate top-level compiled agents, or import upstream source content.

## Remaining Owner Decisions

- Whether to activate `backend-contract-agent`, `database-rls-agent`, and `sre-performance-agent` after their specs are upgraded from stubs and stricter advisory boundaries are approved.
- Whether to run a separate global/user Codex cleanup PR or operator task with backup and explicit write approval.
- Whether to trigger CodeRabbit after draft PR creation and before marking ready for review.
