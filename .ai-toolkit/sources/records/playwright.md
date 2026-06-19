# Playwright Source Record

- Source name: Playwright
- Repository: microsoft/playwright
- Source URL: https://github.com/microsoft/playwright
- Homepage: https://playwright.dev
- Last reviewed commit: 32883517ffe7725ef45ac2dc020a63962c27d7a3
- Last reviewed date: 2026-06-20
- Review level: delegated browser-evidence source metadata
- Classification: delegated-existing / project-owned browser validation only
- License status: Apache-2.0 signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; not runtime-approved by toolkit metadata
- neverAutoImport: true

## Toolkit Value

Playwright is useful as a high-trust browser/runtime verification reference for screenshots, traces, videos, locators, cross-browser checks, and failure diagnostics when the project already owns Playwright or the owner explicitly approves installation.

## Freshness Review 2026-06-20

Read-only source-freshness review covered upstream movement from 11797b0336d50ab0d8bc554f53fcd8d4aab8438e to 32883517ffe7725ef45ac2dc020a63962c27d7a3 using git ls-remote and GitHub compare metadata only. The compare touched CI workflow files, Vite/package metadata, package-lock metadata, trace WebSocket artifact handling, and related tests.

Outcome: SYNCED_PLUGIN_DELEGATED.

## Forbidden By Default

- no raw upstream copying;
- no package or lockfile updates;
- no browser binary downloads;
- no CI wiring;
- no MCP activation;
- no runtime automation;
- no product-repo changes;
- no global configuration changes;
- no trace/video/screenshot artifact claims without observed project-owned execution and artifact hygiene review.
