# Source Synthesis Impact and Distribution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Derive exact source-change impact through capabilities, artifacts, consumers, compiled agents, mirrors, evaluations, and release accounting while keeping generated utilization reports deterministic and runtime authority unchanged.

**Architecture:** Build a pure graph resolver over the SourceCapabilityRegistry from Plan A, project its result into freshness and release evidence, generate the utilization matrix from canonical registries, and attach provenance only to compiled agents that consume mapped artifacts. Package the registry as provenance metadata without making it a delivery-kernel routing input.

**Tech Stack:** Node.js 22 ESM, JSON/Markdown registries, `node:test`, existing compiler and embedded-package generators, no new runtime dependencies.

## Global Constraints

- Requires completed Source Synthesis Foundation Plan and its passing gates.
- Work only in the isolated `codex/v0.3-source-governance-closure` worktree.
- TDD is mandatory for each behavioural change.
- No automatic source review, method editing, tool activation, package installation, global configuration, product repository, CI, push, PR, tag, or release.
- Exact-locator impact narrows review only when comparison evidence is trustworthy; ambiguous evidence fails closed to all contributions from that source.
- Portfolio-actionable and release-blocking statuses remain separate.
- Static or generated provenance is not runtime execution evidence.
- Generated outputs are never hand-edited.

---

### Task 1: Build the capability-impact graph resolver

**Files:**
- Create: `scripts/ai-toolkit/kernel/source-capability-impact.mjs`
- Create: `scripts/test-source-capability-impact.mjs`

**Interfaces:**
- Produces: `deriveCapabilityImpact(input)`.
- Consumes: source capability registry, resource catalog, compiler inventory, changed locator set, and comparison state.
- Returns the deterministic shape below.

```js
{
  sourceId,
  staleInputIds,
  synthesisDecisionIds,
  capabilityIds,
  artifactRefs,
  consumerRefs,
  compiledOutputs,
  mirrorOutputs,
  evaluationRefs,
  portfolioActionable,
  releaseBlocking,
  blockingResourceIds,
  reasons
}
```

- [ ] **Step 1: Add failing selective and fail-closed tests**

```js
test("exact locator change stales only bound synthesis inputs", () => {
  const result = deriveCapabilityImpact({
    sourceId: "taste-skill",
    changedLocators: ["skills\/taste-skill\/SKILL.md#brief-inference"],
    comparisonState: "exact",
    registry: fixtureRegistry(),
    resourceCatalog: fixtureResources(),
    compilerInventory: fixtureCompilerInventory()
  });
  assert.deepEqual(result.staleInputIds, ["taste-design-read"]);
  assert.deepEqual(result.capabilityIds, ["uiux.visual-direction"]);
});

test("ambiguous source comparison stales every active input from that source", () => {
  const result = deriveCapabilityImpact({
    sourceId: "taste-skill",
    changedLocators: [],
    comparisonState: "ambiguous",
    registry: fixtureRegistryWithTwoTasteInputs(),
    resourceCatalog: fixtureResources(),
    compilerInventory: fixtureCompilerInventory()
  });
  assert.deepEqual(result.staleInputIds, ["taste-design-read", "taste-redesign-audit"]);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-source-capability-impact.mjs
```

Expected: FAIL because the impact module does not exist.

- [ ] **Step 3: Implement deterministic traversal**

Normalize and sort every output. Traverse:

```text
source input -> synthesis decision -> artifact/resource -> consumer -> compiled output -> mirror -> evaluation
```

Comparison states are `exact`, `ambiguous`, `unavailable`, `renamed`, and `deleted`. Only `exact` may select a subset by locator. Every other state selects all active inputs for the source.

```js
export function deriveCapabilityImpact({
  sourceId,
  changedLocators,
  comparisonState,
  registry,
  resourceCatalog,
  compilerInventory
}) {
  const inputs = findActiveInputs(registry, sourceId);
  const staleInputs = comparisonState === "exact"
    ? inputs.filter((input) => input.locators.some((locator) => changedLocators.includes(locator.value)))
    : inputs;
  return buildSortedImpactGraph({ staleInputs, registry, resourceCatalog, compilerInventory });
}
```

- [ ] **Step 4: Add graph integrity cases**

Test missing artifact/resource/consumer/eval nodes, cycles, stable ordering, unrelated-source stability, historical sources, and a source with no active contribution.

- [ ] **Step 5: Run focused tests and commit**

```text
node --test scripts/test-source-capability-impact.mjs
git add scripts/ai-toolkit/kernel/source-capability-impact.mjs scripts/test-source-capability-impact.mjs
git commit -m "feat(sources): derive capability-scoped update impact"
```

---

### Task 2: Project capability impact into freshness reports

