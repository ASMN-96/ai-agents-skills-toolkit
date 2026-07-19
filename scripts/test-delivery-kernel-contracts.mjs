#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as contracts from "./ai-toolkit/kernel/contracts.mjs";
import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { buildResourceCatalog } from "./ai-toolkit/kernel/resource-catalog.mjs";
import { pinRequestToCurrentRepositoryCommit } from "./test-support/live-repository-fixture.mjs";

const REGISTERED_SCENARIOS = new Set(["large-governed-implementation"]);
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIGEST = "a".repeat(64);
const SYNTHETIC_REPOSITORY_COMMIT = "a".repeat(40);

function validRequest() {
  return {
    schemaVersion: "1.0.0",
    task: {
      id: "TASK-200",
      goal: "Deliver the versioned request contract",
      scenario: "large-governed-implementation",
      scope: ["scripts/ai-toolkit/kernel"],
      exclusions: ["deployment"],
      constraints: ["preserve existing user work"],
      risk: "high",
      targets: {
        platforms: ["web-saas"],
        frameworkOverlays: []
      },
      authorizedActions: [
        "repository-read",
        "scoped-local-write",
        "project-validation"
      ],
      acceptanceCriteria: [
        {
          id: "AC-1",
          statement: "The public request contract is versioned and validated.",
          requiredGateIds: ["focused-tests"]
        }
      ],
      competencies: ["architecture", "implementation", "verification"],
      gates: ["focused-tests"]
    },
    repository: {
      root: ".",
      expectedCommit: SYNTHETIC_REPOSITORY_COMMIT
    },
    contextPolicy: {
      mode: "standard",
      modelWindowTokens: 128000,
      maxInputFraction: 0.35
    }
  };
}

function validResource(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "project-tests",
    type: "tool",
    canonicalCompetencies: ["testing", "verification"],
    eligibleRoles: ["support"],
    measuredContextCost: 2,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: 6,
      evidencePath: "package.json",
      contentDigest: DIGEST
    },
    authority: "internal-reviewed",
    lifecycle: "active",
    runtimePosture: {
      registryPresent: true,
      available: true,
      supported: true,
      executionProof: false,
      sandboxMode: "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: {
      allowed: ["codex-project-runtime"],
      forbidden: []
    },
    detectionEvidence: {
      state: "observed",
      evidencePath: "package.json",
      contentDigest: DIGEST
    },
    freshness: {
      state: "current",
      evidencePath: "package.json",
      contentDigest: DIGEST
    },
    nativeAdapter: { kind: "project-script", id: "project-tests" },
    commandReference: {
      kind: "project-script",
      manifestPath: "package.json",
      scriptName: "test:focused",
      digest: DIGEST
    },
    eligibility: { eligible: true, reasons: [] },
    ...overrides
  };
}

test("DeliveryRequest v1 preserves the governed envelope and additive requirements", () => {
  assert.equal(typeof contracts.assertDeliveryRequest, "function");
  const request = contracts.assertDeliveryRequest(validRequest(), {
    registeredScenarios: REGISTERED_SCENARIOS
  });

  assert.deepEqual(request, validRequest());
  assert.equal(request.task.acceptanceCriteria[0].requiredGateIds[0], "focused-tests");
  assert.equal(request.repository.expectedCommit, SYNTHETIC_REPOSITORY_COMMIT);
  assert.equal(request.contextPolicy.maxInputFraction, 0.35);
});

test("DeliveryRequest v1 rejects the previous flat prototype with the exact migration message", () => {
  assert.equal(typeof contracts.assertDeliveryRequest, "function");
  assert.equal(typeof contracts.DELIVERY_REQUEST_V1_MIGRATION_MESSAGE, "string");

  assert.throws(
    () => contracts.assertDeliveryRequest({
      id: "TASK-OLD",
      goal: "Old flat request",
      platform: "web-saas",
      detectedTools: ["codeql"],
      projectCommands: { codeql: "codeql database analyze" },
      requiredEvidence: ["tests"]
    }, { registeredScenarios: REGISTERED_SCENARIOS }),
    (error) => error?.message === contracts.DELIVERY_REQUEST_V1_MIGRATION_MESSAGE
  );
});

