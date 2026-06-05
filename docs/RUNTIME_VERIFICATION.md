# Runtime Verification

Toolkit files are not proof of runtime activation. Full runtime activation must not be claimed until a fresh-session verification confirms visibility and fallback status.

## Required Checks

Fresh-session runtime verification should confirm:

- `governance` skill visibility
- no retired helper aliases exposed as active runtime skills
- native custom-agent visibility or compiled fallback status for the 12 core agents
- Superpowers availability if installed
- GSD availability if installed
- Playwright/browser availability when needed
- GitHub/gh availability when needed
- Supabase tooling/docs availability when needed
- no silent fallback

Retired helper aliases are not active runtime skills. Do not claim runtime activation, native visibility, or project readiness from repository files alone.

## Reporting

Report each capability as:

- visible and active
- visible but not used
- installed but restart/new-session verification required
- unavailable with safe fallback
- unavailable with no safe fallback
- repo-available only, fresh-session verification required

## Current Reports

- `docs/V0_2_1_RUNTIME_ADOPTION_PROOF.md` records PR2 repo-local runtime proof and backup-first global cleanup evidence. It does not claim product-repo adoption or a restarted fresh-session UI visibility test.
- `docs/RUNTIME_VERIFICATION_REPORT_2026-05-09.md` records current-session visibility and fallback status. It does not claim durable fresh-session activation across future sessions.
- `docs/RUNTIME_VERIFICATION_REPORT_2026-05-09_FRESH_SESSION.md` records Phase 10I fresh-session smoke testing. The initial run exposed a WindowsApps PowerShell startup failure under the elevated Windows sandbox. A follow-up fresh run with a temporary per-command `windows.sandbox="unelevated"` override completed the required checks and certified Level 2 readiness for one controlled pilot, with the same override or another verified shell path required before pilot writes.

## Real Project Readiness

Runtime verification feeds the real-project readiness gate in `docs/REAL_PROJECT_READINESS.md`.

The toolkit is ready for one controlled real-project pilot after the Phase 10I fresh-session smoke test confirmed skill visibility, native-agent visibility, compiled-fallback file presence, support-tool availability, clean repository state, JSON validity, unsafe artifact absence through follow-up validation, and no silent fallback.

Normal use in comparable real projects is now gated by the Level 3 project-sync evidence in `docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md`: clean feature branch, dry-run-first project sync, version pinning, manifest validation, project checks, PR review, passing CI, and no project-owned context overwrite.

This Level 3 project-sync evidence does not change the runtime activation boundary. Future fresh-session runtime claims still require the checks listed above.

## No Silent Fallback

For high-risk work, do not silently downgrade from native agent to compiled fallback. Report the status and stop for approval unless fallback was pre-approved and safe.

## Validation Boundary

This document defines verification requirements only. It does not install, activate, or configure runtime capabilities.
