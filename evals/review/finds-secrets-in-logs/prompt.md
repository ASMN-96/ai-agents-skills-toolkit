---
description: "Request logger that writes all headers and bodies."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this logging middleware we're adding to the API.

```ts
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, headers: req.headers, body: req.body }, 'request');
  next();
});
```
