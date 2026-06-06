---
name: governance
description: Use for governed software work that needs source-of-truth checks, routing, token/context governance, branch/PR discipline, validation honesty, and release readiness. Do not use as approval for writes, installs, migrations, broad plugin use, external tool activation, or global config changes.
---

# Governance

Use this as the canonical final governance entrypoint for serious toolkit or project work.

This skill authorizes routing, planning, read-only checks, capability selection, context-budget discipline, safety gates, and validation gates only. It does not authorize writes, migrations, package changes, CI changes, MCP setup, global config changes, external installs, product-repository writes, or broad plugin/tool activation.

## Operating Rules

- Verify repository source of truth before readiness, release, or implementation claims.
- Select the smallest useful profile, agent, skill, support-tool, and method surface.
- Use compact context packs for large tasks instead of whole-repo or whole-registry dumps.
- Keep selected agents separate from agents actually spawned.
- Treat registries, source records, dry-runs, reports, and metadata as evidence, not execution.
- Preserve WARN output in completion reports even when aggregate validation passes.
- Stop before security-sensitive, destructive, global, package, CI, or product-repository changes unless separately approved.
- Route normal-language tasks through `.ai-toolkit/methods/governance/task-intake-routing-gate.md` before coding. Canonical toolkit source: `methods/governance/task-intake-routing-gate.md`.
- Use `.ai-toolkit/methods/governance/governance-lite-router-mode.md` as a concise method-only governance mode for small/medium tasks; do not create or activate a `governance-lite` or `router-lite` skill. Canonical toolkit source: `methods/governance/governance-lite-router-mode.md`.
- Route serious implementation through `.ai-toolkit/methods/reliability/coding-time-production-readiness.md` when production-style coding-time gates are needed. Canonical toolkit source: `methods/reliability/coding-time-production-readiness.md`.
- Route unsafe-command questions through `.ai-toolkit/methods/governance/agent-command-safety.md`. Canonical toolkit source: `methods/governance/agent-command-safety.md`.
- Route package-manager or workspace migration questions through `.ai-toolkit/methods/repo/package-manager-workspace-migration.md`. Canonical toolkit source: `methods/repo/package-manager-workspace-migration.md`.
- Use `.ai-toolkit/docs/PROJECT_TOOLING_OPERATING_MODEL.md` for v0.2 project tooling boundaries. Canonical toolkit source: `docs/PROJECT_TOOLING_OPERATING_MODEL.md`.
- Use the v0.2.3 activation model: `active-if-detected` for existing project-owned tools, `owner-approved-install` for absent tools, `ci-advisory` before calibrated CI blocking, `static-adopted` for safe toolkit-owned static concepts, and `forbidden-runtime` for MCP/daemon/global/memory/watcher conflicts.

## Large-Task Context Pack

For large tasks, source reviews, implementation plans, PR reviews, or multi-agent handoffs, report:

- token mode: `concise`, `standard`, or `detailed`
- changed-file neighborhood selected and why
- compact agent context pack contents
- omitted context and reason
- source, method, and profile references used
- private-overlay, secret, credential, and product-repo exclusions
- graph evidence label: `manual/static`, `tool-generated`, `metadata-only`, or `not invoked`

## Completion Evidence

Report branch/baseline, selected lenses or agents, files changed, validation commands, skipped checks, WARN output, residual risk, and the next release action.
