# RuFlo

- URL: https://github.com/ruvnet/ruflo
- Owner / publisher: ruvnet.
- Source type: Agent orchestration/runtime framework with daemon, plugins, workers, state, and verification materials.
- Retrieval date: 2026-05-30.
- Pinned repo ref checked: `58716fd141b9c90b9b9a802bc089f2401da3d108` on `main`, checked by read-only GitHub compare metadata on 2026-06-11.
- Visible adoption signals: about 56.4k GitHub stars, 6.4k forks, and active alpha release work.
- Trust level: Medium source trust, very high runtime/daemon risk.
- License status: GitHub API reports MIT.
- Recommendation: `SYNCED_ADOPTED` for v0.2.3 static governance only. Keep RuFlo active as source intelligence for static task-state, handoff, stop-condition, and failure-accounting discipline. Do not import daemon, supervisor, worker, MCP, memory, hooks, federation, swarm, plugin runtime behavior, package metadata, or lockfiles.

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

## Freshness Review 2026-05-30

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `6198abfab7491bece4bc23ad85fa7551e2c1f749` to `0403a34279ff5f498f8c5880f72c20666c3a509b` using read-only `git ls-remote`, GitHub repository metadata, license metadata, compare metadata, and added-line risk keyword review only. The compare was 3 commits ahead and touched `CLAUDE.md` guidance, cost-tracker benchmark run data and trend filtering, deterministic codemod tests/corpus/benchmark scripts, hook command and MCP tool files, deterministic codemod engine and scope analysis files, enhanced model routing, and ADR-143 documentation. MIT license metadata remained present. Added-line risk review found no network-fetch signal, but it did identify executable MCP/hook/codemod guidance, file/glob batch rewrite paths, filesystem read/write behavior, benchmark output writes, and environment-controlled benchmark/trend switches. Prompt guidance that tells agents to call `hooks_codemod` remains untrusted source material. The runtime, daemon, plugin, hook, MCP, package-script, file-write, and benchmark-script risks remain high; the recommendation is unchanged. This refresh updates source tracking only and does not approve daemon, worker, hook, MCP, memory, plugin, script, benchmark, codemod, glob/file rewrite, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `0403a34279ff5f498f8c5880f72c20666c3a509b` to `48ca36948486ab1fbda7db60c295e6e11ba539a1` using read-only `git ls-remote`, GitHub repository metadata, license metadata, compare metadata, and added-line risk keyword review only. The compare was 2 commits ahead and touched package metadata, Claude statusline helpers, model-resolution and agent-execute tests, MCP parent-death watchdog tests, Q-state encoder tests, system uptime tests, MCP command startup, settings/statusline generation, agent/system MCP tools, a new runtime parent-death watchdog, and Q-learning router persistence. MIT license metadata remained present. Added-line risk review found MCP server, parent-death watchdog, process uptime, model routing, Q-state persistence, and filesystem-write test signals, but no new network-fetch, credential, destructive shell, or package-install signal in the added lines. The runtime, daemon, MCP, model-routing, persisted-state, package-script, file-write, and background-process risks remain high; the recommendation is unchanged. This refresh updates source tracking only and does not approve daemon, worker, hook, MCP, memory, plugin, script, model-routing import, persisted-state import, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `48ca36948486ab1fbda7db60c295e6e11ba539a1` to `367cb82adf2baa732e2dd7f7ce604d63542ed48b` using read-only `git ls-remote`, GitHub repository metadata, license metadata, compare metadata, and patch inspection only. The compare was 2 commits ahead and touched only `package.json`, `ruflo/package.json`, `v3/@claude-flow/cli/package.json`, and `v3/@claude-flow/memory/package.json`. The commits bump RuFlo package versions from 3.10.11 to 3.10.12, move `agentdb` from `^3.0.0-alpha.14` to `^3.0.0-alpha.15`, add a wrapper `agentdb` dependency constraint, and remove a conflicting root override. MIT license metadata remained present. Patch inspection found package dependency and optional dependency movement, but no new source files, scripts, MCP command code, hook code, network-fetch code, credential access, destructive shell, or product-write guidance in the changed lines. The runtime, daemon, MCP, dependency-install, package-script, persisted-state, file-write, and background-process risks remain high; the recommendation is unchanged. This refresh updates source tracking only and does not approve package install, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, persisted-state import, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `367cb82adf2baa732e2dd7f7ce604d63542ed48b` to `e6dc21fc79539af029c4f5e87d2b929ebb794291` using read-only `git ls-remote` and GitHub compare metadata only. The compare was 1 commit ahead and touched only package metadata files: `package.json`, `ruflo/package.json`, `v3/@claude-flow/cli/package.json`, and `v3/@claude-flow/memory/package.json`. MIT license metadata remained present from the reviewed source record. The change is package/dependency-version movement and does not reduce the source's runtime, daemon, MCP, dependency-install, package-script, persisted-state, file-write, or background-process risks. This refresh updates source tracking only and does not approve package install, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, persisted-state import, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `e6dc21fc79539af029c4f5e87d2b929ebb794291` to `17ce6ba67dd3ce9ed2886a6f5b2492495dcb49e6` using read-only `git ls-remote`, GitHub compare metadata, license metadata, and patch keyword review only. The compare was 10 commits ahead and touched benchmark run data, package metadata, RuFlo and CLI README files, cross-encoder/hybrid-retrieval/pretraining/self-learning/structured-distillation tests, benchmark and pretraining scripts, MCP hook and neural tool files, memory retrieval/intelligence/bridge/distillation files, ADRs, and learning docs. MIT license metadata remained present. Patch keyword review identified benchmark, pretraining, GitHub, MCP, hook, memory, retrieval, neural, script, package, and filesystem-related signals; the source remains very high risk for runtime, daemon, MCP, hook, package-script, memory, benchmark-script, network, persisted-state, file-write, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, benchmark execution, pretraining execution, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, retrieval import, persisted-state import, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `17ce6ba67dd3ce9ed2886a6f5b2492495dcb49e6` to `fc39e29f230356bef860ff95f9ae9271e60159aa` using read-only `git ls-remote`, GitHub compare metadata, license metadata, and patch keyword review only. The compare was 1 commit ahead and touched grid-search benchmark run data, package metadata, `v3/@claude-flow/cli/scripts/grid-search-retrieval.mjs`, `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts`, and ADR-082 documentation. MIT license metadata remained present. Patch keyword review identified benchmark, retrieval, neural, script, package, MCP-tool, and filesystem-related signals; the source remains very high risk for runtime, daemon, MCP, hook, package-script, memory/retrieval behavior, benchmark-script, persisted-state, file-write, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, benchmark execution, grid-search execution, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, retrieval import, persisted-state import, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `fc39e29f230356bef860ff95f9ae9271e60159aa` to `d3223dc3d9965b019d79b288828fcb96d710170a` using read-only `git ls-remote`, GitHub compare metadata, license metadata, and patch keyword review only. The compare was 1 commit ahead and touched grid-search and pretrained retrieval benchmark run data, package metadata, `v3/@claude-flow/cli/scripts/grid-search-retrieval.mjs`, `v3/@claude-flow/cli/src/mcp-tools/neural-tools.ts`, and ADR-083 documentation. MIT license metadata remained present. Patch keyword review identified benchmark, retrieval, neural, script, package, MCP-tool, rate/limit, and filesystem-related signals; the source remains very high risk for runtime, daemon, MCP, hook, package-script, memory/retrieval behavior, benchmark-script, persisted-state, file-write, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, benchmark execution, grid-search execution, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, retrieval import, persisted-state import, source-copying, method-extraction, or global configuration use.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `d3223dc3d9965b019d79b288828fcb96d710170a` to `709b85949f7526e4bf61a5d9375ed9f7960600d0` using read-only `git ls-remote`, GitHub compare metadata, license metadata, and patch keyword review only. The compare was 1 commit ahead and touched cross-repo benchmark run data, package metadata, `v3/@claude-flow/cli/scripts/benchmark-cross-repo.mjs`, `v3/@claude-flow/cli/scripts/pretrain-from-github.mjs`, and ADR-084 documentation. MIT license metadata remained present. Patch keyword review identified benchmark, cross-repo, pretraining, GitHub, script, package, and filesystem-related signals; the source remains very high risk for runtime, daemon, MCP, hook, package-script, memory/retrieval behavior, benchmark-script, cross-repo training, persisted-state, file-write, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, benchmark execution, cross-repo benchmark execution, pretraining execution, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, retrieval import, persisted-state import, source-copying, method-extraction, or global configuration use.

