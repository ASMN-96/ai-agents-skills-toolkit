# Contributing

This toolkit stays useful by staying small. Every change should make a route measurably better or keep it correct.

## Change a route
1. Edit `skills/<route>/SKILL.md` or its toolkit-authored `references/`. Keep the description ≤250 characters and the body ≤120 lines.
2. Add or update cases in `evals/<route>/` (deterministic `regex` / `tool_used` graders; one must-not-fire case per route).
3. Run the checks below and paste their output in the PR.

## Add or update an upstream skill
1. Pick one base author per route. Check the license file itself (not the GitHub label); MIT and Apache-2.0 are fine; no license, proprietary, or share-alike text is not.
2. Check closure: everything the skill references (other skills, files, scripts, hooks, MCP servers) must come with it, be overridden by a precedence note in the route, or the skill is rejected.
3. Add the source and files to `sources/lock.json`, then run `node scripts/vendor.mjs` (or `node scripts/vendor.mjs --bump owner/repo` to move to upstream HEAD). Never edit vendored files by hand.
4. Adopt an upstream change only for a bug fix, a new capability, or an eval gain. Never merge an eval regression.

The monthly `upstream` workflow opens an issue only when a vendored file changed or disappeared upstream.

## Checks
```bash
node scripts/validate.mjs
claude plugin validate .claude-plugin/plugin.json --strict
claude plugin eval . --model sonnet --max-cost-usd 25
```
`claude plugin eval` needs `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) or `ANTHROPIC_API_KEY` in the environment. Say which checks you ran and which you skipped.

## Writing skills
Anthropic's `skill-creator` skill (anthropics/skills) is a good guide to descriptions, progressive disclosure, and skill evals. Adding a script, doc, or validator rule means removing one.
