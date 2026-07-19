#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildClaudeExecutionPlan } from "./ai-toolkit/kernel/claude-adapter.mjs";
import { buildCodexExecutionPlan } from "./ai-toolkit/kernel/codex-adapter.mjs";
import {
  assertDomainRegistry,
  resolveDomainSelection
} from "./ai-toolkit/kernel/domain-packs.mjs";
import {
  buildBlockedExecutionWavePlan,
  buildExecutionWavePlan
} from "./ai-toolkit/kernel/team-planner.mjs";

const DIGEST = "b".repeat(64);

function contextItem(id = "instructions", source = "AGENTS.md", agentIds = []) {
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

async function domainRegistry() {
  return assertDomainRegistry(JSON.parse(await readFile(
    new URL("../registries/domain-packs.registry.json", import.meta.url),
    "utf8"
  )));
}

function resource({
  id,
  type = "agent",
  roles = type === "agent" ? ["specialist"] : ["support"],
  nativeId = id,
  lifecycle = "active",
  available = true,
  supported = true,
  eligible = true,
  reasons = eligible ? [] : ["policy-blocked"],
  commandReference = type === "tool"
    ? {
        kind: "project-script",
        manifestPath: "package.json",
        scriptName: "test",
        digest: DIGEST
      }
    : null
}) {
  return {
    schemaVersion: "1.0.0",
    id,
    type,
    canonicalCompetencies: [type === "agent" ? "implementation" : "verification"],
    eligibleRoles: roles,
    measuredContextCost: 1,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: 3,
      evidencePath: "scripts/test-delivery-kernel-adapter-hardening.mjs",
      contentDigest: DIGEST
    },
    authority: "internal-reviewed",
    lifecycle,
    runtimePosture: {
      registryPresent: true,
      available,
      supported,
      executionProof: false,
      sandboxMode: type === "agent" ? "read-only" : "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: {
      allowed: ["codex-project-runtime"],
      forbidden: []
    },
    detectionEvidence: {
      state: "observed",
      evidencePath: "scripts/test-delivery-kernel-adapter-hardening.mjs",
      contentDigest: DIGEST
    },
    freshness: {
      state: "current",
      evidencePath: "scripts/test-delivery-kernel-adapter-hardening.mjs",
      contentDigest: DIGEST
    },
    nativeAdapter: {
      kind: type === "agent" ? "codex-agent" : type === "skill" ? "codex-skill" : "project-script",
      id: nativeId
    },
    commandReference,
    eligibility: { eligible, reasons }
  };
}

function task(overrides = {}) {
  return {
    id: "TASK-ADAPTER-HARDENING",
    goal: "Harden execution adapter trust boundaries",
    scenario: "large-governed-implementation",
    risk: "medium",
    scope: ["scripts/ai-toolkit/kernel"],
    exclusions: ["deployment"],
    constraints: ["do not change permissions"],
    targets: { platforms: ["web-saas"], frameworkOverlays: [] },
    authorizedActions: ["repository-read", "project-validation"],
    acceptanceCriteria: [{
      id: "AC-ADAPTER-1",
      statement: "Adapters reject untrusted resource state.",
      requiredGateIds: ["focused-tests"]
    }],
    gates: ["focused-tests"],
    ...overrides
  };
}

function assignment({ id, agentId, role, wave, dependencies = [] }) {
  return {
    id,
    agentId,
    role,
    wave,
    responsibility: `${role} delivery responsibility`,
    ownership: { mode: "read-only", ownedPaths: [] },
    dependencies,
    stopConditionRefs: ["stop:scope-change"],
    evidenceRefs: ["evidence:focused-tests"],
    contextRefs: ["context:bounded-task-bundle"]
  };
}

async function fixture() {
  const governedTask = task();
  const registry = await domainRegistry();
  const domainPack = resolveDomainSelection({
    registry,
    task: governedTask,
    environmentCapabilities: ["node", "browser"]
  });
  const resources = [
    resource({ id: "architect-agent", roles: ["lead"] }),
    resource({ id: "frontend-agent", roles: ["specialist"] }),
    resource({ id: "code-quality", type: "skill" }),
    resource({ id: "project-tests", type: "tool" })
  ];
  const trustedAssignmentIntents = [
    assignment({
      id: "A-ADAPTER-LEAD",
      agentId: "architect-agent",
      role: "lead",
      wave: 1
    }),
    assignment({
      id: "A-ADAPTER-FRONTEND",
      agentId: "frontend-agent",
      role: "specialist",
      wave: 2,
      dependencies: ["A-ADAPTER-LEAD"]
    })
  ];
  const team = buildExecutionWavePlan({
    task: governedTask,
    resolvedGateIds: [...new Set([
      ...domainPack.resolvedGateIds,
      ...governedTask.gates
    ])],
    selectedResources: resources,
    domainSelection: domainPack,
    trustedAssignmentIntents
  });
  return { governedTask, domainPack, resources, team, trustedAssignmentIntents };
}

