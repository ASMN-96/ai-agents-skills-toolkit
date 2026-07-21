#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import {
  assertDeliveryRequest,
  assertDomainGate,
  DELIVERY_REQUEST_PLATFORM_IDS,
  DOMAIN_GATE_BLOCKING_STAGES,
  DOMAIN_GATE_EVIDENCE_TYPES,
  DOMAIN_GATE_VERIFIER_KINDS
} from "./ai-toolkit/kernel/contracts.mjs";
import {
  loadDomainRegistry,
  resolveDomainPack,
  resolveDomainSelection
} from "./ai-toolkit/kernel/domain-packs.mjs";
import { buildCodexExecutionPlan } from "./ai-toolkit/kernel/codex-adapter.mjs";
import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import {
  readPinnedDeliveryRequest,
  TEST_REPOSITORY_ROOT
} from "./test-support/live-repository-fixture.mjs";

const REGISTERED_SCENARIOS = new Set(["large-governed-implementation"]);

function validGate(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    id: "enterprise-design-decision",
    applicability: {
      platformIds: [],
      frameworkOverlayIds: [],
      scenarioIds: [],
      riskLevels: ["low", "medium", "high", "critical"]
    },
    requiredCompetencies: ["architecture"],
    environmentRequirements: {
      allOf: [],
      anyOf: []
    },
    verifierKinds: ["owner-review"],
    evidenceType: "review-receipt",
    blockingStage: "verified-for-review",
    authoritativeSourceRefs: [
      {
        sourceId: "nist-ssdf",
        locator: "SP 800-218"
      }
    ],
    ...overrides
  };
}

function validRequest(platforms, frameworkOverlays = []) {
  return {
    schemaVersion: "1.0.0",
    task: {
      id: "TASK-DOMAIN-1",
      goal: "Resolve governed platform gates",
      scenario: "large-governed-implementation",
      scope: ["scripts/ai-toolkit/kernel"],
      exclusions: ["deployment"],
      constraints: ["preserve user work"],
      risk: "high",
      targets: { platforms, frameworkOverlays },
      authorizedActions: ["repository-read", "project-validation"],
      acceptanceCriteria: [
        {
          id: "domain-gates-resolve",
          statement: "The policy-derived domain gates are present",
          requiredGateIds: ["domain-gates-resolve"]
        }
      ],
      competencies: [],
      gates: ["domain-gates-resolve"]
    },
    repository: {
      root: ".",
      expectedCommit: "a".repeat(40)
    },
    contextPolicy: {
      mode: "standard",
      modelWindowTokens: 64000,
      maxInputFraction: 0.35
    }
  };
}

test("DomainGate v1 closes every structured field and enum", () => {
  const gate = assertDomainGate(validGate());
  assert.equal(Object.isFrozen(gate), true);
  assert.deepEqual([...DOMAIN_GATE_VERIFIER_KINDS].sort(), [
    "accessibility-audit",
    "browser-runtime",
    "integration-test",
    "native-build",
    "owner-review",
    "packaging-install-rollback",
    "performance-profile",
    "security-review",
    "simulator-device",
    "static-analysis",
    "unit-test"
  ]);
  assert.deepEqual([...DOMAIN_GATE_EVIDENCE_TYPES].sort(), [
    "observed-artifact",
    "observed-command-receipt",
    "observed-verification-receipt",
    "repository-fact",
    "review-receipt"
  ]);
  assert.deepEqual([...DOMAIN_GATE_BLOCKING_STAGES].sort(), [
    "verified-for-release",
    "verified-for-review"
  ]);

  assert.throws(
    () => assertDomainGate(validGate({ callerReady: true })),
    /callerReady is not allowed/
  );
  assert.throws(
    () => assertDomainGate(validGate({ verifierKinds: ["manual-claim"] })),
    /verifierKinds\[0\].*closed enum/
  );
  assert.throws(
    () => assertDomainGate(validGate({ evidenceType: "planned" })),
    /evidenceType.*closed enum/
  );
  assert.throws(
    () => assertDomainGate(validGate({ blockingStage: "planned" })),
    /blockingStage.*closed enum/
  );
  assert.throws(
    () => assertDomainGate(validGate({ authoritativeSourceRefs: [] })),
    /authoritativeSourceRefs must not be empty/
  );
  assert.throws(
    () => assertDomainGate(validGate({
      applicability: {
        platformIds: [],
        frameworkOverlayIds: [],
        scenarioIds: [],
        riskLevels: []
      }
    })),
    /applicability must declare at least one explicit/
  );
  assert.throws(
    () => assertDomainGate(validGate({ verifierKinds: ["unit-test", "integration-test"] })),
    /mandatory evidence dimensions require atomic gate IDs/
  );
});

