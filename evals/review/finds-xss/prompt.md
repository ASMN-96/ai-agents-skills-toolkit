---
description: "User-controlled HTML rendered with dangerouslySetInnerHTML."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this profile bio component. Bios come from the user's settings form.

```tsx
export function Bio({ user }: { user: { bio: string } }) {
  return <div className="bio" dangerouslySetInnerHTML={{ __html: user.bio }} />;
}
```
