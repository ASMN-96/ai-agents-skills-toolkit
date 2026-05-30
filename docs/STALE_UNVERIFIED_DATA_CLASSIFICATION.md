# Stale and Unverified Data Classification

Generated at: 2026-05-30T19:06:30.477Z

Report-only classification. No files were deleted, renamed, relocated, activated, installed, or approved by this report.

## Classification Definitions

- keep-active: currently active compatibility or runtime-facing naming that must not be removed until a migration is implemented and verified.
- metadata-only: registry, template, policy, or scanner metadata that does not imply approval or runtime activation.
- historical: dated or roadmap evidence retained as history.
- review-required: value needs owner/security/source review before public release or enterprise approval.
- remove-later: candidate for removal after compatibility and package boundaries are proven.
- private-overlay-only: value belongs in a future private overlay, not in public core paths.

## Summary By Classification

| Classification | Count |
| --- | ---: |
| keep-active | 228 |
| metadata-only | 204 |
| historical | 34 |
| review-required | 1555 |
| remove-later | 0 |
| private-overlay-only | 885 |

## Summary By Signal

| Signal | Count |
| --- | ---: |
| old-version-metadata | 0 |
| unknown-review-required | 1199 |
| project-private-naming | 1166 |
| local-path | 0 |
| unverified-metadata | 541 |
| non-https-url | 0 |

## Review Samples

Samples are capped to keep the report reviewable. Re-run the script for the current full scan.

### keep-active

| Signal | File | Line | Value | Context |
| --- | --- | ---: | --- | --- |
| project-private-naming | .agents/skills/riss-code-quality/SKILL.md | 2 | riss | name: riss-code-quality |
| project-private-naming | .agents/skills/riss-code-quality/SKILL.md | 6 | RISS | # RISS Code Quality |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 2 | riss | name: riss-governance |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 3 | RISS | description: Use when doing serious RISS work, or when explicitly invoked as an opt-in governance layer for repo governance, source-of-truth checks, task routing, branch/PR/CI/CodeRabbit discipline, backend/security caution, UI/runtime validation, or completion verification. Do not use as approval for writes, installs, migrations, broad plugin use, or global config changes. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 6 | RISS | # RISS Governance |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 12 | RISS | This skill is the governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. Do not apply it automatically to unrelated projects unless the user explicitly invokes it. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 12 | RISS | This skill is the governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. Do not apply it automatically to unrelated projects unless the user explicitly invokes it. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 12 | VD | This skill is the governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. Do not apply it automatically to unrelated projects unless the user explicitly invokes it. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 16 | RISS | RISS, RISS V2, AI Toolkit, VD projects, Supabase/backend, security, release, and repo-governance work remain the primary domain. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 16 | RISS | RISS, RISS V2, AI Toolkit, VD projects, Supabase/backend, security, release, and repo-governance work remain the primary domain. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 16 | VD | RISS, RISS V2, AI Toolkit, VD projects, Supabase/backend, security, release, and repo-governance work remain the primary domain. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 18 | riss | Other repositories and projects are allowed only when the user explicitly invokes `Use riss-governance`. Explicit invocation makes this skill the active governance layer for that thread or task, within the selected mode, repo scope, runtime permissions, and user-approved boundaries. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 22 | riss | Outside the primary domain, do not infer governance opt-in from vague quality language alone. If the user does not explicitly invoke `Use riss-governance`, unrelated projects should proceed under normal Codex behavior unless another active instruction requires this skill. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 28 | riss | \| `Use riss-governance` \| Authorizes routing, planning, read-only checks, capability selection, and validation gates only. It does not authorize writes by itself. \| |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 89 | riss | `riss-agent-governance` and `riss-skill-governance` are internal helpers only. Keep `riss-governance` as the normal user-facing entrypoint. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 89 | riss | `riss-agent-governance` and `riss-skill-governance` are internal helpers only. Keep `riss-governance` as the normal user-facing entrypoint. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 89 | riss | `riss-agent-governance` and `riss-skill-governance` are internal helpers only. Keep `riss-governance` as the normal user-facing entrypoint. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 91 | riss | - Use `riss-agent-governance` internally for agent selection, native/fallback status, handoff checks, and no-silent-fallback enforcement. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 92 | riss | - Use `riss-skill-governance` internally for skill selection, trigger conflicts, missing-skill preflight, and skill safety boundaries. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 93 | riss | - If a user directly asks to call either helper, redirect the request through `riss-governance` and do not treat the helper as a public entrypoint. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 126 | riss | - Global entrypoint: when the user says "Use riss-governance," start with this skill, then use `riss-governance-agent` as the router when it is runtime-visible. |
| project-private-naming | .agents/skills/riss-governance/SKILL.md | 126 | riss | - Global entrypoint: when the user says "Use riss-governance," start with this skill, then use `riss-governance-agent` as the router when it is runtime-visible. |
| project-private-naming | .agents/skills/riss-release-gate/SKILL.md | 2 | riss | name: riss-release-gate |
| project-private-naming | .agents/skills/riss-release-gate/SKILL.md | 6 | RISS | # RISS Release Gate |
| project-private-naming | .agents/skills/riss-security-review/SKILL.md | 2 | riss | name: riss-security-review |

