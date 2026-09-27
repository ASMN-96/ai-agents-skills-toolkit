---
description: "React member list keeps showing the previous team after navigation because the effect's dependency array is empty."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Users switch teams from the sidebar and the member list still shows the old team's members until they hit refresh. Same component stays mounted, only `teamId` changes via the router. Here's the component:

```tsx
function TeamMembers({ teamId }: { teamId: string }) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetchMembers(teamId).then(setMembers);
  }, []);

  return (
    <ul>
      {members.map((m) => (
        <li key={m.id}>{m.name}</li>
      ))}
    </ul>
  );
}
```

Why is the list stale, and how do we fix it so it can't come back?
