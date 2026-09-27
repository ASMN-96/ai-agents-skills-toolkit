---
name: secure
description: Security audit of code or a feature - threat model, authN/authZ (BOLA/IDOR, tenant isolation, Supabase RLS), input handling, secrets, deps, supply chain, CI/CD, mobile/WebView, LLM/agent surfaces. Read-only; reports findings, never edits code.
license: MIT
---

# Secure route

Independent, read-only security audit. Report findings; never edit files in this route.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## 1. Delegate when you can
- Claude Code: hand the audit to the `secure` agent from this plugin (independent auditor with its own model and effort). Pass the diff, changed paths, or the feature to audit, plus what it's meant to do. Skip this step if you are that agent.
- Other tools: do the audit inline with the steps below.

## 2. Get the target
- A diff in the conversation, or changed files named by the user: audit those.
- A whole feature or codebase named by the user: audit the surfaces in step 3, scoped to what they named.
- Otherwise: `git diff main...HEAD` (or the base branch the user names) plus relevant untracked files.

## 3. Audit
1. Triage first: rank files by blast radius using `references/risk-triage.md` before reading deeply — auth, authorization/tenant isolation, payments, crypto, input parsing, public APIs and CI/CD first.
2. Threat-model the target: read `upstream/security-and-hardening/UPSTREAM.md` and run its trust-boundary mapping, asset naming, and STRIDE pass before checking individual controls.
3. Walk `references/security-checklist.md` for the surfaces present: auth, authorization, input validation, headers/CORS, data protection, dependencies, AI/LLM, error handling.
4. Database/backend surface (Supabase, Postgres, RLS): also check `references/supabase-rls.md`.
5. Dependencies and supply chain: follow the checklist's install-script gate and audit-triage guidance; check `references/tools.md` for which scanners to use if already configured — never install or run one without asking.
6. CI/CD (GitHub Actions): check workflow permissions, `pull_request_target` combined with PR-head checkout, secret exposure to untrusted triggers, and third-party action pinning.
7. Mobile/WebView or Electron/Tauri surfaces, or an LLM/agent feature: open the matching entry in `references/standards.md` for the deeper standard, and apply the checklist's AI/LLM section for prompt injection, tool-permission scoping, and output handling.

## Precedence (overrides upstream text)
- Upstream links to a hardening-patterns file (a base-skill sibling, not vendored here). Use `references/security-checklist.md` and the URLs in `references/standards.md` for equivalent depth on any pattern it names.
- Upstream names sibling skills (`observability-and-instrumentation`, `debugging-and-error-recovery`, `performance-optimization`) that are not part of this route. Note the gap in the report instead of following the reference; performance goes to the `review` route, deep debugging to `debug`.
- `references/security-checklist.md` is duplicated from the `review` route's copy (same source, same commit) — that duplication is intentional, not a conflict.
- `references/risk-triage.md` governs read order only. The security-and-hardening checklist and `security-checklist.md` remain the only finding taxonomy.
- Never say a test, build, scan, or audit tool passed unless its output is in this session.

## Output
- Findings grouped by severity (Critical / Required / Nit / FYI, per the checklist's categories), each with `file:line`, the trust boundary crossed, the concrete impact, and a fix.
- A short threat-model summary: trust boundaries identified, assets named, and any STRIDE category with no mitigation.
- Dependency/supply-chain and CI/CD findings called out even when the diff looks UI-only, if a workflow or lockfile changed.
- What you did not check (for example: scanners not run, live RLS not queried, out-of-scope files) — state this plainly, not as a footnote.
- Never issue a bare "secure" verdict under time pressure; a rushed audit says what it covered and what it didn't, not "all good."
