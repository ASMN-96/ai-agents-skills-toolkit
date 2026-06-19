# v0.2.4 Agent And Risk Hardening

> Current controlled release evidence. `v0.2.4` supersedes `v0.2.3` for current agent/compiled parity, source-risk metadata, project-map safety, template routing, and embedded package validation claims.

## Benefit

v0.2.4 turns the toolkit from a refreshed source package into a harder governance artifact for real project use. The main benefit is trust: approved agents can no longer quietly compile from weak source files, generated project maps no longer absorb nested worktree checkouts, baseline tool risk metadata records evidence and unknowns instead of uniform unknown status, and the embedded `.ai-toolkit` package mirrors root assets more explicitly.

## How It Differs From v0.2.3

v0.2.3 focused on source freshness: it removed passive source holds, refreshed non-Vercel source records, and kept unsafe upstream behavior out of runtime paths.

v0.2.4 focuses on operational trust after that refresh:

- completes `frontend-agent`, `qa-test-agent`, and `security-agent` source definitions;
- promotes compiled agents with `compiled_status: approved` only when source quality and parity pass;
- validates compiled/source parity for agent path, commit shape, profile refs, method refs, source content, and `.ai-toolkit` mirrors;
- excludes `.worktrees`, `.worktree`, `worktrees`, and `.git-worktrees` from project-context maps and rejects injected output paths;
- records metadata-only enterprise-risk evidence for baseline tools, including current source identity, inspected areas, uninspected areas, rationale, and next review due date;
- aligns GSD Core and Repomix as governed metadata-only tools without install, execution, CI, MCP, global config, hook, or product-repo activation;
- adds product-neutral PR, commit, design-doc, and incident-report templates and routes them from the appropriate agents/skills;
- expands security-hardening guidance and measurable code-quality/UIUX evidence rules;
- bumps the embedded package and generated artifacts to `0.2.4`.

## Guardrails Preserved

- No package or lockfile changes.
- No CI, MCP, global Codex config, deployment config, or product-repo mutation.
- No external tool install or activation from registry presence.
- No raw upstream copying.
- No claim that approved compiled agents are runtime spawn proof.
- No change to `actualSpawnObserved` or `actualSpawnProof` without task-specific runtime evidence.

## Validation Scope

The release gate should include:

- source freshness after latest-main rebase;
- compiled agent regeneration;
- embedded `.ai-toolkit` rebuild;
- toolkit, project-tooling, runtime, version, public package, leak scan, eval, source-freshness, and full Node test validation;
- final changed-file grouping and explicit no-package/lockfile/CI/MCP/global/product-repo-change confirmation.

## Residual Risk

Baseline tool enterprise-risk entries are evidence-backed metadata only. License legal approval, package release contents, telemetry behavior, execution network behavior, project-specific permissions, and CI behavior remain unapproved unless a later owner-reviewed tool adoption PR records that evidence.

