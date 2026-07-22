# Taste Skill UIUX Synthesis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Taste Skill as a fully reviewed, metadata-only community source and synthesize its strongest unique design practices into existing UI/UX capabilities, methods, and evaluations without creating a new agent, skill, tool, plugin, dependency, or runtime authority.

**Architecture:** Register and review the exact current Taste revision through SourceCatalog and immutable receipts. Compare its contributions with Impeccable, Uncodixfy, shadcn/ui, authoritative accessibility/platform guidance, and toolkit-owned methods; record accepted and rejected decisions in the SourceCapabilityRegistry. Enhance only existing UI/UX owners and prove contract coverage while keeping observed quality claims separate.

**Tech Stack:** Node.js 22 ESM, JSON/Markdown registries and evals, existing source review CLIs, no new runtime dependencies.

## Global Constraints

- Requires completed Source Synthesis Foundation and Impact/Distribution plans.
- Work only in the isolated v0.3 worktree.
- Re-resolve the current remote SHA; the discovery SHA `98565e65bc3274ddf6eb0838734341714057178b` is evidence of discovery only.
- Never execute upstream scripts, installation commands, package managers, skills, hooks, image-generation workflows, or browser automation from Taste Skill.
- Never copy upstream prompt, skill, code, example, template, font list, dependency list, or implementation skeleton.
- Do not create or register a Taste agent, skill, tool, plugin, package, route, or runtime integration.
- Active agent and skill counts must remain unchanged.
- Preserve existing stack, accessibility, performance, product workflow, authorization, and project design-system authority.
- The accountable approver identity is `repository-owner:abdal`; AI review is delegated technical evidence, not the accountable identity.
- If license, security, prompt-injection, provenance, or compatibility evidence is uncertain, leave Taste pending/quarantined.
- No claim of improved real UI output without the later observed benchmark.

---

### Task 1: Register Taste Skill as a pending metadata-only source

**Files:**
- Modify: `sources/source-watchlist.json`
- Create: `sources/taste-skill.md`
- Modify: `registries/source-capabilities.registry.json`
- Modify: `scripts/test-source-governance-v2.mjs`
- Modify: `scripts/test-source-synthesis-contract.mjs`

**Interfaces:**
- Adds canonical source ID `taste-skill`.
- Increases active catalog denominator from 80 to 81.
- Adds one `pending-review` SourceAssessment.
- Adds no dependent runtime resource.

- [ ] **Step 1: Add failing registration and non-proliferation tests**

```js
test("Taste enters the catalog as pending metadata-only input", async () => {
  const catalog = await readJson("sources/source-watchlist.json");
  const registry = await readJson("registries/source-capabilities.registry.json");
  const source = catalog.sources.find((entry) => entry.id === "taste-skill");
  assert.equal(source.scope, "community-reference");
  assert.equal(source.authority, "community");
  assert.equal(source.lifecycle, "review-input");
  assert.equal(source.runtimePosture, "metadata-only");
  assert.equal(source.neverAutoImport, true);
  assert.deepEqual(source.dependentResourceIds, []);
  assert.equal(
    registry.sourceAssessments.find((entry) => entry.sourceId === "taste-skill").state,
    "pending-review"
  );
});

test("Taste registration does not add an agent skill tool or route", async () => {
  const inventories = await loadActiveInventories();
  assert.equal(inventories.agents.some((entry) => /taste/i.test(entry.id)), false);
  assert.equal(inventories.skills.some((entry) => /taste/i.test(entry.id)), false);
  assert.equal(inventories.tools.some((entry) => /taste/i.test(entry.id)), false);
  assert.equal(inventories.routes.some((entry) => /taste/i.test(entry.scenario)), false);
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-source-governance-v2.mjs scripts/test-source-synthesis-contract.mjs
```

Expected: FAIL because Taste is absent.

- [ ] **Step 3: Add the catalog entry**

Use:

