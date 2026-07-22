# Source Capability Synthesis Design

Date: 2026-07-22

Status: architecture approved; written specification awaiting owner review

Target branch: `codex/v0.3-source-governance-closure`
Design baseline: `093620334dd2a1026a60cb40c1eba4f9d414bf08`

## 1. Purpose

The toolkit must obtain the maximum defensible value from every retained open-source source without accumulating duplicate agents, duplicate skills, uncontrolled dependencies, or untraceable prompt content.

The source catalog already governs identity, freshness, immutable review receipts, runtime posture, and dependency-scoped blocking. This design adds the missing value-synthesis layer: exactly what was learned from each source, where the idea originated, how it was adapted, which toolkit capability owns the result, how it is evaluated, and what must be re-reviewed when the source changes.

The result is a governed best-of-breed portfolio rather than a collection of independent upstream skills.

## 2. Verified Starting State

At the design baseline:

- `sources/source-watchlist.json` is SourceCatalog schema `2.1.0` with 80 active entries.
- Eight sources have current receipt-backed `SYNCED_REFERENCE` dispositions; 72 do not yet have a current final receipt-backed disposition.
- `docs/SOURCE_UTILIZATION_MATRIX.md` is manually maintained prose.
- Only 45 watched sources occur in its Watched Sources section.
- The existing utilization test can incorrectly satisfy 35 missing source rows through same-ID rows in the Registered Tools section.
- Method `sourceRef` frontmatter records coarse source provenance but cannot represent contribution-level origins, rejections, competing sources, eval evidence, or exact update impact.
- `dependentResourceIds` and `affectedArtifacts` operate at source level, not capability-contribution level.
- Taste Skill is not catalogued. The discovery review observed `Leonxlnx/taste-skill` at revision `98565e65bc3274ddf6eb0838734341714057178b`; implementation must resolve and review the current exact revision again before registration or adoption.

These facts establish a real traceability gap. They do not mean that the existing methods, source catalog, or receipts are invalid.

## 3. Goals

1. Record a complete disposition for every meaningful contribution discovered in every retained source.
2. Combine multiple sources in the same niche into one strongest toolkit-owned capability.
3. Preserve exact provenance from source revision and locator through adaptation, artifact, gate, and evaluation.
4. Distinguish ideas, mindset, workflows, skill patterns, executable tools, tests, standards, counterexamples, and rejected material.
5. Make source updates produce deterministic, capability-scoped review impact.
6. Prevent duplicate active capability owners, agents, skills, methods, or runtime integrations.
7. Preserve existing dependency-scoped release blocking and never activate a tool merely because its source is current.
8. Produce human-readable utilization and update-impact reports from canonical machine-readable data.
9. Support honest partial progress without presenting pending assessments as completed adoption.
10. Add Taste Skill as one governed input to existing UI/UX capabilities rather than a parallel agent or skill portfolio.

## 4. Non-Goals

- Copying upstream skill bodies, prompts, scripts, examples, templates, generated files, or documentation.
- Automatically installing packages, enabling plugins, running upstream scripts, or modifying global agent configuration.
- Treating popularity, freshness, or an MIT/Apache license as proof of usefulness or runtime safety.
- Replacing source review receipts, source freshness, tool detection, native platform evidence, host receipts, or product pilots.
- Creating one toolkit skill per upstream skill.
- Blocking enterprise-core because an unrelated optional, preview, or historical contribution is pending review.
- Claiming measured model or human impact from static registry or eval metadata.

## 5. Architecture Decision

Keep `sources/source-watchlist.json` focused on source identity, freshness, review, scope, and runtime posture. Add one canonical registry:

```text
registries/source-capabilities.registry.json
```

The registry contains three linked collections:

1. `sourceAssessments`: one portfolio-level assessment record per retained source.
2. `capabilities`: stable toolkit capability identities and ownership.
3. `syntheses`: versioned best-of-source decisions implementing capabilities.

`docs/SOURCE_UTILIZATION_MATRIX.md` becomes a generated projection. It is no longer an independently edited policy authority.

The delivery kernel does not consume this registry for runtime routing in the first release. Runtime routing continues to use existing canonical registries. The synthesis registry governs provenance, update impact, portfolio completeness, and generation inputs. Runtime consumption can be proposed separately if measured value justifies the additional authority and context cost.

## 6. Public Contracts

### 6.1 SourceCapabilityRegistry v1

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

