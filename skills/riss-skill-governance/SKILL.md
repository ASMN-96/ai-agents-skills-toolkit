---
name: riss-skill-governance
description: Internal helper for riss-governance skill selection, trigger checks, conflicts, and missing-skill preflight. Direct user calls must be redirected to riss-governance.
---

# RISS Skill Governance

## Internal Boundary

This is an internal helper for `riss-governance`. It is not a normal user-facing entrypoint.

If the user calls this helper directly, do not perform skill discovery or selection from here. Say that `riss-skill-governance` is internal and route the request through `riss-governance`.

## Purpose

Use this helper only when `riss-governance` needs a compact skill-routing or missing-capability check:

- Confirm whether a local toolkit-owned skill is relevant.
- Check trigger and negative-trigger fit before selecting an extra skill.
- Detect conflicts with external skill, plugin, install, activation, or global-config boundaries.
- Prepare missing-skill candidate preflight summaries.

## Extra Skill Selection Rule

Select an extra skill only when it materially improves at least one of:

- context needed to understand the artifact or domain
- safety for security, privacy, supply-chain, or public-data risk
- validation quality for runtime, tests, release, or review
- output quality for UI/UX, docs, product, or implementation planning

Do not select extra skills for low-risk typo edits, direct explanations, or cases where repo inspection is enough.

## Missing-Skill Preflight

For missing capability discovery, summarize candidates with:

- local capability status
- source and owner
- license status
- maintenance signal
- useful normalized pattern
- install or activation risk
- dangerous scripts or commands
- secret, network, or filesystem access risk
- recommendation and approval needed

Discovery stays read-only unless `riss-governance` receives explicit approval for a later write step.

## Output Budget

Return a short status summary to `riss-governance`. Do not paste full external skill files, full registries, or raw source text.
