# Source Utilization Matrix

This report is the canonical classification gate for source and tool metadata. It does not approve installs, activation, MCP setup, CI wiring, source copying, compiled-agent regeneration, or product-repository indexing.

## Classification Contract

Allowed classifications:

- `active-method`: already powers normalized toolkit methods.
- `active-skill-rule`: already influences active skill behavior or acceptance rules.
- `active-profile-route`: already supports profiles, routing, or delegated tool selection.
- `active-reference`: useful current-scope reference guidance with no install, activation, or raw import.
- `active-read-only`: current-scope source intelligence with no install, indexing, MCP/global config, product repo scanning, or execution by default.
- `planned-extraction`: useful source intelligence that should be converted into toolkit-owned methods, routing, or evals.
- `reference-only-with-reason`: useful context that must remain passive because trust, license, runtime, or duplication risk is unresolved.
- `archive-candidate`: retained for historical context but not worth current extraction.
- `remove-candidate`: no useful value path or creates noise.
- `reject`: should not be used.

v0.2.3 source-review outcomes are recorded separately from classifications: `SYNCED_ADOPTED`, `SYNCED_REFERENCE`, `SYNCED_PLUGIN_DELEGATED`, `ARCHIVED_HARD_BLOCKER`, or `REMOVED_REDUNDANT`. No active watched source may remain in passive `REVIEWED_HELD`.

Allowed recommendations: `Must do next`, `Do later`, `Needs owner decision`, `Reject / not aligned`.

## Watched Sources

| ID | Source | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| anthropic-skills | Anthropic Skills | active-method | Do later | Skill anatomy, source discovery, UIUX methods | Keep restricted normalized guidance only | No raw skill copying or active authority |
| openai-skills | OpenAI Skills | reference-only-with-reason | Needs owner decision | Source record only | Decide whether unique packaging guidance exists | No raw skill import or activation |
| addy-osmani-agent-skills | Addy Osmani Agent Skills | active-method | Do later | `methods/osmani/*`, lifecycle gates | Add eval coverage where method routing is weak | No raw prompt/body copying |
| supabase-agent-skills | Supabase Agent Skills | active-method | Do later | v0.2.3 `SYNCED_PLUGIN_DELEGATED`; `methods/backend/supabase-postgres-rls-gates.md`, `methods/security/application-security-readiness.md`, `methods/api/api-contract-and-routing-readiness.md`, and `methods/release/release-rollback-readiness.md` | Keep RLS/auth/API/release gates current; delegate live operations to Supabase plugin/tooling | No Supabase CLI, database, RLS, migration, env, MCP, or product-repo mutation from source record |
| trailofbits-skills | Trail of Bits Skills | active-method | Do later | v0.2.3 `SYNCED_ADOPTED`; `methods/security/differential-security-review.md` | Keep differential review rubric current with cleanroom concepts | No copied upstream text; license remains caveated |
| microsoft-playwright | Microsoft Playwright | active-method | Do later | v0.2.3 `SYNCED_PLUGIN_DELEGATED`; `methods/uiux/webapp-testing.md` and project-owned browser-tool routing | Keep browser-evidence reporting sharp | No browser/pass claims without output |
| bencium-marketplace | Bencium Marketplace | archive-candidate | Do later | Historical source-safety evidence only | Re-add only after owner-approved source review | No active monitoring, sourceRef reliance, brand/template copying, install, or runtime use |
| karpathy-inspired-skills | Karpathy-Inspired Skills | reference-only-with-reason | Do later | Historical cleanroom evidence only | Keep toolkit-authored methods independent of upstream wording | No active source authority, upstream wording, examples, prompt structure, or runtime behavior |
| matt-pocock-skills | Matt Pocock Skills | active-method | Do later | `methods/matt/*`, TDD, PRD/issues, triage | Monitor and extract only if a new unique method is identified | No duplicate Superpowers/Codex workflow runtime |
| shadcn-ui | shadcn/ui | active-reference | Do later | v0.2.3 `SYNCED_REFERENCE`; `methods/uiux/design-system.md` reference guidance | Keep semantic tokens, accessible defaults, ownership model, and compatibility gates current | No CLI, MCP, registry JSON, component source, package/config import |
| vercel-agent-skills | Vercel Agent Skills | reference-only-with-reason | Do later | Historical/reference-only source record | Revisit only if a unique toolkit method is identified | Not active authority |
| vercel-find-skills | Vercel find-skills | reference-only-with-reason | Do later | v0.2.3 `SYNCED_REFERENCE`; historical/reference-only source record | Revisit only through Skill Scout; prefer first-party Vercel plugin/docs for live work | Not active execution authority |
| addyosmani-web-quality-skills | Addy Osmani Web Quality Skills | active-method | Do later | `methods/uiux/webapp-testing.md` | Connect more tightly to axe/Lighthouse/browser evidence | No fake browser or quality claims |
| voltagent-awesome-design-md | VoltAgent Awesome Design.md | planned-extraction | Do later | UIUX source map | Design-context loading and DESIGN.md checks | No brand/template copying |
| voltagent-awesome-agent-skills | VoltAgent Awesome Agent Skills | reference-only-with-reason | Do later | Source record only | Compare orchestration ideas after RuFlo extraction | No raw agent activation |
| impeccable | Impeccable | active-skill-rule | Do later | v0.2.3 `SYNCED_ADOPTED`; UIUX source map, `methods/uiux/premium-visual-quality.md`, and skill behavior | Motion, polish, context-loading, rendered-evidence, and accessibility-hidden overflow false-positive criteria | No CLI, detector, live-browser workflow, package, Dependabot config, CI workflow, or skill-bundle activation |
| uncodixfy | Uncodixfy | active-skill-rule | Do later | Anti-generic UIUX guidance | Generic-AI UI smell rubric and evals | No raw prompt copying |
| agency-agents | Agency Agents | archive-candidate | Archived from active freshness monitoring | Source record only | Re-add only if a concrete owner-approved method emerges | No agent/runtime import |
| superpowers | Superpowers | active-method | Do later | TDD/verification/source-safety references; external plugin delegation | Keep toolkit-owned guardrails minimal | Do not duplicate plugin workflows |
| everything-claude-code | Everything Claude Code | active-method | Do later | v0.2.3 `SYNCED_REFERENCE`; `methods/internal/source-safety-scoring.md` | Keep cross-harness config/hook/MCP/session risks in source-safety method | No active Claude/Cursor/Cline/OpenHands support claim, global config, hook, session adapter, control-plane, or MCP import |
| code-review-graph | code-review-graph | active-read-only | Do later | v0.2.3 `SYNCED_ADOPTED`; context graph/token governance methods | Keep context graph methods tied to source-only planning | No install, CLI, MCP, global config, product indexing/scanning, generated graph output, or whole-repo dump |
| ruflo | RuFlo | active-method | Do later | v0.2.3 `SYNCED_ADOPTED`; `methods/orchestration/static-task-state-handoff-ledger.md` | Keep static task-state, handoff, stop-condition, and failure-accounting discipline current | No daemon, worker, hook, MCP, memory, plugin, package, script, background runtime, file watcher, global config, or runtime persistence |

