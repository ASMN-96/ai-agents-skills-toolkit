import assert from "node:assert/strict";
import test from "node:test";

import { deriveCapabilityImpact } from "./ai-toolkit/kernel/source-capability-impact.mjs";

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

function fixtureResources({ missing = {}, selected = true, supported = true } = {}) {
  return {
    resources: [
      {
        id: "uiux.premium-visual-quality",
        selected,
        supported,
        sourceChangeBlocksRelease: true,
        consumerRefs: missing.consumer ? [] : [{ kind: "agent", id: "uiux-agent" }, { kind: "skill", id: "uiux" }]
      },
      { id: "uiux.redesign", selected: false, supported: false, sourceChangeBlocksRelease: true, consumerRefs: [{ kind: "agent", id: "uiux-agent" }] },
      { id: "security.review", selected: true, supported: true, sourceChangeBlocksRelease: true, consumerRefs: [{ kind: "agent", id: "security-agent" }] }
    ].filter((resource) => !(missing.resource && resource.id === "uiux.premium-visual-quality"))
  };
}

function fixtureCompilerInventory({ cycle = false } = {}) {
  return {
    compiledOutputs: [
      {
        id: "compiled/uiux-agent.md",
        consumerRefs: ["agent:uiux-agent"],
        mirrorOutputs: [".ai-toolkit/compiled-agents/uiux-agent.md", "runtime/compiled/uiux-agent.md"],
        ...(cycle ? { compiledOutputRefs: ["compiled/uiux-agent.md"] } : {})
      },
      {
        id: "compiled/security-agent.md",
        consumerRefs: ["agent:security-agent"],
        mirrorOutputs: [".ai-toolkit/compiled-agents/security-agent.md"]
      }
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
  assert.deepEqual(result.compiledOutputs, ["compiled/uiux-agent.md"]);
  assert.deepEqual(result.mirrorOutputs, [".ai-toolkit/compiled-agents/uiux-agent.md", "runtime/compiled/uiux-agent.md"]);
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
    "missing-evaluation:eval:uiux-contextual-design-controls"
  ]);

  const missingResource = impact({ resourceCatalog: fixtureResources({ missing: { resource: true } }) });
  assert.deepEqual(missingResource.artifactRefs, ["method:uiux.premium-visual-quality"]);
  assert.deepEqual(missingResource.consumerRefs, []);
  assert.deepEqual(missingResource.reasons, ["missing-resource:uiux.premium-visual-quality"]);

  const missingConsumer = impact({ registry: fixtureRegistry({ missing: { consumer: true } }) });
  assert.deepEqual(missingConsumer.consumerRefs, []);
  assert.deepEqual(missingConsumer.compiledOutputs, []);
  assert.deepEqual(missingConsumer.reasons, ["missing-consumer:uiux.visual-direction"]);
});

test("cycles, duplicates, and input ordering do not change deterministic impact", () => {
  const result = impact({
    registry: fixtureRegistry({ twoTasteInputs: true }),
    compilerInventory: fixtureCompilerInventory({ cycle: true }),
    comparisonState: "ambiguous",
    changedLocators: []
  });
  assert.deepEqual(result.consumerRefs, ["agent:uiux-agent", "skill:uiux"]);
  assert.deepEqual(result.compiledOutputs, ["compiled/uiux-agent.md"]);
  assert.deepEqual(result.mirrorOutputs, [".ai-toolkit/compiled-agents/uiux-agent.md", "runtime/compiled/uiux-agent.md"]);
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

test("only affected selected supported resources can block release", () => {
  const selected = impact();
  assert.equal(selected.portfolioActionable, true);
  assert.equal(selected.releaseBlocking, true);
  assert.deepEqual(selected.blockingResourceIds, ["uiux.premium-visual-quality"]);

  const optional = impact({ resourceCatalog: fixtureResources({ selected: false, supported: false }) });
  assert.equal(optional.portfolioActionable, true);
  assert.equal(optional.releaseBlocking, false);
  assert.deepEqual(optional.blockingResourceIds, []);
});
