import assert from "node:assert/strict";
import test from "node:test";

import { assertResourceContract } from "./ai-toolkit/kernel/contracts.mjs";
import { deriveCapabilityImpact } from "./ai-toolkit/kernel/source-capability-impact.mjs";

const DIGEST = "a".repeat(64);

function input(id, sourceId, locator) {
  return {
    id,
    sourceId,
    locators: [{ kind: "repository-path-section", value: locator }]
  };
}

function decision(id, inputRefs, artifactRefs, evaluationRefs, outcome = "adapted") {
  return { id, inputRefs, artifactRefs, evaluationRefs, outcome };
}

function fixtureRegistry({ twoTasteInputs = false, historical = false, missing = {} } = {}) {
  const tasteInputs = [input("taste-design-read", "taste-skill", "skills/taste-skill/SKILL.md#brief-inference")];
  if (twoTasteInputs) {
    tasteInputs.push(input("taste-redesign-audit", "taste-skill", "skills/taste-skill/SKILL.md#redesign-audit"));
  }
  const decisions = [
    decision("taste-visual-direction", ["taste-design-read"], ["method:uiux.premium-visual-quality"], ["eval:uiux-contextual-design-controls"]),
    decision("unrelated-security", ["security-input"], ["method:security.review"], ["eval:security-review"])
  ];
  if (twoTasteInputs) {
    decisions.push(decision("taste-redesign", ["taste-redesign-audit"], ["method:uiux.redesign"], ["eval:uiux-redesign"]));
  }
  return {
    capabilities: [
      {
        id: "security.supply-chain",
        lifecycle: "active",
        activeSynthesisId: "security.supply-chain@1",
        consumerRefs: [{ kind: "agent", id: "security-agent" }]
      },
      {
        id: "uiux.visual-direction",
        lifecycle: historical ? "retired" : "active",
        activeSynthesisId: "uiux.visual-direction@1",
        consumerRefs: missing.consumer ? [] : [
          { kind: "agent", id: "uiux-agent" },
          { kind: "skill", id: "uiux" }
        ]
      }
    ],
    syntheses: [
      {
        id: "security.supply-chain@1",
        capabilityId: "security.supply-chain",
        state: "approved",
        inputs: [input("security-input", "security-source", "security.md#supply-chain")],
        decisions: [decisions[1]],
        artifactRefs: [{ id: "method:security.review", resourceId: "security.review", decisionRefs: ["unrelated-security"] }],
        evaluationRefs: [{ id: "eval:security-review", decisionRefs: ["unrelated-security"] }]
      },
      {
        id: "uiux.visual-direction@1",
        capabilityId: "uiux.visual-direction",
        state: "approved",
        inputs: [...tasteInputs, input("visual-primary", "visual-source", "visual.md#baseline")],
        decisions: decisions.filter((entry) => entry.id !== "unrelated-security"),
        artifactRefs: [
          ...(missing.artifact ? [] : [{ id: "method:uiux.premium-visual-quality", resourceId: "uiux.premium-visual-quality", decisionRefs: ["taste-visual-direction"] }]),
          ...(twoTasteInputs ? [{ id: "method:uiux.redesign", resourceId: "uiux.redesign", decisionRefs: ["taste-redesign"] }] : [])
        ],
        evaluationRefs: [
          ...(missing.evaluation ? [] : [{ id: "eval:uiux-contextual-design-controls", decisionRefs: ["taste-visual-direction"] }]),
          ...(twoTasteInputs ? [{ id: "eval:uiux-redesign", decisionRefs: ["taste-redesign"] }] : [])
        ]
      }
    ]
  };
}