## Internal Audit Artifacts

| ID | Artifact | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| ui-ux-pro-max-audit | UI UX Pro Max audit | active-skill-rule | Must do next | `docs/UI_UX_PRO_MAX_AUDIT.md`, UIUX source map, UIUX skill behavior | Concise mobile fit, touch target, safe area, chart, form recovery, navigation, and rendered-evidence guardrails | No UI UX Pro Max activation, raw prompt copying, scripts, design-system file persistence, install, refork, reinstall, or uninstall |

## Registered Tools

| ID | Tool | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| typescript | TypeScript | active-profile-route | Do later | Baseline if project script exists; v0.2 default-install posture | Keep typecheck as existing-script route | No install or CI wiring from metadata |
| eslint | ESLint | active-profile-route | Do later | Standalone baseline lint metadata; v0.2 default-install posture | Keep ESLint as default lint route with typed and React hooks supplements | No install or config rewrite from metadata |
| typescript-eslint | typescript-eslint | active-profile-route | Do later | Baseline if configured; v0.2 default-install posture | Keep linting as existing-script route | No install or config rewrite |
| eslint-plugin-react-hooks | eslint-plugin-react-hooks | active-profile-route | Do later | React correctness metadata; v0.2 default-install posture | Keep hooks rule expectations in code-quality gates | No install or config rewrite |
| biome | Biome | active-profile-route | Do later | Use-if-existing or owner-approved migration only | Keep as migration-only lint/format route | No formatter churn from metadata |
| oxlint | Oxlint | active-profile-route | Do later | Active acceleration metadata for large JS/TS/React repos | Supplement ESLint on large repos when owner-approved | No formatter/linter install from metadata |
| knip | Knip | active-profile-route | Do later | Use-if-existing cleanup candidate only | Keep out of default/active profiles | No broad deletion from metadata |
| react-doctor | React Doctor | active-profile-route | Do later | Active-install-if-project-type for React projects | Static React smell taxonomy and React risk evidence when actually run | No scanner activation, GitHub Action, PR write, or agent skill install without approval |
| vitest | Vitest | active-profile-route | Do later | Baseline test metadata | Existing-script test route | No dependency install |
| testing-library | Testing Library | active-profile-route | Do later | Component testing metadata | Existing-script component testing route | No package install |
| playwright | Playwright | active-profile-route | Do later | Browser validation route | Rendered workflow evidence | No browser/pass claims without output |
| axe-playwright | axe with Playwright | active-profile-route | Do later | Conditional accessibility route | Accessibility acceptance evidence | No install or fake accessibility pass |
| lighthouse-ci | Lighthouse CI | active-profile-route | Do later | Conditional performance route | Performance/accessibility budgets | No CI wiring from metadata |
| codeql | CodeQL | active-profile-route | Do later | Conditional security scanner | Code scanning when configured | No CI/code-scanning setup from metadata |
| semgrep | Semgrep | active-profile-route | Do later | Conditional SAST metadata | Static security rule routing | No install or cloud usage from metadata |
| gitleaks | Gitleaks | active-profile-route | Do later | Baseline secret scanning metadata | Existing-script secret scan route | No deep scan claim without output |
| trufflehog | TruffleHog | reference-only-with-reason | Needs owner decision | Deep approval metadata | Deep secret scan only after scoped approval | No networked/deep scan without approval |
| osv-scanner | OSV-Scanner | active-profile-route | Do later | Baseline vuln metadata | Existing-script dependency scan route | No dependency scan claim without output |
| dependabot | Dependabot | active-profile-route | Do later | Dependency bot metadata | Choose one dependency bot per repo | No bot/config activation from metadata |
| renovate | Renovate | active-profile-route | Do later | Dependency bot metadata | Choose one dependency bot per repo | No bot/config activation from metadata |
| socket | Socket | reference-only-with-reason | Needs owner decision | Deep supply-chain approval metadata | Owner-approved supply-chain scan only | No external service use without approval |
| trivy | Trivy | active-profile-route | Do later | Conditional container/IaC metadata | Route only when assets exist | No install or CI wiring |
| checkov | Checkov | active-profile-route | Do later | Conditional IaC metadata | Route only when IaC/cloud config exists | No install or CI wiring |
| owasp-zap-baseline | OWASP ZAP baseline | reference-only-with-reason | Needs owner decision | Deep DAST approval metadata | Approved URL scan only | No DAST against unapproved target |
| actionlint | actionlint | active-profile-route | Do later | Conditional workflow lint metadata | Workflow syntax/security route | No CI rewrite |
| zizmor | zizmor | active-profile-route | Do later | Conditional workflow security metadata | Workflow security route | No CI rewrite |
| harden-runner | Harden-Runner | reference-only-with-reason | Needs owner decision | Deep runner hardening metadata | Owner-approved CI hardening only | No workflow/egress config change |
| reviewdog | reviewdog | active-profile-route | Do later | Deterministic PR feedback metadata | Scanner-output transport only | Do not duplicate CodeRabbit AI review |
| coderabbit | CodeRabbit | active-profile-route | Needs owner decision | Delegated contextual PR review integration | Use only when connected and approved per repo | No install/config/GitHub app permission change |
| github-gh | GitHub/gh | active-profile-route | Do later | Delegated repo operations | PR/check/status evidence | No PR write/merge without explicit task |
| code-review-graph | code-review-graph | active-read-only | Do later | Metadata-only source intelligence | Context graph and token budget governance methods | No install, CLI, MCP, global config, product indexing/scanning, or whole-repo dump |
| open-design | open-design | active-reference | Do later | Metadata-only UIUX reference | Keep as read-only design intelligence | No install, MCP, global config, raw design-system import, or unmanaged persistence |
| openssf-scorecard | OpenSSF Scorecard | planned-extraction | Do later | Source-trust metadata | Source safety scoring criteria | No tool execution by default |
| dependency-cruiser | dependency-cruiser | active-profile-route | Do later | Active-install-if-project-type architecture hardening metadata | Dependency-boundary review heuristics | No install or generated graph by default |
| eslint-plugin-boundaries | eslint-plugin-boundaries | active-profile-route | Do later | Active-install-if-project-type only after architecture layers are stable and owner-approved | Layer/import ownership policy after owner decision | No install, package/config rewrite, or CI wiring from metadata |
| madge | Madge | active-profile-route | Do later | Active-install-if-project-type circular-dependency metadata | Dependency cycle review heuristic | No install or generated graph by default |
| jscpd | jscpd | active-profile-route | Do later | Active-install-if-project-type duplication metadata | Copy/paste duplication review heuristic | No install or cleanup churn |

