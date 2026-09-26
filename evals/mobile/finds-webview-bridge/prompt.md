---
description: "React Native WebView loads any origin and trusts every bridge message unfiltered."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this Expo screen. It opens partner pages that can sign the user in and trigger a
reward payout.

```tsx
<WebView
  source={{ uri: route.params.url }}
  originWhitelist={['*']}
  javaScriptEnabled
  onMessage={(e) => {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg.type === 'setToken') SecureStore.setItemAsync('token', msg.token);
    if (msg.type === 'payout') triggerPayout(msg.amount, msg.accountId);
  }}
/>
```
