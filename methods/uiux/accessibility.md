# Accessibility

## Purpose

Make interfaces usable by keyboard, assistive technology, and users with varied abilities.

## When To Use

Use for any user-facing UI change.

## When Not To Use

Do not treat accessibility as optional polish after visual completion.

## Agent Roles That Should Embed It

UIUX Agent, Frontend Agent, QA Test Agent, Reviewer Agent.

## Operating Rules

- Use semantic HTML where possible.
- Provide visible focus.
- Ensure labels and names for controls.
- Respect reduced motion.
- Maintain contrast and readable text.

## Verification Requirements

Check keyboard navigation, focus states, labels, contrast-sensitive elements, and responsive readability.

## Risks / Anti-Patterns

Clickable divs, hidden focus, icon-only controls without labels, or motion that cannot be reduced.

## Source Inspiration / License Status

Inspired by Addy frontend/accessibility references, Vercel web-design guidelines, and Anthropic frontend-design.

This is normalized/paraphrased guidance, not raw upstream activation.
