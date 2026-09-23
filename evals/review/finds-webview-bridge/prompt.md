---
description: "React Native WebView loading any URL and trusting every bridge message."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Review this React Native screen. It opens partner pages that can sign the user in.

```tsx
<WebView
  source={{ uri: route.params.url }}
  originWhitelist={['*']}
  javaScriptEnabled
  onMessage={(e) => {
    const msg = JSON.parse(e.nativeEvent.data);
    if (msg.type === 'setToken') SecureStore.setItemAsync('token', msg.token);
    if (msg.type === 'navigate') navigation.navigate(msg.screen);
  }}
/>
```
