# Impeccable

- URL: https://github.com/pbakaus/impeccable
- Owner / publisher: Paul Bakaus / `pbakaus`.
- Source type: External GitHub source for AI-assisted design critique, design-system context, and UI/UX quality vocabulary.
- Source status: Reviewed source record; approved only for narrow normalized guidance in `uiux`.
- Retrieval date: 2026-05-29.
- Last checked date: 2026-06-06.
- Last reviewed date: 2026-06-06.
- Last reviewed commit: `6788085015400c3900cbf3a46b76f76bf489b3e3`.
- Normalization review date: 2026-05-22.
- Normalization review commit: `642f03d5a10eb3deb91bd511241e387e23b9aa39`.
- Visible adoption signals: 28,106 GitHub stars, 1,517 forks, and repository push activity on 2026-05-15 from read-only GitHub metadata.
- Trust level: Medium-high design-source trust, with medium-high execution risk if CLI, install, detector, or live workflow guidance is followed.
- License status: GitHub API reports Apache-2.0.
- Recommendation: `SYNCED_ADOPTED` for v0.2.3. Use as an active normalized source basis for design context loading, critique vocabulary, polish/audit framing, motion/spatial/interaction awareness, anti-pattern detection concepts, and UI quality evals. Do not activate the CLI, live-browser workflows, detector scripts, package metadata, or skill-bundle behavior.

## Purpose

Use as a pattern source for design-system context, project design source-of-truth workflows, critique/polish/audit language, and focused UI/UX review criteria.

## Intended Extraction Target

- `skills/uiux/SKILL.md`
- `.agents/skills/uiux/SKILL.md`
- `docs/UIUX_SOURCE_MAP.md`

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

Approved as a reviewed source record and normalized source basis for `uiux` hardening only. Do not import, install, activate, clone, or execute anything from the upstream repository.

## Freshness Review 2026-05-29

Skill Scout deep safety refresh reviewed the upstream default-branch movement from `c8e973b32452fa72eb095613852c7c06415b126b` to `e10cff397b1dc20f941a77b29d15ed0cf94416d2` using read-only `git ls-remote` and GitHub compare metadata only. The compare was 3 commits ahead and touched live-browser skill scripts across agent harness folders, `DESIGN.md`, site pages, and site styles. This reinforces the existing execution risk around live/browser workflows and detector-style scripts, but does not change the recommendation: keep Impeccable as a normalized design-review reference only. No upstream files, scripts, browser workflows, detector behavior, installs, skill bodies, or runtime configuration were copied, executed, activated, or extracted.

## Freshness Review 2026-05-30

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `e10cff397b1dc20f941a77b29d15ed0cf94416d2` to `b913668ba4d25b95c4a62278d3637837e9d2c6d9` using read-only `git ls-remote` and GitHub compare metadata only. The compare was 1 commit ahead and touched CLI skill-command code, package metadata, site skill documentation, changelog/FAQ pages, and CLI tests. Apache-2.0 license metadata remained present from the reviewed source record. The source continues to carry execution risk around CLI and live/browser workflows; the recommendation is unchanged. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, or runtime configuration changes.

## Freshness Review 2026-06-01

Skill Scout read-only follow-up reviewed the upstream default-branch movement from `b913668ba4d25b95c4a62278d3637837e9d2c6d9` to `ea3e66b9844fbbdbfdbb55b81d4ec6ec3181234b` using read-only GitHub compare metadata and `git ls-remote` only. The compare was 1 commit ahead and touched public site tutorial copy, Astro site pages, public site layout CSS, and one GitHub Copilot SVG logo asset. No upstream skill body, CLI implementation, package metadata, detector code, live/browser workflow, runtime configuration, or project-sync material changed in this reviewed drift. The change is classified `CHANGED_LOW_RISK`; the recommendation is unchanged: use Impeccable only as normalized UI/UX source intelligence. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, or runtime configuration changes.

## Freshness Review 2026-06-02

