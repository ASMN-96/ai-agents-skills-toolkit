# Ultimate Toolkit

Curated skill routes for AI coding agents. Nine routes cover the main jobs (plan, build, UI/UX, debug, review, secure, data, mobile, ship). Each one is built from the best upstream skills, copied unmodified at pinned commits, deduplicated, and checked with real evals.

It works with Claude Code and Codex, and with other agents that read the [Agent Skills](https://agentskills.io) format (OpenCode, Cursor, Gemini CLI, Copilot, and more).

## Why routes, not a big pile of skills
Agents choose skills by reading every installed skill's description on every turn. Past a few dozen skills, descriptions overlap, the wrong one fires, and some are silently dropped from the list. So this toolkit exposes **one skill per route** (about 330 characters of listing space in total). Each route tells the agent which upstream material to read, in what order, and which rule wins when sources disagree.

## Routes
ROUTES_TABLE

`caveman` is opt-in only: run `/ultimate:caveman` (Claude Code) or ask for caveman mode. It shortens replies and never compresses code, commands, or errors.

## Install

**Claude Code**
```bash
claude plugin marketplace add ASMN-96/ai-agents-skills-toolkit
claude plugin install ultimate@ultimate-toolkit
```
Or inside a session: `/plugin marketplace add ASMN-96/ai-agents-skills-toolkit`, then `/plugin install ultimate@ultimate-toolkit`.

**Codex, OpenCode, Cursor, Gemini CLI, Copilot, and others**
```bash
npx skills add ASMN-96/ai-agents-skills-toolkit
```
Or copy the folders in `skills/` into your project's `.agents/skills/` (Codex and OpenCode read it).

Keep the rest of your skill list lean. Running a full workflow framework (GSD, the full Superpowers plugin, Everything Claude Code) next to these routes gives the agent two competing processes for the same job.

## Use
Ask for what you want in plain language; the matching route loads. To force one, name it (`/ultimate:uiux`, `/ultimate:review`, …). In Claude Code, `review` and `secure` hand the work to an independent read-only subagent (Opus, high effort); the other routes run in your conversation so they can ask you questions.

## Support status
| Agent | How it loads | Tested |
|---|---|---|
| Claude Code | Plugin: route skills + `review`/`secure` subagents | Plugin schema validated. Eval suite ready; model-in-the-loop results pending (see below). |
| Codex | Skills (`.agents/skills` or `npx skills`) | Smoke-tested: picked the review route, read its files, followed its output format. |
| Others | `npx skills add` | Install listing checked; behavior untested. |

## Evals
Each route has `claude plugin eval` cases in `evals/<route>/`: planted problems the route should catch, prompts where it must stay silent, and a pressure case (for example, "just approve it"). Graders are deterministic regex and tool checks. Every case runs with and without the plugin, and the report shows the difference.
```bash
claude plugin eval . --model sonnet --max-cost-usd 25
```
Eval runs need `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) or `ANTHROPIC_API_KEY`. The `evals` GitHub workflow runs the same suite on demand.

**Status:** EVAL_STATUS

## Tools
Routes never install tools. They use what your project already has and suggest the rest: Playwright and axe for UI checks, Vitest/Testing Library for tests, gitleaks/osv-scanner/semgrep for security, and the Supabase CLI for migrations. MCP servers such as Playwright MCP, Context7, or Supabase MCP are optional; add them to your agent yourself if you want them.

## What was left out, and why
EXCLUDED_TABLE

## Updating
`sources/lock.json` pins every upstream file by commit and sha256. A monthly workflow opens an issue only when a vendored file changes upstream. Changes are adopted only for bug fixes, new capabilities, or eval gains. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits and license
Toolkit files are MIT. Vendored files keep their own licenses (MIT or Apache-2.0), with a copy next to each; see [NOTICE.md](NOTICE.md) for every source and commit. Thanks to Addy Osmani, Anthropic, Jesse Vincent (Superpowers), Supabase, shadcn, Dietrich Gebert (Ponytail), and Julius Brussee (Caveman).
