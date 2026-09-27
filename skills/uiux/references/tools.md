# UI quality tools

Use a tool only if the project already has it wired up (a config file, a dev dependency, or an existing script). Otherwise, name the tool as a suggestion and let the user decide whether to add it — never install or configure it yourself.

| Tool | Detect | Use for |
|---|---|---|
| **Playwright** | `playwright.config.*`, `@playwright/test` dependency | Rendered browser checks: layout at a given viewport, interaction flows, screenshots. See `browser-verification.md`. |
| **axe-core** (`@axe-core/playwright`, `axe-core`, or the axe browser extension) | Dependency present, or ask if the user has the extension | Automated accessibility scans of a rendered page. A clean scan is not WCAG conformance by itself — pair it with a manual keyboard pass. |
| **Lighthouse CI** (`@lhci/cli`, a `lighthouserc` file) | Config or dependency present | Core Web Vitals and other Lighthouse categories in CI, or `npx lighthouse <url>` for ad hoc numbers only if Lighthouse is already installed; otherwise ask. |

If none of these are present and the user asks for evidence a check can't produce statically, say so and suggest the smallest relevant addition rather than reaching for a heavier alternative.
