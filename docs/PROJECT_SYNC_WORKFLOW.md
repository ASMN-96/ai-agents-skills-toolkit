# Project Sync Workflow

Phase 5 adds a controlled workflow for copying selected compiled agents and profiles into a project repository under `.ai-toolkit/`.

This workflow is manual, version-pinned, and dry-run by default. It does not activate skills globally, install external skills, clone repositories, or overwrite project-local context.

## Install

Run installs from the toolkit repository:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -Agents skill-scout-agent,reviewer-agent,qa-test-agent,security-agent `
  -Profiles audit-profile
```

The command above is a dry-run. It shows the files that would be copied into:

- `.ai-toolkit/compiled-agents/`
- `.ai-toolkit/profiles/`

To write files, run the same command with `-ConfirmWrite`.

## Config-Based Install

Use `templates/.ai-toolkit.config.example.json` as the starting point for a project-specific selection:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -ConfigPath templates\.ai-toolkit.config.example.json
```

Confirm mode writes:

- `.ai-toolkit/.ai-toolkit-version`
- `.ai-toolkit/.ai-toolkit.config.json`
- selected compiled agents
- selected profiles

## Update

Updates read the existing project config and version pin:

```powershell
pwsh -NoProfile -File install/update-project.ps1 -TargetPath C:\path\to\project
```

The updater dry-run lists files as `MissingTarget`, `Update`, or `Unchanged`. It reports unmanaged files but does not delete them in Phase 5 v1.

To write selected updates:

```powershell
pwsh -NoProfile -File install/update-project.ps1 -TargetPath C:\path\to\project -ConfirmWrite
```

## Validate

After a confirm-mode install or update:

```powershell
pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath C:\path\to\project
```

Validation confirms `.ai-toolkit/`, version/config files, selected compiled agents, selected profiles, and unsafe artifact absence.

## Version Pinning

Every project install records the toolkit version and toolkit commit in `.ai-toolkit/.ai-toolkit-version`. Projects should review this file in the same PR that introduces or updates `.ai-toolkit/`.

Updates are intentional. Projects should not auto-pull toolkit changes.

## Files That Must Never Be Overwritten

The Phase 5 scripts only manage `.ai-toolkit/`. They do not create or overwrite:

- `AGENTS.md`
- `docs/ai/STATE.md`
- `docs/ai/DECISIONS.md`
- `docs/ai/PROJECT_CONTEXT.md`
- `docs/ai/RELEASE_GATES.md`

Project-local context remains owned by the target project.

## Recommended First VT/RISS Dry Run

For a future VT/RISS adoption, start with the smallest read-only set:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\vt-or-riss `
  -Agents skill-scout-agent,reviewer-agent,qa-test-agent,security-agent `
  -Profiles audit-profile
```

Review the dry-run output before using `-ConfirmWrite`.
