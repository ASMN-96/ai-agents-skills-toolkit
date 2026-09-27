---
description: "Make a three-tier pricing card row responsive from mobile to desktop."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

This pricing section shows three cards side by side and it's broken on phones — the text overflows and the cards get squeezed to almost nothing.

```tsx
<div className="flex flex-row gap-4">
  <PricingCard plan="Starter" price="$9" />
  <PricingCard plan="Team" price="$29" />
  <PricingCard plan="Enterprise" price="$99" />
</div>
```

Make it responsive.
