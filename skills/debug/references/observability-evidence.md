# Observability evidence discipline

Adds to `observability-checklist.md`: rules for what to say about telemetry
when you cannot add or query real monitoring in the current session (no
deploy, no dashboard access, no log aggregator).

## Report only what you observed

- List the failure points a fix should make visible: error paths, retry
  boundaries, background jobs, external calls, state transitions.
- Prefer a clear thrown error and an existing project logger over a new
  monitoring dependency.
- Report logs, traces, metrics, or command output only when you actually
  collected them in this session. Label anything you skipped or couldn't
  reach as unavailable — don't imply it was checked.
- Keep production-monitoring claims separate from local debug output. "This
  error is now caught and logged" is not "this is now visible on the
  dashboard" unless you saw it there.

## Bad patterns to avoid

- Claiming production monitoring coverage from a local code read, a planned
  dashboard, or a logger that was never exercised.
- Saying telemetry "should" show something instead of showing what it did
  show, or stating plainly that it wasn't run.

## Keep secrets and private data out of evidence

- Never paste tokens, cookies, credentials, tenant data, or raw PII into a
  log line, a report, or this conversation while gathering evidence.
- If reproducing the bug would require secret access or private data you
  don't have, stop and say so instead of working around it.

## Stop conditions

Pause and ask before continuing when:

- Diagnosing the bug would need secret access or exposing private data.
- The fix seems to need a new monitoring service, package, deploy, CI
  change, or external permission — that's outside a debugging session.
- Whether the bug is actually fixed depends on production behavior you
  cannot observe from here.

Source: adapted from this toolkit's own `methods/reliability/observability-readiness.md` (v0.2.5), rewritten here as debug-route guidance.