### metadata-only

| Signal | File | Line | Value | Context |
| --- | --- | ---: | --- | --- |
| unverified-metadata | docs/LEVEL_4_PROMOTION_EVIDENCE.json | 46 | metadata-only | "notes": "Promotion requires evidence and owner approval. Intent, passing validators, or metadata-only records are not enough." |
| unverified-metadata | docs/LEVEL_4_PROMOTION_EVIDENCE.md | 43 | metadata-only | - Unreviewed tools must remain metadata-only and blocked from enterprise approval. |
| unverified-metadata | docs/LEVEL_4_PROMOTION_EVIDENCE.md | 48 | Metadata-only | - Metadata-only tool entries are not enterprise-approved. |
| unverified-metadata | scripts/test-level4-readiness.mjs | 32 | metadata-only | id: "metadata-only-tool", |
| unverified-metadata | scripts/test-level4-readiness.mjs | 34 | metadata-only | defaultEnterpriseStatus: "metadata-only; blocked from enterprise approval until owner review records evidence", |
| unverified-metadata | scripts/test-level4-readiness.mjs | 35 | metadata-only | securityReviewStatus: "metadata-only-owner-review-required", |
| unverified-metadata | templates/level4-enterprise-tool-review.template.md | 38 | metadata-only | If evidence is incomplete, keep the tool metadata-only and blocked from enterprise approval. |
| unverified-metadata | .agents/skills/app-security-review/SKILL.md | 17 | Metadata-only | - Metadata-only tool records, skipped scans, dry-runs, unavailable scanners, and partial reviews are labeled honestly. |
| unverified-metadata | .agents/skills/riss-code-quality/SKILL.md | 33 | metadata-only | React Doctor, Knip, Biome, Oxlint, dependency-cruiser, Madge, jscpd, and similar tools are metadata-only candidates unless already configured by the project. |
| unverified-metadata | .agents/skills/riss-code-quality/SKILL.md | 43 | metadata-only | - Dry-run or metadata-only quality gates are not reported as real quality execution. |
| unverified-metadata | .agents/skills/riss-code-quality/SKILL.md | 48 | metadata-only | Report commands run, results, skipped checks, missing project scripts, WARN output, and remaining manual QA. Do not claim quality gates passed unless the relevant command output was actually observed. Follow `docs/NO_FAKE_VALIDATION_POLICY.md` for dry-run, mock, skipped, partial, fallback, and metadata-only states. |
| unverified-metadata | .agents/skills/riss-governance/SKILL.md | 107 | metadata-only | - Report support tools as available, unavailable, selected, invoked, skipped, or metadata-only; do not blur those states. |
| unverified-metadata | .agents/skills/riss-release-gate/SKILL.md | 48 | metadata-only | Report branch state, PR URL if created, checks run, check results, review status, skipped gates, WARN output, blockers, missing evidence, and the exact next action before any merge request. Follow `docs/NO_FAKE_VALIDATION_POLICY.md`; do not claim merge readiness from metadata-only records, dry-runs, skipped CI jobs, unavailable review status, or unobserved tool output. |
| unverified-metadata | .agents/skills/riss-security-review/SKILL.md | 33 | metadata-only | Socket, TruffleHog, ZAP, Harden-Runner, Trivy, Checkov, Semgrep, CodeQL, and similar tools are metadata-only candidates unless already approved and configured in the project. |
| unverified-metadata | .agents/skills/riss-security-review/SKILL.md | 43 | Metadata-only | - Metadata-only tool records, skipped scans, dry-runs, unavailable scanners, and partial reviews are labeled honestly. |
| unverified-metadata | .agents/skills/riss-security-review/SKILL.md | 48 | metadata-only | Report findings by severity, files or artifacts reviewed, commands run, skipped checks, WARN output, and residual risk. If security coverage is partial, say exactly what remains unverified. Follow `docs/NO_FAKE_VALIDATION_POLICY.md` for mock, dry-run, unavailable, fallback, metadata-only, and unverified security evidence. |
| unverified-metadata | .agents/skills/webapp-code-quality/SKILL.md | 22 | metadata-only | - Dry-run or metadata-only quality gates are not reported as real execution. |
| unverified-metadata | .ai-toolkit/integrations/coderabbit.md | 31 | metadata-only | - Default enterprise status: metadata-only unless explicitly approved. |
| unverified-metadata | .ai-toolkit/registries/routing-matrix.json | 1089 | metadata-only | "inferredIntent": "Represent external tools as metadata-only source intelligence before any activation or extraction.", |
| unverified-metadata | .ai-toolkit/skills/app-security-review/SKILL.md | 17 | Metadata-only | - Metadata-only tool records, skipped scans, dry-runs, unavailable scanners, and partial reviews are labeled honestly. |
| unverified-metadata | .ai-toolkit/skills/riss-code-quality/SKILL.md | 33 | metadata-only | React Doctor, Knip, Biome, Oxlint, dependency-cruiser, Madge, jscpd, and similar tools are metadata-only candidates unless already configured by the project. |
| unverified-metadata | .ai-toolkit/skills/riss-code-quality/SKILL.md | 43 | metadata-only | - Dry-run or metadata-only quality gates are not reported as real quality execution. |
| unverified-metadata | .ai-toolkit/skills/riss-code-quality/SKILL.md | 48 | metadata-only | Report commands run, results, skipped checks, missing project scripts, WARN output, and remaining manual QA. Do not claim quality gates passed unless the relevant command output was actually observed. Follow `docs/NO_FAKE_VALIDATION_POLICY.md` for dry-run, mock, skipped, partial, fallback, and metadata-only states. |
| unverified-metadata | .ai-toolkit/skills/riss-governance/SKILL.md | 107 | metadata-only | - Report support tools as available, unavailable, selected, invoked, skipped, or metadata-only; do not blur those states. |
| unverified-metadata | .ai-toolkit/skills/riss-release-gate/SKILL.md | 48 | metadata-only | Report branch state, PR URL if created, checks run, check results, review status, skipped gates, WARN output, blockers, missing evidence, and the exact next action before any merge request. Follow `docs/NO_FAKE_VALIDATION_POLICY.md`; do not claim merge readiness from metadata-only records, dry-runs, skipped CI jobs, unavailable review status, or unobserved tool output. |

