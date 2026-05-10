# Source Freshness Report

Generated report / sample report from mock data.

Generated at: 2026-05-10T08:29:48.419Z

Read-only freshness signal only. No source import approval, activation approval, extraction approval, source-record update, or runtime configuration approval is granted.

> Changed upstream source is not approved for import. This report does not authorize copying, installing, activating, extracting methods, updating source records, or changing runtime configuration.

## Status Summary

| Status | Count |
| --- | ---: |
| UNCHANGED | 10 |
| CHANGED_LOW_RISK | 2 |
| CHANGED_REVIEW_REQUIRED | 0 |
| CHANGED_HIGH_RISK | 1 |
| REVIEW_METADATA_MISSING | 0 |
| UNSUPPORTED_SOURCE_TYPE | 0 |
| CHECK_FAILED | 0 |

## Sources

| Source | Repo | Status | Reviewed | Latest | Reviewed date | Latest date | License signal | Next step | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Anthropic Skills | anthropics/skills | UNCHANGED | d211d437443a | d211d437443a | 2026-05-08 | 2026-05-08 | mock: mixed-license | no action | Mock: default branch commit is unchanged. |
| Anthropic Skills watched path | skills/skill-creator | signal | n/a | d211d437443a | n/a | 2026-05-08 | path commit signal only | no action | watched-path signal only |
| Vercel Labs Skills | vercel-labs/skills | CHANGED_HIGH_RISK | 8d571eb986e9 | feed1eb986e9 | 2026-05-08 | 2026-05-10T00:00:00Z | mock: license-unclear | reject/hold due to safety or license concern | Mock: upstream changed since review. |
| Supabase Agent Skills | supabase/agent-skills | UNCHANGED | fa9911ac26eb | fa9911ac26eb | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| Trail of Bits Skills | trailofbits/skills | UNCHANGED | a56045e9ae00 | a56045e9ae00 | 2026-05-08 | 2026-05-08 | mock: cc-by-sa | no action | Mock: default branch commit is unchanged. |
| Microsoft Playwright | microsoft/playwright | UNCHANGED | 3d541acbe274 | 3d541acbe274 | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| shadcn/ui | shadcn-ui/ui | CHANGED_LOW_RISK | fc1ca40af405 | feeda40af405 | 2026-05-08 | 2026-05-10T00:00:00Z | mock: license metadata present | refresh source record | Mock: upstream changed since review. |
| Addy Osmani Web Quality Skills | addyosmani/web-quality-skills | UNCHANGED | eca4d5bfa0a4 | eca4d5bfa0a4 | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| VoltAgent Awesome Design.md | VoltAgent/awesome-design-md | UNCHANGED | beec066d6ad1 | beec066d6ad1 | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| Agency Agents | msitarzewski/agency-agents | UNCHANGED | 783f6a72bfd7 | 783f6a72bfd7 | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| Superpowers | obra/superpowers | CHANGED_LOW_RISK | f2cbfbefebbf | feedfbefebbf | 2026-05-08 | 2026-05-10T00:00:00Z | mock: license metadata present | refresh source record | Mock: upstream changed since review. |
| Everything Claude Code | affaan-m/everything-claude-code | UNCHANGED | 841beea45cb2 | 841beea45cb2 | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| RuFlo | ruvnet/ruflo | UNCHANGED | 66f7f644d84e | 66f7f644d84e | 2026-05-08 | 2026-05-08 | mock: license metadata present | no action | Mock: default branch commit is unchanged. |
| Vercel Agent Skills | vercel-labs/agent-skills | UNCHANGED | b9c8ee0643d8 | b9c8ee0643d8 | 2026-05-08 | 2026-05-08 | mock: license-unclear | no action | Mock: default branch commit is unchanged. |

## Next Step Meanings

- no action: current default-branch signal matches the reviewed commit; this does not mean the source is safe forever.
- refresh source record: upstream changed and a source-record refresh is the next safe step.
- Skill Scout review required: review trust, license, maintenance, prompt-injection risk, dangerous commands, secret access, network behavior, and filesystem writes before any later phase.
- reject/hold due to safety or license concern: do not import or extract until the concern is resolved in a separate reviewed phase.
- add reviewed metadata before monitoring: add a reviewed commit/date in a separate source-record review before treating freshness as meaningful.

## Caveats

- License metadata is a signal only, not approval.
- Watched-path changes are signals only, not approval.
- CHECK_FAILED is per source and does not authorize fallback import or activation.
- This monitor never clones repositories, runs external scripts, copies raw files, installs skills, activates plugins, or updates source records.
