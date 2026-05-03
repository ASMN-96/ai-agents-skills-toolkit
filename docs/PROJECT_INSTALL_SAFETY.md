# Project Install Safety

Project sync is a supply-chain boundary. Compiled agents may shape developer behavior, so installs and updates must be reviewable, pinned, and intentional.

## Why Updates Are Not Automatic

Automatic updates can change project agent behavior without project owner review. Phase 5 requires explicit dry-run review and `-ConfirmWrite` before writing selected files.

## Supply-Chain Safety

The toolkit is the master source for compiled agents and profiles. Product projects consume selected compiled artifacts, not raw upstream sources or external skill packs.

Phase 5 scripts do not:

- install packages
- activate external skills
- clone repositories
- run third-party scripts
- modify Codex global config
- delete unmanaged files

## Prompt-Injection Risk

External skills and prompt files can contain conflicting instructions. This workflow only syncs compiled toolkit artifacts that passed prior review phases.

Projects should still review diffs because agent instructions are executable guidance for future AI work.

## Project-Local Context Preservation

Project-specific files remain local to the product repository. The installer and updater manage only `.ai-toolkit/`.

The config field `allowOverwriteProjectContext` must be `false`. Phase 5 v1 rejects `true`.

## Rollback Plan

Project installs should happen on a feature branch. To roll back:

1. Revert the project PR that introduced or updated `.ai-toolkit/`.
2. Confirm `.ai-toolkit/.ai-toolkit-version` returns to the prior pinned version.
3. Re-run `install/validate-project-install.ps1` against the project path.

Do not manually overwrite project `AGENTS.md` or `docs/ai` context files as part of rollback.
