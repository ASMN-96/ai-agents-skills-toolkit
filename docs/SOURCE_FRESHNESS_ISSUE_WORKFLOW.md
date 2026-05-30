# Source Freshness Issue Workflow

Status: dry-run design implemented

The source freshness monitor can generate local issue drafts for actionable freshness findings. This workflow exists to make re-review handoff consistent; it does not create GitHub issues in this sprint.

## Command

```bash
node scripts/check-source-freshness.mjs \
  --mock \
  --create-issues \
  --issues-output docs/SOURCE_FRESHNESS_ISSUES_DRY_RUN.md
```

Live freshness mode may also render issue drafts, but the output is still local and dry-run only:

```bash
node scripts/check-source-freshness.mjs \
  --create-issues \
  --issues-output docs/SOURCE_FRESHNESS_ISSUES_DRY_RUN.md
```

## What The Draft Contains

Each actionable source receives:

- a deterministic dedupe key using source id, status, and commit signal,
- proposed labels such as `source-freshness`, `review-required`, and `no-import-no-activation`,
- source identity and source-record path,
- reviewed and latest commit/date signals,
- affected methods from `sourceRef` frontmatter,
- required review checklist,
- explicit forbidden actions.

## Boundaries

`--create-issues` is intentionally not a live issue creator. It must not:

- call GitHub issue APIs or `gh issue create`,
- create pull requests,
- import, clone, or copy upstream source files,
- install or activate skills, plugins, tools, MCP servers, or dependencies,
- update source records,
- extract or rewrite methods,
- change CI, package files, global Codex config, or product repositories.

Issue drafts are review-routing artifacts only. A human or separately approved automation may later decide whether a live issue should be opened.

## Future Live Creation Requirements

Before any live `--create-issues` behavior is approved, a separate PR must define:

- GitHub authentication and permission boundaries,
- repository owner approval,
- dedupe lookup strategy against existing open issues,
- label creation policy,
- rate-limit and failure handling,
- dry-run default preservation,
- no-import/no-activation language in every issue,
- audit log and rollback behavior.
