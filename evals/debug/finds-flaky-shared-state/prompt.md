---
description: "Test suite passes alone but fails randomly in CI: a module-level store is shared and never reset between tests."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

This suite passes every time I run it alone, but fails randomly in CI and the failing test changes depending on run order:

```ts
// discountStore.ts
export const discountStore = new Map<string, number>();

// discount.test.ts
import { discountStore } from './discountStore';
import { applyDiscount } from './discount';

describe('applyDiscount', () => {
  it('gives SAVE10 a 10% discount', () => {
    discountStore.set('SAVE10', 10);
    expect(applyDiscount(100, 'SAVE10')).toBe(90);
  });

  it('gives WELCOME a 20% discount and nothing else is set', () => {
    discountStore.set('WELCOME', 20);
    expect(applyDiscount(100, 'WELCOME')).toBe(80);
    expect(discountStore.size).toBe(1); // fails if the SAVE10 test ran first in this file or CI shards them together
  });
});
```

What's actually going on, and how do we fix it so this can't happen again?