**Files:**
- Modify: `scripts/check-source-freshness.mjs`
- Modify: `scripts/ai-toolkit/check-source-freshness.mjs`
- Modify: `scripts/ai-toolkit/kernel/source-catalog-loader.mjs`
- Modify: `scripts/ai-toolkit/kernel/freshness-policy.mjs`
- Modify: `scripts/test-source-freshness-hardening.mjs`
- Modify: `scripts/test-source-freshness-sync.mjs`
- Generate: `docs/SOURCE_FRESHNESS_REPORT.md`
- Generate: `docs/SOURCE_FRESHNESS_REPORT.json`

**Interfaces:**
- Consumes: `deriveCapabilityImpact()`.
- Adds per-source `capabilityImpact` to JSON output.
- Adds exact affected capability/artifact/eval columns or detail blocks to Markdown.

- [ ] **Step 1: Add failing freshness projection tests**

Add cases for exact selectors, ambiguous fallback, no active contribution, mock-only embedded reporting, and separate release blocking.

```js
test("freshness report separates portfolio action from release blocking", async () => {
  const report = await runFreshnessFixture("stale-optional-ui-source");
  const source = report.sources.find((entry) => entry.sourceId === "taste-skill");
  assert.equal(source.capabilityImpact.portfolioActionable, true);
  assert.equal(source.capabilityImpact.releaseBlocking, false);
  assert.deepEqual(source.capabilityImpact.blockingResourceIds, []);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-source-freshness-hardening.mjs scripts/test-source-freshness-sync.mjs
```

Expected: FAIL because freshness output contains only source-wide methods/artifacts.

- [ ] **Step 3: Load the synthesis registry read-only**

Extend the catalog loader with an optional, validated provenance registry load. Missing registry is a hard repository validation failure after Plan A, but the embedded checker remains mock-only and cannot claim a live remote comparison.

- [ ] **Step 4: Add exact capability impact to report objects**

```js
const capabilityImpact = deriveCapabilityImpact({
  sourceId: source.id,
  changedLocators: comparison.changedLocators,
  comparisonState: comparison.state,
  registry: capabilityRegistry,
  resourceCatalog,
  compilerInventory
});

return {
  ...existingSourceReport,
  capabilityImpact
};
```

Preserve existing source-wide `affectedArtifacts` as catalog metadata, but label it separately from derived contribution impact.

- [ ] **Step 5: Regenerate deterministic reports and run tests**

```text
node scripts/check-source-freshness.mjs --output "docs/SOURCE_FRESHNESS_REPORT.md" --json-output "docs/SOURCE_FRESHNESS_REPORT.json"
node --test scripts/test-source-freshness-hardening.mjs scripts/test-source-freshness-sync.mjs
```

Expected: exact selective impact, ambiguous fail-closed impact, and stable Markdown/JSON parity PASS.

- [ ] **Step 6: Commit**

```text
git add scripts/check-source-freshness.mjs scripts/ai-toolkit/check-source-freshness.mjs scripts/ai-toolkit/kernel/source-catalog-loader.mjs scripts/ai-toolkit/kernel/freshness-policy.mjs scripts/test-source-freshness-hardening.mjs scripts/test-source-freshness-sync.mjs "docs/SOURCE_FRESHNESS_REPORT.md" "docs/SOURCE_FRESHNESS_REPORT.json"
git commit -m "feat(sources): report transitive source update impact"
```

---

### Task 3: Enforce dependency-scoped capability blocking

**Files:**
- Modify: `scripts/ai-toolkit/kernel/source-policy.mjs`
- Modify: `scripts/ai-toolkit/kernel/source-release-accounting.mjs`
- Modify: `scripts/validate-v0-3-release-evidence.mjs`
- Modify: `scripts/test-delivery-kernel-source-governance.mjs`
- Modify: `scripts/test-release-evidence.mjs`

**Interfaces:**
- Consumes capability impact and selected resource/gate IDs.
- Produces release blockers only for selected/supported affected consumers.

- [ ] **Step 1: Add failing policy tests**

```js
test("stale clean-room method remains pinned and actionable without global blocking", () => {
  const result = deriveSourceReleaseAccounting(fixture({
    contributionOutcome: "adapted",
    synthesisState: "stale",
    hardSecurityBlocker: false
  }));
  assert.equal(result.portfolioActionable, true);
  assert.equal(result.releaseBlocking, false);
  assert.match(result.advisories.join("\n"), /pinned reviewed basis/);
});

test("stale delegated tool blocks only that selected integration", () => {
  const result = deriveSourceReleaseAccounting(fixtureDelegatedTool());
  assert.deepEqual(result.blockingResourceIds, ["impeccable-cli"]);
  assert.equal(result.globalReleaseBlocked, false);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-delivery-kernel-source-governance.mjs scripts/test-release-evidence.mjs
```

