# Level 3 Mock Sync Rehearsal

Status: passed.

Date: 2026-05-30

This report records an internal fixture rehearsal of the Level 3 project-sync workflow. It proves the operator path is repeatable without changing a real product repository. It is not a Level 4 pilot, enterprise rollout approval, public release approval, runtime activation, or external tool approval.

## Fixture

- Target type: ignored local Git fixture with a local bare upstream.
- Target branch: `level3-rehearsal`.
- Toolkit commit under test: `0a9f1b6906d3a9b3e2f7be84fc25d03ad7799e88`.
- Config path mode: `-ConfigPath`.
- Selected agents: `reviewer-agent`, `qa-test-agent`, `security-agent`.
- Selected profile: `audit-profile`.
- Selected skills: `ai-project-governance`, `pr-release-gate`.

## Commands Exercised

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath <fixture-target> `
  -ConfigPath <fixture-config>

pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath <fixture-target> `
  -ConfigPath <fixture-config> `
  -ConfirmWrite

pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath <fixture-target>
```

## Result

- Dry run: passed.
- Dry run created `.ai-toolkit/`: no.
- Confirm write: passed.
- Install validation: passed.
- Git status after confirm write: `?? .ai-toolkit/`.
- Managed file count: 9.

Managed files written in the fixture:

- `.ai-toolkit/.ai-toolkit-manifest.json`
- `.ai-toolkit/.ai-toolkit-version`
- `.ai-toolkit/.ai-toolkit.config.json`
- `.ai-toolkit/compiled-agents/qa-test-agent.compiled.md`
- `.ai-toolkit/compiled-agents/reviewer-agent.compiled.md`
- `.ai-toolkit/compiled-agents/security-agent.compiled.md`
- `.ai-toolkit/profiles/audit-profile.md`
- `.ai-toolkit/skills/ai-project-governance/SKILL.md`
- `.ai-toolkit/skills/pr-release-gate/SKILL.md`

## Operator Finding

Use a config file for repeatable Level 3 operations. A nested PowerShell invocation can parse comma-separated agent arguments ambiguously, while `-ConfigPath` preserves the selected agents, profiles, skills, branch policy, approval mode, and overwrite policy as reviewable JSON.

## Boundary

This rehearsal supports Level 3 stabilization only. It does not change the Level 4 backlog, does not count as an additional representative pilot, and does not approve public release or enterprise rollout.
