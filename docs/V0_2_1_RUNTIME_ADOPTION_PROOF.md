# v0.2.1 Runtime and Adoption Proof

Date: 2026-06-05

## Scope

This PR2 proof separates repository-local runtime evidence from machine-specific global cleanup.

- Repo-local proof is based on tracked toolkit files and validators.
- Global cleanup is backup-first and limited to toolkit-owned canonical Codex skills and project-agent files.
- Product repositories were not touched.
- No install, package/lockfile change, CI wiring, MCP configuration, external skill activation, or global Codex config edit was performed.

## Repo-Local Runtime Proof

Baseline after PR1 merge:

- Branch baseline: `main` at `1f0978c27c24292c5332b38828a15a8bf5b4c010`.
- Source freshness: clean with no actionable changes.
- Source freshness counts observed at baseline: `UNCHANGED 17`, `REVIEWED_HELD 3`.
- Runtime validator: active runtime remains `5 skills / 12 project agents`.
- Toolkit validator: PASS with WARN output visible.
- Leak scan: current-tree blockers remained `0`.

Canonical repo-local runtime surfaces:

- Active skills: `governance`, `uiux`, `code-quality`, `security-review`, `pr-release-gate`.
- Active project agents: `product-agent`, `architect-agent`, `reviewer-agent`, `uiux-agent`, `frontend-agent`, `backend-contract-agent`, `database-rls-agent`, `security-agent`, `qa-test-agent`, `release-manager-agent`, `skill-scout-agent`, `sre-performance-agent`.

## Adoption Dry-Run Status

No product repository was named as an approved PR2 dry-run target. The adoption dry-run is therefore owner-blocked for this PR and no product repo was read or written.

This report does not claim product adoption, product sync, or target-repo validation.

## Global Cleanup Evidence

Global cleanup was performed only after a hash inventory showed drift in toolkit-owned global files:

- Stale global skills: all 5 canonical toolkit skill `SKILL.md` files differed from repo-local canonical copies.
- Stale global agents: `reviewer-agent.toml`, `frontend-agent.toml`, `security-agent.toml`, `qa-test-agent.toml`, and `release-manager-agent.toml`.
- Already matching global agents: `product-agent.toml`, `architect-agent.toml`, `uiux-agent.toml`, `backend-contract-agent.toml`, `database-rls-agent.toml`, `skill-scout-agent.toml`, and `sre-performance-agent.toml`.

Backup path:

- `<codex-home>/global-cleanup-archives/toolkit-pr2-runtime-adoption-20260605-132036`

Files refreshed from repo-local canonical copies:

- `<codex-home>/skills/governance/SKILL.md`
- `<codex-home>/skills/uiux/SKILL.md`
- `<codex-home>/skills/code-quality/SKILL.md`
- `<codex-home>/skills/security-review/SKILL.md`
- `<codex-home>/skills/pr-release-gate/SKILL.md`
- `<codex-home>/agents/reviewer-agent.toml`
- `<codex-home>/agents/frontend-agent.toml`
- `<codex-home>/agents/security-agent.toml`
- `<codex-home>/agents/qa-test-agent.toml`
- `<codex-home>/agents/release-manager-agent.toml`
- `<codex-home>/agents/ai-toolkit-agents-manifest.json`

Post-cleanup byte-identity verification showed:

- 5 of 5 canonical global skills match repo-local canonical copies.
- 12 of 12 global agent TOMLs match repo-local canonical copies.

Files intentionally not touched:

- Global Codex config, auth, databases, caches, plugin cache, MCP settings, package files, lockfiles, product repositories, unrelated global skills, GSD files, Playwright files, and external plugin artifacts.

## Runtime Visibility Boundary

This PR proves filesystem-level runtime alignment and validator health. It does not claim a restarted fresh-session UI visibility test unless a separate fresh-session check is performed and recorded.

## Final Validation

Validation was run after sanitizing machine-specific path evidence:

- `git status --short`: tracked PR2 changes only.
- `git diff --check`: PASS; Git reported CRLF normalization warnings.
- `node --test scripts/test-*.mjs`: PASS, 30 tests, 27 pass, 3 skipped.
- `node scripts/check-source-freshness.mjs --fail-on-change`: PASS, `UNCHANGED 17`, `REVIEWED_HELD 3`, no actionable changes.
- `node scripts/validate-toolkit.mjs`: PASS with WARN output preserved for `code-review-graph` review metadata.
- `node scripts/validate-project-tooling-profiles.mjs`: PASS.
- `node scripts/validate-public-package.mjs`: PASS, 40 public files scanned, 0 findings.
- `node scripts/ai-toolkit/validate-ai-toolkit.mjs`: PASS with WARN output preserved for `code-review-graph` review metadata.
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`: PASS, active runtime `5 skills, 12 project agents`.
- `node scripts/ai-toolkit/validate-version-consistency.mjs`: PASS.
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`: PASS.
- `node scripts/scan-public-private-leaks.mjs`: PASS, 384 files scanned, 87 categorized findings, no current-tree blocker category.

## Non-Goals

- No new active skill.
- No sixth skill.
- No product-repo sync.
- No product-repo dry-run without an explicitly named target.
- No install.
- No package or lockfile change.
- No CI wiring.
- No MCP or global config change.
- No external source activation.
