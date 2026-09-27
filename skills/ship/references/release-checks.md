# Release and rollback readiness

Checks to run through before calling a change release-ready, beyond "tests pass."

## Before claiming ready

- Confirm branch, base branch, and how far ahead/behind: `git status`, `git log <base>..HEAD`.
- Run the project's own checks (build, lint, tests, typecheck) and read the actual output — do not infer from a partial run or an earlier pass.
- Confirm no forbidden surface changed unintentionally (CI config, secrets, deployment config, product repos) unless that was the point of the change.
- Note every WARN, skipped, or unavailable check in the report. A skipped check is not a passed check.

## Rollback path

Every release needs a stated way back. Pick the one that applies and write it down:

- **Revert**: `git revert` the merge commit, or redeploy the previous tag/build.
- **Config/flag**: the change sits behind a flag or env var that can be flipped off without a deploy.
- **Migration**: is the DB migration forward-only or reversible? If forward-only, what's the forward fix if it goes wrong (not just "roll back the app")?
- **Manual mitigation**: for changes with no clean revert (e.g. one-way data backfills), state what a human does if it goes wrong.

Say explicitly which of these applies — "no rollback path" is itself a finding to surface, not something to leave implicit.

## Database and schema changes

- New column: is it nullable or does it have a default, so old code paths still work during rollout?
- Migration order: does the migration apply cleanly before the code that depends on it ships, and roll back cleanly if the deploy is aborted mid-way?
- RLS/policy changes: what did access look like before and after? Who gains or loses access?
- Backfills: are they idempotent and resumable if interrupted?

## Feature flags

- Does the change need a flag to allow a fast, deploy-free rollback?
- If flagged, what's the default state on merge — on or off?
- Who flips it, and is that documented anywhere other than this PR?

## Monitoring after deploy

- What signal shows the change is working (a metric, a log line, an error rate)?
- What signal shows it's broken, and who is watching it in the first hour after deploy?
- Is there an alert, or does someone need to go looking?

## Release notes

State plainly:

- What changed, in user- or operator-facing terms.
- Any migration or manual step required to adopt it.
- Known limitations or follow-up work not included in this change.

## What this does not replace

- Code review — a clean release checklist is not a substitute for the `review` route.
- Security sign-off — auth, secrets, and dependency changes go through the `secure` route.
- The project's own CI — its gate defines "passing," not this checklist.
