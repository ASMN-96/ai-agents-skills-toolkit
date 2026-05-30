# Project Sync Workflow

Phase 5 adds a controlled workflow for copying selected compiled agents and profiles into a project repository under `.ai-toolkit/`. Phase 6 extends the same workflow to selected toolkit-owned skills.

This workflow is manual, version-pinned, and dry-run by default. It does not activate skills globally, install external skills, clone repositories, or overwrite project-local context.

## Install

Run installs from the toolkit repository:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -Agents skill-scout-agent,reviewer-agent,qa-test-agent,security-agent `
  -Profiles audit-profile `
  -Skills riss-governance
```

macOS/Linux/Git Bash equivalent:

```bash
bash install/install-project.sh \
  --target /path/to/project \
  --agents skill-scout-agent,reviewer-agent,qa-test-agent,security-agent \
  --profiles audit-profile \
  --skills riss-governance
```

The command above is a dry-run. It shows the files that would be copied into:

- `.ai-toolkit/compiled-agents/`
- `.ai-toolkit/profiles/`
- `.ai-toolkit/skills/`

To write files, run the same command with `-ConfirmWrite` for PowerShell or `--confirm-write` for Bash. Confirm mode requires the target repository to be on a clean, upstream-aligned feature branch; it refuses `main`/`master`, detached HEAD, missing upstream, dirty, ahead, behind, or divergent target states.

## Config-Based Install

Use `templates/.ai-toolkit.config.example.json` as the starting point for a project-specific selection:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -ConfigPath templates\.ai-toolkit.config.example.json
```

Bash equivalent:

```bash
bash install/install-project.sh \
  --target /path/to/project \
  --config templates/.ai-toolkit.config.example.json
```

Confirm mode writes:

- `.ai-toolkit/.ai-toolkit-version`
- `.ai-toolkit/.ai-toolkit.config.json`
- `.ai-toolkit/.ai-toolkit-manifest.json`
- selected compiled agents
- selected profiles
- selected skills

The example config selects assets and sync policy only. It does not define the toolkit version; install and update commands take the canonical version from `scripts/ai-toolkit/embedded-data.mjs` / `.ai-toolkit/VERSION` and record it in the generated `.ai-toolkit/.ai-toolkit-version`, `.ai-toolkit/.ai-toolkit.config.json`, and `.ai-toolkit/.ai-toolkit-manifest.json` files.

## Update

Updates read the existing project config and version pin:

```powershell
pwsh -NoProfile -File install/update-project.ps1 -TargetPath C:\path\to\project
```

Bash equivalent:

```bash
bash install/update-project.sh --target /path/to/project
```

The updater dry-run lists files as `MissingTarget`, `Update`, or `Unchanged`. It reports unmanaged files but does not delete them in the current v1 workflow.

To write selected updates:

```powershell
pwsh -NoProfile -File install/update-project.ps1 -TargetPath C:\path\to\project -ConfirmWrite
```

Bash equivalent:

```bash
bash install/update-project.sh --target /path/to/project --confirm-write
```

## Validate

After a confirm-mode install or update:

```powershell
pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath C:\path\to\project
```

Bash equivalent:

```bash
bash install/validate-project-install.sh --target /path/to/project
```

Validation confirms `.ai-toolkit/`, version/config/manifest files, selected compiled agents, selected profiles, selected skills, manifest SHA256 integrity, and unsafe artifact absence. Existing installs without `.ai-toolkit/.ai-toolkit-manifest.json` must be refreshed with `install/update-project.ps1 -ConfirmWrite` from a clean aligned feature branch before they are considered valid.

The Bash entrypoints call `install/project-sync-core.mjs` and require `node` plus `git`. They do not install dependencies, alter package files, change CI, touch global Codex config, activate runtime skills, or write outside the target `.ai-toolkit/` directory.

## Version Pinning

Every project install records the toolkit version and toolkit commit in `.ai-toolkit/.ai-toolkit-version`. It also records a SHA256 manifest for every managed artifact in `.ai-toolkit/.ai-toolkit-manifest.json`. Projects should review both files in the same PR that introduces or updates `.ai-toolkit/`.

Updates are intentional. Projects should not auto-pull toolkit changes.

## Files That Must Never Be Overwritten

The sync scripts only manage selected files under `.ai-toolkit/`. They do not create or overwrite:

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

Bash equivalent:

```bash
bash install/install-project.sh \
  --target /path/to/project \
  --agents skill-scout-agent,reviewer-agent,qa-test-agent,security-agent \
  --profiles audit-profile
```

Review the dry-run output before using `-ConfirmWrite`.

## Project-Managed Skills

Selected toolkit-owned skills are copied as project-managed artifacts under:

- `.ai-toolkit/skills/<skill-name>/SKILL.md`

Phase 6 v1 syncs single-file toolkit skills only. It does not support bundled skill resources, activate skills globally, install external skills, or change Codex global config.
