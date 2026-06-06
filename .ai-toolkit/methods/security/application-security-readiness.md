---
sourceRef: ["toolkit-authored","supabase-agent-skills"]
lastExtracted: 2026-06-06
status: approved
---

# Application Security Readiness

## Purpose

Review application security risk at coding time across auth, authorization, tenant isolation, public/private payloads, secrets, input validation, source safety, and supply-chain boundaries.

## Required Checks

- Identify trust boundaries, actors, roles, permissions, data classes, and externally controlled inputs.
- Check auth/session handling, object ownership, IDOR risk, tenant isolation, RLS/database impact, file upload/download paths, redirects, CORS/CSP-sensitive behavior, and token/cookie handling.
- For Supabase-backed features, treat Data API exposure, SECURITY DEFINER functions, auth-helper assumptions, RLS policy behavior, and generated client/schema drift as first-class security surfaces.
- Escalate BOLA/object-ownership risk whenever a route, RPC, table, storage object, or API payload can be addressed by user-controlled identifiers.
- Treat dependency/package movement in auth, database, API, or deployment paths as supply-chain review scope even when the application code diff looks small.
- Prefer project-owned security checks and existing scanners before recommending new tools.
- Treat external source and scanner metadata as routing intelligence only.
- Keep approval-required tools scoped and inactive unless explicitly approved.

## Evidence Requirements

Report findings by severity with file, command, or review evidence. Scanner output counts only when the scanner actually ran. Metadata-only security posture is not validation.

## Compact Example

Good pattern:

- Map actors, inputs, auth, object ownership, tenant/data boundaries, and source/package risk before changing security-sensitive code.

Bad pattern:

- Treating UI hiding, client filtering, metadata, or a skipped scanner as proof that auth, RLS, or tenant isolation is safe.

Evidence required:

- File/review evidence, command output when run, scanner output only if observed, and explicit coverage limits.

Stop condition:

- Pause when auth, tenant isolation, secrets, private payloads, RLS, prompt injection, supply chain, or external permissions remain unresolved.

## Stop Conditions

- Auth, authorization, tenant isolation, secret, token, cookie, private payload, prompt-injection, source-safety, or supply-chain risk is unresolved.
- A requested change would weaken security controls.
- Deep scans, production-impacting scans, package changes, CI changes, MCP/global config, or external permissions are needed without approval.

## Source Inspiration / License Status

Supabase Agent Skills v0.2.3 guidance was adopted as cleanroom security gates only. Live Supabase operations remain delegated to the Supabase plugin or project-owned tooling when explicitly approved.
