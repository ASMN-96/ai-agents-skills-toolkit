# Ultimate Toolkit

Curated skill routes for AI coding agents. Nine routes cover the main jobs (plan, build, UI/UX, debug, review, secure, data, mobile, ship). Each one is built from the best upstream skills, copied unmodified at pinned commits, deduplicated, and given an eval suite per route.

It works with Claude Code and Codex, and with other agents that read the [Agent Skills](https://agentskills.io) format (OpenCode, Cursor, Gemini CLI, Copilot, and more).

## Why routes, not a big pile of skills
Agents choose skills by reading every installed skill's description on every turn. Past a few dozen skills, descriptions overlap, the wrong one fires, and some are silently dropped from the list. So this toolkit exposes **one skill per route**: nine descriptions, about 3,000 characters of listing space in total, checked on every change. Each route tells the agent which upstream material to read, in what order, and which rule wins when sources disagree.

## Routes
| Route | Use it for | Runs as | Built from |
|---|---|---|---|
| `plan` | Idea → spec, acceptance criteria, small tasks, API design | Your conversation | Addy Osmani: spec-driven-development, planning-and-task-breakdown, api-and-interface-design |
| `build` | Implementing features: failing test first, small steps, least code | Your conversation | Addy Osmani: test-driven-development, incremental-implementation · Ponytail |
| `uiux` | Design direction, accessibility (WCAG 2.2 AA), responsive layout, Core Web Vitals, browser checks | Your conversation | Anthropic frontend-design · Addy Osmani web-quality (accessibility, core-web-vitals) · shadcn/ui |
| `debug` | Bugs, failing tests, crashes: root cause, then a regression test | Your conversation | Superpowers systematic-debugging · Addy Osmani observability, error recovery |
| `review` | Reviewing a diff or PR before merge | Subagent without edit tools (Opus, high effort) | Addy Osmani code-review-and-quality · Ponytail review |
| `secure` | Security audit and threat model: auth, RLS, secrets, dependencies, CI, LLM features | Subagent without edit tools (Opus, high effort) | Addy Osmani security-and-hardening · toolkit notes on OWASP, Supabase RLS, CI |
| `data` | Supabase/Postgres schema, migrations, RLS policies, query performance | Your conversation | Supabase's official agent skills |
| `mobile` | React Native/Expo/native apps, WebViews, deep links, store readiness | Your conversation | Toolkit-written checklists (no upstream mobile skill passed review) |
| `ship` | Verify before "done", PR descriptions, release notes, rollback | Your conversation | Superpowers verification-before-completion, finishing-a-development-branch |

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

Upgrading from v0.2 of this toolkit? Remove its old globally installed skills and agents first (for Codex: `~/.codex/skills/{governance,uiux,code-quality,security-review,pr-release-gate}` and the `*-agent.toml` files in `~/.codex/agents`). The old `uiux` skill has the same name as the new route, and the old ones still get loaded next to the new routes.

Keep the rest of your skill list lean. Running a full workflow framework (GSD, the full Superpowers plugin, Everything Claude Code) next to these routes gives the agent two competing processes for the same job.

## Use
Ask for what you want in plain language; the matching route loads. To force one, name it (`/ultimate:uiux`, `/ultimate:review`, …). In Claude Code, `review` and `secure` hand the work to an independent subagent with no file-editing tools (Opus, high effort); the other routes run in your conversation so they can ask you questions.

## Support status
| Agent | How it loads | Tested |
|---|---|---|
| Claude Code | Plugin: route skills + `review`/`secure` subagents | Plugin schema validated. Eval suite ready; model-in-the-loop results pending (see below). |
| Codex | Skills (`.agents/skills` or `npx skills`) | Smoke-tested with `codex exec`, one prompt per route. `review`, `build`, `data`, and `mobile` loaded their route and followed it. The test machine also had about 200 other skills installed (old copies with the same names, full Superpowers, and more), and the other prompts went to those skills or were answered directly. A clean measurement needs a Codex profile without other skills. |
| Others | `npx skills add` | Install listing checked; behavior untested. |

## Evals
Each route has `claude plugin eval` cases in `evals/<route>/`: planted problems the route should catch, prompts where it must stay silent, and a pressure case (for example, "just approve it"). Graders are deterministic regex and tool checks. Every case runs with and without the plugin, and the report shows the difference.
```bash
claude plugin eval . --model sonnet --max-cost-usd 25
```
Eval runs need `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token`) or `ANTHROPIC_API_KEY`. The `evals` GitHub workflow runs the same suite on demand.

**Status:** suites for every route are written (59 cases, 207 deterministic grader patterns), but model-in-the-loop results are not published yet because running them needs one of the tokens above. Until they run, the routes are reviewed but unmeasured, which is why the current release is `v1.0.0-rc.1`.

## Tools
Routes never install tools. They use what your project already has and suggest the rest: Playwright and axe for UI checks, Vitest/Testing Library for tests, gitleaks/osv-scanner/semgrep for security, and the Supabase CLI for migrations. MCP servers such as Playwright MCP, Context7, or Supabase MCP are optional; add them to your agent yourself if you want them.

## What was left out, and why
| Source | Why |
|---|---|
| GSD, the full Superpowers plugin, Everything Claude Code | Whole workflow frameworks (dozens to hundreds of skills) that compete with the routes. Single Superpowers skills are used instead. |
| Caveman engine, proxy, and binaries | BSL-1.1 license and telemetry. Only the MIT skill is included. |
| Trail of Bits skills | CC-BY-SA text, sub-agents, and large Python tooling. Their review ideas inform `secure` in our own words. |
| Vercel agent-skills, Karpathy-inspired skills | No license file. |
| openai/skills | Deprecated upstream. |
| Anthropic docx/pdf/pptx/xlsx | Proprietary license. |
| Matt Pocock to-spec, grill-with-docs, git-guardrails | User-only shims, issue-tracker coupling, or a hook install. |
| Uncodixfy, UI UX Pro Max | Contradict frontend-design and shadcn; bundled Python database. |
| Anthropic webapp-testing | Python scripts; `uiux` uses your project's Playwright instead. |
| Expo skills, Callstack React Native skills | A 21-skill router with hooks, MCP, and a feedback CLI; performance-only scope. |

## Updating
`sources/lock.json` pins every upstream file by commit and sha256. A monthly workflow opens an issue only when a vendored file changes upstream. Changes are adopted only for bug fixes, new capabilities, or eval gains. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Credits and license
Toolkit files are MIT. Vendored files keep their own licenses (MIT or Apache-2.0), with a copy next to each; see [NOTICE.md](NOTICE.md) for every source and commit. Thanks to Addy Osmani, Anthropic, Jesse Vincent (Superpowers), Supabase, shadcn, Dietrich Gebert (Ponytail), and Julius Brussee (Caveman).