function resource(id, { supported = true, forgedFlags = {} } = {}) {
  return {
    schemaVersion: "1.0.0",
    id,
    type: "skill",
    canonicalCompetencies: ["source-governance"],
    eligibleRoles: ["support"],
    measuredContextCost: 1,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: 3,
      evidencePath: "scripts/test-source-capability-impact.mjs",
      contentDigest: DIGEST
    },
    authority: "internal-reviewed",
    lifecycle: "active",
    runtimePosture: {
      registryPresent: true,
      available: supported,
      supported,
      executionProof: false,
      sandboxMode: "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: { allowed: ["codex-project-runtime"], forbidden: [] },
    detectionEvidence: {
      state: "observed",
      evidencePath: "scripts/test-source-capability-impact.mjs",
      contentDigest: DIGEST
    },
    freshness: {
      state: supported ? "current" : "stale",
      evidencePath: "scripts/test-source-capability-impact.mjs",
      contentDigest: DIGEST
    },
    nativeAdapter: { kind: "codex-skill", id },
    commandReference: null,
    eligibility: { eligible: supported, reasons: supported ? [] : ["fixture-unsupported"] },
    ...forgedFlags
  };
}

function fixtureResources({ missing = {}, supported = true, forgedFlags = {} } = {}) {
  return {
    resources: [
      resource("uiux.premium-visual-quality", { supported, forgedFlags }),
      resource("uiux.redesign", { supported: false }),
      resource("security.review")
    ].filter((resource) => !(missing.resource && resource.id === "uiux.premium-visual-quality"))
  };
}

function fixtureReleasePolicy(overrides = {}) {
  return {
    selectedResourceIds: ["uiux.premium-visual-quality"],
    blockingResourceIds: ["uiux.premium-visual-quality"],
    ...overrides
  };
}

function fixtureCompilerInventory({ cycle = false, missingCompiledOutput = false, missingMirror = false } = {}) {
  const rootRefs = ["compiled/uiux-child.md"];
  if (missingCompiledOutput) rootRefs.push("compiled/missing.md");
  const rootMirrors = ["mirror/uiux-embedded.md"];
  if (missingMirror) rootMirrors.push("mirror/missing.md");
  return {
    compiledOutputs: [
      {
        id: "compiled/uiux-agent.md",
        consumerRefs: ["agent:uiux-agent"],
        compiledOutputRefs: rootRefs,
        mirrorOutputRefs: rootMirrors
      },
      {
        id: "compiled/uiux-child.md",
        compiledOutputRefs: cycle ? ["compiled/uiux-agent.md"] : [],
        mirrorOutputRefs: ["mirror/uiux-runtime.md"]
      },
      {
        id: "compiled/security-agent.md",
        consumerRefs: ["agent:security-agent"],
        mirrorOutputRefs: ["mirror/security-agent.md"]
      }
    ],
    mirrorOutputs: [
      {
        id: "mirror/uiux-embedded.md",
        mirrorOutputRefs: ["mirror/uiux-runtime.md"],
        compiledOutputRefs: ["compiled/uiux-child.md"]
      },
      {
        id: "mirror/uiux-runtime.md",
        mirrorOutputRefs: cycle ? ["mirror/uiux-embedded.md"] : [],
        compiledOutputRefs: cycle ? ["compiled/uiux-agent.md"] : []
      },
      { id: "mirror/security-agent.md", mirrorOutputRefs: [], compiledOutputRefs: [] }
    ]
  };
}

function impact(overrides = {}) {
  return deriveCapabilityImpact({
    sourceId: "taste-skill",
    changedLocators: ["skills/taste-skill/SKILL.md#brief-inference"],
    comparisonState: "exact",
    registry: fixtureRegistry(),
    resourceCatalog: fixtureResources(),
    compilerInventory: fixtureCompilerInventory(),
    releasePolicy: fixtureReleasePolicy(),
    ...overrides
  });
}

test("exact locator change stales only bound synthesis inputs", () => {
  const result = impact();
  assert.deepEqual(result.staleInputIds, ["taste-design-read"]);
  assert.deepEqual(result.synthesisDecisionIds, ["taste-visual-direction"]);
  assert.deepEqual(result.capabilityIds, ["uiux.visual-direction"]);
  assert.deepEqual(result.artifactRefs, ["method:uiux.premium-visual-quality"]);
  assert.deepEqual(result.consumerRefs, ["agent:uiux-agent", "skill:uiux"]);
  assert.deepEqual(result.compiledOutputs, ["compiled/uiux-agent.md", "compiled/uiux-child.md"]);
  assert.deepEqual(result.mirrorOutputs, ["mirror/uiux-embedded.md", "mirror/uiux-runtime.md"]);
  assert.deepEqual(result.evaluationRefs, ["eval:uiux-contextual-design-controls"]);
});

