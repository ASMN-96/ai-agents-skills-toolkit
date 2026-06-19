# OpenAI Prompt Caching Source Record

- Source name: OpenAI prompt caching
- Source URL: https://developers.openai.com/api/docs/guides/prompt-caching
- Source type: official documentation
- Last reviewed date: 2026-06-19
- Review level: prompt-layout reference
- Classification: active-method source for stable-context ordering
- License status: official documentation reference only; no raw docs copied
- Maintenance signal: live OpenAI platform documentation reviewed for prompt-caching layout implications
- neverAutoImport: true

## Toolkit Value

Prompt caching guidance supports the preflight layout rule: keep stable project/toolkit context first and task-specific volatile context last. The toolkit uses this only as prompt-layout discipline, not as a guarantee of lower cost for every run.

## Adopted Guidance

- Keep static toolkit and project context early and stable.
- Put the generated project map summary before volatile task excerpts.
- Avoid unnecessary churn in stable preflight field ordering.
- Measure token/context reduction with fixtures instead of claiming savings upfront.

## Boundaries

- Do not claim prompt caching happened unless the runtime or API output proves it.
- Do not expose secrets, private paths, `.env` values, or raw file dumps to improve cache hit rates.
- Do not alter model, API, billing, or runtime settings from this source record.

## Used By

- `methods/orchestration/project-context-preflight.md`
- `methods/orchestration/project-map-staleness-check.md`
- `methods/orchestration/changed-file-neighborhood-selection.md`
- `methods/orchestration/compact-agent-context-pack.md`

## Manual Review 2026-06-19

Manual review checked the current OpenAI prompt caching page. Stable-context ordering remains useful as prompt-layout guidance only. This record does not approve cache-hit claims, billing/runtime setting changes, secret exposure, or raw docs copying.