```json
{
  "id": "taste-skill",
  "aliases": [],
  "identityKey": "github:leonxlnx/taste-skill",
  "name": "Taste Skill",
  "scope": "community-reference",
  "authority": "community",
  "lifecycle": "review-input",
  "sourceType": "github-repo",
  "sourceUrl": "https://github.com/Leonxlnx/taste-skill",
  "repoOwner": "Leonxlnx",
  "repoName": "taste-skill",
  "defaultBranch": "main",
  "sourceRecordPath": "sources/taste-skill.md",
  "watchedPaths": ["skills/taste-skill/SKILL.md", "skills/redesign-skill/SKILL.md", "CHANGELOG.md", "LICENSE"],
  "licenseConcern": "review-required",
  "reviewPriority": "Medium",
  "sourceBehavior": "active-tool-or-skill",
  "monitorIntervalDays": 30,
  "deepReviewIntervalDays": 90,
  "eventTriggers": ["major-release", "installer-change", "license-change", "maintainer-change", "dependent-eval-failed"],
  "runtimePosture": "metadata-only",
  "dependentResourceIds": [],
  "affectedArtifacts": ["sources/taste-skill.md"],
  "neverAutoImport": true
}
```

Populate monitor/review fields through the same migration/observation rules as other unreviewed GitHub sources; do not claim current review.

- [ ] **Step 4: Add a concise source record and pending assessment**

The source record states purpose, expected unique value, overlap sources, forbidden operations, security/prompt-injection risks, and discovery evidence. It explicitly says registration is not approval. Add the 81st pending assessment and update denominator tests.

- [ ] **Step 5: Run tests, regenerate projections, and commit**

```text
node --test scripts/test-source-governance-v2.mjs scripts/test-source-synthesis-contract.mjs
node scripts/generate-source-utilization.mjs --confirm-write
node scripts/ai-toolkit/build-embedded-package.mjs --confirm-write
node scripts/generate-source-utilization.mjs --check
node scripts/ai-toolkit/build-embedded-package.mjs --check
git add sources/source-watchlist.json sources/taste-skill.md registries/source-capabilities.registry.json docs/SOURCE_UTILIZATION_MATRIX.md .ai-toolkit scripts/test-source-governance-v2.mjs scripts/test-source-synthesis-contract.mjs
git commit -m "chore(sources): register Taste as pending reference"
```

---

### Task 2: Perform the exact-revision Taste source review

**Files:**
- Modify through governed CLIs: `sources/source-watchlist.json`
- Create through governed CLI: the canonical receipt path returned from `receiptRelativePath()` for the resolved Taste SHA
- Modify: `sources/taste-skill.md`
- Modify: `registries/source-capabilities.registry.json`

**Interfaces:**
- Consumes exact remote SHA and content digest.
- Produces one immutable SourceReviewReceipt and one `assessed-current` SourceAssessment only if every review dimension passes.

- [ ] **Step 1: Resolve the exact remote SHA without cloning or executing**

Run read-only remote resolution:

