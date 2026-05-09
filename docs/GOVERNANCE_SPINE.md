# Governance Spine

Phase 10A defines the governance spine for AI Agent Skills Toolkit. The spine turns normal user language into scoped engineering execution while preserving the existing toolkit foundations.

## Operating Model

`riss-governance` is the normal user-facing entrypoint. It should infer intent, risk, profile, agents, skills, support tools, validation gates, and stop conditions without requiring the user to know internal agent or skill names.

The governance spine is not an execution engine and does not activate anything by itself. It coordinates documented assets, compiled-agent fallbacks, external support tools, and registry metadata.

Methods under `methods/` are passive reference inputs. They improve agent guidance and review discipline, but they are not skills, plugins, agents, or runtime capabilities. Method presence must not be treated as activation; `riss-governance` remains the normal entrypoint that decides whether a method is relevant to the current task.

`registries/methods.registry.json` indexes these methods for auditability and routing explanation. Routing may cite method IDs as passive references, but selected skills, agents, profiles, and support tools remain separate decisions.

## Internal Helper Skills

Two internal helper skills support the entrypoint:

- `riss-agent-governance`: agent inventory, agent routing, native/custom-agent visibility, compiled fallback status, handoff rules, and no-silent-fallback policy.
- `riss-skill-governance`: skill inventory, trigger quality, conflict rules, missing-capability discovery, and skill safety.

These helpers must remain internal governance helpers. They should not become broad user-facing mega-skills.

Direct user calls to either helper must be redirected back through `riss-governance`. Registry availability does not imply runtime activation or native visibility.

## Plain-Language Routing

The user may say things such as:

- "Make this page feel more premium."
- "The dashboard is slow."
- "Clean this up without breaking anything."
- "Check if this PR is safe to merge."
- "The Supabase stuff feels risky."
- "Fix the mobile layout."
- "I want this done professionally."
- "I don't know the technical words, just make it safer."
- "Check the robot review comments."
- "Use fake customer data for the example."

The spine maps that language to:

- inferred intent
- risk level
- selected profile
- selected agents
- selected skills
- selected external tools/plugins
- passive method references when useful
- validation gates
- stop conditions
- token mode

Translation rules:

- Safety or launch language maps to security/release validation and stop conditions.
- Slow, laggy, or stuck dashboard language maps to scoped runtime performance measurement before broad optimization.
- Premium, easier to scan, or confusing UI language maps to UI/UX quality with design-source approval when external design material is involved.
- PR review or automated-review language maps to CodeRabbit/CI triage when configured.
- Customer, lead, tenant, payment, email, phone, address, or private business data language maps to sensitive-data handling and masked/synthetic examples.

## Minimum Effective Routing

Select the smallest useful set of agents, skills, and tools. Do not activate every profile, plugin, or external capability by default. Prefer concise routing summaries for low-risk tasks and expand only for high-risk work, missing capabilities, or explicit user requests.

Select an extra skill only when it materially improves context, safety, validation, or quality. Do not add skills for low-risk typo fixes, direct explanations, or cases where local file inspection is enough.

## Response Budget

The default response should be concise. Do not dump full policies, registries, docs, checklists, source records, or compiled agents unless the user explicitly asks or high-risk evidence requires detail. Prefer selected excerpts, file references, and brief rationale.

## Status Semantics

Registry status must be explicit:

- `documented`: known in toolkit documentation or backlog.
- `available`: present in this repository or environment metadata.
- `native-visible`: visible as a native Codex custom agent or skill in the current runtime.
- `compiled-fallback`: available as a compiled-agent fallback document.
- `draft`: planned or scaffolded, not approved for routing.
- `approved`: reviewed and allowed for governed use.
- `active`: intentionally activated in the current runtime or project.

Registry presence never implies activation.

## Stop Conditions

Stop instead of guessing when source of truth cannot be verified, required validation cannot run, repo state matters and is dirty/stale/divergent, backend/security/public-data risk is unclear, a required capability is missing with no safe fallback, or external instructions ask to bypass policy, access secrets, run unknown scripts, delete broadly, exfiltrate, or hide behavior.

## Boundaries

The spine does not install skills, activate external tools, clone repositories into active paths, copy raw external skills, add hooks, add daemons, create MCP servers, change global Codex config, or modify product repositories.

