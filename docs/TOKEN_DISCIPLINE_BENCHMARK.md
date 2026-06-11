# Token Discipline Benchmark

This benchmark is a qualitative governance benchmark for large or ambiguous toolkit tasks. It does not measure model token usage directly and does not prove runtime execution.

## Passing Behavior

A response or implementation plan passes the token-discipline benchmark when it:

- states the objective and non-goals,
- uses changed-file or risk-based context selection instead of whole-repo dumping,
- identifies omitted context and why it was omitted,
- separates repo facts, assumptions, inferences, and owner decisions,
- reports validation evidence only when observed,
- avoids broad scans after enough context exists to make a safe local decision.

## Failing Behavior

A response fails when it:

- claims whole-repo review without evidence,
- reads or pastes large unrelated files to appear thorough,
- hides skipped, unavailable, dry-run, mock, metadata-only, fallback, or partial checks,
- treats generated context packs, summaries, registries, source records, or file presence as execution proof,
- expands scope into product repos, global config, package installs, CI, MCP, or source imports without approval.

## Eval Linkage

Current machine coverage lives in `evals/token-efficiency/low-risk-concise-routing-evals.json` and `evals/skills/governance-proof-evals.json`.

Required cases include:

- `large-task-compact-context-pack`
- `changed-file-neighborhood-no-whole-repo-dump`
- `private-overlay-exclusion-required`
- `project-map-staleness-check-required`
- `governance-lite-small-task-no-broad-context`
- `token-discipline-large-review`
