# GSD Core Source Record

- Source name: GSD Core
- Repository: open-gsd/gsd-core
- Source URL: https://github.com/open-gsd/gsd-core
- Homepage: https://github.com/open-gsd/gsd-core
- Last reviewed commit: 7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034
- Last reviewed date: 2026-06-20
- Review level: first-class governed tool metadata
- Classification: active-if-detected or owner-approved-install candidate for phase/state governance
- License status: MIT signal at reviewed commit; not legal approval to copy raw upstream content
- Maintenance signal: active public repository at reviewed commit; default branch is next
- neverAutoImport: true

## Relocation Evidence

The previous GSD repository, gsd-build/get-shit-done, now points users to open-gsd/gsd-core as the active home. The toolkit tracks the new canonical repository only.

## Toolkit Value

GSD Core is useful as phase/state planning and execution discipline for serious multi-step governed work when already available in the operator or project environment, or when the owner approves installation.

## Active-If-Detected Boundary

- Detect project-owned or operator-owned GSD before recommending invocation.
- Report selected, invoked, blocked-unavailable, or manual fallback status honestly.
- Count workflow output as evidence only when observed in the current task.

## Forbidden By Default

- no vendoring or raw source copying;
- no install or activation from registry presence;
- no package edits, CI wiring, MCP setup, hooks, global config, or product-repo mutation;
- no GSD invocation claim without observed workflow output.