test("the canonical schema-2 registry contains core, five platforms, three overlays, and one deprecated alias", async () => {
  const registry = await loadDomainRegistry();
  assert.equal(registry.schemaVersion, "2.0.0");
  assert.deepEqual(registry.packs.map((pack) => pack.id), [
    "enterprise-core",
    "web-saas",
    "ios",
    "android",
    "windows-desktop",
    "macos-desktop",
    "expo-react-native",
    "electron",
    "tauri"
  ]);
  assert.deepEqual(registry.aliases.map((alias) => alias.id), ["cross-platform-desktop"]);
  assert.ok(registry.packs.every((pack) => pack.gates.length > 0));
  assert.ok(registry.packs.flatMap((pack) => pack.gates).every((gate) => gate.schemaVersion === "1.0.0"));
  assert.ok(
    registry.packs.flatMap((pack) => pack.gates).every((gate) => gate.verifierKinds.length === 1),
    "mandatory evidence dimensions must be represented as atomic gates"
  );
  assert.ok(
    registry.packs.flatMap((pack) => pack.gates).every((gate) => (
      gate.applicability.platformIds.length > 0
      || gate.applicability.frameworkOverlayIds.length > 0
      || gate.applicability.scenarioIds.length > 0
      || gate.applicability.riskLevels.length > 0
    )),
    "canonical gates must declare explicit applicability instead of an implicit all-empty wildcard"
  );
});

test("low-risk documentation work stays proportional and does not inherit platform engineering gates", async () => {
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "small-low-risk-typo-doc-change",
      risk: "low",
      targets: { platforms: [], frameworkOverlays: [] }
    },
    environmentCapabilities: []
  });

  assert.deepEqual(result.selectedPackIds, ["enterprise-core"]);
  assert.deepEqual(result.resolvedGateIds, ["enterprise-low-risk-scope-review"]);
  assert.deepEqual(result.requiredCompetencies, ["governance", "verification"]);
  assert.equal(result.status, "planned");
});

test("high-risk work requires an explicit adversarial review obligation", async () => {
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "high",
      targets: { platforms: [], frameworkOverlays: [] }
    },
    environmentCapabilities: []
  });

  assert.ok(result.resolvedGateIds.includes("enterprise-adversarial-review"));
  assert.ok(result.requiredCompetencies.includes("adversarial-review"));
  const gate = result.gates.find((entry) => entry.id === "enterprise-adversarial-review");
  assert.deepEqual(gate.verifierKinds, ["static-analysis"]);
  assert.equal(gate.blockingStage, "verified-for-review");
});

test("stateful API and migration scenarios require bounded failure-semantics evidence", async () => {
  const registry = await loadDomainRegistry();
  for (const scenario of [
    "api-contract-change",
    "supabase-rls-migration",
    "generic-postgres-orm-data-isolation",
    "cross-surface-api-contracts"
  ]) {
    const result = resolveDomainSelection({
      registry,
      task: {
        scenario,
        risk: "high",
        targets: { platforms: [], frameworkOverlays: [] }
      },
      environmentCapabilities: []
    });
    assert.ok(result.resolvedGateIds.includes("stateful-failure-semantics"), scenario);
    assert.ok(result.requiredCompetencies.includes("failure-semantics"), scenario);
  }

  const documentation = resolveDomainSelection({
    registry,
    task: {
      scenario: "small-low-risk-typo-doc-change",
      risk: "low",
      targets: { platforms: [], frameworkOverlays: [] }
    },
    environmentCapabilities: []
  });
  assert.equal(documentation.resolvedGateIds.includes("stateful-failure-semantics"), false);
});

