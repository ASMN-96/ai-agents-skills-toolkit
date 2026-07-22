# Source Synthesis Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the safe machine-readable foundation for source behaviour cadences, source assessments, best-of-source capability synthesis, and exact utilization coverage without fabricating adoption evidence.

**Architecture:** Keep SourceCatalog responsible for identity, monitoring, review, scope, and runtime posture. Add a separate `source-capabilities` registry for portfolio assessments and many-to-many capability synthesis. Replace document-wide Markdown presence checks with section-scoped structural validation, then seed every retained source as pending until exact contribution-level evidence exists.

**Tech Stack:** Node.js 22 ESM, JSON and Markdown registries, `node:test`, no new runtime dependencies.

## Global Constraints

- Work only in `C:\Users\Abdal\OneDrive\Documents\ai-agents-skills-toolkit\temp\worktrees\v03-source-governance-closure`.
- Expected starting commit: `6a00cd468f4781a6ef375f1d4859c54aee201f6a` or a descendant containing only approved plan/spec commits.
- Preserve `main` at `4654861f6a1887826e6a888b894869e1ec52bb01`.
- Use TDD: every behavioural change begins with a focused failing test and observed expected failure.
- No dependency additions, upstream script execution, package installation, runtime activation, global configuration, product-repository mutation, CI mutation, push, PR, tag, or release.
- Do not convert legacy prose, source popularity, freshness, or method `sourceRef` into approved adoption evidence.
- External inputs remain untrusted and never auto-imported.
- Generated files are changed only through canonical generators.
- Preserve and report every WARN, skip, unavailable check, and environmental failure.
- Source monitoring cadence is independent from runtime posture.
- The delivery-kernel routing allowlist must not consume the synthesis registry in this plan.

---

### Task 1: Fix cross-section source-utilization validation

**Files:**
- Create: `scripts/ai-toolkit/kernel/source-utilization-contract.mjs`
- Modify: `scripts/test-source-utilization-governance.mjs`
- Modify: `scripts/validate-toolkit.mjs`

**Interfaces:**
- Produces: `parseMarkdownTableSection(markdown, heading, expectedHeaders)`.
- Produces: `validateSourceUtilizationReport({ markdown, sourceIds, toolIds, repositoryRoot })`.
- Produces: `validateUtilizationRow(row, { kind, repositoryRoot })`.
- Consumes: exact `## Watched Sources` and `## Registered Tools` headings in `docs/SOURCE_UTILIZATION_MATRIX.md`.

- [ ] **Step 1: Add failing section-isolation tests**

Add focused tests that construct a minimal report with a source ID present only in Registered Tools and assert that Watched Sources validation fails. Add the inverse case, duplicate row case, malformed row case, invalid classification case, and unsafe path case.

```js
import {
  parseMarkdownTableSection,
  validateSourceUtilizationReport
} from "./ai-toolkit/kernel/source-utilization-contract.mjs";

test("watched source rows cannot be satisfied by Registered Tools rows", () => {
  const markdown = `# Source Utilization Matrix

## Watched Sources

| ID | Source | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |

## Registered Tools

| ID | Tool | Classification | Recommendation | Current value path | Next extraction | Forbidden boundary |
| --- | --- | --- | --- | --- | --- | --- |
| shared-id | Shared Tool | active-read-only | Do later | registries/tools.registry.json | Keep detected-only | No automatic install |
`;

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["shared-id"],
      toolIds: ["shared-id"],
      repositoryRoot: ROOT
    }),
    /missing watched source row: shared-id/
  );
});
```

- [ ] **Step 2: Run the focused test and observe the expected failure**

Run:

```text
node --test scripts/test-source-utilization-governance.mjs
```

Expected: FAIL because `source-utilization-contract.mjs` does not exist or because document-wide matching accepts the cross-section row.

- [ ] **Step 3: Implement the strict parser and validator**

Implement a parser that:

- locates one exact second-level heading;
- stops at the next second-level heading;
- parses one Markdown table with exact headers;
- trims cell values;
- rejects malformed row widths and duplicate IDs;
- validates classification and recommendation enums;
- requires non-empty current-value, next-extraction, and boundary fields;
- checks repository paths only when a cell contains a repository-relative path token.

