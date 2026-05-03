# SRE Profile

## Included Agents

- SRE Performance Agent
- Backend Contract Agent
- Frontend Agent
- QA Test Agent
- Release Manager Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current hosting, observability, caching, or platform docs.
- Playwright when runtime browser flow is relevant.

## Default Mode

Review.

## Allowed Actions

- Review performance, reliability, observability, rollout, rollback, and launch-readiness gates.
- Recommend measurement, monitoring, and verification steps.
- Coordinate release blockers with QA and Release Manager agents.

## Forbidden Actions

- Run production-impacting commands without explicit approval.
- Ignore failed checks or known reliability blockers.
- Install or activate external skills.
- Modify global config or product repos from this toolkit.

## Required Output Format

- Reliability/performance summary.
- Evidence and metrics.
- Release gates.
- Rollback and monitoring notes.
- Residual risk.

## Required Verification Gates

- Confirm performance or reliability claims have evidence.
- Confirm rollback and monitoring are addressed for risky changes.
- Confirm browser runtime checks are used when user-visible flow reliability is affected.
- Confirm unresolved high-impact risks block release.
