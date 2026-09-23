# Install

This directory contains Phase 5/6 project sync workflows for installing, updating, and validating selected compiled agents, profiles, and toolkit-owned skills in a target project under `.ai-toolkit/`.

Scripts:

- `install-project.ps1`: dry-run-first installer for selected compiled agents and profiles.
- `update-project.ps1`: dry-run-first updater for an existing `.ai-toolkit/` install.
- `validate-project-install.ps1`: validator for installed toolkit files and unsafe artifacts.
- `install-project.sh`: Bash installer entrypoint for macOS/Linux/Git Bash environments.
- `update-project.sh`: Bash updater entrypoint for macOS/Linux/Git Bash environments.
- `validate-project-install.sh`: Bash validator entrypoint for macOS/Linux/Git Bash environments.
- `project-sync-core.mjs`: shared Node implementation used by the Bash entrypoints for JSON parsing, hashing, manifests, and Git safety checks.

Rules:

- Dry-run is the default.
- `-ConfirmWrite` for PowerShell or `--confirm-write` for Bash is required before writing to a target project.
- `-ExportPlan` for PowerShell or `--export-plan` for Bash emits only deterministic JSON to standard output. It is mutually exclusive with confirm-write and never writes target files.
- Export mode disables Git optional locks for its whole process, including project-map inspection, so read-only Git queries do not refresh the target index.
- If project-map safety validation fails, export stops before serializing candidates and returns only a sanitized issue count on standard error.
- Exported plans include every selected and transitively referenced asset with a `create` or `replace` operation, source and destination paths, source SHA-256, and the destination's current SHA-256 or explicit `absent` state. They also include deterministic generated candidates for the project map, config, version record, and manifest so a controlled reconciliation can validate a dirty target.
- Scripts only manage selected files under `.ai-toolkit/`.
- Scripts do not install external skills, clone repositories, run third-party scripts, activate anything globally, or modify Codex global config.
- Scripts do not create or overwrite project-local `AGENTS.md` or `docs/ai` context files.
- Updates are version-pinned, approval-based, and auditable.
- Bash entrypoints require `node` and `git`; they do not install either tool.

Example update export (quote the target path when it contains spaces):

```powershell
pwsh -NoProfile -File install/update-project.ps1 -TargetPath 'C:\path with spaces\project' -ExportPlan > update-plan.json
```

```bash
bash install/update-project.sh --target '/path with spaces/project' --export-plan > update-plan.json
```

The generated candidates use the declared `json-pretty-2-lf-final-newline` serialization. Their `sourcePath` is `null` because they are derived data; materialize the exact `content` with that serialization before using the reported source hash in a reconciliation-v2 plan.

## Guarded synchronization for an authorized dirty target

`guarded-project-sync.mjs` is a separate overlay path for a specifically authorized dirty project. It does not relax or replace the ordinary installer's clean, upstream-aligned feature-branch gate. The command captures the existing export in child-process memory, validates and buffers all source bytes, and never prints or persists generated candidate content.

Both the target and backup directory must be explicit. Dry-run is the default:

```powershell
node install/guarded-project-sync.mjs `
  --target 'C:\path with spaces\project' `
  --backup 'C:\reviewed-backups\project-sync-2026-09-09'
```

After reviewing the path-and-hash-only report, add `--confirm-write`. Use `--command install` plus `--agents`, `--profiles`, `--skills`, or `--config` for a first install; update is the default command.

Confirmed writes create exclusive, hash-verified before-image backups and `guarded-project-sync-journal.json`, acquire cooperative target/destination/backup-workspace locks, recheck sources and destinations, guard creates with exclusive file creation, and verify destination read-back hashes. A partial failure is returned as structured JSON and retains the journal and backups. Target and toolkit checkout paths must be disjoint in both containment directions, so the guarded command cannot update its own source tree.

Journal create and update operations write an exclusive temporary file, flush its file data, close it, and only then publish it by an exclusive hard-link create, atomic rename where supported, or a recoverable hard-link replacement on Windows. The Windows replacement keeps a link to the prior journal until the flushed replacement is published. The command requests a parent-directory metadata flush on platforms where portable Node directory handles support it. Portable Node on Windows does not expose a supported directory-fsync operation, so Windows guarantees flushed journal file data before publication but does not claim crash-durable directory metadata. Tests verify the ordering through injected filesystem operations; they do not simulate or claim proof of power-loss behavior.

Rollback is also dry-run first:

```powershell
node install/guarded-project-sync.mjs `
  --target 'C:\path with spaces\project' `
  --backup 'C:\reviewed-backups\project-sync-2026-09-09' `
  --rollback
```

Add `--confirm-write` only after reviewing the rollback actions. Rollback restores a replacement or removes a created file only when its current hash still matches the applied hash; later owner edits stop the whole rollback before any destination write.

The guarantees are bounded by the hashes and file identities observed at each check. The locks coordinate this command only, and the filesystem operations are not a cross-filesystem transaction. Keep the backup directory and journal until rollback is no longer needed. Backup directories must be outside both the target and toolkit checkout and must be new or empty for apply.
