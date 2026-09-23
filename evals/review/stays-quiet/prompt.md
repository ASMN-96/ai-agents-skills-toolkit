---
description: A test-first request that is not a review. The review route must not fire. Adapted from addyosmani/agent-skills evals (MIT).
expected_outcome: The reply proposes a failing test first; the review skill is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

Write a failing test for this bug before we fix it: splitCents(100, 3) returns [33, 33, 33] and a cent goes missing.