Unknown fields fail validation. Arrays use deterministic stable-ID ordering.

The JSON snippets below are structural illustrations. Angle-bracket values identify runtime-bound evidence supplied by validated catalog or receipt state; they are not unresolved design decisions.

### 6.2 SourceAssessment v1

Each active catalog source has exactly one current assessment entry:

```json
{
  "sourceId": "impeccable",
  "state": "assessed-current",
  "assessmentRevision": {
    "kind": "git-sha",
    "value": "<exact revision>"
  },
  "contentDigest": "sha256:<digest>",
  "receiptPath": "sources/reviews/<source>/<revision>.json",
  "receiptDigest": "sha256:<digest>",
  "valueStatement": "Unique value this source contributes to the portfolio.",
  "nicheIds": ["uiux.visual-quality"],
  "contributionRefs": ["uiux.visual-direction:impeccable-brief-context"],
  "overlapSourceIds": ["uncodixfy", "taste-skill"],
  "rejectedSummary": "Runtime and duplicated material not adopted.",
  "nextReviewTriggers": ["source-revision-changed", "dependent-eval-failed"]
}
```

Allowed states:

- `pending-review`: catalogued but no current complete assessment; no adoption claim.
- `assessed-current`: bound to the current validated receipt, revision, and digest.
- `stale`: a prior assessment exists but no longer matches current source evidence.
- `blocked`: review found a hard blocker or evidence is insufficient.
- `retired`: source is no longer in the active portfolio and has no active contribution.

State is validated from trusted catalog and receipt data where possible. A pending or stale optional assessment remains visible but does not globally block unrelated release scope.

### 6.3 Capability v1

```json
{
  "id": "uiux.visual-direction",
  "displayName": "Visual Direction",
  "niche": "uiux.visual-quality",
  "purpose": "Infer and preserve an intentional visual language appropriate to the product.",
  "lifecycle": "active",
  "ownerRef": {
    "kind": "method",
    "id": "uiux.premium-visual-quality",
    "path": "methods/uiux/premium-visual-quality.md"
  },
  "activeSynthesisId": "uiux.visual-direction@1",
  "consumerRefs": []
}
```

Allowed owner kinds are `method`, `tool`, `skill`, `agent`, `domain-gate`, or `policy`. Exactly one active owner is allowed per capability. Multiple sources never imply multiple owners.

### 6.4 SourceSynthesis v1

```json
{
  "id": "uiux.visual-direction@1",
  "capabilityId": "uiux.visual-direction",
  "version": 1,
  "state": "approved",
  "strategy": "best-of-breed",
  "inputs": [],
  "decisions": [],
  "artifactRefs": [],
  "evaluationRefs": [],
  "updatePolicy": {}
}
```

Allowed synthesis strategies:

- `authoritative-baseline`: official standard supplies mandatory baseline; other sources may add implementation guidance.
- `best-of-breed`: complementary strengths are combined into one toolkit-owned method.
- `delegated-tool`: toolkit keeps policy/routing while execution remains with an approved external or project-owned tool.
- `reference-only`: source provides useful context without an active implementation.
- `retired-redundant`: prior synthesis is preserved as history but has no active owner.

Only one approved active synthesis may exist per capability. Older synthesis versions remain immutable and `superseded`.

### 6.5 SynthesisInput v1

Each input pins the exact reviewed evidence and its role:

```json
{
  "id": "taste-design-read",
  "sourceId": "taste-skill",
  "role": "supporting",
  "receiptPath": "sources/reviews/taste-skill/<revision>.json",
  "receiptDigest": "sha256:<digest>",
  "reviewedRevision": {
    "kind": "git-sha",
    "value": "<exact SHA>"
  },
  "contentDigest": "sha256:<digest>",
  "locators": [
    {
      "kind": "repository-path-section",
      "value": "skills/taste-skill/SKILL.md#brief-inference"
    }
  ]
}
```

Allowed roles are `primary`, `supporting`, `constraint`, and `counterexample`. Locators must be stable, source-relative, credential-free, and specific enough for re-review. A top-level repository URL alone is insufficient for an adopted decision.

### 6.6 SynthesisDecision v1

