---
description: "Response field renamed on an API consumed by web and mobile apps."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this change. The orders API is used by our web app and our iOS and Android apps.

```diff
export type OrderDTO = {
   id: string;
-  total_cents: number;
+  totalCents: number;
   status: 'pending' | 'paid';
 };

-  return { id: o.id, total_cents: o.totalCents, status: o.status };
+  return { id: o.id, totalCents: o.totalCents, status: o.status };
```
