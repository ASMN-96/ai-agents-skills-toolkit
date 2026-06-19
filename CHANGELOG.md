# Changelog

All notable changes to AI Agent Skills Toolkit are documented here. This repository is not a Node package; versions describe controlled toolkit evidence states, not package publication.

Release cadence: controlled toolkit releases are cut when governance, runtime-boundary, source-freshness, eval, leak-scan, and release-readiness evidence is current. Security or source-safety corrections may be documented under `Unreleased` until a controlled release note supersedes them.

## Unreleased

## v0.2.5

- Refreshed Microsoft Playwright and GSD Core watched-source metadata after upstream movement following v0.2.4.
- Preserved Playwright as `SYNCED_PLUGIN_DELEGATED` and GSD Core as `SYNCED_REFERENCE`; no install, import, activation, package, CI, MCP, global config, or product-repo changes are approved by this release.
- Regenerated compiled agents and the embedded `.ai-toolkit` package for `0.2.5`.
- See `docs/V0_2_5_RELEASE_NOTES.md`.

## v0.2.4

- Completed approved agent hardening for frontend, QA, and security agent definitions.
- Added compiled-agent promotion and parity validation so approved registry agents compile as approved only when source quality, profile refs, method refs, source content, and embedded mirrors match.
- Fixed project-context preflight traversal and validation to exclude nested worktree checkout paths.
- Added evidence-backed metadata-only enterprise-risk review fields for baseline tools, GSD Core, Repomix, and delegated CodeRabbit posture.
- Added product-neutral PR, commit, design-doc, and incident-report templates with agent/skill routing references.
- Expanded security-hardening, code-quality, and UIUX evidence guidance.
- Regenerated compiled agents and the embedded `.ai-toolkit` package for `0.2.4`.
- See `docs/V0_2_4_RELEASE_NOTES.md`.

## v0.2.3

- Added current-state audit remediation matrix for the 2026-06-07 audit pass.
- Split agent registry runtime truth into TOML file presence, compiled fallback presence, registry recommendation, and actual spawn proof.
- Added compiled-agent provenance metadata from `git rev-parse HEAD`, compiler path, source agent path, and registry input path.
- Added explicit enterprise tool review states and validator checks for unreviewed blocked tools.
- Added manual reviewed-doc source tracking for GitLab documentation sources.
- Added shared eval contract documentation and stricter eval runner checks for unsafe actions, forbidden aliases, forbidden claims, review behaviors, and mirror parity.
- Added source provenance audit coverage for Trail of Bits, Vercel, Karpathy, Impeccable, RuFlo, Everything Claude Code, and GitLab docs.

- Completed full resource refresh with zero passive source holds.
- Resolved reviewed source decisions through `SYNCED_ADOPTED`, `SYNCED_REFERENCE`, or `SYNCED_PLUGIN_DELEGATED` outcomes.
- Strengthened Supabase, Trail of Bits, Playwright, shadcn/ui, Vercel, Impeccable, Everything Claude Code, code-review-graph, and RuFlo boundaries.
- Preserved no product-repo writes, dependency installs, package changes, CI wiring, MCP/global config, raw upstream runtime behavior, or broad cross-runtime active support.
- See `docs/V0_2_3_RELEASE_NOTES.md`.

## v0.2.2

- Added no-write public/private leak-scan validation mode.
- Hardened tool activation posture with `active-if-detected`, `owner-approved-install`, `ci-advisory`, `ci-blocking-after-calibration`, and forbidden-runtime boundaries.
- Preserved source-freshness and no-fake-validation evidence reporting.
- Historical release only; superseded by v0.2.3 as the current controlled release evidence.
- See `docs/V0_2_2_RELEASE_NOTES.md`.

## v0.2.1

- Consolidated v0.2 hardening follow-ups around runtime activation posture, source freshness, public positioning, and release metadata.
- Kept package publication, marketplace submission, product-repository mutation, and external runtime activation out of scope.

## v0.2.0

- Added governance spine docs, registry contracts, external-source backlog, registries, routing/eval scaffolding, missing-skill discovery policy, token-efficiency policy, runtime verification docs, and v0.2 project tooling posture.
- Added project-managed skill sync for selected toolkit-owned skills under `.ai-toolkit/skills/`.
- Added normal-language task intake, governance routing, source-safety, release, security, UI/UX, and quality method scaffolding.
- See `docs/V0_2_0_RELEASE_NOTES.md`.

## v0.1.0

- Initialized toolkit structure.
- Added first internal agent specification, source evaluation records, normalized method extraction drafts, compiled agent drafts, reusable profiles, dry-run-first project install/update/validation scripts, project sync workflow documentation, and early governance entrypoint policy.
