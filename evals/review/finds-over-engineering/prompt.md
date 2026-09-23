---
description: "Strategy + factory around a single JSON clone; structuredClone exists and JSON cloning is lossy."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this refactor of our settings cloning, please.

```ts
interface CloneStrategy<T> { clone(value: T): T }

class JsonCloneStrategy<T> implements CloneStrategy<T> {
  clone(value: T): T { return JSON.parse(JSON.stringify(value)); }
}

class CloneStrategyFactory {
  static create<T>(): CloneStrategy<T> { return new JsonCloneStrategy<T>(); }
}

export function cloneSettings(s: Settings): Settings {
  return CloneStrategyFactory.create<Settings>().clone(s);
}
```
