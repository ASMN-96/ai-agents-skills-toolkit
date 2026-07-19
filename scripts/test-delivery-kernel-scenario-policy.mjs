#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SCENARIO_POLICY_DOMAIN_PACK_IDS,
  assertScenarioPolicyRegistry,
  loadScenarioPolicyRegistry,
  resolveScenarioPolicy
} from "./ai-toolkit/kernel/scenario-policy.mjs";

const EXPECTED_SCENARIOS = [
  ["plain-language-product-request", "medium", "standard"],
  ["read-only-repo-audit", "medium", "standard"],
  ["external-skill-source-audit", "high", "detailed"],
  ["frontend-ui-bug", "medium", "standard"],
  ["dashboard-ui-redesign", "medium", "standard"],
  ["frontend-performance-issue", "medium", "standard"],
  ["supabase-rls-migration", "high", "detailed"],
  ["generic-postgres-orm-data-isolation", "high", "detailed"],
  ["postgres-query-performance", "high", "detailed"],
  ["api-contract-change", "high", "detailed"],
  ["security-review", "high", "detailed"],
  ["dependency-supply-chain-review", "high", "detailed"],
  ["performance-regression", "medium", "standard"],
  ["coderabbit-pr-triage", "medium", "standard"],
  ["release-readiness", "high", "detailed"],
  ["missing-capability-skill-discovery", "high", "detailed"],
  ["dirty-stale-divergent-repo-state", "high", "concise"],
  ["install-all-tools-request", "high", "concise"],
  ["small-low-risk-typo-doc-change", "low", "concise"],
  ["ambiguous-behavior-changing-request", "medium", "standard"],
  ["high-risk-security-data-request", "high", "detailed"],
  ["react-typescript-quality-change", "medium", "standard"],
  ["tenant-security-public-payload-review", "high", "detailed"],
  ["pr-release-coderabbit-gate", "high", "detailed"],
  ["external-tool-source-update", "high", "detailed"],
  ["embedded-toolkit-runtime-boundary", "high", "detailed"],
  ["large-governed-implementation", "high", "detailed"],
  ["mobile-native-app-quality", "medium", "standard"],
  ["desktop-native-app-quality", "medium", "standard"],
  ["webview-boundary-review", "high", "detailed"],
  ["ai-agent-system-change", "high", "detailed"],
  ["cross-surface-api-contracts", "high", "detailed"],
  ["package-manager-workspace-migration", "high", "detailed"],
  ["agent-command-safety", "high", "standard"],
  ["react-code-quality", "medium", "standard"],
  ["pr-scanner-output", "medium", "standard"],
  ["ui-polish", "medium", "standard"],
  ["governance-lite-router-mode", "medium", "concise"],
  ["task-intake-routing-gate", "medium", "standard"],
  ["coding-time-production-readiness", "medium", "standard"],
  ["api-contract-and-routing-readiness", "high", "standard"],
  ["performance-scalability-cache-readiness", "medium", "standard"],
  ["observability-readiness", "medium", "standard"],
  ["application-security-readiness", "high", "standard"],
  ["release-rollback-readiness", "high", "standard"]
];

const LEGACY_VIEW_SHA256 = "be6f852d792d33814f3e3f5e574aa9587c58e082fdfdaffb91d0d696eb44c087";
const POLICY_FIELDS = new Set([
  "requiredCompetencies",
  "requiredGateIds",
  "requiredRoles",
  "requiredDomainPackIds"
]);
const FAKE_EVIDENCE_FIELDS = new Set([
  "status",
  "executionStatus",
  "validationStatus",
  "actualSpawnProof",
  "actualSpawnObserved",
  "evidence",
  "proof",
  "passed",
  "verified",
  "executedResources",
  "invokedResources"
]);

function clone(value) {
  return structuredClone(value);
}

function scenario(registry, id) {
  return registry.scenarios.find((entry) => entry.scenario === id);
}

function legacyView(registry) {
  const view = clone(registry);
  view.schemaVersion = "1.0.0";
  for (const entry of view.scenarios) {
    for (const field of POLICY_FIELDS) delete entry[field];
  }
  return view;
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function findForbiddenField(value, location = "registry") {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findForbiddenField(item, `${location}[${index}]`);
      if (found) return found;
    }
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  for (const [key, item] of Object.entries(value)) {
    if (FAKE_EVIDENCE_FIELDS.has(key)) return `${location}.${key}`;
    const found = findForbiddenField(item, `${location}.${key}`);
    if (found) return found;
  }
  return null;
}

test("schema 2 preserves the exact 45-scenario legacy registry view", async () => {
  const raw = JSON.parse(await readFile(
    new URL("../registries/routing-matrix.json", import.meta.url),
    "utf8"
  ));
  const registry = await loadScenarioPolicyRegistry();

  assert.equal(registry.schemaVersion, "2.0.0");
  assert.equal(Object.isFrozen(registry), true);
  assert.deepEqual(
    registry.scenarios.map((entry) => [entry.scenario, entry.riskLevel, entry.tokenMode]),
    EXPECTED_SCENARIOS
  );
  assert.equal(hash(legacyView(raw)), LEGACY_VIEW_SHA256);
});

