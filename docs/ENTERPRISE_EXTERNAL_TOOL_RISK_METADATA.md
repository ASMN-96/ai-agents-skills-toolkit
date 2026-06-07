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
- `reviewState`
- `reviewEvidence`

`reviewState` must be one of:

- `reviewed`: specific evidence is recorded in this repository, but runtime/install/CI permission still depends on the tool's allowed environment scope.
- `unreviewed-blocked`: no current enterprise evidence is recorded; the tool is metadata-only and blocked from execution/install until owner review.
- `metadata-only-owner-review-required`: delegated or partial metadata exists, but owner review is still required before runtime use, repository permissions, CI wiring, MCP setup, or product-repository use.

## Controlled Posture Values

Tool posture labels are stored in `activationLevels` and must use only this vocabulary:

- `active-if-detected`
- `owner-approved-install`
- `ci-advisory`
- `ci-blocking-after-calibration`
- `static-adopted`
- `forbidden-runtime`

## Default Rules

- `defaultEnterpriseStatus` must stay metadata-only unless a later review PR records approval evidence.
- `securityReviewStatus` must not say approved or enterprise-approved without evidence.
- No tool may keep all core enterprise-risk fields as `unknown-review-required`; an unreviewed tool must say `unreviewed-blocked` and use explicit owner-review-required field values.
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
