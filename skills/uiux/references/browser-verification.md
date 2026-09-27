# Browser verification

How to get real evidence for a UI change instead of describing it from source alone.

## Pick a driver, in this order

1. **The project's own Playwright.** If `playwright.config.ts`/`.js` or a `@playwright/test` dev dependency exists, use it. Write or extend a spec under the project's existing test directory; run it with the project's own script (e.g. `npm run test:e2e`, `npx playwright test`).
2. **A Playwright MCP server, if the user has one connected.** Drive the running dev server through it: navigate, resize, click, read the accessibility tree.
3. **Neither is available.** Say so plainly and scope the review to static/code-level checks (semantic HTML, ARIA, focus order in the DOM, contrast of literal color values). Do not claim a rendered check happened.

Never install a browser automation package or binary to perform a one-off check; that is a standing dependency change and needs the user's approval first.

## What to capture

For any visual or interactive change, gather all of the following before calling a change verified:

- **Smallest mobile width** the design targets (360–390px is a reasonable default absent a project convention) — check for overflow, wrapped/clipped text, and that touch targets stay usable.
- **One desktop width** (1280px is a reasonable default) — check the layout doesn't regress at the wider breakpoint.
- **Keyboard pass** — tab through every interactive element added or changed; confirm a visible focus indicator, a logical order, and that nothing traps focus.
- **Accessibility scan** — run axe (via `@axe-core/playwright` if the project has it, or the axe browser extension/CLI otherwise) against the changed view and note any new violations.

## Reporting evidence

State exactly what ran and what it returned: the command or tool, the viewport(s), and the pass/fail outcome. If a step was skipped (no Playwright, no axe available, could not reach a running server), say that explicitly rather than omitting it. A description of the code is not evidence a browser check occurred.
