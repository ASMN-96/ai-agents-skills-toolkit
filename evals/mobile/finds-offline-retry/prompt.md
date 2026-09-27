---
description: "Expo screen only handles the happy path; needs offline/error/retry states."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

This Expo screen only handles the happy path. Show me how to make it work when the
network is flaky or offline — give me the updated code in your reply.

```tsx
function OrdersScreen() {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    fetch('/api/orders').then(r => r.json()).then(setOrders);
  }, []);
  if (!orders) return <ActivityIndicator />;
  return <FlatList data={orders} renderItem={renderOrder} />;
}
```
