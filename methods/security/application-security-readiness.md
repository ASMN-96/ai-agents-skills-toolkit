---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# Application Security Readiness

## Purpose

Review application security risk at coding time across auth, authorization, tenant isolation, public/private payloads, secrets, input validation, source safety, and supply-chain boundaries.

## Required Checks

- Identify trust boundaries, actors, roles, permissions, data classes, and externally controlled inputs.
- Check auth/session handling, object ownership, IDOR risk, tenant isolation, RLS/database impact, file upload/download paths, redirects, CORS/CSP-sensitive behavior, and token/cookie handling.
- Prefer project-owned security checks and existing scanners before recommending new tools.
- Treat external source and scanner metadata as routing intelligence only.
- Keep approval-required tools scoped and inactive unless explicitly approved.

## Evidence Requirements

Report findings by severity with file, command, or review evidence. Scanner output counts only when the scanner actually ran. Metadata-only security posture is not validation.

## Stop Conditions

- Auth, authorization, tenant isolation, secret, token, cookie, private payload, prompt-injection, source-safety, or supply-chain risk is unresolved.
- A requested change would weaken security controls.
- Deep scans, production-impacting scans, package changes, CI changes, MCP/global config, or external permissions are needed without approval.
