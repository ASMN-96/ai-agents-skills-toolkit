# AI Vibe Coding Toolkit

<!-- v0.3-release-evidence:start -->
> Release evidence: candidate `0.3.0` is **BLOCKED**; controlled release remains `0.2.5`. Static benchmark: **PASS** (100.0% competency, 100.0% gates, 100.0% golden routing, 66.0% median input-token reduction). Sources: 72 actionable globally, 0 release-blocking for enterprise-core, 72 release-nonblocking, 8 approved receipts. Runtime: 5 skills, 15 native agents, 15 compiled fallbacks; host bridge preview-contract, trusted readiness ceiling blocked. Advisories: Optional-source limitations remain advisory and do not change the enterprise-core release scope. Preview platform packs lack native evidence and remain preview; they cannot make a supported-runtime claim. The v0.3 fail-closed bridge contract cannot yield trusted readiness or turn standalone JSON into execution proof.
<!-- v0.3-release-evidence:end -->

AI Vibe Coding Toolkit is a documentation-first governance repository for AI coding-agent workflows. It standardizes reviewed methods, source provenance, validated agents, activation boundaries, and controlled sync artifacts so teams can scale high-quality AI-assisted engineering without copying raw external runtime behavior.

## Public release status

- Current v0.3 candidate release blockers are recorded in `docs/V0_3_0_RELEASE_EVIDENCE.json`.
- The machine-readable evidence record is authoritative; prose summaries intentionally do not duplicate its mutable blocker list.
- Public package validation is **not** whole-repo publication readiness.
- `v0.2.5` is the current controlled release. The untagged v0.3 candidate adds an executable enterprise delivery kernel for bounded resource routing, team design, context and memory governance, domain quality gates, and truthful evidence accounting.
- v0.3 ships a fail-closed bridge contract, not a trusted host runtime: standalone JSON cannot mint trusted readiness, platform packs remain preview, and there is no production-proven or enterprise-impact claim.
- Public-facing release status is based on observed validation evidence; external submissions and publication channels are separate approval-gated decisions.
- See `STATUS.md` for the current boundary snapshot and `MIGRATION.md` for version migration notes.
- This repository intentionally has no root `package.json`; run direct `node scripts/...` commands from the repository root.

## One-paragraph summary

The toolkit defines how to discover, evaluate, and operationalize reusable AI coding-agent methods without directly introducing unverified external code. It can support workflows around Codex, Claude Code, local project agents, and similar assistants while keeping runtime changes intentional and repeatable through verified metadata, explicit approvals, and observable validation.

## Who it is for

- engineering leads who need predictable agent behavior across projects,
- platform teams that need provenance and review standards,
- security and governance owners requiring evidence-linked approvals,
- startup/product operators preparing for controlled pilots and future releases.

## Problem it solves

- unstructured agent onboarding from external repositories,
- hidden assumptions between prompts, artifacts, and runtime behavior,
- weak source provenance and stale method risk,
- inconsistent documentation and validation language across teams.

## Core concepts

- **Skills**: reviewed external method artifacts represented as supply-chain inputs, not default runtime activators.
- **Agents**: scoped bundles of rules, prompts, and workflows built from approved skills.
- **Profiles**: context templates that adapt validated artifacts to stack, risk level, and operating mode.
- **Registries**: metadata indexes for methods, tools, routing, and governance assets.
- **Validators**: command-gated checks for runtime consistency, package surface rules, and public/private safety policy.
- **Source records**: explicit provenance records (license, freshness, trust review, extraction limits).

Current v0.3 candidate runtime is **5 skills + 15 repo-local agent files**, with a compiled fallback for every agent. The backend implementation, mobile platform, and desktop platform specialists remain preview until bounded native pilots are explicitly completed. Agent file presence, inline compiled-fallback availability, registry recommendation, native runtime/tool support, and actual spawned-agent proof are separate facts.

## Quick start

1. Read `AGENTS.md` and `README.md`.
2. Read `docs/ENTERPRISE_DELIVERY_KERNEL.md`, `docs/AGENT_PORTFOLIO_ASSESSMENT_V0_3.md`, `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md`, and `docs/NO_FAKE_VALIDATION_POLICY.md`.
3. Run required validation commands (below).
4. Edit only in scope and report warnings before PR.

## How to use with AI coding agents

Use mode-aligned prompts:

- planning-only review before implementation,
- controlled implementation for scoped edits,
- release review for merge-readiness.

Typical flow:

1. Align scope and do-not-touch constraints.
2. Implement documentation/workflow-only changes.
3. Run validation commands.
4. Open a PR with explicit blockers and remaining risk.

For a machine-readable delivery recommendation, copy `templates/delivery-kernel.request.example.json`, replace its all-zero `repository.expectedCommit` placeholder with the target repository's current full 40-character Git SHA, and run `node scripts/ai-toolkit/run-delivery-kernel.mjs plan --input <request.json>`. The committed template cannot self-pin because changing its own commit field creates a new commit. Planning emits a recommendation; it does not activate or invoke the recommended resources.

For real projects, treat the toolkit as an AI coding-agent governance and evidence layer. Let the kernel select the minimum complete set from the 5 canonical skills and 15 repo-local project agent lenses, report TOML file presence, compiled fallback presence, inline fallback use, and actually spawned agents separately, and use project-owned checks before proposing new tools.

## Validation commands

- `node scripts/validate-public-package.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`

Optional, when release context is requested:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/ai-toolkit/run-delivery-kernel-evals.mjs`
- `node scripts/ai-toolkit/run-enterprise-delivery-benchmark.mjs --summary`
- `git diff --check`
- `git status --short`

Only report checks that were actually executed.

There is no dependency install step for the toolkit itself. Do not run `npm install`, create a root package manifest, or activate hooks unless a separate owner-approved task changes that architecture.

## External-facing status

Public-facing status:

- The v0.3 candidate runtime is **5 skills and 15 native agent definitions**, with **15 compiled fallbacks** and three preview specialists.
- The v0.3 fail-closed bridge contract cannot turn standalone JSON into trusted readiness; platform packs remain preview and no production-proven or enterprise-impact claim is made.
- Public package validation can pass while still not proving whole-repo publication readiness.
- `v0.2.5` remains the controlled toolkit release until a reviewed v0.3 commit passes the release profile and receives explicit tag/release authorization.
- External submissions, marketplace listings, package publication, and broader runtime support remain separate approval-gated actions.

## Limitations

- Not a product runtime.
- Does not replace project application logic.
- Does not automatically activate external skills or tools.
- Public package validation is not full-release proof.

## Contribution path

1. Open an issue with clear scope and expected evidence.
2. Propose docs and workflow edits in a PR.
3. Include validation output and unresolved blockers.
4. Keep changes limited to governance and documentation artifacts.

## License

This repository uses the root `LICENSE`.
