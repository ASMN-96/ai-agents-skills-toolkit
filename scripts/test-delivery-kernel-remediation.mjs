#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertDeliveryRequest, assertResourceContract } from "./ai-toolkit/kernel/contracts.mjs";
import { buildContextBundle } from "./ai-toolkit/kernel/context-memory.mjs";
import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { loadDomainPacks } from "./ai-toolkit/kernel/domain-packs.mjs";
import * as resourceCatalog from "./ai-toolkit/kernel/resource-catalog.mjs";
import { runDeliveryKernelCli } from "./ai-toolkit/run-delivery-kernel.mjs";
import { pinRequestToCurrentRepositoryCommit } from "./test-support/live-repository-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCENARIOS = ["large-governed-implementation"];
const DIGEST = "a".repeat(64);
const SYNTHETIC_REPOSITORY_COMMIT = "a".repeat(40);

function validRequest() {
  return {
    schemaVersion: "1.0.0",
    task: {
      id: "TASK-REMEDIATION",
      goal: "Close the rejected delivery-kernel contracts",
      scenario: "large-governed-implementation",
      scope: ["scripts/ai-toolkit/kernel"],
      exclusions: ["deployment"],
      constraints: ["preserve existing work"],
      risk: "medium",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] },
      authorizedActions: ["repository-read", "scoped-local-write", "project-validation"],
      acceptanceCriteria: [{
        id: "AC-1",
        statement: "Focused tests pass.",
        requiredGateIds: ["focused-tests"]
      }],
      competencies: ["implementation", "verification"],
      gates: ["focused-tests"]
    },
    repository: { root: ".", expectedCommit: SYNTHETIC_REPOSITORY_COMMIT },
    contextPolicy: { mode: "standard", modelWindowTokens: 128000, maxInputFraction: 0.35 }
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

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function kernelMetadata(contents, overrides = {}) {
  return {
    canonicalCompetencies: ["implementation", "verification"],
    eligibleRoles: ["lead"],
    measuredContextCost: Math.ceil(Buffer.byteLength(contents, "utf8") / 3),
    contextCostMeasurement: "conservative-token-estimate",
    authority: "internal-reviewed",
    lifecycle: "active",
    environmentRestrictions: {
      allowed: ["codex-project-runtime"],
      forbidden: []
    },
    ...overrides
  };
}