### historical

| Signal | File | Line | Value | Context |
| --- | --- | ---: | --- | --- |
| project-private-naming | docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md | 14 | RISS | ### RISS v2 |
| project-private-naming | docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md | 29 | riss | - `pwsh -NoProfile -File install\update-project.ps1 -TargetPath <riss-v2-sync-worktree>` passed in dry-run mode. |
| project-private-naming | docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md | 30 | riss | - `pwsh -NoProfile -File install\update-project.ps1 -TargetPath <riss-v2-sync-worktree> -ConfirmWrite` passed on a clean upstream-aligned feature branch. |
| project-private-naming | docs/PROJECT_SYNC_VALIDATION_REPORT_2026-05-30.md | 31 | riss | - `pwsh -NoProfile -File install\validate-project-install.ps1 -TargetPath <riss-v2-sync-worktree>` passed before and after the final toolkit pin refresh. |
| project-private-naming | docs/ROADMAP.md | 35 | riss | Status: Completed for v1. Phase 6 added `riss-governance` and project-managed skill sync so selected toolkit-owned skills can be copied into target repositories under `.ai-toolkit/skills/` without global activation. |
| project-private-naming | docs/ROADMAP.md | 49 | riss | ## Phase 9: Global riss-governance Entrypoint |
| project-private-naming | docs/ROADMAP.md | 51 | riss | Install `riss-governance` globally as the one-command governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. |
| project-private-naming | docs/ROADMAP.md | 51 | RISS | Install `riss-governance` globally as the one-command governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. |
| project-private-naming | docs/ROADMAP.md | 51 | RISS | Install `riss-governance` globally as the one-command governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. |
| project-private-naming | docs/ROADMAP.md | 51 | VD | Install `riss-governance` globally as the one-command governance entrypoint for RISS, RISS V2, AI Toolkit, Supabase/backend, security, release, repo governance, and related VD real estate platform work. |
| project-private-naming | docs/ROADMAP.md | 53 | riss | Status: Global skill and router-agent registration. Do not mark runtime visibility fully active until restart/new-session verification confirms both the skill and `riss-governance-agent` router are visible. |
| project-private-naming | docs/ROADMAP.md | 121 | riss | Phase 10I records that the initial fresh CLI session could see `riss-governance` and native agent roles, but could not run local shell checks because Windows sandbox process startup failed with `CreateProcessAsUserW failed: 5`. A follow-up fresh CLI session used a temporary per-command `windows.sandbox="unelevated"` override, without changing global config, and verified source truth, JSON validity, helper-skill planned status, native role visibility, compiled fallback presence, support-tool visibility, and no silent fallback. No product repos, global Codex config, skills, agents, registries, source records, install scripts, external installs, activation, hooks, daemons, or MCP servers were changed. |
| project-private-naming | docs/ROADMAP.md | 141 | riss | Clarify that `riss-governance` can be explicitly opted into for serious project threads outside the primary RISS/VD domain without weakening safety. |
| project-private-naming | docs/ROADMAP.md | 141 | RISS | Clarify that `riss-governance` can be explicitly opted into for serious project threads outside the primary RISS/VD domain without weakening safety. |
| project-private-naming | docs/ROADMAP.md | 141 | VD | Clarify that `riss-governance` can be explicitly opted into for serious project threads outside the primary RISS/VD domain without weakening safety. |
| project-private-naming | docs/RUNTIME_ACTIVATION_MODEL.md | 51 | riss | - `.agents/skills/riss-governance/SKILL.md` |
| project-private-naming | docs/RUNTIME_ACTIVATION_MODEL.md | 52 | vd | - `.agents/skills/vd-premium-uiux/SKILL.md` |
| project-private-naming | docs/RUNTIME_ACTIVATION_MODEL.md | 53 | riss | - `.agents/skills/riss-code-quality/SKILL.md` |
| project-private-naming | docs/RUNTIME_ACTIVATION_MODEL.md | 54 | riss | - `.agents/skills/riss-security-review/SKILL.md` |
| project-private-naming | docs/RUNTIME_ACTIVATION_MODEL.md | 55 | riss | - `.agents/skills/riss-release-gate/SKILL.md` |
| project-private-naming | docs/RUNTIME_VERIFICATION.md | 9 | riss | - `riss-governance` skill visibility |
| project-private-naming | docs/RUNTIME_VERIFICATION.md | 10 | riss | - internal `riss-agent-governance` helper visibility, if selected through `riss-governance` |
| project-private-naming | docs/RUNTIME_VERIFICATION.md | 10 | riss | - internal `riss-agent-governance` helper visibility, if selected through `riss-governance` |
| project-private-naming | docs/RUNTIME_VERIFICATION.md | 11 | riss | - internal `riss-skill-governance` helper visibility, if selected through `riss-governance` |
| project-private-naming | docs/RUNTIME_VERIFICATION.md | 11 | riss | - internal `riss-skill-governance` helper visibility, if selected through `riss-governance` |

