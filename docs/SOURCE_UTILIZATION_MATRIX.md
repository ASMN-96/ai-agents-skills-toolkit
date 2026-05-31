# Source Utilization Matrix

This report is the canonical classification gate for source and tool metadata. It does not approve installs, activation, MCP setup, CI wiring, source copying, compiled-agent regeneration, or product-repository indexing.

## Classification Contract

Allowed classifications:

- `active-method`: already powers normalized toolkit methods.
- `active-skill-rule`: already influences active skill behavior or acceptance rules.
- `active-profile-route`: already supports profiles, routing, or delegated tool selection.
- `planned-extraction`: useful source intelligence that should be converted into toolkit-owned methods, routing, or evals.
- `reference-only-with-reason`: useful context that must remain passive because trust, license, runtime, or duplication risk is unresolved.
- `archive-candidate`: retained for historical context but not worth current extraction.
- `remove-candidate`: no useful value path or creates noise.
- `reject`: should not be used.

Allowed recommendations: `Must do next`, `Do later`, `Needs owner decision`, `Reject / not aligned`.

## Watched Sources

| ID | Source | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| anthropic-skills | Anthropic Skills | active-method | Do later | Skill anatomy, source discovery, UIUX methods | Keep restricted normalized guidance only | No raw skill copying or active authority |
| openai-skills | OpenAI Skills | reference-only-with-reason | Needs owner decision | Source record only | Decide whether unique packaging guidance exists | No raw skill import or activation |
| addy-osmani-agent-skills | Addy Osmani Agent Skills | active-method | Do later | `methods/osmani/*`, lifecycle gates | Add eval coverage where method routing is weak | No raw prompt/body copying |
| supabase-agent-skills | Supabase Agent Skills | active-method | Do later | `methods/backend/supabase-postgres-rls-gates.md` | Keep RLS/backend gate current | No Supabase CLI or project mutation from source record |
| trailofbits-skills | Trail of Bits Skills | active-method | Do later | `methods/security/differential-security-review.md` | Keep differential review rubric current | No copied upstream text; license remains caveated |
| microsoft-playwright | Microsoft Playwright | active-method | Do later | `methods/uiux/webapp-testing.md` | Keep browser-evidence reporting sharp | No browser/pass claims without output |
| bencium-marketplace | Bencium Marketplace | active-method | Do later | UIUX/dashboard/design-system methods | Keep commercial dashboard quality patterns | No brand/template copying |
| karpathy-inspired-skills | Karpathy-Inspired Skills | active-method | Do later | Simplicity, assumptions, goal discipline | Keep surgical-change discipline concise | No personal-style absolutism as policy |
| matt-pocock-skills | Matt Pocock Skills | active-method | Do later | `methods/matt/*`, TDD, PRD/issues, triage | Monitor and extract only if a new unique method is identified | No duplicate Superpowers/Codex workflow runtime |
| shadcn-ui | shadcn/ui | planned-extraction | Must do next | UIUX source map, no registered method | Component composition, semantic tokens, accessible defaults, ownership model | No CLI, MCP, registry JSON, component source, package/config import |
| vercel-agent-skills | Vercel Agent Skills | reference-only-with-reason | Do later | Historical/reference-only source record | Revisit only if a unique toolkit method is identified | Not active authority |
| vercel-find-skills | Vercel find-skills | reference-only-with-reason | Do later | Historical/reference-only source record | Revisit only through Skill Scout | Not active authority |
| addyosmani-web-quality-skills | Addy Osmani Web Quality Skills | active-method | Do later | `methods/uiux/webapp-testing.md` | Connect more tightly to axe/Lighthouse/browser evidence | No fake browser or quality claims |
| voltagent-awesome-design-md | VoltAgent Awesome Design.md | planned-extraction | Do later | UIUX source map | Design-context loading and DESIGN.md checks | No brand/template copying |
| voltagent-awesome-agent-skills | VoltAgent Awesome Agent Skills | reference-only-with-reason | Do later | Source record only | Compare orchestration ideas after RuFlo extraction | No raw agent activation |
| impeccable | Impeccable | active-skill-rule | Do later | UIUX source map and skill behavior | Motion, polish, and context-loading acceptance criteria | No tool activation |
| uncodixfy | Uncodixfy | active-skill-rule | Do later | Anti-generic UIUX guidance | Generic-AI UI smell rubric and evals | No raw prompt copying |
| agency-agents | Agency Agents | archive-candidate | Needs owner decision | Source record only | Archive unless a concrete method emerges | No agent/runtime import |
| superpowers | Superpowers | active-method | Do later | TDD/verification/source-safety references; external plugin delegation | Keep toolkit-owned guardrails minimal | Do not duplicate plugin workflows |
| everything-claude-code | Everything Claude Code | active-method | Do later | Source safety scoring | Keep config/hook/MCP risks in source-safety method | No global config, hook, or MCP import |
| code-review-graph | code-review-graph | planned-extraction | Must do next | Source-only token governance inspiration | Keep context graph methods tied to source-only planning | No install, CLI, MCP, global config, product indexing, generated graph output, or whole-repo dump |
| ruflo | RuFlo | planned-extraction | Must do next | Source safety scoring only | Static task-state, handoff, adaptive replanning, failure accounting | No daemon, worker, hook, MCP, memory, plugin, package, script, or background runtime |

