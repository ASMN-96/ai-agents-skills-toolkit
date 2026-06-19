# OpenAI Skills

- URL: https://github.com/openai/skills
- Purpose: Official Codex skills catalog and examples.
- Trust level: High.
- License if visible: Per-skill license files.
- Commit / update activity: `972cb867affac58fda9afa76bb1a19b399a278cf` from read-only remote HEAD check on 2026-06-19.
- Recommendation: Reference only. Do not copy official OpenAI/Codex docs, raw skill bodies, plugin behavior, or runtime configuration into this toolkit.

## Useful Methods

Skill packaging conventions, `.system` and `.curated` separation, skill installer boundaries, OpenAI docs usage, security skills, Playwright/Figma support skills, and plugin/skill authoring patterns.

## Security Notes

Some skills install, deploy, modify GitHub state, or are auto-installed in Codex. Use as official reference only unless a specific skill is separately approved.

## Freshness Review 2026-06-19

Skill Scout read-only source-freshness follow-up reviewed upstream default-branch movement from `a8924c2a35cfa290458852c4fad17c9133054c2e` to `972cb867affac58fda9afa76bb1a19b399a278cf` using `git ls-remote` and GitHub compare metadata only. The compare was 1 commit ahead and touched `skills/.curated/openai-docs/SKILL.md` and `skills/.system/openai-docs/SKILL.md`, mirroring compact OpenAI docs search guidance. Mixed-license and official-runtime boundaries remain active.

Outcome: `SYNCED_REFERENCE`. This refresh updates source tracking only and does not approve raw source copying, install, activation, script execution, MCP setup, global configuration changes, CI wiring, product-repository mutation, or runtime behavior changes.