```json
{
  "id": "adopt-contextual-design-controls",
  "outcome": "adapted",
  "inputRefs": ["taste-design-read"],
  "contributionKinds": ["mindset", "workflow", "skill-pattern"],
  "summary": "Use project-scoped visual variance, motion, and density controls bounded by product, accessibility, and performance constraints.",
  "adaptationMethod": "clean-room-paraphrase-and-harden",
  "rationale": "Adds explicit visual-direction controls without importing framework or package assumptions.",
  "artifactRefs": ["method:uiux.premium-visual-quality"],
  "evaluationRefs": ["eval:uiux-contextual-design-controls"],
  "restrictions": ["no-upstream-prompt-copy", "no-automatic-package-install"]
}
```

Allowed outcomes:

- `adopted`: toolkit-owned concept used substantially as reviewed.
- `adapted`: concept changed or strengthened for broader, safer application.
- `delegated`: execution stays with an approved external/project tool.
- `reference-only`: useful input that does not control runtime or routing.
- `rejected`: unsafe, irrelevant, too subjective, or insufficiently evidenced.
- `superseded`: better source or synthesis replaced the contribution.

Every adopted, adapted, or delegated decision requires an artifact and evaluation reference. Rejected and superseded decisions require a reason and must not claim active artifacts.

### 6.7 ArtifactRef v1

Artifact references use stable IDs plus paths:

```json
{
  "id": "method:uiux.premium-visual-quality",
  "kind": "method",
  "resourceId": "uiux.premium-visual-quality",
  "path": "methods/uiux/premium-visual-quality.md",
  "contentDigest": "sha256:<digest>",
  "decisionRefs": ["adopt-contextual-design-controls"]
}
```

Supported kinds are `method`, `tool`, `skill`, `agent`, `domain-gate`, `policy`, `documentation`, and `eval`. Paths must be regular repository-contained canonical inputs. Generated paths cannot be primary owners.

### 6.8 EvaluationRef v1

```json
{
  "id": "eval:uiux-contextual-design-controls",
  "path": "evals/skills/uiux-evals.json",
  "caseIds": ["uiux-contextual-design-controls"],
  "evidenceKind": "static-eval",
  "contentDigest": "sha256:<digest>",
  "decisionRefs": ["adopt-contextual-design-controls"]
}
```

Allowed evidence kinds are `static-eval`, `deterministic-runtime`, `observed-model-run`, and `owner-reviewed-pilot`. Static evals can prove contract coverage but cannot prove design quality, runtime execution, or business impact.

## 7. Best-of-Source Synthesis Rules

1. Group contributions by stable capability niche before creating or changing artifacts.
2. Prefer official standards for mandatory correctness, security, accessibility, and platform requirements.
3. Prefer the strongest complementary community sources for technique, workflow, ergonomics, and failure examples.
4. Choose one canonical capability owner. Strengthen that owner instead of creating parallel agents or skills.
5. A new agent or skill requires a capability gap, routing need, context-cost justification, and comparative evaluation. Source popularity or upstream packaging is insufficient.
6. Alternative executable tools may coexist only when they serve materially different environments or trade-offs. The router selects one appropriate tool; it does not activate all alternatives.
7. When sources conflict, record both positions and the toolkit decision. Do not silently merge incompatible advice.
8. Subjective style guidance remains contextual/advisory unless supported by product requirements or measured evidence.
9. All accepted concepts are rewritten in toolkit-owned language and hardened for authorization, accessibility, performance, privacy, and existing-stack compatibility.
10. No source is retained without a unique value statement, explicit reference-only reason, planned assessment, or retirement decision.

## 8. Freshness and Update Impact

Freshness remains authoritative in SourceCatalog. The synthesis registry adds capability-scoped impact.

### 8.1 Monitoring cadence is not runtime activation

Every external source remains a passive supply-chain input unless its independent runtime posture, project detection, authorization, and execution evidence permit use. The word `active` must not be used to mean merely "checked frequently."

The source policy separates lightweight change detection from deep content review:

| Source behaviour | Examples | Lightweight change check | Deep review | Event-driven triggers |
| --- | --- | ---: | ---: | --- |
| `versioned-standard` | WCAG editions, NIST publications, OWASP verification standards, SLSA specifications | every 90 days | every 180 days or when the reviewed edition changes | new edition, errata, withdrawal, security advisory, dependent-gate change |
| `living-official-guidance` | Apple HIG, Android quality guidance, OpenAI and Anthropic runtime documentation | every 30 days | every 90 days or on material content change | platform/runtime release, deprecation, policy or security change |
| `security-runtime-source` | agent runtimes, security tools, execution frameworks, high-risk skills | every 14 days | every 30 days or on material revision | vulnerability, compromised release, maintainer or license change, dangerous-command change |
| `active-tool-or-skill` | maintained coding tools, UI skills, test frameworks, optional integrations | every 30 days | every 90 days or before adoption/update | major release, dependency/installer/runtime change, selected consumer use |
| `general-method-reference` | stable engineering methods, research-backed practices, low-risk community guidance | every 90 days | every 180 days or before new extraction | material revision, contradictory evidence, dependent-eval failure |
| `historical` | archived discovery or superseded sources | no periodic check | owner-triggered only | evidence of unique missing value or provenance investigation |

