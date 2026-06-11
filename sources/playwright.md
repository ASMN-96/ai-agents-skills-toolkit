# Playwright

- URL: https://github.com/microsoft/playwright
- Related docs: https://playwright.dev/docs/trace-viewer
- Owner / publisher: Microsoft.
- Source type: Official web testing and browser automation framework, documentation, CLI, and MCP-adjacent runtime-verification source.
- Retrieval date: 2026-05-30.
- Pinned repo ref checked: `954a7680c9bebd96323e299bf01a9ee079b080e9` on `main`, checked by read-only GitHub compare metadata on 2026-06-11.
- Visible adoption signals: about 89.8k GitHub stars, 5.8k forks, very active repository history, and official docs at `playwright.dev`.
- Trust level: High tool trust, medium-high runtime risk if installed or run against unsafe targets.
- License status: GitHub API reports Apache-2.0.
- Recommendation: `SYNCED_PLUGIN_DELEGATED` for v0.2.3. Keep Playwright active as browser-evidence and UI-validation guidance, delegate execution to project-owned Playwright/browser tooling when available, and do not install browsers, run upstream tests, start MCP servers, copy source code, or activate upstream tooling during source scouting.

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

## Freshness Review 2026-06-03

Skill Scout read-only follow-up reviewed upstream default-branch movement from `5dd0a9bd614cbebe1911debd863bbf6493d5d7e2` to `dd151191ee02f2107bc702c70c487c9aec573e09` using GitHub compare metadata and `git ls-remote` only. The compare was 14 commits ahead and touched CI workflow files, package/package-lock metadata, browser install CLI code, browser registry metadata, server network/HAR/websocket/client-certificate handling, zip utility code, webview request/page handling, and related tests. Apache-2.0 license metadata remained present. Existing browser-control, trace artifact, runtime automation, package-install, browser-download, MCP, CI, network, and build-script cautions remain. This refresh updates source tracking only and does not approve CI changes, workflow copying, package install, browser download, MCP activation, runtime automation, source-copying, method extraction, package changes, Docker use, or product-repo changes.

Skill Scout read-only publication-gate follow-up reviewed upstream default-branch movement from `dd151191ee02f2107bc702c70c487c9aec573e09` to `f1c29818474bb109493660edbe171b94de7ac71c` using GitHub compare metadata only. The compare was 5 commits ahead and touched Playwright docs, CLI driver, Chromium page handling, trace snapshot injection, MCP config parsing, and related tests. Existing browser-control, trace artifact, runtime automation, package-install, browser-download, MCP, CI, network, and build-script cautions remain. This refresh updates source tracking only and does not approve CI changes, workflow copying, package install, browser download, MCP activation, runtime automation, source-copying, method extraction, package changes, Docker use, or product-repo changes.

Skill Scout read-only public-clone follow-up reviewed upstream default-branch movement from `f1c29818474bb109493660edbe171b94de7ac71c` to `16601141918a7163b87a7ec84060451f6c1bbbfd` using GitHub compare metadata only. The compare was 1 commit ahead and touched Playwright test API/CLI docs, test runner entrypoints, tracing code, type overrides, and related tests. Existing browser-control, trace artifact, runtime automation, package-install, browser-download, MCP, CI, network, and build-script cautions remain. This refresh updates source tracking only and does not approve CI changes, workflow copying, package install, browser download, MCP activation, runtime automation, source-copying, method extraction, package changes, Docker use, or product-repo changes.

## Reviewed-Held Source Safety Review 2026-06-04

Skill Scout read-only source-safety review evaluated upstream default-branch movement from `16601141918a7163b87a7ec84060451f6c1bbbfd` to `08e2d03b41d10ca44b078da6275a79dc0290f24f` using GitHub compare metadata, license metadata, and patch-signal review only. The initial compare from `16601141918a7163b87a7ec84060451f6c1bbbfd` to `fd47b67492615d83f8fd3aa73b65f20947f4078f` was 2 commits ahead and touched `.github/actions/upload-blob-report/action.yml`, `package.json`, `package-lock.json`, Playwright client/server runtime code, type definitions, HAR/trace/network/waiter behavior, installation tests, and library tests. A same-day follow-up from `fd47b67492615d83f8fd3aa73b65f20947f4078f` to `08e2d03b41d10ca44b078da6275a79dc0290f24f` was 2 commits ahead and touched docs, `packages/playwright-core/browsers.json`, `packages/playwright/types/test.d.ts`, and browser compatibility test assets. Apache-2.0 license metadata remained present.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, MCP activation, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `08e2d03b41d10ca44b078da6275a79dc0290f24f` requires a fresh review.

## Reviewed-Held Source Safety Review 2026-06-04 Follow-up

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `08e2d03b41d10ca44b078da6275a79dc0290f24f` to `b0f1008d9d1da8ee4b6d1ac293ed4878932b588f` using `git ls-remote`, GitHub repository metadata, license metadata, compare commit metadata, and changed-file metadata only. The compare was 1 commit ahead and touched only `packages/playwright-core/browsers.json`; the commit title indicated a WebKit browser revision roll. GitHub repository metadata continued to report Apache-2.0.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive browser payload reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `b0f1008d9d1da8ee4b6d1ac293ed4878932b588f` requires a fresh review.

