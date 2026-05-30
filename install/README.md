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
- Scripts only manage selected files under `.ai-toolkit/`.
- Scripts do not install external skills, clone repositories, run third-party scripts, activate anything globally, or modify Codex global config.
- Scripts do not create or overwrite project-local `AGENTS.md` or `docs/ai` context files.
- Updates are version-pinned, approval-based, and auditable.
- Bash entrypoints require `node` and `git`; they do not install either tool.
