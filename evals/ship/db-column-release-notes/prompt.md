---
description: "Release notes and rollback plan for a migration adding a nullable, backfilled column."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Write release notes and a rollback plan for this change: a migration adds a nullable `last_login_at` timestamp column to the `users` table, and a background job backfills it for existing rows over the next few hours after deploy.
