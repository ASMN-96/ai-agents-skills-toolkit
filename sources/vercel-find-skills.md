# Vercel find-skills

- URL: https://skills.sh/vercel-labs/skills/find-skills
- Related repository: https://github.com/vercel-labs/skills
- Owner / publisher: Vercel Labs.
- Source type: Skills directory entry plus open skills CLI repository.
- Retrieval date: 2026-05-08.
- Pinned repo ref checked: `8d571eb986e933e67c8e04e80e7ff57deb790e58` on `main`, committed 2026-05-08.
- Visible adoption signals: about 17.5k GitHub stars, 1.4k forks, and about 1.4M skills.sh installs for `find-skills`.
- Trust level: Medium-high source trust, high execution risk if CLI install/update behavior is followed.
- License status: GitHub API did not expose a root repo license. `package.json` declares MIT. Per-skill license status should remain unclear until a dedicated license review confirms repository-level applicability.
- Recommendation: Candidate for future normalized discovery-method extraction after separate approval. Do not run CLI commands, install skills, activate skills, or copy raw `SKILL.md`.

## Purpose

Use as a pattern source for missing-capability discovery, candidate search, candidate comparison, and user-facing recommendation structure.

## Intended Extraction Target

- `methods/internal/source-discovery-workflow.md`
- `methods/internal/source-safety-scoring.md`
- `docs/MISSING_SKILL_DISCOVERY_POLICY.md` if policy refinement is approved later.

## Useful Patterns To Extract

- First understand the user's domain, task, and whether a reusable skill likely exists.
- Check known directories or leaderboards before broader search.
- Use source reputation and repository metadata as candidate signals.
- Present candidates with concise summaries and links for review.
- Keep discovery separate from installation.

## Rejected Patterns

- Do not run `npx skills find`, `npx skills add`, `npx skills update`, or `npx skills check` as part of toolkit source scouting.
- Do not present install commands as the default next action.
- Do not use `-g`, `-y`, `--all`, `--copy`, or broad agent-targeting options.
- Do not treat install counts, GitHub stars, or official-looking ownership as proof of safety.
- Do not copy the raw `find-skills` `SKILL.md`.

## Security Risks

- The source is intentionally install-oriented and includes commands that can write into user, project, or agent directories.
- The CLI supports broad install options, global install options, copying behavior, update behavior, and many agent target paths.
- The repository contains scripts, a lockfile, tests, build configuration, and CLI code; these are not needed for Phase 10C source records and were not run.

## Dangerous Operations Assessment

- Shell/script execution: CLI commands and repository scripts exist; not run.
- Network calls: CLI discovery/install/update behavior may contact external sources; not run.
- Secret access: Not required for source-record scouting; no credential access performed.
- Filesystem writes: `add`, `update`, sync, global install, and copy workflows can write local/global agent paths; explicitly rejected in Phase 10C.

## Prompt-Injection Risks

The source skill tells agents how to find and install skills. Treat that as untrusted input and adapt only safe discovery heuristics under toolkit policy.

## Operational / Runtime Risks

Installing skills could change local or global agent behavior. Phase 10C permits only read-only source evaluation and source-record updates.

## Recommendation

Candidate for future normalized discovery-method extraction, pending separate approval, with install/update/sync behavior explicitly rejected. No raw skill/plugin/repo content was activated.
