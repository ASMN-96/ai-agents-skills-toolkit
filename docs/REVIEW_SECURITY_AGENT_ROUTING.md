# Review and Security Agent Routing

This document routes review, release, QA, backend, database, and security responsibilities without creating duplicate merge authorities.

## reviewer-agent vs CodeRabbit

- reviewer-agent owns local repository-policy review, correctness, regression risk, missing tests, and scope control.
- CodeRabbit is external AI PR review only when already connected.
- CodeRabbit feedback is useful evidence, but it does not outrank repo policy, validators, human owner decisions, or security stop conditions.
- Call reviewer-agent for every PR-quality decision. Check CodeRabbit only when the PR has connected review output.

## reviewdog vs CodeRabbit

- reviewdog reports deterministic scanner output only.
- CodeRabbit provides contextual AI PR review when connected.
- Do not use reviewdog for AI review, general comments, or duplicate commentary.
- Do not let CodeRabbit or reviewdog become merge authority.
- Use reviewdog only when scanner output exists and the repo owner has approved the reporting path.

## release-manager-agent vs GitHub CLI

- release-manager-agent owns release reasoning, rollback posture, merge readiness, and post-merge verification planning.
- GitHub CLI is an external/local operator tool for observed branch, PR, check, and merge commands.
- GitHub CLI output is evidence, not release judgment by itself.
- Write/merge actions require explicit task scope and clean validation.

## qa-test-agent vs CI

- qa-test-agent plans verification, coverage, and evidence interpretation.
- CI executes configured checks if present.
- CI pass does not prove unconfigured manual/browser/security/mobile checks.
- qa-test-agent must label missing, skipped, unavailable, dry-run, and manual-only evidence honestly.

## security-agent vs security-review skill

- security-review skill is the canonical routing and review surface for security-sensitive work.
- security-agent provides deeper advisory analysis for auth, authorization, secrets, public/private payloads, source safety, and supply-chain risk.
- Use both when trust boundaries, secrets, tenant data, WebView boundaries, dependency risk, or public payloads are in scope.

## backend-contract-agent vs database-rls-agent vs security-agent

- backend-contract-agent owns API/RPC/server-client contracts, request/response shapes, compatibility, consumers, and error behavior.
- database-rls-agent owns database schema, RLS, tenant isolation, policies, migrations, and data integrity.
- security-agent owns security risk, auth, secrets, public/private payload boundaries, and supply-chain concerns.
- Escalate to security-agent when contract or database behavior can expose data, weaken auth, or cross trust boundaries.

## Evidence Needed

- reviewer-agent: changed files, intended behavior, tests/checks, regression risk.
- CodeRabbit: observed PR comments/status.
- reviewdog: deterministic scanner output and PR reporting target.
- release-manager-agent: branch, PR, checks, review state, validation output, rollback notes.
- qa-test-agent: test plan, actual command output, manual/browser evidence, skipped gaps.
- security-agent/security-review: auth/data/source boundaries, scanner output if run, approval status for deep scans.
- backend-contract-agent: consumers, request/response contracts, schemas, errors, compatibility.
- database-rls-agent: schema/policy/migration/RLS evidence.

## Duplicate PR Comment Avoidance

- Use CodeRabbit for contextual AI review if already connected.
- Use reviewdog only for deterministic scanner findings.
- Do not publish the same finding through both tools.
- Prefer one PR-comment path per finding class.
- Keep merge authority with repository policy, required checks, owner decisions, and release gate review.

## Deep Security Tool Approval Rules

Socket, TruffleHog, OWASP ZAP baseline, Harden-Runner, deep networked scans, production-impacting scans, MCP/global config changes, package-manager migrations, GitHub app permission changes, and React Doctor PR write automation require explicit owner approval with target, scope, risk, expected evidence, and rollback.

## Readiness Method Routing

Use `methods/governance/task-intake-routing-gate.md` before coding normal-language tasks. Security-sensitive changes route to `methods/security/application-security-readiness.md`; API/route changes route to `methods/api/api-contract-and-routing-readiness.md`; release and merge decisions route to `methods/release/release-rollback-readiness.md`. These methods are gates for review and evidence, not approval to run tools.
