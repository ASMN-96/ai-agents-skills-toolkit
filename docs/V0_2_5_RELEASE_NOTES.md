# v0.2.5 Source Freshness Refresh

> Current controlled source-freshness release. `v0.2.5` supersedes `v0.2.4` for watched-source freshness claims.

## Benefit

v0.2.5 unblocks downstream project sync by refreshing watched-source review metadata after Playwright and GSD Core moved immediately after v0.2.4. The release keeps the v0.2.4 agent/risk hardening intact while making the freshness gate green again.

## What Changed Since v0.2.4

- Refreshed Microsoft Playwright from `11797b0336d50ab0d8bc554f53fcd8d4aab8438e` to `32883517ffe7725ef45ac2dc020a63962c27d7a3`.
- Refreshed GSD Core from `0d56f544d2f6616fcdd0a80279f85380ead4ceb0` to `7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034`.
- Updated root and embedded source records, watchlist metadata, and enterprise-risk evidence for those two watched sources.
- Regenerated compiled agents and the embedded `.ai-toolkit` package for `0.2.5`.

## Boundaries

This release is metadata-only for external sources. It does not import upstream source, install Playwright or GSD, activate runtime behavior, modify product repositories, change package files or lockfiles, configure CI/MCP, or modify global Codex config.
