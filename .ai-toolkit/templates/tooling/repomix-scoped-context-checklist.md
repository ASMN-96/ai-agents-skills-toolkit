# Repomix Scoped Context Checklist

Owner must review before applying. Codex must not claim output unless Repomix actually ran in an approved target context and produced current output. Package-manager changes require separate approval.

## Allowed Only When

- Repomix is already project-owned through config/dependency/script, or the owner explicitly approves install/execution.
- The requested pack is scoped to selected files, directories, or a changed-file neighborhood.
- Secrets, `.env` values, private overlays, package caches, generated build output, and user-local paths are excluded.

## Forbidden By Default

- No automatic whole-repo dumps.
- No package edits, CI wiring, MCP setup, global config changes, or product-repo scanning.
- No token-count, pack, or context-size claim without observed command output.

## Reporting

- Report Repomix as `not invoked` unless it actually ran.
- Separate project-map/manual context selection from Repomix-generated output.
- Include the approved scope and observed output summary for any claimed pack or token count.
