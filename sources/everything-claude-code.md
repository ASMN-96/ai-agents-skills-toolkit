# Everything Claude Code

- URL: https://github.com/affaan-m/everything-claude-code
- Owner / publisher: affaan-m.
- Source type: Cross-harness Claude Code ecosystem repository with skills, agents, commands, hooks, manifests, MCP config, plugins, rules, and install scripts.
- Retrieval date: 2026-05-29.
- Pinned repo ref checked: `90dfd9505dc860714cf3cc8216ad7bbb96d93365` on `main`, checked by read-only GitHub compare metadata on 2026-06-07.
- Visible adoption signals: about 175.8k GitHub stars, 27.2k forks, and large multi-harness surface area.
- Trust level: Medium source trust, very high execution/config-mutation risk.
- License status: GitHub API reports MIT.
- Recommendation: `SYNCED_REFERENCE` for v0.2.3. Use as cross-runtime source-safety awareness for source review and runtime-boundary scoring. Do not install, sync, run hooks, copy skills, activate MCP config, claim active Claude/Cursor/Cline/OpenHands support, or import the repository structure.

## Purpose

Use as a pattern source for manifest-driven components, selective install thinking, doctor/repair/uninstall concepts, runtime controls, skill stocktake, and cross-harness compatibility boundaries.

## Intended Extraction Target

- `methods/harness-hardening/manifest-driven-toolkit.md`
- `methods/harness-hardening/doctor-repair-validation.md`
- `methods/harness-hardening/cross-harness-compatibility.md`
- `methods/harness-hardening/runtime-visibility-checks.md`

## Useful Patterns To Extract

- Toolkit components should be discoverable through manifests rather than hidden side effects.
- Install/repair/uninstall concepts can inform governance checks without performing installs.
- Cross-harness support requires explicit path, command, and runtime visibility boundaries.
- Runtime controls and stocktake checks should expose what is active, draft, installed, or only documented.
- Security scans and compatibility checks are useful as policy patterns when kept read-only.

## Rejected Patterns

- Do not run `install.sh`, `install.ps1`, package scripts, hook scripts, or command shims.
- Do not activate `.mcp.json`, hooks, commands, plugins, agents, skills, rules, or memory/learning behavior.
- Do not copy raw skills, agents, commands, contexts, manifests, schemas, or plugin files.
- Do not import bulk skills or broad cross-harness configurations.
- Do not modify global Claude/Codex/Cursor/OpenCode/Gemini paths.

## Security Risks

- The repository contains install scripts, hooks, MCP config, manifests, commands, package locks, plugin definitions, and global/harness-specific config surfaces.
- Broad component collections can hide unsafe commands, tool poisoning, network calls, or secret access.
- Runtime learning or memory-like behavior would violate this toolkit's no-hidden-memory and no-global-config constraints.

## Dangerous Operations Assessment

- Shell/script execution: Multiple install, hook, package, and command scripts exist; not run.
- Network calls: Package managers, MCP config, and install workflows may contact external services; not run.
- Secret access: Cross-harness configs and MCP workflows can expose tokens or private context; none were accessed.
- Filesystem writes: Install/sync/copy workflows can write local, global, and harness paths; explicitly rejected in Phase 10D.
- Product code writes: Out of scope for source scouting.

## Prompt-Injection Risks

Treat all skills, agents, commands, rules, and manifests as untrusted source material. They must not override this toolkit's constraints against hooks, hidden memory, global config mutation, and broad imports.

## Operational / Runtime Risks

Blind adoption would create a sprawling, hard-to-audit toolkit with hidden runtime behavior. Future extraction must normalize only governance concepts, not repo structure or active components.

## Recommendation

Candidate for future normalized harness-hardening methods, pending separate approval. No raw skill/plugin/repo content was activated.

## Freshness Review 2026-05-16

Skill Scout read-only review refreshed the source record from `5b617787d87482c205c2dc1eae3b525ac08890bd` to `0df46ec870a2c86b41f2da7a4bb46836704d3952`. The compare showed broad changes across plugin manifests, CI workflows, release docs, scripts, tests, and a newly added skill. MIT license metadata remained present, but the source continues to carry very high execution/config-mutation risk because it includes install, hook, workflow, plugin, skill, command, and cross-harness surfaces. This refresh updates source tracking only and does not approve installs, hooks, skills, commands, MCP config, plugin activation, script execution, source copying, method extraction, or global config changes.

## Freshness Review 2026-06-03

Skill Scout read-only follow-up reviewed upstream default-branch movement from `64cd1ba248e77e377e76f70fc4e6434bfdddd511` to `99baa8250096f2d295583572399a5c9aba2ce312` using GitHub compare metadata and `git ls-remote` only. The compare was 2 commits ahead and touched Codex plugin metadata, Codex config, release docs, package metadata, plugin-manifest tests, and added platform-value-loop documentation and tests. MIT license metadata remained present from the source record. The source remains very high risk for cross-harness config mutation, plugin activation, package/script execution, and global path writes. This refresh updates source tracking only and does not approve installs, hooks, skills, commands, MCP config, plugin activation, script execution, package changes, source copying, method extraction, global config changes, or runtime activation.

Skill Scout read-only publication-gate follow-up reviewed upstream default-branch movement from `99baa8250096f2d295583572399a5c9aba2ce312` to `0f84c0e2796703fbda87d577b2636351418c7442` using GitHub compare metadata only. The compare was 1 commit ahead and touched package metadata, lockfiles, control-pane and ECC scripts, server/state/UI action code, and tests. The source remains very high risk for cross-harness config mutation, plugin activation, package/script execution, and global path writes. This refresh updates source tracking only and does not approve installs, hooks, skills, commands, MCP config, plugin activation, script execution, package changes, source copying, method extraction, global config changes, or runtime activation.