## v0.2 Project Tooling Posture

The following project install classes are metadata-only recommendation posture. They do not approve installs, activation, CI wiring, MCP setup, global config changes, product-repository changes, or tool execution.

- eslint: default-install.
- typescript: default-install.
- typescript-eslint: default-install.
- eslint-plugin-react-hooks: default-install.
- vitest: default-install.
- testing-library: default-install.
- playwright: default-install.
- gitleaks: default-install.
- osv-scanner: default-install.
- react-doctor: active-install-if-project-type.
- oxlint: active-install-if-project-type.
- axe-playwright: active-install-if-project-type.
- lighthouse-ci: active-install-if-project-type.
- semgrep: active-install-if-project-type.
- dependency-cruiser: active-install-if-project-type.
- actionlint: active-install-if-project-type.
- zizmor: active-install-if-project-type.
- trivy: active-install-if-project-type.
- checkov: active-install-if-project-type.
- madge: active-install-if-project-type.
- jscpd: active-install-if-project-type.
- codeql: use-if-existing.
- dependabot: use-if-existing.
- renovate: use-if-existing.
- reviewdog: use-if-existing.
- coderabbit: use-if-existing.
- github-gh: use-if-existing.
- biome: use-if-existing.
- knip: use-if-existing.
- socket: approval-required.
- trufflehog: approval-required.
- owasp-zap-baseline: approval-required.
- harden-runner: approval-required.
- code-review-graph: active-read-only.
- open-design: active-reference.
- eslint-plugin-boundaries: active-install-if-project-type.
- Impeccable project-local install mode: approval-required.
- Base UI: removed-from-current-scope.
- Figma: removed-from-current-scope.

