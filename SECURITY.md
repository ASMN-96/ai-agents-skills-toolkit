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

## Supported Scope

Supported security scope for public reporting includes toolkit-owned scripts, validators, registries, source records, skills, compiled-agent generation, package allowlist behavior, and public/core release artifacts.

Out of scope unless separately authorized:

- unrelated product repositories,
- production systems,
- third-party services,
- external source repositories,
- global user configuration,
- local credential stores,
- social engineering, spam, denial-of-service, or destructive testing.

## Reporting

Report security concerns without including secrets, tokens, cookies, credentials, private data, or exploit payloads that affect systems outside the approved scope.

Use a private maintainer/security contact when available. If no private channel is configured yet, open a minimal public issue that requests a private disclosure path and does not include sensitive details.

Until a private vulnerability reporting channel is enabled, do not paste exploit details, working payloads, customer data, local paths, environment values, or credential material into public issues. Use the smallest public report needed to request a private handoff.

## Response Expectations

- Acknowledge valid reports when a maintainer/security owner is available.
- Triage impact, affected scope, exploitability, and release-blocking status.
- Fix through reviewed pull requests and normal validation.
- Preserve public/private boundaries in advisories and release notes.

Record security concerns in source evaluation notes before any extraction or installation decision.

## Public Release Gap

Before Level 5 public release, assign a maintainer/security owner and private reporting channel. Until those owner decisions are recorded, this policy is sufficient for public-safe repository hygiene but not a complete managed vulnerability disclosure program.

Current owner-decision backlog:

- assign security maintainer or owner group,
- enable GitHub private vulnerability reporting or publish an equivalent private disclosure path,
- document response targets after the private path exists.
