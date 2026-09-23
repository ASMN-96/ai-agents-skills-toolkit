---
name: security-review
description: Use for security review of auth, authorization, tenant isolation, payload exposure, secrets, supply chain, and untrusted sources.
---

# Security Review

Use this as the canonical final security review skill for application and toolkit work.

This skill is a review and routing layer. It does not authorize production scans, secret access, policy weakening, external installs, CI edits, MCP setup, global config changes, or tool activation.

## Review Focus

- Trust boundaries, auth, authorization, public/private payloads, and tenant data are explicit.
- Secrets, tokens, credentials, cookies, and private environment values are not exposed.
- External sources and tools remain untrusted until reviewed.
- Tenant isolation, RLS, API payloads, source safety, and supply-chain metadata are checked when in scope.
- Metadata-only tool records, skipped scans, dry-runs, unavailable scanners, and partial reviews are labeled honestly.
- Route application security readiness through `.ai-toolkit/methods/security/application-security-readiness.md`. Canonical toolkit source: `methods/security/application-security-readiness.md`.

## Tool Boundaries

Use scanner metadata only as routing intelligence unless the target project already owns the scanner command or the owner separately approves a scoped scan. Do not use Socket, ZAP, Harden-Runner, deep secret scanners, CI permission changes, or production-impacting scans without explicit approval.

Route WebView, native bridge, token/cookie, deep-link, local-file, and embedded-content risks through `.ai-toolkit/methods/security/webview-boundary-review.md`. Canonical toolkit source: `methods/security/webview-boundary-review.md`.

## Completion Evidence

Report findings by severity, coverage, commands run, skipped checks, WARN output, and residual security risk.