test("version-sensitive scenarios require exact-or-unresolved stack evidence without burdening docs", async () => {
  const registry = await loadDomainRegistry();
  for (const scenario of [
    "dependency-supply-chain-review",
    "external-tool-source-update",
    "missing-capability-skill-discovery",
    "package-manager-workspace-migration",
    "react-typescript-quality-change",
    "ai-agent-system-change"
  ]) {
    const result = resolveDomainSelection({
      registry,
      task: {
        scenario,
        risk: "high",
        targets: { platforms: [], frameworkOverlays: [] }
      },
      environmentCapabilities: []
    });
    assert.ok(result.resolvedGateIds.includes("stack-version-evidence"), scenario);
    assert.ok(result.requiredCompetencies.includes("technical-research"), scenario);
  }

  const documentation = resolveDomainSelection({
    registry,
    task: {
      scenario: "small-low-risk-typo-doc-change",
      risk: "low",
      targets: { platforms: [], frameworkOverlays: [] }
    },
    environmentCapabilities: []
  });
  assert.equal(documentation.resolvedGateIds.includes("stack-version-evidence"), false);
});

test("critical work receives explicit approval, recovery, rollout, and monitoring obligations", async () => {
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "critical",
      targets: { platforms: [], frameworkOverlays: [] }
    },
    environmentCapabilities: []
  });

  for (const gateId of [
    "enterprise-critical-owner-approval",
    "enterprise-critical-recovery-restore",
    "enterprise-critical-staged-rollout",
    "enterprise-critical-heightened-monitoring"
  ]) {
    assert.ok(result.resolvedGateIds.includes(gateId), gateId);
  }
});

test("domain resolution always unions enterprise core with every platform and applicable overlay", async () => {
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "high",
      targets: {
        platforms: ["web-saas", "ios"],
        frameworkOverlays: ["expo-react-native"]
      }
    },
    environmentCapabilities: ["node", "browser", "macos", "xcode", "simulator-or-device"]
  });

  assert.equal(result.status, "planned");
  assert.equal(result.readinessCeiling, "planned");
  assert.equal(result.effectiveMaturity, "preview");
  assert.deepEqual(result.packMaturities, [
    { packId: "enterprise-core", declaredMaturity: "supported", effectiveMaturity: "supported" },
    { packId: "web-saas", declaredMaturity: "preview", effectiveMaturity: "preview" },
    { packId: "ios", declaredMaturity: "preview", effectiveMaturity: "preview" },
    { packId: "expo-react-native", declaredMaturity: "preview", effectiveMaturity: "preview" }
  ]);
  assert.deepEqual(result.selectedPackIds, ["enterprise-core", "web-saas", "ios", "expo-react-native"]);
  assert.ok(result.resolvedGateIds.some((id) => id.startsWith("enterprise-")));
  assert.ok(result.resolvedGateIds.some((id) => id.startsWith("web-")));
  assert.ok(result.resolvedGateIds.some((id) => id.startsWith("ios-")));
  assert.ok(result.resolvedGateIds.some((id) => id.startsWith("expo-")));
  assert.equal(new Set(result.resolvedGateIds).size, result.resolvedGateIds.length);
  assert.equal(new Set(result.requiredCompetencies).size, result.requiredCompetencies.length);
  assert.equal(result.platformVerification, false);
  assert.equal(result.releaseReadiness, false);
});

test("domain maturity keeps supported enterprise core distinct from preview web", async () => {
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "medium",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] }
    },
    environmentCapabilities: ["node", "browser"]
  });

  assert.equal(result.status, "planned");
  assert.equal(result.effectiveMaturity, "preview");
  assert.deepEqual(result.packMaturities, [
    { packId: "enterprise-core", declaredMaturity: "supported", effectiveMaturity: "supported" },
    { packId: "web-saas", declaredMaturity: "preview", effectiveMaturity: "preview" }
  ]);
});

