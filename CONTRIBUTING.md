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
