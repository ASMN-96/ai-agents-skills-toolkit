---
name: app-security-review
description: Use for auth, authorization, tenant isolation, public/private payloads, secrets, supply-chain, source safety, and security review. Do not run production-impacting scans, read secrets unnecessarily, weaken controls, or auto-configure tools.
---

# App Security Review

Use this as the public-safe security review skill for application and toolkit work.

This skill is a review and routing layer. It does not authorize production scans, secret access, policy weakening, external installs, CI edits, MCP setup, global config changes, or tool activation.

## Review Focus

- Trust boundaries, auth, authorization, public/private payloads, and tenant data are explicit.
- Secrets, tokens, credentials, cookies, and private environment values are not exposed.
- External sources and tools remain untrusted until reviewed.
- Metadata-only tool records, skipped scans, dry-runs, unavailable scanners, and partial reviews are labeled honestly.

## Completion Evidence

Report findings by severity, coverage, commands run, skipped checks, WARN output, and residual security risk.
