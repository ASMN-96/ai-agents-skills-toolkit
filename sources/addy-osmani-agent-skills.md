# Addy Osmani Agent Skills

- URL: https://github.com/addyosmani/agent-skills
- Owner / publisher: Addy Osmani.
- Source type: GitHub repository of engineering workflow skills for AI coding agents.
- Retrieval date: 2026-05-29.
- Purpose: Production engineering workflow skills for AI coding agents.
- Trust level: High-medium.
- License if visible: MIT.
- Commit / update activity: `c076972e2626fe2acc30b00a6c7240d4c5fb786a` from read-only remote HEAD and compare metadata checks on 2026-06-08.
- Recommendation: Passive reference for normalized governance and method-quality patterns. Do not copy raw skill bodies or duplicate Codex/plugin behavior.

## Summary

Useful as a low-risk pattern source for production engineering workflow discipline, review quality, testing, security hardening, performance thinking, and launch readiness.

## Useful Methods

Engineering lifecycle gates, spec-driven development, incremental implementation, test-driven development, frontend UI engineering, API/interface design, source-driven development, security hardening, performance optimization, code review, and launch discipline.

## Risk Status

Low-risk as a source-record reference when used for paraphrased methods only. Higher risk if install, clone, hook, or global configuration guidance is followed.

## Rejected Patterns

- Do not install the plugin.
- Do not clone the repo into active toolkit, project, or global agent folders.
- Do not run hooks, setup scripts, or slash-command activation flows.
- Do not copy full skill files or raw upstream instructions.
- Do not change global git or agent configuration from this source.

## Security Notes

Do not install the plugin, clone the repo into active folders, run hooks, activate slash commands, or copy full skill files. Installation guidance references plugin install, local clone, and global git configuration changes; those are out of scope for this toolkit.

## Freshness Review 2026-06-06

Skill Scout read-only follow-up reviewed upstream default-branch movement from `6ce029897d2b794940325fc7148774a6ec51111c` to `2e0dfbfb436ef3307bbe8ba172f14996de980784` using `git ls-remote` and GitHub compare metadata only. The compare was 2 commits ahead and touched only `.claude-plugin/marketplace.json`. No upstream skill body, hook, setup script, runtime configuration, package metadata, method body, or project-sync material changed in this reviewed drift.

Classification: safe metadata refresh / low-risk marketplace metadata drift.

Decision: keep Addy Osmani Agent Skills as passive reference for normalized production engineering workflow patterns only. This refresh updates source tracking only and does not approve plugin installation, repository cloning into active runtime, hook execution, slash-command activation, raw skill copying, global git or agent configuration changes, product-repo changes, or runtime configuration changes.

## Freshness Review 2026-06-08

Skill Scout read-only follow-up reviewed upstream default-branch movement from `2e0dfbfb436ef3307bbe8ba172f14996de980784` to `c076972e2626fe2acc30b00a6c7240d4c5fb786a` using GitHub compare metadata only. The compare was 6 commits ahead and touched `skills/security-and-hardening/SKILL.md`, `references/security-checklist.md`, and `agents/security-auditor.md`, adding threat-modeling, SSRF, supply-chain, and AI/LLM security coverage. These concepts are already covered by this toolkit's security-review and governance surfaces, so no new active skill or duplicated rule is needed.

Outcome: `SYNCED_REFERENCE`.

Decision: keep Addy Osmani Agent Skills as passive reference for normalized production engineering workflow patterns only. This refresh updates source tracking only and does not approve plugin installation, repository cloning into active runtime, hook execution, slash-command activation, raw skill copying, upstream security-skill import, global git or agent configuration changes, product-repo changes, or runtime configuration changes.