test("every scenario has closed additive policy, enterprise core, and risk-correct roles", async () => {
  const registry = await loadScenarioPolicyRegistry();
  assert.deepEqual(SCENARIO_POLICY_DOMAIN_PACK_IDS, [
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

  for (const entry of registry.scenarios) {
    assert.ok(entry.requiredCompetencies.length > 0, entry.scenario);
    assert.ok(entry.requiredGateIds.length > 0, entry.scenario);
    assert.equal(entry.requiredDomainPackIds[0], "enterprise-core", entry.scenario);
    assert.deepEqual(Object.keys(entry.requiredRoles), ["lead", "verifier"], entry.scenario);
    assert.equal(entry.requiredRoles.lead, "required", entry.scenario);
    assert.equal(
      entry.requiredRoles.verifier,
      ["high", "critical"].includes(entry.riskLevel) ? "independent" : "none",
      entry.scenario
    );
  }

  assert.deepEqual(
    scenario(registry, "plain-language-product-request").requiredCompetencies,
    ["product-discovery", "acceptance-criteria", "architecture", "verification"]
  );
  assert.deepEqual(
    scenario(registry, "postgres-query-performance").requiredCompetencies,
    ["database", "data-isolation", "performance", "reliability", "testing", "verification"]
  );
  assert.ok(
    scenario(registry, "mobile-native-app-quality").agents.includes("mobile-platform-agent")
  );
  assert.ok(
    scenario(registry, "desktop-native-app-quality").agents.includes("desktop-platform-agent")
  );
  assert.match(
    scenario(registry, "desktop-native-app-quality").inferredIntent,
    /UI\/UX|user experience/i,
    "desktop quality routing must explicitly classify its UI/UX scope"
  );
  assert.deepEqual(
    scenario(registry, "ai-agent-system-change").requiredCompetencies.slice(-3),
    ["ai-systems", "ai-evaluation", "agentic-security"]
  );
  assert.ok(
    scenario(registry, "ai-agent-system-change").agents.includes("backend-implementation-agent")
  );
});

test("resolver enforces risk and token floors and strengthens verifier role on escalation", async () => {
  const registry = await loadScenarioPolicyRegistry();

  assert.throws(
    () => resolveScenarioPolicy({
      registry,
      scenario: "release-readiness",
      risk: "medium"
    }),
    /risk cannot downgrade scenario floor high to medium/
  );
  assert.throws(
    () => resolveScenarioPolicy({
      registry,
      scenario: "release-readiness",
      tokenMode: "standard"
    }),
    /tokenMode cannot downgrade scenario floor detailed to standard/
  );

  const omitted = resolveScenarioPolicy({
    registry,
    scenario: "small-low-risk-typo-doc-change"
  });
  assert.equal(omitted.risk, "low");
  assert.equal(omitted.tokenMode, "concise");

  const escalated = resolveScenarioPolicy({
    registry,
    scenario: "frontend-ui-bug",
    risk: "critical",
    tokenMode: "detailed"
  });
  assert.equal(escalated.risk, "critical");
  assert.equal(escalated.tokenMode, "detailed");
  assert.deepEqual(escalated.requiredRoles, { lead: "required", verifier: "independent" });
  assert.equal(escalated.provenance.requiredRoles.verifier, "effective-risk");
});

test("resolver unions scenario, domain, then caller additions with immutable provenance", async () => {
  const registry = await loadScenarioPolicyRegistry();
  const result = resolveScenarioPolicy({
    registry,
    scenario: "plain-language-product-request",
    domainPolicy: {
      requiredCompetencies: ["web-accessibility", "verification"],
      requiredGateIds: ["web-wcag-22-aa", "enterprise-product-acceptance"],
      requiredDomainPackIds: ["web-saas", "enterprise-core"]
    },
    additions: {
      competencies: ["testing", "web-accessibility", "contract-fixtures"],
      gateIds: ["web-runtime-security-quality", "web-wcag-22-aa", "focused-tests"],
      domainPackIds: ["web-saas"]
    }
  });

  assert.deepEqual(result.requiredCompetencies, [
    "product-discovery",
    "acceptance-criteria",
    "architecture",
    "verification",
    "web-accessibility",
    "testing",
    "contract-fixtures"
  ]);
  assert.deepEqual(result.requiredGateIds, [
    "enterprise-product-acceptance",
    "enterprise-architecture-rollback",
    "web-wcag-22-aa",
    "web-runtime-security-quality",
    "focused-tests"
  ]);
  assert.deepEqual(result.requiredDomainPackIds, ["enterprise-core", "web-saas"]);
  assert.deepEqual(
    result.provenance.sources.map((source) => source.source),
    ["scenario-policy", "domain-policy", "caller-additions"]
  );
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.provenance), true);
  assert.equal(Object.isFrozen(result.provenance.sources), true);
  assert.equal(Object.isFrozen(result.provenance.sources[0].requiredGateIds), true);
  assert.throws(() => result.provenance.sources.push({}), TypeError);
});

