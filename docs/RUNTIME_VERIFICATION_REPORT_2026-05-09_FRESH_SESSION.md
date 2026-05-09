# Runtime Verification Report - 2026-05-09 Fresh-Session Smoke Test

This report records Phase 10I fresh-session runtime verification for Level 2 real-project readiness. It does not install, activate, configure, clone, sync, or modify global Codex state.

## Scope

- Toolkit branch for follow-up documentation: `codex/phase-10i-level2-certification`
- Toolkit commit under test: `ffd7ef7504703a2e282208247c1a84233ef0b543`
- Product repository changes: no
- Global Codex config changes: no
- External installs or activations: no
- Runtime command used for initial independent fresh-session evidence: `codex exec --ephemeral`
- Runtime command used for passing independent fresh-session evidence: `codex exec --ephemeral -c 'windows.sandbox="unelevated"' --sandbox workspace-write`

## Result

Level 2 one-controlled-pilot readiness is certified by this report.

The initial fresh Codex CLI session confirmed important runtime visibility signals, including `riss-governance` skill visibility and native agent-role visibility. That first run could not launch local shell commands because the Windows elevated sandbox failed to start the WindowsApps PowerShell binary with `CreateProcessAsUserW failed: 5`.

A follow-up fresh Codex CLI session used a temporary per-command override, `windows.sandbox="unelevated"`, without changing global Codex config. That run completed the missing local shell checks, verified source truth, parsed repository JSON files, confirmed helper-skill boundaries, confirmed native role and compiled fallback status, and reported no silent fallback.

This certifies the toolkit for Level 2: one controlled real-project pilot. It does not certify broad rollout, automatic project sync, external skill activation, plugin duplication, global config changes, or product repository changes.

## Evidence Summary

| Check | Status | Evidence Boundary |
| --- | --- | --- |
| Exact toolkit commit | Verified in fresh CLI session | `HEAD` and `origin/main` both resolved to `ffd7ef7504703a2e282208247c1a84233ef0b543` |
| Current repo state | Verified in fresh CLI session | `git status --short --branch` showed `## main...origin/main` |
| Fresh CLI session started | Verified | `codex exec --ephemeral -c 'windows.sandbox="unelevated"' --sandbox workspace-write` completed and returned a smoke-test report |
| `riss-governance` visibility | Verified in fresh CLI session | Fresh CLI reported `riss-governance` visible and usable as a skill |
| `riss-agent-governance` helper skill | Planned/unimplemented | Registry marks it documented/draft/planned with no active `skillPath`; no active skill path was assumed |
| `riss-skill-governance` helper skill | Planned/unimplemented | Registry marks it documented/draft/planned with no active `skillPath`; no active skill path was assumed |
| 12 native core agent roles | Visible in fresh CLI session | Fresh CLI reported the 12 core roles visible in the available role surface |
| 12 compiled fallback files | Verified in fresh CLI session | All expected `compiled-agents/*.compiled.md` files were present |
| Native custom-agent status | Verified in fresh CLI session | Native roles were visible; compiled fallback files were present, but fallback execution was not exercised |
| Superpowers | Visible in fresh CLI session | Superpowers skill and plugin were visible; Superpowers remains external |
| GSD | Visible in fresh CLI session | GSD skills were visible as local support capabilities |
| GitHub/gh | Verified in fresh CLI session | GitHub plugin was visible and `gh version 2.89.0` was available |
| Browser/Playwright | Visible in fresh CLI session | Browser plugin and Playwright skill were visible; no browser target was exercised because none was required |
| Supabase | Visible with environment caveat | Supabase plugin and skills were visible; Supabase MCP reported missing `SUPABASE_ACCESS_TOKEN`, so live project access was not claimed |
| CodeRabbit | Visible in fresh CLI session | CodeRabbit plugin and review skill were visible; live PR behavior is still verified per PR |
| JSON validation | Verified in fresh CLI session | 11 repository JSON files parsed successfully; 0 invalid |
| Unsafe artifacts | Verified by follow-up validation | Repository scan excluding `.git` found no `.env`, `.env.*`, `node_modules`, `.cache`, `dist`, `build`, `temp`, `scratch`, `logs`, `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or `npm-shrinkwrap.json` artifacts |
| No silent fallback | Verified in fresh CLI session | Helper skills were reported as planned/unavailable, native roles were visible, compiled fallbacks were present, and no fallback was hidden |

## Initial Blocking Gap

The initial fresh CLI session could not run local shell commands. Diagnosis showed:

- WindowsApps PowerShell path failed under the elevated Windows sandbox: `CreateProcessAsUserW failed: 5`.
- Classic Windows PowerShell could run through `codex sandbox windows`.
- `codex exec --ephemeral --ignore-user-config --sandbox workspace-write` could run local checks, but that path ignored user config and therefore was not sufficient as the final certification path.
- A temporary per-command override with `windows.sandbox="unelevated"` allowed the fresh session to run the required local checks without changing global config.

The passing run resolves the Phase 10I blocking gap for Level 2 readiness. The elevated Windows sandbox and WindowsApps PowerShell compatibility issue remains an environment caveat, not a toolkit file blocker. The first pilot should use the same verified temporary unelevated override or another fresh-session shell path that proves the required local checks before any product repository write.

## Recommendation

The toolkit may proceed to Phase 10J: first pilot repo dry-run sync plan.

Phase 10J should remain planning-only until a specific pilot repository and exact dry-run scope are approved. The first pilot must use a feature branch, version pinning, dry-run-first project sync, explicit do-not-touch boundaries, PR review, and no broad rollout claim.