```powershell
$tasteSha = (git ls-remote https://github.com/Leonxlnx/taste-skill.git HEAD).Split("`t")[0]
if ($tasteSha -notmatch '^[0-9a-f]{40}$') { throw 'Taste HEAD did not resolve to an exact SHA' }
Write-Output $tasteSha
```

Expected: one exact 40-character SHA. Record retrieval timestamp. If network resolution fails after one materially different safe retry, stop and leave Taste pending.

- [ ] **Step 2: Retrieve only reviewed files into an OS temporary directory**

Retrieve `LICENSE`, `CHANGELOG.md`, `README.md`, `skills/taste-skill/SKILL.md`, `skills/redesign-skill/SKILL.md`, repository tree metadata, and any file directly referenced by those instructions that changes security or runtime posture. Do not place upstream content in the repository and do not execute it.

- [ ] **Step 3: Review all required dimensions**

Record evidence for:

- exact revision/digest and watched locators;
- license identity and obligations;
- maintainer/maintenance signals;
- prompt-injection or instruction override risk;
- install, package, script, hook, network, browser, image, secret, credential, filesystem, CI, and global-config behaviour;
- framework, font, icon, image, animation, design-system, and platform assumptions;
- overlap with Impeccable, Uncodixfy, shadcn/ui, authoritative accessibility/platform guidance, and existing toolkit UI/UX methods;
- clean-room no-copy evidence;
- rollback ancestor.

- [ ] **Step 4: Record the monitor observation and prepare the receipt**

Use the repository source-observation/review flow. The receipt disposition is `SYNCED_REFERENCE` until exact artifact/eval adaptations exist. Runtime posture remains `metadata-only`.

```powershell
$receiptPath = Join-Path $env:TEMP 'taste-skill-source-review-receipt.json'
node scripts/apply-source-review.mjs --receipt $receiptPath --dry-run
node scripts/apply-source-review.mjs --receipt $receiptPath --confirm-write
```

The temporary receipt path is outside the repository. The receipt must name `repository-owner:abdal`, use the exact resolved SHA and digest, and list the canonical source record plus synthesis registry as affected artifacts. If any finding is unresolved, do not run `--confirm-write`.

- [ ] **Step 5: Bind the assessment to the immutable receipt**

Change only Taste's SourceAssessment from `pending-review` to `assessed-current`, with exact revision/digest/receipt bindings, value statement, overlap IDs, contribution refs, rejected summary, and review triggers. This does not yet approve a synthesis.

- [ ] **Step 6: Validate and commit the review batch**

```text
node scripts/validate-source-governance.mjs --freshness-report docs/SOURCE_FRESHNESS_REPORT.json
node --test scripts/test-source-governance-v2.mjs scripts/test-source-synthesis-contract.mjs
node scripts/validate-toolkit.mjs
git add sources/source-watchlist.json sources/taste-skill.md sources/reviews/taste-skill registries/source-capabilities.registry.json
git commit -m "chore(sources): review Taste design guidance"
```

---

### Task 3: Add best-of-source UI/UX synthesis decisions

**Files:**
- Modify: `registries/source-capabilities.registry.json`
- Modify: `scripts/test-source-synthesis-contract.mjs`

**Interfaces:**
- Produces capabilities owned by existing methods.
- Inputs may include Taste, Impeccable, Uncodixfy, shadcn/ui, WCAG, platform guidance, and toolkit-authored constraints.

- [ ] **Step 1: Add failing synthesis tests**

```js
test("Taste contributes to existing UIUX owners without portfolio proliferation", async () => {
  const registry = await readJson("registries/source-capabilities.registry.json");
  const tasteInputs = registry.syntheses.flatMap((entry) => entry.inputs)
    .filter((entry) => entry.sourceId === "taste-skill");
  assert.ok(tasteInputs.length >= 1);
  for (const capability of registry.capabilities.filter((entry) => entry.niche.startsWith("uiux."))) {
    assert.notEqual(capability.ownerRef.kind, "agent");
    assert.notEqual(capability.ownerRef.kind, "skill");
    assert.equal(/taste/i.test(capability.ownerRef.id), false);
  }
});
```

- [ ] **Step 2: Run and observe the expected failure**

```text
node --test scripts/test-source-synthesis-contract.mjs
```

- [ ] **Step 3: Define the existing-owner syntheses**

Create or version draft capabilities for:

- `uiux.visual-direction` -> `uiux.premium-visual-quality`;
- `uiux.brief-inference` -> `uiux.frontend-design`;
- `uiux.design-system-selection` -> `uiux.design-system`;
- `uiux.motion-governance` -> `uiux.interaction-motion`;
- `uiux.visual-preflight` -> `internal.frontend-uiux-quality-gates`;
- `uiux.redesign-audit` -> `uiux.commercial-dashboard-polish-rubric` or the nearest existing audit owner after overlap review.

For each, record primary/supporting/constraint/counterexample inputs, proposed adapted/rejected decisions, locators, restrictions, intended artifact refs, and intended eval refs. Keep these syntheses `draft` until the real artifacts and evals exist and a later `SYNCED_ADOPTED` receipt attests their digests. Taste is supporting, not universal authority.

- [ ] **Step 4: Record explicit rejected decisions**

Reject automatic installation, framework/package defaults, copied code skeletons, commercial or unverified font mandates, universal palette/layout bans, excessive motion, network image placeholders, and claims outside marketing/redesign scope. Map each rejection to exact Taste locators and rationale.

- [ ] **Step 5: Run contract validation and commit**

```text
node --test scripts/test-source-synthesis-contract.mjs
node scripts/validate-toolkit.mjs
git add registries/source-capabilities.registry.json scripts/test-source-synthesis-contract.mjs
git commit -m "feat(uiux): synthesize Taste with existing design sources"
```

---

### Task 4: Strengthen existing UI/UX methods

**Files:**
- Modify: `methods/uiux/premium-visual-quality.md`
- Modify: `methods/uiux/frontend-design.md`
- Modify: `methods/uiux/design-system.md`
- Modify: `methods/uiux/interaction-motion.md`
- Modify: `methods/uiux/accessibility.md`
- Modify: `methods/uiux/responsive-layout.md`
- Modify: `methods/uiux/dashboard-ux.md`
- Modify: `methods/uiux/commercial-dashboard-polish-rubric.md`
- Modify: `methods/internal/frontend-uiux-quality-gates.md`
- Modify only if required for provenance: `registries/methods.registry.json`

**Interfaces:**
- Consumes approved synthesis decisions.
- Produces toolkit-owned clean-room instructions and acceptance gates.

- [ ] **Step 1: Add failing method-contract assertions**

Extend UI/UX eval/tests to require:

```text
Design Read: page/workflow kind, audience, brand signals, trust constraints, design-system authority
Design controls: visual variance, motion intensity, information density
Constraints: accessibility, reduced motion, performance, localization, workflow efficiency
Redesign mode: preserve, targeted overhaul, or greenfield
Pre-flight: hierarchy, states, CTA/action clarity, responsive fit, design-system coherence
```

Also assert forbidden automatic install/framework/font/image behaviour.

- [ ] **Step 2: Run and observe the expected failure**

```text
node scripts/ai-toolkit/run-toolkit-evals.mjs
```

Expected: FAIL because current methods do not contain the new contract.

- [ ] **Step 3: Implement concise method changes**

Add the following toolkit-owned rules without copying Taste wording:

```markdown
Before visual implementation, state a one-line Design Read covering interface type, audience, brand/product signals, trust constraints, and the authoritative design system.

