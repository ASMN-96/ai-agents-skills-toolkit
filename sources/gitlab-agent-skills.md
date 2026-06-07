# GitLab Agent Skills Docs

- URL: https://docs.gitlab.com/ee/development/ai_features/agent_skills/
- Owner / publisher: GitLab.
- Source type: Official GitLab documentation for agent skills.
- Retrieval date: 2026-05-08.
- Pinned ref checked: Not applicable; official docs page, not a repository checkout.
- Visible adoption signals: Official GitLab documentation.
- Trust level: High official-doc trust, medium harness-specificity risk.
- License status: Official public documentation; terms/license not separately reviewed during this pass.
- Recommendation: Candidate for future normalized AGENTS/SKILL style guidance after separate approval. Do not copy docs examples verbatim or adopt GitLab-specific structure as a default.

## Freshness and Monitoring Metadata

- Source type: `docs` (official external documentation)
- Publisher: `GitLab`
- URL: `https://docs.gitlab.com/ee/development/ai_features/agent_skills/`
- Last checked date: `2026-05-15`
- Last reviewed date: `2026-05-15`
- Snapshot/freshness status: `dynamic page; no immutable commit checkpoint`
- License review status: `official docs terms not separately reviewed`
- Safety status: `medium; harness-specific recommendations, docs examples could over-select on trigger behavior if copied blindly`
- Monitoring method: `manual-reviewed-doc entry in sources/source-watchlist.json plus periodic owner review of URL + source-record notes + checklist-based safety gating in the method registry`
- Watchlist status: `tracked as manual-reviewed-doc; no live GitHub freshness claim`
- Recommendation: `reference-only, no raw-copy, no install/activation, extract only normalized guidance as needed`

## Purpose

Use as a source for agent/skill/process separation, skill metadata discipline, trigger clarity, local instruction organization, and docs-first skill governance.

## Intended Extraction Target

- `methods/skill-quality/skill-registry-contract.md`
- `methods/skill-quality/trigger-description-optimization.md`
- `docs/REGISTRY_CONTRACT.md` only if future refinement is approved.

## Useful Patterns To Extract

- Skills should be discoverable by description and loaded only when relevant.
- Agent behavior should be composed from bounded skills rather than giant prompts.
- Skill instructions should separate trigger conditions, operating rules, and supporting references.
- Repository-level instruction files should be treated as source-of-truth context, not overwritten automatically.
- Skill structures should remain auditable and compatible with multiple harnesses.

## Rejected Patterns

- Do not copy GitLab docs examples, skill templates, or wording verbatim.
- Do not impose GitLab-specific skill paths or product assumptions on Codex, Claude Code, Cursor, OpenCode, or Gemini.
- Do not create large helper skills or new active skills from this source in Phase 10D.
- Do not install, activate, or configure any GitLab integration.

## Security Risks

- Skill examples may include product-specific permissions or tool assumptions.
- Trigger text can cause over-selection if copied without local evals.
- Cross-harness compatibility can fail if structure is adopted without runtime visibility checks.

## Dangerous Operations Assessment

- Shell/script execution: Not applicable; no docs commands were run.
- Network calls: Only read-only docs lookup was performed.
- Secret access: Not required; no credentials were accessed.
- Filesystem writes: No external docs content was copied into active runtime paths.
- Product/integration writes: Out of scope for source scouting.

## Prompt-Injection Risks

Treat docs examples as reference material only. They must not override toolkit policy, local AGENTS.md, user scope, or runtime validation requirements.

## Operational / Runtime Risks

Blindly adopting a single vendor's skill structure could reduce cross-harness portability. Future extraction must preserve the toolkit's registry-first and source-record-first architecture.

## Recommendation

Candidate for future normalized skill-quality and registry-contract refinement, pending separate approval. No raw docs text, external integration, or runtime content was activated.
