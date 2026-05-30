# Source Freshness Report

Generated report / sample report from mock data.

Generated at: 2026-05-30T12:16:37.500Z

Read-only freshness signal only. No source import approval, activation approval, extraction approval, source-record update, or runtime configuration approval is granted.

> Changed upstream source is not approved for import. This report does not authorize copying, installing, activating, extracting methods, updating source records, or changing runtime configuration.

## Status Summary

| Status | Count |
| --- | ---: |
| UNCHANGED | 16 |
| CHANGED_LOW_RISK | 4 |
| CHANGED_REVIEW_REQUIRED | 0 |
| CHANGED_HIGH_RISK | 1 |
| REVIEW_METADATA_MISSING | 0 |
| UNSUPPORTED_SOURCE_TYPE | 0 |
| CHECK_FAILED | 0 |

## Sources

| Source | Repo | Status | Reviewed | Checked | Latest | Reviewed date | Latest date | License signal | Affected methods | Next step | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic Skills | anthropics/skills | UNCHANGED | da20c92503b2 | 2026-05-30T12:16:37.500Z | da20c92503b2 | 2026-05-29 | 2026-05-29 | mock: mixed-license | internal.frontend-uiux-quality-gates (Frontend UIUX Quality Gates); internal.skill-anatomy (Skill Anatomy); internal.source-discovery-workflow (Source Discovery Workflow); uiux.accessibility (Accessibility); uiux.dashboard-ux (Dashboard UX); uiux.design-system (Design System); uiux.frontend-design (Frontend Design); uiux.interaction-motion (Interaction Motion); uiux.premium-visual-quality (Premium Visual Quality); uiux.responsive-layout (Responsive Layout) | no action | Mock: default branch commit is unchanged. |
| Anthropic Skills watched path | skills/skill-creator | signal | n/a | n/a | da20c92503b2 | 2026-05-29 | n/a | path commit signal only | internal.frontend-uiux-quality-gates (Frontend UIUX Quality Gates); internal.skill-anatomy (Skill Anatomy); internal.source-discovery-workflow (Source Discovery Workflow); uiux.accessibility (Accessibility); uiux.dashboard-ux (Dashboard UX); uiux.design-system (Design System); uiux.frontend-design (Frontend Design); uiux.interaction-motion (Interaction Motion); uiux.premium-visual-quality (Premium Visual Quality); uiux.responsive-layout (Responsive Layout) | no action | watched-path signal only |
| OpenAI Skills | openai/skills | CHANGED_HIGH_RISK | a8924c2a35cf | 2026-05-30T12:16:37.500Z | feed4c2a35cf | 2026-05-29 | 2026-05-10T00:00:00Z | mock: mixed-license | none registered | reject/hold due to safety or license concern | Mock: upstream changed since review. |
| Addy Osmani Agent Skills | addyosmani/agent-skills | UNCHANGED | 6ce029897d2b | 2026-05-30T12:16:37.500Z | 6ce029897d2b | 2026-05-29 | 2026-05-29 | mock: license metadata present | internal.engineering-lifecycle-gates (Engineering Lifecycle Gates); internal.frontend-uiux-quality-gates (Frontend UIUX Quality Gates); internal.tdd-verification-alignment (TDD Verification Alignment); osmani.api-interface-design (API Interface Design); osmani.code-review-quality (Code Review Quality); osmani.engineering-lifecycle-gates (Engineering Lifecycle Gates); osmani.frontend-ui-engineering (Frontend UI Engineering); osmani.incremental-implementation (Incremental Implementation); osmani.performance-optimization (Performance Optimization); osmani.security-hardening (Security Hardening); osmani.shipping-launch (Shipping And Launch); osmani.spec-driven-development (Spec Driven Development); osmani.test-driven-development (Test-Driven Development); uiux.accessibility (Accessibility); uiux.frontend-design (Frontend Design); uiux.webapp-testing (Webapp Testing) | no action | Mock: default branch commit is unchanged. |
| Supabase Agent Skills | supabase/agent-skills | UNCHANGED | 577e626421fd | 2026-05-30T12:16:37.500Z | 577e626421fd | 2026-05-29 | 2026-05-29 | mock: license metadata present | backend.supabase-postgres-rls-gates (Supabase Postgres RLS Gates) | no action | Mock: default branch commit is unchanged. |
| Trail of Bits Skills | trailofbits/skills | UNCHANGED | c94841be3dea | 2026-05-30T12:16:37.500Z | c94841be3dea | 2026-05-29 | 2026-05-29 | mock: cc-by-sa | security.differential-security-review (Differential Security Review) | no action | Mock: default branch commit is unchanged. |
| Microsoft Playwright | microsoft/playwright | CHANGED_LOW_RISK | 9fe284a59409 | 2026-05-30T12:16:37.500Z | feed84a59409 | 2026-05-30 | 2026-05-10T00:00:00Z | mock: license metadata present | uiux.webapp-testing (Webapp Testing) | refresh source record | Mock: upstream changed since review. |
| Bencium Marketplace | bencium/bencium-marketplace | UNCHANGED | 3ea292b062cd | 2026-05-30T12:16:37.500Z | 3ea292b062cd | 2026-05-29 | 2026-05-29 | mock: license metadata present | internal.frontend-uiux-quality-gates (Frontend UIUX Quality Gates); uiux.dashboard-ux (Dashboard UX); uiux.design-system (Design System); uiux.frontend-design (Frontend Design); uiux.premium-visual-quality (Premium Visual Quality) | no action | Mock: default branch commit is unchanged. |
| Karpathy-Inspired Skills | forrestchang/andrej-karpathy-skills | UNCHANGED | 2c606141936f | 2026-05-30T12:16:37.500Z | 2c606141936f | 2026-05-15 | 2026-05-15 | mock: license-unclear | internal.simplicity-surgical-change-discipline (Simplicity Surgical Change Discipline); karpathy.assumption-surfacing (Assumption Surfacing); karpathy.goal-driven-execution (Goal-Driven Execution); karpathy.simplicity-surgical-changes (Simplicity And Surgical Changes) | no action | Mock: default branch commit is unchanged. |
| Matt Pocock Skills | mattpocock/skills | UNCHANGED | e3b90b5238f3 | 2026-05-30T12:16:37.500Z | e3b90b5238f3 | 2026-05-29 | 2026-05-29 | mock: license metadata present | internal.simplicity-surgical-change-discipline (Simplicity Surgical Change Discipline); internal.tdd-verification-alignment (TDD Verification Alignment); matt.design-interface (Design Interface); matt.git-guardrails (Git Guardrails); matt.grill-me (Grill Me); matt.improve-architecture (Improve Architecture); matt.tdd (TDD); matt.to-issues (To Issues); matt.to-prd (To PRD); matt.triage-issue (Triage Issue) | no action | Mock: default branch commit is unchanged. |
| shadcn/ui | shadcn-ui/ui | CHANGED_LOW_RISK | 67cef8fcb94a | 2026-05-30T12:16:37.500Z | feedf8fcb94a | 2026-05-29 | 2026-05-10T00:00:00Z | mock: license metadata present | none registered | refresh source record | Mock: upstream changed since review. |
| Vercel Agent Skills | vercel-labs/agent-skills | UNCHANGED | 180115660cfb | 2026-05-30T12:16:37.500Z | 180115660cfb | 2026-05-29 | 2026-05-29 | mock: license-unclear | none registered | no action | Mock: default branch commit is unchanged. |
| Vercel find-skills | vercel-labs/skills | UNCHANGED | b469d6954dd1 | 2026-05-30T12:16:37.500Z | b469d6954dd1 | 2026-05-29 | 2026-05-29 | mock: license-unclear | none registered | no action | Mock: default branch commit is unchanged. |
| Addy Osmani Web Quality Skills | addyosmani/web-quality-skills | UNCHANGED | 7b59d48aaf1f | 2026-05-30T12:16:37.500Z | 7b59d48aaf1f | 2026-05-15 | 2026-05-15 | mock: license metadata present | uiux.webapp-testing (Webapp Testing) | no action | Mock: default branch commit is unchanged. |
| VoltAgent Awesome Design.md | VoltAgent/awesome-design-md | CHANGED_LOW_RISK | 4a8c23122c04 | 2026-05-30T12:16:37.500Z | feed23122c04 | 2026-05-29 | 2026-05-10T00:00:00Z | mock: license metadata present | none registered | refresh source record | Mock: upstream changed since review. |
| VoltAgent Awesome Agent Skills | VoltAgent/awesome-agent-skills | UNCHANGED | f4a2d027b25b | 2026-05-30T12:16:37.500Z | f4a2d027b25b | 2026-05-29 | 2026-05-29 | mock: license metadata present | none registered | no action | Mock: default branch commit is unchanged. |
| Impeccable | pbakaus/impeccable | UNCHANGED | e10cff397b1d | 2026-05-30T12:16:37.500Z | e10cff397b1d | 2026-05-29 | 2026-05-29 | mock: license metadata present | none registered | no action | Mock: default branch commit is unchanged. |
| Uncodixfy | cyxzdev/Uncodixfy | UNCHANGED | e0e028058b52 | 2026-05-30T12:16:37.500Z | e0e028058b52 | 2026-05-16 | 2026-05-16 | mock: license metadata present | none registered | no action | Mock: default branch commit is unchanged. |
| Agency Agents | msitarzewski/agency-agents | CHANGED_LOW_RISK | 783f6a72bfd7 | 2026-05-30T12:16:37.500Z | feed6a72bfd7 | 2026-05-08 | 2026-05-10T00:00:00Z | mock: license metadata present | none registered | refresh source record | Mock: upstream changed since review. |
| Superpowers | obra/superpowers | UNCHANGED | 6fd450765978 | 2026-05-30T12:16:37.500Z | 6fd450765978 | 2026-05-29 | 2026-05-29 | mock: license metadata present | internal.source-safety-scoring (Source Safety Scoring); internal.tdd-verification-alignment (TDD Verification Alignment) | no action | Mock: default branch commit is unchanged. |
| Everything Claude Code | affaan-m/everything-claude-code | UNCHANGED | 64cd1ba248e7 | 2026-05-30T12:16:37.500Z | 64cd1ba248e7 | 2026-05-29 | 2026-05-29 | mock: license metadata present | internal.source-safety-scoring (Source Safety Scoring) | no action | Mock: default branch commit is unchanged. |
| RuFlo | ruvnet/ruflo | UNCHANGED | 367cb82adf2b | 2026-05-30T12:16:37.500Z | 367cb82adf2b | 2026-05-30 | 2026-05-30 | mock: license metadata present | internal.source-safety-scoring (Source Safety Scoring) | no action | Mock: default branch commit is unchanged. |

