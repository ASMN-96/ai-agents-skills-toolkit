# Private Beta Readiness Closeout

Status: private beta approved under Level 3 controls.

Date: 2026-05-30

Baseline commit: `f2a3fc9b491c8a73568facdfc96309abb320b247`

This closeout resolves the immediate question: the toolkit is ready for a private beta with invited users. This is not Level 4 enterprise rollout, Level 5 public release, package publication, runtime adapter activation, MCP setup, global Codex configuration change, or external tool activation.

## Decision

Private beta may start from the baseline commit above.

Beta use must follow the Level 3 operator workflow:

- use clean feature branches;
- run dry-run first;
- approve the exact write scope before `-ConfirmWrite`;
- write only reviewed `.ai-toolkit/` project artifacts;
- validate the project install manifest;
- run target project checks;
- merge through PR review only when checks are green or explicitly accepted as non-blocking.

## Allowed For Private Beta

- Invited beta users or internal testers.
- Comparable projects that can follow the Level 3 checklist.
- Project sync using `docs/LEVEL_3_OPERATOR_CHECKLIST.md`.
- Feedback collection on usability, setup clarity, sync behavior, warnings, missing docs, and project-fit issues.
- Fixes through normal feature branch, PR, CI, CodeRabbit, and merge flow.

## Not Allowed Yet

- Public release or public package distribution.
- Level 4 enterprise rollout claims.
- Level 5 public readiness claims.
- Runtime adapter activation beyond the current validated agent workflow.
- MCP setup or global Codex configuration changes.
- External tool installs or activation.
- Product-repository writes outside approved project PRs.
- Secret, credential, token, cookie, or private environment value collection from beta users.

## Beta Entry Checklist

- Baseline commit is recorded in the beta note or issue.
- Beta users understand this is private beta, not public release.
- The target project is on a clean non-main branch with upstream aligned.
- The selected toolkit asset set is minimal and documented.
- Dry-run output is reviewed before any write.
- `install/validate-project-install.ps1` passes after confirm-write.
- Target project checks are run before merge.
- Any WARN, skipped check, fallback, dry-run-only result, or manual acceptance is reported honestly.

## Hold Conditions

Stop beta rollout for the affected project if:

- install validation fails;
- the dry run would overwrite project-owned context or product files;
- target branch safety fails;
- source freshness reports a review-required or high-risk change;
- public/private leak scan introduces hard-removal findings in release paths;
- beta use requires public release, runtime expansion, external activation, or global config changes.

## Rollback

For a beta project sync, rollback is a normal reviewed Git revert of the project PR plus rerunning project checks and install validation. Do not delete historical evidence; record the revert reason and keep the beta issue or note updated.

## Future Work

Private beta feedback may create Level 3 fixes or future Level 4 evidence. It does not automatically promote the toolkit to Level 4. Level 4 still requires additional representative pilots, warning-threshold owner approval, rollback rehearsal, enterprise tool metadata review, and owner promotion approval.