test("ambiguous source comparison stales every active input from that source", () => {
  const result = impact({
    changedLocators: [],
    comparisonState: "ambiguous",
    registry: fixtureRegistry({ twoTasteInputs: true })
  });
  assert.deepEqual(result.staleInputIds, ["taste-design-read", "taste-redesign-audit"]);
  assert.deepEqual(result.synthesisDecisionIds, ["taste-redesign", "taste-visual-direction"]);
});

test("unavailable renamed and deleted comparisons fail closed", () => {
  for (const comparisonState of ["unavailable", "renamed", "deleted"]) {
    const result = impact({
      changedLocators: ["not-a-bound-locator"],
      comparisonState,
      registry: fixtureRegistry({ twoTasteInputs: true })
    });
    assert.deepEqual(result.staleInputIds, ["taste-design-read", "taste-redesign-audit"], comparisonState);
  }
});

test("missing graph nodes are reported without inventing downstream impact", () => {
  const result = impact({
    registry: fixtureRegistry({ missing: { artifact: true, evaluation: true } }),
    resourceCatalog: fixtureResources({ missing: { resource: true, consumer: true } })
  });
  assert.deepEqual(result.artifactRefs, []);
  assert.deepEqual(result.consumerRefs, []);
  assert.deepEqual(result.compiledOutputs, []);
  assert.deepEqual(result.mirrorOutputs, []);
  assert.deepEqual(result.evaluationRefs, []);
  assert.deepEqual(result.reasons, [
    "missing-artifact:method:uiux.premium-visual-quality",
    "missing-evaluation:eval:uiux-contextual-design-controls",
    "unknown-blocking-resource-id:uiux.premium-visual-quality",
    "unknown-selected-resource-id:uiux.premium-visual-quality"
  ]);

  const missingResource = impact({ resourceCatalog: fixtureResources({ missing: { resource: true } }) });
  assert.deepEqual(missingResource.artifactRefs, ["method:uiux.premium-visual-quality"]);
  assert.deepEqual(missingResource.consumerRefs, []);
  assert.deepEqual(missingResource.reasons, [
    "missing-resource:uiux.premium-visual-quality",
    "unknown-blocking-resource-id:uiux.premium-visual-quality",
    "unknown-selected-resource-id:uiux.premium-visual-quality"
  ]);

  const missingConsumer = impact({ registry: fixtureRegistry({ missing: { consumer: true } }) });
  assert.deepEqual(missingConsumer.consumerRefs, []);
  assert.deepEqual(missingConsumer.compiledOutputs, []);
  assert.deepEqual(missingConsumer.reasons, ["missing-consumer:uiux.visual-direction"]);

  const missingCapability = fixtureRegistry();
  missingCapability.capabilities = missingCapability.capabilities
    .filter((entry) => entry.id !== "uiux.visual-direction");
  const missingCapabilityImpact = impact({ registry: missingCapability });
  assert.deepEqual(missingCapabilityImpact.staleInputIds, ["taste-design-read"]);
  assert.deepEqual(missingCapabilityImpact.reasons, ["missing-capability:uiux.visual-direction"]);
});

test("real compiled and mirror cycles terminate while traversing every reachable downstream node", () => {
  const result = impact({
    registry: fixtureRegistry({ twoTasteInputs: true }),
    compilerInventory: fixtureCompilerInventory({ cycle: true }),
    comparisonState: "ambiguous",
    changedLocators: []
  });
  assert.deepEqual(result.consumerRefs, ["agent:uiux-agent", "skill:uiux"]);
  assert.deepEqual(result.compiledOutputs, ["compiled/uiux-agent.md", "compiled/uiux-child.md"]);
  assert.deepEqual(result.mirrorOutputs, ["mirror/uiux-embedded.md", "mirror/uiux-runtime.md"]);
});

