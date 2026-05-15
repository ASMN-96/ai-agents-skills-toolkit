# Everything Claude Code

- URL: https://github.com/affaan-m/everything-claude-code
- Owner / publisher: affaan-m.
- Source type: Cross-harness Claude Code ecosystem repository with skills, agents, commands, hooks, manifests, MCP config, plugins, rules, and install scripts.
- Retrieval date: 2026-05-15.
- Pinned repo ref checked: `5b617787d87482c205c2dc1eae3b525ac08890bd` on `main`, committed 2026-05-15.
- Visible adoption signals: about 175.8k GitHub stars, 27.2k forks, and large multi-harness surface area.
- Trust level: Medium source trust, very high execution/config-mutation risk.
- License status: GitHub API reports MIT.
- Recommendation: Candidate for future normalized harness-hardening method extraction after separate approval. Do not install, sync, run hooks, copy skills, activate MCP config, or import the repository structure.

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