function buildBoth({ governedTask, resources, team, domainPack }) {
  const input = {
    task: governedTask,
    selectedResources: resources,
    team,
    context: { items: [contextItem()] },
    domainPack
  };
  return [
    ["Codex", () => buildCodexExecutionPlan(input)],
    ["Claude", () => buildClaudeExecutionPlan(input)]
  ];
}

test("both adapters reject task/team drift and assignments missing from the selected agent set", async () => {
  const base = await fixture();
  for (const [name, build] of buildBoth({
    ...base,
    governedTask: { ...base.governedTask, id: "TASK-MISMATCH" }
  })) {
    assert.throws(build, /task\.id must match the execution wave plan taskId/, name);
  }

  for (const [name, build] of buildBoth({
    ...base,
    resources: base.resources.filter((entry) => entry.id !== "frontend-agent")
  })) {
    assert.throws(build, /selected resource set does not match the execution wave plan/, name);
  }
});

test("both adapters bind the complete task and selected resource snapshots", async () => {
  const base = await fixture();

  for (const [name, build] of buildBoth({
    ...base,
    governedTask: { ...base.governedTask, risk: "low" }
  })) {
    assert.throws(build, /task digest does not match the execution wave plan/, `${name}: task drift`);
  }

  const forgedAgentResources = structuredClone(base.resources);
  forgedAgentResources[0].nativeAdapter.id = "attacker-agent";
  for (const [name, build] of buildBoth({ ...base, resources: forgedAgentResources })) {
    assert.throws(
      build,
      /selected resource digest does not match the execution wave plan: architect-agent/,
      `${name}: native adapter substitution`
    );
  }

  const forgedToolResources = structuredClone(base.resources);
  forgedToolResources.at(-1).commandReference.scriptName = "release";
  for (const [name, build] of buildBoth({ ...base, resources: forgedToolResources })) {
    assert.throws(
      build,
      /selected resource digest does not match the execution wave plan: project-tests/,
      `${name}: command reference substitution`
    );
  }
});

test("both adapters bind the exact domain selection used by the planner", async () => {
  const base = await fixture();
  const registry = await domainRegistry();
  const substitutedDomain = resolveDomainSelection({
    registry,
    task: task({
      id: "TASK-OTHER-DOMAIN",
      targets: { platforms: ["ios"], frameworkOverlays: [] }
    }),
    environmentCapabilities: []
  });
  for (const [name, build] of buildBoth({ ...base, domainPack: substitutedDomain })) {
    assert.throws(build, /domain digest does not match the execution wave plan/, name);
  }
});

test("both adapters validate ResourceContract eligibility, lifecycle, runtime, and raw-command boundaries", async () => {
  const base = await fixture();
  const forgedCases = [
    {
      label: "lifecycle",
      replacement: resource({
        id: "architect-agent",
        roles: ["lead"],
        lifecycle: "stale"
      }),
      expected: /eligible resources must have active lifecycle/
    },
    {
      label: "runtime",
      replacement: resource({
        id: "architect-agent",
        roles: ["lead"],
        available: false,
        supported: false
      }),
      expected: /eligible resources require verified supported runtime capability/
    },
    {
      label: "eligibility",
      replacement: resource({
        id: "architect-agent",
        roles: ["lead"],
        eligible: false
      }),
      expected: /selected resource is ineligible: architect-agent/
    },
    {
      label: "raw command",
      replacement: {
        ...resource({ id: "architect-agent", roles: ["lead"] }),
        command: "npm test"
      },
      expected: /raw command strings are forbidden/
    }
  ];

  for (const forged of forgedCases) {
    const resources = [
      forged.replacement,
      ...base.resources.filter((entry) => entry.id !== "architect-agent")
    ];
    for (const [name, build] of buildBoth({ ...base, resources })) {
      assert.throws(build, forged.expected, `${name}: ${forged.label}`);
    }
  }
});