test("DeliveryRequest v1 rejects legacy caller controls and invalid closed values", () => {
  assert.equal(typeof contracts.assertDeliveryRequest, "function");

  for (const [field, value] of [
    ["detectedTools", ["codeql"]],
    ["projectCommands", { codeql: "codeql database analyze" }],
    ["requiredEvidence", ["tests"]],
    ["resourceLifecycle", { codeql: "active" }],
    ["freshness", { codeql: "current" }]
  ]) {
    assert.throws(
      () => contracts.assertDeliveryRequest({ ...validRequest(), [field]: value }, {
        registeredScenarios: REGISTERED_SCENARIOS
      }),
      new RegExp(`${field}.*caller-controlled.*forbidden`)
    );
  }

  assert.throws(
    () => contracts.assertDeliveryRequest({
      ...validRequest(),
      task: { ...validRequest().task, authorizedActions: ["arbitrary-shell-command"] }
    }, { registeredScenarios: REGISTERED_SCENARIOS }),
    /authorizedActions\[0\].*closed enum/
  );

  assert.throws(
    () => contracts.assertDeliveryRequest({
      ...validRequest(),
      task: {
        ...validRequest().task,
        targets: { platforms: ["linux-desktop"], frameworkOverlays: ["flutter"] }
      }
    }, { registeredScenarios: REGISTERED_SCENARIOS }),
    /targets\.platforms\[0\].*unknown platform.*targets\.frameworkOverlays\[0\].*unknown framework overlay/
  );
});

test("DeliveryRequest v1 exposes and accepts only the exact target and authorization enums", () => {
  assert.deepEqual(contracts.DELIVERY_REQUEST_PLATFORM_IDS, [
    "web-saas",
    "ios",
    "android",
    "windows-desktop",
    "macos-desktop"
  ]);
  assert.deepEqual(contracts.DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS, [
    "expo-react-native",
    "electron",
    "tauri"
  ]);
  assert.deepEqual(contracts.DELIVERY_REQUEST_AUTHORIZED_ACTIONS, [
    "repository-read",
    "scoped-local-write",
    "project-validation",
    "network-evidence-read",
    "dependency-restore",
    "ci-change",
    "release-change",
    "deployment"
  ]);

  for (const platform of contracts.DELIVERY_REQUEST_PLATFORM_IDS) {
    const request = validRequest();
    request.task.targets.platforms = [platform];
    request.task.targets.frameworkOverlays = [
      ...contracts.DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS
    ];
    request.task.authorizedActions = [
      ...contracts.DELIVERY_REQUEST_AUTHORIZED_ACTIONS
    ];
    assert.doesNotThrow(() => contracts.assertDeliveryRequest(request, {
      registeredScenarios: REGISTERED_SCENARIOS
    }));
  }
});

test("DeliveryRequest v1 fails closed on scenario, criteria, repository, and context errors", () => {
  assert.equal(typeof contracts.assertDeliveryRequest, "function");

  const invalid = validRequest();
  invalid.task.scenario = "not-registered";
  invalid.task.acceptanceCriteria.push({
    id: "AC-1",
    statement: "Duplicate",
    requiredGateIds: []
  });
  invalid.repository.root = "../outside";
  invalid.repository.expectedCommit = "abc123";
  invalid.contextPolicy.maxInputFraction = 0.5;

  assert.throws(
    () => contracts.assertDeliveryRequest(invalid, { registeredScenarios: REGISTERED_SCENARIOS }),
    /scenario.*not registered.*acceptanceCriteria\[1\]\.id.*unique.*requiredGateIds.*must not be empty.*repository\.root.*repository-relative.*expectedCommit.*40-character.*maxInputFraction.*0\.35/
  );
});

test("ResourceContract v1 validates every routing and execution boundary without raw commands", () => {
  assert.equal(typeof contracts.assertResourceContract, "function");
  const resource = contracts.assertResourceContract(validResource({
    id: "reviewer-agent",
    type: "agent",
    canonicalCompetencies: ["verification", "governance"],
    eligibleRoles: ["specialist", "verifier"],
    measuredContextCost: 2400,
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: 7200,
      evidencePath: ".codex/agents/reviewer-agent.toml",
      contentDigest: DIGEST
    },
    detectionEvidence: {
      state: "observed",
      evidencePath: ".codex/agents/reviewer-agent.toml",
      contentDigest: DIGEST
    },
    freshness: {
      state: "current",
      evidencePath: ".codex/agents/reviewer-agent.toml",
      contentDigest: DIGEST
    },
    runtimePosture: {
      registryPresent: true,
      available: true,
      supported: true,
      executionProof: false,
      sandboxMode: "read-only",
      scopedLocalWrite: false
    },
    nativeAdapter: { kind: "codex-agent", id: "reviewer-agent" },
    commandReference: null
  }));

  assert.equal(resource.id, "reviewer-agent");
  assert.equal(resource.measuredContextCost, 2400);

  assert.throws(
    () => contracts.assertResourceContract({
      ...resource,
      command: "node --test",
      commandReference: "node --test"
    }),
    /raw command.*forbidden.*commandReference.*structured project-script reference/
  );
});

