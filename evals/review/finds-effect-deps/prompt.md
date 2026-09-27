---
description: "React effect missing userId dependency and cleanup (stale data, race)."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this React component change, please.

```tsx
function Profile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    fetch(`/api/users/${userId}`).then((r) => r.json()).then(setUser);
  }, []);
  return user ? <h1>{user.name}</h1> : <Spinner />;
}
```
