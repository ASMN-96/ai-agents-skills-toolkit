---
name: riss-release-gate
description: Compatibility alias for pr-release-gate. Use pr-release-gate for new prompts, docs, profiles, routing, and evals; keep this old RISS alias only for existing prompt and project compatibility.
---

# RISS Release Gate

This skill is a compatibility alias.

- Canonical final skill: `pr-release-gate`.
- Prefer `pr-release-gate` in new prompts, docs, profiles, routing, and evals.
- Use the canonical skill's behavior, boundaries, stop conditions, token/context governance, completion evidence, and no-fake-validation rules.
- Do not treat this alias as a separate behavior fork.
- Old project-specific wording is compatibility context only, not the future public API.

When this alias is invoked, route to `pr-release-gate` and follow that skill's instructions. Keep compatibility aliases active until a later owner-approved migration proves they can be removed safely.
