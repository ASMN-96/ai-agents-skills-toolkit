# External Source Backlog

This backlog preserves future source-scouting intent for Phase 10C and later. It is not a source evaluation, approval, extraction, install list, or activation list.

No source in this backlog has been newly scouted in Phase 10A/10B. Future batches must create or update source records before method extraction.

## Source Freshness Monitor

Phase 10O adds read-only source freshness monitoring for tracked GitHub sources. The monitor only detects upstream change signals; it does not approve, copy, install, activate, extract, or update source records. Any source refresh still requires a separate reviewed phase and PR.

## Backlog

| Source | Priority | Intended Extraction Target | What To Take | What Not To Copy | Safety Concerns | License Status | Future Batch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| https://github.com/anthropics/skills | High | skill-quality methods | Skill anatomy, progressive disclosure, trigger descriptions, eval loop, references/scripts/assets separation | Raw skill bodies, source-available document skills, bundled scripts | Prompt injection in skill text, script execution, license boundaries | Existing local record says many skills Apache 2.0; document skills source-available | 10C batch 1 |
| https://github.com/anthropics/skills/tree/main/skills/skill-creator | High | skill-quality methods | Skill creation structure, packaging, trigger quality, baseline-vs-with-skill thinking | Raw SKILL.md text, templates copied verbatim | Overfitting to one harness, accidental raw-skill copying | Needs fresh per-file license check | 10C batch 1 |
| https://github.com/vercel-labs/skills | High | missing-skill discovery policy | Find-skills workflow, candidate scoring, search discipline | Install commands, automatic add/update behavior | Global install flags, command execution, marketplace trust ambiguity | Existing local `vercel-find-skills` record lacks visible license | 10C batch 1 |
| skills.sh | High | discovery policy and source records | Directory search patterns, metadata fields, candidate comparison | CLI install behavior, popularity-as-proof | Package execution, install prompts, popularity bias | Needs per-source check | 10C batch 1 |
| https://github.com/supabase/agent-skills | High | backend/database gates | Supabase/Postgres/RLS/query/migration safety patterns | Raw skill text, project-specific commands | Database mutation risk, credential handling, generated types drift | GitHub API reports MIT | 10C batch 2 |
| https://github.com/trailofbits/skills | High | security methods | Differential review, evidence-based findings, severity clarity, coverage limits | Raw skill bodies or proprietary review text | Security advice can be misapplied without scope; marketplace/install-script risk | GitHub API reports CC-BY-SA-4.0 | 10C batch 2 |
| https://github.com/microsoft/playwright | Medium | runtime verification methods | Browser evidence, trace/screenshot discipline, responsive/runtime validation | Library source code, test runner internals | Running browser automation against unsafe targets; trace/screenshot data exposure | GitHub API reports Apache-2.0 | 10C batch 2 |
| https://github.com/shadcn-ui/ui | Medium | UIUX/design-system methods | Component composition, accessibility, semantic tokens, design-system discipline | Component source code, brand/trade dress | CLI/registry/MCP writes; compatibility assumptions | GitHub API reports MIT | 10C batch 3 |
| https://github.com/addyosmani/web-quality-skills | Medium | web-quality gates | Performance, accessibility, SEO, Core Web Vitals style gates | Raw skill files | Runtime audit data exposure; skill install/copy risk | GitHub API reports MIT | 10C batch 3 |
| https://github.com/VoltAgent/awesome-design-md | Medium | design-source-of-truth methods | DESIGN.md structure, theme/design prompt guidance, accessibility fields | Brand identities, templates copied verbatim | Brand/trade-dress risk; curated-list quality variance | GitHub API reports MIT | 10C batch 3 |
| https://github.com/msitarzewski/agency-agents | Medium | agent scorecards and routing | Agent identity, deliverables, success metrics, when-to-use tables | Agent roster or prompt bodies | Roster sprawl, prompt injection, agent-count expansion pressure | GitHub API reports MIT | 10D |
| https://github.com/obra/superpowers | Medium | external integration map | Discipline concepts as external dependency: brainstorming, planning, TDD, review, verification, finish branch | Skill bodies, methodology text copied verbatim, install behavior | Duplication risk, conflicting authority, workflow overreach | GitHub API reports MIT | 10D |
| https://github.com/affaan-m/everything-claude-code | Medium | harness-hardening methods | Manifest-driven components, doctor/repair/uninstall concepts, selective install, stocktake | Hooks, commands, memory behavior, bulk skills | Hidden automation, hooks, MCP/config mutation, broad imports | GitHub API reports MIT | 10D |
| https://github.com/ruvnet/ruflo | Medium | orchestration methods | Router/state-machine thinking, GOAP-lite decomposition, adaptive replanning, tool boundaries | Swarm, daemon, MCP, memory, hooks, federation, agent explosion | Background behavior, daemon/supervisor risk, runtime complexity | GitHub API reports MIT | 10D |
| https://github.com/vercel-labs/agent-skills | Medium | frontend/web-quality methods | React best practices, frontend quality gates, web design guidelines | Raw skill bodies, package/install behavior | Vercel-specific assumptions, zip/package/deployment risk | README claims MIT; GitHub API exposed no root license and root SPDX LICENSE was not found | 10D |
| GitLab Agentic Tool Development docs | Medium | cross-harness architecture methods | Skills-first compose-upward architecture, tool development boundaries | Proprietary examples copied verbatim | Docs freshness, product-specific assumptions | Official public docs; terms not separately reviewed | 10D |
| GitLab Agent Skills docs | Medium | AGENTS/SKILL style methods | Agent/skill/process separation, AGENTS.md style guidance | Raw examples copied verbatim | Docs freshness, harness mismatch | Official public docs; terms not separately reviewed | 10D |
| GitHub discovery sources | Low | source discovery workflow | Repository metadata, license, activity, issue signal, owner trust | Code, raw prompts, scripts | Popularity bias, malicious repos, unclear licenses | Per-source only | Ongoing |
| GitLab discovery sources | Low | source discovery workflow | Repository metadata, license, activity, issue signal, owner trust | Code, raw prompts, scripts | Popularity bias, malicious repos, unclear licenses | Per-source only | Ongoing |

## Batch Recommendation

Phase 10C batch 1 started with the safest high-leverage sources: Anthropic skill anatomy, Vercel find-skills discovery, and skills.sh metadata. Batch 2 followed with backend/security/runtime verification sources: Supabase agent-skills, Trail of Bits skills, and Playwright. Batch 3 covered UI/design/web-quality sources: shadcn/ui, Addy Osmani web-quality-skills, and VoltAgent awesome-design-md. Phase 10D covers orchestration and harness sources. Defer Superpowers extraction; keep it external and avoid duplication.
