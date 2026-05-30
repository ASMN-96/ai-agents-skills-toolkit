# Registry Contract

Registries are machine-readable indexes of reviewed toolkit assets, planned assets, and external support capabilities. They are metadata only. Presence in a registry does not install, activate, approve, or execute anything.

Registry reporting must follow `docs/NO_FAKE_VALIDATION_POLICY.md`: registry entries may describe planned, documented, metadata-only, approved, or active states, but they must not be used as proof that a tool ran, a skill was visible, a source was trusted, or a fallback executed.

## Required Registries

- `registries/agents.registry.json`
- `registries/skills.registry.json`
- `registries/methods.registry.json`
- `registries/profiles.registry.json`
- `registries/tools.registry.json`
- `registries/routing-matrix.json`

## Registry State Fields

Tool status remains an array so multiple states can be represented explicitly when applicable.

- `documented`
- `available`
- `native-visible` (agents/skills only)
- `compiled-fallback` (agents/skills only)
- `draft`
- `approved`
- `active`

Do not infer `active` from `available`. Runtime visibility must be checked separately.

Method registry entries must not use `active`, `native-visible`, or `compiled-fallback`. Methods are passive reference material, so their normal reviewed state is `documented`, `available`, and optionally `approved`.

## Source Provenance Contract

`sourceProvenance` is a machine-readable list used by registries to separate provenance from authority.

- Must be an array of objects with `path` and `category`.
- Allowed categories:
  - `internal-artifact`
  - `external-source`
  - `historical-reference`
  - `restricted-source`
  - `local-vd-authored`

Interpretation:

- `internal-artifact` : toolkit-owned repo paths used as internal design/ops evidence.
- `external-source` : active authority source records for external, non-restricted inputs.
- `historical-reference` : caution/reference-only sources that are not active authority.
- `restricted-source` : sources that should not provide method/skill authority by default.
- `local-vd-authored` : local toolkit authorship context for internal process metadata.

Rules:

- External GitHub sources with active authority must also have a corresponding source-watchlist record.
- Non-GitHub manual-source records are allowed as explicit `sourceRecordPath`-class entries or explicit restricted/historical source references, and should remain explicitly categorized.
- Historical/restricted sources must not be interpreted as activation authority.

## Cross-Registry Metadata Fields

If the schema allows it, the following visibility and provenance fields are expected:

- `visibility`: machine-readable artifact visibility.
  - `repo`, `global`, `project-sync`, `internal-only`.
- `registrySurface`:
  - `user-facing`
  - `internal-helper`
  - `compiled-fallback`
  - `passive-reference`
  - `historical-reference`
- `activationStatus`: machine-readable activation state for this artifact category.
  - `documented`, `available`, `approved`, `active`, `native-visible`, `compiled-fallback`.
- `provenanceType`:
  - `external-source`
  - `internal-artifact`
  - `historical-reference`
  - `restricted-source`
  - `local-vd-authored`

Presence does not imply runtime activation.

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
- `provenanceType`
- `activationStatus`
- `registrySurface`
- `visibility`

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
- `provenanceType`
- `activationStatus`
- `registrySurface`
- `visibility`

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
- `provenanceType`
- `activationStatus`
- `registrySurface`
- `visibility`

Method entries are metadata only. They must not define trigger cases, required tools, runtime visibility, install behavior, activation behavior, or hidden routing. `riss-governance` may cite method IDs as passive reference inputs, but methods are never selected as skills, plugins, tools, agents, or active runtime capabilities.

## Tool Entries

Each tool entry must include:

- `id`
- `name`
- `repository`
- `homepage`
- `purpose`
- `category`
- `status`
- `activationStatus`
- `runtimeSurface`
- `defaultUse`
- `approvalRequiredFor`
- `allowedUse`
- `forbiddenUse`
- `sourceRecordPath`
- `notes`

Tool entries are metadata only. `activationStatus` must not imply install, activation, CI wiring, MCP setup, global configuration, approval, or runtime availability. `forbiddenUse` must explicitly block install/activation by registry presence and raw upstream copying.

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

Validation reports must surface WARN output separately from blocking failures. A passing registry validator can still leave review-required metadata, source-review-required tools, compiled-agent drift, mock-only freshness, or other non-blocking warnings that completion reports must preserve.