test("a selected pack declared unavailable blocks its applicable gates with a stable maturity blocker", async () => {
  const registry = structuredClone(await loadDomainRegistry());
  registry.packs.find((pack) => pack.id === "web-saas").maturity = "unavailable";
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "medium",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] }
    },
    environmentCapabilities: ["node", "browser"]
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.effectiveMaturity, "unavailable");
  assert.deepEqual(result.packMaturities, [
    { packId: "enterprise-core", declaredMaturity: "supported", effectiveMaturity: "supported" },
    { packId: "web-saas", declaredMaturity: "unavailable", effectiveMaturity: "unavailable" }
  ]);
  const blocker = result.blockers.find((entry) => entry.packId === "web-saas");
  assert.equal(blocker?.code, "pack-maturity-unavailable");
  assert.deepEqual(blocker?.missingCapabilities, []);
  assert.deepEqual(blocker?.gateIds, result.gates
    .filter((gate) => gate.applicability.platformIds.includes("web-saas"))
    .map((gate) => gate.id));
  assert.ok(blocker.gateIds.every((id) => result.blockedGateIds.includes(id)));
  assert.equal(result.platformVerification, false);
  assert.equal(result.releaseReadiness, false);
});

test("deprecated desktop alias requires an explicit OS and never becomes a selected pack", async () => {
  assert.ok(!DELIVERY_REQUEST_PLATFORM_IDS.includes("cross-platform-desktop"));
  assert.throws(
    () => assertDeliveryRequest(validRequest(["cross-platform-desktop"]), {
      registeredScenarios: REGISTERED_SCENARIOS,
      policyGateIds: []
    }),
    /cross-platform-desktop is deprecated and requires at least one explicit OS target/
  );

  const accepted = assertDeliveryRequest(
    validRequest(["cross-platform-desktop", "windows-desktop"]),
    { registeredScenarios: REGISTERED_SCENARIOS, policyGateIds: [] }
  );
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: accepted.task,
    environmentCapabilities: ["windows", "native-packaging"]
  });
  assert.deepEqual(result.selectedPackIds, ["enterprise-core", "windows-desktop"]);
  assert.deepEqual(result.warnings, [
    {
      code: "deprecated-target-alias",
      target: "cross-platform-desktop"
    }
  ]);
});

test("framework overlays reject incompatible platform targets", async () => {
  const registry = await loadDomainRegistry();
  const cases = [
    { platforms: ["windows-desktop"], overlay: "expo-react-native" },
    { platforms: ["web-saas"], overlay: "electron" },
    { platforms: ["web-saas"], overlay: "tauri" }
  ];
  for (const entry of cases) {
    assert.throws(
      () => resolveDomainSelection({
        registry,
        task: {
          scenario: "large-governed-implementation",
          risk: "medium",
          targets: {
            platforms: entry.platforms,
            frameworkOverlays: [entry.overlay]
          }
        },
        environmentCapabilities: []
      }),
      /framework overlay .* is incompatible with the selected platforms/
    );
  }
});

test("missing native environments block platform verification while satisfied environments remain only planned", async () => {
  const registry = await loadDomainRegistry();
  const task = {
    scenario: "large-governed-implementation",
    risk: "high",
    targets: {
      platforms: ["ios"],
      frameworkOverlays: []
    }
  };
  const blocked = resolveDomainSelection({ registry, task, environmentCapabilities: [] });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.readinessCeiling, "planned");
  assert.deepEqual(blocked.selectedPackIds, ["enterprise-core", "ios"]);
  assert.ok(blocked.missingEnvironmentCapabilities.includes("macos"));
  assert.ok(blocked.missingEnvironmentCapabilities.includes("xcode"));
  assert.ok(blocked.blockedGateIds.length > 0);
  assert.ok(blocked.blockers.every((blocker) => blocker.code === "native-environment-unavailable"));
  assert.equal(blocked.platformVerification, false);
  assert.equal(blocked.releaseReadiness, false);

  const satisfied = resolveDomainSelection({
    registry,
    task,
    environmentCapabilities: ["macos", "xcode", "simulator-or-device"]
  });
  assert.equal(satisfied.status, "planned");
  assert.deepEqual(satisfied.missingEnvironmentCapabilities, []);
  assert.deepEqual(satisfied.blockedGateIds, []);
  assert.equal(satisfied.platformVerification, false);
  assert.equal(satisfied.releaseReadiness, false);
});

