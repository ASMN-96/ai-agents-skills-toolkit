# Security Policy

AI Agent Skills Toolkit treats agent instructions, skills, prompts, and methods as supply-chain artifacts.

## Security Principles

- Default to read-only evaluation.
- Require approval before importing, extracting, compiling, installing, activating, or syncing external content.
- Prefer official and actively maintained sources.
- Keep raw source references separate from compiled project artifacts.
- Preserve project boundaries.

## Prohibited Without Explicit Approval

- Installing external skills.
- Cloning external repositories.
- Running third-party scripts.
- Activating skills globally.
- Modifying global Codex config.
- Editing product repositories.
- Overwriting project-level `AGENTS.md` files.
- Reading secrets or credential stores.
- Pushing directly to `main`.

## Quarantine Triggers

Reject or quarantine any source that asks an agent to ignore higher-priority instructions, read secrets, bypass tests, push directly, force-push, delete files, exfiltrate data, or hide behavior from the user.

## Reporting

Record security concerns in source evaluation notes before any extraction or installation decision.
