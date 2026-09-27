---
description: "Add page/pageSize params to an API handler with a boundary test."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Add `page` and `pageSize` query params to our Node/Express `GET /api/items` handler below, with a test for out-of-range values (page 0, a huge pageSize). Write the failing test first, then the updated handler — show both in your reply.

```ts
app.get('/api/items', async (req, res) => {
  const items = await db.items.findAll();
  res.json(items);
});
```
