---
name: riss-agent-governance
description: Internal helper for riss-governance agent routing, native/fallback status, handoff checks, and no-silent-fallback enforcement. Direct user calls must be redirected to riss-governance.
---

# RISS Agent Governance

## Internal Boundary

This is an internal helper for `riss-governance`. It is not a normal user-facing entrypoint.

If the user calls this helper directly, do not perform routing from here. Say that `riss-agent-governance` is internal and route the request through `riss-governance`.

## Purpose

Use this helper only when `riss-governance` needs a compact agent-routing check:

- Map the task intent and risk to the minimum useful agent set.
- Report native custom-agent availability or compiled fallback status.
- Enforce no silent fallback.
- Identify when high-risk work must stop before fallback.
- Keep handoffs narrow and tied to the user-approved scope.

## Routing Checks

- Select only agents that materially improve context, safety, validation, or quality.
- Do not add agents for low-risk typo, wording, or metadata edits unless risk changes.
- Stop if a required native agent is unavailable and the matching compiled fallback is also missing.
- For backend, security, public-data, release, or migration risk, ask before falling back from native agent to compiled instructions unless fallback was already approved.
- Never add new core agents from this helper.

## Output Budget

Return a short status summary to `riss-governance`:

- selected agents
- unavailable agents
- fallback status
- stop condition, if any

Do not dump full agent registries or compiled-agent text.
