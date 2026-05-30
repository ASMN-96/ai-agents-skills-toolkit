# Enterprise External-Tool Risk Metadata

## Purpose

Every external tool and integration in `registries/tools.registry.json` must be enterprise-reviewable before it can be installed, activated, wired into CI, connected to GitHub, used against a product repo, or treated as release evidence.

Registry presence remains metadata only. Unknown fields must stay explicit as `unknown-review-required`; popularity, plugin availability, or a useful homepage is not enterprise approval.

## Required `enterpriseRisk` Fields

Each tool entry must include:

- `license`
- `saasOrLocal`
- `dataSentExternally`
- `networkBehavior`
- `secretAccessRisk`
- `repositoryPermissionsRequired`
- `ciPermissionsRequired`
- `githubAppPermissionsRequired`
- `authenticationModel`
- `telemetryBehavior`
- `commercialVendorDependency`
- `maintenanceSignal`
- `lastReviewedCommit`
- `lastReviewedDate`
- `securityReviewStatus`
- `approvalOwner`
- `allowedEnvironments`
- `forbiddenEnvironments`
- `defaultEnterpriseStatus`

## Default Rules

- `defaultEnterpriseStatus` must stay metadata-only unless a later review PR records approval evidence.
- `securityReviewStatus` must not say approved or enterprise-approved without evidence.
- `allowedEnvironments` must not imply execution approval from registry presence.
- `forbiddenEnvironments` must block local execution, CI, staging, production, global config, MCP, and product repositories unless separately approved.
- CodeRabbit remains delegated integration metadata, not a source repo and not merge authority by itself.
- reviewdog remains deterministic scanner-output metadata only and must not become a second AI reviewer.

## Rollout

1. Add the schema and unknown-review-required defaults.
2. Validate that every tool entry has the required fields.
3. Assign an accountable owner bucket for every tool category without granting execution approval.
4. Later, review individual tools with evidence before changing any unknown field.
5. Only after review may a tool receive scoped allowed environments, owner approval, or CI/project usage language.

See `docs/ENTERPRISE_TOOL_OWNERSHIP_MATRIX.md` for the current owner-bucket mapping.
