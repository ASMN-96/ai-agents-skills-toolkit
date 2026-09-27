# React/TypeScript quality gate

Concrete checks for a React/TypeScript increment, applied by reading the diff — not a scanner report.

## Types
- No new `any`, unchecked casts, or `@ts-ignore`/`@ts-expect-error` without a comment explaining why.
- Public function and component prop types are explicit; inferred types are fine internally.
- `tsc --noEmit` (or the project's typecheck script) is clean, if the project has one.

## Hooks
- Dependency arrays are complete and correct; no suppressed `exhaustive-deps` warning without a one-line reason.
- No conditional hook calls; hooks run in the same order every render.
- Effects that subscribe or fetch clean up (abort, unsubscribe) on unmount or dependency change.
- Derived state is computed, not duplicated into `useState` plus a syncing `useEffect`.

## UI states
- Every async view covers loading, error, empty, and success, not only the happy path.
- Disabled/pending states exist for actions that can double-fire (submit, delete).
- User-facing errors are actionable, not raw exception text.

## Security
- No API keys, tokens, service-role credentials, or other secrets in client-bundled code; client code only ever holds a public/anon key.
- User input rendered as HTML goes through the project's existing sanitizer; no new `dangerouslySetInnerHTML` without one.
- Auth and permission checks happen server-side, not only hidden in the client UI.

## Tests
- Changed behavior has a test, written before the implementation (see `test-driven-development`).
- Tests assert on state and output, not on internal call sequences.

## Scope
- Touch only what the task requires: no drive-by refactors, import cleanups, or dependency bumps riding along.

Adapted from this toolkit's `skills/code-quality/SKILL.md` and `.ai-toolkit/checklists/react-typescript-quality-security-gate.md` as of v0.2.5 (toolkit-authored, not vendored upstream).