test("unrelated, historical, and non-contributing sources produce no release authority", () => {
  const unrelated = impact({ sourceId: "unknown-source" });
  assert.deepEqual(unrelated.staleInputIds, []);
  assert.equal(unrelated.portfolioActionable, false);
  assert.equal(unrelated.releaseBlocking, false);
  assert.deepEqual(unrelated.blockingResourceIds, []);

  const historical = impact({ registry: fixtureRegistry({ historical: true }) });
  assert.deepEqual(historical.staleInputIds, []);
  assert.equal(historical.portfolioActionable, false);
  assert.equal(historical.releaseBlocking, false);
  assert.deepEqual(historical.blockingResourceIds, []);
});

test("release policy is the only selection and blocking authority over canonical resources", () => {
  const canonical = fixtureResources();
  for (const entry of canonical.resources) assert.doesNotThrow(() => assertResourceContract(entry));

  const selected = impact({ resourceCatalog: canonical, releasePolicy: fixtureReleasePolicy() });
  assert.equal(selected.portfolioActionable, true);
  assert.equal(selected.releaseBlocking, true);
  assert.deepEqual(selected.blockingResourceIds, ["uiux.premium-visual-quality"]);

  const forged = impact({
    resourceCatalog: fixtureResources({
      forgedFlags: { selected: true, supported: true, sourceChangeBlocksRelease: true, releaseBlocking: true }
    }),
    releasePolicy: undefined
  });
  assert.equal(forged.releaseBlocking, false);
  assert.deepEqual(forged.blockingResourceIds, []);

  const unsupported = impact({
    resourceCatalog: fixtureResources({ supported: false }),
    releasePolicy: fixtureReleasePolicy()
  });
  assert.equal(unsupported.releaseBlocking, false);
  assert.deepEqual(unsupported.blockingResourceIds, []);
});

test("invalid release policy IDs and duplicates fail closed with stable reasons", () => {
  const policy = fixtureReleasePolicy({
    selectedResourceIds: ["unknown-resource", "uiux.premium-visual-quality", "uiux.premium-visual-quality"],
    blockingResourceIds: ["uiux.premium-visual-quality", "unknown-resource", "unknown-resource"]
  });
  const result = impact({ releasePolicy: policy });
  assert.equal(result.releaseBlocking, false);
  assert.deepEqual(result.blockingResourceIds, []);
  assert.deepEqual(result.reasons, [
    "duplicate-blocking-resource-id:unknown-resource",
    "duplicate-selected-resource-id:uiux.premium-visual-quality",
    "unknown-blocking-resource-id:unknown-resource",
    "unknown-selected-resource-id:unknown-resource"
  ]);
});

test("stale inputs without decisions and broken downstream references are visible", () => {
  const withoutDecision = fixtureRegistry();
  withoutDecision.syntheses.find((entry) => entry.id === "uiux.visual-direction@1").decisions = [];
  assert.deepEqual(impact({ registry: withoutDecision }).reasons, ["stale-input-without-decision:taste-design-read"]);

  const missing = impact({ compilerInventory: fixtureCompilerInventory({ missingCompiledOutput: true, missingMirror: true }) });
  assert.deepEqual(missing.reasons, [
    "missing-compiled-output:compiled/missing.md",
    "missing-mirror-output:mirror/missing.md"
  ]);

  const invalidInventory = fixtureCompilerInventory();
  invalidInventory.compiledOutputs[0].mirrorOutputRefs.push({ malformed: true });
  assert.deepEqual(impact({ compilerInventory: invalidInventory }).reasons, ["invalid-mirror-output"]);
});