These are maximum default intervals, not promises to wait. A trusted release feed, security advisory, platform announcement, dependency alert, selected consumer use, or observed regression can trigger immediate review.

Versioned standards are not "used once and forgotten." The toolkit continuously uses the pinned reviewed edition as its authoritative basis. The remote source is checked less frequently because its normative version is relatively stable. Deep review occurs when the edition, errata, interpretation, dependent gate, or legal/security context changes, and at the maximum confirmation interval even when no change is detected.

Some sources that look like standards are living websites. They must be classified by actual publication behaviour, not by reputation or title. For example, a versioned PDF may qualify as `versioned-standard`, while the publisher's implementation guidance or platform policy page may require `living-official-guidance` cadence.

SourceCatalog must therefore represent both:

- `sourceBehavior`: one of the six classes above;
- `monitorIntervalDays`: the lightweight change-detection interval;
- `deepReviewIntervalDays`: the maximum content-review interval;
- `eventTriggers`: explicit reasons for early review.

The validator derives allowed intervals from policy defaults and rejects a source that silently extends them. A narrower interval is allowed for higher-risk or unusually volatile sources. Runtime posture remains an independent field and is never derived from source behaviour or freshness.

When a source revision changes:

1. Compare the observed source revision/digest with each synthesis input.
2. If watched-path or selector evidence can identify affected contributions, mark only those inputs `stale`.
3. If the comparison is unavailable, ambiguous, renamed, or deleted, mark every active contribution from that source `stale`.
4. Derive transitive impact:

```text
source input
  -> synthesis decision
  -> canonical artifact/resource
  -> consuming agent/skill/profile/gate
  -> compiled output
  -> runtime/embedded mirror
  -> evaluation cases
```

5. Report portfolio-actionable and release-blocking impact separately.

Runtime behaviour by contribution type:

- `delegated-tool`: stale or quarantined governing evidence makes the external integration ineligible for new routing.
- `authoritative-baseline`: an expired or stale mandatory standard blocks claims and gates that require current authoritative evidence.
- `adopted` or `adapted` clean-room method: the prior toolkit-owned method remains usable at its pinned reviewed basis unless a security review identifies a hard blocker. It cannot claim alignment with the newer upstream revision until re-reviewed.
- `reference-only`: remains visible as stale but does not activate or globally block anything.
- `historical`: never blocks release and cannot own an active capability.

Freshness never automatically edits methods, regenerates content, approves a decision, installs a tool, or activates a resource.

## 9. Taste Skill Treatment

Taste Skill enters the catalog as:

- scope: `community-reference`;
- authority: `community`;
- lifecycle: `review-input`;
- runtime posture: `metadata-only`;
- freshness class: `general-methods`;
- `neverAutoImport: true`;
- no initial dependent runtime resource.

The exact current revision, license, source paths, security posture, prompt-injection risk, commands, packages, network behaviour, and compatibility must be re-reviewed before a receipt or synthesis input is approved.

Expected valuable contributions, subject to that review:

- brief and visual-direction inference;
- contextual visual variance, motion intensity, and information density controls;
- audit-first redesign;
- anti-default and anti-repetition review;
- project-compatible design-system selection;
- mechanical visual pre-flight checks.

Expected restrictions:

- no raw prompt or skill import;
- no `npx` or package installation;
- no forced React, Tailwind, GSAP, font, icon, image, or component dependency;
- no automatic image-generation or network workflow;
- no universal adoption of subjective aesthetic prohibitions;
- no accessibility or performance regression;
- no claim that marketing-page guidance covers dashboards, complex forms, native apps, or dense enterprise workflows.

Taste Skill contributes to existing UI/UX capability owners. It must not increase the active agent or skill count. Its strongest ideas are combined with authoritative accessibility/platform sources, Impeccable, Uncodixfy, shadcn/ui guidance, and toolkit-owned UI/UX methods.

