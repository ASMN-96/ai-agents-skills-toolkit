---
name: ai-project-governance
description: Compatibility alias for governance. Use governance for new prompts, docs, profiles, routing, and evals; keep this alias only for existing prompts and project sync compatibility.
---

# AI Project Governance

This skill is a compatibility alias.

- Canonical final skill: `governance`.
- Prefer `governance` in new prompts, docs, profiles, routing, and evals.
- Use the canonical skill's behavior, boundaries, stop conditions, token/context governance, completion evidence, and no-fake-validation rules.
- Do not treat this alias as a separate behavior fork.
- Old project-specific wording is compatibility context only, not the future public API.

When this alias is invoked, route to `governance` and follow that skill's instructions. Keep compatibility aliases active until a later owner-approved migration proves they can be removed safely.
