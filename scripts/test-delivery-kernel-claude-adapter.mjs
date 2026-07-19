#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import { buildClaudeExecutionPlan } from "./ai-toolkit/kernel/claude-adapter.mjs";
import {
  loadDomainRegistry,
  resolveDomainSelection
} from "./ai-toolkit/kernel/domain-packs.mjs";
import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import {
  buildBlockedExecutionWavePlan,
  buildExecutionWavePlan
} from "./ai-toolkit/kernel/team-planner.mjs";
import {
  readPinnedDeliveryRequest,
  TEST_REPOSITORY_ROOT
} from "./test-support/live-repository-fixture.mjs";

const DIGEST = "c".repeat(64);

function contextItem(id = "constraints", source = "AGENTS.md", agentIds = []) {
  return {
    id,
    kind: "instruction",
    source,
    provenance: { type: "repository-regular-file", path: source },
    originAttestation: { status: "verified", type: "repository-regular-file" },
    contentTrust: "untrusted-repository-data",
    instructionAuthority: {
      classification: "candidate-repository-instruction",
      mayOverrideSystemPolicy: false
    },
    sensitivity: "repository-internal",
    contentHash: DIGEST,
    utf8Bytes: 3,
    tokenEstimate: 1,
    agentIds
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function governedTask(overrides = {}) {
  return {
    id: "TASK-CLAUDE-1",
    goal: "Emit a bounded Claude Code recommendation",
    scenario: "large-governed-implementation",
    risk: "medium",
    scope: ["scripts/ai-toolkit/kernel", "scripts/test-delivery-kernel-claude-adapter.mjs"],
    exclusions: ["deployment"],
    constraints: ["preserve existing user work"],
    targets: { platforms: ["web-saas"], frameworkOverlays: [] },
    authorizedActions: ["repository-read", "project-validation"],
    acceptanceCriteria: [{
      id: "AC-CLAUDE-1",
      statement: "The projection remains recommendations-only.",
      requiredGateIds: ["focused-tests"]
    }],
    gates: ["focused-tests"],
    ...overrides
  };
}

function resource({ id, type = "agent", eligibleRoles, competencies, nativeId = id }) {
  const isAgent = type === "agent";
  const isTool = type === "tool";
  return {
    schemaVersion: "1.0.0",
    id,
    type,
    canonicalCompetencies: competencies ?? [isAgent ? "implementation" : "verification"],
    eligibleRoles: eligibleRoles ?? (isAgent ? ["specialist"] : ["support"]),
    measuredContextCost: 1,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: 3,
      evidencePath: "scripts/test-delivery-kernel-claude-adapter.mjs",
      contentDigest: DIGEST
    },
    authority: "internal-reviewed",
    lifecycle: "active",
    runtimePosture: {
      registryPresent: true,
      available: true,
      supported: true,
      executionProof: false,
      sandboxMode: isAgent ? "read-only" : "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: { allowed: ["codex-project-runtime"], forbidden: [] },
    detectionEvidence: {
      state: "observed",
      evidencePath: "scripts/test-delivery-kernel-claude-adapter.mjs",
      contentDigest: DIGEST
    },
    freshness: {
      state: "current",
      evidencePath: "scripts/test-delivery-kernel-claude-adapter.mjs",
      contentDigest: DIGEST
    },
    nativeAdapter: {
      kind: isAgent ? "codex-agent" : type === "skill" ? "codex-skill" : "project-script",
      id: nativeId
    },
    commandReference: isTool ? {
      kind: "project-script",
      manifestPath: "package.json",
      scriptName: "test",
      digest: DIGEST
    } : null,
    eligibility: { eligible: true, reasons: [] }
  };
}

function assignment({ id, agentId, role, wave, dependencies = [] }) {
  return {
    id,
    agentId,
    role,
    wave,
    responsibility: `${role} responsibility`,
    ownership: { mode: "read-only", ownedPaths: [] },
    dependencies,
    stopConditionRefs: ["stop:scope-change"],
    evidenceRefs: ["evidence:focused-tests"],
    contextRefs: ["context:bounded-task-bundle"]
  };
}

async function plannedFixture() {
  const task = governedTask();
  const registry = await loadDomainRegistry();
  const domainPack = resolveDomainSelection({
    registry,
    task,
    environmentCapabilities: ["node", "browser"]
  });
  const selectedResources = [
    resource({ id: "architect-agent", eligibleRoles: ["lead"] }),
    resource({ id: "frontend-agent", eligibleRoles: ["specialist"] }),
    resource({ id: "code-quality", type: "skill" }),
    resource({ id: "project-tests", type: "tool" })
  ];
  const team = buildExecutionWavePlan({
    task,
    resolvedGateIds: [...new Set([
      ...domainPack.resolvedGateIds,
      ...task.gates
    ])],
    selectedResources,
    domainSelection: domainPack,
    trustedAssignmentIntents: [
      assignment({
        id: "A-CLAUDE-LEAD",
        agentId: "architect-agent",
        role: "lead",
        wave: 10
      }),
      assignment({
        id: "A-CLAUDE-FRONTEND",
        agentId: "frontend-agent",
        role: "specialist",
        wave: 20,
        dependencies: ["A-CLAUDE-LEAD"]
      })
    ]
  });
  return { task, domainPack, selectedResources, team };
}

test("Claude adapter emits canonical bounded recommendations with immutable governed handoffs", async () => {
  const fixture = await plannedFixture();
  const plan = buildClaudeExecutionPlan({
    ...fixture,
    context: { items: [contextItem()] }
  });

  assert.equal(plan.schemaVersion, "1.0.0");
  assert.equal(plan.adapter, "claude-code");
  assert.equal(plan.recommendationMode, "recommendations-only");
  assert.equal(plan.executionStatus, "recommendations-only");
  assert.equal(plan.runtimeAvailability, "unverified");
  assert.equal(plan.runtimeAvailabilityProof, null);
  assert.equal(plan.configurationMutation, null);
  assert.equal(plan.permissionMutation, null);
  assert.equal(plan.actualSpawnProof, null);
  assert.equal(plan.actualExecutionProof, null);
  assert.equal(plan.actualInvocationProof, null);
  assert.equal(plan.actualToolOutput, null);
  assert.equal(plan.receiptProof, null);
  assert.deepEqual(plan.selectedResourceIds, [
    "architect-agent",
    "frontend-agent",
    "code-quality",
    "project-tests"
  ]);
  assert.deepEqual(plan.recommendedSubagentIds, ["architect-agent", "frontend-agent"]);
  assert.deepEqual(plan.requiredSkillIds, ["code-quality"]);
  assert.deepEqual(plan.supportToolIds, ["project-tests"]);
  assert.deepEqual(plan.waves.map((wave) => wave.order), [10, 20]);
  assert.deepEqual(plan.waves.map((wave) => wave.assignmentIds), [
    ["A-CLAUDE-LEAD"],
    ["A-CLAUDE-FRONTEND"]
  ]);
  assert.strictEqual(
    plan.assignments[0].governedEnvelope,
    fixture.team.assignments[0].governedEnvelope
  );
  assert.deepEqual(plan.handoffs.map((handoff) => ({
    fromAgentId: handoff.fromAgentId,
    toAgentId: handoff.toAgentId,
    status: handoff.status
  })), [{
    fromAgentId: "architect-agent",
    toAgentId: "frontend-agent",
    status: "planned"
  }]);
  assert.strictEqual(
    plan.handoffs[0].governedEnvelope,
    fixture.team.assignments[0].governedEnvelope
  );
  assert.equal(plan.handoffs[0].executionProof, null);
  assert.equal(plan.handoffs[0].receiptProof, null);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.assignments));
  assert.ok(Object.isFrozen(plan.handoffs));
  assert.equal(JSON.stringify(plan).includes("npm test"), false);
});