```js
const CLASSIFICATIONS = new Set([
  "active-method",
  "active-skill-rule",
  "active-profile-route",
  "active-reference",
  "active-read-only",
  "planned-extraction",
  "reference-only-with-reason",
  "archive-candidate",
  "remove-candidate",
  "reject"
]);

const RECOMMENDATIONS = new Set([
  "Must do next",
  "Do later",
  "Needs owner decision",
  "Reject / not aligned"
]);

export function parseMarkdownTableSection(markdown, heading, expectedHeaders) {
  const marker = `## ${heading}`;
  const start = markdown.indexOf(marker);
  if (start < 0) throw new Error(`missing governed section: ${heading}`);
  if (markdown.indexOf(marker, start + marker.length) >= 0) {
    throw new Error(`duplicate governed section: ${heading}`);
  }
  const remainder = markdown.slice(start + marker.length);
  const next = remainder.search(/^## /m);
  const section = next >= 0 ? remainder.slice(0, next) : remainder;
  const tableLines = section.split(/\r?\n/).filter((line) => /^\|.*\|$/.test(line.trim()));
  if (tableLines.length < 2) throw new Error(`missing table in governed section: ${heading}`);
  const cells = (line) => line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
  const headers = cells(tableLines[0]);
  if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
    throw new Error(`unexpected headers in governed section: ${heading}`);
  }
  const rows = tableLines.slice(2).map(cells);
  if (rows.some((row) => row.length !== headers.length)) {
    throw new Error(`malformed row in governed section: ${heading}`);
  }
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}
```

- [ ] **Step 4: Replace document-wide validation calls**

Remove `tableHasId()` as the coverage authority. Make both the focused test and `scripts/validate-toolkit.mjs` call the shared validator. Retain archived-portfolio validation as a separate section-specific check.

- [ ] **Step 5: Run focused and umbrella checks**

Run:

```text
node --test scripts/test-source-utilization-governance.mjs
node scripts/validate-toolkit.mjs
```

Expected: the focused unit behaviours pass; the umbrella validator may now fail honestly because the current matrix is missing watched-source rows. Record that failure for Task 4 rather than weakening the test.

- [ ] **Step 6: Commit**

```text
git add scripts/ai-toolkit/kernel/source-utilization-contract.mjs scripts/test-source-utilization-governance.mjs scripts/validate-toolkit.mjs
git commit -m "fix(sources): validate utilization sections exactly"
```

---

### Task 2: Add source-behaviour monitoring and review cadences

**Files:**
- Modify: `scripts/ai-toolkit/kernel/source-catalog-contract.mjs`
- Modify: `scripts/test-source-governance-v2.mjs`
- Create: `scripts/migrate-source-cadence-v2-2.mjs`
- Modify through the migration script: `sources/source-watchlist.json`
- Regenerate through canonical builder: `.ai-toolkit/sources/watchlist.json`

**Interfaces:**
- Produces: `SOURCE_BEHAVIORS`.
- Produces: `SOURCE_BEHAVIOR_CADENCE`.
- Produces: `validateSourceCadence(source)`.
- Changes SourceCatalog schema from `2.1.0` to `2.2.0`.

- [ ] **Step 1: Add failing cadence contract tests**

Add tests for policy defaults, narrower intervals, forbidden extensions, historical null intervals, unique event triggers, and runtime-posture independence.

```js
test("source behavior cadence rejects silent interval extension", () => {
  const source = validSource({
    sourceBehavior: "versioned-standard",
    monitorIntervalDays: 91,
    deepReviewIntervalDays: 180,
    eventTriggers: ["new-edition"]
  });
  assert.throws(() => validateSourceCadence(source), /monitorIntervalDays exceeds policy maximum 90/);
});

