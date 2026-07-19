# Registry Generation Readiness Report

Status: current report summary.

Registry generation remains report-only. It does not activate skills, create runtime entries, install external tools, change package files, or sync product repositories.

Canonical skill inputs with active frontmatter:

| Skill | Path | Status |
| --- | --- | --- |
| governance | skills/governance/SKILL.md | frontmatter-ready |
| uiux | skills/uiux/SKILL.md | frontmatter-ready |
| code-quality | skills/code-quality/SKILL.md | frontmatter-ready |
| security-review | skills/security-review/SKILL.md | frontmatter-ready |
| pr-release-gate | skills/pr-release-gate/SKILL.md | frontmatter-ready |

The v0.3 candidate runtime contains these five canonical skills plus fifteen repo-local native agent definitions. Twelve agents have compiled fallbacks; the backend implementation, mobile platform, and desktop platform agents remain preview and native-only.
