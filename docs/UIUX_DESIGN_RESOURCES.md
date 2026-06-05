# UIUX Design Resources

The v0.2 UI/UX model uses plural, complementary design references. The goal is better acceptance criteria and rendered evidence, not automatic design-source activation.

## Active Resources

- UI UX Pro Max is the primary internal premium design rubric.
- Impeccable is the primary external UI/UX design intelligence source and reference.
- open-design is an active-reference design intelligence source only.
- shadcn/ui is a reference and pattern source only.
- Addy Osmani UI/web quality methods provide normalized engineering and web quality criteria.
- Anthropic UI/frontend guidance may be used only as restricted normalized guidance.
- Use the toolkit-owned commercial dashboard polish rubric for SaaS/dashboard polish. Bencium remains historical source-safety evidence only and is not active source authority.
- Uncodixfy anti-generic AI UI guidance helps avoid generic AI-looking interfaces.
- VoltAgent design-context references may be used if already tracked.

## Exclusions

- No Base UI in this v0.2.2 model.
- No Figma in this v0.2.2 model.
- No Impeccable install unless separately approved.
- No open-design install, MCP/global config, raw design-system import, or unmanaged persistence unless separately approved.
- No CLI/component import from shadcn/ui by default.
- No raw prompt/source copying.
- No unmanaged design-system file import.

Design references are not harmful overlap. They answer different questions: rubric quality, external design intelligence, component patterns, commercial polish, anti-generic critique, and browser evidence.

## Agent Ownership

UIUX agent owns final design acceptance criteria. Frontend-agent implements only after criteria are clear. QA/browser tools verify rendered evidence. Reviewer-agent checks regressions and scope. PR Release Gate decides release readiness from actual evidence.

## Evidence Tools

Playwright, Axe Playwright, and Lighthouse CI are evidence tools, not design taste tools.

- Playwright verifies browser workflows, responsiveness, and screenshots/traces when actually run.
- Axe Playwright verifies accessibility findings when actually run.
- Lighthouse CI verifies performance and public/mobile web quality when actually run.

Do not claim rendered quality, accessibility, Lighthouse scores, or browser behavior unless actual output exists.
