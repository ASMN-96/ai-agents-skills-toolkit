#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import { selectResources } from "./ai-toolkit/kernel/resource-router.mjs";
import { buildExecutionTeam } from "./ai-toolkit/kernel/delivery-kernel.mjs";

const DIGEST = "a".repeat(64);

function resource({
  id,
  type = "skill",
  competencies = [],
  roles = ["support"],
  cost = 1,
  authority = "internal-reviewed",
  lifecycle = "active",
  eligible,
  reasons,
  available,
  supported,
  freshness = "current",
  sandboxMode = "read-only",
  targetAffinity
}) {
  const runtimeAvailable = available ?? freshness === "current";
  const runtimeSupported = supported ?? runtimeAvailable;
  const resourceEligible = eligible ?? (
    lifecycle === "active"
    && runtimeAvailable
    && runtimeSupported
    && freshness === "current"
  );
  const eligibilityReasons = reasons ?? (
    resourceEligible ? [] : ["fixture-resource-not-eligible"]
  );
  const evidencePath = freshness === "absent" ? null : "sources/reviews/example.json";
  const contentDigest = freshness === "absent" ? null : DIGEST;
  const nativeKind = type === "agent"
    ? "codex-agent"
    : type === "skill"
      ? "codex-skill"
      : "project-script";

  const contract = {
    schemaVersion: "1.0.0",
    id,
    type,
    canonicalCompetencies: competencies.length > 0 ? competencies : ["routing-support"],
    eligibleRoles: roles,
    measuredContextCost: cost,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: cost * 3,
      evidencePath: "scripts/test-delivery-kernel-routing.mjs",
      contentDigest: DIGEST
    },
    authority,
    lifecycle,
    runtimePosture: {
      registryPresent: true,
      available: runtimeAvailable,
      supported: runtimeSupported,
      executionProof: false,
      sandboxMode: type === "agent" ? sandboxMode : "not-applicable",
      scopedLocalWrite: type === "agent" && sandboxMode === "workspace-write"
    },
    environmentRestrictions: {
      allowed: ["codex-project-runtime"],
      forbidden: []
    },
    detectionEvidence: {
      state: "observed",
      evidencePath: "scripts/test-delivery-kernel-routing.mjs",
      contentDigest: DIGEST
    },
    freshness: {
      state: freshness,
      evidencePath,
      contentDigest
    },
    nativeAdapter: { kind: nativeKind, id },
    commandReference: type === "tool" ? {
      kind: "project-script",
      manifestPath: "package.json",
      scriptName: "test:routing",
      digest: DIGEST
    } : null,
    eligibility: { eligible: resourceEligible, reasons: eligibilityReasons }
  };
  if (targetAffinity !== undefined) contract.targetAffinity = targetAffinity;
  return contract;
}

function task(requiredCompetencies, risk = "medium", authorizedActions = ["repository-read"]) {
  return { id: "TASK-ROUTING", requiredCompetencies, risk, authorizedActions };
}

function selectedIds(result) {
  return result.selected.map(({ id }) => id);
}

test("branch-and-bound returns the global minimum for the known greedy counterexample", () => {
  const resources = [
    resource({ id: "lead", type: "agent", roles: ["lead"], cost: 1 }),
    resource({ id: "greedy-four", competencies: ["a", "b", "c", "d"], cost: 1 }),
    resource({ id: "optimal-left", competencies: ["a", "b", "e"], cost: 1 }),
    resource({ id: "optimal-right", competencies: ["c", "d", "f"], cost: 1 }),
    resource({ id: "only-e", competencies: ["e"], cost: 1 }),
    resource({ id: "only-f", competencies: ["f"], cost: 1 })
  ];

  const result = selectResources({ task: task(["a", "b", "c", "d", "e", "f"]), resources });

  assert.deepEqual(selectedIds(result), ["lead", "optimal-left", "optimal-right"]);
  assert.deepEqual(result.uncoveredCompetencies, []);
  assert.equal(
    result.decisions.find(({ id }) => id === "greedy-four")?.decision,
    "eligible-not-selected"
  );
});

