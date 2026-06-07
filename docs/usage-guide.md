# Usage Guide

## Repository Purpose

Use this repository to standardize AI coding-agent behavior, source review, validation honesty, and release evidence before changes are synced into product projects.

The toolkit is a governance and workflow layer. It is not a product runtime, package installer, CI manager, MCP configurator, or global/user agent configuration surface.

## Scope Rules

- Do not edit product repositories unless a separate project-specific PR explicitly authorizes that work.
- Do not change package files, lockfiles, CI, MCP, deployment config, global/user agent config, secrets, or credentials unless a separate owner-approved task authorizes the exact change.
- Do not claim scanner, browser, runtime, validation, GitHub, CodeRabbit, reviewdog, tag, release, package publication, marketplace submission, or external submission execution unless current output was actually observed.
- Do not describe `.ai-toolkit` package metadata, registries, source records, dry-runs, or compiled fallbacks as runtime activation.
- Keep selected or recommended agents separate from agents that actually spawned.

## AI Coding-Agent Use Modes

### Planning-Only Mode

Use for product scope, architecture, security, source-safety, release planning, or high-risk ambiguity. The expected output is findings, risks, assumptions, and a decision-complete plan. No files should change.

### Review Mode

Use for PRs, diffs, release gates, source reviews, and readiness audits. Findings come first, ordered by severity, with file/line or command evidence. Style-only comments should be omitted unless they hide correctness, security, accessibility, or maintainability risk.

### Controlled Implementation Mode

Use only after scope is explicit. State the exact files or directories in scope, keep the diff small, preserve existing project patterns, run the narrowest relevant checks first, and report WARN/skipped/unavailable checks.

## Skills And Agents

Canonical active skills:

- `governance`
- `uiux`
- `code-quality`
- `security-review`
- `pr-release-gate`

Canonical repo-local project agent files:

- `product-agent`
- `architect-agent`
- `reviewer-agent`
- `uiux-agent`
- `frontend-agent`
- `backend-contract-agent`
- `database-rls-agent`
- `security-agent`
- `qa-test-agent`
- `release-manager-agent`
- `skill-scout-agent`
- `sre-performance-agent`

Agent availability means an agent can be selected or recommended when `.codex/agents/<agent>.toml` is present. It does not mean automatic spawning. Runtime behavior is constrained by the TOML sandbox and instructions.

Compiled fallbacks live under `compiled-agents/<agent>.compiled.md`. A project or reviewer may use a compiled fallback inline when native spawning is unavailable, but the completion report must say that the compiled fallback was used inline and must not claim a spawned agent ran.

In this guide, a lens is an inline perspective or review frame selected from an agent or method without proving separate runtime execution. Spawn proof means current-task evidence that a native agent actually executed, not file presence, registry metadata, or compiled fallback availability.

Example consumer note:

```text
Selected lens: reviewer-agent.
TOML file present: .codex/agents/reviewer-agent.toml.
Compiled fallback present: compiled-agents/reviewer-agent.compiled.md.
Spawn proof: not observed.
Execution claim: inline reviewer-agent lens only; no spawned agent ran.
```

## Real-Project Flow

1. Start from a clean feature branch in the product repository.
2. Use planning-only or review mode first unless the project owner has approved implementation.
3. Build a compact context pack for large tasks: objective, non-goals, selected files, omitted context, selected skills/agents, source references, validation commands, and stop conditions.
4. Prefer project-owned checks and scripts before adding or proposing tools.
5. Use toolkit project sync in dry-run mode first where applicable.
6. Apply writes only after the target project owner approves the exact write scope.
7. Open a project PR with validation output, WARN output, residual risk, and rollback path.

## v0.2 Project Tooling Flow

Before coding, classify normal-language tasks through `methods/governance/task-intake-routing-gate.md`: affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items.

Use `node install/tooling-plan.mjs --project-type <type>` to print a read-only project tooling plan for one of the supported project types. Use `node install/tooling-apply.mjs --target <path> --project-type <type>` for a dry-run template copy plan. Writes require `--confirm-write` and copy only toolkit-owned templates into `<target>/.ai-toolkit/tooling/`.

Project tooling profiles and templates do not edit `package.json`, install dependencies, wire CI, configure MCP, change global config, or touch product repositories. Owner approval is required before applying any template to project package files, scripts, CI, scanner config, React Doctor automation, external service permissions, or package-manager/workspace migrations.

## Completion Report

Every completion report should include:

- summary of what changed,
- files changed,
- selected skills/agents and agents actually spawned,
- commands run with PASS/FAIL/WARN/skipped status,
- leak/source-safety/security implications when relevant,
- remaining owner-only decisions,
- risks and mitigations,
- exact next action.

## Stop And Escalate

Stop and escalate to the owner or GPT-5.5 review when:

- branch, working tree, upstream, or PR state is unclear,
- required checks fail or cannot run,
- source freshness reports actionable changes,
- leak scan reports current-tree blockers,
- auth, authorization, tenant isolation, secrets, public payloads, prompt-injection, source-safety, or supply-chain risk is ambiguous,
- backend/auth/data/security-impact work is required outside the approved scope,
- release, tag, public visibility, OSS submission, package, CI, MCP, global config, or external-service changes are needed.

## Prompt Examples

### Real-Project Planning Or Audit

```text
Mode: planning-only.
Use this toolkit as AI coding-agent governance for a real project audit. Codex, Claude Code, or a similar project-owned agent may be in use, but do not assume one runtime unless the repository proves it.
Scope: inspect the current feature request, architecture risk, security risk, validation plan, and PR sequence.
Do not edit files. Do not change package files, CI, MCP, global config, or product repositories.
Report selected skills/agents separately from agents actually spawned, and include stop conditions.
```

### Bounded Frontend Implementation

```text
Mode: controlled implementation.
Scope is limited to the named frontend route and its local components.
Use existing design-system conventions, preserve accessibility and responsive behavior, and do not change backend, auth, data models, package files, CI, MCP, deployment config, or global config.
Run the narrowest project-owned checks first and report browser/screenshot evidence only if actually observed.
```

### PR And Release Readiness Review

```text
Mode: review.
Review this branch for PR and release readiness.
Lead with blocking findings, then required checks, review status, WARN output, skipped checks, residual risk, and exact next action.
Do not claim CI, CodeRabbit, GitHub checks, tag, or release status unless current output is available.
```

### External Source And Source-Safety Review

```text
Mode: planning-only source-safety review.
Assess the proposed external source for license, trust, maintenance, dangerous commands, secret access, network behavior, prompt-injection risk, and raw-copy risk.
Do not import, install, activate, clone, run scripts, configure MCP, change CI, or copy upstream content into active runtime paths.
Return an allow/defer/reject recommendation with evidence.
```

## Public Release Positioning

`v0.2.3` is the controlled AI Vibe Coding Toolkit release after v0.2 hardening, no-write leak-scan validation mode, activation posture hardening, full resource refresh with zero passive source holds, runtime validation, public positioning cleanup, and release validation gates. It does not claim higher maturity, enterprise or production certification, automatic installs, package publication, marketplace submission, broad cross-runtime active support, or external submission.
