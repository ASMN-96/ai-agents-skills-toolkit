---
description: "Search endpoint interpolating user input into SQL and exposing emails without auth."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Please review this before I merge. It adds user search to our Express API.

```ts
router.get('/users/search', async (req, res) => {
  const q = req.query.q as string;
  const { rows } = await pool.query(
    `SELECT id, email, full_name FROM users WHERE email ILIKE '%${q}%' OR full_name ILIKE '%${q}%'`
  );
  res.json(rows);
});
```