## Reviewed-Held Source Safety Review 2026-06-04 Final v0.2 Gate

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `b0f1008d9d1da8ee4b6d1ac293ed4878932b588f` to `78c9dfd4c7245973a5d3f56a34971555cfcf3000` using GitHub compare metadata and commit metadata only. The compare was 1 commit ahead and touched `.github/workflows/tests_primary.yml` and `packages/playwright/src/transform/esmLoaderSync.ts`. The commit message was `fix(test): pass file:// URL to the ESM resolver in the sync loader (#41138)`. Apache-2.0 license metadata remained present from the live source-freshness scan.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive browser payload reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `78c9dfd4c7245973a5d3f56a34971555cfcf3000` requires a fresh review.

## Reviewed-Held Source Safety Review 2026-06-04 Final v0.2 Gate Follow-up

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `78c9dfd4c7245973a5d3f56a34971555cfcf3000` to `e3f61c1d798795e2e93f6c36e934853bbdab1e75` using GitHub compare metadata and commit metadata only. The compare was 1 commit ahead and touched `packages/playwright-core/browsers.json`. The commit message was `feat(firefox-beta): roll to r1522 (#41140)`. Apache-2.0 license metadata remained present from the live source-freshness scan.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive browser payload reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `e3f61c1d798795e2e93f6c36e934853bbdab1e75` requires a fresh review.

## Reviewed-Held Source Safety Review 2026-06-05

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `e3f61c1d798795e2e93f6c36e934853bbdab1e75` to `e8916e894be57feabf2b6dbe304ff9fc3323b125` using `git ls-remote`, GitHub repository metadata, license metadata, compare commit metadata, and changed-file metadata only. The initial compare to `017cfab2ccd542d94fed70405f87ef3fbca17915` was 2 commits ahead and touched Playwright MCP/backend navigation behavior, CLI client output/program/session behavior, and MCP/CLI tests. A same-session follow-up to `e8916e894be57feabf2b6dbe304ff9fc3323b125` was 1 commit ahead and touched `utils/build/build.js`, changing build-tool process behavior for watcher tooling. Apache-2.0 license metadata remained present.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive browser payload reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, CLI/session behavior adoption, build-tool behavior adoption, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `e8916e894be57feabf2b6dbe304ff9fc3323b125` requires a fresh review.

## Reviewed-Held Source Safety Review 2026-06-05 PR3 Gate Follow-up

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `e8916e894be57feabf2b6dbe304ff9fc3323b125` to `c8fc23bb1254432b911f2021c03c23932c8a37b8` using GitHub compare metadata, commit metadata, changed-file metadata, and license metadata only. The compare was 1 commit ahead and touched Playwright MCP remote browser endpoint/header handling in `packages/playwright-core/src/tools/mcp/browserFactory.ts`, `packages/playwright-core/src/tools/mcp/config.ts`, `packages/playwright-core/src/tools/mcp/program.ts`, and `tests/mcp/remote-endpoint.spec.ts`. Apache-2.0 license metadata remained present.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive browser payload reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, remote browser endpoint behavior adoption, remote header behavior adoption, CLI/session behavior adoption, build-tool behavior adoption, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `c8fc23bb1254432b911f2021c03c23932c8a37b8` requires a fresh review.

## Reviewed-Held Source Safety Review 2026-06-05 v0.2.2 Toolkit Hardening

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `c8fc23bb1254432b911f2021c03c23932c8a37b8` to `c30ccc68f833378087338ed9168175e1ce942c00` using `git ls-remote`, GitHub compare metadata, commit metadata, changed-file metadata, repository metadata, and license metadata only. The compare was 2 commits ahead and touched Playwright injected script, client connection/error/frame/page code, protocol validator/spec/channel files, server dispatcher/frame/page/recorder code, Chromium browser/page/service-worker handling, test-runner/library tests, trace-viewer tests, aria snapshot tests, and channel generation utilities. The latest commit message was `fix(chromium): propagate setUserAgent() to service workers via Network domain (#41071)`. Apache-2.0 license metadata remained present.

Classification: `REVIEWED_HELD` / reviewed runtime-sensitive browser payload reference.

Decision: keep Playwright as a high-trust browser-evidence source, but hold this upstream movement from active adoption. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, remote browser endpoint behavior adoption, remote header behavior adoption, CLI/session behavior adoption, build-tool behavior adoption, Chromium service worker behavior adoption, protocol/client/server behavior adoption, method extraction, product-repo changes, or global configuration changes. Future upstream movement beyond `c30ccc68f833378087338ed9168175e1ce942c00` requires a fresh review.

## v0.2.3 Full-Power Resolution 2026-06-06

