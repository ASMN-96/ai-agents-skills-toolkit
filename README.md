# AI Vibe Coding Toolkit

AI Vibe Coding Toolkit is a documentation-first governance repository for AI coding-agent workflows. It standardizes reviewed methods, source provenance, validated agents, activation boundaries, and controlled sync artifacts so teams can scale high-quality AI-assisted engineering without copying raw external runtime behavior.

## Public release status

- Current-tree blockers are 0.
- Remaining findings are limited to owner-decision blockers, history-only blockers, safe guardrail/scanner evidence, and false positives.
- Public package validation is **not** whole-repo publication readiness.
- `v0.2.3` is the current controlled AI Vibe Coding Toolkit release for agent-assisted governance after full resource refresh, zero passive source holds, toolkit activation hardening, leak-scan check-mode validation, and release gates.
- Public-facing release status is based on observed validation evidence; external submissions and publication channels are separate approval-gated decisions.

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

Current canonical runtime is **5 skills + 12 agents**.

## Quick start

1. Read `AGENTS.md` and `README.md`.
2. Read `docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md` and `docs/NO_FAKE_VALIDATION_POLICY.md`.
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

For real projects, treat the toolkit as an AI coding-agent governance and evidence layer. Select or recommend the 5 canonical skills and 12 repo-local project agents explicitly where this runtime is used, report which agents actually spawned separately, and use project-owned checks before proposing new tools.

## Validation commands

- `node scripts/validate-public-package.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`

Optional, when release context is requested:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `git diff --check`
- `git status --short`

Only report checks that were actually executed.

## External-facing status

Public-facing status:

- Canonical runtime is **5 skills and 12 agents**.
- Public package validation can pass while still not proving whole-repo publication readiness.
- `v0.2.3` is a controlled toolkit release, not a claim of higher maturity, enterprise or production certification, automatic installs, or broad cross-runtime active support.
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