test("ResourceContract v1 rejects unknown lifecycle/freshness state and contradictory eligibility", () => {
  const base = validResource();

  assert.throws(() => contracts.assertResourceContract({
    ...base,
    lifecycle: "caller-promoted"
  }), /lifecycle/);
  assert.throws(() => contracts.assertResourceContract({
    ...base,
    freshness: { ...base.freshness, state: "unknown" }
  }), /freshness\.state/);
  assert.throws(() => contracts.assertResourceContract({
    ...base,
    eligibility: { eligible: false, reasons: [] }
  }), /ineligible resources must provide at least one eligibility reason/);
  assert.throws(() => contracts.assertResourceContract({
    ...base,
    freshness: {
      state: "current",
      evidencePath: null,
      contentDigest: null
    }
  }), /freshness\.current requires evidencePath and contentDigest/);
});

function canonicalAgent(overrides = {}) {
  return {
    name: "architect-agent",
    status: ["approved"],
    nativeCodexAgentName: "architect-agent",
    runtimeFiles: {
      tomlPath: ".codex/agents/architect-agent.toml",
      tomlPresent: true
    },
    deliveryKernel: {
      canonicalCompetencies: ["architecture", "implementation"],
      eligibleRoles: ["lead"],
      measuredContextCost: 3000,
      contextCostMeasurement: "ceil(source-character-count/4)",
      authority: "internal-reviewed",
      lifecycle: "active",
      environmentRestrictions: {
        allowed: ["codex-project-runtime"],
        forbidden: []
      }
    },
    ...overrides
  };
}

function canonicalSkill(overrides = {}) {
  return {
    name: "code-quality",
    status: ["active"],
    skillPath: "skills/code-quality/SKILL.md",
    deliveryKernel: {
      canonicalCompetencies: ["implementation", "testing", "verification"],
      eligibleRoles: ["support"],
      measuredContextCost: 1800,
      contextCostMeasurement: "ceil(source-character-count/4)",
      authority: "internal-reviewed",
      lifecycle: "active",
      environmentRestrictions: {
        allowed: ["codex-project-runtime"],
        forbidden: []
      }
    },
    ...overrides
  };
}

function approvedTool(overrides = {}) {
  return {
    id: "project-tests",
    repository: "example/project-tests",
    category: "testing",
    lane: "verification",
    activationStatus: "approved-project-owned",
    enterpriseRisk: {
      reviewState: "reviewed",
      lastReviewedDate: "2026-07-01",
      allowedEnvironments: ["codex-project-runtime"],
      forbiddenEnvironments: []
    },
    ...overrides
  };
}

test("resource catalog uses canonical registry competencies and trusted internal inspection", () => {
  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: { schemaVersion: "1.0.0", agents: [canonicalAgent()] },
    skillsRegistry: { schemaVersion: "1.0.0", skills: [canonicalSkill()] },
    toolsRegistry: { schemaVersion: "1.0.0", tools: [approvedTool()] }
  });

  assert.equal(catalog.length, 3);
  const agent = catalog.find((resource) => resource.id === "architect-agent");
  assert.deepEqual(agent.canonicalCompetencies, ["architecture", "implementation"]);
  assert.deepEqual(agent.eligibleRoles, ["lead"]);
  assert.equal(agent.runtimePosture.registryPresent, true);
  assert.equal(agent.runtimePosture.available, true);
  assert.equal(agent.runtimePosture.executionProof, false);
  assert.equal(Object.hasOwn(agent, "teamRole"), false);

  const skill = catalog.find((resource) => resource.id === "code-quality");
  assert.deepEqual(skill.canonicalCompetencies, ["implementation", "testing", "verification"]);
  assert.equal(skill.runtimePosture.available, true);
  assert.equal(skill.contextMeasurement.method, "conservative-token-estimate");

  const tool = catalog.find((resource) => resource.id === "project-tests");
  assert.equal(tool.eligibility.eligible, false);
  assert.ok(tool.eligibility.reasons.includes("trusted-capability-inspector-unavailable"));
  assert.equal(tool.runtimePosture.available, false);
  assert.equal(tool.commandReference, null);
  assert.equal(Object.hasOwn(tool, "command"), false);
  assert.doesNotThrow(() => contracts.assertResourceContract(tool));
});

