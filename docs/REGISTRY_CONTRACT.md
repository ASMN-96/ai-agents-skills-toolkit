# Registry Contract

Registries are machine-readable indexes of reviewed toolkit assets, planned assets, and external support capabilities. They are metadata only. Presence in a registry does not install, activate, approve, or execute anything.

## Required Registries

- `registries/agents.registry.json`
- `registries/skills.registry.json`
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

## Governance Rules

Registries must index existing assets before adding speculative assets. Planned helper skills such as `riss-agent-governance` and `riss-skill-governance` may appear only as documented future contracts until separately approved and implemented.

External support tools must be marked `external: true`. Superpowers, GSD, Codex plugins, Playwright/browser, GitHub/gh, Supabase tooling/docs, Figma, CodeRabbit, and discovery sources remain external capabilities.

## Validation

Every registry file must be valid JSON. Registry updates should be validated before completion and reviewed for accidental activation language.

