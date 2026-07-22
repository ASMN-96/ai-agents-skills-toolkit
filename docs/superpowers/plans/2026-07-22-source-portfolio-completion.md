# Source Portfolio Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review every retained source at an exact current revision, extract and synthesize all defensible unique value by niche, retire or constrain duplication, and prove complete source-to-capability-to-artifact-to-evaluation traceability.

**Architecture:** Process sources in bounded niche waves after the synthesis foundation is operational. Each wave performs exact source review, contribution inventory, overlap comparison, best-of-source synthesis, artifact/eval mapping, rejection recording, and atomic regeneration. Portfolio completion is a separate profile from enterprise-core release readiness.

**Tech Stack:** Node.js 22 ESM, JSON/Markdown registries and receipts, existing freshness/review/generation CLIs, no new runtime dependencies.

## Global Constraints

- Requires completed Foundation, Impact/Distribution, and Taste/UIUX plans.
- Active denominator is 81 after Taste registration: 80 baseline sources plus `taste-skill`.
- The five archived sources are outside the active denominator and cannot own active capabilities.
- No source is approved from legacy prose, popularity, a license label, or freshness alone.
- Never execute upstream scripts, install dependencies, copy raw source material, activate tools, modify global configuration, access credentials/private overlays, or touch product repositories.
- Each source review pins exact revision/edition, content digest, immutable receipt, locators, license/security/prompt-injection evidence, and rollback ancestor.
- Every adopted/adapted/delegated contribution needs a canonical artifact and eval. Every rejected/superseded contribution needs a reason.
- Compare all overlapping sources before choosing an owner. One capability has one active toolkit owner and one approved active synthesis.
- Tool alternatives may remain separate only for documented environment/trade-off differences; routing selects the minimum appropriate tool.
- A failed or uncertain review remains pending/stale/blocked. Do not weaken evidence to reach portfolio completion.
- Process one niche wave per reviewable commit series and run focused gates before the next wave.
- Portfolio completion does not imply runtime execution, production proof, native-platform proof, or business impact.

## Governed Source Review Transaction

Every source in every wave follows this exact transaction:

1. Resolve the exact Git SHA or authoritative document edition/content digest.
2. Retrieve only required review material to an OS temporary location.
3. Review license, ownership, maintenance, dangerous commands, scripts, packages, network, filesystem, secrets, credentials, hooks, CI, global config, prompt injection, and compatibility.
4. Inventory every meaningful contribution as idea, mindset, method, workflow, skill pattern, tool, test, standard, constraint, or counterexample.
5. Compare contributions with every source in the same niche and existing toolkit artifacts.
6. Decide `adopted`, `adapted`, `delegated`, `reference-only`, `rejected`, or `superseded` for each contribution.
7. Prepare and dry-run the immutable SourceReviewReceipt.
8. Apply the receipt only after evidence is complete and the accountable identity is `repository-owner:abdal`.
9. Atomically update SourceAssessment, synthesis inputs/decisions, artifact/eval refs, and affected-artifact coverage.
10. Regenerate utilization, freshness, compiled provenance where consumed, runtime mirrors, and embedded package.
11. Run contract, impact, generation, and niche eval gates.
12. Review the diff for raw source copying, dependencies, runtime activation, unrelated changes, and unsupported claims.

---

### Task 1: Add portfolio-completeness validation and reporting

**Files:**

The generated report artifacts below are planned and not active until this task creates them.

- Create: `scripts/validate-source-portfolio.mjs`
- Create: `scripts/test-source-portfolio.mjs`
- Modify: `scripts/validate-toolkit.mjs`
- Modify: `scripts/run-release-gate.mjs`
- Generate (planned, not active until created): `docs\/SOURCE_PORTFOLIO_REPORT.md`
- Generate (planned, not active until created): `docs\/SOURCE_PORTFOLIO_REPORT.json`

**Interfaces:**
- CLI profiles: `structural`, `release-scope`, `portfolio-complete`.
- Produces machine-readable counts and exact failure lists.
- Release gate uses `release-scope`; a separate explicit command uses `portfolio-complete`.

- [ ] **Step 1: Add failing profile and metric tests**