Skill Scout read-only release-gate follow-up reviewed upstream default-branch movement from `c30ccc68f833378087338ed9168175e1ce942c00` to `ae106c05e5a40486ab5b9704234c32f0499e9719` using GitHub compare metadata, commit metadata, changed-file metadata, repository metadata, and license metadata only. The compare was 2 commits ahead and touched Playwright docs, injected script code, test-runner config/config-loader/plugin/web-server/task code, Playwright test API types, test-runner tests, and generated type overrides. The latest commit message was `Revert "feat(test): support per-project webServer configuration (#40869)" (#41167)`. Apache-2.0 license metadata remained present.

Outcome: `SYNCED_PLUGIN_DELEGATED`.

Decision: keep Playwright active for toolkit-owned browser-evidence standards and routing. The useful v0.2.3 adoption is not upstream runtime import; it is stricter evidence language in `methods/uiux/webapp-testing.md` and project-tooling routing that uses project-owned Playwright/browser tooling when already available. This review does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, injected-script behavior adoption, test-runner or web-server behavior adoption, config-loader behavior adoption, protocol/client/server behavior adoption, product-repo changes, or global configuration changes. Future upstream movement beyond `ae106c05e5a40486ab5b9704234c32f0499e9719` requires a fresh review.

## Freshness Review 2026-06-08

Skill Scout read-only follow-up reviewed upstream default-branch movement from `ae106c05e5a40486ab5b9704234c32f0499e9719` to `26e3dc2b8d0fed23409ddfea7cb7175b4e9b2163` using GitHub compare metadata only. The compare was 8 commits ahead and touched Playwright docs, credentials/auth docs, screencast runtime/type surfaces, network/HAR internals, MCP tests, and regression tests. Apache-2.0 license metadata remained present from the live source-freshness scan.

Outcome: `SYNCED_PLUGIN_DELEGATED`.

Decision: keep Playwright active for toolkit-owned browser-evidence standards and routing while delegating execution to project-owned Playwright or browser tooling. This refresh updates source tracking only and does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, credentials/auth behavior adoption, screencast behavior adoption, HAR/network behavior adoption, product-repo changes, or global configuration changes.

## Freshness Review 2026-06-08 Follow-up

Skill Scout read-only follow-up reviewed upstream default-branch movement from `26e3dc2b8d0fed23409ddfea7cb7175b4e9b2163` to `3ba155ee28e3c50af63c9f517283d41afb6800a4` using GitHub compare metadata only. The compare was 1 commit ahead and touched credential API docs, WebAuthn example removal, protocol/type surfaces, client/server credentials code, dispatcher code, and related tests. Apache-2.0 license metadata remained present from the live source-freshness scan.

Outcome: `SYNCED_PLUGIN_DELEGATED`.

Decision: keep Playwright active for toolkit-owned browser-evidence standards and routing while delegating execution to project-owned Playwright or browser tooling. This refresh updates source tracking only and does not approve source import, package update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, credentials/auth behavior adoption, WebAuthn behavior adoption, protocol/client/server behavior adoption, product-repo changes, or global configuration changes.

## Freshness Review 2026-06-09

Skill Scout read-only follow-up reviewed upstream default-branch movement from `3ba155ee28e3c50af63c9f517283d41afb6800a4` to `0bc6b172f10298286acf0f2ebbd27002dc4f263b` using GitHub compare metadata and remote HEAD resolution only. The compare was 21 commits ahead and touched workflow files, package and lockfile data, browser install scripts, browser registry metadata, client/server runtime files, MCP-related surfaces, CLI behavior, HAR/network code, protocol material, and tests. Apache-2.0 license metadata remained present from the source record.

Outcome: `SYNCED_PLUGIN_DELEGATED`.

Decision: keep Playwright active for toolkit-owned browser-evidence standards and routing while delegating execution to project-owned Playwright or browser tooling. This refresh updates source tracking only and does not approve source import, package update, lockfile update, CI update, runtime update, upstream test/code copy, script execution, browser installation, browser binary download, MCP activation, CLI/session behavior adoption, HAR/network behavior adoption, protocol/client/server behavior adoption, product-repo changes, or global configuration changes.

## Freshness Review 2026-06-11

Skill Scout read-only follow-up reviewed upstream default-branch movement from `0bc6b172f10298286acf0f2ebbd27002dc4f263b` to `954a7680c9bebd96323e299bf01a9ee079b080e9` using `git ls-remote` and GitHub compare metadata only. The compare was 7 commits ahead and touched Python docs, browser revision metadata, Firefox navigation handling, HAR and tracing code, trace-viewer WebSocket UI, HTML reporter/test tracing code, MCP session-log tests, and browser/library tests.

Outcome: `SYNCED_PLUGIN_DELEGATED`.

Decision: keep Playwright active for toolkit-owned browser-evidence standards and routing while delegating execution to project-owned Playwright or browser tooling. This refresh updates source tracking only and does not approve source import, package update, browser binary download, CI update, runtime update, upstream test or code copying, script execution, MCP activation, trace/HAR/session-log behavior adoption, product-repo changes, or global configuration changes.