test("duplicate graph identifiers fail closed independently of input order", () => {
  const duplicateCapability = fixtureRegistry();
  duplicateCapability.capabilities.push(structuredClone(duplicateCapability.capabilities[1]));
  const duplicateArtifactAndEval = fixtureRegistry();
  const synthesis = duplicateArtifactAndEval.syntheses.find((entry) => entry.id === "uiux.visual-direction@1");
  synthesis.artifactRefs.push(structuredClone(synthesis.artifactRefs[0]));
  synthesis.evaluationRefs.push(structuredClone(synthesis.evaluationRefs[0]));
  const duplicateResources = fixtureResources();
  duplicateResources.resources.push(structuredClone(duplicateResources.resources[0]));
  const duplicateOutputs = fixtureCompilerInventory();
  duplicateOutputs.compiledOutputs.push(structuredClone(duplicateOutputs.compiledOutputs[0]));

  const cases = [
    [duplicateCapability, fixtureResources(), fixtureCompilerInventory(), "duplicate-capability:uiux.visual-direction"],
    [duplicateArtifactAndEval, fixtureResources(), fixtureCompilerInventory(), "duplicate-artifact:method:uiux.premium-visual-quality"],
    [duplicateArtifactAndEval, fixtureResources(), fixtureCompilerInventory(), "duplicate-evaluation:eval:uiux-contextual-design-controls"],
    [fixtureRegistry(), duplicateResources, fixtureCompilerInventory(), "duplicate-resource:uiux.premium-visual-quality"],
    [fixtureRegistry(), fixtureResources(), duplicateOutputs, "duplicate-compiled-output:compiled/uiux-agent.md"]
  ];
  for (const [registry, resourceCatalog, compilerInventory, reason] of cases) {
    const normal = impact({ registry, resourceCatalog, compilerInventory });
    const reversed = impact({
      registry: { ...registry, capabilities: [...registry.capabilities].reverse(), syntheses: [...registry.syntheses].reverse() },
      resourceCatalog: { resources: [...resourceCatalog.resources].reverse() },
      compilerInventory: {
        ...compilerInventory,
        compiledOutputs: [...compilerInventory.compiledOutputs].reverse(),
        mirrorOutputs: [...compilerInventory.mirrorOutputs].reverse()
      }
    });
    assert.equal(normal.reasons.includes(reason), true, reason);
    assert.deepEqual(reversed.reasons, normal.reasons, reason);
  }
});

test("present edge containers and partial consumers fail closed without hiding valid siblings", () => {
  const absent = fixtureRegistry();
  const absentDecision = absent.syntheses.find((entry) => entry.id === "uiux.visual-direction@1").decisions[0];
  delete absentDecision.artifactRefs;
  delete absentDecision.evaluationRefs;
  const absentResult = impact({ registry: absent });
  assert.equal(absentResult.portfolioActionable, false);
  assert.equal(absentResult.releaseBlocking, false);
  assert.deepEqual(absentResult.reasons, [
    "missing-artifact-refs:taste-visual-direction",
    "missing-evaluation-refs:taste-visual-direction"
  ]);

  const invalid = fixtureRegistry();
  const invalidDecision = invalid.syntheses.find((entry) => entry.id === "uiux.visual-direction@1").decisions[0];
  invalidDecision.artifactRefs = "method:uiux.premium-visual-quality";
  invalidDecision.evaluationRefs = { id: "eval:uiux-contextual-design-controls" };
  const invalidResult = impact({ registry: invalid });
  assert.equal(invalidResult.releaseBlocking, false);
  assert.deepEqual(invalidResult.reasons, [
    "invalid-artifact-refs:taste-visual-direction",
    "invalid-evaluation-refs:taste-visual-direction"
  ]);

  const mixedConsumers = fixtureRegistry();
  mixedConsumers.capabilities.find((entry) => entry.id === "uiux.visual-direction").consumerRefs = [
    { kind: "agent", id: "uiux-agent" },
    { kind: "skill" },
    "skill:uiux",
    null
  ];
  const mixedResult = impact({ registry: mixedConsumers });
  assert.deepEqual(mixedResult.consumerRefs, ["agent:uiux-agent"]);
  assert.deepEqual(mixedResult.reasons, [
    "invalid-consumer-ref:uiux.visual-direction:1",
    "invalid-consumer-ref:uiux.visual-direction:2",
    "invalid-consumer-ref:uiux.visual-direction:3"
  ]);
  assert.deepEqual(mixedResult.compiledOutputs, ["compiled/uiux-agent.md", "compiled/uiux-child.md"]);

  const invalidInventory = fixtureCompilerInventory();
  invalidInventory.compiledOutputs[0].compiledOutputRefs = "compiled/uiux-child.md";
  invalidInventory.compiledOutputs[0].mirrorOutputRefs = { id: "mirror/uiux-embedded.md" };
  const invalidInventoryResult = impact({ compilerInventory: invalidInventory });
  assert.deepEqual(invalidInventoryResult.reasons, [
    "invalid-compiled-output-refs:compiled/uiux-agent.md",
    "invalid-mirror-output-refs:compiled/uiux-agent.md"
  ]);
});

