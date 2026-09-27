---
description: "Node handler crashes the whole process: the promise chain has no catch, so any downstream failure becomes an unhandled rejection."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Our orders endpoint keeps crashing the whole server, not just returning a 500. Here's the handler and the crash log:

```ts
app.post('/api/orders', (req, res) => {
  createOrder(req.body).then((order) => {
    res.status(201).json(order);
  });
});

async function createOrder(payload: OrderInput) {
  const total = await pricingService.calculate(payload.items);
  return db.orders.insert({ ...payload, total });
}
```

```
(node:41213) UnhandledPromiseRejectionWarning: TypeError: pricingService.calculate is not a function
    at createOrder (src/orders.ts:9:34)
    at src/routes/orders.ts:5:20
(node:41213) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by
throwing inside of an async function without a catch block, or by rejecting a promise which was not handled.
(node:41213) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise
rejections that are not handled will terminate the Node.js process with a non-zero exit code.
```

Why does this take the whole server down, and how do we fix it?
