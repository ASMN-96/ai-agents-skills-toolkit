# Frontend Profile

## Included Agents

- Frontend Agent
- UIUX Agent
- QA Test Agent
- Reviewer Agent
- Security Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current framework or browser API docs.
- Playwright for browser verification.
- Approved design artifacts only when separately supplied and reviewed; Figma is excluded from v0.2 current-scope recommendations.

## Default Mode

Implementation.

## Allowed Actions

- Implement and review scoped frontend changes.
- Validate accessibility, responsive behavior, visual quality, and interaction states.
- Use browser checks for affected UI/runtime flows.

## Forbidden Actions

- Use excluded or unapproved design tools without approved design access.
- Install external UI packs or skills.
- Override product repo design systems without approval.
- Add package artifacts, caches, logs, build outputs, or temp files.

## Required Output Format

- UI change summary.
- Accessibility/responsive/browser verification.
- Files and flows affected.
- Remaining risks.

## Required Verification Gates

- Confirm UI/UX and Frontend coverage are applied.
- Confirm Playwright or equivalent browser verification when runtime behavior changes.
- Confirm text, controls, and states remain usable across target viewports.
- Confirm security-sensitive UI flows are reviewed.
