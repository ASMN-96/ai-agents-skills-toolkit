# UI UX Pro Max Audit

Date: 2026-05-16

## Scope

This audit inspected the existing `ui-ux-pro-max` skill candidate read-only. No global Codex configuration, product repository, external repository, package dependency, runtime activation, import, reinstall, refork, uninstall, or upstream script was changed.

## Inspected Path

- `<codex-home>/skills/ui-ux-pro-max`

## Current Status

- Status: global/local Codex skill candidate, not toolkit-managed.
- Repository status: no `ui-ux-pro-max` references were found in this toolkit repository before this audit note.
- Filesystem contents:
  - `SKILL.md` exists.
  - `scripts` exists as a file containing `../../../src/ui-ux-pro-max/scripts`, not as a usable local scripts directory.
  - `data` exists as a file containing `../../../src/ui-ux-pro-max/data`, not as a usable local data directory.
- Pointer targets were not present at the resolved local paths checked during audit.

## Useful Unique Rules

The useful content is limited to concise UI quality guardrails that reinforce the existing `vd-premium-uiux` contract:

- Explicit touch target and safe-area rules for mobile and app-like interfaces.
- Gesture alternatives and gesture-conflict avoidance for critical actions.
- Stable pressed/animated states that do not shift layout bounds.
- Chart accessibility expectations such as text summaries and keyboard reachability for interactive data marks.
- Form recovery details such as first-invalid-field focus, aria-live errors, read-only versus disabled distinction, undo for destructive actions, and timeout recovery.
- Navigation QA details such as state preservation, back-stack integrity, route-change focus, and deep-link expectations where product-appropriate.
- Icon discipline such as one icon family/style, consistent stroke/sizing, vector structural icons, and no emoji as functional controls.
- Visual performance checks such as reserved image/media space, below-fold lazy loading, fixed-element offsets, and large-list virtualization.

## Duplicated Or Rejected Rules

- Broad "must use" UI/UX triggering overlaps with `vd-premium-uiux` and would compete with the toolkit's router.
- Style, palette, font, and product catalog claims are too broad for this toolkit's source-of-truth model.
- CLI search workflows and `--persist` design-system writes are not appropriate for governed toolkit execution.
- Python install instructions and search-script examples are rejected for this scope.
- React Native-only assumptions do not match this toolkit's cross-project UI/UX governance role.

## Risks

- The skill is outside repo ownership and not versioned by the toolkit.
- The `scripts` and `data` pointers are not usable in the inspected environment.
- The skill includes install and command examples that conflict with the current no-install, no-activation, no-global-config-change boundary.
- Persisted design-system output could create unmanaged project files if followed.

## Migration Recommendation

Migrate only concise QA guardrails around touch targets, safe areas, gestures, stable motion, chart accessibility, form recovery, navigation state, icon discipline, and visual performance into `vd-premium-uiux`. Do not migrate the CLI workflow, data/search catalog, install instructions, broad triggering language, or React Native-specific authority.

Because `ui-ux-pro-max` is not toolkit-managed, do not add it to `sourceProvenance` as `external-source`. If provenance is needed, reference this audit document as an `internal-artifact` only.

For governed toolkit and RISS work, keep `vd-premium-uiux` as the only master UI/UX execution skill. Leave the global `ui-ux-pro-max` installation untouched in this task.
