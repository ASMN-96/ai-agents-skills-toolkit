---
description: "Threat model for an LLM feature that lets users paste a URL which the agent fetches and summarizes back into the conversation (SSRF + prompt injection)."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

We're adding a feature: the user pastes a URL into the chat, our server fetches the page server-side, and feeds the page text back into the same LLM conversation as context so it can summarize or answer questions about it. Can you threat model this before we build it?