test("native preview platforms require their target capabilities without downgrading enterprise core", async () => {
  const registry = await loadDomainRegistry();
  const cases = [
    {
      platform: "ios",
      capabilities: ["macos", "xcode", "simulator-or-device"],
      gateIds: [
        "ios-native-quality-accessibility",
        "ios-simulator-device-behavior",
        "ios-accessibility-audit",
        "ios-privacy-performance-release",
        "ios-performance-profile",
        "ios-packaging-install-rollback"
      ]
    },
    {
      platform: "android",
      capabilities: ["android-sdk", "emulator-or-device"],
      gateIds: [
        "android-native-quality-accessibility",
        "android-emulator-device-behavior",
        "android-accessibility-audit",
        "android-security-performance-release",
        "android-performance-profile",
        "android-packaging-install-rollback"
      ]
    },
    {
      platform: "windows-desktop",
      capabilities: ["windows", "native-packaging"],
      gateIds: [
        "windows-native-quality-accessibility",
        "windows-accessibility-audit",
        "windows-security-packaging-rollback",
        "windows-performance-profile",
        "windows-packaging-install-rollback"
      ]
    },
    {
      platform: "macos-desktop",
      capabilities: ["macos", "xcode"],
      gateIds: [
        "macos-native-quality-accessibility",
        "macos-accessibility-audit",
        "macos-privacy-performance-release",
        "macos-performance-profile",
        "macos-packaging-install-rollback"
      ]
    }
  ];

  for (const { platform, capabilities, gateIds } of cases) {
    const task = {
      scenario: "large-governed-implementation",
      risk: "high",
      targets: { platforms: [platform], frameworkOverlays: [] }
    };
    const blocked = resolveDomainSelection({ registry, task, environmentCapabilities: [] });
    const core = blocked.packMaturities.find((entry) => entry.packId === "enterprise-core");
    const native = blocked.packMaturities.find((entry) => entry.packId === platform);
    const blocker = blocked.blockers.find((entry) => entry.packId === platform);

    assert.equal(blocked.status, "blocked");
    assert.deepEqual([...blocked.missingEnvironmentCapabilities].sort(), [...capabilities].sort());
    assert.deepEqual(blocked.blockers.map(({ packId }) => packId), [platform]);
    assert.deepEqual(blocked.blockedGateIds, gateIds);
    assert.deepEqual(blocker?.gateIds, gateIds);
    assert.deepEqual(
      blocked.gates
        .filter((gate) => gate.applicability.platformIds.includes(platform))
        .map((gate) => gate.id),
      gateIds
    );
    assert.deepEqual(core, {
      packId: "enterprise-core",
      declaredMaturity: "supported",
      effectiveMaturity: "supported"
    });
    assert.deepEqual(native, {
      packId: platform,
      declaredMaturity: "preview",
      effectiveMaturity: "unavailable"
    });
    assert.equal(blocker?.code, "native-environment-unavailable");
    assert.deepEqual([...(blocker?.missingCapabilities ?? [])].sort(), [...capabilities].sort());
    assert.equal(blocked.platformVerification, false);
    assert.equal(blocked.releaseReadiness, false);

    const planned = resolveDomainSelection({ registry, task, environmentCapabilities: capabilities });
    assert.equal(planned.status, "planned");
    assert.equal(planned.effectiveMaturity, "preview");
    assert.deepEqual(planned.missingEnvironmentCapabilities, []);
    assert.equal(planned.packMaturities.find((entry) => entry.packId === "enterprise-core")?.effectiveMaturity, "supported");
    assert.equal(planned.packMaturities.find((entry) => entry.packId === platform)?.effectiveMaturity, "preview");
    assert.equal(planned.platformVerification, false);
    assert.equal(planned.releaseReadiness, false);
  }
});

test("web environment blockers are not mislabeled as native environment failures", async () => {
  const registry = await loadDomainRegistry();
  const result = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "medium",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] }
    },
    environmentCapabilities: []
  });
  const blocker = result.blockers.find((entry) => entry.packId === "web-saas");
  assert.equal(blocker?.code, "required-environment-unavailable");
});

test("legacy single-pack resolution rejects schema-2 packs with a precise migration error", async () => {
  const registry = await loadDomainRegistry();
  const ios = registry.packs.find((pack) => pack.id === "ios");
  assert.throws(
    () => resolveDomainPack({ pack: ios, environmentCapabilities: [] }),
    /DomainGate v2 migration required: use resolveDomainSelection/
  );
});

