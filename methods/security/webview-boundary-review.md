---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
status: approved
---

# WebView Boundary Review

## Purpose

Treat WebView content as a trust boundary. WebView work can blend web, native, auth, tokens, storage, links, downloads, uploads, analytics, and crash reporting in ways that create security and privacy risk.

## When To Use

Use for native apps, hybrid apps, embedded browser surfaces, Expo DOM/WebView usage, OAuth or payment WebViews, deep links, external content, and native bridge behavior.

Run `methods/governance/task-intake-routing-gate.md` first for normal-language WebView requests so native, API, auth, token, link, package/config, and release surfaces are separated before implementation.

## When Not To Use

Do not use for ordinary browser-only pages with no native shell, bridge, or embedded context.

## Required Checks

- Allowed domains and allowlist policy.
- URL validation, normalization, redirects, and blocked schemes.
- External link handling, browser handoff, universal links, app links, and custom schemes.
- Deep links and return URLs, including tenant/account/user scoping where applicable.
- Token, session, cookie, local storage, and credential exposure across WebView/native boundaries.
- Local file access, file URL handling, cache, clipboard, camera, microphone, location, and downloads/uploads.
- JavaScript bridge and native bridge exposure, method allowlists, origin checks, message validation, and replay risk.
- Mixed content, insecure transport, certificate handling, and downgrade risk.
- Navigation interception, blocked navigation, back stack behavior, loading/error/fallback/retry states.
- Private URL, token, account, tenant, user, and payload leakage in logs, analytics, screenshots, crash reports, and support exports.
- Upload/download behavior, file type limits, size limits, storage location, and user confirmation.
- Auth boundary: server remains final authority; client filtering or WebView hiding is not security.

## Evidence Requirements

Document allowed origins, blocked origins, link/deep-link handling, bridge methods, storage/cookie/token behavior, and observed validation. Include browser/device logs only when actually collected. State unverified WebView paths plainly.

No fake validation: do not claim bridge, token, origin, device, browser, or security readiness without observed evidence or an explicitly documented review limit.

## Stop Conditions

- Native bridge accepts unvalidated messages.
- Auth/session/token behavior is unclear.
- Any untrusted domain can load privileged WebView content.
- Sensitive values may leak through logs, analytics, screenshots, crash reports, or external links.
- Mixed content, insecure transport, local file access, or broad navigation is enabled without a documented security reason.

## Escalation

Escalate to security-review for auth boundary, token/session, bridge, insecure transport, public/private payload, or privacy leakage risk. Escalate to backend-contract-agent for server contract drift and to database-rls-agent for tenant/data isolation risk.