test("adapter outputs are immutable snapshots and never serialize raw commands", async () => {
  const base = await fixture();
  const mutableResources = structuredClone(base.resources);
  const builds = buildBoth({ ...base, resources: mutableResources });
  const plans = builds.map(([, build]) => build());

  mutableResources[0].id = "mutated-agent";
  mutableResources[0].nativeAdapter.id = "mutated-agent";
  mutableResources[3].commandReference.scriptName = "mutated";

  for (const plan of plans) {
    assert.ok(Object.isFrozen(plan));
    assert.ok(Object.isFrozen(plan.waves));
    assert.equal(JSON.stringify(plan).includes("npm test"), false);
    assert.equal(JSON.stringify(plan).includes("mutated-agent"), false);
    assert.equal(plan.configurationMutation, null);
    assert.equal(plan.permissionMutation, null);
    assert.equal(plan.actualSpawnProof, null);
    assert.equal(plan.actualExecutionProof, null);
    assert.equal(plan.actualInvocationProof, null);
    assert.equal(plan.actualToolOutput, null);
    assert.equal(plan.receiptProof, null);
    assert.equal(plan.contextReferences[0].contentTrust, "untrusted-repository-data");
    assert.equal(plan.contextReferences[0].contentHash, DIGEST);
    assert.equal(plan.contextReferences[0].instructionAuthority.mayOverrideSystemPolicy, false);
    assert.match(plan.contextReferences[0].provenanceDigest, /^[0-9a-f]{64}$/);
    assert.deepEqual(plan.contextReferences[0].agentIds, []);
    assert.equal(plan.assignmentContextBindings.length, 2);
    assert.equal(plan.assignmentContextBindings.every((binding) => (
      binding.contextReferenceIds.includes("instructions")
    )), true);
  }
});

test("Codex derives preview maturity and a blocked plan remains blocked without execution claims", async () => {
  const base = await fixture();
  const planned = buildCodexExecutionPlan({
    task: base.governedTask,
    selectedResources: base.resources,
    team: base.team,
    context: { items: [] },
    domainPack: base.domainPack
  });
  assert.equal(planned.domainMaturity, "preview");
  assert.deepEqual(planned.domainPackMaturities, [
    { packId: "enterprise-core", declaredMaturity: "supported", effectiveMaturity: "supported" },
    { packId: "web-saas", declaredMaturity: "preview", effectiveMaturity: "preview" }
  ]);

  const blockedTask = task({ id: "TASK-ADAPTER-BLOCKED" });
  const registry = await domainRegistry();
  const blockedDomain = resolveDomainSelection({
    registry,
    task: blockedTask,
    environmentCapabilities: []
  });
  const blockedTeam = buildBlockedExecutionWavePlan({
    task: blockedTask,
    blockers: ["required-environment-unavailable:web-saas"],
    domainSelection: blockedDomain
  });
  const blocked = buildCodexExecutionPlan({
    task: blockedTask,
    selectedResources: [],
    team: blockedTeam,
    context: { items: [] },
    domainPack: blockedDomain
  });

  assert.equal(blocked.executionStatus, "blocked");
  assert.equal(blocked.domainMaturity, "unavailable");
  assert.deepEqual(blocked.waves, []);
  assert.deepEqual(blocked.team.assignments, []);
  assert.equal(blocked.observation.observed, false);
  assert.equal(blocked.actualSpawnProof, null);
  assert.equal(blocked.actualExecutionProof, null);
  assert.equal(blocked.actualInvocationProof, null);
  assert.equal(blocked.actualToolOutput, null);
  assert.equal(blocked.receiptProof, null);
});

test("domain-only blocking suppresses executable Codex and Claude projections", async () => {
  const base = await fixture();
  const registry = await domainRegistry();
  const blockedDomain = resolveDomainSelection({
    registry,
    task: base.governedTask,
    environmentCapabilities: []
  });
  assert.equal(blockedDomain.status, "blocked");
  const domainBoundPlannedTeam = buildExecutionWavePlan({
    task: base.governedTask,
    resolvedGateIds: [...new Set([
      ...blockedDomain.resolvedGateIds,
      ...base.governedTask.gates
    ])],
    selectedResources: base.resources,
    domainSelection: blockedDomain,
    trustedAssignmentIntents: base.trustedAssignmentIntents
  });
  assert.equal(domainBoundPlannedTeam.executionStatus, "planned");

  const [codex, claude] = buildBoth({
    ...base,
    team: domainBoundPlannedTeam,
    domainPack: blockedDomain
  }).map(([, build]) => build());

  for (const projection of [codex, claude]) {
    assert.equal(projection.executionStatus, "blocked");
    assert.deepEqual(projection.waves, []);
  }
  assert.deepEqual(codex.team.assignments, []);
  assert.deepEqual(claude.assignments, []);
  assert.deepEqual(claude.handoffs, []);
});

test("adapters reject a DomainSelectionResult whose aggregate maturity is forged", async () => {
  const base = await fixture();
  const forgedDomain = Object.freeze({
    ...structuredClone(base.domainPack),
    effectiveMaturity: "supported"
  });
  for (const [name, build] of buildBoth({ ...base, domainPack: forgedDomain })) {
    assert.throws(build, /invalid DomainSelectionResult v1.*effectiveMaturity/, name);
  }
});
