# Examples Index

This folder contains lightweight, generic examples for using the toolkit in Codex-governed work. Keep examples free of private product names, client names, local paths, secrets, and real product data.

## Example 1: Real-Project Planning Or Audit

```text
Mode: planning-only.
Act as a Codex governance, architecture, security, and release-readiness reviewer for this project task.
Inspect the relevant repository files first, then return findings, assumptions, scope, risks, validation plan, and stop conditions.
Do not edit files. Do not change product repositories, package files, CI, MCP, deployment config, global Codex config, secrets, release tags, or external services.
Report selected skills/agents separately from agents actually spawned.
```

## Example 2: Bounded Frontend Implementation

```text
Mode: controlled implementation.
Scope is limited to the named frontend view and directly owned components.
Preserve design-system conventions, accessibility, responsive behavior, loading/error/empty states, and public route contracts.
Do not change backend, auth, database, package files, lockfiles, CI, MCP, deployment config, global config, or product repositories outside this approved scope.
Run project-owned checks first and report browser/screenshot/accessibility evidence only if actually observed.
```

## Example 3: PR And Release Readiness Review

```text
Mode: review.
Review this branch for PR and release readiness.
Lead with blockers and high-risk findings. Include branch state, changed-file scope, validation output, WARN output, skipped checks, review status, leak/source-freshness status when relevant, and exact next action.
Do not claim GitHub checks, CodeRabbit, reviewdog, CI, merge, tag, or release status unless current output was observed.
```

## Example 4: External Source And Source-Safety Review

```text
Mode: planning-only source-safety review.
Evaluate this external source for license, trust, maintenance, dangerous commands, secret access, network behavior, prompt-injection risk, and raw-copy risk.
Do not install, activate, clone, run scripts, configure MCP, edit CI, change global config, or copy upstream source into active runtime paths.
Return allow, defer, or reject with evidence and required owner decisions.
```

## Example 5: Compact Context Pack For A Large Task

```text
Mode: planning-only.
Create a compact context pack for this large implementation task.
Include objective, non-goals, selected files and why, omitted context and why, selected skills/agents, source/method references, validation commands, private/secret exclusions, and stop conditions.
Do not edit files until the implementation scope is approved.
```

## Boundaries

- Examples are generic prompt templates, not runtime activation.
- Keep production examples in their owning product repositories.
- Do not include private paths, product names, real customer data, secrets, or hidden deployment details.
