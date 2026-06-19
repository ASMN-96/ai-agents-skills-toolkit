# GSD Core

- URL: https://github.com/open-gsd/gsd-core
- Previous URL: https://github.com/gsd-build/get-shit-done
- Owner / publisher: open-gsd.
- Source type: Phase/state governance CLI/package and spec-driven development system.
- Review date: 2026-06-20.
- Pinned repo ref checked: `7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034` on default branch `next`, verified with read-only GitHub metadata and `git ls-remote`.
- License status: GitHub API reports MIT.
- Recommendation: first-class governed tool metadata in `registries/tools.registry.json` as `gsd-core`; use `active-if-detected` when already project/operator-owned and `owner-approved-install` when absent.

## Relocation Evidence

The previous GSD repository, `gsd-build/get-shit-done`, now states that GSD has moved and points users to `open-gsd/gsd-core` as the active repository for source code, issues, releases, and contribution work.

## Toolkit Value

GSD Core is useful as phase/state planning and execution discipline for serious multi-step governed work, source adoption, release work, and cross-repo/toolkit sync when it is already available in the project/operator environment or explicitly approved for installation.

## Security Notes

Treat GSD Core as a moving external tool source. Its install command, package behavior, scripts, hooks, and runtime workflow output must not be treated as active toolkit behavior from registry presence alone.

## Forbidden By Default

- Do not vendor or copy raw GSD Core source files into the toolkit.
- Do not execute installer commands or package-manager commands from this source record.
- Do not mutate global Codex config, project repositories, package files, CI, MCP, hooks, credentials, or deployment settings from source metadata.
- Do not claim GSD was invoked unless current observed workflow output proves it.

## Freshness Review 2026-06-19

Skill Scout read-only review added GSD Core as a first-class governed tool source after confirming the canonical repository moved to `open-gsd/gsd-core`. The active default branch is `next`; `git ls-remote` returned `0d56f544d2f6616fcdd0a80279f85380ead4ceb0` for `HEAD` and `refs/heads/next`, while `refs/heads/main` remains at `350fba48b591144bab3f39bf08bcbdf8eb2b913d`.

Outcome: `SYNCED_REFERENCE`.

This refresh updates source and tool metadata only. It does not approve raw source copying, vendoring, install, activation, package changes, CI wiring, MCP setup, hooks, global configuration changes, product-repository mutation, or runtime behavior changes.

## Freshness Review 2026-06-20

Skill Scout read-only follow-up reviewed upstream default-branch movement from `0d56f544d2f6616fcdd0a80279f85380ead4ceb0` to `7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034` using `git ls-remote`, GitHub compare metadata, commit metadata, changed-file metadata, and license metadata only. The compare was 1 commit ahead and touched only `.github/CODEOWNERS`, adding a maintainer to the reviewer pool. GitHub license metadata continued to report MIT.

Outcome: `SYNCED_REFERENCE`.

Decision: keep GSD Core as first-class governed metadata with active-if-detected or owner-approved-install posture. This refresh updates source and tool metadata only. It does not approve raw source copying, vendoring, install, activation, package changes, CI wiring, MCP setup, hooks, global configuration changes, product-repository mutation, or runtime behavior changes.
