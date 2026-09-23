---
name: governance
description: Use for software governance, source-of-truth checks, scope and authorization boundaries, validation evidence, and release readiness.
---

# Governance

Use this as the canonical final governance entrypoint for serious toolkit or project work.

This skill authorizes routing, planning, read-only checks, capability selection, context-budget discipline, safety gates, and validation gates only. It does not authorize writes, migrations, package changes, CI changes, MCP setup, global config changes, external installs, product-repository writes, or broad plugin/tool activation.

## Operating Rules

- Verify repository source of truth before readiness, release, or implementation claims.
- Select the smallest useful profile, agent, skill, support-tool, and method surface.
- GSD and Superpowers are optional. Select a specific workflow when requested or materially useful; task seriousness alone does not require a framework or fallback declaration.
- Use compact context packs for large tasks instead of whole-repo or whole-registry dumps.
- Keep selected agents separate from agents actually spawned.
- Treat registries, source records, dry-runs, reports, and metadata as evidence, not execution.
- Preserve WARN output in completion reports even when aggregate validation passes.
- Stop before security-sensitive, destructive, global, package, CI, or product-repository changes unless the current request or earlier session authorization already covers that exact action; ask only when authority is missing.
- For multi-step or materially ambiguous work, route through `.ai-toolkit/methods/governance/task-intake-routing-gate.md` when it helps establish scope and validation. Canonical toolkit source: `methods/governance/task-intake-routing-gate.md`.
- Use `.ai-toolkit/methods/governance/governance-lite-router-mode.md` as a concise method-only governance mode for small/medium tasks; do not create or activate a `governance-lite` or `router-lite` skill. Canonical toolkit source: `methods/governance/governance-lite-router-mode.md`.
- Route serious implementation through `.ai-toolkit/methods/reliability/coding-time-production-readiness.md` when production-style coding-time gates are needed. Canonical toolkit source: `methods/reliability/coding-time-production-readiness.md`.
- Route unsafe-command questions through `.ai-toolkit/methods/governance/agent-command-safety.md`. Canonical toolkit source: `methods/governance/agent-command-safety.md`.
- Route package-manager or workspace migration questions through `.ai-toolkit/methods/repo/package-manager-workspace-migration.md`. Canonical toolkit source: `methods/repo/package-manager-workspace-migration.md`.
- Use `.ai-toolkit/docs/PROJECT_TOOLING_OPERATING_MODEL.md` for v0.2 project tooling boundaries. Canonical toolkit source: `docs/PROJECT_TOOLING_OPERATING_MODEL.md`.
- Use the v0.2.5 activation model: `active-if-detected` for existing project-owned tools, `owner-approved-install` for absent tools, `ci-advisory` before calibrated CI blocking, `static-adopted` for safe toolkit-owned static concepts, and `forbidden-runtime` for MCP/daemon/global/memory/watcher conflicts.
- Use a project-installed `.ai-toolkit/templates/commit-message-template.md` for governed release or hardening commits that need consistent why/what/validation evidence. Canonical toolkit source: `templates/commit-message-template.md`.
- Use `.ai-toolkit/methods/internal/documentation-accuracy-guard.md` when docs mention concrete symbols, commands, flags, routes, config keys, paths, examples, or behavior. Canonical toolkit source: `methods/internal/documentation-accuracy-guard.md`.

## Optional Workflow Evidence

Use GSD or Superpowers when the user requests the workflow or its specific planning, debugging, review, or verification method materially helps. Otherwise proceed with a proportionate understand-act-validate loop. Existing task authorization carries across routing and skill boundaries; a skill cannot authorize extra actions.

Report a workflow only when it ran or a material limitation needs explanation. Do not claim invocation from selection, source records, registries, dry-runs, or planned follow-ups. Do not require status entries for unused frameworks.

## Large-Task Context Pack

For a large task or handoff that needs context transfer, maintain a compact task record containing the applicable items below. Include only decision-relevant details in the user-facing response:

- token mode: `concise`, `standard`, or `detailed`
- changed-file neighborhood selected and why
- compact agent context pack contents
- omitted context and reason
- source, method, and profile references used
- private-overlay, secret, credential, and product-repo exclusions
- context evidence label: `project-map`, `manual/static`, or `tool-generated`
- status values such as `metadata-only` or `not invoked` must be reported as status, not as context evidence labels

## Completion Evidence

Report branch/baseline, selected lenses or agents, files changed, validation commands, skipped checks, WARN output, residual risk, and the next release action.

Keep completion evidence proportional: omit unused-framework statuses and empty sections; surface actual blockers and WARN output.