test("canonical agent and skill registries own delivery-kernel competencies, roles, and measured context costs", async () => {
  const [agentsRegistry, skillsRegistry] = await Promise.all([
    readFile(new URL("../registries/agents.registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../registries/skills.registry.json", import.meta.url), "utf8").then(JSON.parse)
  ]);

  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry,
    skillsRegistry,
    toolsRegistry: { schemaVersion: "1.0.0", tools: [] }
  });

  assert.equal(catalog.length, agentsRegistry.agents.length + skillsRegistry.skills.length);
  assert.ok(catalog.every((resource) => resource.canonicalCompetencies.length > 0));
  assert.ok(catalog.every((resource) => resource.eligibleRoles.length > 0));
  assert.ok(catalog.every((resource) => Number.isInteger(resource.measuredContextCost)));
  assert.ok(catalog.find((resource) => resource.id === "architect-agent")?.eligibleRoles.includes("lead"));
  assert.ok(catalog.find((resource) => resource.id === "reviewer-agent")?.eligibleRoles.includes("verifier"));
});

test("every canonical DomainGate has an executable owner or qualified verification producer path", async () => {
  const [agentsRegistry, skillsRegistry, domainRegistry] = await Promise.all([
    readFile(new URL("../registries/agents.registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../registries/skills.registry.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../registries/domain-packs.registry.json", import.meta.url), "utf8").then(JSON.parse)
  ]);
  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry,
    skillsRegistry,
    toolsRegistry: { schemaVersion: "1.0.0", tools: [] }
  });
  const agents = catalog.filter((resource) => resource.type === "agent");
  for (const pack of domainRegistry.packs) {
    for (const gate of pack.gates) {
      if (gate.verifierKinds.includes("owner-review")) continue;
      const producers = agents.filter((resource) => (
        resource.eligibleRoles.some((role) => role === "specialist" || role === "verifier")
        && (resource.verificationCapabilities ?? []).some((kind) => gate.verifierKinds.includes(kind))
      ));
      assert.ok(
        producers.length > 0,
        `${pack.id}/${gate.id} has no qualified verification producer`
      );
    }
  }
  const independentGate = domainRegistry.packs
    .flatMap((pack) => pack.gates)
    .find((gate) => gate.id === "enterprise-independent-verification");
  assert.ok(agents.some((resource) => (
    resource.eligibleRoles.includes("verifier")
    && resource.verificationCapabilities.some((kind) => independentGate.verifierKinds.includes(kind))
  )));
});

test("CodeQL, TruffleHog, and canonical metadata-only tools remain ineligible without trusted inspection", async () => {
  const registry = JSON.parse(await readFile(new URL("../registries/tools.registry.json", import.meta.url), "utf8"));
  const tools = registry.tools.filter((tool) => ["codeql", "trufflehog", "typescript"].includes(tool.id));
  assert.deepEqual(tools.map((tool) => tool.id).sort(), ["codeql", "trufflehog", "typescript"]);

  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: { schemaVersion: "1.0.0", agents: [] },
    skillsRegistry: { schemaVersion: "1.0.0", skills: [] },
    toolsRegistry: { schemaVersion: "1.0.0", tools }
  });

  assert.equal(catalog.length, 3);
  for (const resource of catalog) {
    assert.equal(resource.eligibility.eligible, false);
    assert.ok(resource.eligibility.reasons.includes("registry-metadata-only"));
    assert.ok(resource.eligibility.reasons.includes("trusted-capability-inspector-unavailable"));
    assert.equal(resource.runtimePosture.available, false);
    assert.equal(resource.commandReference, null);
  }
});

test("non-date registry review sentinels remain explicitly ineligible", () => {
  const [resource] = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: { schemaVersion: "1.0.0", agents: [] },
    skillsRegistry: { schemaVersion: "1.0.0", skills: [] },
    toolsRegistry: {
      schemaVersion: "1.0.0",
      tools: [approvedTool({
        enterpriseRisk: {
          reviewState: "reviewed",
          lastReviewedDate: "unknown",
          allowedEnvironments: ["codex-project-runtime"],
          forbiddenEnvironments: []
        }
      })]
    }
  });

  assert.equal(resource.eligibility.eligible, false);
  assert.ok(resource.eligibility.reasons.includes("registry-review-date-invalid"));
  assert.ok(resource.eligibility.reasons.includes("trusted-capability-inspector-unavailable"));
});