test("high and critical routing requires a verifier agent independent from the lead", () => {
  const resources = [
    resource({
      id: "lead",
      type: "agent",
      roles: ["lead", "verifier"],
      competencies: ["implementation", "verification"],
      cost: 1
    }),
    resource({
      id: "independent-verifier",
      type: "agent",
      roles: ["verifier"],
      competencies: ["verification"],
      cost: 2
    }),
    resource({
      id: "verification-skill",
      competencies: ["verification"],
      cost: 0
    })
  ];

  for (const risk of ["high", "critical"]) {
    const result = selectResources({
      task: task(["implementation", "verification"], risk),
      resources
    });
    assert.deepEqual(selectedIds(result), ["lead", "independent-verifier"], risk);
    assert.equal(result.requiredRoles.lead, "lead");
    assert.equal(result.requiredRoles.verifier, "independent-verifier");
  }
});

test("an explicit scenario-policy verifier requirement cannot be bypassed at medium risk", () => {
  const result = selectResources({
    task: {
      ...task(["implementation"], "medium"),
      requiredRoles: { lead: "required", verifier: "independent" }
    },
    resources: [
      resource({
        id: "delivery-lead",
        type: "agent",
        competencies: ["implementation"],
        roles: ["lead"]
      }),
      resource({
        id: "independent-reviewer",
        type: "agent",
        competencies: ["verification"],
        roles: ["specialist", "verifier"]
      })
    ]
  });
  assert.equal(result.requiredRoles.lead, "delivery-lead");
  assert.equal(result.requiredRoles.verifier, "independent-reviewer");
});

test("routing excludes every fail-closed lifecycle, eligibility, runtime, and freshness state", () => {
  const resources = [
    resource({ id: "lead", type: "agent", roles: ["lead"], cost: 1 }),
    resource({ id: "valid", competencies: ["implementation"], cost: 5 }),
    resource({ id: "experimental", competencies: ["implementation"], lifecycle: "experimental", cost: 0 }),
    resource({ id: "retired", competencies: ["implementation"], lifecycle: "retired", cost: 0 }),
    resource({ id: "quarantined", competencies: ["implementation"], lifecycle: "quarantined", cost: 0 }),
    resource({ id: "ineligible", competencies: ["implementation"], eligible: false, reasons: ["owner-approval-required"], cost: 0 }),
    resource({ id: "unavailable", competencies: ["implementation"], available: false, cost: 0 }),
    resource({ id: "unsupported", competencies: ["implementation"], supported: false, cost: 0 }),
    resource({ id: "stale", competencies: ["implementation"], freshness: "stale", cost: 0 })
  ];

  const result = selectResources({ task: task(["implementation"]), resources });
  assert.deepEqual(selectedIds(result), ["lead", "valid"]);
  for (const id of [
    "experimental",
    "retired",
    "quarantined",
    "ineligible",
    "unavailable",
    "unsupported",
    "stale"
  ]) {
    assert.notEqual(result.decisions.find((decision) => decision.id === id)?.decision, "selected", id);
  }
});

test("routing optimizes resource count, then context, authority/freshness, then stable id", () => {
  const baseLead = resource({ id: "lead", type: "agent", roles: ["lead"], cost: 0 });

  const fewer = selectResources({
    task: task(["a", "b"]),
    resources: [
      baseLead,
      resource({ id: "one-expensive", competencies: ["a", "b"], cost: 100 }),
      resource({ id: "two-a", competencies: ["a"], cost: 1 }),
      resource({ id: "two-b", competencies: ["b"], cost: 1 })
    ]
  });
  assert.deepEqual(selectedIds(fewer), ["lead", "one-expensive"]);

  const lowerContext = selectResources({
    task: task(["x"]),
    resources: [
      baseLead,
      resource({ id: "official-heavy", competencies: ["x"], cost: 9, authority: "official-standard" }),
      resource({ id: "internal-light", competencies: ["x"], cost: 2, authority: "internal-reviewed" })
    ]
  });
  assert.deepEqual(selectedIds(lowerContext), ["lead", "internal-light"]);

  const authority = selectResources({
    task: task(["x"]),
    resources: [
      baseLead,
      resource({ id: "vendor", competencies: ["x"], cost: 2, authority: "vendor-official" }),
      resource({ id: "standard", competencies: ["x"], cost: 2, authority: "official-standard" })
    ]
  });
  assert.deepEqual(selectedIds(authority), ["lead", "standard"]);

  const stable = selectResources({
    task: task(["x"]),
    resources: [
      baseLead,
      resource({
        id: "stable_id",
        type: "agent",
        roles: ["support"],
        competencies: ["x"],
        cost: 2
      }),
      resource({ id: "stable-id", competencies: ["x"], cost: 2 }),
      resource({ id: "zeta-dominated", competencies: ["x"], cost: 2 })
    ]
  });
  assert.deepEqual(selectedIds(stable), ["lead", "stable-id"]);
  assert.equal(
    stable.decisions.find(({ id }) => id === "zeta-dominated")?.decision,
    "dominated"
  );
  assert.equal(
    stable.decisions.find(({ id }) => id === "stable_id")?.decision,
    "eligible-not-selected"
  );
});

