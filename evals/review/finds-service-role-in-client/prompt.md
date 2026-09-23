---
description: "Next.js client component using the Supabase service-role key."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this admin page before I ship it. It lists all users for our admins.

```tsx
// app/admin/users/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => setUsers(data ?? []));
  }, []);
  return <ul>{users.map((u) => <li key={u.id}>{u.email}</li>)}</ul>;
}
```
