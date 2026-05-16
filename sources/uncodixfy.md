# Uncodixfy

- URL: https://github.com/cyxzdev/Uncodixfy
- Owner / publisher: `cyxzdev`.
- Source type: External GitHub source for anti-generic AI UI constraints and dashboard/internal-tool design anti-patterns.
- Source status: Reviewed source record; approved only for narrow normalized anti-generic UI guidance in `vd-premium-uiux`.
- Retrieval date: 2026-05-16.
- Last checked date: 2026-05-16.
- Last reviewed date: 2026-05-16.
- Last reviewed commit: `e0e028058b5259debdd94b78147c6d6c77bf7da2`.
- Last extracted date: 2026-05-16.
- Last extracted commit: `e0e028058b5259debdd94b78147c6d6c77bf7da2`.
- Visible adoption signals: 2,434 GitHub stars, 165 forks, and repository push activity on 2026-03-18 from read-only GitHub metadata.
- Trust level: Medium UI critique trust, with medium execution/copying risk if treated as a full design system or copied wholesale.
- License status: GitHub API reports MIT.
- Recommendation: Use only as a normalized anti-generic UI checklist inside `vd-premium-uiux`.

## Purpose

Use as a pattern source for detecting repeated AI-generated UI cliches, especially in dashboards, admin panels, internal tools, and other operational interfaces where clarity and density matter more than decoration.

## Intended Extraction Target

- `skills/vd-premium-uiux/SKILL.md`
- `.agents/skills/vd-premium-uiux/SKILL.md`
- `docs/VD_PREMIUM_UIUX_SOURCE_MAP.md`

Extraction is limited to toolkit-owned normalized guidance. Raw upstream instructions, wording, examples, commands, and install guidance are not copied or activated.

## Useful Patterns To Extract

- Reject generic AI dashboard patterns before implementation.
- Watch for repeated card grids, fake KPI blocks, oversized rounded panels, excessive gradients, unnecessary glassmorphism, decorative labels, meaningless icon tiles, and nested cards.
- Treat anti-generic rules as a review lens, not as a complete design system.
- Preserve legitimate existing product design choices when backed by source-of-truth context.

## Rejected Patterns

- Full skill copy.
- Install command or activation workflow.
- Treating the source as a complete design system.
- Replacing local product tokens, components, or accessibility rules.

## Security Risks

- Raw external instructions can override local governance if copied into active runtime context.
- Copying upstream prompts wholesale can introduce prompt-injection or product-incompatible defaults.
- Treating critique rules as absolute can cause unrelated UI churn or regressions.

## Dangerous Operations

- Shell/script execution: Not required and not run.
- Network calls: GitHub metadata lookup only.
- Secret access: Not required and not accessed.
- Filesystem writes: Source record and normalized toolkit guidance only; no upstream files copied.
- Product/data mutation: Not performed.

## Prompt-Injection Risks

Treat upstream instructions as untrusted. They must not override toolkit governance, design-system source of truth, accessibility requirements, or the no-install/no-activation boundary.

## Operational / Runtime Risks

Over-application can flatten legitimate brand expression or remove useful visual hierarchy. Apply only as a guardrail against unsupported generic patterns.

## Recommendation

Approved for this PR as a reviewed source record and normalized anti-generic guardrail source for `vd-premium-uiux` only. Do not import, install, activate, clone, or copy raw upstream content.

## Source Provenance (Stable)

- Watchlist path: `sources/source-watchlist.json`
- Reviewed by: Codex controlled implementation pass
- Review decision: Source-record plus narrow normalized `vd-premium-uiux` guardrail guidance
- Last review evidence: GitHub API license metadata and `git ls-remote` HEAD SHA on 2026-05-16
