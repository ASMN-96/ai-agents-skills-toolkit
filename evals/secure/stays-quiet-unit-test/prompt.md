---
description: "Plain unit-test-writing request with no security surface named; should route to build/TDD workflows, not the secure audit route."
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [quiet]
---

Write a unit test for this reducer:

```ts
function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add':
      return { ...state, items: [...state.items, action.item] };
    case 'remove':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    default:
      return state;
  }
}
```
