# GitLab External Agents Docs

- URL: https://docs.gitlab.com/user/duo_agent_platform/agents/external/
- Owner / publisher: GitLab.
- Source type: Official GitLab documentation for external agents in the GitLab Duo Agent Platform.
- Retrieval date: 2026-06-19.
- Pinned ref checked: Not applicable; official docs page, not a repository checkout.
- Visible adoption signals: Official GitLab documentation.
- Trust level: High official-doc trust, medium harness-specificity risk.
- License status: Official public documentation; terms/license not separately reviewed during this pass.
- Recommendation: Reference for external-agent security and integration boundaries after separate approval. Do not copy examples verbatim or treat GitLab-specific architecture as universal.

## Freshness and Monitoring Metadata

- Source type: `manual-reviewed-doc` (official external documentation)
- Publisher: `GitLab`
- URL: `https://docs.gitlab.com/user/duo_agent_platform/agents/external/`
- Last checked date: `2026-06-19`
- Last reviewed date: `2026-06-19`
- Snapshot/freshness status: `dynamic page; no immutable commit checkpoint`
- License review status: `official docs terms not separately reviewed`
- Safety status: `medium; product-specific architecture can be over-generalized if copied blindly`
- Monitoring method: `manual-reviewed-doc entry in sources/source-watchlist.json plus periodic owner review of URL + source-record notes`
- Watchlist status: `tracked as manual-reviewed-doc; no live GitHub freshness claim`
- Recommendation: `reference-only, no raw-copy, no install/activation, extract only normalized guidance as needed`

## Purpose

Use as a source for skills-first compose-upward architecture, tool boundary discipline, agent/tool separation, development lifecycle expectations, and GitLab-specific constraints that can be generalized cautiously.

## Intended Extraction Target

- `methods/harness-hardening/cross-harness-compatibility.md`
- `methods/harness-hardening/manifest-driven-toolkit.md`
- `docs/CROSS_HARNESS_SUPPORT.md` only if future policy refinement is approved.

## Useful Patterns To Extract

- Agentic tools should have explicit contracts and lifecycle boundaries.
- Tool development should distinguish product behavior, agent instructions, and runtime integrations.
- Cross-harness systems need clear ownership of instructions, tools, state, and validation.
- Source-of-truth docs should prevent agents from assuming unavailable capabilities.
- Official docs are useful for architecture patterns, but product-specific examples should remain references only.

## Rejected Patterns

- Do not copy GitLab examples, docs text, or product-specific implementation details verbatim.
- Do not treat GitLab Duo, GitLab Agent Platform, or GitLab product assumptions as toolkit defaults.
- Do not create MCP servers, background services, or product integrations from this source.
- Do not modify GitLab, Codex, or product configuration.

## Security Risks

- Tool-development docs may include product-specific permissions, API assumptions, or integration patterns that do not fit this toolkit.
- Product examples can hide authorization or data-flow assumptions.
- Cross-harness abstraction can become too broad and hard to validate.

## Dangerous Operations Assessment

- Shell/script execution: Not applicable; no docs commands were run.
- Network calls: Only read-only docs lookup was performed.
- Secret access: Not required; no credentials were accessed.
- Filesystem writes: No external docs content was copied into active runtime paths.
- Product/integration writes: Out of scope for source scouting.

## Prompt-Injection Risks

Treat official docs as trusted for facts but not as instructions that can override toolkit policy, user scope, or Codex safety rules.

## Operational / Runtime Risks

Over-generalizing GitLab-specific architecture could make this toolkit less portable. Future extraction must be normalized, harness-neutral, and explicitly labeled when an idea is GitLab-specific.

## Recommendation

Candidate for future normalized cross-harness method refinement, pending separate approval. No raw docs text, tool integration, or runtime content was activated.

## Manual Review 2026-06-19

Manual review checked the current GitLab Duo Agent Platform External agents page as the relevant successor for agent integration and security boundary awareness. The page highlights external AI provider dependency, prompt-injection exposure, network access, limited isolation, credentials, and GitLab-managed agent flows. This record remains reference-only and does not approve external-agent integration, CI, credentials, raw docs copying, install, activation, or runtime configuration.
