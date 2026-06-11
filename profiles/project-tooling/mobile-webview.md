# Mobile WebView Project Tooling Profile

## Purpose

Provide a mobile and WebView tooling posture for native, hybrid, Expo, mobile web, and cross-surface app contracts.

## Project Type

`mobile-webview`

## Task-Intake Routing Gate

Classify normal-language requests before coding: affected surfaces, required agents/skills/methods/tools, validation gates, stop conditions, and out-of-scope items.

## Default Tools

- TypeScript / typecheck where applicable
- ESLint where applicable
- Vitest where applicable
- Testing Library where applicable
- Playwright for serious web/browser surfaces
- Gitleaks
- OSV Scanner

## Active-Install-If-Project-Type Tools

- React Doctor for React or React Native projects
- Oxlint for large JS/TS/React repos as acceleration/supplement
- Axe Playwright for UI/accessibility projects
- Lighthouse CI for public/mobile/performance-sensitive web apps
- Semgrep for security-sensitive projects
- dependency-cruiser for architecture hardening
- eslint-plugin-boundaries after architecture layers are stable and owner-approved
- Madge for circular dependency risk
- jscpd for duplication-hardening projects

## Use-If-Existing Tools

- CodeQL
- Dependabot or Renovate, choose one per repo
- reviewdog
- CodeRabbit
- GitHub CLI
- Biome
- Knip only as cleanup candidate if already present

## External-Only Tools

- GSD
- Superpowers
- CodeRabbit as service
- GitHub CLI as operator tool

## Approval-Required Tools

- Socket
- TruffleHog
- OWASP ZAP baseline
- Harden-Runner
- deep networked scans
- MCP/global config changes
- React Doctor GitHub Action / PR write permissions / agent skill install
- package-manager/workspace migrations
- Impeccable project-local install mode
- Repomix install/execution, package changes, CI wiring, MCP/global config, whole-repo packing, or product repo scanning

## Active-Reference Resources

- UI UX Pro Max
- Impeccable normalized design guidance
- shadcn/ui reference only
- native-mobile-app-quality method
- webview-boundary-review method
- cross-surface-client-contracts method
- open-design read-only design reference

## Active-Read-Only Resources

- Project Context Preflight and project-map staleness guidance with no external tool execution, context-pack, token-count, or validation claim without observed output

## Recommended Package Scripts

- `typecheck`: project-owned TypeScript/mobile typecheck.
- `lint`: project-owned lint.
- `test`: project-owned tests.
- `mobile:test`: simulator/device test if already present.
- `e2e`: Playwright or mobile E2E if already present.
- `security:secrets`: Gitleaks or existing secret scan.
- `security:deps`: OSV Scanner or existing dependency scan.
- `react:doctor`: React Doctor only after owner-approved project-local adoption.

## Evidence Requirements

Report simulator/device/build mode, release-like validation status, WebView allowed domains, bridge/auth/token behavior, cross-surface API contract checks, actual command output, and unverified mobile gaps.

## Stop Conditions

- Mobile readiness claimed without mobile validation.
- WebView trust boundary unclear.
- Native bridge, token, cookie, link, deep link, or private URL leakage risk exists.
- App identifier, signing, entitlement, permission, or store-critical config risk appears.

## Owner Approval Requirements

New mobile tooling, release-like build changes, package changes, CI/deployment changes, deep scans, React Doctor automation, and WebView/security-sensitive changes require approval.

## No-Fake-Validation Rules

Expo Go, simulator, dry-run, preview, and release-like evidence must be labeled exactly. Do not report mobile readiness if mobile validation was not performed.

## Rollback Notes

Templates are removable from `.ai-toolkit/tooling/`. App config, signing, package, CI, and WebView security changes require separate rollback.