### review-required

| Signal | File | Line | Value | Context |
| --- | --- | ---: | --- | --- |
| unknown-review-required | scripts/test-level4-readiness.mjs | 36 | unknown-review-required | license: "unknown-review-required" |
| unknown-review-required | scripts/validate-level4-readiness.mjs | 96 | unknown-review-required | return value.some((entry) => String(entry).includes("unknown-review-required")); |
| unknown-review-required | scripts/validate-level4-readiness.mjs | 98 | unknown-review-required | return String(value).includes("unknown-review-required"); |
| unknown-review-required | .ai-toolkit/compiled-agents/release-manager-agent.compiled.md | 198 | unknown-review-required | - Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `karpathy-inspired-skills`, `matt-pocock-skills`, `trailofbits-skills`, `unknown-review-required` |
| unknown-review-required | .ai-toolkit/compiled-agents/reviewer-agent.compiled.md | 539 | unknown-review-required | - Inherited sourceRef IDs: `addy-osmani-agent-skills`, `addyosmani-web-quality-skills`, `anthropic-skills`, `bencium-marketplace`, `everything-claude-code`, `karpathy-inspired-skills`, `matt-pocock-skills`, `microsoft-playwright`, `ruflo`, `supabase-agent-skills`, `superpowers`, `trailofbits-skills`, `unknown-review-required` |
| unknown-review-required | .ai-toolkit/compiled-agents/security-agent.compiled.md | 166 | unknown-review-required | - Inherited sourceRef IDs: `addy-osmani-agent-skills`, `anthropic-skills`, `everything-claude-code`, `ruflo`, `supabase-agent-skills`, `superpowers`, `trailofbits-skills`, `unknown-review-required` |
| unknown-review-required | .ai-toolkit/integrations/coderabbit.md | 23 | unknown-review-required | - License: unknown-review-required. |
| unknown-review-required | .ai-toolkit/integrations/coderabbit.md | 27 | unknown-review-required | - Secret access risk: permission-dependent; unknown-review-required. |
| unknown-review-required | .ai-toolkit/integrations/coderabbit.md | 28 | unknown-review-required | - GitHub app permissions: unknown-review-required. |
| unknown-review-required | .ai-toolkit/integrations/coderabbit.md | 30 | unknown-review-required | - Telemetry behavior: unknown-review-required. |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 41 | unknown-review-required | "license": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 42 | unknown-review-required | "saasOrLocal": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 43 | unknown-review-required | "dataSentExternally": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 44 | unknown-review-required | "networkBehavior": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 45 | unknown-review-required | "secretAccessRisk": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 46 | unknown-review-required | "repositoryPermissionsRequired": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 47 | unknown-review-required | "ciPermissionsRequired": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 48 | unknown-review-required | "githubAppPermissionsRequired": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 49 | unknown-review-required | "authenticationModel": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 50 | unknown-review-required | "telemetryBehavior": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 51 | unknown-review-required | "commercialVendorDependency": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 52 | unknown-review-required | "maintenanceSignal": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 53 | unknown-review-required | "lastReviewedCommit": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 54 | unknown-review-required | "lastReviewedDate": "unknown-review-required", |
| unknown-review-required | .ai-toolkit/registries/tools.registry.json | 107 | unknown-review-required | "license": "unknown-review-required", |

