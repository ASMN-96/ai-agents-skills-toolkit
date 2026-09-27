---
description: "Supabase migration whose RLS policies expose all messages and allow sender spoofing."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this Supabase migration for our chat feature, please.

```sql
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users,
  recipient_id uuid not null references auth.users,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;

create policy "messages are readable" on public.messages
  for select using (true);

create policy "users can send" on public.messages
  for insert with check (auth.uid() is not null);
```