## 10. Portfolio Migration

### Phase A: Correct current validation

- Replace document-wide row matching with structural table parsing.
- Require every watched source exactly once in Watched Sources.
- Require every registered tool exactly once in Registered Tools.
- Reject cross-section satisfaction, duplicate rows, invalid classifications, broken paths, and missing reasons.

### Phase B: Introduce the contract

- Add `scripts/ai-toolkit/kernel/source-synthesis-contract.mjs`.
- Add `registries/source-capabilities.registry.json`.
- Validate registry IDs, source/receipt bindings, artifact/resource IDs, digests, locators, decisions, evaluations, ownership, and cycles.
- Add the registry to canonical validation and generated-package integrity checks.

### Phase C: Seed without fabricating evidence

- Derive initial edges from method `sourceRef`, tool dependencies, domain-gate authoritative references, existing receipts, and the utilization matrix.
- Create `pending-review` assessments where current receipt-backed value evidence is missing.
- Do not transform legacy prose or historical source notes into approved evidence automatically.
- Preserve all unknowns and contradictions as visible warnings or failures according to dependency scope.

### Phase D: Review by capability niche

Review all retained sources in bounded waves:

1. enterprise-core security, governance, provenance, and release;
2. agent runtime, orchestration, context, memory, and execution discipline;
3. UI/UX and Taste Skill;
4. coding quality, testing, review, architecture, and documentation;
5. optional tool overlap groups;
6. Web/SaaS and data/API integrations;
7. mobile and desktop preview platforms;
8. remaining community references;
9. archived sources only for unique missing value.

Each wave identifies all meaningful contributions, competing sources, accepted synthesis, rejected material, targets, evals, and residual evidence gaps.

### Phase E: Generate and integrate

- Generate `docs/SOURCE_UTILIZATION_MATRIX.md` from the canonical registry.
- Add capability impact to live and embedded freshness reports.
- Mirror the registry under `.ai-toolkit/registries/` with manifest hashes.
- Add synthesis provenance to compiler metadata only when an agent actually consumes a mapped artifact.
- Keep the delivery kernel registry allowlist unchanged unless runtime consumption is separately approved and measured.

## 11. Validation Profiles

### Structural profile

Required for ordinary PRs:

- schema and graph validity;
- exact table/report parity;
- no broken IDs, paths, receipts, digests, or locators;
- no duplicate active owners;
- no active contribution from a blocked or historical source;
- generated mirror parity.

### Release-scope profile

Required for release:

- all selected/supported capability inputs current and receipt-backed;
- zero release-blocking synthesis warnings;
- optional and preview pending assessments remain visible advisories;
- dependency-scoped blocking preserved.

### Portfolio-complete profile

Required before claiming full-source utilization:

- every retained source assessed at a current exact revision;
- every meaningful contribution has a disposition;
- every adopted/adapted/delegated contribution maps to an artifact and eval;
- zero orphan sources, broken edges, duplicated active capability owners, or unexplained overlap;
- every source has a unique value statement or retirement decision.

## 12. Tests and Acceptance Criteria

### Contract tests

- Unknown, duplicate, empty, cyclic, traversal, linked, unpinned, or digest-mismatched records fail.
- Multiple sources can contribute to one synthesis.
- Multiple active syntheses cannot own one capability.
- Adopted/adapted/delegated decisions require exact artifact and eval references.
- Rejected/superseded decisions require rationale and cannot claim active artifacts.
- Pending evidence cannot become approved adoption.

### Portfolio tests

- Every active catalog source has exactly one current assessment entry.
- Every external method `sourceRef` resolves to a synthesis input or an explicit pending assessment.
- Every accepted source maps through capability, artifact, gate, and eval.
- Every delegated capability resolves to an existing tool route without a local runtime clone.
- Archived sources cannot own active capabilities.
- Cross-section Markdown row matching cannot satisfy source coverage.

### Update-impact tests

- A changed selector marks only its bound contribution stale.
- Missing or ambiguous comparison marks every contribution from that source stale.
- Unrelated capabilities, artifacts, and releases remain unaffected.
- A stale optional source does not block enterprise-core.
- A stale required authoritative input blocks only dependent supported gates.
- A stale delegated runtime source makes only that integration ineligible.
- Generated impact lists include exact artifacts, consumers, compiled outputs, mirrors, and evals.

