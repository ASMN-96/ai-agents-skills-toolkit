# Registry Contract

Registries are machine-readable indexes of reviewed toolkit assets, planned assets, and external support capabilities. They are metadata only. Presence in a registry does not install, activate, approve, or execute anything.

## Required Registries

- `registries/agents.registry.json`
- `registries/skills.registry.json`
- `registries/methods.registry.json`
- `registries/profiles.registry.json`
- `registries/tools.registry.json`
- `registries/routing-matrix.json`

## Status Values

Use explicit status arrays where more than one state applies:

- `documented`
- `available`
- `native-visible`
- `compiled-fallback`
- `draft`
- `approved`
- `active`

Do not infer `active` from `available`. Runtime visibility must be checked separately.

Method registry entries must not use `active`, `native-visible`, or `compiled-fallback`. Methods are passive reference material, so their normal reviewed state is `documented`, `available`, and optionally `approved`.

## Agent Entries

Each agent entry must include:

- `name`
- `displayName`
- `mission`
- `whenToUse`
- `whenNotToUse`
- `ownedSkills`
- `secondarySkills`
- `profiles`
- `nativeCodexAgentName`
- `compiledFallbackPath`
- `expectedDeliverables`
- `successMetrics`
- `stopConditions`
- `handoffRules`
- `riskDomains`
- `sourceProvenance`
- `status`

## Skill Entries

Each skill entry must include:

- `name`
- `description`
- `ownerAgent`
- `secondaryAgents`
- `triggerCases`
- `negativeTriggerCases`
- `priority`
- `conflicts`
- `requiredSupportTools`
- `optionalSupportTools`
- `riskLevel`
- `evalStatus`
- `sourceProvenance`
- `skillPath`
- `status`

## Method Entries

Each method entry must include:

- `id`
- `displayName`
- `area`
- `methodPath`
- `purpose`
- `whenToUse`
- `whenNotToUse`
- `passiveConsumerAgents`
- `relatedRoutingScenarios`
- `riskDomains`
- `validationGates`
- `sourceProvenance`
- `licenseStatus`
- `rawCopyPolicy`
- `status`

Method entries are metadata only. They must not define trigger cases, required tools, runtime visibility, install behavior, activation behavior, or hidden routing. `riss-governance` may cite method IDs as passive reference inputs, but methods are never selected as skills, plugins, tools, agents, or active runtime capabilities.

## Tool Entries

Each tool entry must include:

- `name`
- `type`
- `external`
- `whenToUse`
- `whenNotToUse`
- `approvalRequired`
- `availabilityCheck`
- `fallback`
- `tokenCostRisk`
- `safetyNotes`
- `status`

## Routing Matrix Entries

Each routing entry should include:

- `scenario`
- `userLanguageExamples`
- `inferredIntent`
- `riskLevel`
- `selectedProfile`
- `agents`
- `skills`
- `supportTools`
- `stopConditions`
- `validationGates`
- `expectedCompletionReport`
- `tokenMode`
- optional `methodReferences`

`methodReferences` contains method IDs from `registries/methods.registry.json`. These references are passive guidance only; they do not change selected agents, skills, support tools, or approval requirements.

## Governance Rules

Registries must index existing assets before adding speculative assets. Planned helper skills such as `riss-agent-governance` and `riss-skill-governance` may appear only as documented future contracts until separately approved and implemented.

External support tools must be marked `external: true`. Superpowers, GSD, Codex plugins, Playwright/browser, GitHub/gh, Supabase tooling/docs, Figma, CodeRabbit, and discovery sources remain external capabilities.

Source records remain the provenance layer. A method registry entry may cite a source record, but that citation is not approval to copy raw upstream content, install packages, activate skills, clone repositories, run scripts, or change runtime configuration.

## Validation

Every registry file must be valid JSON. Registry updates should be validated before completion and reviewed for accidental activation language. `registries/methods.registry.json` must additionally validate that every `methodPath` exists, every `sourceProvenance` path exists, every routing `methodReferences` value resolves to a method ID, and no method entry claims active runtime status.

