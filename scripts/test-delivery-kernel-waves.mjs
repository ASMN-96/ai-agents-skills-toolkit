#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import * as teamPlanner from "./ai-toolkit/kernel/team-planner.mjs";
import { buildExecutionTeam } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { buildResourceCatalog } from "./ai-toolkit/kernel/resource-catalog.mjs";

const collaborationContractsUrl = new URL(
  "./ai-toolkit/kernel/collaboration-contracts.mjs",
  import.meta.url
);
const capabilityRoot = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-wave-capabilities-"));
const agentCache = new Map();

after(() => rmSync(capabilityRoot, { recursive: true, force: true }));

function governedTask(overrides = {}) {
  return {
    id: "TASK-WAVES-1",
    goal: "Deliver bounded execution waves",
    scenario: "large-governed-implementation",
    risk: "medium",
    scope: ["scripts", "src", "tests", "review-output"],
    exclusions: ["deployment"],
    constraints: ["preserve existing user work"],
    authorizedActions: [
      "repository-read",
      "scoped-local-write",
      "project-validation"
    ],
    acceptanceCriteria: [
      {
        id: "AC-WAVES-1",
        statement: "Execution waves remain bounded and ownership-safe.",
        requiredGateIds: ["focused-tests"]
      }
    ],
    gates: ["focused-tests"],
    ...overrides
  };
}

