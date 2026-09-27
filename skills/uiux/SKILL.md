---
name: uiux
description: Design direction, design systems/tokens, components, accessibility (WCAG 2.2 AA), responsive layout, motion, and Core Web Vitals for web UI. Use when designing, building, reviewing, or polishing web UI; verify in a browser.
license: MIT
---

# UIUX route

Design and build UI for React/TS web apps (Next.js/Vite, often Tailwind + shadcn/ui): aesthetic direction, accessible markup, responsive layout, and evidence that it actually works in a browser.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## 1. Design direction — always
Read `upstream/frontend-design/UPSTREAM.md` before making any visual or layout choice: palette, type, hierarchy, motion, and how to avoid the generic "AI-generated" defaults it names. Skip only for a pure accessibility or performance fix that changes no visual design.

## 2. Accessibility — always for UI work
Read `upstream/accessibility/UPSTREAM.md` for WCAG 2.2 structure, ARIA, keyboard, and forms patterns. Its `upstream/accessibility/references/A11Y-PATTERNS.md` and `upstream/accessibility/references/WCAG.md` hold the copy-paste patterns and criteria list it points to.

## 3. Components — only if the project uses shadcn/ui
Read `upstream/shadcn/UPSTREAM.md` and the relevant file(s) under `upstream/shadcn/rules/` only when the project already has a `components.json` (shadcn is installed). It governs composition (Field/FieldGroup, ToggleGroup, icon slots, semantic color tokens) — treat it as construction guidance, not aesthetic authority; see Precedence.

## 4. Performance — only for a Core Web Vitals ask
Read `upstream/core-web-vitals/UPSTREAM.md` (plus its `upstream/core-web-vitals/references/LCP.md`, `upstream/core-web-vitals/references/INP.md`, `upstream/core-web-vitals/references/CLS.md` as needed) only when the user asks about page speed, LCP/INP/CLS, or page-experience optimization. Don't claim a metric is failing without runtime evidence.

## 5. Verify in a browser before calling it done
Follow `references/browser-verification.md` for how to drive the check (project's own Playwright, a connected Playwright MCP, or a static-only fallback) and what to capture. Use `references/tools.md` to decide which tool, if any, is already available.

## Measurable targets
- Contrast: 4.5:1 normal text, 3:1 large text (≥18px / ≥14px bold) and UI components, per WCAG 1.4.3/1.4.11.
- Every interactive element reachable by keyboard alone, with a visible `:focus-visible` indicator.
- Touch/click targets ≥24×24px (WCAG 2.5.8); 44×44px where comfortable.
- Layout holds at the smallest mobile width the project targets and at one desktop width, with no overflow or clipped text.
- If a Core Web Vitals ask: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile — only claim pass/fail from an actual trace or CrUX/Lighthouse run, never from reading the code.

## Precedence (overrides upstream text)
- Base author for this route is **anthropics/skills** (`frontend-design`): it sets aesthetic direction. `addyosmani/web-quality-skills` (`accessibility`, `core-web-vitals`) and `shadcn-ui/ui` (`shadcn`) are grafts, each in its own `upstream/<pick>/` folder.
- Where shadcn's default component look (rounded cards, default shadows) conflicts with frontend-design's warning against generic "SaaS-card kit" defaults, follow frontend-design for the visual decision and use shadcn only for the underlying markup/composition and its accessibility wiring.
- **shadcn is read-only reference here.** It was vendored as `UPSTREAM.md`, so its `!` npx info-fetch directive never runs and its `allowed-tools` grant is inert. Never run `npx shadcn@latest ...` (or the pnpm/bun equivalents) without the user's explicit approval for that specific command.
- accessibility's `npm install @axe-core/cli -g` and `npx lighthouse` lines are overridden by `references/tools.md`: never install a package (global or local) or npx-run one the project lacks without the user's approval for that command.
- Known dangling links inside the vendored files themselves — do not follow, they point to skills this toolkit does not vendor or to a pre-rename filename:
  - `upstream/accessibility/UPSTREAM.md` links to a `web-quality-audit` sibling skill (SKILL.md) that this toolkit does not vendor.
  - `upstream/accessibility/references/A11Y-PATTERNS.md` links back to `SKILL.md` by its original filename; that file is vendored here as `upstream/accessibility/UPSTREAM.md`.
  - `upstream/core-web-vitals/UPSTREAM.md` links to a `performance` sibling skill (its SKILL.md, plus reference files MEASUREMENT and RUM) that this toolkit does not vendor.
  - `upstream/shadcn/UPSTREAM.md` links twice to `cli.md`, which this toolkit deliberately excludes: `cli.md` itself links back to `SKILL.md` by name, which cannot resolve under this toolkit's rename convention. For CLI flag reference, tell the user to run `npx shadcn@latest --help` themselves, with approval.
- axe/Lighthouse scores are evidence, not conformance: a 100 or a clean scan is not itself a WCAG 2.2 AA claim — pair automated results with the manual keyboard pass.
- Never say a build, test, browser check, or scan passed unless its output is in this session.

## Output
- State the design direction taken (or "no visual change") and why, referencing the brief.
- List the components/markup touched and which accessibility patterns applied (labels, roles, focus, contrast).
- Verification evidence: viewport(s) checked, keyboard pass result, scan tool and result, or exactly what was skipped and why.
- Open gaps: anything not checked (e.g., no Playwright in this project, no live server to test against).
