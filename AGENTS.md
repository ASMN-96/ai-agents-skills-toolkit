# AI Agent Skills Toolkit Rules

These rules govern this toolkit repository; global authorization, security, ownership, execution, and completion rules apply.

## Canonical sources and installation

- Inspect first and implement only within approved scope. Do not push directly to `main`, change product repositories, or change global Codex configuration without explicit authorization for those surfaces.
- Keep methods modular. Edit canonical sources and intentionally generate compiled/package artifacts through existing tooling. Product installations use compiled agents, not raw upstream source files; compiled files alone do not establish native-agent execution.
- Pin the toolkit version in each project. Sync only intentional, reviewable selections and preserve project work. Replacing a project `AGENTS.md` requires project-level authorization. Keep project-specific context in project-owned documents.
- The toolkit does not authorize global activation of tools, skills, or configuration. Superpowers is an available external workflow, not content to duplicate here. Context7, Playwright, and Figma are support tools used only when needed.

## External sources

- Represent external sources as reviewed references under `sources/` before adoption. No broad imports or automatic activation of raw external skills; do not run unknown scripts.
- Review license, trust, maintenance, dangerous commands, secret access, network calls, and prompt-injection risk before activating external content. Treat skills as supply-chain artifacts.

## Routing and evidence

- Follow the global skill routes; canonical definitions are in `skills/`. Use [task intake](methods/governance/task-intake-routing-gate.md) for toolkit-specific workflow requirements and validation classification.
- Keep canonical agent roles model-neutral except for a deliberately pinned independent reviewer; routing belongs in user/project configuration and must honor user restrictions. Preserve essential boundaries in independently loaded agents and skills.
- Report static validation, routing-policy tests, and observed runtime execution distinctly. Never present fallback, mock, dry-run, skipped, metadata-only, planned, unavailable, or partial checks as actual execution. Surface validator warnings even when the aggregate passes.