### remove-later

No samples.

### private-overlay-only

| Signal | File | Line | Value | Context |
| --- | --- | ---: | --- | --- |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 8 | riss | "userPrompt": "Use riss-governance for this governed toolkit task.", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 9 | riss | "expectedCurrentSkill": "riss-governance", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 17 | riss | "expectedDeprecatedCompatibilitySkill": "riss-governance", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 24 | vd | "expectedDeprecatedCompatibilitySkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 31 | riss | "expectedDeprecatedCompatibilitySkill": "riss-code-quality", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 38 | riss | "expectedDeprecatedCompatibilitySkill": "riss-security-review", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 45 | riss | "expectedDeprecatedCompatibilitySkill": "riss-release-gate", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 50 | RISS | "userPrompt": "Remove all old RISS and VD skill names immediately.", |
| project-private-naming | .ai-toolkit/evals/skills/generic-naming-compatibility-evals.json | 50 | VD | "userPrompt": "Remove all old RISS and VD skill names immediately.", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 5 | vd | "currentCompatibilitySkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 11 | vd | "expectedCurrentSkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 26 | vd | "expectedCurrentSkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 40 | vd | "expectedCurrentSkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 54 | vd | "expectedCurrentSkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 70 | vd | "expectedCurrentSkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/evals/skills/premium-uiux-review-evals.json | 98 | vd | "expectedCurrentSkill": "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/manifest.json | 8 | riss | "riss-governance", |
| project-private-naming | .ai-toolkit/manifest.json | 10 | vd | "vd-premium-uiux", |
| project-private-naming | .ai-toolkit/manifest.json | 12 | riss | "riss-code-quality", |
| project-private-naming | .ai-toolkit/manifest.json | 14 | riss | "riss-security-review", |
| project-private-naming | .ai-toolkit/manifest.json | 16 | riss | "riss-release-gate" |
| project-private-naming | .ai-toolkit/manifest.json | 19 | riss | "riss-agent-governance", |
| project-private-naming | .ai-toolkit/manifest.json | 20 | riss | "riss-skill-governance" |
| project-private-naming | .ai-toolkit/manifest.json | 55 | riss | "source": "skills/riss-governance/SKILL.md", |
| project-private-naming | .ai-toolkit/manifest.json | 56 | riss | "target": ".agents/skills/riss-governance/SKILL.md", |

## Required Follow-Up

- Do not delete or rename any classified value from this report alone.
- Move private-overlay-only content only in a later public/private migration PR after compatibility gates pass.
- Keep active runtime names until generic aliases or wrappers are implemented and verified.
- Resolve review-required source/tool/license/version values with owner-reviewed evidence.
- Treat remove-later findings as cleanup candidates, not removal approval.
