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

Private overlays may contain project-specific checklists, route metadata, pilot evidence, and internal migration notes. For any public repository candidate, private overlays must live in a separate private repository or private branch, not in the public repo tree.

Historical internal overlay root:

- `.ai-toolkit/private-overlays/`

That path is not approved for public repository content. Removing overlay files from the current tree does not erase historical Git exposure.

## Release Rule

The public package validator scans only the public allowlist. Public GitHub repository readiness requires whole-tree and history review in addition to package allowlist validation. Publication remains blocked until private overlay content is absent from the current tree and historical exposure is resolved by a clean sanitized repository/mirror or verified history cleanup.