test("scenario preferences minimize fallback resources before context without becoming an allowlist", () => {
  const preferredLead = resource({
    id: "preferred-lead",
    type: "agent",
    roles: ["lead"],
    cost: 1
  });
  const preferredExpensive = resource({
    id: "preferred-expensive",
    competencies: ["architecture"],
    cost: 20
  });
  const fallbackCheap = resource({
    id: "fallback-cheap",
    competencies: ["architecture"],
    cost: 1
  });
  const fallbackAdditive = resource({
    id: "fallback-additive",
    competencies: ["domain-escalation"],
    cost: 1
  });

  const result = selectResources({
    task: {
      ...task(["architecture", "domain-escalation"]),
      resourcePreferences: {
        agentIds: ["preferred-lead"],
        skillIds: ["preferred-expensive"],
        toolIds: []
      }
    },
    resources: [preferredLead, preferredExpensive, fallbackCheap, fallbackAdditive]
  });

  assert.deepEqual(selectedIds(result), [
    "preferred-lead",
    "fallback-additive",
    "preferred-expensive"
  ]);
  assert.deepEqual(result.preferenceAccounting, {
    preferredResourceIds: ["preferred-expensive", "preferred-lead"],
    selectedPreferredResourceIds: ["preferred-expensive", "preferred-lead"],
    selectedFallbackResourceIds: ["fallback-additive"],
    unselectedPreferredResourceIds: []
  });
  assert.equal(
    result.decisions.find(({ id }) => id === "fallback-cheap")?.decision,
    "dominated"
  );
});

test("fewest-resource coverage remains ahead of scenario preference scoring", () => {
  const result = selectResources({
    task: {
      ...task(["a", "b"]),
      resourcePreferences: {
        agentIds: ["lead"],
        skillIds: ["preferred-a", "preferred-b"],
        toolIds: []
      }
    },
    resources: [
      resource({ id: "lead", type: "agent", roles: ["lead"] }),
      resource({ id: "preferred-a", competencies: ["a"], cost: 1 }),
      resource({ id: "preferred-b", competencies: ["b"], cost: 1 }),
      resource({ id: "fallback-combined", competencies: ["a", "b"], cost: 100 })
    ]
  });

  assert.deepEqual(selectedIds(result), ["lead", "fallback-combined"]);
  assert.deepEqual(result.preferenceAccounting.selectedFallbackResourceIds, ["fallback-combined"]);
});

test("routing rejects forged current freshness evidence at the low-level boundary", () => {
  const forged = resource({
    id: "forged-current",
    competencies: ["implementation"]
  });
  forged.freshness = {
    state: "current",
    evidencePath: null,
    contentDigest: null
  };

  assert.throws(
    () => selectResources({
      task: task(["implementation"]),
      resources: [
        resource({ id: "lead", type: "agent", roles: ["lead"] }),
        forged
      ]
    }),
    /invalid ResourceContract v1: .*freshness\.current requires evidencePath and contentDigest/
  );
});

test("routing rejects malformed eligibility reasons at the low-level boundary", () => {
  const malformed = resource({
    id: "malformed-reasons",
    competencies: ["implementation"]
  });
  malformed.eligibility = { eligible: true, reasons: "owner-approval-required" };

  assert.throws(
    () => selectResources({
      task: task(["implementation"]),
      resources: [
        resource({ id: "lead", type: "agent", roles: ["lead"] }),
        malformed
      ]
    }),
    /invalid ResourceContract v1: .*eligibility\.reasons must be an array/
  );
});

