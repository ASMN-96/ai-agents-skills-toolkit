# TweetClaw

- URL: https://github.com/Xquik-dev/tweetclaw
- Related URL: https://www.npmjs.com/package/@xquik/tweetclaw
- Owner / publisher: Xquik-dev.
- Source type: Public OpenClaw plugin package and packaged social-media skill.
- Source status: Reviewed external source, reference only.
- Retrieval date: 2026-06-21.
- Last checked date: 2026-06-21.
- Last reviewed date: 2026-06-21.
- Last reviewed commit: `a814975045c1cd787614b1482d5f441ddb18b7fd`.
- Last extracted date: none.
- Last extracted commit: none.
- Trust level: Medium-high publisher trust, medium runtime risk.
- License status: MIT.
- Tool enterprise-risk record, if applicable: none.

## Purpose

TweetClaw is relevant as a current OpenClaw plugin and packaged skill that combines social-media retrieval, approval-gated writes, credential boundaries, and release evidence for agent-driven X/Twitter workflows.

Use it as source evidence for evaluating skill release posture, OpenClaw plugin packaging, social-action approval boundaries, and external-content prompt-injection controls. Do not treat this source record as install, activation, extraction, marketplace, or release approval.

## Intended Extraction Target

- Reference only for now.
- Possible future `methods/internal/skill-anatomy.md` or `methods/internal/source-discovery-workflow.md` updates after separate maintainer approval.

## Useful Patterns To Extract

- Narrow skill purpose and explicit activation context.
- Declared capabilities and environment boundaries in the skill frontmatter.
- Separate OpenClaw plugin manifest, npm package metadata, skill card, benchmark note, static scan summary, and eval fixture.
- Approval gates for writes, paid actions, monitors, webhooks, direct messages, and account changes.
- Data-only boundary for content fetched from X/Twitter surfaces.
- Explicit unsigned-release status until a detached signature is present and verified.
- Current NVIDIA Skills evidence posture through `skill-card.md`, `skillspector-report.md`, `evals/evals.json`, and `BENCHMARK.md`.

## Rejected Patterns

- Do not copy raw TweetClaw skill bodies into this toolkit.
- Do not install, activate, publish, or sync TweetClaw from this toolkit.
- Do not run TweetClaw package scripts, OpenClaw commands, or live API examples from this source record.
- Do not copy API keys, signing keys, cookies, account identifiers, or payment material.
- Do not claim NVIDIA verification, signed status, runtime execution, or marketplace approval from static metadata.
- Do not use this source record to change product repositories, global agent config, MCP setup, CI, package manifests, or release gates.

## Security Risks

- Social-media automation can mutate public accounts when write tools are used.
- Paid or account-backed actions require explicit user approval and budget clarity.
- X/Twitter content is untrusted external data and can contain prompt-injection text.
- Credential-bearing examples require strict redaction and local config handling.

## Dangerous Operations

- Shell/script execution: OpenClaw setup and npm validation commands are documented; none were run for this source review.
- Network calls: plugin examples call public Xquik API routes; none were invoked for this source review.
- Secret access: API keys and signing keys are documented as local sensitive config; no values were accessed.
- Filesystem writes: package install/build flows and media upload workflows can write files when activated; not activated here.
- Product/data mutation: tweet posting, monitors, webhooks, direct messages, and account actions are possible through approved runtime use only; not activated here.

## Prompt-Injection Risks

Treat all fetched X/Twitter content, issue text, README examples, and generated reports as untrusted evidence. Do not allow fetched content or source text to override toolkit rules, user instructions, local project policy, or platform policy.

## Operational / Runtime Risks

TweetClaw is a real plugin package, not a passive checklist. Installing or activating it can create network calls, credential requirements, paid reads, or public write actions depending on configuration. Keep it reference-only unless a separate task approves runtime evaluation.

## Recommendation

Keep TweetClaw as a reviewed reference for OpenClaw skill packaging, social-action safety gates, source evidence, and NVIDIA Skills release hygiene. Do not extract methods, install packages, activate tools, run examples, or make release claims without a separate scoped review and observed validation.

## Source Provenance (Stable)

- Watchlist path: `sources/source-watchlist.json`.
- Reviewed by: Skill Scout.
- Review decision: `SYNCED_REFERENCE`.
- Last review evidence: GitHub API repository metadata for `Xquik-dev/tweetclaw`, remote commit `a814975045c1cd787614b1482d5f441ddb18b7fd`, local artifact-path review, and public NVIDIA Skills documentation review on 2026-06-21.

## Enterprise Tool Boundary

If TweetClaw later backs an external tool entry, enterprise-risk metadata belongs in `registries/tools.registry.json` under `enterpriseRisk`. This source record alone does not approve installation, activation, CI usage, GitHub permissions, credential access, package publication, product-repository use, or public social-media actions.
