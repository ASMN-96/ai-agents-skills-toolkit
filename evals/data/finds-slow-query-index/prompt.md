---
description: "Slow query filtering an events table by org_id and created_at; needs an index recommendation, not just a rewritten query."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

This query is slow on our `events` table (20M rows, no indexes besides the
primary key):

```sql
select * from events
where org_id = $1 and created_at > $2
order by created_at desc
limit 50;
```

How do I speed this up?
