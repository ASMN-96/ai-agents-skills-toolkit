# Runtime Verification

Toolkit files are not proof of runtime activation. Full runtime activation must not be claimed until a fresh-session verification confirms visibility and fallback status.

## Required Checks

Fresh-session runtime verification should confirm:

- `riss-governance` skill visibility
- planned `riss-agent-governance` status, if later implemented
- planned `riss-skill-governance` status, if later implemented
- native custom-agent visibility or compiled fallback status for the 12 core agents
- Superpowers availability if installed
- GSD availability if installed
- Playwright/browser availability when needed
- GitHub/gh availability when needed
- Supabase tooling/docs availability when needed
- no silent fallback

## Reporting

Report each capability as:

- visible and active
- visible but not used
- installed but restart/new-session verification required
- unavailable with safe fallback
- unavailable with no safe fallback

## Current Reports

- `docs/RUNTIME_VERIFICATION_REPORT_2026-05-09.md` records current-session visibility and fallback status. It does not claim durable fresh-session activation across future sessions.

## No Silent Fallback

For high-risk work, do not silently downgrade from native agent to compiled fallback. Report the status and stop for approval unless fallback was pre-approved and safe.

## Validation Boundary

This document defines verification requirements only. It does not install, activate, or configure runtime capabilities.

