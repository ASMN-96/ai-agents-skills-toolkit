# Install

This directory contains Phase 5 project sync workflows for installing, updating, and validating selected compiled agents and profiles in a target project under `.ai-toolkit/`.

Scripts:

- `install-project.ps1`: dry-run-first installer for selected compiled agents and profiles.
- `update-project.ps1`: dry-run-first updater for an existing `.ai-toolkit/` install.
- `validate-project-install.ps1`: validator for installed toolkit files and unsafe artifacts.

Rules:

- Dry-run is the default.
- `-ConfirmWrite` is required before writing to a target project.
- Scripts only manage selected files under `.ai-toolkit/`.
- Scripts do not install external skills, clone repositories, run third-party scripts, activate anything globally, or modify Codex global config.
- Scripts do not create or overwrite project-local `AGENTS.md` or `docs/ai` context files.
- Updates are version-pinned, approval-based, and auditable.