function fixtureRepository(t) {
  const root = mkdtempSync(path.join(tmpdir(), "delivery-kernel-remediation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const agentContents = "name = \"é🙂\"\nsandbox_mode = \"read-only\"\n";
  const skillContents = "# Quality\n\nVerify behavior.\n";
  mkdirSync(path.join(root, ".codex", "agents"), { recursive: true });
  mkdirSync(path.join(root, "skills", "code-quality"), { recursive: true });
  writeFileSync(path.join(root, ".codex", "agents", "architect-agent.toml"), agentContents, "utf8");
  writeFileSync(path.join(root, "skills", "code-quality", "SKILL.md"), skillContents, "utf8");

  const agentsRegistry = {
    schemaVersion: "1.0.0",
    agents: [{
      name: "architect-agent",
      status: ["approved"],
      nativeCodexAgentName: "architect-agent",
      runtimeFiles: {
        tomlPath: ".codex/agents/architect-agent.toml",
        tomlPresent: true
      },
      deliveryKernel: kernelMetadata(agentContents)
    }]
  };
  const skillsRegistry = {
    schemaVersion: "1.0.0",
    skills: [{
      name: "code-quality",
      status: ["active"],
      skillPath: "skills/code-quality/SKILL.md",
      deliveryKernel: kernelMetadata(skillContents, { eligibleRoles: ["support"] })
    }]
  };
  const toolsRegistry = {
    schemaVersion: "1.0.0",
    tools: [{
      id: "syntax-only-tool",
      repository: "example/tool",
      category: "testing",
      lane: "verification",
      activationStatus: "approved-project-owned",
      detection: { state: "syntax-only" },
      enterpriseRisk: {
        reviewState: "reviewed",
        lastReviewedDate: "2026-07-01",
        allowedEnvironments: ["local"],
        forbiddenEnvironments: []
      }
    }]
  };
  return {
    root,
    agentContents,
    agentsRegistry,
    skillsRegistry,
    toolsRegistry
  };
}

test("DeliveryRequest v1 rejects caller context and closes context mode", () => {
  assert.throws(
    () => assertDeliveryRequest(
      { ...validRequest(), contextItems: [] },
      { registeredScenarios: SCENARIOS }
    ),
    /request\.contextItems is not allowed by the v1 contract/
  );

  for (const mode of ["focused", "verbose", ""]) {
    const request = validRequest();
    request.contextPolicy.mode = mode;
    assert.throws(
      () => assertDeliveryRequest(request, { registeredScenarios: SCENARIOS }),
      /contextPolicy\.mode must be one of: concise, standard, detailed/
    );
  }
});

test("DeliveryRequest v1 distinguishes missing schema from the known flat prototype", () => {
  const missingSchema = validRequest();
  delete missingSchema.schemaVersion;
  assert.throws(
    () => assertDeliveryRequest(missingSchema, { registeredScenarios: SCENARIOS }),
    (error) => error?.message ===
      "invalid DeliveryRequest v1: schemaVersion is required and must be exactly 1.0.0"
  );

  assert.throws(
    () => assertDeliveryRequest({
      id: "TASK-OLD",
      goal: "Old flat request",
      platform: "web-saas",
      detectedTools: ["codeql"],
      projectCommands: { codeql: "codeql database analyze" },
      requiredEvidence: ["tests"]
    }, { registeredScenarios: SCENARIOS }),
    /DeliveryRequest v1 migration required/
  );
});

test("DeliveryRequest v1 accepts only canonical POSIX repository-relative roots", () => {
  const invalidRoots = [
    "C:foo",
    "C:/foo",
    "https://example.test/repo",
    "scheme:value",
    "\\\\server\\repo",
    "src\\feature",
    "src//feature",
    "src/./feature",
    "src/../feature",
    "src/",
    "/repo",
    "repo\0child",
    " repo"
  ];
  for (const root of invalidRoots) {
    const request = validRequest();
    request.repository.root = root;
    assert.throws(
      () => assertDeliveryRequest(request, { registeredScenarios: SCENARIOS }),
      /repository\.root must be a canonical POSIX repository-relative path/
    );
  }
  for (const root of [".", "src", "src/feature-name"]) {
    const request = validRequest();
    request.repository.root = root;
    assert.doesNotThrow(
      () => assertDeliveryRequest(request, { registeredScenarios: SCENARIOS })
    );
  }
});

test("DeliveryRequest v1 requires plain records with own required properties", () => {
  const inheritedRequest = Object.assign(
    Object.create({ schemaVersion: "1.0.0" }),
    validRequest()
  );
  delete inheritedRequest.schemaVersion;
  assert.throws(
    () => assertDeliveryRequest(inheritedRequest, { registeredScenarios: SCENARIOS }),
    /request must be a plain own-property record/
  );

  const request = validRequest();
  request.task = Object.create(request.task);
  assert.throws(
    () => assertDeliveryRequest(request, { registeredScenarios: SCENARIOS }),
    /task must be a plain own-property record/
  );
});

test("criterion gates resolve from policy plus additive stable task gates", () => {
  const request = validRequest();
  request.task.gates = ["task-smoke"];
  request.task.acceptanceCriteria[0].requiredGateIds = ["policy-tests", "task-smoke"];
  assert.doesNotThrow(() => assertDeliveryRequest(request, {
    registeredScenarios: SCENARIOS,
    policyGateIds: ["policy-tests"]
  }));

  request.task.acceptanceCriteria[0].requiredGateIds.push("unknown-gate");
  assert.throws(() => assertDeliveryRequest(request, {
    registeredScenarios: SCENARIOS,
    policyGateIds: ["policy-tests"]
  }), /requiredGateIds\[2\].*not registered by policy or task gates/);

  request.task.acceptanceCriteria[0].requiredGateIds = ["Bad Gate"];
  assert.throws(() => assertDeliveryRequest(request, {
    registeredScenarios: SCENARIOS,
    policyGateIds: ["policy-tests"]
  }), /stable lowercase kebab-case gate ID/);
});

test("ResourceContract v1 closes top-level and nested allowlists", () => {
  assert.throws(
    () => assertResourceContract({ ...validResource(), competencies: ["testing"] }),
    /competencies is not allowed/
  );
  assert.throws(
    () => assertResourceContract({
      ...validResource(),
      runtimePosture: { ...validResource().runtimePosture, syntaxOnly: true }
    }),
    /runtimePosture\.syntaxOnly is not allowed/
  );
  assert.throws(
    () => assertResourceContract({
      ...validResource(),
      detectionEvidence: {
        ...validResource().detectionEvidence,
        observedAt: "2026-07-16T00:00:00.000Z"
      }
    }),
    /detectionEvidence\.observedAt is not allowed/
  );
  assert.throws(
    () => assertResourceContract({ ...validResource(), command: "npm test" }),
    /raw command strings are forbidden/
  );
});

test("ResourceContract v1 rejects contradictory eligible and unexplained ineligible states", () => {
  const contradictions = [
    { lifecycle: "stale" },
    { runtimePosture: { ...validResource().runtimePosture, registryPresent: false } },
    { runtimePosture: { ...validResource().runtimePosture, available: false } },
    { runtimePosture: { ...validResource().runtimePosture, supported: false } },
    { runtimePosture: { ...validResource().runtimePosture, executionProof: true } },
    { detectionEvidence: { state: "absent", evidencePath: null, contentDigest: null } },
    { freshness: { state: "stale", evidencePath: "package.json", contentDigest: DIGEST } },
    { eligibility: { eligible: true, reasons: ["contradiction"] } }
  ];
  for (const override of contradictions) {
    assert.throws(
      () => assertResourceContract(validResource(override)),
      /invalid ResourceContract v1/
    );
  }

  assert.throws(() => assertResourceContract(validResource({
    lifecycle: "quarantined",
    measuredContextCost: 0,
    contextMeasurement: null,
    runtimePosture: {
      registryPresent: true,
      available: false,
      supported: false,
      executionProof: false,
      sandboxMode: "not-applicable",
      scopedLocalWrite: false
    },
    detectionEvidence: { state: "absent", evidencePath: null, contentDigest: null },
    freshness: { state: "absent", evidencePath: null, contentDigest: null },
    commandReference: null,
    eligibility: { eligible: false, reasons: [] }
  })), /ineligible resources must provide at least one eligibility reason/);
});

test("ResourceContract v1 validates byte measurement and structured command references", () => {
  assert.doesNotThrow(() => assertResourceContract(validResource()));
  assert.throws(
    () => assertResourceContract(validResource({ commandReference: "project-script:test" })),
    /commandReference must be null or a structured project-script reference/
  );
  assert.throws(
    () => assertResourceContract(validResource({
      commandReference: {
        kind: "project-script",
        manifestPath: "../package.json",
        scriptName: "test",
        digest: DIGEST
      }
    })),
    /commandReference\.manifestPath/
  );
  assert.throws(
    () => assertResourceContract(validResource({
      commandReference: {
        kind: "project-script",
        manifestPath: "package.json",
        scriptName: "test",
        digest: "not-sha256"
      }
    })),
    /commandReference\.digest/
  );
  assert.throws(
    () => assertResourceContract(validResource({ measuredContextCost: 3 })),
    /ceil\(contextMeasurement\.utf8Bytes \/ 3\)/
  );
});

test("internal capability inspection records deterministic regular-file sha256 and byte evidence", (t) => {
  assert.equal(typeof resourceCatalog.inspectInternalCapabilities, "function");
  const fixture = fixtureRepository(t);
  const input = {
    repositoryRoot: fixture.root,
    agentsRegistry: fixture.agentsRegistry,
    skillsRegistry: fixture.skillsRegistry
  };
  const first = resourceCatalog.inspectInternalCapabilities(input);
  const second = resourceCatalog.inspectInternalCapabilities(input);
  assert.deepEqual(first, second);

  const agent = first.find((entry) => entry.resourceId === "architect-agent");
  assert.equal(agent.state, "available");
  assert.equal(agent.evidencePath, ".codex/agents/architect-agent.toml");
  assert.equal(agent.contentDigest, sha256(fixture.agentContents));
  assert.equal(agent.utf8Bytes, Buffer.byteLength(fixture.agentContents, "utf8"));
  assert.equal(
    agent.measuredContextCost,
    Math.ceil(Buffer.byteLength(fixture.agentContents, "utf8") / 3)
  );
  assert.equal(agent.measurementMethod, "conservative-token-estimate");

  const invalid = structuredClone(fixture.agentsRegistry);
  invalid.agents[0].runtimeFiles.tomlPath = ".codex/agents";
  assert.throws(
    () => resourceCatalog.inspectInternalCapabilities({
      repositoryRoot: fixture.root,
      agentsRegistry: invalid,
      skillsRegistry: fixture.skillsRegistry
    }),
    /regular file/
  );
});

test("catalog eligibility requires trusted internal inspection and exposes no aliases", (t) => {
  const fixture = fixtureRepository(t);
  const catalog = resourceCatalog.buildResourceCatalog({
    repositoryRoot: fixture.root,
    agentsRegistry: fixture.agentsRegistry,
    skillsRegistry: fixture.skillsRegistry,
    toolsRegistry: fixture.toolsRegistry
  });

  const agent = catalog.find((resource) => resource.id === "architect-agent");
  const skill = catalog.find((resource) => resource.id === "code-quality");
  const tool = catalog.find((resource) => resource.id === "syntax-only-tool");
  assert.equal(agent.eligibility.eligible, true);
  assert.equal(skill.eligibility.eligible, true);
  assert.equal(agent.detectionEvidence.state, "observed");
  assert.equal(agent.freshness.state, "current");
  assert.equal(agent.runtimePosture.executionProof, false);

  const aliases = [
    "competencies",
    "contextCost",
    "runtimeAvailable",
    "runtimeSupported",
    "approvalBlocked",
    "unsafe",
    "teamRole",
    "nativeCodexAgentName",
    "skillName",
    "toolId"
  ];
  for (const alias of aliases) {
    assert.equal(
      Object.hasOwn(agent, alias) ||
        Object.hasOwn(skill, alias) ||
        Object.hasOwn(tool, alias),
      false,
      alias
    );
  }

  assert.equal(tool.eligibility.eligible, false);
  assert.ok(tool.eligibility.reasons.includes("trusted-capability-inspector-unavailable"));
  assert.equal(tool.commandReference, null);
});

test("catalog rejects malformed registries, duplicate IDs, and injected evidence", (t) => {
  const fixture = fixtureRepository(t);
  const input = {
    repositoryRoot: fixture.root,
    agentsRegistry: fixture.agentsRegistry,
    skillsRegistry: fixture.skillsRegistry,
    toolsRegistry: fixture.toolsRegistry
  };

  assert.throws(() => resourceCatalog.buildResourceCatalog({
    ...input,
    agentsRegistry: {
      schemaVersion: "1.0.0",
      agents: [
        ...fixture.agentsRegistry.agents,
        structuredClone(fixture.agentsRegistry.agents[0])
      ]
    }
  }), /duplicate resource id: architect-agent/);

  assert.throws(() => resourceCatalog.buildResourceCatalog({
    ...input,
    skillsRegistry: {
      schemaVersion: "1.0.0",
      skills: [{ name: "broken", status: "active" }]
    }
  }), /invalid skill registry record broken/);

  assert.throws(() => resourceCatalog.buildResourceCatalog({
    ...input,
    capabilityEvidence: [{ resourceId: "syntax-only-tool", state: "available" }]
  }), /caller-injected capabilityEvidence is forbidden/);

  assert.throws(() => resourceCatalog.buildResourceCatalog({
    ...input,
    freshnessEvidence: []
  }), /caller-injected freshnessEvidence is forbidden/);

  assert.throws(() => resourceCatalog.buildResourceCatalog({
    ...input,
    now: "2026-07-16"
  }), /caller-injected now is forbidden/);
});

test("catalog requires an explicit schemaVersion on every registry envelope", (t) => {
  const fixture = fixtureRepository(t);
  const input = {
    repositoryRoot: fixture.root,
    agentsRegistry: fixture.agentsRegistry,
    skillsRegistry: fixture.skillsRegistry,
    toolsRegistry: fixture.toolsRegistry
  };

  for (const [field, label] of [
    ["agentsRegistry", "agent"],
    ["skillsRegistry", "skill"],
    ["toolsRegistry", "tool"]
  ]) {
    const registry = structuredClone(input[field]);
    delete registry.schemaVersion;
    assert.throws(
      () => resourceCatalog.buildResourceCatalog({ ...input, [field]: registry }),
      new RegExp(label + " registry schemaVersion must be exactly 1\\.0\\.0")
    );
  }
});

test("public planner rejects caller-supplied trust state", async () => {
  for (const [field, value] of [
    ["resources", []],
    ["domainPacks", []],
    ["registeredScenarios", []],
    ["routingMatrix", { schemaVersion: "1.0.0", scenarios: [] }],
    ["policyGateIds", []],
    ["environmentCapabilities", []]
  ]) {
    await assert.rejects(
      Promise.resolve().then(() => planDeliveryRun({ request: validRequest(), [field]: value })),
      new RegExp("caller-injected " + field + " is forbidden")
    );
  }
});

test("canonical policy loaders reject linked registry path components", async (t) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "delivery-kernel-linked-policy-"));
  t.after(() => rmSync(fixture, { recursive: true, force: true }));
  const target = path.join(fixture, "target");
  const linked = path.join(fixture, "linked");
  mkdirSync(target);
  writeFileSync(path.join(target, "domain-packs.registry.json"), `${JSON.stringify({
    schemaVersion: "1.0.0",
    packs: [{
      id: "linked-policy",
      lifecycle: "active",
      maturity: "preview",
      requiredEnvironment: [],
      competencies: [],
      qualityGates: ["one", "two", "three", "four", "five"]
    }]
  })}\n`, "utf8");
  symlinkSync(target, linked, process.platform === "win32" ? "junction" : "dir");

  await assert.rejects(
    loadDomainPacks(path.join(linked, "domain-packs.registry.json"), fixture),
    /linked|junction|reparse/i
  );
});

