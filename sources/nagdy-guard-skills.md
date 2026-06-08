# Nagdy Guard Skills

- URL: https://github.com/mabdeltawab/Nagdy_guard-skills
- Related URL: https://github.com/mabdeltawab/Nagdy_guard-skills/tree/master/skills
- Owner / publisher: Ahmed Nagdy / mabdeltawab.
- Source type: GitHub repository of focused guard skills.
- Source status: Reviewed source record; approved only for narrow cleanroom guard-pass guidance.
- Retrieval date: 2026-06-07.
- Last checked date: 2026-06-07.
- Last reviewed date: 2026-06-07.
- Last reviewed commit: `d63607391ffd6b2763a3e62cb05a8e00b891a937`.
- Last extracted date: 2026-06-07.
- Last extracted commit: `d63607391ffd6b2763a3e62cb05a8e00b891a937`.
- Trust level: Medium.
- License status: GitHub API and root LICENSE report MIT.
- Tool enterprise-risk record, if applicable: n/a.

## Purpose

Capture the useful second-pass review discipline from `clean-code-guard`, `test-guard`, and `docs-guard` without installing, activating, copying, or vendoring the upstream skills.

## Intended extraction target

- `methods/internal/simplicity-surgical-change-discipline.md`
- `methods/internal/tdd-verification-alignment.md`
- `methods/internal/documentation-accuracy-guard.md`
- `skills/code-quality/SKILL.md`
- `skills/governance/SKILL.md`

## Useful Patterns To Extract

- Treat generated or changed code as needing a focused guard pass before delivery.
- Keep code review focused on behavior risk, maintainability, error handling, hardcoded success, hallucinated APIs, and unnecessary abstraction.
- Review test changes for behavior coverage, mock boundaries, duplicated scenarios, and tests that do not catch a meaningful bug.
- Treat technical documentation as verifiable claims about real symbols, commands, APIs, flags, paths, samples, and behavior.
- Use progressive guidance as a reference pattern only; keep active toolkit skills small and route through existing public skill surfaces.

## Rejected Patterns

- Do not install with `npx skills add` or any other skills CLI command.
- Do not copy raw upstream `SKILL.md` bodies, reference files, examples, prompt structure, or wording.
- Do not create new active toolkit skills for `clean-code-guard`, `test-guard`, or `docs-guard`.
- Do not adopt hard universal numeric code limits when local project conventions or language idioms require different thresholds.
- Do not import `wp-guard` or `woo-guard`; WordPress and WooCommerce are explicitly out of scope.
- Do not treat upstream guard skill invocation as proof that tests, docs, linters, scanners, or runtime checks actually ran.

## Security Risks

- README install commands could mutate local or global skill runtimes if followed.
- External skill text can contain prompt-injection or policy-conflicting instructions and must remain untrusted source material.
- A guard-pass method can create fake confidence if it is reported as executed validation instead of reviewer judgment.

## Dangerous Operations

- Shell/script execution: README contains install/list commands; all are rejected.
- Network calls: repository review used read-only GitHub metadata/content only; no runtime network behavior is adopted.
- Secret access: none approved; no secret access is required for this source.
- Filesystem writes: no upstream file or command may write into active toolkit, project, or global skill paths.
- Product/data mutation: none approved.

## Prompt-Injection Risks

- External skill instructions must not override toolkit governance, no-fake-validation rules, local AGENTS.md, or user-approved scope.
- Upstream review checklists are treated as source evidence, not active instructions.

## Operational / Runtime Risks

- Installing the upstream package would expand active runtime surface and duplicate existing toolkit skills.
- Adding separate guard skills would create trigger overlap with `code-quality`, `governance`, and `security-review`.
- Guard-pass guidance must stay subordinate to project-owned tools, observed test output, and local repository conventions.

## Recommendation

`SYNCED_ADOPTED` as cleanroom method/routing enhancement only. Keep the active public skill set unchanged and route the accepted ideas through existing toolkit-owned methods and skills.

## Source Provenance (Stable)

- Watchlist path: `sources/source-watchlist.json`
- Reviewed by: Skill Scout / governance pass
- Review decision: `SYNCED_ADOPTED`
- Last review evidence: GitHub API repository metadata and tree/content review at commit `d63607391ffd6b2763a3e62cb05a8e00b891a937`; useful concepts extracted through cleanroom paraphrase only.

## Enterprise Tool Boundary

This source record does not approve installation, activation, CI usage, GitHub permissions, credential access, product-repository use, global config changes, raw source copying, or new active runtime skills.