test("source behavior never changes runtime posture", () => {
  const source = validSource({
    sourceBehavior: "active-tool-or-skill",
    monitorIntervalDays: 30,
    deepReviewIntervalDays: 90,
    eventTriggers: ["major-release"],
    runtimePosture: "metadata-only"
  });
  assert.equal(validateSourceCadence(source).runtimePosture, "metadata-only");
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

```text
node --test scripts/test-source-governance-v2.mjs
```

Expected: FAIL because SourceCatalog `2.1.0` does not recognize the cadence fields or exports.

- [ ] **Step 3: Implement the cadence constants and validator**

```js
export const SOURCE_BEHAVIORS = Object.freeze([
  "versioned-standard",
  "living-official-guidance",
  "security-runtime-source",
  "active-tool-or-skill",
  "general-method-reference",
  "historical"
]);

export const SOURCE_BEHAVIOR_CADENCE = Object.freeze({
  "versioned-standard": Object.freeze({ monitor: 90, deep: 180 }),
  "living-official-guidance": Object.freeze({ monitor: 30, deep: 90 }),
  "security-runtime-source": Object.freeze({ monitor: 14, deep: 30 }),
  "active-tool-or-skill": Object.freeze({ monitor: 30, deep: 90 }),
  "general-method-reference": Object.freeze({ monitor: 90, deep: 180 }),
  historical: Object.freeze({ monitor: null, deep: null })
});
```

Require `sourceBehavior`, `monitorIntervalDays`, `deepReviewIntervalDays`, and non-empty unique `eventTriggers`. Permit intervals shorter than policy defaults. Historical sources require both intervals to be `null`. Do not derive or mutate `runtimePosture`.

- [ ] **Step 4: Implement a deterministic migration CLI**

The migration CLI supports `--check` and `--confirm-write`, defaults to `--check`, reads only the canonical watchlist, and writes atomically through the managed-filesystem layer. Classification rules are deterministic:

```js
const VERSIONED_STANDARD_IDS = new Set([
  "nist-ssdf",
  "nist-ssdf-ai",
  "nist-ai-rmf-genai",
  "owasp-asvs",
  "owasp-llmsvs",
  "owasp-masvs",
  "slsa-v1-2",
  "w3c-wcag-22"
]);

function deriveSourceBehavior(source) {
  if (source.lifecycle === "historical-reference") return "historical";
  if (VERSIONED_STANDARD_IDS.has(source.id)) return "versioned-standard";
  if (source.sourceType === "manual-reviewed-doc") return "living-official-guidance";
  if (source.dependentResourceIds.length > 0) return "active-tool-or-skill";
  if (source.freshnessClass === "security-runtime") return "security-runtime-source";
  return "general-method-reference";
}
```

Use event triggers by class, including `new-edition`, `errata`, `withdrawal`, `security-advisory`, `platform-release`, `deprecation`, `major-release`, `installer-change`, `license-change`, `maintainer-change`, `dependent-gate-change`, and `dependent-eval-failed` as applicable. Do not silently use a fallback ID list; print the assigned class for all 80 sources in `--check` output.

- [ ] **Step 5: Verify migration dry-run and apply it**

```text
node scripts/migrate-source-cadence-v2-2.mjs --check
node scripts/migrate-source-cadence-v2-2.mjs --confirm-write
node --test scripts/test-source-governance-v2.mjs
```

Expected: 80 sources classified exactly once; schema `2.2.0`; tests PASS; no runtime-posture changes.

- [ ] **Step 6: Regenerate the embedded source watchlist**

```text
node scripts/ai-toolkit/build-embedded-package.mjs --confirm-write
node scripts/ai-toolkit/build-embedded-package.mjs --check
```

Expected: generated watchlist and manifests reflect schema `2.2.0`; no hand-edited generated file.

- [ ] **Step 7: Commit**

```text
git add scripts/ai-toolkit/kernel/source-catalog-contract.mjs scripts/test-source-governance-v2.mjs scripts/migrate-source-cadence-v2-2.mjs sources/source-watchlist.json .ai-toolkit
git commit -m "feat(sources): classify monitoring and review cadences"
```

---

### Task 3: Add the source-capability synthesis contract

**Files:**
- Create: `scripts/ai-toolkit/kernel/source-synthesis-contract.mjs`
- Create: `scripts/test-source-synthesis-contract.mjs`
- Modify: `scripts/ai-toolkit/source-governance.mjs`
- Modify: `scripts/validate-toolkit.mjs`

**Interfaces:**
- Produces: `validateSourceCapabilityRegistry(registry, context)`.
- Produces: `deriveSourceCapabilityWarnings(registry, context)`.
- Produces: `validateSourceCapabilityRepository({ repositoryRoot, catalog, registry })`.
- Consumes stable IDs from source, method, tool, skill, agent, domain-pack, and eval registries.

- [ ] **Step 1: Add a failing contract test file**

Create table-driven tests for closed fields, stable ordering, duplicate IDs, graph cycles, source/receipt mismatch, traversal, linked artifacts, owner uniqueness, state-dependent evidence, and decision requirements.

```js
test("multiple sources may contribute to one synthesis", () => {
  const registry = validRegistry({
    capabilities: [capability("uiux.visual-direction", "uiux.visual-direction@1")],
    syntheses: [synthesis("uiux.visual-direction@1", [
      input("impeccable-input", "impeccable"),
      input("taste-input", "taste-skill")
    ])]
  });
  assert.doesNotThrow(() => validateSourceCapabilityRegistry(registry, validContext()));
});

test("pending evidence cannot become approved adoption", () => {
  const registry = validRegistryWithPendingAdoptedInput();
  assert.throws(
    () => validateSourceCapabilityRegistry(registry, validContext()),
    /pending assessment cannot support an approved synthesis/
  );
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

```text
node --test scripts/test-source-synthesis-contract.mjs
```

Expected: FAIL because the contract module does not exist.

- [ ] **Step 3: Implement the pure closed-schema validator**

Export the enums from the approved design and validate:

- registry schema/version/type;
- one assessment per active catalog source;
- unique, sorted stable IDs;
- one active owner and one approved active synthesis per capability;
- source/receipt/revision/digest consistency;
- input/decision/artifact/eval references;
- no graph cycles;
- pending/blocked/stale state restrictions;
- adopted/adapted/delegated artifact and eval requirements;
- rejected/superseded rationale and no active artifact claim;
- historical source restrictions.

```js
export const SOURCE_CAPABILITY_REGISTRY_SCHEMA_VERSION = "1.0.0";
export const SOURCE_ASSESSMENT_STATES = Object.freeze([
  "pending-review",
  "assessed-current",
  "stale",
  "blocked",
  "retired"
]);
export const DECISION_OUTCOMES = Object.freeze([
  "adopted",
  "adapted",
  "delegated",
  "reference-only",
  "rejected",
  "superseded"
]);
```

- [ ] **Step 4: Implement repository-bound validation**

In `scripts/ai-toolkit/source-governance.mjs`, load the canonical registry through existing containment controls. Verify regular repository-contained files, artifact digests, eval case IDs, resource IDs, immutable receipt paths/digests, and method `sourceRef` coverage. A method source may resolve either to an approved synthesis input or an explicit pending assessment; pending resolution emits a WARN and never an adoption claim.

- [ ] **Step 5: Wire the validator into the umbrella gate**

Make `scripts/validate-toolkit.mjs` load the new canonical registry and call both pure and repository-bound validation. Keep source-catalog and receipt validation independent.

- [ ] **Step 6: Run focused tests**

```text
node --test scripts/test-source-synthesis-contract.mjs
node --test scripts/test-source-governance-v2.mjs
node scripts/validate-toolkit.mjs
```

Expected: contract tests PASS; umbrella still reports missing canonical registry until Task 4.

- [ ] **Step 7: Commit**

```text
git add scripts/ai-toolkit/kernel/source-synthesis-contract.mjs scripts/test-source-synthesis-contract.mjs scripts/ai-toolkit/source-governance.mjs scripts/validate-toolkit.mjs
git commit -m "feat(sources): validate capability synthesis contracts"
```

---

### Task 4: Seed every retained source without false adoption

**Files:**
- Create: `registries/source-capabilities.registry.json`
- Modify: `docs/SOURCE_UTILIZATION_MATRIX.md`
- Modify: `scripts/test-source-utilization-governance.mjs`

**Interfaces:**
- Consumes SourceCatalog `2.2.0` active source IDs.
- Produces one `pending-review` assessment per active source.
- Produces no capabilities or syntheses until exact contribution evidence is reviewed.

- [ ] **Step 1: Add a failing canonical-seed test**

```js
test("canonical seed covers every source exactly once and claims no adoption", async () => {
  const catalog = await readJson("sources/source-watchlist.json");
  const registry = await readJson("registries/source-capabilities.registry.json");
  assert.deepEqual(
    registry.sourceAssessments.map((entry) => entry.sourceId),
    catalog.sources.map((entry) => entry.id).sort()
  );
  assert.equal(registry.sourceAssessments.every((entry) => entry.state === "pending-review"), true);
  assert.deepEqual(registry.capabilities, []);
  assert.deepEqual(registry.syntheses, []);
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

```text
node --test scripts/test-source-synthesis-contract.mjs
```

Expected: FAIL because `registries/source-capabilities.registry.json` does not exist.

- [ ] **Step 3: Create the canonical seed**

Use this exact top-level shape:

```json
{
  "schemaVersion": "1.0.0",
  "registryType": "source-capabilities",
  "sourceCatalog": "sources/source-watchlist.json",
  "sourceAssessments": [],
  "capabilities": [],
  "syntheses": []
}
```

Populate `sourceAssessments` in stable source-ID order. Pending entries include only fields allowed by the pending-state schema: source ID, state, evidence gaps, planned niche IDs when already documented, and review triggers. Do not attach a receipt, revision, value statement, contribution, artifact, or eval as approved evidence.

- [ ] **Step 4: Correct the utilization matrix coverage honestly**

Add all missing watched sources to the Watched Sources section with existing documented classifications and explicit pending extraction/review reasons. Do not copy tool rows into source rows and do not change tool activation posture.

- [ ] **Step 5: Run contract, structural, and umbrella validation**

```text
node --test scripts/test-source-synthesis-contract.mjs
node --test scripts/test-source-utilization-governance.mjs
node scripts/validate-toolkit.mjs
```

Expected: PASS with explicit pending-assessment WARNs; no false adoption or runtime claim.

- [ ] **Step 6: Commit**

```text
git add registries/source-capabilities.registry.json docs/SOURCE_UTILIZATION_MATRIX.md scripts/test-source-utilization-governance.mjs
git commit -m "feat(sources): seed complete pending capability inventory"
```

---

### Task 5: Mirror and attest the canonical registry

**Files:**
- Modify: `scripts/ai-toolkit/build-embedded-package.mjs`
- Modify: `scripts/test-build-embedded-package.mjs`
- Generate: `.ai-toolkit/registries/source-capabilities.registry.json`
- Generate: `.ai-toolkit/manifest.json`

**Interfaces:**
- Consumes: `registries/source-capabilities.registry.json`.
- Produces: byte-identical `.ai-toolkit/registries/source-capabilities.registry.json` and manifest hash.
- Must not add the registry to delivery-kernel runtime routing allowlists.

- [ ] **Step 1: Add failing mirror and exclusion tests**

```js
test("source capability registry mirror is byte-identical and manifest-attested", async () => {
  assert.equal(
    await readFile("registries/source-capabilities.registry.json", "utf8"),
    await readFile(".ai-toolkit/registries/source-capabilities.registry.json", "utf8")
  );
  assertManifestEntry(".ai-toolkit/registries/source-capabilities.registry.json");
});

test("delivery kernel registry allowlist excludes source capabilities", async () => {
  const manifest = await readJson(".ai-toolkit/runtime/delivery-kernel/package-manifest.json");
  assert.equal(
    manifest.files.some((entry) => entry.path.includes("source-capabilities.registry.json")),
    false
  );
});
```

- [ ] **Step 2: Run the test and observe the expected failure**

```text
node --test scripts/test-build-embedded-package.mjs
```

Expected: FAIL because the mirror and manifest entry do not exist.

- [ ] **Step 3: Add canonical copy and manifest hashing**

Extend the embedded-package builder's canonical registry inventory with the source-capabilities registry for the root `.ai-toolkit` package only. Do not add it to `DELIVERY_KERNEL_REGISTRIES` or delivery-kernel package files.

- [ ] **Step 4: Regenerate and verify check mode**

```text
node scripts/ai-toolkit/build-embedded-package.mjs --confirm-write
node scripts/ai-toolkit/build-embedded-package.mjs --check
node --test scripts/test-build-embedded-package.mjs
```

Expected: PASS; `--check` is non-mutating; root and mirror bytes match.

- [ ] **Step 5: Run the foundation gate**

```text
node --test scripts/test-source-utilization-governance.mjs
node --test scripts/test-source-governance-v2.mjs
node --test scripts/test-source-synthesis-contract.mjs
node --test scripts/test-build-embedded-package.mjs
node scripts/validate-source-governance.mjs --freshness-report docs/SOURCE_FRESHNESS_REPORT.json
node scripts/validate-toolkit.mjs
node scripts/ai-toolkit/build-embedded-package.mjs --check
git -c core.longpaths=true diff --check
git status --short
```

Expected: all focused checks pass; every WARN is recorded; worktree contains only intended canonical/generated changes before commit.

- [ ] **Step 6: Commit**

```text
git add scripts/ai-toolkit/build-embedded-package.mjs scripts/test-build-embedded-package.mjs .ai-toolkit
git commit -m "build(sources): mirror capability provenance registry"
```

## Plan A Completion Evidence

Report:

- branch, starting and final commit;
- five local commits and exact files;
- SourceCatalog schema and all cadence counts;
- active source count and pending assessment count;
- zero approved syntheses in the honest seed;
- structural matrix coverage counts by section;
- generated mirror hash/parity;
- all focused/full results, durations, WARNs, skips, and unavailable checks;
- explicit statement that no new runtime authority or source adoption was created.
