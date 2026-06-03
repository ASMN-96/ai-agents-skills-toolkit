# Skills

This directory is reserved for reviewed skill metadata and toolkit-managed skill notes.
Skill artifacts are file-backed markdown records in `skills/<name>/SKILL.md`.

Raw external skills must not become active automatically. Treat all skills as supply-chain artifacts requiring source evaluation, approval, and intentional activation or compilation.

No external skills have been installed or activated by this toolkit.

## Toolkit-Owned Skills

The public runtime exposes exactly five canonical skills:

- `governance`: source-of-truth checks, routing, branch/PR discipline, validation honesty, and release readiness.
- `uiux`: visual quality, workflow clarity, responsive behavior, accessibility, and browser-visible UI evidence.
- `code-quality`: React, TypeScript, hooks, tests, build quality, and maintainability routing.
- `security-review`: auth, authorization, tenant isolation, secrets, public/private payloads, supply-chain, and source safety.
- `pr-release-gate`: branch hygiene, checks, review feedback, release gates, and merge readiness.

Old alias and helper skill folders were removed from active runtime. See `docs/MIGRATION_TO_CANONICAL_SKILLS.md`.

## External Governance Tools

- GSD is an external core governance tool for serious multi-step work, audits, migrations, backend work, security/SRE audits, and release programs. It tracks phase/state/roadmap/release gates and must not be vendored into this toolkit.
- Superpowers remains the external core execution-discipline plugin for systematic debugging, TDD, code review, and verification-before-completion.
- Use only the minimum required tools for a task. Do not activate every plugin, tool, agent, or profile by default.

## Phase 10 Registry Boundary

Skill registry entries are metadata only. Registry presence does not install, activate, approve, or execute a skill. Missing-skill discovery is read-only by default and requires approval before install, activation, copying, syncing, or extraction outside an approved implementation scope.
