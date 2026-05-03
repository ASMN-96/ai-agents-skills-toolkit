# Webapp Testing

## Purpose

Verify web apps through rendered behavior, not just static code inspection.

## When To Use

Use after frontend changes, routing changes, form work, dashboards, or visual refinements.

## When Not To Use

Do not use full browser checks for docs-only changes with no rendered surface.

## Agent Roles That Should Embed It

QA Test Agent, Frontend Agent, UIUX Agent, Reviewer Agent.

## Operating Rules

- Run the app and verify UI and behavior locally for any change affecting UI/UX or behavior; static review alone is insufficient.
- Inspect console and network errors.
- Test key workflows.
- Capture screenshots for visual changes.
- Check desktop and mobile breakpoints.

## Verification Requirements

Report browser target, workflow tested, errors found, screenshots or observations, and remaining gaps.

## Risks / Anti-Patterns

Assuming compile success means UI works, testing only one viewport, or ignoring console errors.

## Source Inspiration / License Status

Inspired by Anthropic web app testing, Vercel/Playwright testing patterns, and toolkit verification rules.

This is normalized/paraphrased guidance, not raw upstream activation.