test("the Codex adapter rejects fabricated domain readiness input", () => {
  assert.throws(
    () => buildCodexExecutionPlan({
      task: {
        id: "TASK-FORGED-DOMAIN",
        risk: "medium",
        targets: { platforms: ["web-saas"], frameworkOverlays: [] }
      },
      selectedResources: [],
      team: { lead: null, specialists: [], verifier: null },
      context: { items: [] },
      domainPack: {
        schemaVersion: "1.0.0",
        status: "verified-for-release",
        readinessCeiling: "verified-for-release",
        selectedPackIds: ["enterprise-core", "web-saas"],
        resolvedGateIds: [],
        gates: [],
        requiredCompetencies: [],
        missingEnvironmentCapabilities: [],
        blockedGateIds: [],
        blockers: [],
        platformVerification: true,
        releaseReadiness: true,
        warnings: []
      }
    }),
    /invalid DomainSelectionResult v1/
  );
});

test("the public planner derives domain gates and cannot bypass the enterprise union", async () => {
  const request = await readPinnedDeliveryRequest(
    new URL("../templates/delivery-kernel.request.example.json", import.meta.url),
  );
  const plan = await planDeliveryRun({ request }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.deepEqual(plan.domain.selectedPackIds, ["enterprise-core", "web-saas"]);
  assert.ok(plan.requiredGateIds.some((id) => id.startsWith("enterprise-")));
  assert.ok(plan.requiredGateIds.some((id) => id.startsWith("web-")));
  assert.equal(plan.domain.status, "blocked");
  assert.equal(plan.domain.platformVerification, false);
  assert.equal(plan.domain.releaseReadiness, false);
});

test("acceptance criteria may reference canonical policy gates without duplicating them as caller gates", async () => {
  const request = await readPinnedDeliveryRequest(
    new URL("../templates/delivery-kernel.request.example.json", import.meta.url),
  );
  request.task.gates = [];
  request.task.acceptanceCriteria = [{
    id: "AC-POLICY",
    statement: "Enterprise acceptance policy is satisfied",
    requiredGateIds: ["enterprise-product-acceptance"]
  }];
  const plan = await planDeliveryRun({ request }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.ok(plan.requiredGateIds.includes("enterprise-product-acceptance"));
  assert.deepEqual(plan.task.gates, []);
});

test("canonical domain competencies cannot be removed by an empty caller competency list", async () => {
  const request = await readPinnedDeliveryRequest(
    new URL("../templates/delivery-kernel.request.example.json", import.meta.url),
  );
  request.task.competencies = [];
  const plan = await planDeliveryRun({ request }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.deepEqual(plan.routing.uncoveredCompetencies, [
    "command-browser-runtime",
    "command-integration-test",
    "command-static-analysis",
    "command-unit-test"
  ]);
  for (const competency of plan.domain.requiredCompetencies) {
    assert.equal(
      plan.routing.uncoveredCompetencies.includes(competency),
      false,
      `domain competency was incorrectly removed: ${competency}`
    );
  }
});

test("available native expertise still returns an honest blocked plan when its environment is unavailable", async () => {
  const request = await readPinnedDeliveryRequest(
    new URL("../templates/delivery-kernel.request.example.json", import.meta.url),
  );
  request.task.targets = { platforms: ["ios"], frameworkOverlays: [] };
  request.task.competencies = [];
  const plan = await planDeliveryRun({ request }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.equal(plan.readinessState, "blocked");
  assert.deepEqual(plan.routing.uncoveredCompetencies, [
    "command-integration-test",
    "command-native-build",
    "command-packaging-install-rollback",
    "command-simulator-device",
    "command-static-analysis",
    "command-unit-test"
  ]);
  assert.equal(plan.routing.uncoveredCompetencies.includes("ios-native"), false);
  assert.ok(plan.domain.missingEnvironmentCapabilities.includes("xcode"));
  assert.ok(plan.domain.blockers.every(
    (blocker) => blocker.code === "native-environment-unavailable"
  ));
  assert.equal(plan.team.executionStatus, "blocked");
  assert.deepEqual(plan.team.waves, []);
  assert.equal(plan.codex.actualSpawnProof, null);
  assert.equal(plan.domain.platformVerification, false);
  assert.equal(plan.domain.releaseReadiness, false);
  assert.equal(plan.evidence.verified, false);
});
