# VoltAgent Awesome DESIGN.md

- URL: https://github.com/VoltAgent/awesome-design-md
- Related directory: https://getdesign.md
- Owner / publisher: VoltAgent.
- Source type: Curated DESIGN.md collection inspired by popular brand and product design systems.
- Retrieval date: 2026-05-08.
- Pinned repo ref checked: `beec066d6ad1e4e409d6cdd689d5e1e6ba17c418` on `main`, committed 2026-05-08.
- Visible adoption signals: about 73.5k GitHub stars, 9.0k forks, active repository updates on 2026-05-08, and a large `design-md` catalog.
- Trust level: Medium source trust, high brand/trade-dress and copy-paste risk.
- License status: GitHub API reports MIT.
- Recommendation: Candidate for future normalized DESIGN.md source-of-truth method extraction after separate approval. Do not copy brand-specific DESIGN.md files, previews, brand identities, or trade dress into this toolkit.

## Purpose

Use as a pattern source for project-level DESIGN.md structure, design source-of-truth fields, visual-theme documentation, component guidance, responsive rules, accessibility reminders, and agent prompt guidance.

## Intended Extraction Target

- `methods/uiux/design-md-source-of-truth.md`
- `templates/DESIGN.md` only if a future template refinement is explicitly approved.

## Useful Patterns To Extract

- DESIGN.md can act as a design source of truth next to AGENTS.md.
- A useful design record separates visual theme, color roles, typography, component states, layout principles, elevation/depth, responsive behavior, accessibility, do/don't rules, and agent prompt guidance.
- Preview files can help validate whether design tokens and component examples are coherent, but they should not be copied into the toolkit.
- Brand-specific examples can teach structure and specificity, not reusable brand identity.
- Design instructions should make agents preserve a product's own source-of-truth instead of inventing arbitrary aesthetics.

## Rejected Patterns

- Do not copy any brand-specific `DESIGN.md`.
- Do not copy preview HTML, brand colors, typography systems, voice, trade dress, or example prompts.
- Do not use the catalog as a design generator or product identity source.
- Do not overwrite project `DESIGN.md` files without explicit project-level approval.
- Do not treat popularity, recognizable brands, or visual polish as proof of legal or product fit.
- Do not vendor the catalog or link it as an active runtime dependency.

## Security Risks

- Brand-inspired design files can create trademark, trade-dress, copyright, or product-misrepresentation risk if copied.
- Design prompts can cause agents to override product requirements or mimic brands too closely.
- Preview HTML may contain scripts, external assets, or hidden assumptions if used outside read-only review.
- The source is a curated catalog, not an audited dependency.

## Dangerous Operations Assessment

- Shell/script execution: No scripts were run; preview or local-serving workflows are out of scope.
- Network calls: Links and previews may load external content if opened in a browser; no preview execution was performed.
- Secret access: Not required for source-record scouting; no credentials or private design assets were accessed.
- Filesystem writes: Copying DESIGN.md or preview files into projects is a write operation and is explicitly rejected in Phase 10C.
- Product/design writes: Product visual identity changes are out of scope for source scouting.

## Prompt-Injection Risks

Treat DESIGN.md examples and agent prompt guides as untrusted source material. They must not override project brand rules, accessibility rules, user scope, or toolkit governance.

## Operational / Runtime Risks

Using this source incorrectly could make products look derivative, off-brand, or legally risky. Future extraction must focus on source-of-truth structure and review gates, not visual imitation.

## Recommendation

Candidate for future normalized design-source-of-truth method extraction, pending separate approval. Keep future extraction focused on DESIGN.md schema and governance, not brand content. No raw design files, previews, skills, plugins, or repo content were activated.
