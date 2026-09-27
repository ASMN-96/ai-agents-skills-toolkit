---
description: "Next.js API route that trusts a userId from the request body instead of the session for a refund action (BOLA/IDOR)."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Can you audit this route before we ship it? It's behind our normal auth middleware.

```ts
// app/api/orders/refund/route.ts
export async function POST(req: Request) {
  const { userId, orderId } = await req.json();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return Response.json({ error: 'not found' }, { status: 404 });

  await db.order.update({
    where: { id: orderId },
    data: { status: 'refunded', refundedBy: userId },
  });
  return Response.json({ ok: true, order });
}
```
