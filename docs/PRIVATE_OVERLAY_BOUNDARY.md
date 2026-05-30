# Private Overlay Boundary

The public/core toolkit must stay portable, reusable, and free of private project details. Private overlays are allowed only as explicitly separated internal material.

## Public/Core Content

Public/core paths may contain generic governance, source-safety, quality, security, release, registry, validator, and packaging logic.

Public/core paths must not contain:

- private project names,
- private organization or repository names,
- local machine paths,
- private URLs,
- secrets, tokens, credentials, cookies, or environment values,
- product-specific workflows presented as generic public behavior.

## Private Overlay Content

Private overlays may contain project-specific checklists, route metadata, pilot evidence, and internal migration notes. Overlay content must not be included in public package output unless it is neutralized and re-reviewed.

Current private overlay root:

- `.ai-toolkit/private-overlays/`

## Release Rule

The public package validator scans only the public allowlist. Full-repository leak scans may still report private-overlay findings, but those findings do not block public package output when the public package gate excludes overlay paths and reports zero public blockers.
