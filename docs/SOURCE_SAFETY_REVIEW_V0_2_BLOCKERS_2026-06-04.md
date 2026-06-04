# Source Safety Review: v0.2 Blockers

Date: 2026-06-04

Branch: `codex/source-safety-review-v0.2-blockers`

Scope: read-only deeper source-safety review for the upstream freshness movements blocking the v0.2 baseline stabilization sequence.

## Executive Summary

The current repository baseline is clean in Git, but it is not clean for the required source-freshness gate. The proposed v0.2 architecture remains a meaningful leap forward in operating model, but it must not start until the existing baseline can be stabilized without weakening source-safety policy.

The strict Stage A rule allows source-record refresh only when upstream changes are limited to docs, readme, site, or non-runtime metadata. The read-only review found that three of the four changed upstream sources include runtime, package, tooling, workflow, hook, memory, plugin, or command surfaces. Under the approved policy, those source records must stay on hold instead of being refreshed as safe baseline maintenance.

No upstream content was copied, imported, installed, activated, extracted, or executed. No source record, watchlist entry, package file, lockfile, CI file, MCP config, product repo, release metadata, or global config was changed.

## Current State

- Local branch used for this audit: `codex/source-safety-review-v0.2-blockers`.
- Baseline commit reviewed before this audit: `740da2c385f08e9316c912f3f81bc4ca7a4f903a`.
- Working tree before audit edits: clean.
- Runtime validator previously confirmed the expected active runtime shape: 5 active skills and 12 project agents.
- Live source freshness currently reports 17 unchanged sources and 4 changed sources.
- The changed sources are Microsoft Playwright, shadcn/ui, Everything Claude Code, and RuFlo.

## Target State From The Requested Closeout

The requested target state is a two-stage sequence:

1. Stage A: stabilize current `main`, merge the baseline stabilization PR, and prove post-merge `main` is clean.
2. Stage B: start fresh from updated `main`, add v0.2 full-power project tooling architecture, validate, PR, and merge.

That sequence remains correct. The blocker is that Stage A cannot honestly pass while source freshness is actionable and the changed upstream surfaces exceed the allowed docs-only refresh scope.

## Is v0.2 A Real Leap Forward?

Yes, if implemented after the baseline is clean. The target v0.2 architecture would move the toolkit from governance-first metadata into a practical project tooling operating model:

- lanes for governance, UI/UX evidence, frontend quality, backend/security, mobile/WebView contracts, architecture intelligence, review/release evidence, and source safety;
- installation classifications that separate default tools, project-type tools, use-if-existing tools, external-only tools, approval-required tools, active references, pilot-only tools, and removed/archive tools;
- project profiles and templates that can guide adoption without editing package files or wiring CI automatically;
- planner/apply scripts that keep recommendations separate from actual execution;
- explicit no-fake-validation boundaries;
- mobile, WebView, cross-surface API, package-manager migration, and agent command-safety methods.

The leap is architectural and operational, not runtime activation. It becomes valuable only if the toolkit preserves its supply-chain boundary: registry/source metadata is not execution, and freshness refresh is not import/install/activation approval.

## Evidence Collected

Read-only commands and sources used:

- `git branch --show-current`
- `git status --short`
- `git rev-parse HEAD`
- `node scripts/check-source-freshness.mjs --fail-on-change`
- GitHub compare metadata for the four changed upstream repositories.
- GitHub license metadata for the four changed upstream repositories.
- Local policy: `docs/EXTERNAL_SOURCE_FRESHNESS_POLICY.md`
- Local method: `methods/internal/source-safety-scoring.md`

No clone, checkout, package install, script execution, external tool activation, source copying, method extraction, or runtime configuration change was performed.

## Source Review Matrix

| Source | Reviewed commit | Latest commit | License signal | Changed surface | Safety score | Classification | Stage A decision |
| --- | --- | --- | --- | --- | ---: | --- | --- |
| Microsoft Playwright | `16601141918a7163b87a7ec84060451f6c1bbbfd` | `fd47b67492615d83f8fd3aa73b65f20947f4078f` | Apache-2.0 | GitHub action, package metadata, lockfile, client/server runtime code, types, tests, HAR/trace/network/waiter behavior | 68 | Reference only for this gate | Hold; not eligible for docs-only refresh |
| shadcn/ui | `cd54e0927f3853a777f700a0bbf34507cf697b9c` | `d84c4a8ca5aeac51a6311023bef36e5b04a3de50` | MIT | Registry directory metadata | 74 | Reference only | Separately refreshable if isolated, but does not clear full Stage A |
| Everything Claude Code | `0f84c0e2796703fbda87d577b2636351418c7442` | `bc8e12bb80c904a5a9864797ef1fd1212aa82f3d` | MIT | Plugin manifests, package metadata, install modules, control-pane scripts, server/state/UI code, new skills, orchestration docs, tests | 42 | Reference only | Hold; not eligible for docs-only refresh |
| RuFlo | `844f68dbe5f28c4c2b13c56e8e102528aa63b629` | `d065b15927c6ba7318623e8af123e7980e4c6681` | MIT | Auto-memory hook, package metadata, lockfile, embeddings command, memory bridge code/tests, global npm lookup behavior | 39 | Reference only | Hold; not eligible for docs-only refresh |