test("owner-review-required and forbidden-environment registry policy remain ineligible", () => {
  const tools = [
    approvedTool({
      id: "owner-review",
      enterpriseRisk: {
        reviewState: "metadata-only-owner-review-required",
        lastReviewedDate: "2026-07-01",
        allowedEnvironments: ["codex-project-runtime"],
        forbiddenEnvironments: []
      }
    }),
    approvedTool({
      id: "forbidden-runtime",
      enterpriseRisk: {
        reviewState: "reviewed",
        lastReviewedDate: "2026-07-01",
        allowedEnvironments: [],
        forbiddenEnvironments: ["codex-project-runtime"]
      }
    })
  ];
  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: { schemaVersion: "1.0.0", agents: [] },
    skillsRegistry: { schemaVersion: "1.0.0", skills: [] },
    toolsRegistry: { schemaVersion: "1.0.0", tools }
  });

  assert.ok(catalog.find((resource) => resource.id === "owner-review")
    .eligibility.reasons.includes("registry-owner-review-required"));
  assert.ok(catalog.find((resource) => resource.id === "forbidden-runtime")
    .eligibility.reasons.includes("environment-forbidden"));
});

test("internal environment restrictions and unavailable external inspectors fail closed", () => {
  const restrictedAgent = canonicalAgent({
    deliveryKernel: {
      ...canonicalAgent().deliveryKernel,
      environmentRestrictions: {
        allowed: ["ci"],
        forbidden: ["codex-project-runtime"]
      }
    }
  });
  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: { schemaVersion: "1.0.0", agents: [restrictedAgent] },
    skillsRegistry: { schemaVersion: "1.0.0", skills: [] },
    toolsRegistry: { schemaVersion: "1.0.0", tools: [approvedTool()] }
  });

  const agent = catalog.find((resource) => resource.id === "architect-agent");
  assert.equal(agent.eligibility.eligible, false);
  assert.ok(agent.eligibility.reasons.includes("environment-forbidden"));
  const tool = catalog.find((resource) => resource.id === "project-tests");
  assert.equal(tool.eligibility.eligible, false);
  assert.ok(tool.eligibility.reasons.includes("trusted-capability-inspector-unavailable"));
  assert.equal(tool.commandReference, null);
});

test("delivery planning preserves the governed request and derives gate evidence without caller overrides", async () => {
  const request = pinRequestToCurrentRepositoryCommit(validRequest(), ROOT);
  request.contextPolicy.mode = "detailed";

  const plan = await planDeliveryRun({ request }, { invocationRoot: ROOT });

  assert.deepEqual(plan.request, request);
  assert.deepEqual(plan.task.scope, request.task.scope);
  assert.deepEqual(plan.task.exclusions, request.task.exclusions);
  assert.deepEqual(plan.task.constraints, request.task.constraints);
  assert.deepEqual(plan.task.authorizedActions, request.task.authorizedActions);
  assert.deepEqual(plan.task.acceptanceCriteria, request.task.acceptanceCriteria);
  assert.deepEqual(plan.repository, request.repository);
  assert.deepEqual(plan.contextPolicy, request.contextPolicy);
  assert.equal(plan.context.tokenBudget, Math.floor(128000 * 0.35));
  assert.ok(plan.context.items.length > 0);
  assert.equal(plan.context.items.some((item) => item.kind === "instruction"), true);
  assert.equal(plan.projectInspection.verifiedCommit, request.repository.expectedCommit);
  assert.equal(plan.projectInspection.inspectionMode, "read-only");
  assert.equal(plan.projectInspection.observedEnvironmentCapabilities.includes("node"), true);
  assert.ok(plan.requiredGateIds.includes("enterprise-product-acceptance"));
  assert.ok(plan.requiredGateIds.includes("web-wcag-22-aa"));
  assert.ok(plan.requiredGateIds.includes("focused-tests"));
  assert.equal(new Set(plan.requiredGateIds).size, plan.requiredGateIds.length);
  assert.deepEqual(plan.evidence.unverifiedRequiredChecks, plan.requiredGateIds);
});

test("delivery planning rejects a repository commit that was not observed", async () => {
  const request = validRequest();
  request.contextPolicy.mode = "detailed";
  request.repository.expectedCommit = "f".repeat(40);
  await assert.rejects(
    planDeliveryRun({ request }, { invocationRoot: ROOT }),
    /repository HEAD .* does not match expectedCommit/
  );
});