## Freshness Review 2026-05-31

Skill Scout read-only follow-up reviewed upstream default-branch movement from `709b85949f7526e4bf61a5d9375ed9f7960600d0` to `28eb57543be916abf5191f71114268a3985cb001` using `git ls-remote` and GitHub compare metadata only. The compare was 7 commits ahead and touched benchmark run data, package metadata, memory/vector/retrieval code, MCP tools, neural tools, worker daemon code, and ADR benchmark documentation. The source remains very high risk for runtime, daemon, MCP, hook, memory, plugin, package-script, benchmark-script, persisted-state, file-write, indexing, and background-process behavior. The only planned safe extraction path is static governance inspiration: task-state visibility, handoff ledgers, adaptive replanning stop conditions, no silent fallback, and failure accounting. This refresh updates source tracking only and does not approve package install, daemon, worker, hook, MCP, memory, plugin, script, benchmark, vector indexing, source-copying, method-extraction, product-repo indexing, or global configuration use.

## Freshness Review 2026-06-01

Skill Scout read-only follow-up reviewed upstream default-branch movement from `28eb57543be916abf5191f71114268a3985cb001` to `f57b69876ba1c4e6bf4e317d0d1529a5481692c4` using GitHub compare metadata, current commit metadata, license metadata, and patch keyword review only. The compare was 2 commits ahead and touched `README.md`, `data/clone-data.ledger.json`, `data/clone-data.proof.json`, and `data/clone-data.rvf`. MIT license metadata remained present. Patch keyword review matched ledger/proof data file movement but found no new package install, MCP command, daemon, hook, worker, network-fetch, credential, destructive shell, or product-write signal in the changed source-freshness scope. The source remains very high risk for runtime, daemon, MCP, hook, memory, plugin, package-script, benchmark-script, persisted-state, file-write, indexing, and background-process behavior. The only planned safe extraction path remains static governance inspiration. This refresh updates source tracking only and does not approve package install, daemon, worker, hook, MCP, memory, plugin, script, benchmark, vector indexing, source-copying, method-extraction, product-repo indexing, or global configuration use.