function agent(
  id,
  eligibleRoles,
  canonicalCompetencies = [],
  sandboxMode = "read-only"
) {
  const cacheKey = JSON.stringify([id, eligibleRoles, canonicalCompetencies, sandboxMode]);
  if (agentCache.has(cacheKey)) return agentCache.get(cacheKey);
  const relativeTomlPath = `agents/agent-${agentCache.size + 1}.toml`;
  const absoluteTomlPath = path.join(capabilityRoot, ...relativeTomlPath.split("/"));
  mkdirSync(path.dirname(absoluteTomlPath), { recursive: true });
  writeFileSync(
    absoluteTomlPath,
    `name = "${id}"\nsandbox_mode = "${sandboxMode}"\n`,
    "utf8"
  );
  const [resource] = buildResourceCatalog({
    repositoryRoot: capabilityRoot,
    agentsRegistry: {
      schemaVersion: "1.0.0",
      agents: [{
        name: id,
        status: ["approved"],
        nativeCodexAgentName: id,
        runtimeFiles: { tomlPath: relativeTomlPath, tomlPresent: true },
        deliveryKernel: {
          canonicalCompetencies: canonicalCompetencies.length > 0
            ? canonicalCompetencies
            : ["test-support"],
          eligibleRoles,
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
  });
  agentCache.set(cacheKey, resource);
  return resource;
}

function assignment({
  id,
  agentId,
  role,
  wave,
  mode = "read-only",
  ownedPaths = [],
  dependencies = [],
  responsibility = `${role}:${id}`,
  stopConditionRefs = ["stop:scope-change"],
  evidenceRefs = ["evidence:focused-tests"],
  contextRefs = ["context:task-contract"]
}) {
  return {
    id,
    agentId,
    role,
    wave,
    responsibility,
    ownership: { mode, ownedPaths },
    dependencies,
    stopConditionRefs,
    evidenceRefs,
    contextRefs
  };
}

function buildExecutionWavePlan(input) {
  assert.equal(
    typeof teamPlanner.buildExecutionWavePlan,
    "function",
    "team-planner must export buildExecutionWavePlan"
  );
  return teamPlanner.buildExecutionWavePlan(input);
}

async function collaborationContracts() {
  try {
    return await import(collaborationContractsUrl.href);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND") return {};
    throw error;
  }
}

test("buildExecutionWavePlan orders any number of waves around one accountable lead", () => {
  const task = governedTask();
  const selectedResources = [
    agent("delivery-lead", ["lead"], ["implementation"], "workspace-write"),
    agent("frontend-agent", ["specialist"], ["implementation"], "workspace-write"),
    agent("backend-agent", ["specialist"], ["implementation"]),
    { id: "code-quality", type: "skill", eligibleRoles: ["support"] }
  ];
  const trustedAssignmentIntents = [
    assignment({
      id: "A-LEAD-1",
      agentId: "delivery-lead",
      role: "lead",
      wave: 10,
      mode: "write",
      ownedPaths: ["scripts/ai-toolkit/kernel/team-planner.mjs"]
    }),
    assignment({
      id: "A-FRONTEND-2",
      agentId: "frontend-agent",
      role: "specialist",
      wave: 20,
      mode: "write",
      ownedPaths: ["scripts/test-delivery-kernel-waves.mjs"],
      dependencies: ["A-LEAD-1"]
    }),
    assignment({
      id: "A-BACKEND-3",
      agentId: "backend-agent",
      role: "specialist",
      wave: 30,
      dependencies: ["A-FRONTEND-2"]
    })
  ];

  const plan = buildExecutionWavePlan({
    task,
    resolvedGateIds: ["focused-tests", "enterprise-product-acceptance"],
    selectedResources,
    trustedAssignmentIntents
  });

  assert.equal(plan.lead, "delivery-lead");
  assert.equal(plan.verifier, null);
  assert.deepEqual(plan.waves.map((wave) => wave.order), [10, 20, 30]);
  assert.deepEqual(
    plan.waves.map((wave) => wave.assignments.map((item) => item.agentId)),
    [["delivery-lead"], ["frontend-agent"], ["backend-agent"]]
  );
  assert.equal(plan.executionStatus, "planned");
  assert.equal(plan.actualExecutionProof, null);
  assert.equal(plan.receiptProof, null);
  assert.ok(Object.isFrozen(plan));
  assert.ok(Object.isFrozen(plan.waves));
  assert.ok(Object.isFrozen(plan.assignments[0].governedEnvelope.acceptanceCriteria[0]));
});

test("delivery team deterministically selects the writer with the best required competency fit", () => {
  const lead = agent("architect-agent", ["lead"], ["architecture", "implementation"]);
  const candidateSpecs = [
    ["backend-implementation-agent", ["implementation", "api-contracts"]],
    ["desktop-platform-agent", ["implementation", "windows-native", "native-boundaries"]],
    ["frontend-agent", ["implementation", "responsive-ui", "web-accessibility"]],
    ["mobile-platform-agent", ["implementation", "ios-native", "native-boundaries"]]
  ];
  const cases = [
    {
      requiredCompetencies: ["implementation", "api-contracts"],
      expectedWriter: "backend-implementation-agent"
    },
    {
      requiredCompetencies: ["implementation", "responsive-ui", "web-accessibility"],
      expectedWriter: "frontend-agent"
    },
    {
      requiredCompetencies: ["implementation", "ios-native", "native-boundaries"],
      expectedWriter: "mobile-platform-agent"
    },
    {
      requiredCompetencies: ["implementation", "windows-native", "native-boundaries"],
      expectedWriter: "desktop-platform-agent"
    }
  ];

  for (const { requiredCompetencies, expectedWriter } of cases) {
    const candidates = candidateSpecs.map(([id, competencies]) => agent(
      id,
      ["specialist"],
      competencies,
      id === expectedWriter ? "workspace-write" : "read-only"
    ));
    for (const selected of [[lead, ...candidates], [lead, ...candidates].reverse()]) {
      const team = buildExecutionTeam({
        task: governedTask(),
        routing: {
          selected,
          requiredCompetencies,
          requiredRoles: { lead: lead.id, verifier: null },
          uncoveredCompetencies: [],
          blockedReasons: []
        },
        resolvedGateIds: ["focused-tests"]
      });
      const writers = team.assignments.filter(
        (item) => item.governedEnvelope.ownership.mode === "write"
      );
      assert.deepEqual(writers.map((item) => item.agentId), [expectedWriter]);
    }
  }
});

test("delivery team preserves fixed writers with deterministic non-overlapping ownership", () => {
  const lead = agent("architect-agent", ["lead"], ["architecture"]);
  const backend = agent(
    "backend-implementation-agent",
    ["specialist"],
    ["implementation", "api-contracts"],
    "workspace-write"
  );
  const frontend = agent(
    "frontend-agent",
    ["specialist"],
    ["implementation", "responsive-ui"],
    "workspace-write"
  );
  const requiredCompetencies = ["implementation", "api-contracts", "responsive-ui"];

  for (const selected of [[lead, backend, frontend], [frontend, lead, backend]]) {
    const team = buildExecutionTeam({
      task: governedTask({
        scope: ["services/orders-api", "apps/customer-portal"],
        exclusions: []
      }),
      routing: {
        selected,
        requiredCompetencies,
        requiredRoles: { lead: lead.id, verifier: null },
        uncoveredCompetencies: [],
        blockedReasons: []
      },
      resolvedGateIds: ["focused-tests"]
    });
    const writers = team.assignments.filter(
      (item) => item.governedEnvelope.ownership.mode === "write"
    );

    assert.equal(team.executionStatus, "planned");
    assert.deepEqual(
      writers.map((item) => [item.agentId, item.governedEnvelope.ownership.ownedPaths]),
      [
        ["frontend-agent", ["apps/customer-portal"]],
        ["backend-implementation-agent", ["services/orders-api"]]
      ]
    );
    assert.equal(new Set(writers.map((item) => item.wave)).size, 1);
    assert.ok(team.waves.every((wave) => wave.specialists.length <= 2));
  }
});

test("delivery team blocks multiple fixed writers when disjoint ownership cannot be proven", () => {
  const lead = agent("architect-agent", ["lead"], ["architecture"]);
  const writers = [
    agent(
      "backend-implementation-agent",
      ["specialist"],
      ["implementation", "api-contracts"],
      "workspace-write"
    ),
    agent(
      "frontend-agent",
      ["specialist"],
      ["implementation", "responsive-ui"],
      "workspace-write"
    )
  ];
  const routing = {
    selected: [lead, ...writers],
    requiredCompetencies: ["implementation", "api-contracts", "responsive-ui"],
    requiredRoles: { lead: lead.id, verifier: null },
    uncoveredCompetencies: [],
    blockedReasons: []
  };

  for (const scope of [["src"], ["src", "src/api"]]) {
    const team = buildExecutionTeam({
      task: governedTask({ scope, exclusions: [] }),
      routing,
      resolvedGateIds: ["focused-tests"]
    });

    assert.equal(team.executionStatus, "blocked");
    assert.deepEqual(team.waves, []);
    assert.deepEqual(team.assignments, []);
    assert.deepEqual(team.blockers, [
      "scoped-local-write:insufficient-disjoint-owned-paths:required=2:available=1"
    ]);
  }
});

test("high-risk delivery team keeps an independent final verifier after every fixed writer", () => {
  const lead = agent("architect-agent", ["lead"], ["architecture"]);
  const backend = agent(
    "backend-implementation-agent",
    ["specialist"],
    ["implementation", "api-contracts"],
    "workspace-write"
  );
  const frontend = agent(
    "frontend-agent",
    ["specialist"],
    ["implementation", "responsive-ui"],
    "workspace-write"
  );
  const verifier = agent(
    "reviewer-agent",
    ["specialist", "verifier"],
    ["verification"]
  );
  const team = buildExecutionTeam({
    task: governedTask({
      risk: "high",
      scope: ["apps/customer-portal", "services/orders-api"],
      exclusions: []
    }),
    routing: {
      selected: [frontend, verifier, lead, backend],
      requiredCompetencies: ["implementation", "api-contracts", "responsive-ui", "verification"],
      requiredRoles: { lead: lead.id, verifier: verifier.id },
      uncoveredCompetencies: [],
      blockedReasons: []
    },
    resolvedGateIds: ["focused-tests", "security-review"]
  });
  const writers = team.assignments.filter(
    (item) => item.governedEnvelope.ownership.mode === "write"
  );
  const verifierAssignment = team.assignments.find((item) => item.role === "verifier");

  assert.equal(team.executionStatus, "planned");
  assert.equal(team.verifier, "reviewer-agent");
  assert.equal(verifierAssignment.wave, team.waves.at(-1).order);
  assert.deepEqual(
    verifierAssignment.governedEnvelope.dependencies,
    writers.map((item) => item.id)
  );
  assert.equal(verifierAssignment.governedEnvelope.ownership.mode, "read-only");
});

test("read-only overlap and segment siblings are valid while writer overlap is global", () => {
  const selectedResources = [
    agent("delivery-lead", ["lead"], [], "workspace-write"),
    agent("api-agent", ["specialist"], [], "workspace-write"),
    agent("reviewer-agent", ["specialist", "verifier"], ["verification"])
  ];
  const validIntents = [
    assignment({
      id: "A-LEAD",
      agentId: "delivery-lead",
      role: "lead",
      wave: 1,
      mode: "write",
      ownedPaths: ["src/api"]
    }),
    assignment({
      id: "A-API",
      agentId: "api-agent",
      role: "specialist",
      wave: 1,
      mode: "write",
      ownedPaths: ["src/api-client"]
    }),
    assignment({
      id: "A-REVIEW",
      agentId: "reviewer-agent",
      role: "specialist",
      wave: 1,
      ownedPaths: ["src/api", "src/api-client"]
    })
  ];

  assert.doesNotThrow(() => buildExecutionWavePlan({
    task: governedTask(),
    resolvedGateIds: ["focused-tests"],
    selectedResources,
    trustedAssignmentIntents: validIntents
  }));

  for (const [conflictingPath, expected] of [
    ["src/api", /writer ownership overlap.*src\/api.*A-LEAD.*A-API/],
    ["src/api/routes", /writer ownership overlap.*src\/api.*src\/api\/routes/],
    ["src", /writer ownership overlap.*src\/api.*src/]
  ]) {
    const conflicting = structuredClone(validIntents);
    conflicting[1].wave = 2;
    conflicting[1].dependencies = ["A-LEAD"];
    conflicting[1].ownership.ownedPaths = [conflictingPath];
    assert.throws(
      () => buildExecutionWavePlan({
        task: governedTask(),
        resolvedGateIds: ["focused-tests"],
        selectedResources,
        trustedAssignmentIntents: conflicting
      }),
      expected
    );
  }
});

test("writers require scoped authorization and non-empty canonical repository-relative paths", () => {
  const selectedResources = [agent("delivery-lead", ["lead"], [], "workspace-write")];
  const writeIntent = assignment({
    id: "A-WRITE",
    agentId: "delivery-lead",
    role: "lead",
    wave: 1,
    mode: "write",
    ownedPaths: ["src/feature.mjs"]
  });

  assert.throws(
    () => buildExecutionWavePlan({
      task: governedTask({ authorizedActions: ["repository-read"] }),
      resolvedGateIds: ["focused-tests"],
      selectedResources,
      trustedAssignmentIntents: [writeIntent]
    }),
    /write assignment A-WRITE requires task authorization scoped-local-write/
  );

  for (const ownedPaths of [
    [],
    ["."],
    ["/src/feature.mjs"],
    ["src\\feature.mjs"],
    ["src/../feature.mjs"],
    ["src//feature.mjs"],
    ["file:src/feature.mjs"]
  ]) {
    const invalid = structuredClone(writeIntent);
    invalid.ownership.ownedPaths = ownedPaths;
    assert.throws(
      () => buildExecutionWavePlan({
        task: governedTask(),
        resolvedGateIds: ["focused-tests"],
        selectedResources,
        trustedAssignmentIntents: [invalid]
      }),
      /ownedPaths.*non-empty canonical POSIX repository-relative paths/
    );
  }

  for (const [task, ownedPaths, expected] of [
    [
      governedTask({ scope: ["src"], exclusions: [] }),
      ["scripts/outside.mjs"],
      /owned path scripts\/outside\.mjs is outside task\.scope/
    ],
    [
      governedTask({ scope: ["src"], exclusions: ["src/private"] }),
      ["src/private/secret.mjs"],
      /owned path src\/private\/secret\.mjs overlaps task exclusion src\/private/
    ],
    [
      governedTask({ scope: ["src"], exclusions: ["src/private"] }),
      ["src"],
      /owned path src overlaps task exclusion src\/private/
    ],
    [
      governedTask({ scope: ["."], exclusions: [] }),
      [".git/config"],
      /owned path \.git\/config targets reserved repository metadata/
    ]
  ]) {
    const invalid = structuredClone(writeIntent);
    invalid.ownership.ownedPaths = ownedPaths;
    assert.throws(
      () => buildExecutionWavePlan({
        task,
        resolvedGateIds: ["focused-tests"],
        selectedResources,
        trustedAssignmentIntents: [invalid]
      }),
      expected
    );
  }
});

test("each wave permits at most one lead and two specialists", () => {
  const selectedResources = [
    agent("lead-one", ["lead"]),
    agent("lead-two", ["lead"]),
    agent("specialist-one", ["specialist"]),
    agent("specialist-two", ["specialist"]),
    agent("specialist-three", ["specialist"])
  ];

  assert.throws(
    () => buildExecutionWavePlan({
      task: governedTask(),
      resolvedGateIds: ["focused-tests"],
      selectedResources,
      trustedAssignmentIntents: [
        assignment({ id: "A-L1", agentId: "lead-one", role: "lead", wave: 1 }),
        assignment({ id: "A-L2", agentId: "lead-two", role: "lead", wave: 2 })
      ]
    }),
    /exactly one accountable lead identity; received 2/
  );

  assert.throws(
    () => buildExecutionWavePlan({
      task: governedTask(),
      resolvedGateIds: ["focused-tests"],
      selectedResources,
      trustedAssignmentIntents: [
        assignment({ id: "A-L1", agentId: "lead-one", role: "lead", wave: 1 }),
        assignment({ id: "A-S1", agentId: "specialist-one", role: "specialist", wave: 1 }),
        assignment({ id: "A-S2", agentId: "specialist-two", role: "specialist", wave: 1 }),
        assignment({ id: "A-S3", agentId: "specialist-three", role: "specialist", wave: 1 })
      ]
    }),
    /wave 1 permits at most two specialists; received 3/
  );

  assert.throws(
    () => buildExecutionWavePlan({
      task: governedTask(),
      resolvedGateIds: ["focused-tests"],
      selectedResources,
      trustedAssignmentIntents: [
        assignment({ id: "A-L1", agentId: "lead-one", role: "lead", wave: 1 }),
        assignment({ id: "A-L1-AGAIN", agentId: "lead-one", role: "lead", wave: 1 })
      ]
    }),
    /wave 1 permits at most one lead assignment; received 2/
  );
});

test("the legacy expert-team helper never makes a multi-role lead its own verifier", () => {
  assert.throws(
    () => teamPlanner.buildExpertTeam({
      task: { id: "TASK-DUAL-ROLE", risk: "high" },
      selectedResources: [
        agent(
          "dual-role-agent",
          ["lead", "specialist", "verifier"],
          ["implementation", "verification"]
        )
      ]
    }),
    /high-risk expert teams require an independent verification specialist/
  );
});

test("high and critical risk require an independent final read-only verifier after every writer", () => {
  const selectedResources = [
    agent("delivery-lead", ["lead", "specialist", "verifier"], [], "workspace-write"),
    agent("implementation-agent", ["specialist"], [], "workspace-write"),
    agent("independent-reviewer", ["specialist", "verifier"], ["verification"])
  ];
  const validIntents = [
    assignment({
      id: "A-LEAD-WRITE",
      agentId: "delivery-lead",
      role: "lead",
      wave: 1,
      mode: "write",
      ownedPaths: ["src"]
    }),
    assignment({
      id: "A-IMPLEMENT",
      agentId: "implementation-agent",
      role: "specialist",
      wave: 2,
      mode: "write",
      ownedPaths: ["tests"],
      dependencies: ["A-LEAD-WRITE"]
    }),
    assignment({
      id: "A-VERIFY",
      agentId: "independent-reviewer",
      role: "verifier",
      wave: 3,
      ownedPaths: ["src", "tests"],
      dependencies: ["A-LEAD-WRITE", "A-IMPLEMENT"]
    })
  ];

  for (const risk of ["high", "critical"]) {
    const plan = buildExecutionWavePlan({
      task: governedTask({ risk }),
      resolvedGateIds: ["focused-tests", "security-review"],
      selectedResources,
      trustedAssignmentIntents: validIntents
    });
    assert.equal(plan.verifier, "independent-reviewer");
    assert.equal(plan.waves.at(-1).assignments[0].role, "verifier");
    assert.deepEqual(
      plan.waves.at(-1).assignments[0].governedEnvelope.dependencies,
      ["A-LEAD-WRITE", "A-IMPLEMENT"]
    );
  }

  const invalidCases = [
    {
      name: "missing verifier",
      intents: validIntents.slice(0, 2),
      expected: /high-risk execution waves require one verifier assignment in the final wave/
    },
    {
      name: "lead is verifier",
      intents: [
        assignment({
          id: "A-LEAD-READ",
          agentId: "delivery-lead",
          role: "lead",
          wave: 1
        }),
        assignment({
          id: "A-IMPLEMENT",
          agentId: "implementation-agent",
          role: "specialist",
          wave: 2,
          mode: "write",
          ownedPaths: ["tests"],
          dependencies: ["A-LEAD-READ"]
        }),
        assignment({
          id: "A-VERIFY",
          agentId: "delivery-lead",
          role: "verifier",
          wave: 3,
          dependencies: ["A-IMPLEMENT"]
        })
      ],
      resources: [
        agent("delivery-lead", ["lead", "specialist", "verifier"]),
        agent("implementation-agent", ["specialist"], [], "workspace-write"),
        agent("independent-reviewer", ["specialist", "verifier"], ["verification"])
      ],
      expected: /verifier must be distinct from the accountable lead/
    },
    {
      name: "verifier writes",
      intents: [
        ...validIntents.slice(0, 2),
        {
          ...validIntents[2],
          ownership: { mode: "write", ownedPaths: ["review-output"] }
        }
      ],
      resources: [
        selectedResources[0],
        selectedResources[1],
        agent(
          "independent-reviewer",
          ["specialist", "verifier"],
          ["verification"],
          "workspace-write"
        )
      ],
      expected: /verifier must be read-only/
    },
    {
      name: "verifier misses a writer dependency",
      intents: [
        ...validIntents.slice(0, 2),
        { ...validIntents[2], dependencies: ["A-IMPLEMENT"] }
      ],
      expected: /verifier must depend on every writer assignment.*A-LEAD-WRITE/
    },
    {
      name: "verifier is not in final wave",
      intents: [
        ...validIntents,
        assignment({
          id: "A-LEAD-FINAL",
          agentId: "delivery-lead",
          role: "lead",
          wave: 4,
          mode: "write",
          ownedPaths: ["review-output"],
          dependencies: ["A-VERIFY"]
        })
      ],
      expected: /high-risk execution waves require one verifier assignment in the final wave/
    },
    {
      name: "verifier also writes",
      intents: [
        validIntents[0],
        { ...validIntents[1], agentId: "independent-reviewer" },
        validIntents[2]
      ],
      expected: /write assignment A-IMPLEMENT requires trusted catalog-derived workspace-write capability/
    }
  ];

  for (const { name, intents, resources = selectedResources, expected } of invalidCases) {
    assert.throws(
      () => buildExecutionWavePlan({
        task: governedTask({ risk: "high" }),
        resolvedGateIds: ["focused-tests", "security-review"],
        selectedResources: resources,
        trustedAssignmentIntents: intents
      }),
      expected,
      name
    );
  }
});

test("dependencies must exist and point strictly to earlier waves", () => {
  const selectedResources = [
    agent("delivery-lead", ["lead"]),
    agent("specialist", ["specialist"])
  ];
  const base = [
    assignment({ id: "A-LEAD", agentId: "delivery-lead", role: "lead", wave: 1 }),
    assignment({
      id: "A-SPECIALIST",
      agentId: "specialist",
      role: "specialist",
      wave: 2,
      dependencies: ["A-LEAD"]
    })
  ];

  for (const [dependencies, expected] of [
    [["A-UNKNOWN"], /dependency A-UNKNOWN does not identify an assignment/],
    [["A-SPECIALIST"], /dependency A-SPECIALIST must belong to an earlier wave/]
  ]) {
    const invalid = structuredClone(base);
    invalid[0].dependencies = dependencies;
    assert.throws(
      () => buildExecutionWavePlan({
        task: governedTask(),
        resolvedGateIds: ["focused-tests"],
        selectedResources,
        trustedAssignmentIntents: invalid
      }),
      expected
    );
  }
});

test("collaboration builders preserve one validated immutable governed envelope", async () => {
  const contracts = await collaborationContracts();
  for (const name of [
    "buildAssignmentContract",
    "buildHandoffContract",
    "buildCollaborationEvent",
    "buildExecutionReceipt"
  ]) {
    assert.equal(typeof contracts[name], "function", `${name} must be exported`);
  }

  const task = governedTask({
    risk: "high",
    scope: ["scripts/ai-toolkit/kernel"]
  });
  const intent = assignment({
    id: "A-GOVERNED",
    agentId: "delivery-lead",
    role: "lead",
    wave: 1,
    mode: "write",
    ownedPaths: ["scripts/ai-toolkit/kernel"]
  });
  const builtAssignment = contracts.buildAssignmentContract({
    task,
    resolvedGateIds: ["focused-tests", "security-review"],
    assignment: intent
  });
  task.scope.push("should-not-leak");
  intent.ownership.ownedPaths.push("should-not-leak");

  assert.deepEqual(builtAssignment.governedEnvelope, {
    taskId: "TASK-WAVES-1",
    goal: "Deliver bounded execution waves",
    scenario: "large-governed-implementation",
    risk: "high",
    scope: ["scripts/ai-toolkit/kernel"],
    exclusions: ["deployment"],
    constraints: ["preserve existing user work"],
    authorizedActions: [
      "repository-read",
      "scoped-local-write",
      "project-validation"
    ],
    acceptanceCriteria: [
      {
        id: "AC-WAVES-1",
        statement: "Execution waves remain bounded and ownership-safe.",
        requiredGateIds: ["focused-tests"]
      }
    ],
    taskGateIds: ["focused-tests"],
    resolvedGateIds: ["focused-tests", "security-review"],
    ownership: {
      mode: "write",
      ownedPaths: ["scripts/ai-toolkit/kernel"]
    },
    dependencies: [],
    stopConditionRefs: ["stop:scope-change"],
    evidenceRefs: ["evidence:focused-tests"],
    contextRefs: ["context:task-contract"]
  });
  assert.ok(Object.isFrozen(builtAssignment));
  assert.ok(Object.isFrozen(builtAssignment.governedEnvelope));
  assert.ok(Object.isFrozen(builtAssignment.governedEnvelope.ownership.ownedPaths));
  assert.throws(
    () => builtAssignment.governedEnvelope.scope.push("mutation"),
    TypeError
  );

  const handoff = contracts.buildHandoffContract({
    assignment: builtAssignment,
    handoff: {
      id: "H-1",
      fromAgentId: "delivery-lead",
      toAgentId: "reviewer-agent",
      reason: "independent verification",
      status: "planned"
    }
  });
  const event = contracts.buildCollaborationEvent({
    assignment: builtAssignment,
    event: {
      id: "E-1",
      type: "handoff-planned",
      actorAgentId: "delivery-lead",
      sequence: 1
    }
  });
  const receipt = contracts.buildExecutionReceipt({
    assignment: builtAssignment,
    receipt: { id: "R-1", status: "planned" }
  });

  assert.strictEqual(handoff.governedEnvelope, builtAssignment.governedEnvelope);
  assert.strictEqual(event.governedEnvelope, builtAssignment.governedEnvelope);
  assert.strictEqual(receipt.governedEnvelope, builtAssignment.governedEnvelope);
  assert.ok(Object.isFrozen(handoff));
  assert.ok(Object.isFrozen(event));
  assert.ok(Object.isFrozen(receipt));
  assert.deepEqual(receipt.observation, {
    observed: false,
    invocationId: null,
    startedAt: null,
    completedAt: null,
    exitCode: null,
    outputHash: null,
    taskDigest: null,
    repositoryDigest: null
  });
  assert.equal(receipt.executionProof, null);
  assert.equal(receipt.receiptProof, null);
});

test("collaboration builders reject fabricated execution, completion, and receipt proof", async () => {
  const contracts = await collaborationContracts();
  assert.equal(typeof contracts.buildAssignmentContract, "function");

  const task = governedTask();
  const intent = assignment({
    id: "A-PLANNED",
    agentId: "delivery-lead",
    role: "lead",
    wave: 1
  });
  const assignmentWithProof = { ...intent, executionProof: "fabricated" };
  assert.throws(
    () => contracts.buildAssignmentContract({
      task,
      resolvedGateIds: ["focused-tests"],
      assignment: assignmentWithProof
    }),
    /assignment proof claims are forbidden/
  );

  const builtAssignment = contracts.buildAssignmentContract({
    task,
    resolvedGateIds: ["focused-tests"],
    assignment: intent
  });
  assert.throws(
    () => contracts.buildHandoffContract({
      assignment: builtAssignment,
      handoff: {
        id: "H-FAKE",
        fromAgentId: "delivery-lead",
        toAgentId: "reviewer-agent",
        reason: "fake completion",
        status: "completed"
      }
    }),
    /handoff status must remain planned/
  );
  assert.throws(
    () => contracts.buildCollaborationEvent({
      assignment: builtAssignment,
      event: {
        id: "E-FAKE",
        type: "execution-completed",
        actorAgentId: "delivery-lead",
        sequence: 1
      }
    }),
    /event type must be a non-execution collaboration event/
  );
  assert.throws(
    () => contracts.buildExecutionReceipt({
      assignment: builtAssignment,
      receipt: {
        id: "R-FAKE",
        status: "passed",
        verified: true,
        invocationId: "invocation-1",
        exitCode: 0
      }
    }),
    /observed or successful execution receipts require the full evidence contract; this builder emits planned unobserved receipts only/
  );

  const forgedAssignment = Object.freeze({
    schemaVersion: "1.0.0",
    kind: "assignment",
    id: "A-FORGED",
    agentId: "attacker",
    governedEnvelope: Object.freeze({ executionProof: "fabricated" })
  });
  assert.throws(
    () => contracts.buildExecutionReceipt({
      assignment: forgedAssignment,
      receipt: { id: "R-FORGED", status: "planned" }
    }),
    /assignment must be a validated immutable assignment contract created by buildAssignmentContract/
  );
});

test("execution-wave provenance rejects frozen caller-fabricated plans", () => {
  assert.equal(typeof teamPlanner.assertExecutionWavePlan, "function");
  const task = governedTask();
  const selectedResources = [agent("delivery-lead", ["lead"]), agent("reviewer", ["specialist", "verifier"])];
  const plan = buildExecutionWavePlan({
    task,
    resolvedGateIds: ["focused-tests"],
    selectedResources,
    trustedAssignmentIntents: [
      assignment({ id: "A-LEAD", agentId: "delivery-lead", role: "lead", wave: 1 }),
      assignment({ id: "A-REVIEW", agentId: "reviewer", role: "specialist", wave: 1 })
    ]
  });
  assert.equal(teamPlanner.assertExecutionWavePlan(plan), plan);

  const forged = Object.freeze({
    ...structuredClone(plan),
    executionStatus: "verified-for-release",
    actualExecutionProof: "fabricated"
  });
  assert.throws(
    () => teamPlanner.assertExecutionWavePlan(forged),
    /validated planner-created execution wave plan/
  );
});

test("blocked execution wave plans preserve no-execution posture when mandatory coverage is unavailable", () => {
  assert.equal(typeof teamPlanner.buildBlockedExecutionWavePlan, "function");
  const plan = teamPlanner.buildBlockedExecutionWavePlan({
    task: governedTask(),
    blockers: ["competency-uncovered:ios-native", "required-lead-unavailable"]
  });
  assert.equal(plan.executionStatus, "blocked");
  assert.deepEqual(plan.blockers, [
    "competency-uncovered:ios-native",
    "required-lead-unavailable"
  ]);
  assert.deepEqual(plan.waves, []);
  assert.deepEqual(plan.assignments, []);
  assert.equal(plan.actualExecutionProof, null);
  assert.equal(plan.receiptProof, null);
  assert.equal(teamPlanner.assertExecutionWavePlan(plan), plan);
});