```js
test("portfolio completeness denominator includes Taste after registration", () => {
  const summary = summarizePortfolioCompleteness(fixtureCatalogWithTaste(), fixtureRegistry());
  assert.equal(summary.baselineRetainedSources, 80);
  assert.equal(summary.activeCatalogSources, 81);
  assert.equal(summary.stateCountsTotal, 81);
});

test("release scope does not fail for unrelated pending optional sources", () => {
  const result = validatePortfolioProfile("release-scope", optionalPendingFixture());
  assert.equal(result.releaseBlocking.length, 0);
  assert.ok(result.advisories.includes("taste-skill:pending-review"));
});

test("portfolio complete fails on every orphan pending broken or duplicate edge", () => {
  const result = validatePortfolioProfile("portfolio-complete", incompleteFixture());
  assert.deepEqual(result.failures.map((entry) => entry.code).sort(), [
    "BROKEN_EDGE",
    "DUPLICATE_ACTIVE_OWNER",
    "ORPHAN_SOURCE",
    "PENDING_ASSESSMENT"
  ]);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-source-portfolio.mjs
```

Expected: FAIL because portfolio validator and reports do not exist.

- [ ] **Step 3: Implement deterministic summaries**

Report:

```js
{
  baselineRetainedSources: 80,
  activeCatalogSources,
  assessmentStates,
  contributionOutcomes,
  orphanSourceIds,
  brokenEdges,
  duplicateActiveOwners,
  unexplainedOverlapGroups,
  acceptedArtifactCoverage,
  acceptedEvaluationCoverage,
  portfolioActionable,
  releaseBlocking,
  staticEvidenceCount,
  observedEvidenceCount
}
```

Require state totals to equal the active denominator, 100% unique value or retirement decisions, 100% accepted artifact/eval mapping, and zero broken/orphan/duplicate edges for `portfolio-complete`.

- [ ] **Step 4: Add non-mutating report generation**

Default to `--check`; `--confirm-write` writes reports atomically. Add `portfolio-complete` to the manual/release workflow only when explicitly selected; do not make optional portfolio work a hidden enterprise-core blocker.

- [ ] **Step 5: Run tests and commit**

```text
node --test scripts/test-source-portfolio.mjs
node scripts/validate-source-portfolio.mjs structural --confirm-write
node scripts/validate-source-portfolio.mjs structural --check
# The two generated report artifacts are planned and not active before this task.
git add scripts/validate-source-portfolio.mjs scripts/test-source-portfolio.mjs scripts/validate-toolkit.mjs scripts/run-release-gate.mjs docs\/SOURCE_PORTFOLIO_REPORT.md docs\/SOURCE_PORTFOLIO_REPORT.json
git commit -m "feat(sources): validate portfolio completeness"
```

---

### Task 2: Complete the enterprise-core standards wave

**Sources:**

```text
nist-ssdf-ai
nist-ai-rmf-genai
owasp-llmsvs
owasp-agentic-applications
slsa-v1-2
openssf-ai-code-assistant-instructions
nist-ssdf
owasp-asvs
```

**Files:**
- Modify: `sources/source-watchlist.json`
- Modify/create immutable receipts under each source's canonical `sources/reviews/` directory returned by `receiptRelativePath()`
- Modify: `registries/source-capabilities.registry.json`
- Modify only mapped canonical gates/methods/evals identified by review.

**Interfaces:**
- Uses `authoritative-baseline` synthesis strategy where normative.
- Versioned standards use 90-day monitor and 180-day deep-review ceilings unless a narrower risk interval is documented.

- [ ] **Step 1: Verify all eight existing receipts and exact current evidence**

Run source governance validation and compare catalog revision/digest/receipt chains. Any changed, expired, or mismatched source returns to stale/pending before contribution assessment.

- [ ] **Step 2: Inventory contributions and overlap**

Map secure development, AI lifecycle, AI risk, LLM/agent security, provenance, instruction security, application verification, human approval, and rollback controls. Record where NIST, OWASP, OpenSSF, and SLSA overlap or constrain one another.

- [ ] **Step 3: Create authoritative syntheses and exact gates/evals**

One active owner per capability. Do not claim NIST/OWASP/SLSA certification or conformance. Map reviewed concepts to existing enterprise-core gates and static evals; add a method/gate only for a genuine missing capability.

