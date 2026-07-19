#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertResourceContract } from "./ai-toolkit/kernel/contracts.mjs";
import {
  buildExecutionTeam,
  planDeliveryRun
} from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { buildResourceCatalog } from "./ai-toolkit/kernel/resource-catalog.mjs";
import { buildExecutionWavePlan } from "./ai-toolkit/kernel/team-planner.mjs";
import { readPinnedDeliveryRequestSync } from "./test-support/live-repository-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STARTER = path.join(ROOT, "templates", "delivery-kernel.request.example.json");
const AGENT_DIRECTORY = path.join(ROOT, ".codex", "agents");

function starterRequest() {
  return readPinnedDeliveryRequestSync(STARTER, ROOT);
}

function canonicalResourceCatalog() {
  return buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: JSON.parse(readFileSync(path.join(ROOT, "registries", "agents.registry.json"), "utf8")),
    skillsRegistry: JSON.parse(readFileSync(path.join(ROOT, "registries", "skills.registry.json"), "utf8")),
    toolsRegistry: JSON.parse(readFileSync(path.join(ROOT, "registries", "tools.registry.json"), "utf8"))
  });
}

function agentTomlSnapshot() {
  return Object.fromEntries(
    readdirSync(AGENT_DIRECTORY, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".toml"))
      .map((entry) => entry.name)
      .sort()
      .map((fileName) => {
        const contents = readFileSync(path.join(AGENT_DIRECTORY, fileName));
        return [fileName, createHash("sha256").update(contents).digest("hex")];
      })
  );
}

function minimalRegistries(tomlPath) {
  return {
    agentsRegistry: {
      schemaVersion: "1.0.0",
      agents: [{
        name: "implementation-agent",
        status: ["approved"],
        nativeCodexAgentName: "implementation-agent",
        runtimeFiles: { tomlPath, tomlPresent: true },
        deliveryKernel: {
          canonicalCompetencies: ["implementation"],
          eligibleRoles: ["specialist"],
          measuredContextCost: 1,
          contextCostMeasurement: "test fixture",
          authority: "internal-reviewed",
          lifecycle: "active",
          environmentRestrictions: {
            allowed: ["codex-project-runtime"],
            forbidden: []
          }
        }
      }]
    },
    skillsRegistry: { schemaVersion: "1.0.0", skills: [] },
    toolsRegistry: { schemaVersion: "1.0.0", tools: [] }
  };
}

function assignment({ id, agentId, role, wave, mode = "read-only", ownedPaths = [], dependencies = [] }) {
  return {
    id,
    agentId,
    role,
    wave,
    responsibility: `${role}:${agentId}`,
    ownership: { mode, ownedPaths },
    dependencies,
    stopConditionRefs: ["stop:scope-change"],
    evidenceRefs: ["evidence:focused-tests"],
    contextRefs: ["context:bounded-task-bundle"]
  };
}

test("materialized starter planning inventories permissions without assignments or mutation", async () => {
  const before = agentTomlSnapshot();
  const plan = await planDeliveryRun(
    { request: starterRequest() },
    { invocationRoot: ROOT }
  );
  const after = agentTomlSnapshot();
  const catalog = canonicalResourceCatalog();

  assert.deepEqual(after, before);
  const architect = catalog.find((resource) => resource.id === "architect-agent");
  const frontend = catalog.find((resource) => resource.id === "frontend-agent");
  const selectedSkill = catalog.find((resource) => resource.type === "skill");
  assert.deepEqual(architect.runtimePosture, {
    registryPresent: true,
    available: true,
    supported: true,
    executionProof: false,
    sandboxMode: "read-only",
    scopedLocalWrite: false
  });
  assert.equal(frontend.runtimePosture.sandboxMode, "workspace-write");
  assert.equal(frontend.runtimePosture.scopedLocalWrite, true);
  assert.equal(selectedSkill.runtimePosture.sandboxMode, "not-applicable");
  assert.equal(selectedSkill.runtimePosture.scopedLocalWrite, false);

  assert.equal(plan.domain.sourceGovernance.status, "blocked");
  assert.equal(plan.team.executionStatus, "blocked");
  assert.deepEqual(plan.team.assignments, []);
  assert.ok(plan.team.blockers.some((blocker) => blocker.startsWith("authoritative-source-unavailable:")));
  assert.equal(plan.team.actualExecutionProof, null);
  assert.equal(plan.team.receiptProof, null);
});