test("routing fails closed when the deterministic exact-search candidate budget is exceeded", () => {
  const requiredCompetencies = Array.from(
    { length: 64 },
    (_, index) => `candidate-budget-${String(index).padStart(2, "0")}`
  );
  const resources = [
    resource({ id: "candidate-budget-lead", type: "agent", roles: ["lead"] }),
    ...requiredCompetencies.map((competency, index) => resource({
      id: `candidate-budget-resource-${String(index).padStart(2, "0")}`,
      competencies: [competency]
    }))
  ];

  assert.throws(
    () => selectResources({ task: task(requiredCompetencies), resources }),
    (error) => error?.code === "routing-search-budget-exceeded"
      && error.message === "routing-search-budget-exceeded"
  );
});

test("irrelevant eligible resources are pruned before the exact-search candidate budget", () => {
  const resources = [
    resource({ id: "relevant-lead", type: "agent", roles: ["lead"] }),
    resource({ id: "relevant-check", competencies: ["required-check"] }),
    ...Array.from({ length: 80 }, (_, index) => resource({
      id: `irrelevant-${String(index).padStart(2, "0")}`,
      competencies: [`unused-${String(index).padStart(2, "0")}`]
    }))
  ];

  const result = selectResources({ task: task(["required-check"]), resources });
  assert.deepEqual(selectedIds(result), ["relevant-lead", "relevant-check"]);
  assert.deepEqual(result.blockedReasons, []);
});

test("read-only routing excludes fixed workspace-write agents unless scoped write is authorized", () => {
  const resources = [
    resource({ id: "least-privilege-lead", type: "agent", roles: ["lead"] }),
    resource({
      id: "fixed-writer",
      type: "agent",
      roles: ["specialist"],
      competencies: ["implementation"],
      sandboxMode: "workspace-write",
      targetAffinity: { platforms: ["web-saas"], frameworkOverlays: [] }
    })
  ];

  const readOnly = selectResources({ task: task(["implementation"]), resources });
  assert.deepEqual(selectedIds(readOnly), []);
  assert.deepEqual(readOnly.uncoveredCompetencies, ["implementation"]);
  assert.equal(
    readOnly.decisions.find(({ id }) => id === "fixed-writer")?.decision,
    "task-permission-mismatch"
  );

  const writeAuthorized = selectResources({
    task: {
      ...task(["implementation"], "medium", ["repository-read", "scoped-local-write"]),
      targets: { platforms: ["web-saas"], frameworkOverlays: [] }
    },
    resources
  });
  assert.deepEqual(selectedIds(writeAuthorized), ["least-privilege-lead", "fixed-writer"]);
  assert.deepEqual(writeAuthorized.blockedReasons, []);
});

test("a support skill cannot satisfy the hard scoped-write implementation-owner constraint", () => {
  const result = selectResources({
    task: {
      ...task(["implementation"], "medium", ["repository-read", "scoped-local-write"]),
      targets: { platforms: [], frameworkOverlays: [] }
    },
    resources: [
      resource({ id: "architect", type: "agent", roles: ["lead"] }),
      resource({ id: "implementation-skill", competencies: ["implementation"] })
    ]
  });

  assert.deepEqual(selectedIds(result), []);
  assert.deepEqual(result.uncoveredCompetencies, []);
  assert.deepEqual(result.blockedReasons, [
    "scoped-local-write:no-eligible-implementation-writer"
  ]);
  assert.equal(
    result.decisions.find(({ id }) => id === "implementation-skill")?.decision,
    "blocked-by-writer"
  );
});