If a source's current receipt is `SYNCED_REFERENCE` and its reviewed concepts now produce or modify an active artifact, prepare and apply a successor `SYNCED_ADOPTED` receipt bound to the exact artifact and eval digests before marking the synthesis approved. Reference receipts alone cannot authorize adopted artifacts.

- [ ] **Step 4: Apply complete assessment updates and validate**

```text
node scripts/validate-source-governance.mjs --freshness-report docs/SOURCE_FRESHNESS_REPORT.json
node --test scripts/test-source-synthesis-contract.mjs scripts/test-source-capability-impact.mjs scripts/test-source-portfolio.mjs
node scripts/validate-source-portfolio.mjs release-scope --check
node scripts/validate-toolkit.mjs
```

- [ ] **Step 5: Commit the isolated wave**

```text
# The two generated report artifacts are planned and not active before Task 1 creates them.
git add sources registries/source-capabilities.registry.json methods registries/domain-packs.registry.json evals docs\/SOURCE_PORTFOLIO_REPORT.json docs\/SOURCE_PORTFOLIO_REPORT.md
git commit -m "feat(sources): synthesize enterprise standards"
```

---

### Task 3: Complete the agent runtime, orchestration, context, and memory wave

**Sources:**

```text
anthropic-skills
openai-skills
superpowers
everything-claude-code
ruflo
gitlab-agent-skills
gitlab-agentic-tool-development
aider-repo-map
openai-prompt-caching
openai-codex-behavior-boundaries
gsd-core
repomix
openai-codex-guidance
anthropic-claude-code-subagents
```

**Files:**
- Source catalog, exact receipts, synthesis registry.
- Existing orchestration/internal/governance methods and evals only when mapped.
- Compiler/runtime adapters only when authoritative current guidance requires a tested compatibility change.

**Interfaces:**
- Separate native host behaviour, toolkit policy, optional context tooling, and forbidden persistent runtimes.

- [ ] **Step 1: Execute the governed review transaction for all 14 sources**

Prioritize official OpenAI/Anthropic behaviour, then compare community orchestration sources. Reject duplicated runtime layers, loop agents, daemons, global hooks, memory services, MCP activation, whole-repo dumping, and claims of invocation without evidence.

- [ ] **Step 2: Synthesize distinct capabilities**

Cover instruction hierarchy, subagent selection, context packing, prompt-prefix stability, project maps, task state/handoffs, phase discipline, optional repomix use, missing-capability discovery, and cross-harness risk boundaries. Delegate Superpowers/GSD execution rather than copying their workflows.

- [ ] **Step 3: Map artifacts/evals and record rejections**

Every accepted contribution maps to existing governance/orchestration methods or a justified missing capability. Every runtime/persistence rejection retains its source locator and rationale.

- [ ] **Step 4: Validate and commit**

```text
node --test scripts/test-source-synthesis-contract.mjs scripts/test-source-capability-impact.mjs scripts/test-compiler-provenance-parity.mjs scripts/test-source-portfolio.mjs
node scripts/ai-toolkit/run-toolkit-evals.mjs
node scripts/validate-toolkit.mjs
git add sources registries/source-capabilities.registry.json methods/orchestration methods/internal methods/governance evals compiled-agents .ai-toolkit
git commit -m "feat(sources): synthesize agent execution guidance"
```

---

### Task 4: Complete the remaining UI/UX source wave

**Sources:**

```text
addy-osmani-agent-skills
shadcn-ui
addyosmani-web-quality-skills
voltagent-awesome-design-md
impeccable
uncodixfy
open-design
microsoft-playwright
taste-skill
```

**Files:**
- Source catalog/receipts/synthesis registry.
- Existing UI/UX methods and `evals/skills/uiux-evals.json`.
- No new active agent or skill.

**Interfaces:**
- Taste work from Plan C is retained and compared with all eight existing UI/UX sources.

- [ ] **Step 1: Execute exact current reviews for the eight pre-existing sources and verify Taste**

Separate authoritative/testing/tool sources from visual-technique references. Review changed Impeccable, shadcn/ui, and Playwright evidence before retaining their contributions.

