---
description: "Authenticated invoice fetch that never checks ownership (BOLA/IDOR)."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Can you review this new endpoint? requireAuth already validates the session.

```ts
app.get('/api/invoices/:id', requireAuth, async (req, res) => {
  const invoice = await db.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) return res.status(404).end();
  res.json(invoice);
});
```
