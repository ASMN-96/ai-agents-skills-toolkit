# Playwright

- URL: https://github.com/microsoft/playwright
- Related docs: https://playwright.dev/docs/trace-viewer
- Owner / publisher: Microsoft.
- Source type: Official web testing and browser automation framework, documentation, CLI, and MCP-adjacent runtime-verification source.
- Retrieval date: 2026-05-30.
- Pinned repo ref checked: `5dd0a9bd614cbebe1911debd863bbf6493d5d7e2` on `main`, checked by read-only remote HEAD and compare metadata on 2026-06-02.
- Visible adoption signals: about 89.8k GitHub stars, 5.8k forks, very active repository history, and official docs at `playwright.dev`.
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

## Freshness Review 2026-05-30

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `c27ccc4362ddadf9a03e6961069f8300f78d90ff` to `bc2960793c05285244cdcc65d46f2b2b409a1373` using read-only GitHub compare, repository, license metadata, and added-line risk keyword review only. The compare was 2 commits ahead and touched Playwright core bootstrap/index loading, extension and trace-viewer Vite build configuration, removed separate service-worker Vite config files, and updated build utility invocation. Apache-2.0 license metadata remained present. Added-line risk review found Node-version/runtime bootstrap checks and Vite build references, but no new network-fetch, credential, MCP, browser automation, or destructive shell signal in the added lines. The install, browser-download, trace artifact, runtime automation, and build-script risks remain; the recommendation is unchanged. This refresh updates source tracking only and does not approve package install, browser download, MCP activation, runtime automation, build-script execution, source-copying, method-extraction, or product-repo changes.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `bc2960793c05285244cdcc65d46f2b2b409a1373` to `9fe284a594096072d0de3adc419db3933b8ced14` using read-only `git ls-remote`, GitHub compare, repository, license metadata, and added-line risk keyword review only. The compare was 1 commit ahead and added WebKit webview input synthesis across injected webview input code, WebKit webview input/page handling, generated injected-source wiring, and page/webview keyboard expectations. Apache-2.0 license metadata remained present. Added-line risk review found keyboard, mouse, input dispatch, runtime evaluation, and webview control signals, but no new credential, package install, MCP, destructive shell, or network-fetch signal in the added lines. The browser-control, trace artifact, runtime automation, injected-script, install, and build-script risks remain; the recommendation is unchanged. This refresh updates source tracking only and does not approve package install, browser download, MCP activation, runtime automation, injected script use, source-copying, method-extraction, or product-repo changes.

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `9fe284a594096072d0de3adc419db3933b8ced14` to `3edc77fc943ae9398161fbde2de0b29cb8e56725` using read-only `git ls-remote` and GitHub compare metadata only. The compare was 1 commit ahead and touched `packages/html-reporter/src/tabbedPane.tsx` and `packages/web/src/components/tabbedPane.tsx`. Apache-2.0 license metadata remained present from the reviewed source record. The change is UI/component implementation movement inside Playwright's own reporter/web package surface, not a toolkit approval signal. The browser-control, trace artifact, runtime automation, install, and build-script risks remain; the recommendation is unchanged. This refresh updates source tracking only and does not approve package install, browser download, MCP activation, runtime automation, source-copying, method-extraction, or product-repo changes.

## Freshness Review 2026-06-01

Skill Scout read-only follow-up reviewed upstream default-branch movement from `3edc77fc943ae9398161fbde2de0b29cb8e56725` to `c3c74e4b10c6232fec28b8f8bee4b664ddaf36d3` using GitHub compare metadata, current commit metadata, license metadata, and patch keyword review only. The compare was 1 commit ahead and touched only `tests/library/browsercontext-locale.spec.ts`. Apache-2.0 license metadata remained present. Patch keyword review matched browser-test terminology in the test file, but found no package install, MCP, credential, network-fetch, destructive shell, or product-write signal in the changed source-freshness scope. The browser-control, trace artifact, runtime automation, install, and build-script risks remain; the recommendation is unchanged. This refresh updates source tracking only and does not approve package install, browser download, MCP activation, runtime automation, source-copying, method-extraction, or product-repo changes.

Skill Scout read-only follow-up reviewed upstream default-branch movement from `c3c74e4b10c6232fec28b8f8bee4b664ddaf36d3` to `dc51ddbeb834f271ad0a8319a946fcd98cad523a` using GitHub compare metadata, current commit metadata, repository metadata, license metadata, and patch keyword review only. The compare was 8 commits ahead and touched Playwright runtime, HAR/websocket, trace-viewer, screenshot, test-runner, and MCP-adjacent files, plus related tests. Apache-2.0 license metadata remained present. Patch review found browser runtime, network, websocket, trace, and MCP-adjacent source signals, so the existing runtime-control, browser-artifact, MCP, install, and build-script cautions remain. This refresh updates source tracking only and does not approve package install, browser download, MCP activation, runtime automation, source-copying, method-extraction, package changes, CI changes, or product-repo changes.

## Freshness Review 2026-06-02

Skill Scout read-only follow-up reviewed upstream default-branch movement from `dc51ddbeb834f271ad0a8319a946fcd98cad523a` to `794a382f7c54872015a40972bc659c61b0a4dcfa` using GitHub compare metadata, commit metadata, and `git ls-remote` only. The compare was 10 commits ahead and touched Playwright CI workflow files, test-option docs, injected webview input/dialog code, server artifact/download/upload/runtime files, HAR tracing, test runner/web-server code, Dockerfiles, type generation, and tests. Apache-2.0 license metadata remained present from the source record. The existing browser-control, trace artifact, runtime automation, install, MCP, CI, Docker, and build-script cautions remain; the recommendation is unchanged. This refresh updates source tracking only and does not approve package install, browser download, MCP activation, runtime automation, source-copying, method extraction, CI changes, package changes, Docker use, or product-repo changes.

## Freshness Review 2026-06-02 Follow-up

Skill Scout read-only follow-up reviewed upstream default-branch movement from `794a382f7c54872015a40972bc659c61b0a4dcfa` to `5dd0a9bd614cbebe1911debd863bbf6493d5d7e2` using GitHub compare metadata and `git ls-remote` only. The compare was 2 commits ahead and changed Playwright Docker CI workflow files: added `tests_docker`, `tests_docker_changes`, and `tests_docker_release` workflows and removed `trigger_tests`. Apache-2.0 license metadata remained present from the source record. Existing CI, build, browser automation, and runtime cautions remain; the recommendation is unchanged. This refresh updates source tracking only and does not approve CI changes, workflow copying, package install, browser download, MCP activation, runtime automation, source-copying, method extraction, Docker use, or product-repo changes.
