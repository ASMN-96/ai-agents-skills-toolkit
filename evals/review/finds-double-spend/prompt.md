---
description: "Check-then-update balance without a transaction; negative amounts accepted."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Please review our new withdraw function (Supabase JS client).

```ts
export async function withdraw(accountId: string, amount: number) {
  const { data: acct } = await supabase
    .from('accounts').select('balance').eq('id', accountId).single();
  if (acct.balance < amount) throw new Error('Insufficient funds');
  await supabase
    .from('accounts').update({ balance: acct.balance - amount }).eq('id', accountId);
}
```