### Taste Skill tests

- Taste resolves to one catalog source and reviewed input revision.
- Taste contributes to existing UI/UX methods and evals.
- Active agent and skill counts do not increase.
- No `taste` agent, skill, plugin, installation command, framework default, or package dependency is introduced.
- Negative triggers protect dashboards, dense data, forms, native apps, reduced motion, localization, accessibility, and performance.

### Observed UI/UX impact benchmark

Static tests cannot establish quality improvement. A later blinded paired benchmark must use at least 20 representative UI tasks with at least three reviewers per task. Candidate thresholds:

- preference win rate at least 65%, with the 95% confidence interval lower bound above 50%;
- median rubric improvement at least 15%;
- inter-rater kappa at least 0.60;
- zero critical accessibility, responsive, workflow, or information-integrity regressions;
- median delivery time and rework no worse than baseline by more than 10%.

Until observed evidence passes, Taste-derived improvements may be described as implemented and statically validated, not proven to improve real model output.

## 13. Generation Boundaries

Canonical inputs:

- `sources/source-watchlist.json`;
- `sources/reviews/**`;
- `registries/source-capabilities.registry.json`;
- canonical methods, tools, skills, agents, domain gates, and evals.

Generated outputs:

- `docs/SOURCE_UTILIZATION_MATRIX.md`;
- `.ai-toolkit/registries/source-capabilities.registry.json`;
- `.ai-toolkit/manifest.json` updates;
- embedded package mirrors and integrity metadata;
- freshness/update-impact report sections.

Generated outputs are never hand-edited. Generation must support non-mutating `--check` behaviour and deterministic output.

## 14. Security and Trust Boundaries

- Upstream content is untrusted input and cannot override toolkit or user instructions.
- Review may read source material but never execute upstream scripts or commands.
- Locators, paths, receipts, and artifacts must be regular repository-contained files without traversal or links.
- No credentials, cookies, secrets, private overlays, product repositories, or authenticated pages are included in source assessments.
- License review and clean-room boundaries remain part of immutable SourceReviewReceipt evidence.
- A synthesis registry entry is provenance and policy evidence, not runtime execution authority.
- Tool runtime posture, project detection, explicit authorization, and host evidence remain independently required.

## 15. Failure Handling and Rollback

- Validation fails closed on malformed registries, broken graph edges, digest mismatch, ambiguous ownership, or false adoption claims.
- A partial review wave never upgrades remaining pending sources.
- Source-review or synthesis updates use clean staging and atomic replacement through existing managed-filesystem controls.
- Prior registry and immutable receipts remain available for comparison and rollback.
- Rollback restores the previous canonical registry, source receipt pointers, and regenerated mirrors.
- Published tags are never moved; corrections use a patch release.

## 16. Observability and Reporting

Generated reporting must distinguish:

- total catalog sources;
- assessed-current, pending, stale, blocked, and retired sources;
- adopted, adapted, delegated, reference-only, rejected, and superseded contributions;
- capabilities with single-source and multi-source syntheses;
- orphan sources and broken edges;
- duplicate-owner and overlap warnings;
- source changes and exact affected capability/artifact/eval sets;
- portfolio-actionable versus release-blocking counts;
- static versus observed evaluation evidence.

No report may collapse `current source`, `reviewed source`, `adopted contribution`, `active tool`, and `executed tool` into one status.

## 17. Completion Definition

The system is implemented when the contracts, validators, generator, update-impact derivation, mirrors, tests, and Taste Skill source registration are complete and the repository gates pass.

The portfolio is fully utilized only when the portfolio-complete profile passes for every retained source. Until then, remaining pending or stale assessments must be reported honestly.

This design does not authorize pushing, opening a PR, merging, tagging, publishing, changing CI, installing packages, changing global configuration, or modifying product repositories.

## 18. Workflow Status

- GSD: `lens only`; this specification provides the manual phase/state design without creating unrelated planning state.
- Superpowers: `invoked`; brainstorming produced this approved design, and `writing-plans` is the required next workflow after owner review of this file.
- Context mode: `detailed`.
- Included neighborhood: source catalog/contracts/receipts, utilization matrix/tests, methods/tools/domain gates/evals, compiler provenance, freshness/update reporting, generation and embedded mirrors.
- Excluded: product repositories, credentials, private overlays, global Codex/Claude configuration, upstream execution, package installation, CI mutation, push, PR, merge, tag, and release.