## Freshness Review 2026-06-02

Skill Scout read-only follow-up reviewed upstream default-branch movement from `f57b69876ba1c4e6bf4e317d0d1529a5481692c4` to `d79f51b74d3b12ddf9ce48a2c497047709544451` using GitHub compare metadata and `git ls-remote` only. The compare was 6 commits ahead and touched supply-chain accepted findings, GitHub workflow files, package/package-lock/pnpm-lock files, CLI bin/helper/log filtering/init code, audit and smoke scripts, MCP hook tools, browser/CLI/MCP package files, and helper/router surfaces. MIT license metadata remained present. The source remains high risk for runtime, daemon, MCP, hook, package-script, lockfile, persisted-state, file-write, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, workflow copying, daemon, worker, hook, MCP, memory, plugin, script execution, source-copying, method-extraction, lockfile import, product-repo indexing, or global configuration use.

Skill Scout read-only follow-up reviewed upstream default-branch movement from `d79f51b74d3b12ddf9ce48a2c497047709544451` to `08bf1cf3242baae280755fe1348572406b867cb7` using GitHub compare metadata and `git ls-remote` only. The compare was 1 commit ahead and added ADR documentation for agent authorization propagation, plugin supply-chain integrity and memory governance, and tool-output guardrail rollout. No source files, package manifests, lockfiles, scripts, MCP code, hook code, daemon code, network-fetch code, credential access, destructive shell, or product-write guidance appeared in the changed file list. The source remains high risk for runtime, daemon, MCP, hook, package-script, lockfile, persisted-state, file-write, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, workflow copying, daemon, worker, hook, MCP, memory, plugin, script execution, source-copying, method-extraction, lockfile import, product-repo indexing, or global configuration use.

Skill Scout read-only follow-up reviewed upstream default-branch movement from `08bf1cf3242baae280755fe1348572406b867cb7` to `844f68dbe5f28c4c2b13c56e8e102528aa63b629` using GitHub compare metadata and `git ls-remote` only. The compare was 3 commits ahead and touched CLI MCP client guardrail tests, CLI startup/log filtering/MCP client code, memory bridge code, plugin trust-anchor data, security authorization propagation, plugin integrity verifier code, and related security tests. MIT license metadata remained present from the source record. The source remains very high risk for runtime, daemon, MCP, hook, memory, plugin, package-script, persisted-state, file-write, trust-anchor, and background-process behavior. The recommendation is unchanged. This refresh updates source tracking only and does not approve package install, daemon, worker, hook, MCP, memory, plugin, script execution, trust-anchor import, source-copying, method-extraction, product-repo indexing, or global configuration use.

## v0.2.3 Full-Power Resolution 2026-06-06

Skill Scout read-only source-safety review evaluated upstream default-branch movement from `844f68dbe5f28c4c2b13c56e8e102528aa63b629` to `d065b15927c6ba7318623e8af123e7980e4c6681` using GitHub compare metadata, license metadata, and patch-signal review only. The compare was 2 commits ahead and touched `.claude/helpers/auto-memory-hook.mjs`, `package.json`, `package-lock.json`, RuFlo and CLI package metadata, CLI embeddings command code, memory package metadata, auto-memory bridge code, and memory bridge tests. MIT license metadata remained present.

Outcome: `SYNCED_ADOPTED`.

Decision: keep RuFlo active as cleanroom static orchestration guidance through `methods/orchestration/static-task-state-handoff-ledger.md` and related governance/routing/eval stop conditions. The reviewed upstream drift reinforces why memory hooks, bridge behavior, MCP, daemon, global config, package, and background runtime surfaces remain forbidden. This review does not approve hooks, memory bridge behavior, MCP behavior, daemon behavior, global behavior, package updates, lockfile updates, global npm lookup behavior, source import, installation, activation, script execution, product-repo indexing, product-repo changes, or global configuration changes. Future upstream movement beyond `d065b15927c6ba7318623e8af123e7980e4c6681` requires a fresh review.