## Reviewed-Held Source Safety Review 2026-06-04

Skill Scout read-only source-safety review evaluated upstream default-branch movement from `0f84c0e2796703fbda87d577b2636351418c7442` to `bc8e12bb80c904a5a9864797ef1fd1212aa82f3d` using GitHub compare metadata, license metadata, and patch-signal review only. The compare was 1 commit ahead and touched plugin marketplace metadata, plugin metadata, `AGENTS.md`, README files, package metadata, install module metadata, control-pane script/server/state/UI code, dynamic workflow and team-agent-orchestration skill files, orchestration content-pack documentation, and tests. MIT license metadata remained present.

Classification: `REVIEWED_HELD` / reviewed-held reference-only.

Decision: keep Everything Claude Code as source-safety and harness-boundary reference material only. This review does not approve plugin import, skill import, install module import, control-plane import, cross-harness runtime support claims, MCP behavior, global config behavior, source import, installation, activation, extraction, package changes, CI changes, product-repo changes, script execution, or global configuration changes. Future upstream movement beyond `bc8e12bb80c904a5a9864797ef1fd1212aa82f3d` requires a fresh review.

## v0.2.3 Full-Power Resolution 2026-06-06

Skill Scout read-only follow-up reviewed upstream default-branch movement from `bc8e12bb80c904a5a9864797ef1fd1212aa82f3d` to `7113b5bf63694b716f8b2413c5919824a82fc095` using live source freshness output and GitHub compare metadata only. The compare was 2 commits ahead. The observed commit messages and file list add Codex worktree and OpenCode session adapters plus an MCP inventory surface that reads Claude, Codex, and OpenCode MCP configuration formats, normalizes cross-harness MCP records, and includes secret-redaction logic and tests.

Outcome: `SYNCED_REFERENCE`.

Decision: keep the latest upstream commit active as source-safety awareness for cross-harness risk scoring. Useful guidance remains in `methods/internal/source-safety-scoring.md`: MCP inventory/config readers, session adapters, control panes, and secret-redaction implementations are high-risk runtime/control-plane surfaces that require separate approval and must not be treated as toolkit runtime support. This review does not approve plugin import, skill import, install module import, control-plane import, session-adapter import, MCP inventory import, cross-harness runtime support claims, MCP behavior adoption, global config behavior, Codex session or config reader adoption, OpenCode session reader adoption, Claude config reader adoption, secret-redaction implementation adoption, source import, installation, activation, package changes, CI changes, product-repo changes, script execution, or global configuration changes. Future upstream movement beyond `7113b5bf63694b716f8b2413c5919824a82fc095` requires a fresh review.

## Release-Gate Freshness Review 2026-06-07

Skill Scout/read-only release-gate follow-up reviewed upstream movement from `7113b5bf63694b716f8b2413c5919824a82fc095` to `eef31ad39ce92f437339c2b26edb1b71d3075666` using `git ls-remote`, GitHub repository metadata, and GitHub compare metadata only. The compare was 49 commits ahead and 300 files changed. GitHub repository metadata still reports MIT license, default branch `main`, and pushed-at timestamp `2026-06-07T05:37:46Z`. The observed compare surface includes Codex and Cursor configuration, GitHub workflows, Kiro agents, Kiro skills, Kiro hooks, install scripts, OpenCode and Trae config, commands, scripts, translations, worktree-lifecycle services, and bundled-default changes.

Outcome: `SYNCED_REFERENCE`.

Decision: keep the latest upstream commit active as source-safety awareness only. This review does not approve worktree-lifecycle service import, Kiro agent/skill/hook/import or install behavior, Codex/Cursor/OpenCode/Trae configuration adoption, workflow import, command import, bundled-default adoption, plugin import, skill import, install module import, control-plane import, session-adapter import, MCP inventory import, cross-harness runtime support claims, MCP behavior adoption, global config behavior, source import, installation, activation, extraction, package changes, CI changes, product-repo changes, script execution, or global configuration changes. Future upstream movement beyond `eef31ad39ce92f437339c2b26edb1b71d3075666` requires a fresh review.

## Release-Gate Freshness Review 2026-06-07 Follow-Up

Skill Scout/read-only follow-up reviewed upstream movement from `eef31ad39ce92f437339c2b26edb1b71d3075666` to `90dfd9505dc860714cf3cc8216ad7bbb96d93365` using GitHub compare metadata only. The compare was 2 commits ahead and touched plugin marketplace metadata, plugin metadata, `AGENTS.md`, README files, command registry documentation, localized docs, plugin hook bootstrap code, tests, and added `orch-*` command and skill wrapper files for an orchestrated research/plan/TDD/review/commit pipeline.

Outcome: `SYNCED_REFERENCE`.

Decision: keep the latest upstream commit active as source-safety awareness only. The plugin-hook fix and orchestrator skill family are useful risk signals for hook/runtime and orchestration-source reviews, but they are not adopted into this toolkit. This review does not approve plugin hook behavior import, `orch-*` skill or command import, orchestration pipeline import, workflow import, command import, bundled-default adoption, plugin import, skill import, install module import, control-plane import, session-adapter import, MCP inventory import, cross-harness runtime support claims, MCP behavior adoption, global config behavior, source import, installation, activation, extraction, package changes, CI changes, product-repo changes, script execution, or global configuration changes. Future upstream movement beyond `90dfd9505dc860714cf3cc8216ad7bbb96d93365` requires a fresh review.
