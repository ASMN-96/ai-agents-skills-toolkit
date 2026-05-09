# Dashboard Performance Scoping Rubric

Use this rubric when a user says a dashboard, viewer, page, or app feels slow.

## Scope First

- Identify the user-visible symptom: initial load, navigation, filtering, charts, table rendering, saves, or realtime updates.
- Reproduce in the smallest relevant route and viewport.
- Check console, network, and visible loading/error states before broad refactors.
- Measure frontend runtime first unless evidence points to backend, database, or network bottlenecks.
- Escalate to backend/database review only when traces, timings, payload size, or query behavior justify it.

## Avoid

- Full-site performance audits for a narrow complaint.
- Backend rewrites without frontend evidence.
- Changing caching, auth, RLS, or API contracts without approval.
- Treating generic scores as product requirements without context.

## Completion Evidence

- Symptom and measurement method.
- Before/after evidence or clear measurement limit.
- Changed scope and untouched boundaries.
- Follow-up risk if the root cause is outside the approved task.
