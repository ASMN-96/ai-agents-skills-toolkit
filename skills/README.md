# Skills

This directory is reserved for reviewed skill metadata and toolkit-managed skill notes.

Raw external skills must not become active automatically. Treat all skills as supply-chain artifacts requiring source evaluation, approval, and intentional activation or compilation.

No external skills have been installed or activated by this toolkit.

## Toolkit-Owned Skills

- `riss-governance`: RISS-specific governance/router guidance for source-of-truth checks, narrow agent/tool routing, dependency-chain safety, PR/CI/CodeRabbit discipline, and validation-before-completion.
- `vd-premium-uiux`: Direct UI/UX execution skill for premium frontend visual quality, dashboard UX, responsive layouts, accessibility checks, visual QA, browser/screenshot validation, and real-estate SaaS interface polish.

`riss-governance` remains the routing/safety and source-of-truth governance layer.
`vd-premium-uiux` executes the UI/UX workflow once governance routes a qualifying frontend quality task.

## Internal Helper Skills

- `riss-agent-governance`: internal helper for agent routing, native visibility, compiled fallback status, scorecards, and handoff rules.
- `riss-skill-governance`: internal helper for skill routing, trigger quality, conflicts, and read-only missing-capability discovery.

These helpers are not normal user-facing entrypoints. Direct user calls to either helper must be redirected back through `riss-governance`.

Registry entries may mark these helpers as documented, available, and approved, but not active or native-visible. Runtime activation still requires fresh-session verification.

## External Governance Tools

- GSD is an external core governance tool for serious multi-step work, audits, migrations, backend work, security/SRE audits, and release programs. It tracks phase/state/roadmap/release gates and must not be vendored into this toolkit.
- Superpowers remains the external core execution-discipline plugin for systematic debugging, TDD, code review, and verification-before-completion.
- Use only the minimum required tools for a task. Do not activate every plugin, tool, agent, or profile by default.

## Phase 10 Registry Boundary

Skill registry entries are metadata only. Registry presence does not install, activate, approve, or execute a skill. Missing-skill discovery is read-only by default and requires approval before install, activation, copying, syncing, or extraction outside an approved implementation scope.