## v0.2.2 Activation Overlay

The project install classes above remain metadata-only. v0.2.2 adds a stronger detected-tool model:

- React Doctor: `active-if-detected`; `owner-approved-install` when absent; Action/PR write/agent skill install separately approval-gated.
- Playwright: `active-if-detected`; `ci-advisory` first; `ci-blocking-after-calibration` only after stable evidence and owner approval; v0.2.3 source freshness resolves runtime-sensitive drift through `SYNCED_PLUGIN_DELEGATED`.
- Gitleaks and OSV Scanner: `active-if-detected` or `owner-approved-install` as baseline security tools.
- Semgrep: `active-if-detected` when present; `owner-approved-install` when absent; `ci-advisory` until rules are scoped.
- Oxlint: `active-if-detected` or `owner-approved-install`; supplements ESLint and typed rules.
- dependency-cruiser, Madge, and jscpd: `active-if-detected` or `owner-approved-install` for architecture and duplication checks.
- actionlint and zizmor: `active-if-detected` or `owner-approved-install` for GitHub Actions hardening.
- GSD-style discipline: active governance discipline/reference when already available; no install, vendoring, or global config without approval.
- RuFlo-style concepts: `static-adopted`; runtime hooks, memory, MCP, daemon, global config, background process, file watcher, and runtime persistence are `forbidden-runtime`.

## v0.2.3 Zero Passive Holds Overlay

- Supabase Agent Skills: `SYNCED_PLUGIN_DELEGATED`; cleanroom RLS/auth/API/release gates adopted, live operations delegated to the Supabase plugin/project tooling.
- Trail of Bits Skills: `SYNCED_ADOPTED`; license-safe differential-security review discipline adopted, raw CC-BY-SA text and plugin/runtime behavior rejected.
- Microsoft Playwright: `SYNCED_PLUGIN_DELEGATED`; browser-evidence guidance adopted, execution delegated to project-owned Playwright/browser tooling.
- shadcn/ui: `SYNCED_REFERENCE`; active design-system reference guidance retained, package/lockfile/CLI drift rejected.
- Vercel find-skills: `SYNCED_REFERENCE`; historical discovery reference only, first-party Vercel plugin/docs preferred for live Vercel work.
- Impeccable: `SYNCED_ADOPTED`; UI quality concepts adopted, including accessibility-hidden text overflow false-positive discipline; CLI/live-browser/detector/package/Dependabot/CI workflow behavior rejected.
- Everything Claude Code: `SYNCED_REFERENCE`; cross-harness source-safety awareness retained, no active cross-runtime support claims.
- code-review-graph: `SYNCED_ADOPTED`; active read-only context/token governance methods retained.
- RuFlo: `SYNCED_ADOPTED`; static task-state/handoff discipline adopted, runtime memory/hooks/MCP/daemon/global behavior forbidden.

## Rejected Operations

- [Reject / not aligned] No raw shadcn CLI/component import, registry JSON import, package install, or MCP setup.
- [Reject / not aligned] No open-design install, MCP setup, global config, or unmanaged design-system persistence.
- [Reject / not aligned] No UI UX Pro Max activation or raw upstream prompt copying.
- [Reject / not aligned] No RuFlo daemon, worker, hook, MCP, memory, plugin, package, script, or background runtime.
- [Reject / not aligned] No code-review-graph CLI/MCP/global config/product-repo indexing or whole-repo context dumping.
- [Reject / not aligned] No source/tool record may be treated as approval to run, install, activate, extract, sync, or publish.
