# Code Review Graph Pilot Checklist

Owner must review before applying. Codex must not claim output unless a scoped approved pilot tool actually ran and produced current output. Package-manager changes require separate approval.

## Pilot Boundaries

- code-review-graph is pilot-only and read-only by default.
- Do not configure MCP.
- Do not change global config.
- Do not index product repos by default.
- Do not scan private overlays, secrets, credentials, or unrelated folders.
- Do not claim graph output from metadata or source records.

## Approval Record

- target:
- scope:
- allowed files:
- forbidden files:
- output location:
- cleanup:
- rollback:
