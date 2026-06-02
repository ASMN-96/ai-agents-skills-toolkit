# Overlap Reduction

## Purpose

This document classifies toolkit areas that overlap with Codex-native capabilities, installed plugins, or external skill behavior. The goal is to keep the toolkit as a lean governance and provenance layer instead of a second Codex runtime.

Classification is first. Files should not be deleted aggressively in this phase. Remove only clearly obsolete generated/mock artifacts that are safe to remove. Otherwise mark duplicated areas as `candidate-removal` for a later explicitly approved cleanup.

## Status Values

- `keep-active`: Preserve as an active toolkit governance or project-specific asset.
- `delegate-to-codex-plugin`: Use Codex-native capability or installed plugin as the execution authority; keep only policy or routing notes here.
- `passive-reference`: Keep as non-runtime reference metadata, source record, or summarized guidance.
- `candidate-removal`: Candidate for later explicit cleanup; do not remove in this PR unless clearly obsolete/generated/mock.

## Classifications

| Area | Status | Rationale |
| --- | --- | --- |
| Superpowers/TDD/debugging/review discipline | `delegate-to-codex-plugin` | Superpowers is already installed as external execution discipline. Toolkit should keep only governance gates and source references, not duplicate method bodies or runtime behavior. |
| GitHub/PR/CI operations | `delegate-to-codex-plugin` | GitHub plugin and `gh` workflows are the execution authority. Toolkit keeps branch, PR, checks, review, and no-direct-main policy. |
| Supabase implementation details | `delegate-to-codex-plugin` | Supabase plugin/official docs own live implementation behavior. Toolkit keeps database/RLS/security gates and source records only. |
| Vercel/Cloudflare/Expo/iOS/Android plugin workflows | `delegate-to-codex-plugin` | Installed plugins and native tools own platform-specific execution. Toolkit may route or require approval but should not copy workflow details. |
| Browser/Playwright automation | `delegate-to-codex-plugin` | Browser, Chrome, Playwright, and verification plugins own runtime automation. Toolkit keeps when-to-verify gates and evidence requirements. |
| Generic frontend/UI guidance | `passive-reference` | Keep only general quality references unless guidance is project-specific or tied to `uiux`. Do not duplicate frontend plugin behavior. |
| External marketplace source discovery/install advice | `passive-reference` | Keep discovery/install sources as untrusted reference records. Do not present install commands as default actions. Some narrow install-oriented records may become `candidate-removal` later. |
| `governance` | `keep-active` | Primary governance entrypoint for serious toolkit/project work, source-of-truth checks, risk routing, and completion discipline. |
| `uiux` | `keep-active` | Differentiated UI/UX quality skill for premium product polish when UI/UX is in scope. |
| Source safety scoring | `keep-active` | Core supply-chain and external-source review function. |
| Source watchlist/freshness policy | `keep-active` | Core provenance and upstream-currency function. |
| Project-sync/version-pin tooling | `keep-active` | Core controlled sync mechanism for project artifacts; dry-run-first and version-pinned. |
| Compiled agents | `keep-active` | Optional project artifacts and fallback source material. They are not mandatory always-on runtime layers. |

## Candidate Removal Queue

No files are removed by this classification alone. Future cleanup may consider removing or consolidating duplicated passive method files only after a separate review proves they are obsolete, generated/mock, or fully replaced by Codex/plugin authority.

Current candidate-removal areas:

- duplicated generic execution-discipline method text that adds no project-specific governance beyond Superpowers,
- stale mock freshness artifacts once live reports fully replace them,
- install-oriented marketplace guidance that is not needed for source safety or provenance.

## Runtime Activation Boundary

This overlap reduction phase must not modify runtime activation surfaces:

- no `~/.codex/agents`,
- no `.codex/agents`,
- no `.agents/skills`,
- no global Codex config,
- no skill/plugin/tool installs or activations,
- no product repository syncs.
