---
name: app-security-review
description: Compatibility alias for security-review. Use security-review for new prompts, docs, profiles, routing, and evals; keep this alias only for existing app security prompts and project compatibility.
---

# App Security Review

This skill is a compatibility alias.

- Canonical final skill: `security-review`.
- Prefer `security-review` in new prompts, docs, profiles, routing, and evals.
- Use the canonical skill's behavior, boundaries, stop conditions, token/context governance, completion evidence, and no-fake-validation rules.
- Do not treat this alias as a separate behavior fork.
- Old project-specific wording is compatibility context only, not the future public API.

When this alias is invoked, route to `security-review` and follow that skill's instructions. Keep compatibility aliases active until a later owner-approved migration proves they can be removed safely.
