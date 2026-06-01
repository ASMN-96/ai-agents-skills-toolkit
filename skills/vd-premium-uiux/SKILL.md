---
name: vd-premium-uiux
description: Compatibility alias for uiux. Use uiux for new prompts, docs, profiles, routing, and evals; keep this old VD alias only for existing prompt and project compatibility.
---

# VD Premium UI/UX

This skill is a compatibility alias.

- Canonical final skill: `uiux`.
- Prefer `uiux` in new prompts, docs, profiles, routing, and evals.
- Use the canonical skill's behavior, boundaries, stop conditions, token/context governance, completion evidence, and no-fake-validation rules.
- Do not treat this alias as a separate behavior fork.
- Old project-specific wording is compatibility context only, not the future public API.

When this alias is invoked, route to `uiux` and follow that skill's instructions. Keep compatibility aliases active until a later owner-approved migration proves they can be removed safely.