test("equivalent context bundles and plans serialize identically without timestamps", async () => {
  const bundleInput = {
    taskId: "TASK-DETERMINISTIC",
    repositoryCommit: "b".repeat(40),
    modelContextTokens: 100,
    maxInputFraction: 0.35,
    items: []
  };
  const firstBundle = buildContextBundle(bundleInput);
  const secondBundle = buildContextBundle(bundleInput);
  assert.equal(JSON.stringify(firstBundle), JSON.stringify(secondBundle));
  assert.equal(Object.hasOwn(firstBundle, "createdAt"), false);
  assert.equal(Object.hasOwn(firstBundle, "expiresAt"), false);

  const request = pinRequestToCurrentRepositoryCommit(validRequest(), ROOT);
  request.task.risk = "high";
  request.contextPolicy.mode = "detailed";
  request.task.gates = ["task-smoke"];
  request.task.acceptanceCriteria[0].requiredGateIds = ["task-smoke"];

  const first = await planDeliveryRun({ request }, { invocationRoot: ROOT });
  const second = await planDeliveryRun({ request }, { invocationRoot: ROOT });
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.ok(first.requiredGateIds.includes("enterprise-product-acceptance"));
  assert.ok(first.requiredGateIds.includes("web-wcag-22-aa"));
  assert.ok(first.requiredGateIds.includes("task-smoke"));
  assert.equal(new Set(first.requiredGateIds).size, first.requiredGateIds.length);
  assert.ok(first.context.items.length > 0);
  assert.equal(first.projectInspection.verifiedCommit, request.repository.expectedCommit);
});

test("importable CLI rejects injected capability, freshness, environment, clock, and environment capability", async () => {
  const injections = [
    ["capabilityEvidence", []],
    ["freshnessEvidence", []],
    ["environment", "local"],
    ["now", "2026-07-16"],
    ["environmentCapabilities", []]
  ];
  for (const [field, value] of injections) {
    await assert.rejects(
      runDeliveryKernelCli({ [field]: value }),
      new RegExp("caller-injected " + field + " is forbidden")
    );
  }
});

test("committed request template uses the strict request surface", async () => {
  const { readFile } = await import("node:fs/promises");
  const template = JSON.parse(await readFile(
    path.join(ROOT, "templates", "delivery-kernel.request.example.json"),
    "utf8"
  ));
  assert.equal(template.contextPolicy.mode, "detailed");
  assert.equal(Object.hasOwn(template, "contextItems"), false);
});
