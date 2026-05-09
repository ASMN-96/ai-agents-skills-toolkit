# Token Efficiency Policy

Token efficiency is part of toolkit quality. Governance should add judgment and routing, not burn context with repeated registry dumps.

## Token Modes

- `concise`: low-risk or small tasks. Provide a short routing summary and direct next action.
- `standard`: normal implementation, review, or planning. Include selected profile, agents, tools, validation, and stop conditions.
- `detailed`: high-risk backend/security/data work, missing capabilities, release decisions, source intake, or user-requested detail.

## Default Behavior

Start concise. Expand only when risk, uncertainty, missing capability, or user request justifies it.

## Strict Response Budget

- `concise`: one routing line plus the direct answer, action, or validation note.
- `standard`: selected profile, agents/helpers, tools, stop conditions, and validation plan.
- `detailed`: only for high-risk evidence, missing capability, release/security decisions, or explicit user request.

Never paste full policies, registries, docs, checklists, source records, or compiled agents by default. Summarize the relevant decision and cite the file when stable detail exists.

## Tool Minimization

Use tools only when they materially improve source truth, implementation, validation, or safety. Do not call every plugin or route every task to every agent.

## Reference Loading

Load references on demand:

- low-risk tasks: rely on the concise routing summary
- standard tasks: load only the relevant registry entries and policy excerpts
- high-risk tasks: load source-of-truth, risk, validation, and stop-condition references

## Avoiding Context Burn

Do not paste full registries into chat. Summarize selected entries. Avoid repeating standing policies unless they changed the decision. Prefer file references for stable detail.

## Expansion Triggers

Expand to detailed mode when:

- backend, database, RLS, auth, privacy, public payloads, release, or security risk is present
- repo state or source truth is questionable
- a required skill/tool/agent is missing
- external source discovery is needed
- validation cannot be run
- multiple interpretations would change behavior

## Low-Risk Typo Guard

For typo, wording, punctuation, small link, or small metadata edits:

- keep routing to `riss-governance` plus at most `reviewer-agent`
- avoid extra helpers, support tools, browser checks, and registry expansion unless the edit changes policy meaning or public behavior
- validate by reviewing the target file and diff
- report in one or two sentences

