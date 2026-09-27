---
description: "PR description request with real test output already given; checks the output follows the what/why/how-verified/risk template."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Write the PR description for this change. It replaces our hand-rolled retry loop around the payments webhook handler with the `p-retry` library, same backoff settings. I ran the suite just now: `npm test` → 142 passed, 0 failed. I have not tested it against the sandbox payment provider yet.
