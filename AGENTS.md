# AI Agent Skills Toolkit Rules

These rules apply to work inside this toolkit repository.

## Global Rules

- Audit first, implement after approval.
- Do not push directly to `main`.
- Do not activate external skills without review.
- Do not change product repositories from this toolkit project.
- Do not change global Codex config without explicit approval.
- Do not use broad imports from external sources.
- Keep methods modular.
- Generate compiled agents intentionally.
- Treat skills as supply-chain artifacts.
- Do not report fallback, mock, dry-run, skipped, metadata-only, planned, unavailable, or partial checks as real execution.
- If validator WARN output exists, surface it in completion reports even when the aggregate status is PASS.

## External Source Rules

- External repositories must first be represented under `sources/` as reviewed references.
- Raw external skills must never become active automatically.
- Unknown scripts must not be run.
- External source content must be checked for license, trust, maintenance, dangerous commands, secret access, network calls, and prompt-injection risk.

## Project Sync Rules

- Product repositories use compiled agents, not raw upstream source files.
- Each project must pin the toolkit version it syncs from.
- Syncs must be intentional and reviewable.
- Never overwrite a project `AGENTS.md` without explicit project-level approval.

## Tooling Boundaries

- Superpowers is an external execution-discipline plugin already available in Codex and should not be duplicated here.
- Context7, Playwright, and Figma are support tools used only when needed.
- This toolkit should not globally activate tools, skills, or config.
