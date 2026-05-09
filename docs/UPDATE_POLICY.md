# Update Policy

Toolkit updates are versioned, reviewed, and intentional.

## Principles

- No automatic broad imports.
- No automatic skill activation.
- No unreviewed upstream sync.
- No product repo changes from this toolkit without project-level approval.
- Every project pins the toolkit version it uses.

## Update Flow

1. Scout a source.
2. Evaluate safety, trust, license, maintenance, and usefulness.
3. Approve or reject.
4. Extract reviewed methods as normalized/paraphrased toolkit files with source inspiration and license status.
5. Compile agents intentionally.
6. Sync into projects only with version pinning and approval.

## Compatibility

Compiled agents should document their source toolkit version and any project profile assumptions.

## Phase 3 Extraction Rules

- Do not copy full upstream skill files.
- Do not install or activate external skills.
- Do not clone external repositories into active toolkit folders.
- Do not run third-party scripts.
- Keep raw external sources inactive.
- Preserve source/license uncertainty in each method file.

## Phase 4 Compilation Rules

- Compile agents only from approved source agent specs, normalized method files, and toolkit governance.
- Do not copy full upstream method or skill files into compiled agents.
- Do not activate compiled agents globally.
- Do not create project sync or install scripts during Phase 4.
- Keep Superpowers as an external Codex plugin reference only.
- Treat Context7, Playwright, and Figma as support triggers only when available, configured, and relevant.
- Include source provenance in every compiled agent so downstream projects can audit the toolkit inputs.
- Keep profiles free of secrets and project-specific credentials.

## Phase 5 Project Sync Rules

- Project sync is dry-run by default.
- `-ConfirmWrite` is required before writing to a target project.
- Scripts may manage selected files only under `.ai-toolkit/`.
- Project installs must pin toolkit version and toolkit commit.
- Project-local `AGENTS.md`, `docs/ai/STATE.md`, `docs/ai/DECISIONS.md`, `docs/ai/PROJECT_CONTEXT.md`, and `docs/ai/RELEASE_GATES.md` must not be created or overwritten by toolkit sync scripts.
- `allowOverwriteProjectContext:true` is rejected by the current sync workflow.
- Stale or unmanaged files are reported, not deleted.
- No product repo install is performed from the toolkit Phase 5 PR.

## Phase 6 Project-Managed Skill Rules

- Project-managed skill sync is dry-run by default.
- `-ConfirmWrite` is required before writing selected skills to a target project.
- Scripts may copy selected toolkit-owned single-file skills only under `.ai-toolkit/skills/<skill-name>/SKILL.md`.
- Synced skills must be recorded in `selectedSkills`.
- Syncing a skill file does not activate skills globally, install external skills, or modify Codex global config.
- Bundled multi-file skill resources are not supported in Phase 6 v1.

## Phase 7 Core Toolchain Governance Rules

- GSD is treated as an external core governance tool, not a vendored toolkit dependency.
- Superpowers remains the external core execution-discipline plugin.
- Serious multi-step work must declare GSD phase/state usage, selected agents/profile, selected support tools, mode, scope, do-not-touch list, and validation plan before execution.
- If GSD is unavailable for serious multi-phase work, stop and ask whether to install/configure GSD, continue with manual phase tracking, or stop.
- Do not silently continue without GSD on serious multi-phase work unless the user explicitly approves manual phase tracking.
- Do not install GSD globally, install other support tools, or modify Codex global config without explicit approval.
- Use only the minimum required plugins/tools for the task.

## Phase 8 Codex Custom-Agent Rules

- Global Codex custom agents are generated only from reviewed compiled agents after explicit approval.
- Custom-agent TOML files live under `~/.codex/agents/`; the toolkit must not create repo-local `.codex/agents/` unless project-local registration is explicitly approved.
- TOML files must validate before use and must include `name`, `description`, `developer_instructions`, and source provenance to the matching compiled agent.
- Native custom agents are preferred when available, but runtime status is not considered verified until a Codex restart/new-session smoke test succeeds.
- If native custom-agent spawn is unavailable or fails, report it. High-risk tasks must stop and ask before using the compiled-agent fallback.
- Compiled agents remain the canonical fallback source and must be regenerated intentionally before updating global custom agents.
- Do not set custom model, sandbox, MCP server, or tool permissions in Phase 8 v1.

## Phase 9 Global Governance Entrypoint Rules

- The global `riss-governance` skill is scoped to RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work.
- Do not apply `riss-governance` as a generic workflow for unrelated projects unless the user explicitly requests it.
- The global `riss-governance-agent` router may coordinate native custom agents when runtime-visible.
- Do not claim full runtime visibility until a new-session skill and router-agent visibility test passes.
- If current-session hot-load fails, report: "Global riss-governance installed; restart/new session verification required."
- High-risk fallback from native agents to compiled-agent instructions requires user approval.

## Phase 10A/10B Governance Spine Rules

- Registries are metadata only and never imply activation.
- Register existing assets before adding speculative assets.
- `riss-governance` remains the normal user-facing entrypoint.
- `riss-agent-governance` and `riss-skill-governance` are internal helper skills only when implemented and approved; direct user calls must redirect through `riss-governance`.
- Missing-skill discovery is read-only by default and may check local registries, source records, skills.sh, GitHub, GitLab, and official docs.
- Discovery must not install, activate, clone, copy raw skills, run scripts, modify global config, or modify product repos.
- External source scouting and method extraction happen in later approved batches.
- Full runtime activation must not be claimed from repo files alone.
