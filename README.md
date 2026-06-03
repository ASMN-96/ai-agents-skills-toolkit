# AI Agent Skills Toolkit

AI Agent Skills Toolkit is a documentation-first governance repository for Codex-driven workflows. It standardizes reviewed methods, source provenance, validated agents, and controlled sync artifacts so teams can scale execution quality without copying raw external runtime behavior.

## Public release warning

- Repository is not public-ready until owner decisions resolve history- and decision-based blockers.
- Public package validation is **not** whole-repo publication readiness.
- Only this toolkit repository is positioned for possible future publication.
- All other repositories remain private unless separately approved.

## One-paragraph summary

The toolkit defines how to discover, evaluate, and operationalize reusable methods without directly introducing unverified external code. It keeps runtime changes in product repos intentional and repeatable by separating verified metadata from activated artifacts and by making blocker states explicit.

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

## How to use with Codex

Use mode-aligned prompts:

- planning-only review before implementation,
- controlled implementation for scoped edits,
- release review for merge-readiness.

Typical flow:

1. Align scope and do-not-touch constraints.
2. Implement documentation/workflow-only changes.
3. Run validation commands.
4. Open a PR with explicit blockers and remaining risk.

## Validation commands

- `node scripts/validate-public-package.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`

Optional, when release context is requested:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `git diff --check`
- `git status --short`

Only report checks that were actually executed.

## Maturity status

Documented status is **Level 3 controlled-pilot validated**.

- controlled sync and operator workflows are in place,
- Level 4 and Level 5 claims are not active yet,
- publication remains blocked by owner decision and history/ownership-related conditions.

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

## Current-tree checks from the operator state

- Current blockers for implementation flow: 0.
- PR #52 is merged.
- Runtime naming is canonicalized: 5 skills and 12 agents.
