# Docs

This directory contains toolkit architecture, source policy, validation honesty policy, update policy, roadmap, and future operating documentation.

External sources have been evaluated in prior phases and are recorded under `sources/`. Phase 10A/10B adds governance spine documentation, registry contracts, missing-skill discovery policy, token-efficiency policy, runtime verification guidance, and an external-source backlog for future scouting batches.

`docs/NO_FAKE_VALIDATION_POLICY.md` is the central rule for reporting real execution, dry-runs, mocks, skipped checks, unavailable tools, metadata-only records, fallbacks, and WARN output honestly.

`docs/PUBLIC_PRIVATE_LEAK_REPORT.md` is the report-only public/private naming and leakage scan. It classifies project-specific terms, local paths, private repo/org references, and contact-like data without deleting, renaming, relocating, or activating anything.

`docs/GENERIC_NAMING_COMPATIBILITY.md` defines the future public naming map and the compatibility rules that prevent runtime breakage during the migration away from project-specific names.

`docs/ENTERPRISE_EXTERNAL_TOOL_RISK_METADATA.md` defines the required enterprise-review fields for external tools and integrations. Unknown values remain `unknown-review-required` until evidence is reviewed.

Method files include `sourceRef`, `lastExtracted`, and `status` frontmatter so source freshness reports can identify affected methods without approving imports or extraction.

`scripts/sync-runtime.mjs` is the dry-run-first helper for syncing canonical active skills into repo runtime and embedded package skill copies. It refuses unknown/internal-helper skills unless the active allowlist changes in a reviewed PR.

`docs/OPERATOR_GUIDE.md` defines the normal operator prompts for planning-only mode, controlled implementation, release review, and quality-gate honesty.

`evals/skills/premium-uiux-review-evals.json` is the generic, public-safe premium UI/UX eval suite for dashboard polish, responsive layout, accessibility, visual QA evidence, design-system consistency, non-trigger cases, and no-fake browser evidence.
