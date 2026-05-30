---
name: ai-project-governance
description: Use for governed software work that needs source-of-truth checks, routing, branch/PR/CI discipline, security caution, validation honesty, and release readiness. Do not use as approval for writes, installs, migrations, broad plugin use, external tool activation, or global config changes.
---

# AI Project Governance

Use this as the public-safe governance entrypoint for serious toolkit or project work.

This skill authorizes routing, planning, read-only checks, capability selection, and validation gates only. It does not authorize writes, migrations, package changes, CI changes, MCP setup, global config changes, external installs, product-repository writes, or broad plugin/tool activation.

## Operating Rules

- Verify the repository source of truth before readiness or release claims.
- Select the smallest useful agent, skill, and support-tool surface.
- Keep selected agents separate from agents actually spawned.
- Treat registries, source records, dry-runs, reports, and metadata as evidence, not execution.
- Preserve WARN output in completion reports even when aggregate validation passes.
- Stop before security-sensitive, destructive, global, package, CI, or product-repository changes unless separately approved.

## Completion Evidence

Report branch/baseline, selected lenses or agents, files changed, validation commands, skipped checks, WARN output, residual risk, and the next release action.