Set project-scoped controls for visual variance, motion intensity, and information density. Treat them as bounded design inputs, not global preferences. Accessibility, reduced-motion, performance, localization, workflow efficiency, and existing product constraints override aesthetic ambition.
```

Keep marketing/redesign techniques out of dashboard, dense-data, multi-step form, and native-platform guidance unless the product context supports them. Preserve existing URLs, navigation labels, form names, legal copy, semantics, and user workflows unless explicitly authorized.

- [ ] **Step 4: Verify method provenance and word budgets**

Update method `sourceRef` and `lastExtracted` only for files whose approved synthesis uses Taste. Ensure registry provenance matches. Run existing method/skill word-budget checks.

- [ ] **Step 5: Run focused checks and commit**

```text
node scripts/ai-toolkit/run-toolkit-evals.mjs
node --test scripts/test-agent-role-contracts.mjs scripts/test-source-synthesis-contract.mjs
node scripts/validate-toolkit.mjs
git add methods/uiux methods/internal/frontend-uiux-quality-gates.md registries/methods.registry.json
git commit -m "feat(uiux): deepen contextual design discipline"
```

---

### Task 5: Add static UI/UX eval coverage and count regressions

**Files:**
- Modify: `evals/skills/uiux-evals.json`
- Modify: `scripts/ai-toolkit/run-toolkit-evals.mjs`
- Modify: `scripts/test-agent-role-contracts.mjs`
- Modify: `scripts/test-source-synthesis-contract.mjs`

**Interfaces:**
- Adds static contract cases only.
- Preserves active agent and skill counts.

- [ ] **Step 1: Add failing eval cases**

Add cases with these exact IDs:

```text
uiux-contextual-design-controls
uiux-brief-visual-direction-inference
uiux-audit-first-redesign
uiux-anti-default-repetition-review
uiux-project-compatible-design-system
uiux-mechanical-visual-preflight
uiux-dashboard-density-negative-trigger
uiux-native-platform-negative-trigger
uiux-reduced-motion-accessibility-override
uiux-localization-content-integrity-override
uiux-no-automatic-design-dependencies
```

Each case defines positive triggers, required behaviours, forbidden claims, and expected existing capability owner.

- [ ] **Step 2: Run and observe the expected failure**

```text
node scripts/ai-toolkit/run-toolkit-evals.mjs
node --test scripts/test-agent-role-contracts.mjs
```

- [ ] **Step 3: Extend eval validation and active-count assertions**

Require each new case ID and verify no agent/skill/tool/route ID contains `taste`. Compare active counts against the pre-Taste baseline stored in the test fixture rather than a prose number.

- [ ] **Step 4: Regenerate compiled/runtime outputs**

```text
node scripts/compile-agents.mjs --confirm-write
node scripts/sync-runtime.mjs --confirm-write
node scripts/ai-toolkit/build-embedded-package.mjs --confirm-write
node scripts/compile-agents.mjs --check
node scripts/sync-runtime.mjs --check
node scripts/ai-toolkit/build-embedded-package.mjs --check
```

- [ ] **Step 5: Apply the artifact-bound promotion receipt**

Prepare a second immutable Taste receipt at the same reviewed source revision with disposition `SYNCED_ADOPTED`. Its affected-artifact and artifact-evidence entries must include every Taste-derived method, the UI/UX eval file, and the synthesis registry with exact content digests. Dry-run and apply it through `apply-source-review.mjs`, then change the verified syntheses from `draft` to `approved`. If artifact coverage or any digest is incomplete, leave the reference receipt and draft syntheses in place.

```powershell
$promotionReceiptPath = Join-Path $env:TEMP 'taste-skill-adopted-artifact-receipt.json'
node scripts/apply-source-review.mjs --receipt $promotionReceiptPath --dry-run
node scripts/apply-source-review.mjs --receipt $promotionReceiptPath --confirm-write
```

- [ ] **Step 6: Run Plan C gate and commit**

```text
node scripts/ai-toolkit/run-toolkit-evals.mjs
node --test scripts/test-agent-role-contracts.mjs scripts/test-source-synthesis-contract.mjs scripts/test-compiler-provenance-parity.mjs
node scripts/generate-source-utilization.mjs --check
node scripts/validate-toolkit.mjs
git -c core.longpaths=true diff --check
git status --short
git add sources/source-watchlist.json sources/reviews/taste-skill registries/source-capabilities.registry.json evals/skills/uiux-evals.json scripts/ai-toolkit/run-toolkit-evals.mjs scripts/test-agent-role-contracts.mjs scripts/test-source-synthesis-contract.mjs compiled-agents .ai-toolkit
git commit -m "test(uiux): govern Taste-derived design capabilities"
```

## Plan C Completion Evidence

Report the resolved Taste SHA, receipt/digest, review findings, accepted and rejected decisions, exact existing methods changed, eval cases, unchanged active agent/skill/tool counts, generated parity, WARNs/skips, and explicit statements that Taste is metadata-only and that static validation does not prove improved model output.
