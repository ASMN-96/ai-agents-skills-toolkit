---
description: "Failing test with a stack trace — belongs to the debug route, not planning."
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [quiet]
---

This test is failing, can you fix it?

```
FAIL src/utils/formatDate.test.ts
  ✕ formats ISO date to MM/DD/YYYY (3 ms)

    Expected: "01/15/2026"
    Received: "15/01/2026"

      at Object.<anonymous> (src/utils/formatDate.test.ts:12:34)
```