## Internal Audit Artifacts

| ID | Artifact | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| ui-ux-pro-max-audit | UI UX Pro Max audit | active-skill-rule | Must do next | `docs/UI_UX_PRO_MAX_AUDIT.md`, UIUX source map, UIUX skill behavior | Concise mobile fit, touch target, safe area, chart, form recovery, navigation, and rendered-evidence guardrails | No UI UX Pro Max activation, raw prompt copying, scripts, design-system file persistence, install, refork, reinstall, or uninstall |

## Registered Tools

| ID | Tool | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| typescript | TypeScript | active-profile-route | Do later | Baseline if project script exists | Keep typecheck as existing-script route | No install or CI wiring from metadata |
| typescript-eslint | typescript-eslint | active-profile-route | Do later | Baseline if configured | Keep linting as existing-script route | No install or config rewrite |
| eslint-plugin-react-hooks | eslint-plugin-react-hooks | active-profile-route | Do later | React correctness metadata | Keep hooks rule expectations in code-quality gates | No install or config rewrite |
| biome | Biome | active-profile-route | Do later | Conditional metadata | Use only if project already owns it | No formatter churn from metadata |
| oxlint | Oxlint | active-profile-route | Do later | Conditional metadata | Use only if project already owns it | No formatter/linter install |
| knip | Knip | active-profile-route | Do later | Conditional cleanup metadata | Later cleanup routing | No broad deletion from metadata |
| react-doctor | React Doctor | planned-extraction | Do later | Source-review-required metadata | Static React smell taxonomy | No scanner activation without approval |
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
| code-review-graph | code-review-graph | planned-extraction | Must do next | Metadata-only source intelligence | Context graph and token budget governance methods | No install, CLI, MCP, global config, product indexing, or whole-repo dump |
| open-design | open-design | reference-only-with-reason | Needs owner decision | Metadata-only UIUX reference | Archive or review before extraction | No install, MCP, or raw design-system import |
| openssf-scorecard | OpenSSF Scorecard | planned-extraction | Do later | Source-trust metadata | Source safety scoring criteria | No tool execution by default |
| dependency-cruiser | dependency-cruiser | planned-extraction | Do later | Architecture-boundary metadata | Dependency-boundary review heuristics | No install or generated graph by default |
| eslint-plugin-boundaries | eslint-plugin-boundaries | planned-extraction | Do later | Architecture-boundary metadata | Layer/import ownership policy | No config rewrite |
| madge | Madge | planned-extraction | Do later | Circular-dependency metadata | Dependency cycle review heuristic | No install or generated graph by default |
| jscpd | jscpd | planned-extraction | Do later | Duplication metadata | Copy/paste duplication review heuristic | No install or cleanup churn |

## Rejected Operations

- [Reject / not aligned] No raw shadcn CLI/component import, registry JSON import, package install, or MCP setup.
- [Reject / not aligned] No open-design install, MCP setup, global config, or unmanaged design-system persistence.
- [Reject / not aligned] No UI UX Pro Max activation or raw upstream prompt copying.
- [Reject / not aligned] No RuFlo daemon, worker, hook, MCP, memory, plugin, package, script, or background runtime.
- [Reject / not aligned] No code-review-graph CLI/MCP/global config/product-repo indexing or whole-repo context dumping.
- [Reject / not aligned] No source/tool record may be treated as approval to run, install, activate, extract, sync, or publish.