## Next Step Meanings

- no action: current default-branch signal matches the reviewed commit; this does not mean the source is safe forever.
- refresh source record: upstream changed and a source-record refresh is the next safe step.
- Skill Scout review required: review trust, license, maintenance, prompt-injection risk, dangerous commands, secret access, network behavior, and filesystem writes before any later phase.
- reject/hold due to safety or license concern: do not import or extract until the concern is resolved in a separate reviewed phase.
- add reviewed metadata before monitoring: add a reviewed commit/date in a separate source-record review before treating freshness as meaningful.

## Caveats

- `Last checked` is the freshness scan timestamp and is not persisted back into source records automatically.
- Freshness signals only select review priority; they do not authorize source-record edits, extraction, activation, installation, or runtime writes.
- License metadata is a signal only, not approval.
- Watched-path changes are signals only, not approval.
- CHECK_FAILED is per source and does not authorize fallback import or activation.
- GitHub API 403/429 fallback is limited to `git ls-remote` default-branch commit checks.
- Affected methods are derived from method `sourceRef` frontmatter and are review-routing hints only.
- `--create-issues` generates local dry-run issue drafts with dedupe keys and labels; it does not call GitHub or create issues.
- This monitor never clones repositories, runs external scripts, copies raw files, installs skills, activates plugins, or updates source records.
