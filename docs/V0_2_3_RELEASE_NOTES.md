# v0.2.3 Full Resource Refresh

> Current controlled release evidence. `v0.2.3` supersedes `v0.2.2`; do not use v0.2.2 source-freshness, tool-posture, or readiness evidence for current release claims without rerunning the relevant validators.

v0.2.3 resolves the source-freshness backlog without passive holds. The goal is not to hide risk; it is to review the latest upstream state, adopt useful guidance into toolkit-owned methods/routing/evals where safe, delegate live execution to first-party or project-owned tools where appropriate, and keep unsafe runtime behavior out of the toolkit.

## Source Decisions

| Source | Latest reviewed commit | v0.2.3 outcome | Active toolkit use | Boundary |
| --- | --- | --- | --- | --- |
| Supabase Agent Skills | `1356046015476711a769601079262b5635929427` | `SYNCED_PLUGIN_DELEGATED` | Cleanroom RLS/auth/API/release gates; live operations delegated to Supabase plugin/project tooling | No Supabase CLI, database, migration, RLS, env, MCP, package, product-repo, or raw skill behavior |
| Trail of Bits Skills | `d5fe2e6a7896236c3102fd5477e833623ad70298` | `SYNCED_ADOPTED` | License-safe differential security review discipline | No raw CC-BY-SA text, plugin import, scripts, CI, MCP, package, or runtime behavior |
| Microsoft Playwright | `ae106c05e5a40486ab5b9704234c32f0499e9719` | `SYNCED_PLUGIN_DELEGATED` | Browser-evidence and rendered-validation guidance; project-owned Playwright/browser execution | No browser downloads, upstream runner/config import, MCP, package, CI, or fake browser evidence |
| shadcn/ui | `7dfd933102fdb881f8abd24fc1ef11a669682b94` | `SYNCED_REFERENCE` | Design-system reference guidance in toolkit-owned UIUX method | No CLI, registry/component import, package metadata, lockfile, MCP, or dependency changes |
| Vercel find-skills | `a561e790756b2785b9ddb82285c4eb0a08258ac9` | `SYNCED_REFERENCE` | Historical discovery-boundary reference; first-party Vercel plugin/docs preferred | No CLI/use/update/sync behavior, raw skill copy, install, or runtime activation |
| Impeccable | `6788085015400c3900cbf3a46b76f76bf489b3e3` | `SYNCED_ADOPTED` | UI quality, context-loading, polish, and rendered-evidence gates | No CLI, detector, live-browser scripts, package metadata, lockfiles, llms.txt import, or skill-bundle behavior |
| Everything Claude Code | `7113b5bf63694b716f8b2413c5919824a82fc095` | `SYNCED_REFERENCE` | Cross-harness source-safety awareness in source-safety scoring | No Claude/Cursor/Cline/OpenHands runtime support claim, adapters, MCP inventory, control plane, or global config import |
| code-review-graph | `0c9a5ff3371cf78f89032ff6936e3d3a5fedf0b8` | `SYNCED_ADOPTED` | Active read-only context graph/token governance methods | No CLI, MCP, daemon, product indexing, generated graph claims, global config, or whole-repo dumps |
| RuFlo | `d065b15927c6ba7318623e8af123e7980e4c6681` | `SYNCED_ADOPTED` | Static task-state, handoff, stop-condition, and failure-accounting discipline | No memory hooks, MCP, daemon, package, global config, background runtime, watchers, or persistence |

## Method And Routing Updates

- Supabase guidance now strengthens backend RLS gates, application-security readiness, API contract readiness, release rollback readiness, database agent checks, backend contract checks, and routing validation gates.
- Playwright guidance now strengthens browser-evidence rules while delegating execution to project-owned browser tooling.
- shadcn/ui and Impeccable guidance now strengthens design-system and premium visual quality methods without importing components or live workflows.
- Trail of Bits guidance now strengthens differential security review using cleanroom review discipline.
- RuFlo guidance now strengthens static task-state handoff without runtime orchestration.
- Toolkit-authored governance/readiness methods now use explicit cleanroom provenance instead of unresolved external-source placeholders.
- The release-manager agent is a read-only advisory release coordinator that routes final readiness posture through `pr-release-gate`.
- Enterprise governance routing evals cover normal-language features, API consumer changes, performance/cache complaints, mobile/WebView risk, package-manager migration, unsafe commands, and lightweight negative cases.
- Key readiness methods now include compact good pattern, bad pattern, evidence required, and stop condition examples.

## Positioning Boundary

v0.2.3 is enterprise-oriented toolkit hardening for governed AI coding-agent work. It does not claim certification, automatic installs, automatic runtime activation, broad cross-runtime active support, package publication, marketplace submission, default CI blocking, or product-repository mutation.

## Non-Goals

- No product repositories touched.
- No RISS V2 changes.
- No dependency installs.
- No package or lockfile changes.
- No CI wiring.
- No MCP/global configuration.
- No Supabase/Vercel/env/secrets/database migration changes.
- No raw upstream runtime behavior imported.
