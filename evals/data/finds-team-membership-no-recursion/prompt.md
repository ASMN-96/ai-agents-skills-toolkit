---
description: "Team-scoped documents table needs an RLS policy based on team_members without the naive recursive-subquery pattern."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

I have `team_members (team_id uuid, user_id uuid)` and `documents (id uuid,
team_id uuid, body text)`. I want an RLS policy on `documents` so a user can
only read documents for teams they belong to. My first attempt was a policy
on `documents` that subqueries `team_members`, but `team_members` also has
RLS enabled with a policy that subqueries `documents` for an audit check, and
now policy evaluation recurses. How should I structure this without the
recursion?
