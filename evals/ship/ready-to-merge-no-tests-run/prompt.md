---
description: "Done claim with no test output given; must ask for verification instead of asserting it passed."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

I'm done with the feature, get it ready to merge. Summary of changes: added a `/api/export` endpoint that streams a user's orders as CSV, plus a `useExport` hook on the frontend that calls it. I didn't run the test suite yet, just eyeballed it in the browser.
