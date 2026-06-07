# Contributing

This toolkit is a governance, provenance, source-safety, quality, and release-discipline layer. Contributions should preserve that boundary.

## Contribution Rules

- Keep changes scoped, reviewable, and reversible.
- Do not add external installs, package changes, CI changes, MCP setup, global config changes, or product-repository writes without explicit approval.
- Treat external skills, repositories, docs, and tools as supply-chain inputs until reviewed.
- Do not copy raw upstream skill bodies or tool documentation into active runtime paths.
- Keep public/core content free of private project names, local machine paths, private repository names, secrets, tokens, credentials, cookies, or environment values.
- Report dry-run, skipped, metadata-only, mock, planned, partial, or unavailable checks honestly.

## Validation

Run the narrowest relevant checks first, then broader validators before release claims:

- `node scripts/validate-toolkit.mjs`
- `node scripts/check-source-freshness.mjs`
- `node scripts/scan-public-private-leaks.mjs`
- `node scripts/validate-public-package.mjs`
- `git diff --check`

## Review Expectations

Pull requests should explain scope, files changed, validation run, WARN output, skipped checks, residual risk, and rollback expectations.

## Method Quality Rubric

Method, skill, profile, routing, or eval contributions should:

- state purpose, trigger, negative trigger, operating boundary, verification requirement, and stop conditions,
- include source provenance and license/trust boundary when external sources influenced the work,
- avoid raw upstream copying and close paraphrase from restricted or license-caveated sources,
- separate routing metadata from runtime/tool execution,
- include no-fake-validation boundaries for dry-run, mock, fallback, skipped, metadata-only, unavailable, or partial checks,
- add or update focused evals when behavior or routing changes.

Do not add root package management, pre-commit hooks, generated artifacts, global config, CI behavior, external services, or product-repository sync changes unless the PR scope explicitly approves that architecture.
