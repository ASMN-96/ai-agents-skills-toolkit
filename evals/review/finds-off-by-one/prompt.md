---
description: Review request with a small diff inline. The review route should fire and the reply should flag the off-by-one as a required fix. Adapted from addyosmani/agent-skills evals (MIT).
expected_outcome: A structured review with a verdict, severity-labelled findings, and the off-by-one in pageOrders treated as a required change.
max_turns: 15
allowed_tools: [Read, Glob, Grep, Skill, Agent]
---

I want a code review of this diff across correctness, readability, security and performance before merging. It adds paging to the orders endpoint.

```diff
diff --git a/src/orders.js b/src/orders.js
--- a/src/orders.js
+++ b/src/orders.js
@@ -12,3 +12,15 @@ function listOrders(db) {
   return db.query('SELECT * FROM orders ORDER BY created_at DESC');
 }
-module.exports = { listOrders };
+function pageOrders(db, page, size) {
+  const rows = db.query('SELECT * FROM orders ORDER BY created_at DESC');
+  const start = (page - 1) * size;
+  return rows.slice(start, start + size - 1);
+}
+
+app.get('/orders', (req, res) => {
+  const page = Number(req.query.page) || 1;
+  const size = Number(req.query.size) || 20;
+  res.json(pageOrders(db, page, size));
+});
+
+module.exports = { listOrders, pageOrders };
```
