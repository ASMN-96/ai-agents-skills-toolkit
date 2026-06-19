# OpenAI Codex Behavior Boundaries Source Record

- Source name: OpenAI Codex behavior boundaries
- Source URL: https://developers.openai.com/codex/guides/agents-md
- Related official docs:
  - https://developers.openai.com/codex/skills/
  - https://developers.openai.com/codex/subagents
- Source type: official documentation
- Last reviewed date: 2026-06-19
- Review level: runtime-boundary reference
- Classification: active-method source for Codex/toolkit responsibility boundaries
- License status: official documentation reference only; no raw docs copied
- Maintenance signal: live OpenAI Codex documentation reviewed for AGENTS.md, skills, and subagent boundaries
- neverAutoImport: true

## Toolkit Value

Official Codex documentation anchors the boundary that this toolkit provides context, routing discipline, and safety rules while Codex remains the execution runtime. Project Context Preflight must not duplicate Codex runtime behavior, create default subagents, or install external tools.

## Adopted Guidance

- Treat AGENTS.md and skills as instruction/context surfaces, not proof of tool execution.
- Keep subagent behavior explicit and bounded; do not create loop agents for this feature.
- Preserve the distinction between selected guidance, installed tools, and observed runtime output.

## Boundaries

- Do not modify global Codex configuration from this toolkit feature.
- Do not create a second Codex runtime or automatic subagent/loop-agent workflow.
- Do not claim runtime activation, tool execution, or validation pass from file presence.
- Do not copy official documentation bodies into active toolkit methods beyond concise paraphrased guidance.

## Used By

- `methods/orchestration/project-context-preflight.md`
- `methods/orchestration/project-map-staleness-check.md`
- `methods/orchestration/changed-file-neighborhood-selection.md`
- `methods/orchestration/compact-agent-context-pack.md`

## Manual Review 2026-06-19

Manual review checked the current OpenAI Codex AGENTS.md page. The record remains a runtime-boundary reference for instruction/context surfaces, not proof of tool execution, global configuration, or activation.