- [ ] **Step 2: Complete best-of-source UI/UX synthesis**

Cover accessibility, Web quality, visual direction, anti-generic review, design systems, responsive layout, motion, state coverage, browser evidence, dashboards/dense data, and product workflow. Preserve one existing owner per capability.

- [ ] **Step 3: Validate static evals and non-proliferation**

```text
node scripts/ai-toolkit/run-toolkit-evals.mjs
node --test scripts/test-agent-role-contracts.mjs scripts/test-source-synthesis-contract.mjs scripts/test-source-portfolio.mjs
```

- [ ] **Step 4: Commit**

```text
git add sources registries/source-capabilities.registry.json methods/uiux methods/internal/frontend-uiux-quality-gates.md evals/skills/uiux-evals.json compiled-agents .ai-toolkit
git commit -m "feat(sources): complete UIUX source synthesis"
```

---

### Task 5: Complete coding, testing, review, architecture, and documentation sources

**Sources:**

```text
nagdy-guard-skills
matt-pocock-skills
typescript
typescript-eslint
eslint-plugin-react-hooks
biome
oxlint
knip
react-doctor
vitest
testing-library
axe-playwright
lighthouse-ci
dependency-cruiser
eslint-plugin-boundaries
madge
jscpd
eslint
coderabbit
reviewdog
```

**Interfaces:**
- Select best-of-breed roles instead of globally requiring every alternative.
- Tool execution remains `active-if-detected`, `owner-approved-install`, or `ci-advisory` according to existing policy.

- [ ] **Step 1: Review all 20 sources and form overlap groups**

Required groups include lint/format, unused-code analysis, React diagnostics, test frameworks, accessibility/performance testing, architecture boundaries, duplication analysis, and review automation.

- [ ] **Step 2: Choose capability owners and tool-selection policy**

Do not collapse genuinely different environments into one tool, but prevent redundant simultaneous invocation. Record selection criteria, fallbacks, context cost, project detection, and evidence type.

- [ ] **Step 3: Map methods/tools/gates/evals and validate**

```text
node --test scripts/test-source-synthesis-contract.mjs scripts/test-source-capability-impact.mjs scripts/test-source-portfolio.mjs
node scripts/ai-toolkit/run-toolkit-evals.mjs
node scripts/validate-toolkit.mjs
```

- [ ] **Step 4: Commit**

```text
git add sources registries/source-capabilities.registry.json registries/tools.registry.json methods evals .ai-toolkit
git commit -m "feat(sources): synthesize engineering quality portfolio"
```

---

### Task 6: Complete security, supply-chain, and tool-overlap sources

**Sources:**

```text
trailofbits-skills
codeql
semgrep
gitleaks
trufflehog
osv-scanner
dependabot
renovate
socket
trivy
checkov
owasp-zap-baseline
actionlint
zizmor
harden-runner
github-gh
openssf-scorecard
```

**Interfaces:**
- Security tool overlap is explicit and risk/domain based.
- No scanner absence is reported as a pass.

- [ ] **Step 1: Review all 17 sources with security-first cadence**

Inspect installers, actions, permissions, network/exfiltration, secrets, SARIF/output handling, repository access, CI posture, licensing, and supply-chain history.

- [ ] **Step 2: Synthesize complementary security capabilities**

Differentiate semantic code analysis, pattern scanning, secret detection, dependency vulnerability, dependency-update automation, container/IaC scanning, DAST, workflow linting, GitHub Actions security, runner hardening, CLI delegation, and project health scoring.

- [ ] **Step 3: Add routing/evidence gates and validate**

Require project detection or owner approval, explicit scopes, exit/output evidence, and honest unavailable states. Avoid requiring two overlapping scanners without a documented risk reason.

- [ ] **Step 4: Commit**

```text
git add sources registries/source-capabilities.registry.json registries/tools.registry.json methods/security evals .ai-toolkit
git commit -m "feat(sources): synthesize security tool portfolio"
```

---

### Task 7: Complete Web/SaaS/data/API and preview-platform sources

**Sources:**