test("agent capability inspection rejects missing, duplicate, unknown, and ambiguous sandbox_mode", () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-sandbox-"));
  const relativeTomlPath = "agents/implementation-agent.toml";
  const absoluteTomlPath = path.join(temporaryRoot, ...relativeTomlPath.split("/"));
  mkdirSync(path.dirname(absoluteTomlPath), { recursive: true });
  const registries = minimalRegistries(relativeTomlPath);

  try {
    for (const [name, contents, expected] of [
      ["missing", "name = \"implementation-agent\"\n", /sandbox_mode is missing/u],
      [
        "duplicate",
        "sandbox_mode = \"read-only\" # comment with \"\"\"\nsandbox_mode = \"workspace-write\"\n",
        /sandbox_mode is duplicated/u
      ],
      ["unknown", "sandbox_mode = \"danger-full-access\"\n", /unknown sandbox_mode/u],
      ["ambiguous", "sandbox_mode = 'workspace-write'\n", /sandbox_mode is ambiguous/u]
    ]) {
      writeFileSync(absoluteTomlPath, contents, "utf8");
      assert.throws(
        () => buildResourceCatalog({ repositoryRoot: temporaryRoot, ...registries }),
        expected,
        name
      );
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("ResourceContract consistency and planner provenance reject forged write permission", async () => {
  const task = starterRequest().task;
  const architect = canonicalResourceCatalog().find((resource) => resource.id === "architect-agent");
  const inconsistent = {
    ...architect,
    runtimePosture: { ...architect.runtimePosture, scopedLocalWrite: true }
  };
  assert.throws(
    () => assertResourceContract(inconsistent),
    /scopedLocalWrite must be true exactly when an agent sandboxMode is workspace-write/u
  );

  const forged = {
    ...architect,
    runtimePosture: {
      ...architect.runtimePosture,
      sandboxMode: "workspace-write",
      scopedLocalWrite: true
    }
  };
  assert.doesNotThrow(() => assertResourceContract(forged));
  assert.throws(
    () => buildExecutionWavePlan({
      task,
      resolvedGateIds: task.gates,
      selectedResources: [forged],
      trustedAssignmentIntents: [assignment({
        id: "A-FORGED-WRITER",
        agentId: "architect-agent",
        role: "lead",
        wave: 1,
        mode: "write",
        ownedPaths: ["src/feature"]
      })]
    }),
    /write assignment A-FORGED-WRITER requires trusted catalog-derived workspace-write capability/u
  );
});

test("write-authorized planning blocks without a capable writer or safe path while read-only planning remains usable", () => {
  const task = starterRequest().task;
  const readOnlyLead = {
    id: "architect-agent",
    type: "agent",
    eligibleRoles: ["lead"],
    canonicalCompetencies: ["architecture", "implementation"],
    runtimePosture: { sandboxMode: "read-only", scopedLocalWrite: false }
  };
  const verifier = {
    id: "qa-test-agent",
    type: "agent",
    eligibleRoles: ["specialist", "verifier"],
    canonicalCompetencies: ["testing", "verification"],
    runtimePosture: { sandboxMode: "read-only", scopedLocalWrite: false }
  };
  const routing = {
    selected: [readOnlyLead, verifier],
    requiredRoles: { lead: readOnlyLead.id, verifier: verifier.id },
    uncoveredCompetencies: [],
    blockedReasons: []
  };

  const missingWriter = buildExecutionTeam({
    task,
    routing,
    resolvedGateIds: task.gates
  });
  assert.equal(missingWriter.executionStatus, "blocked");
  assert.deepEqual(missingWriter.blockers, [
    "scoped-local-write:no-selected-capable-implementation-writer"
  ]);
  assert.deepEqual(missingWriter.assignments, []);
  assert.equal(missingWriter.actualExecutionProof, null);

  const unsafeScope = buildExecutionTeam({
    task: { ...task, scope: [".git/config"] },
    routing: {
      ...routing,
      selected: [
        readOnlyLead,
        {
          id: "frontend-agent",
          type: "agent",
          eligibleRoles: ["specialist"],
          canonicalCompetencies: ["implementation"],
          runtimePosture: { sandboxMode: "workspace-write", scopedLocalWrite: true }
        },
        verifier
      ]
    },
    resolvedGateIds: task.gates
  });
  assert.equal(unsafeScope.executionStatus, "blocked");
  assert.deepEqual(unsafeScope.blockers, ["scoped-local-write:no-safe-owned-path"]);
  assert.deepEqual(unsafeScope.assignments, []);

  const readOnly = buildExecutionTeam({
    task: {
      ...task,
      authorizedActions: task.authorizedActions.filter((action) => action !== "scoped-local-write")
    },
    routing,
    resolvedGateIds: task.gates
  });
  assert.equal(readOnly.executionStatus, "planned");
  assert.ok(readOnly.assignments.length > 0);
  assert.ok(readOnly.assignments.every(
    (item) => item.governedEnvelope.ownership.mode === "read-only"
  ));
});

test("a fixed workspace-write runtime cannot be assigned read-only without a trusted downgrade", () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-mode-match-"));
  const leadPath = "agents/lead.toml";
  const writerPath = "agents/writer.toml";
  mkdirSync(path.join(temporaryRoot, "agents"), { recursive: true });
  writeFileSync(path.join(temporaryRoot, ...leadPath.split("/")), 'sandbox_mode = "read-only"\n', "utf8");
  writeFileSync(path.join(temporaryRoot, ...writerPath.split("/")), 'sandbox_mode = "workspace-write"\n', "utf8");
  try {
    const catalog = buildResourceCatalog({
      repositoryRoot: temporaryRoot,
      agentsRegistry: {
        schemaVersion: "1.0.0",
        agents: [
          {
            name: "lead-agent",
            status: ["approved"],
            nativeCodexAgentName: "lead-agent",
            runtimeFiles: { tomlPath: leadPath, tomlPresent: true },
            deliveryKernel: {
              canonicalCompetencies: ["architecture"],
              eligibleRoles: ["lead"],
              measuredContextCost: 1,
              contextCostMeasurement: "test fixture",
              authority: "internal-reviewed",
              lifecycle: "active",
              environmentRestrictions: { allowed: ["codex-project-runtime"], forbidden: [] }
            }
          },
          {
            name: "writer-agent",
            status: ["approved"],
            nativeCodexAgentName: "writer-agent",
            runtimeFiles: { tomlPath: writerPath, tomlPresent: true },
            deliveryKernel: {
              canonicalCompetencies: ["implementation"],
              eligibleRoles: ["specialist"],
              measuredContextCost: 1,
              contextCostMeasurement: "test fixture",
              authority: "internal-reviewed",
              lifecycle: "active",
              environmentRestrictions: { allowed: ["codex-project-runtime"], forbidden: [] }
            }
          }
        ]
      },
      skillsRegistry: { schemaVersion: "1.0.0", skills: [] },
      toolsRegistry: { schemaVersion: "1.0.0", tools: [] }
    });
    const task = {
      ...starterRequest().task,
      authorizedActions: ["repository-read"]
    };
    assert.throws(
      () => buildExecutionWavePlan({
        task,
        resolvedGateIds: task.gates,
        selectedResources: catalog,
        trustedAssignmentIntents: [
          assignment({ id: "A-LEAD", agentId: "lead-agent", role: "lead", wave: 1 }),
          assignment({ id: "A-WRITER", agentId: "writer-agent", role: "specialist", wave: 1 })
        ]
      }),
      /read-only assignment A-WRITER cannot use fixed workspace-write capability/
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});
