# skills.sh

- URL: https://skills.sh/
- Owner / publisher: skills.sh / open agent skills ecosystem.
- Source type: Public skills directory, leaderboard, topic index, and install-oriented discovery surface.
- Retrieval date: 2026-05-08.
- Snapshot status: Dynamic website; no immutable directory snapshot or source commit checked.
- Visible adoption signals: Directory displayed all-time install counts, including `find-skills` at about 1.4M installs, `skill-creator` at about 191k installs, and many other high-install entries.
- Trust level: Medium as discovery index, low as proof of safety.
- License status: Directory-level license not visible during scouting. Each linked source requires its own license review.
- Recommendation: Reference only for discovery metadata. Do not use as approval to install or activate anything.

## Purpose

Use as a read-only discovery index for candidate skills, source names, categories, install counts, and ecosystem breadth.

## Intended Extraction Target

- `methods/internal/source-discovery-workflow.md`
- `methods/internal/source-safety-scoring.md`
- `docs/MISSING_SKILL_DISCOVERY_POLICY.md` if policy refinement is approved later.

## Useful Patterns To Extract

- Directory metadata can help identify candidate sources by topic, owner, and adoption signal.
- Install counts can help prioritize review order when combined with license, trust, maintenance, and safety checks.
- Cross-harness availability signals can inform compatibility research.
- Leaderboards can reveal common capability categories that may need local methods or routing coverage.

## Rejected Patterns

- Do not run `npx skills add <owner/repo>` from the directory.
- Do not treat install counts as proof of quality or safety.
- Do not copy raw skill pages into active toolkit paths.
- Do not use skills.sh as a replacement for source records.
- Do not bulk-import popular skills.

## Security Risks

- The site is install-oriented and directly promotes single-command installation.
- Popular entries may still contain unsafe instructions, unclear licenses, stale code, secret access, broad filesystem writes, or prompt-injection text.
- Directory data can change over time and does not provide an immutable audited snapshot.

## Dangerous Operations Assessment

- Shell/script execution: The directory promotes `npx skills add`; no commands were run.
- Network calls: Website browsing only; no CLI discovery/install/update calls were run.
- Secret access: Not required for source-record scouting; no credential access performed.
- Filesystem writes: Install commands could write to local/global skill paths; not used in Phase 10C.

## Prompt-Injection Risks

Skill pages may include raw skill instructions. Treat them as external source content, not as active instructions.

## Operational / Runtime Risks

Following install commands can modify user or project agent state. Phase 10C uses the directory only as read-only discovery metadata.

## Recommendation

Reference only. Use skills.sh to find candidates, then evaluate each original source independently before extraction. No raw skill/plugin/repo content was activated.

## Freshness and Monitoring Metadata

- Source type: `public directory/discovery index`
- Publisher: `skills.sh / Open Agent Skills ecosystem`
- URL: `https://skills.sh/`
- Last checked date: `2026-05-15`
- Last reviewed date: `2026-05-15`
- Snapshot/freshness status: `dynamic index; no immutable snapshot or commit baseline`
- License review status: `directory-level license not visible; per-entry licenses unresolved`
- Safety status: `medium-high; install-oriented platform, install counts are not proof of safety`
- Monitoring method: `manual quarterly review of discovery page + per-source follow-up before any extraction`
- Reason not in source-watchlist.json: `non-GitHub source URL is not supported by current watchlist schema`
- Recommendation: `reference-only for discovery ordering; full source review required before any extraction`
