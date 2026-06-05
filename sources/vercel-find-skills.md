# Vercel find-skills

- URL: https://skills.sh/vercel-labs/skills/find-skills
- Related repository: https://github.com/vercel-labs/skills
- Owner / publisher: Vercel Labs.
- Source type: Skills directory entry plus open skills CLI repository.
- Source authority level: Historical/reference-only. Not active authority for toolkit methods or runtime.
- Retrieval date: 2026-05-29.
- Pinned repo ref checked: `a561e790756b2785b9ddb82285c4eb0a08258ac9` on `main`, checked by read-only remote HEAD and compare metadata on 2026-06-05.
- Visible adoption signals: about 17.5k GitHub stars, 1.4k forks, and about 1.4M skills.sh installs for `find-skills`.
- Trust level: Medium-high source trust, high execution risk if CLI install/update behavior is followed.
- License status: GitHub API did not expose a root repo license. `package.json` declares MIT. Per-skill license status should remain unclear until a dedicated license review confirms repository-level applicability.
- Recommendation: Historical/reference-only. No active method authority. Candidate for future normalized discovery-method extraction only after separate approval. Do not run CLI commands, install skills, activate skills, or copy raw `SKILL.md`.

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

## Freshness Review 2026-06-03

Skill Scout read-only follow-up reviewed upstream default-branch movement from `b469d6954dd10be20d3e8d9bb59463584d42efbb` to `87dc3636c59d38d7336a1d857f1364699bf38038` using GitHub compare metadata and `git ls-remote` only. The compare was 23 commits ahead and touched `AGENTS.md`, README and package metadata, CLI add/list/sync/update/use surfaces, installer and Git helper code, prompts, types, and tests. License remains unclear at repository level. This source remains historical/reference-only and high risk for install/update/sync behavior. The reviewed change is rejected for active runtime adoption and held from extraction until a separate safety and license review approves a narrow normalized discovery pattern. This refresh updates source tracking only and does not approve CLI execution, skill installation, use/update/sync behavior, raw `SKILL.md` copying, method extraction, source copying, package changes, global config changes, or runtime activation.

## Reviewed-Held Source Safety Review 2026-06-05

Skill Scout read-only source-safety follow-up reviewed upstream default-branch movement from `87dc3636c59d38d7336a1d857f1364699bf38038` to `a561e790756b2785b9ddb82285c4eb0a08258ac9` using `git ls-remote`, GitHub compare metadata, repository metadata, and changed-file metadata only. The compare was 2 commits ahead and touched `README.md`, `src/use.ts`, and `src/use.test.ts`; the visible commit message changed skill-selection guidance for docs-related tasks. GitHub repository metadata still did not expose a root repository license, so the repository-level license concern remains unclear.

Classification: `REVIEWED_HELD` / reviewed-held high-risk install/use command reference.

Decision: keep Vercel find-skills historical/reference-only and hold this upstream movement from active adoption. This review does not approve CLI execution, skill installation, use/update/sync behavior adoption, raw `SKILL.md` copying, method extraction, source copying, package changes, global config changes, product-repo changes, or runtime activation. Future upstream movement beyond `a561e790756b2785b9ddb82285c4eb0a08258ac9` requires a fresh review.