test("Claude adapter rejects non-canonical resource identities", async () => {
  const fixture = await plannedFixture();
  assert.throws(
    () => buildClaudeExecutionPlan({
      ...fixture,
      selectedResources: [
        ...fixture.selectedResources,
        { id: "forged resource", type: "skill" }
      ],
      context: { items: [] }
    }),
    /canonical resource id/
  );
});

test("Claude adapter rejects fabricated frozen domain readiness and execution waves", async () => {
  const fixture = await plannedFixture();
  const forgedDomain = deepFreeze({
    ...structuredClone(fixture.domainPack),
    platformVerification: true,
    releaseReadiness: true
  });
  assert.throws(
    () => buildClaudeExecutionPlan({
      ...fixture,
      domainPack: forgedDomain,
      context: { items: [] }
    }),
    /invalid DomainSelectionResult v1/
  );

  const forgedTeam = deepFreeze(structuredClone(fixture.team));
  assert.throws(
    () => buildClaudeExecutionPlan({
      ...fixture,
      team: forgedTeam,
      context: { items: [] }
    }),
    /validated planner-created execution wave plan/
  );
});

test("Claude adapter preserves blocked plans without assignments or proof", async () => {
  const task = governedTask({ id: "TASK-CLAUDE-BLOCKED" });
  const registry = await loadDomainRegistry();
  const domainPack = resolveDomainSelection({
    registry,
    task,
    environmentCapabilities: []
  });
  const team = buildBlockedExecutionWavePlan({
    task,
    blockers: ["competency-uncovered:web-accessibility"],
    domainSelection: domainPack
  });
  const plan = buildClaudeExecutionPlan({
    task,
    selectedResources: [],
    team,
    context: { items: [] },
    domainPack
  });

  assert.equal(plan.executionStatus, "blocked");
  assert.deepEqual(plan.blockers, [
    "competency-uncovered:web-accessibility",
    "domain-gate-blocked:web-wcag-22-aa",
    "domain-gate-blocked:web-browser-interaction",
    "domain-gate-blocked:web-runtime-security-quality"
  ]);
  assert.deepEqual(plan.waves, []);
  assert.deepEqual(plan.assignments, []);
  assert.deepEqual(plan.handoffs, []);
  assert.equal(plan.actualSpawnProof, null);
  assert.equal(plan.actualExecutionProof, null);
  assert.equal(plan.actualInvocationProof, null);
  assert.equal(plan.actualToolOutput, null);
  assert.equal(plan.receiptProof, null);
});

test("public delivery plans include the Claude recommendations-only projection", async () => {
  const request = await readPinnedDeliveryRequest(
    new URL("../templates/delivery-kernel.request.example.json", import.meta.url),
  );
  const plan = await planDeliveryRun({ request }, { invocationRoot: TEST_REPOSITORY_ROOT });

  assert.equal(plan.claude.adapter, "claude-code");
  assert.equal(plan.claude.taskId, plan.task.id);
  assert.equal(plan.claude.recommendationMode, "recommendations-only");
  assert.equal(plan.claude.runtimeAvailability, "unverified");
  assert.equal(plan.claude.configurationMutation, null);
  assert.equal(plan.claude.permissionMutation, null);
  assert.equal(plan.claude.actualInvocationProof, null);
  assert.equal(plan.claude.actualToolOutput, null);
});
