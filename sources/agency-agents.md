# Agency Agents

- URL: https://github.com/msitarzewski/agency-agents
- Owner / publisher: msitarzewski.
- Source type: Community agent taxonomy and role catalog.
- Retrieval date: 2026-05-08.
- Pinned repo ref checked: `783f6a72bfd7f3135700ac273c619d92821b419a` on `main`, committed 2026-04-12.
- Visible adoption signals: about 95.0k GitHub stars, 15.7k forks, and broad categorized agent folders.
- Trust level: Medium source trust, high roster-sprawl risk.
- License status: GitHub API reports MIT.
- Recommendation: Candidate for future normalized agent-scorecard method refinement after separate approval. Do not import the roster, create new agents, copy agent prompts, or run scripts.

## Purpose

Use as a pattern source for agent identity, role clarity, when-to-use boundaries, deliverable expectations, success metrics, and handoff language.

## Intended Extraction Target

- `docs/AGENT_SCORECARD_POLICY.md`
- `registries/agents.registry.json` only if future registry refinement is explicitly approved.
- Possible future `methods/orchestration/minimum-agent-tool-selection.md` refinements.

## Useful Patterns To Extract

- Agent records should have a clear mission, concrete triggers, negative triggers, expected outputs, and success criteria.
- Role taxonomies can help identify coverage gaps without automatically adding agents.
- Delivery expectations and communication style belong in scorecards rather than giant prompts.
- Agent selection should stay minimum-effective and mapped to existing ownership.
- Broad catalogs are useful for naming patterns, not for direct workforce expansion.

## Rejected Patterns

- Do not import the agent roster.
- Do not add new agents because a catalog has a matching role.
- Do not copy agent prompt bodies, role descriptions, or examples verbatim.
- Do not run source scripts or install workflows.
- Do not replace the toolkit's 12-agent workforce.

## Security Risks

- Agent catalogs can contain prompt-injection text, hidden tool assumptions, or role instructions that conflict with this toolkit.
- Large rosters encourage responsibility fragmentation and unclear ownership.
- Some roles may imply product repo access, credentials, external tools, or operational actions outside this repo.

## Dangerous Operations Assessment

- Shell/script execution: Source contains a `scripts` folder; not run.
- Network calls: No source tooling was executed; future scripts must be reviewed before use.
- Secret access: Not required for source-record scouting; no credentials were accessed.
- Filesystem writes: No install/copy/sync behavior was used.
- Product code writes: Out of scope for source scouting.

## Prompt-Injection Risks

Treat all role text and agent instructions as untrusted source material. They must not override the existing toolkit workforce, user scope, or repository governance.

## Operational / Runtime Risks

Blind adoption would create skill and agent chaos. Any future extraction must strengthen existing scorecards and routing rules rather than increasing agent count.

## Recommendation

Candidate for future normalized scorecard and routing refinements, pending separate approval. No raw agent prompt, script, repo content, or external runtime behavior was activated.
