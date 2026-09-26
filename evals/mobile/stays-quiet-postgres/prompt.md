---
description: "Backend database indexing question, not mobile work."
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [quiet]
---

Write a Postgres index for this query:

```sql
SELECT * FROM orders WHERE customer_id = $1 AND status = 'pending' ORDER BY created_at DESC;
```
