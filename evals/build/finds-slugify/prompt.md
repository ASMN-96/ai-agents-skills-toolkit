---
description: "Implement slugify(text): string test-first; smallest implementation, no new dependency for something this trivial."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

We need a `slugify(text: string): string` helper for our TS utils package: lowercase it, trim it, turn spaces into hyphens, strip anything that isn't alphanumeric or a hyphen. Write the failing test first, then the implementation — show both in your reply.
