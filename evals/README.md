# Toolkit Eval Contract

Eval files are governance artifacts. They do not execute tools, activate skills, prove runtime visibility, or approve release readiness by themselves.

## Required Case Fields

Every case must have:

- `id`: stable unique identifier inside its eval set.
- `userPrompt` or `input`: representative request text.

Unsafe request evals under `evals/stop-conditions/` must include:

- `expectedAction`: one of the controlled values enforced by `scripts/ai-toolkit/run-toolkit-evals.mjs`.
- `expectedStopConditions` or `expectedSafeResponse`.
- `forbiddenClaims`: claims the agent must not make from unavailable, dry-run, mock, fallback, metadata-only, or partial evidence.

Review-oriented evals must include `expectedReviewBehaviors` when the expected response requires review work rather than only routing, stopping, or redirecting.

Generic naming compatibility evals must include `forbiddenAliases` so removed helper names and method-only names cannot return as active public skills.

Mirrored eval suites under `.ai-toolkit/evals/` must stay byte-equivalent to their top-level source suite where the runner enforces parity.

## Evidence Boundaries

- Dry-run, mock, fallback, skipped, metadata-only, planned, unavailable, or partial checks are not real execution evidence.
- Native-visible TOML files, compiled fallbacks, and registry entries are separate signals; none prove an agent spawned.
- Browser, screenshot, responsive, visual QA, security, quality, release, and source-freshness claims require observed evidence from the relevant command or manual verification.
