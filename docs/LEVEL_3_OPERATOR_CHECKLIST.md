# Level 3 Operator Checklist

Status: active for Level 3 internal controlled use.

This checklist makes project sync repeatable for comparable internal projects. It does not approve Level 4 enterprise rollout, Level 5 public release, runtime adapter activation, MCP setup, global Codex configuration changes, external tool activation, or product-repository writes outside approved project PRs.

## 1. Preflight

- Confirm the target project is comparable to the completed Level 3 pilot and has owner approval for a scoped toolkit sync.
- Work from a clean feature branch, not `main` or `master`.
- Confirm the target branch has an upstream and is not ahead, behind, divergent, detached, or dirty.
- Select the smallest useful asset set. Do not broad-install agents, profiles, or skills.
- Keep project context files, product code, package files, lockfiles, CI workflows, secrets, and global config out of scope.

Recommended config-file shape:

```json
{
  "selectedAgents": ["reviewer-agent", "qa-test-agent", "security-agent"],
  "selectedProfiles": ["audit-profile"],
  "selectedSkills": ["ai-project-governance", "pr-release-gate"],
  "branchPolicy": "no-direct-main",
  "approvalMode": "manual",
  "allowOverwriteProjectContext": false
}
```

Prefer `-ConfigPath` for repeatable operator runs, especially when invoking PowerShell from another shell. It avoids ambiguous array argument parsing.

## 2. Dry Run

Run the installer without `-ConfirmWrite`:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -ConfigPath C:\path\to\level3-sync.config.json
```

Approve the write scope only if the plan is limited to `.ai-toolkit/` managed files and the target Git safety line is `pass`.

Stop if the dry run would touch project-owned context, product code, package files, lockfiles, CI workflows, secrets, or global config.

## 3. Confirm Write

After owner approval, rerun with `-ConfirmWrite`:

```powershell
pwsh -NoProfile -File install/install-project.ps1 `
  -TargetPath C:\path\to\project `
  -ConfigPath C:\path\to\level3-sync.config.json `
  -ConfirmWrite
```

Expected output:

- mode is `confirm-write`;
- target Git safety passes before writing;
- managed files are written only under `.ai-toolkit/`;
- `.ai-toolkit/.ai-toolkit-version`, `.ai-toolkit/.ai-toolkit.config.json`, and `.ai-toolkit/.ai-toolkit-manifest.json` are present.

## 4. Validate

Run the project install validator:

```powershell
pwsh -NoProfile -File install/validate-project-install.ps1 -TargetPath C:\path\to\project
```

Expected result:

- validation passes;
- manifest hashes match copied files;
- no unsafe `.ai-toolkit/` artifacts are present;
- `git status --short` shows only the expected `.ai-toolkit/` changes.

## 5. PR And Closeout

- Run the target project's normal checks before PR merge.
- Open a project PR with the selected assets, toolkit commit, validation output, and known limits.
- Do not merge with pending or failing required checks.
- Do not count a held, skipped, dry-run-only, fallback, or partial run as project-sync success.
- After merge, record the result as Level 3 comparable-use evidence only. Additional pilots remain Level 4 backlog until the strict Level 4 gate passes.

## Known Limits

- Level 3 is complete for controlled internal use on comparable projects.
- Level 4 is deferred and still requires additional pilots, warning-threshold owner approval, rollback rehearsal, enterprise tool metadata review, and owner promotion approval.
- Level 5 is not started.
- This checklist does not approve public distribution, runtime expansion, external tool installs, MCP/global config changes, or broad rollout.
