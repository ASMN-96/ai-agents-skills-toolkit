# Default Tool Enterprise-Risk Review

Date: 2026-06-05

## Scope

This review covers only baseline/default project-tool recommendations. It does not approve installation, execution, CI wiring, MCP setup, global configuration, package changes, lockfile changes, product-repository scanning, external service permission changes, or enterprise deployment.

Evidence basis:

- `registries/tools.registry.json`
- `.ai-toolkit/sources/records/*.md` metadata when present
- `docs/PROJECT_TOOL_INSTALLATION_MATRIX.md`
- `docs/PROJECT_TOOLING_OPERATING_MODEL.md`

## Rule

Enterprise-risk metadata must remain conservative. When evidence is missing, the value stays `unknown-review-required`; registry presence is not evidence of safety, license compatibility, network behavior, telemetry posture, or enterprise readiness.

## Baseline Defaults

| Tool | Default posture | Enterprise-risk decision |
| --- | --- | --- |
| TypeScript / typecheck | default-install recommendation only when the target project owns a script or owner approves install | Keep unknown fields as `unknown-review-required`; no enterprise-safe claim |
| ESLint | default-install recommendation only when the target project owns a script or owner approves install | Keep unknown fields as `unknown-review-required`; no enterprise-safe claim |
| typescript-eslint | default-install recommendation only when relevant and owner-approved for new install | Keep unknown fields as `unknown-review-required`; no enterprise-safe claim |
| eslint-plugin-react-hooks | default-install recommendation only for React projects and owner-approved for new install | Keep unknown fields as `unknown-review-required`; no enterprise-safe claim |
| Vitest | default-install recommendation only when tests are appropriate and owner-approved for new install | Keep unknown fields as `unknown-review-required`; no enterprise-safe claim |
| Testing Library | default-install recommendation only for UI/component behavior and owner-approved for new install | Keep unknown fields as `unknown-review-required`; no enterprise-safe claim |
| Playwright | default-install recommendation for serious UI/browser apps; currently reviewed-held as runtime-sensitive source intelligence | Keep unknown or held runtime fields conservative; no browser binary, MCP, CLI, package, or CI adoption without approval |
| Gitleaks | default-install recommendation only as target-project baseline secret scanning after owner approval | Keep unknown fields as `unknown-review-required`; no scanner output claim unless actually run |
| OSV Scanner | default-install recommendation only as target-project dependency baseline after owner approval | Keep unknown fields as `unknown-review-required`; no vulnerability output claim unless actually run |

## Required Reporting

When recommending any default tool, report:

- whether it already exists in the target project;
- whether it was actually executed;
- the exact output if executed;
- owner approval status for new install/config;
- skipped or unavailable checks;
- remaining enterprise-risk unknowns.

## Forbidden Claims

- Do not claim enterprise approval from default-install status.
- Do not claim scanner output from registry metadata.
- Do not claim license compatibility beyond reviewed source-record evidence.
- Do not claim telemetry, data-flow, permissions, or vendor posture when evidence is missing.
- Do not treat `.ai-toolkit`, source records, templates, or dry-run planner output as execution.

