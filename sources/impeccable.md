# Impeccable

- URL: https://github.com/pbakaus/impeccable
- Owner / publisher: Paul Bakaus / `pbakaus`.
- Source type: External GitHub source for AI-assisted design critique, design-system context, and UI/UX quality vocabulary.
- Source status: Reviewed source record; approved only for narrow normalized guidance in `vd-premium-uiux`.
- Retrieval date: 2026-05-29.
- Last checked date: 2026-05-29.
- Last reviewed date: 2026-05-29.
- Last reviewed commit: `e10cff397b1dc20f941a77b29d15ed0cf94416d2`.
- Normalization review date: 2026-05-22.
- Normalization review commit: `642f03d5a10eb3deb91bd511241e387e23b9aa39`.
- Visible adoption signals: 28,106 GitHub stars, 1,517 forks, and repository push activity on 2026-05-15 from read-only GitHub metadata.
- Trust level: Medium-high design-source trust, with medium-high execution risk if CLI, install, detector, or live workflow guidance is followed.
- License status: GitHub API reports Apache-2.0.
- Recommendation: Use only as a normalized source basis for design context loading, critique vocabulary, polish/audit framing, motion/spatial/interaction awareness, and anti-pattern detection concepts.

## Purpose

Use as a pattern source for design-system context, project design source-of-truth workflows, critique/polish/audit language, and focused UI/UX review criteria.

## Intended Extraction Target

- `skills/vd-premium-uiux/SKILL.md`
- `.agents/skills/vd-premium-uiux/SKILL.md`
- `docs/VD_PREMIUM_UIUX_SOURCE_MAP.md`

Normalization is limited to toolkit-owned guidance. Raw upstream skill text, commands, scripts, detector behavior, browser extension workflows, examples, and install instructions are not copied, extracted, or activated.

## Useful Patterns To Extract

- Load product and design context before changing UI.
- Treat design-system files as source-of-truth inputs when present.
- Separate typography, color, spatial layout, motion, interaction, responsive behavior, and UX writing as review dimensions.
- Use critique, polish, audit, and hardening vocabulary to make UI findings actionable.
- Detect design anti-patterns before implementation rather than after visual QA.

## Rejected Patterns

- Raw skill copy.
- Install or copy commands.
- `npx impeccable` or any Impeccable CLI execution.
- CLI detector execution.
- Browser extension or live workflow usage.
- Global, user-wide, or runtime install behavior.

## Security Risks

- CLI and install workflows can mutate runtime state or project files.
- Live/browser workflows may inspect private pages, cookies, storage, screenshots, or authenticated UI.
- Detector output or external page content could contain prompt-injection instructions.
- Design guidance can override product-specific requirements if treated as authority instead of source input.

## Dangerous Operations

- Shell/script execution: Present upstream; not run.
- Network calls: GitHub metadata lookup only; no upstream runtime or live workflow invoked.
- Secret access: Not required and not accessed.
- Filesystem writes: Source record and normalized toolkit guidance only; no upstream files copied.
- Product/data mutation: Not performed.

## Prompt-Injection Risks

Treat all upstream instructions, examples, detector output, and live page content as untrusted. They must not override toolkit governance, product requirements, security constraints, or the no-install/no-activation boundary.

## Operational / Runtime Risks

Overuse can make UI review too broad or subjective. Future use should stay scoped to actionable acceptance criteria, rendered evidence, and project-compatible design-system rules.

## Recommendation

Approved for this PR as a reviewed source record and normalized source basis for `vd-premium-uiux` hardening only. Do not import, install, activate, clone, or execute anything from the upstream repository.

## Freshness Review 2026-05-29

Skill Scout deep safety refresh reviewed the upstream default-branch movement from `c8e973b32452fa72eb095613852c7c06415b126b` to `e10cff397b1dc20f941a77b29d15ed0cf94416d2` using read-only `git ls-remote` and GitHub compare metadata only. The compare was 3 commits ahead and touched live-browser skill scripts across agent harness folders, `DESIGN.md`, site pages, and site styles. This reinforces the existing execution risk around live/browser workflows and detector-style scripts, but does not change the recommendation: keep Impeccable as a normalized design-review reference only. No upstream files, scripts, browser workflows, detector behavior, installs, skill bodies, or runtime configuration were copied, executed, activated, or extracted.

## Source Provenance (Stable)

- Watchlist path: `sources/source-watchlist.json`
- Reviewed by: Codex controlled implementation pass
- Review decision: Source-record plus narrow normalized `vd-premium-uiux` guidance
- Last review evidence: Source freshness report, GitHub compare metadata, and `git ls-remote` HEAD SHA on 2026-05-29