```text
supabase-agent-skills
android-accessibility
android-core-app-quality
apple-accessibility
apple-human-interface-guidelines
apple-privacy-manifests
electron-security-guidance
expo-documentation
microsoft-windows-accessibility
microsoft-windows-app-guidance
owasp-masvs
tauri-security-guidance
w3c-wcag-22
```

**Interfaces:**
- Supabase remains delegated to approved/project-owned tooling for live operations.
- Preview platform guidance cannot become native verification.
- Versioned standards and living official guidance use their distinct cadences.

- [ ] **Step 1: Review Supabase and all 12 platform sources**

Classify WCAG and MASVS by actual versioned publication; classify HIG/Android/Expo/Microsoft living guidance by mutable publication behaviour. Review platform security, accessibility, privacy, packaging, signing, SDK, store, and native-environment assumptions.

- [ ] **Step 2: Synthesize supported versus preview capability gates**

Enterprise/Web accessibility can use current authoritative standards. Native platform guidance remains preview until real environment evidence exists. No SDK, emulator, Xcode, packaging, signing, store, migration, database, or deployment action is authorized.

- [ ] **Step 3: Validate domain-gate and release-scope behaviour**

```text
node --test scripts/test-delivery-kernel-source-governance.mjs scripts/test-source-capability-impact.mjs scripts/test-source-portfolio.mjs
node scripts/validate-source-portfolio.mjs release-scope --check
node scripts/validate-toolkit.mjs
```

- [ ] **Step 4: Commit**

```text
git add sources registries/source-capabilities.registry.json registries/domain-packs.registry.json methods evals .ai-toolkit
git commit -m "feat(sources): synthesize data and platform guidance"
```

---

### Task 8: Reassess the archived portfolio for unique missing value

**Sources:**

```text
agency-agents
bencium-marketplace
karpathy-inspired-skills
voltagent-awesome-agent-skills
skills-sh
```

**Files:**
- Modify only if evidence changes: `sources/archive/INDEX.md`
- Modify: `registries/source-capabilities.registry.json`
- Modify: `scripts/test-source-utilization-governance.mjs`

**Interfaces:**
- Archived sources remain outside active denominator.
- They may contribute historical provenance or trigger a separately reviewed re-entry proposal, but cannot directly own active capabilities.

- [ ] **Step 1: Compare archived value against completed active syntheses**

For each archived source, record whether any unique capability remains missing. Aggregators and historical inspiration are not unique merely because they contain many links or prompts.

- [ ] **Step 2: Preserve retirement or create a separate re-entry proposal**

If no unique value exists, record `retired`/`superseded` reasoning. If unique value exists, do not reactivate it in this task; create a pending re-entry assessment requiring exact current source review.

- [ ] **Step 3: Validate archive boundaries and commit**

```text
node --test scripts/test-source-utilization-governance.mjs scripts/test-source-synthesis-contract.mjs scripts/test-source-portfolio.mjs
git add sources/archive/INDEX.md registries/source-capabilities.registry.json scripts/test-source-utilization-governance.mjs
git commit -m "chore(sources): confirm archived portfolio boundaries"
```

---

### Task 9: Run the observed UI/UX impact benchmark

**Files:**
- Create: `evals/observed/uiux-source-synthesis-v1.json`
- Create: `evals/observed/fixtures/uiux-source-synthesis/`
- Create: `scripts/validate-observed-uiux-benchmark.mjs`
- Create: `scripts/test-observed-uiux-benchmark.mjs`
- Modify: `registries/source-capabilities.registry.json` only after valid observed evidence.

**Interfaces:**
- Compares baseline and synthesized UI/UX behaviour.
- Evidence kind is `owner-reviewed-pilot` or `observed-model-run`, never trusted host receipt while the bridge is preview.

- [ ] **Step 1: Add failing benchmark contract tests**

Require at least 20 task IDs, three independent reviewer scores per task, identical model/settings digest per variant, raw timing/token/rework data, accessibility/responsive/workflow defect fields, and no invented summary metrics.

- [ ] **Step 2: Implement the validator**

Calculate preference win rate and confidence interval, median rubric improvement, inter-rater kappa, critical regression count, and time/rework deltas from raw runs. Reject hand-entered summaries that do not reproduce.

- [ ] **Step 3: Execute controlled runs**