test("non-actionable decisions remain visible but never create affected blocking resources", () => {
  for (const outcome of ["reference-only", "rejected", "superseded"]) {
    const registry = fixtureRegistry();
    const current = registry.syntheses.find((entry) => entry.id === "uiux.visual-direction@1").decisions[0];
    current.outcome = outcome;
    const result = impact({ registry });
    assert.deepEqual(result.synthesisDecisionIds, ["taste-visual-direction"], outcome);
    assert.deepEqual(result.artifactRefs, ["method:uiux.premium-visual-quality"], outcome);
    assert.equal(result.portfolioActionable, false, outcome);
    assert.equal(result.releaseBlocking, false, outcome);
    assert.deepEqual(result.blockingResourceIds, [], outcome);
    assert.deepEqual(result.reasons, [`non-actionable-decision:${outcome}:taste-visual-direction`], outcome);
  }

  const malformed = fixtureRegistry();
  const current = malformed.syntheses.find((entry) => entry.id === "uiux.visual-direction@1").decisions[0];
  current.outcome = "reference-only";
  current.artifactRefs = { forged: true };
  const malformedResult = impact({ registry: malformed });
  assert.equal(malformedResult.releaseBlocking, false);
  assert.deepEqual(malformedResult.reasons, [
    "invalid-artifact-refs:taste-visual-direction",
    "non-actionable-decision:reference-only:taste-visual-direction"
  ]);
});

test("empty actionable artifact and evaluation edges fail closed", () => {
  const registry = fixtureRegistry();
  const current = registry.syntheses.find((entry) => entry.id === "uiux.visual-direction@1").decisions[0];
  current.artifactRefs = [];
  current.evaluationRefs = [];
  const result = impact({ registry });
  assert.deepEqual(result.synthesisDecisionIds, ["taste-visual-direction"]);
  assert.equal(result.portfolioActionable, false);
  assert.equal(result.releaseBlocking, false);
  assert.deepEqual(result.blockingResourceIds, []);
  assert.deepEqual(result.reasons, [
    "empty-artifact-refs:taste-visual-direction",
    "empty-evaluation-refs:taste-visual-direction"
  ]);
});

test("untrustworthy exact locator bindings conservatively stale every active source input", () => {
  const mutateLocator = [
    ["missing", (entry) => { delete entry.locators; }, ["missing-locators:taste-design-read"]],
    ["empty", (entry) => { entry.locators = []; }, ["empty-locators:taste-design-read"]],
    ["non-array", (entry) => { entry.locators = "skills/taste-skill/SKILL.md#brief-inference"; }, ["invalid-locators:taste-design-read"]],
    ["malformed", (entry) => { entry.locators = [{ kind: "repository-path-section" }, "not-a-locator"]; }, ["invalid-locator:taste-design-read:0", "invalid-locator:taste-design-read:1"]]
  ];
  for (const [name, mutate, reasons] of mutateLocator) {
    const registry = fixtureRegistry({ twoTasteInputs: true });
    const synthesis = registry.syntheses.find((entry) => entry.id === "uiux.visual-direction@1");
    mutate(synthesis.inputs.find((entry) => entry.id === "taste-design-read"));
    const result = impact({ registry });
    assert.deepEqual(result.staleInputIds, ["taste-design-read", "taste-redesign-audit"], name);
    for (const reason of reasons) assert.equal(result.reasons.includes(reason), true, `${name}: ${reason}`);
  }
});
