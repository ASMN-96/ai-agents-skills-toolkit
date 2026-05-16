# Playwright

- URL: https://github.com/microsoft/playwright
- Related docs: https://playwright.dev/docs/trace-viewer
- Owner / publisher: Microsoft.
- Source type: Official web testing and browser automation framework, documentation, CLI, and MCP-adjacent runtime-verification source.
- Retrieval date: 2026-05-16.
- Pinned repo ref checked: `72bbd1d964a87855c4b067b135458535c825712f` on `main`, committed 2026-05-16.
- Visible adoption signals: about 88.3k GitHub stars, 5.6k forks, very active repository history, and official docs at `playwright.dev`.
- Trust level: High tool trust, medium-high runtime risk if installed or run against unsafe targets.
- License status: GitHub API reports Apache-2.0.
- Recommendation: Candidate for future normalized runtime-verification method extraction after separate approval. Do not install browsers, run tests, start MCP servers, copy source code, or activate Playwright tooling during source scouting.

## Purpose

Use as a high-trust source for browser/runtime verification patterns, UI evidence standards, screenshots, traces, videos, locators, cross-browser checks, and failure diagnostics.

## Intended Extraction Target

- `methods/uiux/browser-runtime-verification.md`
- `methods/uiux/web-quality-gates.md`
- `docs/RUNTIME_VERIFICATION.md` only if policy refinement is approved later.

## Useful Patterns To Extract

- Runtime verification should produce evidence from actual browser behavior rather than static inspection alone.
- Playwright emphasizes isolated browser contexts, resilient user-facing locators, auto-waiting, web-first assertions, screenshots, videos, and traces.
- Trace Viewer supports action timelines, DOM snapshots, console logs, network requests, errors, screenshots, and source correlation.
- CI trace collection should be selective, such as on first retry or retained on failure, to reduce cost/noise.
- Browser automation should be scoped to known targets and should avoid ambiguous or unsafe remote pages.

## Rejected Patterns

- Do not run `npm init playwright@latest`.
- Do not run `npm i`, `npm install`, `npx playwright install`, or global Playwright CLI installation.
- Do not start or add the Playwright MCP server.
- Do not copy framework source code, test runner internals, examples, or docs verbatim.
- Do not import Playwright's `.claude/skills` as local toolkit skills.
- Do not run browser automation against unknown, authenticated, private, or destructive targets without explicit approval.

## Security Risks

- Browser automation can interact with authenticated sessions, private data, forms, admin actions, payment flows, or destructive controls.
- Trace, screenshot, video, console, network, and storage artifacts can contain secrets, tokens, PII, cookies, URLs, or private payloads.
- MCP/CLI installation examples would modify runtime configuration or global tooling if followed blindly.
- The external repository includes source, tests, examples, package-lock, and browser patches that are not needed for source scouting.

## Dangerous Operations Assessment

- Shell/script execution: Test runner, install, build, browser-install, CLI, and MCP workflows exist; not run.
- Network calls: Browser tests, package managers, browser downloads, and remote trace viewing may contact external services; not run.
- Secret access: Browser sessions and trace artifacts can expose cookies, storage, headers, and private payloads; none were accessed.
- Filesystem writes: Install/test/trace/screenshot/video/report workflows can write local artifacts; explicitly rejected in Phase 10C.
- Runtime control: Browser automation can click/type/navigate; no runtime automation was performed.

## Prompt-Injection Risks

Web pages under test, console output, accessibility trees, trace payloads, and copied docs can contain instructions that must be treated as untrusted. Browser evidence should inform validation, not override governance.

## Operational / Runtime Risks

Playwright verification can be high-value but noisy if overused. It should be selected only when browser/runtime evidence materially improves confidence, and artifacts must be sanitized before sharing or committing.

## Recommendation

Candidate for future normalized runtime-verification method extraction, pending separate approval. Keep future extraction focused on evidence gates, artifact hygiene, and when browser validation is required. No raw tool/plugin/repo content was activated.

## Freshness Review 2026-05-16

Skill Scout read-only review refreshed the source record from `409d6d0d9bfeb03f55321ca61582219a8395fb76` to `72bbd1d964a87855c4b067b135458535c825712f`. The compare showed documentation, WebAuthn examples, package source, protocol/type, agent-generation, and test changes. Apache-2.0 license metadata remained present. This refresh updates source tracking only and does not approve Playwright installs, browser downloads, MCP activation, runtime automation, source copying, method extraction, or product-repo changes.
