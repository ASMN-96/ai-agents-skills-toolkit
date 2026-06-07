# Optional Pre-Commit Template

This is documentation only. It is not installed, activated, or wired into Git hooks by this repository.

Suggested local checks before committing toolkit changes:

```sh
node scripts/validate-toolkit.mjs
node scripts/ai-toolkit/run-toolkit-evals.mjs
git diff --check
```

Use only after confirming the checks match the current task scope. Do not install hook managers, edit `.git/hooks`, or change CI from this template without separate owner approval.
