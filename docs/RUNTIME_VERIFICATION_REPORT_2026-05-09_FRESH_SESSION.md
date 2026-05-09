# Runtime Verification Report - 2026-05-09 Fresh-Session Smoke Test

This report records the Phase 10I attempt to certify Level 2 real-project readiness. It does not install, activate, configure, clone, sync, or modify global Codex state.

## Scope

- Toolkit branch: `codex/phase-10i-fresh-session-smoke-test`
- Toolkit commit under test: `21740a2d6441d19a0558a0899c0ed73c26ce7d79`
- Product repository changes: no
- Global Codex config changes: no
- External installs or activations: no
- Runtime command used for independent fresh-session evidence: `codex exec --ephemeral`

## Result

Level 2 one-controlled-pilot readiness is not fully certified by this report.

The fresh Codex CLI session confirmed important runtime visibility signals, including `riss-governance` skill visibility and native agent-role visibility. However, the same fresh CLI session could not launch local shell commands because Windows sandbox process startup failed with `CreateProcessAsUserW failed: 5`. Because of that, the fresh session could not independently verify local git source truth, local JSON parsing, or local compiled fallback files.

Current-session local checks did verify the repository state, JSON validity, support-tool cache presence, native-agent TOML presence, and compiled fallback files. Those checks are useful evidence, but they do not replace the missing fresh-session local shell verification required by `docs/REAL_PROJECT_READINESS.md`.

## Evidence Summary

| Check | Status | Evidence Boundary |
| --- | --- | --- |
| Exact toolkit commit | Verified in current session | `HEAD` and `origin/main` both resolved to `21740a2d6441d19a0558a0899c0ed73c26ce7d79` before report edits |
| Current repo state | Verified in current session | `git status --short --branch` showed clean phase branch before report edits |
| Fresh CLI session started | Verified | `codex exec --ephemeral` completed and returned a smoke-test report |
| `riss-governance` visibility | Verified in fresh CLI session | Fresh CLI reported `riss-governance` visible and usable as a skill |
| `riss-agent-governance` helper skill | Planned/unimplemented | Local path absent; registry contract treats it as planned/draft |
| `riss-skill-governance` helper skill | Planned/unimplemented | Local path absent; registry contract treats it as planned/draft |
| 12 native core agent roles | Visible in fresh CLI session | Fresh CLI reported the 12 core roles visible in the available role surface |
| 12 compiled fallback files | Verified in current session and no-history subagent | All expected `compiled-agents/*.compiled.md` files were present |
| Native custom-agent TOML files | Verified in current session | All 12 expected TOML files were present under local Codex agent config |
| Superpowers | Visible by local cache/current session | Plugin cache and skills are present; Superpowers remains external |
| GSD | Visible by local cache/current session | Local GSD skills are present |
| GitHub/gh | Verified in current session | GitHub CLI exists and reports authenticated status; token value not recorded |
| Browser/Playwright | Partially visible | Local/browser-use and Playwright skill paths are present; no browser target was exercised |
| Supabase | Partially visible | Supabase plugin cache is present; CLI/MCP project access was not exercised |
| CodeRabbit | Partially visible | CodeRabbit plugin cache is present; PR review will verify live CodeRabbit behavior |
| JSON validation | Verified in current session | PowerShell `ConvertFrom-Json` parsed repository JSON files successfully |
| Fresh CLI local git/JSON checks | Blocked | Fresh CLI shell launch failed with `CreateProcessAsUserW failed: 5` |
| No silent fallback | Verified by report behavior | Fallback boundaries and blocked shell state were reported explicitly |

## Blocking Gap

The fresh CLI session could not run local shell commands. Until a fresh Codex session can run the required local checks, Level 2 readiness must remain blocked.

The missing fresh-session evidence is:

- `git status --short --branch`
- `git rev-parse HEAD`
- `git rev-parse origin/main`
- repository JSON parse
- direct local file check for compiled fallbacks and helper skill paths

## Recommendation

Do not start a real-project pilot yet. The next step should be a focused Phase 10I follow-up that fixes or bypasses the fresh-session shell startup issue, then reruns the same smoke test from a new session.

Acceptable evidence paths:

- a Codex Desktop fresh thread that can run local shell checks, or
- a Codex CLI fresh session where shell startup succeeds, or
- a manually captured fresh-session report with the exact commands and outputs above.

Only after that report passes should the toolkit move to Level 2: one controlled real-project pilot.
