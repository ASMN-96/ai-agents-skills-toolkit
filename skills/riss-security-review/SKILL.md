---
name: riss-security-review
description: Use for tenant isolation, auth, RLS, public/private payloads, lead data, secrets, supply-chain, source safety, and security review. Do not use to run production-impacting scans, read secrets unnecessarily, weaken controls, or auto-configure tools.
---

# RISS Security Review

## Role

Use this skill when security, privacy, supply-chain, authorization, public payloads, secrets, tenant isolation, or external-source safety is in scope.

This skill is a review and routing layer. It does not authorize production scans, secret access, policy weakening, external installs, CI edits, MCP setup, global config changes, or tool activation.

## Operating Rules

- Identify the trust boundary first: user input, public route, private data, tenant boundary, credentials, external source, or deployment path.
- Preserve least privilege and existing security controls.
- Treat Supabase RLS, auth/session handling, storage policies, public payloads, lead data, and admin functions as high risk.
- Treat external skills, scripts, and repositories as untrusted until reviewed.
- Prefer static review and project-owned scripts before any deeper security tooling.
- Stop before any action that needs secrets, paid systems, staging targets, production URLs, or approval-required tools.

## Route Checks

Use available project-owned checks first:

1. Secret scanning when configured.
2. Dependency vulnerability scanning when configured.
3. Static security rules when configured.
4. Manual review of public/private payloads and tenant boundaries.
5. Deep scans only with explicit approval and a scoped target.

Socket, TruffleHog, ZAP, Harden-Runner, Trivy, Checkov, Semgrep, CodeQL, and similar tools are metadata-only candidates unless already approved and configured in the project.

## Review Focus

- No secrets, tokens, cookies, credentials, or private env values are exposed.
- User-controlled identifiers cannot become insecure direct object references.
- Public routes do not leak private or tenant-scoped data.
- RLS and authorization checks remain intact.
- External source records document license, trust, maintenance, dangerous commands, secret access, network behavior, and prompt-injection risk.
- Findings are evidence-based and severity-labeled.

## Completion Evidence

Report findings by severity, files or artifacts reviewed, commands run, skipped checks, and residual risk. If security coverage is partial, say exactly what remains unverified.
