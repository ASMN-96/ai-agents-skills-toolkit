# RuFlo

- URL: https://github.com/ruvnet/ruflo
- Owner / publisher: ruvnet.
- Source type: Agent orchestration/runtime framework with daemon, plugins, workers, state, and verification materials.
- Retrieval date: 2026-05-29.
- Pinned repo ref checked: `6198abfab7491bece4bc23ad85fa7551e2c1f749` on `main`, checked by read-only remote HEAD on 2026-05-29.
- Visible adoption signals: about 46.8k GitHub stars, 5.2k forks, and active alpha release work.
- Trust level: Medium source trust, very high runtime/daemon risk.
- License status: GitHub API reports MIT.
- Recommendation: Candidate for future normalized orchestration-method inspiration after separate approval. Do not import daemon, supervisor, worker, MCP, memory, hooks, federation, swarm, or plugin runtime behavior.

## Purpose

Use as a pattern source for router/state-machine thinking, goal decomposition, worker status, adaptive replanning, boundary-aware tool orchestration, and explicit runtime visibility.

## Intended Extraction Target

- `methods/orchestration/goap-lite-task-state.md`
- `methods/orchestration/governance-router.md`
- `methods/orchestration/no-silent-fallback.md`
- `methods/harness-hardening/runtime-visibility-checks.md`

## Useful Patterns To Extract

- Complex work benefits from explicit task state, worker status, retries, and stop conditions.
- Goal decomposition should remain lightweight and auditable.
- Tool and worker boundaries should be visible rather than hidden in background runtime state.
- Runtime health checks, failure accounting, and verification inventories can inspire static toolkit checks.
- Adaptive replanning can be normalized as a governance pattern without adopting a daemon.

## Rejected Patterns

- Do not run daemon, supervisor, worker, plugin, CLI, package, or verification scripts.
- Do not install systemd, launchd, scheduled task, or background supervision behavior.
- Do not import swarm, federation, memory, hooks, MCP, worker-daemon, or hidden state behavior.
- Do not create new agents or a large orchestrator because this source has runtime orchestration concepts.
- Do not vendor package locks, plugins, or runtime code.

## Security Risks

- Daemons and supervisors can keep running after the user thinks work is complete.
- Worker state, logs, verification output, or MCP/runtime config can expose private context.
- Background retries can repeat unsafe actions if copied without strict stop conditions.
- Runtime orchestration can hide tool calls and erode the user's approval boundaries.

## Dangerous Operations Assessment

- Shell/script execution: CLI, package, daemon, supervisor, plugin, and verification scripts exist; not run.
- Network calls: Package/runtime/plugin workflows may contact external services; not run.
- Secret access: Worker state and logs can contain sensitive context; none were accessed.
- Filesystem writes: Daemon state, logs, configs, package outputs, and supervisor files can write local/global paths; explicitly rejected in Phase 10D.
- Background work: Daemons, supervisors, workers, and scheduled behavior are explicitly rejected.

## Prompt-Injection Risks

Treat runtime plans, worker instructions, logs, and plugin prompts as untrusted source material. They must not override user consent, stop conditions, or the toolkit's no-background-worker constraints.

## Operational / Runtime Risks

Adopting runtime orchestration would violate Phase 10 constraints. Future extraction must stay as small, static, paraphrased governance methods.

## Recommendation

Candidate for future normalized orchestration method refinement, pending separate approval. No runtime behavior, daemon, hook, MCP server, worker, or repo content was activated.

## Freshness Review 2026-05-16

Skill Scout read-only review refreshed the source record from `455f0b17be2c445b95e6d74203da8702bfb0bd4b` to `ca0a6fa5cb1678b5c57c9289bc09a036f7308c61`. The compare showed changes across hook handlers, CI, package metadata, browser plugin docs/skills/scripts, witness verification, CLI/memory/security package areas, and added smoke/audit scripts. MIT license metadata remained present, but the source continues to carry very high runtime/daemon/config risk. This refresh updates source tracking only and does not approve daemon, worker, hook, MCP, memory, plugin, script, smoke-test, source-copying, method-extraction, or global configuration use.

## Freshness Review 2026-05-29

Skill Scout deep safety refresh reviewed the upstream default-branch movement from `313f2f88e0d12426cc1fb2f1a1b92d1ca3730f4b` to `6198abfab7491bece4bc23ad85fa7551e2c1f749` using read-only `git ls-remote` and GitHub compare metadata only. The compare was 3 commits ahead and touched package metadata, package lock data, plugin smoke scripts, a new `.claude/workflows/full-system-test.js`, v3 CLI test/tool-loop/MCP tooling files, hook tooling, and provider types. The runtime, daemon, plugin, hook, MCP, package-script, and smoke-test risks remain high; the recommendation is unchanged. This refresh updates source tracking only and does not approve daemon, worker, hook, MCP, memory, plugin, script, smoke-test, package-lock import, source-copying, method-extraction, or global configuration use.