## Microsoft Playwright Review

Playwright remains a high-trust source and is useful for browser evidence, UI test strategy, and web app verification methods. The upstream movement is not a passive docs-only update.

The compare includes:

- `.github/actions/upload-blob-report/action.yml`;
- `package.json` and `package-lock.json`;
- Playwright client and core type definitions;
- runtime client code under `packages/playwright-core/src/client`;
- runtime server code under `packages/playwright-core/src/server`;
- HAR, trace, network, waiter, page, frame, worker, browser context, Android, and Electron surfaces;
- installation and library tests.

The change appears coherent with feature work around AbortSignal support and test/leak fixes, but it still touches runtime behavior and dependency metadata. Under strict Stage A rules, this cannot be refreshed as docs/readme/site/non-runtime metadata.

Decision: hold for separate Playwright source-record review. Do not import code, update package versions, copy tests, run Playwright upstream scripts, modify CI, or treat the source as refreshed for the baseline PR.

## shadcn/ui Review

The shadcn/ui movement appears limited to a registry directory metadata entry. It does not by itself show package, CLI, component-source, lockfile, workflow, or runtime changes in the compare reviewed.

This source can remain a design-system and component-pattern reference only. It should not be treated as permission to run the shadcn CLI, import components, copy registry content, change package files, or override product design-system decisions.

Decision: eligible for a narrow metadata-only refresh only if handled separately and if the other blockers are resolved. It does not unblock Stage A alone.

## Everything Claude Code Review

Everything Claude Code remains useful as a source-safety and cross-harness cautionary reference. The reviewed upstream movement includes execution and configuration surfaces that directly conflict with a docs-only baseline refresh.

The compare includes:

- plugin marketplace and plugin metadata;
- `AGENTS.md`, README, and translated docs;
- package metadata and install module metadata;
- control-pane script, server, state, and UI code;
- new dynamic workflow and team-agent-orchestration skill files;
- orchestration content-pack documentation;
- tests for dynamic workflow, control-pane state, and scripts.

The source has clear license metadata, but it carries high execution/config-mutation risk because it includes plugin, skill, install-module, control-plane, command, state, and cross-harness surfaces. The source should remain reference-only unless a separate owner-approved extraction phase defines a narrow normalized method target.

Decision: hold. Do not refresh as safe baseline metadata. Do not install, activate, copy skills, copy plugin metadata, import command behavior, run scripts, configure MCP, change global config, or claim any active runtime support.

## RuFlo Review

RuFlo remains useful as source-safety and orchestration-risk evidence, but the upstream movement is high-risk for baseline freshness because it touches runtime hooks, memory, commands, package metadata, and global install lookup behavior.

The compare includes:

- `.claude/helpers/auto-memory-hook.mjs`;
- package and lockfile metadata;
- CLI embeddings command code;
- memory bridge code and tests;
- package descriptions for swarm, MCP, vector memory, and self-learning surfaces;
- global npm prefix fallback behavior in helper resolution.

The license signal remains MIT, but the source retains very high runtime, daemon, MCP, hook, memory, persisted-state, file-write, and background-process risk. The current movement also references auto-memory, global npm install lookup, model download options, and project path handling.

Decision: hold. Do not refresh as safe baseline metadata. Do not install, run hooks, copy memory bridge behavior, import daemon or MCP patterns, run benchmarks/scripts, change global config, or extract runtime orchestration behavior.

## Why Stage A Must Stay Stopped

The approved Stage A rule says to refresh source records only if upstream changes are docs/readme/site/non-runtime metadata and no license/runtime/tooling/install/security-sensitive behavior changed.

The current evidence contradicts that requirement for Playwright, Everything Claude Code, and RuFlo. Continuing Stage A by refreshing those records would weaken the repository's source-safety boundary and make the baseline look cleaner than it is.

## Approved And Rejected Actions

Approved in this review:

- Read local policy and method files.
- Run live source freshness monitoring.
- Inspect GitHub compare metadata.
- Inspect GitHub license metadata.
- Write this repo-local audit artifact.

Rejected in this review:

- source-record refresh;
- `sources/source-watchlist.json` update;
- `docs/SOURCE_FRESHNESS_REPORT.md` regeneration as a passing artifact;
- package or lockfile changes;
- CI workflow changes;
- upstream source copying;
- method extraction;
- external script execution;
- package installation;
- external skill activation;
- MCP or global Codex config changes;
- product repository changes;
- v0.2 architecture implementation.

## Recommended Next Milestone

Create a dedicated source-safety resolution phase before restarting Stage A:

1. Decide whether runtime/package/tooling upstream movement can be documented as reviewed source-record metadata without being considered docs-only.
2. If yes, create a narrow source-record refresh PR that explicitly states no import, install, activation, method extraction, package update, CI change, MCP change, global config change, or product repo change is approved.
3. If no, mark Playwright, Everything Claude Code, and RuFlo as held until a deeper owner-approved review defines exact extraction or reference boundaries.
4. Only after source freshness is clean under the approved policy should the baseline stabilization PR resume.
5. Only after Stage A is merged and post-merge checks pass should v0.2 architecture work begin.

## Final Decision

Option 1 is the correct strict-safety path. Stage A remains blocked, Stage B remains not started, and the source-safety boundary remains intact.
