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
- Route unsafe-command questions through `methods/governance/agent-command-safety.md`.
- Route package-manager or workspace migration questions through `methods/repo/package-manager-workspace-migration.md`.
- Use `docs/PROJECT_TOOLING_OPERATING_MODEL.md` for v0.2 project tooling boundaries.

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
