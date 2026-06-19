# Default Tool Enterprise-Risk Review

Date: 2026-06-19

## Scope

This review covers baseline/default project-tool recommendations and the current governed tool inventory in `registries/tools.registry.json`. It does not approve installation, execution, CI wiring, MCP setup, global configuration, package changes, lockfile changes, product-repository scanning, external service permission changes, or enterprise deployment.

Evidence basis:

- `registries/tools.registry.json`
- `git ls-remote <repo> HEAD` for the baseline reviewed source identities
- `sources/gsd-core.md`
- `sources/repomix.md`
- `docs/PROJECT_TOOL_INSTALLATION_MATRIX.md`
- `docs/PROJECT_TOOLING_OPERATING_MODEL.md`

## Rule

Enterprise-risk metadata remains conservative. When license, telemetry, network behavior, permission model, package contents, maintenance quality, or runtime side effects were not inspected, values stay `unknown-review-required` and the missing areas are listed in `enterpriseRisk.uninspectedAreas`.

## Current Inventory

The registry contains 38 tools. The v0.2.4 baseline evidence pass reviewed source identity and registry posture for:

| Tool | Reviewed source | Reviewed commit/version | Review state | Risk tier | Next review |
| --- | --- | --- | --- | --- | --- |
| TypeScript | `https://github.com/microsoft/TypeScript` | `7964e22f2b85f16e520f0e902c7fd7b6f0c15416` | `metadata-only-owner-review-required` | `low-medium` | 2026-09-19 |
| typescript-eslint | `https://github.com/typescript-eslint/typescript-eslint` | `594c01aac353052a23858b4a24e826be7fee358a` | `metadata-only-owner-review-required` | `low-medium` | 2026-09-19 |
| eslint-plugin-react-hooks | `https://github.com/facebook/react` | `e92ecef2806692f34e9d535da77405eb28464625` | `metadata-only-owner-review-required` | `low-medium` | 2026-09-19 |
| Vitest | `https://github.com/vitest-dev/vitest` | `29c364d50e45eb6fdec0c4c4eea8bf3949e56b43` | `metadata-only-owner-review-required` | `low-medium` | 2026-09-19 |
| Testing Library | `https://github.com/testing-library/react-testing-library` | `be9d81d91314c9f0bafaa363f70b409b4b31989c` | `metadata-only-owner-review-required` | `low-medium` | 2026-09-19 |
| Playwright | `https://github.com/microsoft/playwright` | `32883517ffe7725ef45ac2dc020a63962c27d7a3` | `metadata-only-owner-review-required` | `medium` | 2026-09-20 |
| Gitleaks | `https://github.com/gitleaks/gitleaks` | `8ad8470035d31a209322c580153b45c18e21b980` | `metadata-only-owner-review-required` | `medium` | 2026-09-19 |
| OSV-Scanner | `https://github.com/google/osv-scanner` | `b56b5191101d5f27d4787d5583d8d01e9518a7af` | `metadata-only-owner-review-required` | `medium` | 2026-09-19 |
| Semgrep | `https://github.com/semgrep/semgrep` | `4e0501d758e51213ecf279e224d498fc71cb5b2c` | `metadata-only-owner-review-required` | `medium` | 2026-09-19 |
| ESLint | `https://github.com/eslint/eslint` | `7feaff0cfb8d6a6260d3ea56887c9161daf8c700` | `metadata-only-owner-review-required` | `low-medium` | 2026-09-19 |

Already governed source records retained:

| Tool | Evidence | Review state |
| --- | --- | --- |
| GSD Core | `sources/gsd-core.md`, `7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034`, 2026-06-20 | `reviewed` metadata-only active-if-detected posture |
| Repomix | `sources/repomix.md`, `bb4ac4763faeb7fc3d31438f072a6946b5b290b9`, 2026-06-19 | `reviewed` metadata-only scoped context posture |
| CodeRabbit | Delegated integration metadata only | `metadata-only-owner-review-required` |

Out of scope for this v0.2.4 baseline evidence pass:

| Category | Tools | Reason |
| --- | --- | --- |
| Use-if-existing or conditional developer tools | Biome, Oxlint, Knip, React Doctor, axe-playwright, Lighthouse CI, Trivy, Checkov, actionlint, zizmor, dependency-cruiser, eslint-plugin-boundaries, Madge, jscpd | Not part of the baseline review batch; remain owner-review-required before install/execution. |
| Static or approval-required external services/scanners | CodeQL, TruffleHog, Dependabot, Renovate, Socket, OWASP ZAP baseline, Harden-Runner, reviewdog, GitHub/gh, OpenSSF Scorecard | Permission, SaaS, CI, or runtime posture requires separate evidence and owner approval. |
| Reference-only design/source intelligence | open-design | Reference-only until separately approved. |

## Inspected Areas

For the baseline reviewed tools, v0.2.4 inspected:

- source repository identity and current default-branch HEAD;
- registry status, default use, activation levels, and forbidden-use boundaries;
- whether registry metadata still blocks install, runtime execution, CI, MCP, global config, and product-repository use.

## Uninspected Areas

The baseline pass did not inspect:

- license legal approval;
- package release tarballs or binaries;
- telemetry behavior;
- network behavior during execution;
- runtime side effects;
- CI behavior;
- project-specific permissions or configuration;
- maintenance quality beyond current public HEAD resolution.

## Required Reporting

When recommending any default tool, report:

- whether it already exists in the target project;
- whether it was actually executed;
- the exact output if executed;
- owner approval status for new install/config;
- skipped or unavailable checks;
- remaining enterprise-risk unknowns.

## Forbidden Claims

- Do not claim enterprise approval from default-install, baseline, or metadata-only status.
- Do not claim scanner output from registry metadata.
- Do not claim license compatibility beyond reviewed source-record evidence.
- Do not claim telemetry, data-flow, permissions, or vendor posture when evidence is missing.
- Do not treat `.ai-toolkit`, source records, templates, generated artifacts, or dry-run planner output as execution.