Expected: FAIL because current accounting cannot distinguish contribution types and exact affected consumers.

- [ ] **Step 3: Implement the blocking matrix**

Rules:

- stale `reference-only`: advisory;
- stale `delegated`: selected integration ineligible;
- stale `authoritative-baseline`: dependent selected/supported gates block;
- stale `adopted`/`adapted`: pinned method remains usable unless hard security blocker;
- `historical`: never release-blocking;
- optional/preview impact cannot block unrelated enterprise-core.

- [ ] **Step 4: Update release evidence wording**

Expose exact capability IDs, blocking resource/gate IDs, pinned-basis advisories, and portfolio-actionable counts. Do not call pending portfolio completion a toolkit publication blocker unless a supported selected capability depends on it.

- [ ] **Step 5: Run focused validation and commit**

```text
node --test scripts/test-delivery-kernel-source-governance.mjs scripts/test-release-evidence.mjs
node scripts/validate-v0-3-release-evidence.mjs --check
git add scripts/ai-toolkit/kernel/source-policy.mjs scripts/ai-toolkit/kernel/source-release-accounting.mjs scripts/validate-v0-3-release-evidence.mjs scripts/test-delivery-kernel-source-governance.mjs scripts/test-release-evidence.mjs
git commit -m "fix(release): scope blockers to impacted capabilities"
```

---

### Task 4: Generate the source-utilization matrix canonically

**Files:**
- Create: `scripts/ai-toolkit/generate-source-utilization.mjs`
- Create: `scripts/generate-source-utilization.mjs`
- Create: `scripts/test-source-utilization-generation.mjs`
- Modify: `scripts/test-source-utilization-governance.mjs`
- Modify: `scripts/validate-toolkit.mjs`
- Generate: `docs/SOURCE_UTILIZATION_MATRIX.md`

**Interfaces:**
- Produces: `buildSourceUtilizationModel({ catalog, tools, registry })`.
- Produces: `renderSourceUtilizationMatrix(model)`.
- CLI supports `--check`, `--dry-run`, and `--confirm-write`; default is non-mutating dry-run.

- [ ] **Step 1: Add failing generator tests**

```js
test("generated matrix contains every source and tool exactly once in its own section", () => {
  const markdown = renderSourceUtilizationMatrix(buildFixtureModel());
  const sources = parseMarkdownTableSection(markdown, "Watched Sources", SOURCE_HEADERS);
  const tools = parseMarkdownTableSection(markdown, "Registered Tools", TOOL_HEADERS);
  assert.deepEqual(sources.map((row) => row.ID), ["source-a", "source-b"]);
  assert.deepEqual(tools.map((row) => row.ID), ["tool-a"]);
});

test("check mode fails on byte drift without writing", async () => {
  const before = await readFile(reportPath);
  const result = await runGenerator(["--check"], staleFixtureRoot);
  assert.equal(result.exitCode, 1);
  assert.deepEqual(await readFile(reportPath), before);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-source-utilization-generation.mjs
```

Expected: FAIL because generator module and CLI do not exist.

- [ ] **Step 3: Implement deterministic model and rendering**

Build source rows from SourceAssessment and SourceCatalog, tool rows from tools registry, and archived rows from the archive index. Classifications, recommendations, value path, next extraction, and forbidden boundary must come from canonical registry fields rather than parsing old Markdown.

- [ ] **Step 4: Add atomic write/check behaviour**

Use existing managed-filesystem helpers. `--check` compares expected bytes and exits non-zero on drift. `--confirm-write` is the only write mode.

- [ ] **Step 5: Regenerate and validate parity**

```text
node scripts/generate-source-utilization.mjs --dry-run
node scripts/generate-source-utilization.mjs --confirm-write
node scripts/generate-source-utilization.mjs --check
node --test scripts/test-source-utilization-generation.mjs scripts/test-source-utilization-governance.mjs
```

Expected: deterministic byte parity and exact section counts.

- [ ] **Step 6: Commit**

```text
git add scripts/ai-toolkit/generate-source-utilization.mjs scripts/generate-source-utilization.mjs scripts/test-source-utilization-generation.mjs scripts/test-source-utilization-governance.mjs scripts/validate-toolkit.mjs docs/SOURCE_UTILIZATION_MATRIX.md
git commit -m "build(sources): generate utilization from canonical synthesis"
```

---

### Task 5: Attach synthesis provenance to actual compiled consumers

**Files:**
- Modify: `scripts/ai-toolkit/compiler-provenance.mjs`
- Modify: `scripts/compile-agents.mjs`
- Modify: `scripts/test-compiler-provenance-parity.mjs`
- Modify: `scripts/test-compile-agents.mjs`

**Interfaces:**
- Produces sorted `capabilityIds`, `synthesisIds`, and `decisionRefs` for an agent's actually consumed artifacts.
- Does not attach all portfolio sources globally.