## v0.2.3 Static-Only Adoption Boundary 2026-06-06

The toolkit uses RuFlo as active cleanroom source intelligence for a toolkit-authored static task-state handoff method. That is full-power adoption inside this repository for the safe part of the source: explicit task state, handoff facts, retry/stop-condition discipline, failure accounting, and no-silent-fallback reporting.

No RuFlo code, tests, prompts, commands, scripts, package metadata, lockfiles, MCP configuration, memory bridge logic, daemon logic, watcher behavior, generated output, or runtime behavior was copied or activated.

## Freshness Review 2026-06-08

Skill Scout read-only follow-up reviewed upstream default-branch movement from `d065b15927c6ba7318623e8af123e7980e4c6681` to `05f20eaa56bf942d7dc741061dbe4d249e82ed2b` using GitHub compare metadata only. The compare was 6 commits ahead and touched CI workflow configuration, package and lockfile data, witness verification script code, added the opt-in `plugins/ruflo-arena` runtime/plugin surface, and changed graph-trajectory smoke behavior. The source remains high risk for runtime, daemon, MCP, hook, plugin, package-script, memory, persisted-state, file-write, CI, and background-process behavior.

Outcome: `SYNCED_ADOPTED`.

Decision: keep only the existing toolkit-authored static task-state and handoff discipline as adopted source intelligence. This refresh updates source tracking only and does not approve package install, package or lockfile update, CI workflow adoption, witness script execution, arena plugin adoption, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, persisted-state import, source-copying, method-extraction, product-repo indexing, product-repo changes, or global configuration use.

## Freshness Review 2026-06-08 Follow-up

Skill Scout read-only follow-up reviewed upstream default-branch movement from `05f20eaa56bf942d7dc741061dbe4d249e82ed2b` to `6c1abcf0217b71baa131fd7155dddc41813d6851` using GitHub compare metadata only. The compare was 1 commit ahead and touched only `plugins/ruflo-arena` implementation files for post-merge review patches. The source remains high risk for runtime, daemon, MCP, hook, plugin, package-script, memory, persisted-state, file-write, CI, and background-process behavior.

Outcome: `SYNCED_ADOPTED`.

Decision: keep only the existing toolkit-authored static task-state and handoff discipline as adopted source intelligence. This refresh updates source tracking only and does not approve package install, package or lockfile update, CI workflow adoption, arena plugin adoption, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, persisted-state import, source-copying, method-extraction, product-repo indexing, product-repo changes, or global configuration use.

## Freshness Review 2026-06-09

Skill Scout read-only follow-up reviewed upstream default-branch movement from `6c1abcf0217b71baa131fd7155dddc41813d6851` to `16a55f7a537c4a405e448e59859866eebbdd45a0` using GitHub compare metadata and remote HEAD resolution only. The compare was 9 commits ahead and touched Claude statusline helper code, GitHub Pages workflow material, README/probe documentation, package and lockfile data, nested agent and skill docs, probe scripts, and v3 package/runtime surfaces. The source remains high risk for runtime, daemon, MCP, hook, plugin, package-script, memory, persisted-state, file-write, CI, and background-process behavior.

Outcome: `SYNCED_ADOPTED`.

Decision: keep only the existing toolkit-authored static task-state and handoff discipline as adopted source intelligence. This refresh updates source tracking only and does not approve package install, package or lockfile update, CI workflow adoption, GitHub Pages workflow adoption, statusline helper adoption, nested agent or skill import, probe script execution, daemon, worker, hook, MCP, memory, plugin, script, model-routing import, persisted-state import, source-copying, method-extraction, product-repo indexing, product-repo changes, or global configuration use.
## Freshness Review 2026-06-11

Skill Scout read-only follow-up reviewed upstream default-branch movement from `16a55f7a537c4a405e448e59859866eebbdd45a0` to `58716fd141b9c90b9b9a802bc089f2401da3d108` using `git ls-remote` and GitHub compare metadata only. The compare was 3 commits ahead and touched session atomic-write behavior, hive-mind child-process lifecycle behavior, statusline helper process behavior, package metadata, and lockfile data.

Outcome: `SYNCED_ADOPTED`.

Decision: keep RuFlo adopted only as static task-state and handoff discipline already represented in toolkit-owned methods. This refresh updates source tracking only and does not approve package install, package or lockfile update, statusline helper adoption, hive-mind runtime adoption, session persistence import, daemon, worker, hook, MCP, memory, plugin, script, persisted-state import, product-repo indexing, or global configuration use.