test("registry validation rejects unknown fields, duplicates, invalid references, and unsafe roles", async () => {
  const registry = clone(await loadScenarioPolicyRegistry());
  const cases = [
    [{ ...registry, unknown: true }, /registry\.unknown is not allowed/],
    [
      { ...registry, scenarios: [...registry.scenarios, clone(registry.scenarios[0])] },
      /scenario is duplicated: plain-language-product-request/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry, index) => index === 0
        ? { ...entry, requiredCompetencies: [...entry.requiredCompetencies, entry.requiredCompetencies[0]] }
        : entry) },
      /requiredCompetencies\[4\] must be unique/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry, index) => index === 0
        ? { ...entry, requiredCompetencies: ["invented-competency"] }
        : entry) },
      /invented-competency is not a canonical competency/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry, index) => index === 0
        ? { ...entry, requiredGateIds: ["fake-check-passed"] }
        : entry) },
      /fake-check-passed is not a canonical obligation gate/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry, index) => index === 0
        ? { ...entry, requiredDomainPackIds: ["enterprise-core", "unknown-pack"] }
        : entry) },
      /unknown-pack is not a canonical domain pack/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry, index) => index === 0
        ? { ...entry, requiredGateIds: ["web-wcag-22-aa"] }
        : entry) },
      /web-wcag-22-aa requires domain pack web-saas/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry) => entry.scenario === "release-readiness"
        ? { ...entry, requiredRoles: { lead: "required", verifier: "none" } }
        : entry) },
      /high risk requires an independent verifier/
    ],
    [
      { ...registry, scenarios: registry.scenarios.map((entry, index) => index === 0
        ? { ...entry, requiredRoles: { ...entry.requiredRoles, observer: "none" } }
        : entry) },
      /requiredRoles\.observer is not allowed/
    ]
  ];

  for (const [value, pattern] of cases) {
    assert.throws(() => assertScenarioPolicyRegistry(value), pattern);
  }
});

test("policy and resolver inputs reject status, proof, and replacement fields", async () => {
  const registry = clone(await loadScenarioPolicyRegistry());
  registry.scenarios[0].status = "passed";
  assert.throws(
    () => assertScenarioPolicyRegistry(registry),
    /status is forbidden because scenario policy cannot contain execution status or proof/
  );

  delete registry.scenarios[0].status;
  registry.scenarios[0].actualSpawnProof = { id: "fabricated" };
  assert.throws(
    () => assertScenarioPolicyRegistry(registry),
    /actualSpawnProof is forbidden because scenario policy cannot contain execution status or proof/
  );

  const valid = await loadScenarioPolicyRegistry();
  assert.throws(
    () => resolveScenarioPolicy({
      registry: valid,
      scenario: "plain-language-product-request",
      additions: { requiredCompetencies: [] }
    }),
    /additions\.requiredCompetencies is not allowed; callers may add requirements but never replace them/
  );
  assert.throws(
    () => resolveScenarioPolicy({
      registry: valid,
      scenario: "plain-language-product-request",
      additions: { gateIds: ["focused-tests-passed"] }
    }),
    /must name an obligation, not execution status or proof: focused-tests-passed/
  );
  assert.throws(
    () => resolveScenarioPolicy({
      registry: valid,
      scenario: "plain-language-product-request",
      additions: { competencies: [42] }
    }),
    /additions\.competencies\[0\] must be a non-empty string/
  );
  assert.throws(
    () => resolveScenarioPolicy({
      registry: valid,
      scenario: "plain-language-product-request",
      requiredRoles: { verifier: "none" }
    }),
    /resolver\.requiredRoles is not allowed/
  );
  assert.throws(
    () => resolveScenarioPolicy({
      registry: valid,
      scenario: "plain-language-product-request",
      domainPolicy: {
        requiredCompetencies: [],
        requiredGateIds: []
      }
    }),
    /domainPolicy requires requiredDomainPackIds/
  );
});

test("canonical registry and resolved policy contain no fake execution evidence", async () => {
  const registry = await loadScenarioPolicyRegistry();
  assert.equal(findForbiddenField(registry), null);

  const result = resolveScenarioPolicy({
    registry,
    scenario: "release-readiness"
  });
  assert.equal(findForbiddenField(result), null);
  assert.equal(Object.hasOwn(result, "status"), false);
  assert.equal(Object.hasOwn(result, "evidence"), false);
});
