---
description: "Review request for a finished diff, not an implementation task — must not fire the build route."
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [quiet]
---

Can you review this diff before I merge it? It touches our payment retry logic.

```ts
export function shouldRetry(attempt: number, error: Error) {
  return attempt < 3;
}
```
