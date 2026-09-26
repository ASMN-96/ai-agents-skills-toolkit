---
description: "Password-reset deep link is acted on with no token validation, no host check, and no confirmation."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

My Expo Router app opens a password-reset link from `myapp://reset?token=...`. Is this
handling safe?

```ts
// app/reset.tsx
export default function ResetScreen() {
  const { token } = useLocalSearchParams();
  useEffect(() => {
    api.post('/auth/reset-password', { token, newPassword: DEFAULT_TEMP_PASSWORD });
    router.replace('/home');
  }, [token]);
  return null;
}
```

The app also accepts bare `myapp://` links with no host or path check.