Skill Scout read-only follow-up reviewed upstream default-branch movement from `ea3e66b9844fbbdbfdbb55b81d4ec6ec3181234b` to `69b5f3af49fc15240a4dcc735f3eceb95258492f` using GitHub compare metadata, commit metadata, and `git ls-remote` only. The compare was 4 commits ahead and touched live-browser and detector scripts across multiple editor/package skill surfaces, the CLI detector, plugin skill scripts, tests, and `.gitignore`. These changes reinforce the existing execution risk around live browser workflows, detector scripts, copied skill packages, and CLI behavior. The recommendation is unchanged: keep Impeccable as normalized UI/UX source intelligence only. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, or runtime configuration changes.

## Freshness Review 2026-06-02 Follow-up

Skill Scout read-only follow-up reviewed upstream default-branch movement from `69b5f3af49fc15240a4dcc735f3eceb95258492f` to `6163ca0529eb6b30240d71b68ab55fe8051c44de` using GitHub compare metadata and `git ls-remote` only. The compare was 1 commit ahead and touched live-browser/reference/live scripts across multiple editor/package skill surfaces, added Svelte live component/adapter/core scripts, and changed tests, fixtures, package, and site surfaces. These changes reinforce live browser, detector, script, package, and external skill execution risk. The recommendation is unchanged: keep Impeccable as normalized UI/UX source intelligence only. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, or runtime configuration changes.

## Freshness Review 2026-06-03

Skill Scout read-only follow-up reviewed upstream default-branch movement from `6163ca0529eb6b30240d71b68ab55fe8051c44de` to `be83085dbd8a67dcb379129a9943c10fec4924a4` using GitHub compare metadata and `git ls-remote` only. The compare was 4 commits ahead and touched public site CSS and favicon styling files only: `site/public/favicon.svg`, `site/styles/design-system.css`, `site/styles/detector-lab.css`, `site/styles/docs-kinpaku.css`, `site/styles/docs-visuals.css`, `site/styles/home-kinpaku.css`, `site/styles/home-rebuild.css`, `site/styles/kinpaku-tokens.css`, and `site/styles/light-mode.css`. No upstream package metadata, CLI implementation, detector script, live-browser workflow, skill body, tests, runtime configuration, or project-sync material changed in this reviewed drift. The recommendation is unchanged: use Impeccable only as normalized UI/UX source intelligence. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, or runtime configuration changes.

Skill Scout read-only publication-gate follow-up reviewed upstream default-branch movement from `be83085dbd8a67dcb379129a9943c10fec4924a4` to `1d5d745823aae7019044e8b0a621af4366dae224` using GitHub compare metadata only. The compare was 5 commits ahead and touched package metadata, build/API scripts, site layout/components/pages, theme utilities, and light-mode styles. Existing CLI, detector, live-browser, package, script, and external skill execution cautions remain. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, or runtime configuration changes.

## Freshness Review 2026-06-05

Skill Scout read-only follow-up reviewed upstream default-branch movement from `1d5d745823aae7019044e8b0a621af4366dae224` to `198aa9171948af0bea6d58596ad575cb2de67af7` using `git ls-remote`, GitHub compare metadata, repository metadata, license metadata, and changed-file metadata only. The compare was 1 commit ahead and touched site styling files only: `site/styles/home-kinpaku.css`, `site/styles/home-rebuild.css`, and `site/styles/light-mode.css`. No upstream package metadata, CLI implementation, detector script, live-browser workflow, skill body, tests, runtime configuration, or project-sync material changed in this reviewed drift. Apache-2.0 license metadata remained present.

Classification: safe metadata refresh / low-risk public-site styling drift.

Decision: keep Impeccable as normalized UI/UX source intelligence only. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, product-repo changes, or runtime configuration changes.

## Freshness Review 2026-06-05 Release Gate

Skill Scout read-only release-gate follow-up reviewed upstream default-branch movement from `198aa9171948af0bea6d58596ad575cb2de67af7` to `6c7c04866cc98d992b0cdead355f361ceebc7d2a` using GitHub compare metadata, commit metadata, and changed-file metadata only. The compare was 1 commit ahead and touched only `site/styles/light-mode.css` for public-site changelog/FAQ light-mode styling. No upstream package metadata, CLI implementation, detector script, live-browser workflow, skill body, tests, runtime configuration, or project-sync material changed in this reviewed drift.

