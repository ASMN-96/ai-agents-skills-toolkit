# Migration To Canonical Skills

Status: canonical public runtime names active.

The public runtime now exposes one naming system:

- `governance`
- `uiux`
- `code-quality`
- `security-review`
- `pr-release-gate`

The active project agent set remains unchanged at twelve agents:

- `product-agent`
- `architect-agent`
- `reviewer-agent`
- `uiux-agent`
- `frontend-agent`
- `backend-contract-agent`
- `database-rls-agent`
- `security-agent`
- `qa-test-agent`
- `release-manager-agent`
- `skill-scout-agent`
- `sre-performance-agent`

The following old aliases and helper names were removed from active runtime and public package skill surfaces: `ai-project-governance`, `legacy-governance`, `premium-uiux-review`, `legacy-uiux-review`, `webapp-code-quality`, `legacy-code-quality`, `app-security-review`, `legacy-security-review`, `legacy-release-gate`, `legacy-agent-governance`, and `legacy-skill-governance`.

Product repositories should update toolkit sync selections to use the five canonical skills. This migration does not sync product repositories, touch global Codex files, install tools, change CI/MCP/deployment config, or claim Level 4/public/enterprise readiness.
