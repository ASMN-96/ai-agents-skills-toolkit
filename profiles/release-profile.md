# Release Profile

## Included Agents

- Release Manager Agent
- Reviewer Agent
- QA Test Agent
- Security Agent
- SRE Performance Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- GitHub checks for PR and CI status.
- Context7 when available/configured for docs or version policy references.

## Default Mode

Review.

## Allowed Actions

- Confirm branch, commit, PR, checks, review threads, changelog, and release gates.
- Merge only after required gates are green or explicitly non-blocking and approval exists.
- Document post-merge status and next phase.

## Forbidden Actions

- Merge with failed required checks, conflicts, unresolved required comments, or safety blockers.
- Push directly to main.
- Create project sync/install scripts before Phase 5 approval.
- Install skills or modify global config.

## Required Output Format

- Repo/branch confirmation.
- PR/check/review status.
- Safety gate results.
- Merge result or blocker.
- Final recommendation.

## Required Verification Gates

- Confirm clean working tree before and after release actions.
- Confirm no forbidden artifacts or product repo changes were introduced.
- Confirm CodeRabbit/CI status if configured.
- Confirm latest main hash after merge if merge occurs.