Cover marketing, SaaS workflow, dashboard, dense data, form, empty/loading/error states, responsive views, reduced motion, localization, accessibility, redesign, and native-negative-trigger tasks. Use fresh fixture copies and identical model/runtime settings.

- [ ] **Step 4: Apply thresholds honestly**

Required:

```text
preference win rate >= 65%
95% confidence lower bound > 50%
median rubric improvement >= 15%
inter-rater kappa >= 0.60
critical accessibility/responsive/workflow/information regressions = 0
median time regression <= 10%
median rework regression <= 10%
```

Failed thresholds remain failed. Do not update synthesis evidence to observed-passed unless validation succeeds.

- [ ] **Step 5: Validate and commit**

```text
node --test scripts/test-observed-uiux-benchmark.mjs
node scripts/validate-observed-uiux-benchmark.mjs --check
git add evals/observed/uiux-source-synthesis-v1.json evals/observed/fixtures/uiux-source-synthesis scripts/validate-observed-uiux-benchmark.mjs scripts/test-observed-uiux-benchmark.mjs registries/source-capabilities.registry.json
git commit -m "test(uiux): measure source synthesis impact"
```

---

### Task 10: Run portfolio-complete and full repository gates

**Files:**
- Regenerate all canonical projections and mirrors.
- Modify release evidence only if its exact reviewed commit and digests are updated through the established generator.

- [ ] **Step 1: Verify all 81 assessment states and contribution coverage**

```text
node scripts/validate-source-portfolio.mjs portfolio-complete --confirm-write
node scripts/validate-source-portfolio.mjs portfolio-complete --check
```

Expected: 81 active sources, zero pending/stale/blocked unless the plan is honestly incomplete, zero orphans/broken edges/duplicate owners, and 100% accepted artifact/eval coverage.

- [ ] **Step 2: Regenerate in canonical order**

```text
node scripts/check-source-freshness.mjs --output "docs/SOURCE_FRESHNESS_REPORT.md" --json-output "docs/SOURCE_FRESHNESS_REPORT.json"
node scripts/generate-source-utilization.mjs --confirm-write
node scripts/compile-agents.mjs --confirm-write
node scripts/sync-runtime.mjs --confirm-write
node scripts/ai-toolkit/build-embedded-package.mjs --confirm-write
```

- [ ] **Step 3: Run every check mode**

```text
node scripts/generate-source-utilization.mjs --check
node scripts/compile-agents.mjs --check
node scripts/sync-runtime.mjs --check
node scripts/ai-toolkit/build-embedded-package.mjs --check
```

- [ ] **Step 4: Run focused, umbrella, eval, and PR gates**

```text
node scripts/validate-source-governance.mjs --freshness-report docs/SOURCE_FRESHNESS_REPORT.json
node scripts/validate-source-portfolio.mjs release-scope --check
node scripts/validate-source-portfolio.mjs portfolio-complete --check
node scripts/validate-toolkit.mjs
node scripts/ai-toolkit/run-toolkit-evals.mjs
node scripts/run-release-gate.mjs pr
git -c core.longpaths=true diff --check
git status --short
```

- [ ] **Step 5: Independent red-team review**

Review source receipts, capability ownership, rejected decisions, source-update impact, cadence classes, generated boundaries, observed evidence, runtime-authority boundaries, and final diff. Resolve critical/high findings before any release handoff.

- [ ] **Step 6: Commit final generated evidence**

```text
git add docs registries sources methods evals compiled-agents .ai-toolkit scripts
git commit -m "chore(sources): complete capability portfolio evidence"
```

## Plan D Completion Evidence

Report:

- baseline 80 and active 81 denominators;
- all assessment-state and contribution-outcome counts;
- receipts current/stale/blocked and exact reasons;
- unique value statements and retired/superseded decisions;
- capability ownership and multi-source synthesis counts;
- artifact/gate/eval coverage;
- duplicate/orphan/broken-edge counts;
- source monitoring/deep-review cadence counts;
- portfolio-actionable and release-blocking counts;
- UI/UX observed metrics and raw evidence path;
- focused/full validation durations, WARNs, skips, unavailable checks;
- unsupported claims, including no automatic runtime activation, no native proof from static guidance, and no enterprise-impact claim without observed evidence.
