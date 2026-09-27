---
description: "Async callback in forEach: inserts are not awaited and errors are lost."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Quick review? This imports CSV rows into the DB.

```ts
export async function importRows(rows: Row[]) {
  rows.forEach(async (row) => {
    await db.insert('items', row);
  });
  return { imported: rows.length };
}
```