test("generic high-risk write blocks instead of selecting an untargeted platform writer", () => {
  const result = selectResources({
    task: {
      ...task(
        ["implementation", "verification"],
        "high",
        ["repository-read", "scoped-local-write"]
      ),
      targets: { platforms: [], frameworkOverlays: [] },
      resourcePreferences: { agentIds: ["architect", "verifier"], skillIds: [], toolIds: [] }
    },
    resources: [
      resource({ id: "architect", type: "agent", roles: ["lead"] }),
      resource({
        id: "verifier",
        type: "agent",
        roles: ["verifier"],
        competencies: ["verification"]
      }),
      resource({ id: "implementation-skill", competencies: ["implementation"] }),
      resource({
        id: "mobile-writer",
        type: "agent",
        roles: ["specialist"],
        competencies: ["implementation"],
        sandboxMode: "workspace-write",
        targetAffinity: {
          platforms: ["ios", "android"],
          frameworkOverlays: ["expo-react-native"]
        }
      }),
      resource({
        id: "desktop-writer",
        type: "agent",
        roles: ["specialist"],
        competencies: ["implementation"],
        sandboxMode: "workspace-write",
        targetAffinity: {
          platforms: ["windows-desktop", "macos-desktop"],
          frameworkOverlays: ["electron", "tauri"]
        }
      })
    ]
  });

  assert.deepEqual(selectedIds(result), []);
  assert.deepEqual(result.blockedReasons, [
    "scoped-local-write:no-eligible-implementation-writer"
  ]);
  for (const id of ["mobile-writer", "desktop-writer"]) {
    assert.equal(
      result.decisions.find((decision) => decision.id === id)?.decision,
      "writer-target-mismatch",
      id
    );
  }
});

test("explicit web, mobile, and desktop intent admits only a target-matched fallback writer", () => {
  const cases = [
    {
      expected: "frontend-writer",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] }
    },
    {
      expected: "mobile-writer",
      targets: { platforms: ["ios"], frameworkOverlays: ["expo-react-native"] }
    },
    {
      expected: "desktop-writer",
      targets: { platforms: ["windows-desktop"], frameworkOverlays: ["electron"] }
    }
  ];
  const writers = [
    resource({
      id: "frontend-writer",
      type: "agent",
      roles: ["specialist"],
      competencies: ["implementation"],
      sandboxMode: "workspace-write",
      targetAffinity: { platforms: ["web-saas"], frameworkOverlays: [] }
    }),
    resource({
      id: "mobile-writer",
      type: "agent",
      roles: ["specialist"],
      competencies: ["implementation"],
      sandboxMode: "workspace-write",
      targetAffinity: {
        platforms: ["ios", "android"],
        frameworkOverlays: ["expo-react-native"]
      }
    }),
    resource({
      id: "desktop-writer",
      type: "agent",
      roles: ["specialist"],
      competencies: ["implementation"],
      sandboxMode: "workspace-write",
      targetAffinity: {
        platforms: ["windows-desktop", "macos-desktop"],
        frameworkOverlays: ["electron", "tauri"]
      }
    })
  ];

  for (const fixture of cases) {
    const result = selectResources({
      task: {
        ...task(["implementation"], "medium", ["repository-read", "scoped-local-write"]),
        targets: fixture.targets,
        resourcePreferences: { agentIds: ["architect"], skillIds: [], toolIds: [] }
      },
      resources: [
        resource({ id: "architect", type: "agent", roles: ["lead"] }),
        ...writers
      ]
    });

    assert.deepEqual(selectedIds(result), ["architect", fixture.expected]);
    assert.deepEqual(result.preferenceAccounting.selectedFallbackResourceIds, [fixture.expected]);
    assert.deepEqual(result.blockedReasons, []);
    for (const writer of writers.filter(({ id }) => id !== fixture.expected)) {
      assert.equal(
        result.decisions.find(({ id }) => id === writer.id)?.decision,
        "writer-target-mismatch"
      );
    }
  }
});

test("a scenario-preferred backend writer is eligible without generic platform or docs affinity", () => {
  const result = selectResources({
    task: {
      ...task(["implementation"], "medium", ["repository-read", "scoped-local-write"]),
      targets: { platforms: [], frameworkOverlays: [] },
      resourcePreferences: {
        agentIds: ["architect", "backend-writer"],
        skillIds: [],
        toolIds: []
      }
    },
    resources: [
      resource({ id: "architect", type: "agent", roles: ["lead"] }),
      resource({
        id: "backend-writer",
        type: "agent",
        roles: ["specialist"],
        competencies: ["implementation", "api-contracts"],
        sandboxMode: "workspace-write",
        targetAffinity: { platforms: [], frameworkOverlays: [] }
      })
    ]
  });

  assert.deepEqual(selectedIds(result), ["architect", "backend-writer"]);
  assert.deepEqual(result.preferenceAccounting.selectedFallbackResourceIds, []);
});

