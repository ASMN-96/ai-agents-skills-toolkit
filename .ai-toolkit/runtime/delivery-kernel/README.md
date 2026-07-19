# Self-Contained Delivery Kernel

This package contains the Node.js delivery-kernel runner, its complete local module closure, canonical registries, runtime resource evidence, and the committed starter request. It has no runtime dependencies beyond Node.js 22 and does not need network access to plan a delivery run.

From the target repository root, copy the package's starter, then replace its all-zero
`repository.expectedCommit` placeholder with the target repository's current full 40-character Git SHA. The committed template cannot self-pin because changing its own commit field creates a new commit. Run the package against that pinned copy:

```text
node .ai-toolkit/runtime/delivery-kernel/scripts/ai-toolkit/run-delivery-kernel.mjs plan --input path/to/delivery-kernel.request.pinned.json
```

The request's repository root is resolved from the invocation working directory. When using the package against another repository, invoke the runner by absolute path and update the copied starter's repository root and expected commit. Never run the all-zero placeholder directly. Planning remains read-only and stdout-only unless the request and CLI explicitly authorize a scoped output file. This package does not install or activate tools, change global Codex or Claude configuration, or claim runtime evidence from file presence.
