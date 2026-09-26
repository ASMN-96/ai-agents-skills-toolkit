---
description: "New projects table owned by individual users; needs a migration plus RLS so each user sees and edits only their own rows."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

I need a Postgres migration for a new `projects` table in my Supabase app:
`id uuid`, `owner_id uuid` (references `auth.users`), `name text`,
`created_at timestamptz`. Each user should only be able to see, create,
update, and delete their own projects — nobody else's. Write the migration
and the RLS policies.
