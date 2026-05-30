# Registry Generation Readiness Report

Report-only readiness signal. This file does not generate registries, approve sources, approve tools, change routing, change trust status, or update runtime activation.

Future generation may derive stable identity and descriptive fields from frontmatter. Routing decisions, tool trust, license approvals, security status, allowed environments, activation status, and release gates must remain hand-maintained unless a later reviewed contract explicitly narrows that rule.

## skills

| Entry | Source path | Frontmatter status | Missing fields | Generator posture |
| --- | --- | --- | --- | --- |
| riss-governance | skills/riss-governance/SKILL.md | frontmatter-ready | none | candidate-input |
| riss-agent-governance | skills/riss-agent-governance/SKILL.md | frontmatter-ready | none | candidate-input |
| riss-skill-governance | skills/riss-skill-governance/SKILL.md | frontmatter-ready | none | candidate-input |
| vd-premium-uiux | skills/vd-premium-uiux/SKILL.md | frontmatter-ready | none | candidate-input |
| riss-code-quality | skills/riss-code-quality/SKILL.md | frontmatter-ready | none | candidate-input |
| riss-security-review | skills/riss-security-review/SKILL.md | frontmatter-ready | none | candidate-input |
| riss-release-gate | skills/riss-release-gate/SKILL.md | frontmatter-ready | none | candidate-input |

## agents

| Entry | Source path | Frontmatter status | Missing fields | Generator posture |
| --- | --- | --- | --- | --- |
| product-agent | agents/product-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| architect-agent | agents/architect-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| frontend-agent | agents/frontend-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| uiux-agent | agents/uiux-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| backend-contract-agent | agents/backend-contract-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| database-rls-agent | agents/database-rls-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| security-agent | agents/security-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| qa-test-agent | agents/qa-test-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| reviewer-agent | agents/reviewer-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| release-manager-agent | agents/release-manager-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| sre-performance-agent | agents/sre-performance-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| skill-scout-agent | agents/skill-scout-agent.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |

## profiles

| Entry | Source path | Frontmatter status | Missing fields | Generator posture |
| --- | --- | --- | --- | --- |
| audit-profile | profiles/audit-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| implementation-profile | profiles/implementation-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| frontend-profile | profiles/frontend-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| backend-profile | profiles/backend-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| uiux-profile | profiles/uiux-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| security-profile | profiles/security-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| sre-profile | profiles/sre-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |
| release-profile | profiles/release-profile.md | frontmatter-missing | name, description | manual-until-frontmatter-exists |

## methods

| Entry | Source path | Frontmatter status | Missing fields | Generator posture |
| --- | --- | --- | --- | --- |
| backend.supabase-postgres-rls-gates | methods/backend/supabase-postgres-rls-gates.md | frontmatter-ready | none | candidate-input |
| internal.engineering-lifecycle-gates | methods/internal/engineering-lifecycle-gates.md | frontmatter-ready | none | candidate-input |
| internal.frontend-uiux-quality-gates | methods/internal/frontend-uiux-quality-gates.md | frontmatter-ready | none | candidate-input |
| internal.simplicity-surgical-change-discipline | methods/internal/simplicity-surgical-change-discipline.md | frontmatter-ready | none | candidate-input |
| internal.skill-anatomy | methods/internal/skill-anatomy.md | frontmatter-ready | none | candidate-input |
| internal.source-discovery-workflow | methods/internal/source-discovery-workflow.md | frontmatter-ready | none | candidate-input |
| internal.source-safety-scoring | methods/internal/source-safety-scoring.md | frontmatter-ready | none | candidate-input |
| internal.tdd-verification-alignment | methods/internal/tdd-verification-alignment.md | frontmatter-ready | none | candidate-input |
| karpathy.assumption-surfacing | methods/karpathy/assumption-surfacing.md | frontmatter-ready | none | candidate-input |
| karpathy.goal-driven-execution | methods/karpathy/goal-driven-execution.md | frontmatter-ready | none | candidate-input |
| karpathy.simplicity-surgical-changes | methods/karpathy/simplicity-surgical-changes.md | frontmatter-ready | none | candidate-input |
| matt.design-interface | methods/matt/design-interface.md | frontmatter-ready | none | candidate-input |
| matt.git-guardrails | methods/matt/git-guardrails.md | frontmatter-ready | none | candidate-input |
| matt.grill-me | methods/matt/grill-me.md | frontmatter-ready | none | candidate-input |
| matt.improve-architecture | methods/matt/improve-architecture.md | frontmatter-ready | none | candidate-input |
| matt.tdd | methods/matt/tdd.md | frontmatter-ready | none | candidate-input |
| matt.to-issues | methods/matt/to-issues.md | frontmatter-ready | none | candidate-input |
| matt.to-prd | methods/matt/to-prd.md | frontmatter-ready | none | candidate-input |
| matt.triage-issue | methods/matt/triage-issue.md | frontmatter-ready | none | candidate-input |
| osmani.api-interface-design | methods/osmani/api-interface-design.md | frontmatter-ready | none | candidate-input |
| osmani.code-review-quality | methods/osmani/code-review-quality.md | frontmatter-ready | none | candidate-input |
| osmani.engineering-lifecycle-gates | methods/osmani/engineering-lifecycle-gates.md | frontmatter-ready | none | candidate-input |
| osmani.frontend-ui-engineering | methods/osmani/frontend-ui-engineering.md | frontmatter-ready | none | candidate-input |
| osmani.incremental-implementation | methods/osmani/incremental-implementation.md | frontmatter-ready | none | candidate-input |
| osmani.performance-optimization | methods/osmani/performance-optimization.md | frontmatter-ready | none | candidate-input |
| osmani.security-hardening | methods/osmani/security-hardening.md | frontmatter-ready | none | candidate-input |
| osmani.shipping-launch | methods/osmani/shipping-launch.md | frontmatter-ready | none | candidate-input |
| osmani.spec-driven-development | methods/osmani/spec-driven-development.md | frontmatter-ready | none | candidate-input |
| osmani.test-driven-development | methods/osmani/test-driven-development.md | frontmatter-ready | none | candidate-input |
| security.differential-security-review | methods/security/differential-security-review.md | frontmatter-ready | none | candidate-input |
| uiux.accessibility | methods/uiux/accessibility.md | frontmatter-ready | none | candidate-input |
| uiux.dashboard-ux | methods/uiux/dashboard-ux.md | frontmatter-ready | none | candidate-input |
| uiux.design-system | methods/uiux/design-system.md | frontmatter-ready | none | candidate-input |
| uiux.frontend-design | methods/uiux/frontend-design.md | frontmatter-ready | none | candidate-input |
| uiux.interaction-motion | methods/uiux/interaction-motion.md | frontmatter-ready | none | candidate-input |
| uiux.premium-visual-quality | methods/uiux/premium-visual-quality.md | frontmatter-ready | none | candidate-input |
| uiux.responsive-layout | methods/uiux/responsive-layout.md | frontmatter-ready | none | candidate-input |
| uiux.webapp-testing | methods/uiux/webapp-testing.md | frontmatter-ready | none | candidate-input |

## Manual Fields That Must Not Be Auto-Generated

- routing matrix scenarios and selected skills
- external tool enterprise-risk judgments
- license, trust, security, approval, and allowed-environment decisions
- active runtime status
- CI, MCP, GitHub, or product-repository permissions
- public/private release classifications