- [ ] **Step 1: Add failing selective provenance tests**

```js
test("compiled agent receives only synthesis provenance for consumed artifacts", async () => {
  const metadata = deriveCompilerProvenance(fixtureAgent("uiux-agent"), fixtureRegistry());
  assert.deepEqual(metadata.capabilityIds, ["uiux.visual-direction"]);
  assert.deepEqual(metadata.synthesisIds, ["uiux.visual-direction@1"]);
  assert.equal(metadata.capabilityIds.includes("security.supply-chain"), false);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-compiler-provenance-parity.mjs scripts/test-compile-agents.mjs
```

Expected: FAIL because compiled metadata lacks synthesis provenance.

- [ ] **Step 3: Implement selective derivation and canonical digest input**

Resolve the agent's selected methods, skills, tools, and gates to artifact refs in the synthesis registry. Add only those capability/synthesis/decision IDs to compiler provenance and canonical input digest.

- [ ] **Step 4: Regenerate and verify**

```text
node scripts/compile-agents.mjs --confirm-write
node scripts/compile-agents.mjs --check
node --test scripts/test-compiler-provenance-parity.mjs scripts/test-compile-agents.mjs
```

Expected: root/compiled provenance parity; unrelated source changes do not change unaffected compiled agents.

- [ ] **Step 5: Commit**

```text
git add scripts/ai-toolkit/compiler-provenance.mjs scripts/compile-agents.mjs scripts/test-compiler-provenance-parity.mjs scripts/test-compile-agents.mjs compiled-agents
git commit -m "feat(agents): bind compiled provenance to source synthesis"
```

---

### Task 6: Distribute provenance mirrors without routing authority

**Files:**

The generated mirror artifacts below are planned and not active until this task creates them.

- Modify: `scripts/ai-toolkit/build-embedded-package.mjs`
- Modify: `scripts/sync-runtime.mjs`
- Modify: `scripts/ai-toolkit/embedded-data.mjs`
- Modify: `scripts/test-build-embedded-package.mjs`
- Modify: `scripts/test-sync-runtime.mjs`
- Generate (planned, not active until created): `.ai-toolkit\/registries\/source-capabilities.registry.json`
- Generate: `.ai-toolkit/manifest.json`
- Generate: applicable embedded/runtime provenance mirrors.

**Interfaces:**
- Provenance registry is packaged and hashed.
- Delivery kernel does not route from it.

- [ ] **Step 1: Add failing distribution tests**

Assert byte parity, manifest hashes, non-mutating `--check`, clean-clone regeneration, and absence from delivery-kernel runtime routing allowlists.

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-build-embedded-package.mjs scripts/test-sync-runtime.mjs
```

- [ ] **Step 3: Implement canonical distribution and hashes**

Add provenance mirrors only where existing package layout expects registries. Do not add a new runtime loader or routing consumer.

- [ ] **Step 4: Regenerate in canonical order**

```text
node scripts/compile-agents.mjs --confirm-write
node scripts/sync-runtime.mjs --confirm-write
node scripts/ai-toolkit/build-embedded-package.mjs --confirm-write
node scripts/compile-agents.mjs --check
node scripts/sync-runtime.mjs --check
node scripts/ai-toolkit/build-embedded-package.mjs --check
```

- [ ] **Step 5: Run the complete Plan B gate**

```text
node --test scripts/test-source-capability-impact.mjs
node --test scripts/test-source-utilization-generation.mjs scripts/test-source-utilization-governance.mjs
node --test scripts/test-source-freshness-hardening.mjs scripts/test-source-freshness-sync.mjs
node --test scripts/test-delivery-kernel-source-governance.mjs scripts/test-release-evidence.mjs
node --test scripts/test-compiler-provenance-parity.mjs scripts/test-compile-agents.mjs
node --test scripts/test-build-embedded-package.mjs scripts/test-sync-runtime.mjs
node scripts/generate-source-utilization.mjs --check
node scripts/validate-toolkit.mjs
git -c core.longpaths=true diff --check
git status --short
```

- [ ] **Step 6: Commit**

```text
git add scripts/ai-toolkit/build-embedded-package.mjs scripts/sync-runtime.mjs scripts/ai-toolkit/embedded-data.mjs scripts/test-build-embedded-package.mjs scripts/test-sync-runtime.mjs .ai-toolkit
git commit -m "build(sources): distribute synthesis provenance safely"
```

## Plan B Completion Evidence

Report exact selective/ambiguous impact cases, release-blocking versus portfolio-actionable counts, generated matrix parity, compiled-agent provenance scope, mirror hashes, focused/full validation durations, WARNs/skips, and the explicit fact that packaged provenance is not delivery-kernel routing or runtime execution authority.
