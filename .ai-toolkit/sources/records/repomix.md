# Repomix Source Record

- Source name: Repomix
- Repository: yamadashy/repomix
- Source URL: https://github.com/yamadashy/repomix
- Homepage: https://repomix.com
- Last reviewed commit: bb4ac4763faeb7fc3d31438f072a6946b5b290b9
- Last reviewed date: 2026-06-19
- Review level: optional-tool posture reference
- Classification: active-if-detected or owner-approved-install candidate for scoped context packing/token counts
- License status: MIT signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; not runtime-approved by toolkit metadata
- neverAutoImport: true

## Toolkit Value

Repomix is useful only as optional practical support for scoped context packs and token counts when the project already owns it or the owner explicitly approves execution. It is not a default dependency and not the primary design model.

## Active-If-Detected Boundary

- Detect project-owned Repomix config or dependency before recommending use.
- Use only scoped packs tied to selected files, directories, or task neighborhoods.
- Use token counts as measurement evidence only when actual output is observed.

## Forbidden By Default

- no install or activation from registry presence;
- no automatic whole-repo dumps;
- no package edits, CI wiring, MCP setup, global config, or product-repo scanning;
- no secrets, .env values, private overlays, generated build output, package caches, or user-local paths;
- no Repomix output claims without approved observed command output.