test("low-risk read-only routing stays deterministic while the write form blocks honestly", () => {
  const resources = [
    resource({ id: "architect", type: "agent", roles: ["lead"] }),
    resource({ id: "governance", competencies: ["governance"] }),
    resource({
      id: "mobile-writer",
      type: "agent",
      roles: ["specialist"],
      competencies: ["implementation"],
      sandboxMode: "workspace-write",
      targetAffinity: { platforms: ["ios"], frameworkOverlays: [] }
    })
  ];
  const preferences = { agentIds: ["architect"], skillIds: ["governance"], toolIds: [] };
  const readOnlyTask = {
    ...task(["governance"], "low"),
    targets: { platforms: [], frameworkOverlays: [] },
    resourcePreferences: preferences
  };

  const first = selectResources({ task: readOnlyTask, resources });
  const second = selectResources({ task: readOnlyTask, resources });
  assert.deepEqual(selectedIds(first), ["architect", "governance"]);
  assert.equal(JSON.stringify(first), JSON.stringify(second));

  const write = selectResources({
    task: {
      ...readOnlyTask,
      authorizedActions: ["repository-read", "scoped-local-write"]
    },
    resources
  });
  assert.deepEqual(selectedIds(write), []);
  assert.deepEqual(write.blockedReasons, [
    "scoped-local-write:no-eligible-implementation-writer"
  ]);
});

test("routing fails closed instead of approximating an adversarial exact-cover search", () => {
  const requiredCompetencies = Array.from(
    { length: 12 },
    (_, index) => `node-budget-${String(index).padStart(2, "0")}`
  );
  const resources = [
    resource({ id: "a-node-budget-lead", type: "agent", roles: ["lead"] })
  ];
  requiredCompetencies.forEach((competency, index) => {
    const suffix = String(index).padStart(2, "0");
    resources.push(resource({
      id: `c-cheap-${suffix}`,
      competencies: [competency],
      cost: 1,
      authority: "community-reviewed"
    }));
    resources.push(resource({
      id: `o-official-${suffix}`,
      competencies: [competency],
      cost: 2,
      authority: "official-standard"
    }));
  });

  assert.throws(
    () => selectResources({ task: task(requiredCompetencies), resources }),
    (error) => error?.code === "routing-search-budget-exceeded"
      && error.message === "routing-search-budget-exceeded"
  );
});

test("routing labels a feasible resource blocked by an unavailable required role when no solution exists", () => {
  const result = selectResources({
    task: task(["implementation"]),
    resources: [resource({ id: "implementation-skill", competencies: ["implementation"] })]
  });

  assert.deepEqual(selectedIds(result), []);
  assert.deepEqual(result.decisions, [
    { id: "implementation-skill", decision: "blocked-by-role" }
  ]);
  assert.deepEqual(result.uncoveredCompetencies, []);
  assert.deepEqual(result.blockedReasons, ["required-lead-unavailable"]);
  const team = buildExecutionTeam({
    task: task(["implementation"]),
    routing: result,
    resolvedGateIds: []
  });
  assert.equal(team.executionStatus, "blocked");
  assert.deepEqual(team.blockers, ["required-lead-unavailable"]);
});

test("routing reports only aggregate capability gaps when an eligible lead exists", () => {
  const result = selectResources({
    task: task(["implementation"]),
    resources: [resource({ id: "lead", type: "agent", roles: ["lead"] })]
  });
  assert.deepEqual(result.uncoveredCompetencies, ["implementation"]);
  assert.deepEqual(result.blockedReasons, ["competency-uncovered:implementation"]);
});

test("routing serialization is deterministic for equivalent repeated input", () => {
  const input = {
    task: task(["architecture", "verification"], "high"),
    resources: [
      resource({ id: "lead", type: "agent", roles: ["lead"], competencies: ["architecture"] }),
      resource({ id: "verifier", type: "agent", roles: ["verifier"], competencies: ["verification"] }),
      resource({ id: "duplicate", competencies: ["architecture", "verification"], cost: 10 })
    ]
  };

  assert.equal(JSON.stringify(selectResources(input)), JSON.stringify(selectResources(input)));
});