Classification: safe metadata refresh / low-risk public-site styling drift.

Decision: keep Impeccable as normalized UI/UX source intelligence only. This refresh updates source tracking only and does not approve CLI execution, package install, detector use, browser workflow use, source-copying, skill-body import, external activation, product-repo changes, or runtime configuration changes.

## Historical Source Safety Review 2026-06-05 Post-Merge Release Gate

Skill Scout read-only post-merge release-gate follow-up reviewed upstream default-branch movement from `6c7c04866cc98d992b0cdead355f361ceebc7d2a` to `347a0c06a2781578f0d3c6fe2cc3a8b64ad5b62d` using GitHub compare metadata, commit metadata, and changed-file metadata only. The compare was 1 commit ahead with commit message `Fix Windows skill bundle extraction (#198)` and touched `bun.lock`, `cli/bin/commands/skills.mjs`, and `package.json`.

Classification: `REVIEWED_HELD` / package, lockfile, and CLI skill-bundle extraction drift.

Decision: keep Impeccable as normalized UI/UX source intelligence only, but hold this upstream movement from active adoption. This review does not approve CLI execution, package install, package metadata adoption, lockfile adoption, skill-bundle extraction behavior adoption, detector use, browser workflow use, source-copying, skill-body import, external activation, product-repo changes, runtime configuration, or script execution.

## v0.2.3 Full-Power Resolution 2026-06-06

Skill Scout read-only follow-up reviewed upstream default-branch movement from `347a0c06a2781578f0d3c6fe2cc3a8b64ad5b62d` to `5fb30e03e6ca0fa826c0b3eff0d1402fce871818` using `git ls-remote` and GitHub compare metadata only. The compare was 3 commits ahead and touched live-browser/live-event/live-server/live-vocabulary scripts across harness skill folders, plugin skill scripts, site demo pages/styles, and tests.

Outcome: `SYNCED_ADOPTED`.

Decision: keep Impeccable active as normalized UI quality source intelligence and adopt only cleanroom UI quality concepts into toolkit-owned UIUX methods/evals. The live-browser, CLI, package, detector, and skill-bundle surfaces remain forbidden runtime. Useful adoption is limited to stronger UI review expectations around context loading, visual hierarchy, interaction polish, viewport evidence, artifact hygiene, and avoiding generic AI-looking design. No upstream scripts, CLI behavior, package metadata, lockfiles, skill bodies, live-browser workflows, tests, examples, or detector behavior were copied, installed, activated, or run.

## v0.2.3 Follow-up Freshness Review 2026-06-06

Skill Scout read-only follow-up reviewed upstream default-branch movement from `5fb30e03e6ca0fa826c0b3eff0d1402fce871818` to `6788085015400c3900cbf3a46b76f76bf489b3e3` using `git ls-remote`, GitHub compare metadata, and commit metadata only. The compare was 1 commit ahead and added `site/public/llms.txt` as public site/LLM documentation metadata. No upstream package metadata, lockfile, CLI implementation, detector script, live-browser workflow code, skill body, tests, runtime configuration, or project-sync material changed in this reviewed drift.

Outcome: `SYNCED_ADOPTED`.

Decision: keep Impeccable active as normalized UI quality source intelligence. The new public-site metadata is useful as provenance/context only; no raw `llms.txt` content, install guidance, command catalog, site docs, CLI behavior, live-browser workflow, detector behavior, package metadata, skill body, script, or runtime behavior was copied, installed, activated, or run.

## Source Provenance (Stable)

- Watchlist path: `sources/source-watchlist.json`
- Reviewed by: Codex controlled implementation pass
- Review decision: Source-record plus narrow normalized `uiux` guidance
- Last review evidence: Source freshness report, GitHub compare metadata, and `git ls-remote` HEAD SHA on 2026-06-06
