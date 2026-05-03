# Vercel find-skills

- URL: https://skills.sh/vercel-labs/skills/find-skills
- Purpose: Skill discovery workflow using skills.sh and the Skills CLI.
- Trust level: Medium-high source, medium execution risk.
- License if visible: Not visible on evaluated skill page.
- Commit / update activity: Directory record showed high install count and security audit badges during evaluation.
- Recommendation: Extract into methods.

## Useful Methods

Understand domain and task, check leaderboard, search when needed, verify quality using installs, source reputation, and stars, then present options for user review.

## Security Notes

The raw skill includes `npx skills find`, `npx skills add`, updates, and global install flags. Extract discovery heuristics only. Do not include installation automation.
