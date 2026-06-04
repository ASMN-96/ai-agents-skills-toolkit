# code-review-graph Read-Only Source Intelligence Checklist

Owner must review before applying. Codex must not claim output unless code-review-graph actually ran in an approved target context and produced current output. Package-manager changes require separate approval.

## Current v0.2 Boundary

- code-review-graph is active-read-only source intelligence.
- Registry/profile presence does not install, activate, index, configure MCP, configure global settings, or scan product repositories.
- Use normalized context-selection methods first: changed-file neighborhood, compact context pack, context graph token budget, and stale context detection.

## Approval Required

- Any install, package/project change, indexing, MCP setup, global config, background process, product repo scanning, private overlay scanning, or generated graph claim requires explicit owner approval.

## Evidence

- Report manual/static context selection separately from tool-generated graph output.
- Do not claim graph output when only metadata, source records, or this checklist were used.
