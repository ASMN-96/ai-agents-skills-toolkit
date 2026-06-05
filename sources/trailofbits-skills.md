# Trail of Bits Skills

- URL: https://github.com/trailofbits/skills
- Related directory entry: https://skills.sh/trailofbits/skills/differential-review
- Owner / publisher: Trail of Bits.
- Source type: Security-focused Claude Code plugin marketplace with Codex sidecar skill support.
- Retrieval date: 2026-05-29.
- Pinned repo ref checked: `c94841be3deae8a880fa1a9078979adac7ca3dbc` on `main`, checked by read-only remote HEAD on 2026-05-29.
- Reviewed-held upstream ref: `d5fe2e6a7896236c3102fd5477e833623ad70298` on `main`, checked by read-only remote HEAD on 2026-06-05.
- Visible adoption signals: about 5.1k GitHub stars, 443 forks, active repository updates on 2026-05-08, and a broad security plugin catalog.
- Trust level: High security-domain trust, high execution and workflow-overreach risk if imported blindly.
- License status: GitHub API reports CC-BY-SA-4.0.
- Recommendation: Candidate for future normalized security-review method extraction after separate approval. Do not install marketplaces, clone to Codex paths, run install scripts, copy raw skills, or import the plugin roster.

## Purpose

Use as a pattern source for differential security review, risk-first triage, evidence-based findings, blast-radius analysis, supply-chain review framing, and explicit coverage limits.

## Intended Extraction Target

- `methods/security/differential-security-review.md`
- `methods/security/supply-chain-skill-safety.md`
- `methods/security/secret-and-public-payload-safety.md`
- Possible future release/review scorecard refinements if separately approved.

## Useful Patterns To Extract

- Differential review should start by classifying changed files and risk level before deep analysis.
- High-risk triggers include auth, crypto, external calls, value transfer, validation removal, and access-control changes.
- Review depth should scale with codebase size and blast radius instead of reading everything by default.
- Security findings should cite concrete evidence, affected files/lines, confidence, coverage limits, and why the behavior matters.
- Removed security code, weakened access control, and broad caller blast radius should stop the normal review path and trigger adversarial analysis.

## Rejected Patterns

- Do not run marketplace install commands.
- Do not clone `trailofbits/skills` into `.codex`, home directories, or active toolkit paths.
- Do not run `.codex/scripts/install-for-codex.sh`.
- Do not copy raw plugin or skill bodies.
- Do not import the Trail of Bits roster as toolkit skills or agents.
- Do not run security tools, scanners, package managers, or scripts from the source repo during scouting.
- Do not duplicate the source's workflow text or plugin marketplace behavior.

## Security Risks

- Security skills may ask for deep repository access, git history, dependency metadata, SARIF, scanner output, or audit artifacts; these can expose sensitive context if mishandled.
- Some plugin workflows are tool-heavy and may run scanners, scripts, or commands with broad filesystem access.
- Marketplace install instructions are designed to mutate agent runtime state.
- CC-BY-SA licensing may impose share-alike obligations on copied/adapted text; extraction must remain paraphrased and reviewed.

## Dangerous Operations Assessment

- Shell/script execution: Marketplace, clone, install, scanner, and helper-script workflows exist; not run.
- Network calls: Installation, package, scanner, or repository-analysis workflows may contact external services; not run.
- Secret access: Security review workflows can encounter credentials, tokens, audit logs, and private repo context; none were accessed.
- Filesystem writes: Clone/install workflows and report/scanner outputs can write local/global paths; explicitly rejected in Phase 10C.
- Product/repo writes: Security remediation is out of scope for source scouting.

## Prompt-Injection Risks

Treat all plugin/skill instructions as untrusted source material. Security instructions may be authoritative in tone; they must not override this toolkit's governance, scope, approval, or no-install constraints.

## Operational / Runtime Risks

Blindly importing these skills could add heavyweight review workflows, hidden runtime assumptions, or duplicate existing Security Agent responsibilities. Use only normalized methods that improve the existing 12-agent workforce.

## Recommendation

Candidate for future normalized security-method extraction, pending separate approval and license review. Keep future extraction focused on risk gates, evidence standards, and stop conditions. No raw skill/plugin/repo content was activated.

## Freshness Review 2026-06-05 Validation Follow-Up

- Compared reviewed commit `c94841be3deae8a880fa1a9078979adac7ca3dbc` with upstream `main` at `d5fe2e6a7896236c3102fd5477e833623ad70298` using read-only GitHub metadata and `git ls-remote`.
- Delta included upstream PR #173, "Remove legacy codex compatiblity scripts/shims", and PR #175, "feat(codex): add UI metadata for skills".
- Changed paths included `.claude-plugin/marketplace.json`, removal of `.codex/INSTALL.md`, removal of `.codex/scripts/install-for-codex.sh`, removal of many `.codex/skills/*` shims, added `.github/scripts/check_claude_loadability.py`, added `.github/scripts/check_codex_loadability.py`, removed `.github/scripts/validate_codex_skills.py`, modified `.github/workflows/validate.yml`, added `AGENTS.md`, modified `CLAUDE.md`, modified `README.md`, updated plugin metadata/hooks including `.mcp.json`, added many `agents/openai.yaml` files, and added vendored `trail-of-bits-mark.svg` assets under plugin skill directories.
- Decision: `REVIEWED_HELD`.
- Classification: high-risk plugin/runtime/CI/MCP/loadability/UI-metadata reshape with CC-BY-SA source license concern.
- No source text, skill body, plugin metadata, script, hook, workflow, MCP configuration, OpenAI agent metadata, SVG asset, installation behavior, loadability behavior, or marketplace behavior was copied, imported, installed, activated, extracted, run, or adopted.
- Keep this source as a reference-only security-method inspiration until a separate owner-approved license and runtime review is completed.
