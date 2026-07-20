#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import * as resourceCatalog from "./ai-toolkit/kernel/resource-catalog.mjs";
import {
  finalizeExecutionRun as finalizeAuthoritativeExecutionRun,
  ingestExecutionEvents as ingestAuthoritativeExecutionEvents,
  inspectExecutionEvents,
  inspectExecutionFinalization,
  inspectExecutionPlanPreparation,
  inspectPreparedExecutionPlan,
  prepareExecutionPlan as prepareAuthoritativeExecutionPlan
} from "./ai-toolkit/kernel/execution-lifecycle.mjs";
import { buildResourceDigestBindings, canonicalDigest } from "./ai-toolkit/kernel/canonical-digest.mjs";
import { inspectProjectCapabilities } from "./ai-toolkit/kernel/project-inspector.mjs";

const COMMIT = "a".repeat(40);
const HASH = "b".repeat(64);
const STARTED_AT = "2026-07-17T08:00:00.000Z";
const COMPLETED_AT = "2026-07-17T08:01:00.000Z";
const FINALIZED_AT = "2026-07-17T08:02:00.000Z";
const COMMAND_REFERENCE = Object.freeze({
  kind: "project-script",
  manifestPath: "package.json",
  scriptName: "test:focused",
  digest: HASH
});

function resource(id, type, overrides = {}) {
  const isAgent = type === "agent";
  return {
    schemaVersion: "1.0.0",
    id,
    type,
    canonicalCompetencies: [isAgent ? "implementation" : "verification"],
    eligibleRoles: [isAgent ? "lead" : "support"],
    measuredContextCost: 1,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: 3,
      evidencePath: "scripts/test-delivery-kernel-execution-lifecycle.mjs",
      contentDigest: HASH
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
      evidencePath: "scripts/test-delivery-kernel-execution-lifecycle.mjs",
      contentDigest: HASH
    },
    freshness: {
      state: "current",
      evidencePath: "scripts/test-delivery-kernel-execution-lifecycle.mjs",
      contentDigest: HASH
    },
    nativeAdapter: {
      kind: isAgent ? "codex-agent" : "codex-skill",
      id
    },
    commandReference: null,
    eligibility: { eligible: true, reasons: [] },
    ...overrides
  };
}

function governedEnvelope({
  taskId = "TASK-EXEC-1",
  ownership = { mode: "read-only", ownedPaths: [] },
  dependencies = []
} = {}) {
  return {
    taskId,
    goal: "Verify serialized execution evidence",
    scenario: "large-governed-implementation",
    risk: "medium",
    scope: ["src"],
    exclusions: ["src/private"],
    constraints: ["no deployment"],
    authorizedActions: ["repository-read", "scoped-local-write", "project-validation"],
    acceptanceCriteria: [{
      id: "AC-EXEC-1",
      statement: "Review and release gates are observed.",
      requiredGateIds: ["review-gate", "release-gate"]
    }],
    taskGateIds: ["review-gate", "release-gate"],
    resolvedGateIds: ["review-gate", "release-gate"],
    ownership,
    dependencies,
    stopConditionRefs: ["stop:scope-change"],
    evidenceRefs: ["evidence:observed"],
    contextRefs: ["context:bounded"]
  };
}

function assignment({
  id = "A-EXEC-LEAD",
  agentId = "architect-agent",
  wave = 1,
  ownership,
  dependencies
} = {}) {
  return {
    schemaVersion: "1.0.0",
    kind: "assignment",
    id,
    agentId,
    role: id === "A-EXEC-LEAD" ? "lead" : "specialist",
    wave,
    responsibility: "bounded execution",
    governedEnvelope: governedEnvelope({ ownership, dependencies }),
    executionStatus: "planned",
    executionProof: null,
    receiptProof: null
  };
}

function domainGate(id, blockingStage) {
  return {
    schemaVersion: "1.0.0",
    id,
    applicability: {
      platformIds: [],
      frameworkOverlayIds: [],
      scenarioIds: ["large-governed-implementation"],
      riskLevels: []
    },
    requiredCompetencies: ["verification"],
    environmentRequirements: { allOf: [], anyOf: [] },
    verifierKinds: ["owner-review"],
    evidenceType: "review-receipt",
    blockingStage,
    authoritativeSourceRefs: [{ sourceId: "nist-ssdf", locator: "test-fixture" }]
  };
}

function sourceSnapshot() {
  const core = {
    schemaVersion: "1.0.0",
    catalogPath: "sources/source-watchlist.json",
    catalogDigest: "d".repeat(64),
    evaluatedAt: "2026-07-17T07:10:00.000Z",
    validUntil: "2026-07-17T08:30:00.000Z",
    status: "current",
    requiredSourceIds: ["nist-ssdf"],
    dependencies: [
      { gateId: "release-gate", sourceId: "nist-ssdf" },
      { gateId: "review-gate", sourceId: "nist-ssdf" }
    ],
    sources: [{
      sourceId: "nist-ssdf",
      monitorState: "CURRENT",
      reviewState: "REVIEWED_CURRENT",
      disposition: "SYNCED_REFERENCE",
      receiptPath: `sources/reviews/nist-ssdf/${"e".repeat(40)}.json`,
      receiptDigest: `sha256:${"f".repeat(64)}`,
      reviewedRevision: { kind: "git-sha", value: "e".repeat(40) },
      reviewedDigest: `sha256:${"a".repeat(64)}`,
      reviewedAt: "2026-07-17T07:10:00.000Z",
      expiresAt: "2026-07-17T08:30:00.000Z",
      freshnessClass: "security-runtime",
      freshnessMaxAgeDays: 14,
      monitorCheckedAt: "2026-07-17T07:00:00.000Z",
      monitorValidUntil: "2026-07-31T07:00:00.000Z",
      runtimePosture: "metadata-only",
      referenceEligible: true,
      runtimeEligible: false,
      reason: null
    }],
    blockedGateIds: [],
    blockers: [],
    resourceGovernance: {
      schemaVersion: "1.0.0",
      status: "current",
      requiredSourceIds: [],
      dependencies: [],
      sources: [],
      blockedResourceIds: [],
      blockers: []
    }
  };
  return {
    ...core,
    snapshotDigest: canonicalDigest(core, "test source snapshot")
  };
}

function sourceDependencyAccounting() {
  return {
    schemaVersion: "1.0.0",
    selectedPackIds: ["enterprise-core", "web-saas"],
    selectedPackMaturities: [
      {
        packId: "enterprise-core",
        declaredMaturity: "supported",
        effectiveMaturity: "supported"
      },
      {
        packId: "web-saas",
        declaredMaturity: "preview",
        effectiveMaturity: "preview"
      }
    ],
    dependencyClassifications: [
      {
        packId: "enterprise-core",
        gateId: "release-gate",
        dependencyClass: "supported"
      },
      { packId: "web-saas", gateId: "review-gate", dependencyClass: "preview" }
    ],
    dependencyUniverseDigest: canonicalDigest({
      supportedDependencyBlockers: [],
      previewDependencyBlockers: [],
      resourceDependencyBlockers: []
    }, "source dependency blocker universe"),
    selectedGateIds: ["release-gate", "review-gate"],
    selectedResourceIds: ["architect-agent", "code-quality"],
    status: "current",
    blockingSourceIds: [],
    selectedSupportedDependencyBlockers: [],
    diagnosticSupportedDependencyBlockers: [],
    selectedPreviewDependencyBlockers: [],
    selectedResourceDependencyBlockers: [],
    diagnosticPreviewDependencyBlockers: [],
    diagnosticResourceDependencyBlockers: []
  };
}

function basePlan() {
  const task = {
    id: "TASK-EXEC-1",
    goal: "Verify serialized execution evidence",
    scenario: "large-governed-implementation",
    scope: ["src"],
    exclusions: ["src/private"],
    constraints: ["no deployment"],
    risk: "medium",
    targets: { platforms: ["web-saas"], frameworkOverlays: [] },
    authorizedActions: ["repository-read", "scoped-local-write", "project-validation"],
    acceptanceCriteria: [{
      id: "AC-EXEC-1",
      statement: "Review and release gates are observed.",
      requiredGateIds: ["review-gate", "release-gate"]
    }],
    competencies: ["implementation", "verification"],
    gates: ["review-gate", "release-gate"]
  };
  const lead = assignment();
  const plan = {
    schemaVersion: "1.0.0",
    readinessState: "planned",
    request: {
      schemaVersion: "1.0.0",
      task,
      repository: { root: ".", expectedCommit: COMMIT },
      contextPolicy: { mode: "standard", modelWindowTokens: 128000, maxInputFraction: 0.35 }
    },
    task,
    repository: { root: ".", expectedCommit: COMMIT },
    contextPolicy: { mode: "standard", modelWindowTokens: 128000, maxInputFraction: 0.35 },
    scenarioPolicy: {
      requiredGateIds: ["review-gate", "release-gate"],
      requiredCompetencies: ["implementation", "verification"],
      requiredRoles: { lead: "required", verifier: "optional" }
    },
    requiredGateIds: ["review-gate", "release-gate"],
    sourceDependencyAccounting: sourceDependencyAccounting(),
    routing: {
      selected: [resource("architect-agent", "agent"), resource("code-quality", "skill")],
      uncoveredCompetencies: [],
      blockedReasons: []
    },
    context: {
      schemaVersion: "1.0.0",
      taskId: task.id,
      repositoryCommit: COMMIT,
      tokenBudget: 12000,
      tokensUsed: 0,
      reservedTokens: 116000,
      cacheKey: "c".repeat(64),
      items: [],
      exclusions: []
    },
    team: {
      schemaVersion: "1.0.0",
      taskId: task.id,
      taskDigest: null,
      selectedResourceDigests: [],
      domainSelectionDigest: null,
      lead: "architect-agent",
      specialists: [],
      verifier: null,
      waves: [{
        id: "wave-1",
        order: 1,
        lead: "architect-agent",
        specialists: [],
        assignments: [lead]
      }],
      assignments: [lead],
      executionStatus: "planned",
      actualExecutionProof: null,
      receiptProof: null
    },
    domain: {
      schemaVersion: "1.0.0",
      status: "planned",
      readinessCeiling: "planned",
      selectedPackIds: ["enterprise-core", "web-saas"],
      packMaturities: [
        {
          packId: "enterprise-core",
          declaredMaturity: "supported",
          effectiveMaturity: "supported"
        },
        {
          packId: "web-saas",
          declaredMaturity: "preview",
          effectiveMaturity: "preview"
        }
      ],
      resolvedGateIds: ["review-gate", "release-gate"],
      gates: [
        domainGate("review-gate", "verified-for-review"),
        domainGate("release-gate", "verified-for-release")
      ],
      blockedGateIds: [],
      blockers: [],
      releaseReadiness: false,
      platformVerification: false,
      sourceGovernance: sourceSnapshot()
    },
    codex: { sourceSnapshotDigest: null },
    claude: { sourceSnapshotDigest: null },
    evidence: {
      taskId: task.id,
      selectedResources: ["architect-agent", "code-quality"],
      disposition: "blocked"
    }
  };
  plan.codex.sourceSnapshotDigest = plan.domain.sourceGovernance.snapshotDigest;
  plan.claude.sourceSnapshotDigest = plan.domain.sourceGovernance.snapshotDigest;
  bindPlanDigests(plan);
  return plan;
}

function bindPlanDigests(plan) {
  plan.sourceDependencyAccounting.selectedPackIds = [...plan.domain.selectedPackIds].sort();
  plan.sourceDependencyAccounting.selectedPackMaturities = [...plan.domain.packMaturities]
    .sort((left, right) => left.packId.localeCompare(right.packId));
  plan.sourceDependencyAccounting.selectedGateIds = [...plan.domain.resolvedGateIds].sort();
  plan.sourceDependencyAccounting.selectedResourceIds = plan.routing.selected
    .map((resource) => resource.id)
    .sort();
  plan.team.taskDigest = canonicalDigest(plan.task, "test task");
  plan.team.selectedResourceDigests = buildResourceDigestBindings(plan.routing.selected);
  plan.team.domainSelectionDigest = canonicalDigest(plan.domain, "test domain");
}

function prepareExecutionPlan(rawPlan, options) {
  const { plan, executionManifestCore } = inspectExecutionPlanPreparation(rawPlan, options);
  const planDigest = canonicalDigest(
    { plan, executionManifest: executionManifestCore },
    "structural prepared execution plan fixture"
  );
  return {
    ...plan,
    executionManifest: {
      ...executionManifestCore,
      runId: `run-${planDigest.slice(0, 24)}`,
      planDigest
    }
  };
}

const ingestExecutionEvents = inspectExecutionEvents;
const finalizeExecutionRun = inspectExecutionFinalization;
const validatePreparedExecutionPlan = inspectPreparedExecutionPlan;

function preparedPlan() {
  return prepareExecutionPlan(basePlan(), {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  });
}

test("execution preparation rejects structurally valid raw plans without planner authority", () => {
  assert.throws(
    () => prepareAuthoritativeExecutionPlan(basePlan(), {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /planner-created canonical delivery plan/
  );
});

test("structural preparation cannot authorize event ingestion or finalization", () => {
  const structural = preparedPlan();
  assert.throws(
    () => ingestAuthoritativeExecutionEvents({ plan: structural, events: {} }),
    /authoritative planner-prepared execution plan/
  );
  assert.throws(
    () => finalizeAuthoritativeExecutionRun({ plan: structural, events: {}, receipts: {} }),
    /authoritative planner-prepared execution plan/
  );
});

test("execution preparation rejects caller-forged selected source dependency IDs", () => {
  const forged = basePlan();
  forged.sourceDependencyAccounting.selectedResourceIds = ["caller-forged-resource"];
  assert.throws(
    () => prepareExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /sourceDependencyAccounting selectedResourceIds must exactly match routing\.selected/
  );
});

function blockedGateDependencyPlan(packId, selectedBucket) {
  const plan = basePlan();
  const snapshot = plan.domain.sourceGovernance;
  const selectedGateId = packId === "enterprise-core" ? "release-gate" : "review-gate";
  snapshot.dependencies = snapshot.dependencies.filter(
    (dependency) => dependency.gateId === selectedGateId
  );
  snapshot.sources[0].reviewState = "QUARANTINED";
  snapshot.sources[0].referenceEligible = false;
  snapshot.sources[0].reason = "review-quarantined";
  snapshot.status = "blocked";
  snapshot.validUntil = null;
  snapshot.blockedGateIds = [selectedGateId];
  snapshot.blockers = snapshot.dependencies.map((dependency) => ({
    code: "authoritative-source-unavailable",
    gateId: dependency.gateId,
    sourceId: dependency.sourceId,
    reason: "review-quarantined"
  }));
  const { snapshotDigest: ignored, ...snapshotCore } = snapshot;
  void ignored;
  snapshot.snapshotDigest = canonicalDigest(snapshotCore, "blocked gate source snapshot");
  plan.domain.status = "blocked";
  plan.domain.blockedGateIds = [...snapshot.blockedGateIds];
  const blockers = snapshot.dependencies.map((dependency) => ({
    packId,
    gateId: dependency.gateId,
    sourceId: dependency.sourceId,
    reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
  }));
  plan.sourceDependencyAccounting.status = "blocked";
  plan.sourceDependencyAccounting.blockingSourceIds = ["nist-ssdf"];
  plan.sourceDependencyAccounting[selectedBucket] = blockers;
  plan.sourceDependencyAccounting.dependencyUniverseDigest = canonicalDigest({
    supportedDependencyBlockers: selectedBucket === "selectedSupportedDependencyBlockers"
      ? blockers
      : [],
    previewDependencyBlockers: selectedBucket === "selectedPreviewDependencyBlockers"
      ? blockers
      : [],
    resourceDependencyBlockers: []
  }, "source dependency blocker universe");
  plan.team = {
    ...plan.team,
    lead: null,
    specialists: [],
    verifier: null,
    waves: [],
    assignments: [],
    blockers: ["source-dependency-blocked:nist-ssdf"],
    executionStatus: "blocked"
  };
  plan.codex.sourceSnapshotDigest = snapshot.snapshotDigest;
  plan.claude.sourceSnapshotDigest = snapshot.snapshotDigest;
  bindPlanDigests(plan);
  return plan;
}

test("execution preparation rejects relabeling a selected preview blocker as supported", () => {
  const forged = blockedGateDependencyPlan(
    "web-saas",
    "selectedPreviewDependencyBlockers"
  );
  forged.sourceDependencyAccounting.selectedSupportedDependencyBlockers = (
    forged.sourceDependencyAccounting.selectedPreviewDependencyBlockers
  );
  forged.sourceDependencyAccounting.selectedPreviewDependencyBlockers = [];

  assert.throws(
    () => prepareExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /supported blockers require selected supported pack maturity and gate/
  );
});

test("execution preparation rejects moving a preview gate blocker onto a supported pack", () => {
  const forged = blockedGateDependencyPlan(
    "web-saas",
    "selectedPreviewDependencyBlockers"
  );
  forged.sourceDependencyAccounting.selectedSupportedDependencyBlockers = (
    forged.sourceDependencyAccounting.selectedPreviewDependencyBlockers.map((blocker) => ({
      ...blocker,
      packId: "enterprise-core"
    }))
  );
  forged.sourceDependencyAccounting.selectedPreviewDependencyBlockers = [];

  assert.throws(
    () => prepareExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /supported blockers contradict canonical gate ownership or classification/
  );
});

test("authoritative preparation rejects a fully re-bound and re-hashed cross-pack relabel", () => {
  const forged = blockedGateDependencyPlan(
    "web-saas",
    "selectedPreviewDependencyBlockers"
  );
  const previewBlocker = forged.sourceDependencyAccounting.selectedPreviewDependencyBlockers[0];
  const moved = { ...previewBlocker, packId: "enterprise-core" };
  forged.sourceDependencyAccounting.selectedPreviewDependencyBlockers = [];
  forged.sourceDependencyAccounting.selectedSupportedDependencyBlockers = [moved];
  forged.sourceDependencyAccounting.dependencyClassifications = (
    forged.sourceDependencyAccounting.dependencyClassifications.map((entry) => (
      entry.gateId === previewBlocker.gateId
        ? { ...entry, packId: "enterprise-core", dependencyClass: "supported" }
        : entry
    )).sort((left, right) => (
      left.packId.localeCompare(right.packId) || left.gateId.localeCompare(right.gateId)
    ))
  );
  forged.sourceDependencyAccounting.dependencyUniverseDigest = canonicalDigest({
    supportedDependencyBlockers: [moved],
    previewDependencyBlockers: [],
    resourceDependencyBlockers: []
  }, "source dependency blocker universe");
  bindPlanDigests(forged);

  assert.doesNotThrow(() => inspectExecutionPlanPreparation(forged, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  }));
  assert.throws(
    () => prepareAuthoritativeExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /planner-created canonical delivery plan/
  );
});

test("structural accounting rejects classifying a declared-unavailable pack as preview", () => {
  const forged = blockedGateDependencyPlan(
    "web-saas",
    "selectedPreviewDependencyBlockers"
  );
  const maturity = forged.domain.packMaturities.find((entry) => entry.packId === "web-saas");
  maturity.declaredMaturity = "unavailable";
  maturity.effectiveMaturity = "unavailable";
  bindPlanDigests(forged);

  assert.throws(
    () => inspectExecutionPlanPreparation(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /dependency classifications contradict domain pack maturity/
  );
});

test("execution preparation rejects supported and preview diagnostic bucket reshuffling", () => {
  const cases = [
    {
      packId: "enterprise-core",
      selected: "selectedSupportedDependencyBlockers",
      diagnostic: "diagnosticSupportedDependencyBlockers"
    },
    {
      packId: "web-saas",
      selected: "selectedPreviewDependencyBlockers",
      diagnostic: "diagnosticPreviewDependencyBlockers"
    }
  ];
  for (const entry of cases) {
    const forged = blockedGateDependencyPlan(entry.packId, entry.selected);
    forged.sourceDependencyAccounting[entry.diagnostic] = (
      forged.sourceDependencyAccounting[entry.selected]
    );
    forged.sourceDependencyAccounting[entry.selected] = [];
    forged.sourceDependencyAccounting.blockingSourceIds = [];
    forged.sourceDependencyAccounting.status = "current";
    assert.throws(
      () => prepareExecutionPlan(forged, {
        createdAt: "2026-07-17T07:55:00.000Z",
        contextTtlSeconds: 600
      }),
      /selected and diagnostic buckets do not match canonical selections/
    );
  }
});

test("execution preparation rejects omission of an unselected diagnostic resource blocker", () => {
  const forged = basePlan();
  const snapshot = forged.domain.sourceGovernance;
  const resourceSource = structuredClone(snapshot.sources[0]);
  resourceSource.reviewState = "QUARANTINED";
  resourceSource.referenceEligible = false;
  resourceSource.reason = "review-quarantined";
  snapshot.resourceGovernance = {
    schemaVersion: "1.0.0",
    status: "blocked",
    requiredSourceIds: ["nist-ssdf"],
    dependencies: [{ resourceId: "unselected-tool", sourceId: "nist-ssdf" }],
    sources: [resourceSource],
    blockedResourceIds: ["unselected-tool"],
    blockers: [{
      code: "dependent-source-unavailable",
      resourceId: "unselected-tool",
      sourceId: "nist-ssdf",
      reason: "review-quarantined"
    }]
  };
  const { snapshotDigest: ignored, ...snapshotCore } = snapshot;
  void ignored;
  snapshot.snapshotDigest = canonicalDigest(snapshotCore, "diagnostic resource source snapshot");
  forged.codex.sourceSnapshotDigest = snapshot.snapshotDigest;
  forged.claude.sourceSnapshotDigest = snapshot.snapshotDigest;
  const resourceBlocker = {
    resourceId: "unselected-tool",
    sourceId: "nist-ssdf",
    reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
  };
  forged.sourceDependencyAccounting.diagnosticResourceDependencyBlockers = [resourceBlocker];
  forged.sourceDependencyAccounting.dependencyUniverseDigest = canonicalDigest({
    supportedDependencyBlockers: [],
    previewDependencyBlockers: [],
    resourceDependencyBlockers: [resourceBlocker]
  }, "source dependency blocker universe");
  bindPlanDigests(forged);
  forged.sourceDependencyAccounting.diagnosticResourceDependencyBlockers = [];

  assert.throws(
    () => prepareExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /blocker universe does not match its canonical digest/
  );

  const rehashed = structuredClone(forged);
  rehashed.sourceDependencyAccounting.dependencyUniverseDigest = canonicalDigest({
    supportedDependencyBlockers: [],
    previewDependencyBlockers: [],
    resourceDependencyBlockers: []
  }, "source dependency blocker universe");
  bindPlanDigests(rehashed);
  assert.doesNotThrow(() => inspectExecutionPlanPreparation(rehashed, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  }));
  assert.throws(
    () => prepareAuthoritativeExecutionPlan(rehashed, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /planner-created canonical delivery plan/
  );
});

function commandEvidencePlan({
  evidenceType = "observed-verification-receipt",
  verifierKind = "unit-test",
  verifiedCommit = COMMIT
} = {}) {
  const rawPlan = basePlan();
  rawPlan.routing.selected[0].eligibleRoles = ["specialist"];
  rawPlan.routing.selected[0].verificationCapabilities = [verifierKind];
  rawPlan.team.assignments[0].role = "specialist";

  const leadResource = resource("qa-test-agent", "agent", { eligibleRoles: ["lead"] });
  const accountableLead = assignment({
    id: "A-COMMAND-LEAD",
    agentId: leadResource.id,
    wave: 1
  });
  accountableLead.role = "lead";
  const commandResource = resource("project-validator", "tool", {
    canonicalCompetencies: ["verification"],
    nativeAdapter: { kind: "project-script", id: "project-validator" },
    commandReference: COMMAND_REFERENCE
  });
  rawPlan.routing.selected.push(leadResource, commandResource);
  rawPlan.team.lead = leadResource.id;
  rawPlan.team.specialists = ["architect-agent"];
  rawPlan.team.assignments = [accountableLead, rawPlan.team.assignments[0]];
  rawPlan.team.waves = [{
    id: "wave-1",
    order: 1,
    lead: leadResource.id,
    specialists: ["architect-agent"],
    assignments: [accountableLead, rawPlan.team.assignments[1]]
  }];
  rawPlan.domain.gates[0] = {
    ...domainGate("review-gate", "verified-for-review"),
    verifierKinds: [verifierKind],
    evidenceType
  };
  rawPlan.projectInspection = {
    schemaVersion: "1.0.0",
    inspectionMode: "read-only",
    repositoryIdentity: "c".repeat(64),
    manifests: [{
      path: COMMAND_REFERENCE.manifestPath,
      kind: "node-package-manifest",
      sha256: COMMAND_REFERENCE.digest,
      scriptNames: [COMMAND_REFERENCE.scriptName]
    }],
    lockfiles: [],
    commandReferences: [COMMAND_REFERENCE],
    executableEvidence: [],
    hostCapabilities: [],
    verifiedCommit
  };
  bindPlanDigests(rawPlan);
  return prepareExecutionPlan(rawPlan, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  });
}

function trustedFinalize(plan, events, receipts) {
  return finalizeExecutionRun({ plan, events, receipts });
}

function resourceInvocation(plan, resourceId, overrides = {}) {
  const selected = plan.routing.selected.find((entry) => entry.id === resourceId);
  assert.ok(selected, `missing selected test resource: ${resourceId}`);
  return {
    resourceId,
    invocationId: `RESOURCE-INVOCATION-${resourceId}`,
    assignmentInvocationId: "INVOCATION-1",
    resourceDigest: canonicalDigest(selected, `${resourceId} test resource`),
    adapterDigest: canonicalDigest(selected.nativeAdapter, `${resourceId} test adapter`),
    commandReferenceDigest: selected.type === "tool"
      ? canonicalDigest(selected.commandReference, `${resourceId} test command reference`)
      : null,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    outputHash: HASH,
    toolCallId: null,
    ...overrides
  };
}

function gateCheck(gateId, outputHash = HASH, overrides = {}) {
  return {
    gateId,
    status: "passed",
    outputHash,
    evidenceType: "review-receipt",
    verifierKind: "owner-review",
    producerAssignmentId: "A-EXEC-LEAD",
    producerResourceId: "architect-agent",
    approverIdentity: "repository-owner",
    ...overrides
  };
}

function eventEnvelope(plan, overrides = {}) {
  const manifest = plan.executionManifest;
  return {
    schemaVersion: "1.0.0",
    runId: manifest.runId,
    taskId: manifest.taskId,
    planDigest: manifest.planDigest,
    events: [
      {
        schemaVersion: "1.0.0",
        eventId: "EVENT-START-1",
        sequence: 1,
        type: "assignment-started",
        runId: manifest.runId,
        taskId: manifest.taskId,
        planDigest: manifest.planDigest,
        assignmentId: "A-EXEC-LEAD",
        resourceId: "architect-agent",
        invocationId: "INVOCATION-1",
        promptHash: manifest.promptHash,
        contextHash: manifest.contextHash,
        startedAt: STARTED_AT,
        completedAt: null,
        toolCalls: [],
        outputHash: null,
        repositoryState: { commit: COMMIT, dirty: false, changedPaths: [] },
        warnings: []
      },
      {
        schemaVersion: "1.0.0",
        eventId: "EVENT-TERMINAL-1",
        sequence: 2,
        type: "assignment-completed",
        runId: manifest.runId,
        taskId: manifest.taskId,
        planDigest: manifest.planDigest,
        assignmentId: "A-EXEC-LEAD",
        resourceId: "architect-agent",
        invocationId: "INVOCATION-1",
        promptHash: manifest.promptHash,
        contextHash: manifest.contextHash,
        startedAt: STARTED_AT,
        completedAt: COMPLETED_AT,
        toolCalls: [],
        outputHash: HASH,
        repositoryState: { commit: COMMIT, dirty: false, changedPaths: [] },
        warnings: [],
        ...overrides
      }
    ]
  };
}

function receiptEnvelope(plan, overrides = {}) {
  const manifest = plan.executionManifest;
  const receipt = {
    schemaVersion: "1.0.0",
    receiptId: "RECEIPT-1",
    runId: manifest.runId,
    taskId: manifest.taskId,
    planDigest: manifest.planDigest,
    assignmentId: "A-EXEC-LEAD",
    resourceId: "architect-agent",
    invokedResourceIds: ["architect-agent", "code-quality"],
    resourceInvocations: [],
    invocationId: "INVOCATION-1",
    promptHash: manifest.promptHash,
    contextHash: manifest.contextHash,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT,
    toolCalls: [],
    outputHash: HASH,
    repositoryState: { commit: COMMIT, dirty: false, changedPaths: [] },
    warnings: [],
    status: "passed",
    exitCode: 0,
    checks: [],
    freshness: { state: "current", checkedAt: COMPLETED_AT, sourceIds: ["canonical-registry"] },
    ...overrides
  };
  if (!Object.hasOwn(overrides, "resourceInvocations")) {
    receipt.resourceInvocations = [resourceInvocation(plan, "code-quality", {
      startedAt: receipt.startedAt,
      completedAt: receipt.completedAt,
      outputHash: receipt.outputHash
    })];
  }
  if (!Object.hasOwn(overrides, "checks")) {
    receipt.checks = [
      gateCheck("review-gate", receipt.outputHash),
      gateCheck("release-gate", receipt.outputHash)
    ];
  }
  return {
    schemaVersion: "1.0.0",
    runId: manifest.runId,
    taskId: manifest.taskId,
    planDigest: manifest.planDigest,
    receipts: [receipt]
  };
}

function preparedPlanWithTools(toolDefinitions = [{
  id: "project-validator",
  adapterId: "project-validator",
  commandReference: COMMAND_REFERENCE
}]) {
  const rawPlan = basePlan();
  const toolResources = toolDefinitions.map(({ id, adapterId, commandReference }) => resource(id, "tool", {
    canonicalCompetencies: ["verification"],
    nativeAdapter: { kind: "project-script", id: adapterId },
    commandReference
  }));
  rawPlan.routing.selected.push(...toolResources);
  rawPlan.projectInspection = {
    schemaVersion: "1.0.0",
    inspectionMode: "read-only",
    repositoryIdentity: "c".repeat(64),
    manifests: toolDefinitions.map(({ commandReference }) => ({
      path: commandReference.manifestPath,
      kind: "node-package-manifest",
      sha256: commandReference.digest,
      scriptNames: [commandReference.scriptName]
    })),
    lockfiles: [],
    commandReferences: toolDefinitions.map(({ commandReference }) => commandReference),
    executableEvidence: [],
    hostCapabilities: [],
    verifiedCommit: COMMIT
  };
  bindPlanDigests(rawPlan);
  return prepareExecutionPlan(rawPlan, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  });
}

function planWithIndependentVerifier() {
  const rawPlan = basePlan();
  const verifierResource = resource("reviewer-agent", "agent", {
    eligibleRoles: ["verifier"],
    verificationCapabilities: ["security-review"]
  });
  const verifier = assignment({
    id: "A-EXEC-VERIFIER",
    agentId: verifierResource.id,
    wave: 2,
    dependencies: ["A-EXEC-LEAD"]
  });
  verifier.role = "verifier";
  rawPlan.routing.selected.push(verifierResource);
  rawPlan.team.verifier = verifierResource.id;
  rawPlan.team.assignments.push(verifier);
  rawPlan.team.waves.push({
    id: "wave-2",
    order: 2,
    lead: null,
    specialists: [],
    verifier: verifierResource.id,
    assignments: [verifier]
  });
  bindPlanDigests(rawPlan);
  return prepareExecutionPlan(rawPlan, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  });
}

function verifierEvidence(plan, verifierOverrides = {}) {
  const events = eventEnvelope(plan);
  events.events.push({
    ...structuredClone(events.events[0]),
    eventId: "EVENT-VERIFIER-START",
    sequence: 3,
    assignmentId: "A-EXEC-VERIFIER",
    resourceId: "reviewer-agent",
    invocationId: "INVOCATION-VERIFIER",
    startedAt: COMPLETED_AT
  });
  events.events.push({
    ...structuredClone(events.events[1]),
    eventId: "EVENT-VERIFIER-TERMINAL",
    sequence: 4,
    assignmentId: "A-EXEC-VERIFIER",
    resourceId: "reviewer-agent",
    invocationId: "INVOCATION-VERIFIER",
    startedAt: COMPLETED_AT,
    completedAt: FINALIZED_AT
  });

  const receipts = receiptEnvelope(plan);
  receipts.receipts.push({
    ...structuredClone(receipts.receipts[0]),
    receiptId: "RECEIPT-VERIFIER",
    assignmentId: "A-EXEC-VERIFIER",
    resourceId: "reviewer-agent",
    invokedResourceIds: ["reviewer-agent", "code-quality"],
    resourceInvocations: [resourceInvocation(plan, "code-quality", {
      invocationId: "RESOURCE-INVOCATION-VERIFIER-CODE-QUALITY",
      assignmentInvocationId: "INVOCATION-VERIFIER",
      startedAt: COMPLETED_AT,
      completedAt: FINALIZED_AT
    })],
    invocationId: "INVOCATION-VERIFIER",
    startedAt: COMPLETED_AT,
    completedAt: FINALIZED_AT,
    checks: [],
    freshness: { state: "current", checkedAt: FINALIZED_AT, sourceIds: ["canonical-registry"] },
    ...verifierOverrides
  });
  return { events, receipts };
}

test("structural prepared-plan fixtures are deterministic and JSON-round-trip through inspection", () => {
  const first = preparedPlan();
  const second = preparedPlan();
  assert.deepEqual(first, second);
  assert.match(first.executionManifest.runId, /^run-[a-f0-9]{24}$/);
  assert.match(first.executionManifest.planDigest, /^[a-f0-9]{64}$/);
  assert.equal(first.executionManifest.taskId, "TASK-EXEC-1");
  assert.equal(first.executionManifest.repositoryCommit, COMMIT);
  assert.equal(first.executionManifest.contextExpiresAt, "2026-07-17T08:05:00.000Z");
  assert.deepEqual(
    validatePreparedExecutionPlan(JSON.parse(JSON.stringify(first))),
    first
  );
});

test("execution preparation rejects source expiry and caps context validity at the earliest source deadline", () => {
  assert.throws(
    () => prepareExecutionPlan(basePlan(), {
      createdAt: "2026-07-17T08:30:00.000Z",
      contextTtlSeconds: 60
    }),
    /source snapshot is expired/
  );
  const capped = prepareExecutionPlan(basePlan(), {
    createdAt: "2026-07-17T08:20:00.000Z",
    contextTtlSeconds: 3600
  });
  assert.equal(capped.executionManifest.contextExpiresAt, "2026-07-17T08:30:00.000Z");
  assert.equal(
    capped.executionManifest.sourceSnapshotDigest,
    capped.domain.sourceGovernance.snapshotDigest
  );
});

test("event ingestion advances planned to in-progress and fail-closes blocked events", () => {
  const plan = preparedPlan();
  const empty = ingestExecutionEvents({
    plan,
    events: { ...eventEnvelope(plan), events: [] }
  });
  assert.equal(empty.readinessState, "planned");

  const progress = ingestExecutionEvents({ plan, events: eventEnvelope(plan) });
  assert.equal(progress.readinessState, "in-progress");
  assert.deepEqual(progress.observedAssignmentIds, ["A-EXEC-LEAD"]);

  const blocked = ingestExecutionEvents({
    plan,
    events: eventEnvelope(plan, { type: "assignment-blocked", outputHash: null })
  });
  assert.equal(blocked.readinessState, "blocked");
  assert.ok(blocked.blockingReasons.includes("event-blocked:A-EXEC-LEAD"));
});

test("complete matching receipts remain blocked until a privileged host bridge exists", () => {
  const plan = preparedPlan();
  const result = trustedFinalize(plan, eventEnvelope(plan), receiptEnvelope(plan));
  assert.equal(result.readinessState, "blocked");
  assert.deepEqual(result.evidenceIssuer, {
    trusted: false,
    issuerId: null
  });
  assert.equal(result.evidence.verified, false);
  assert.ok(result.blockingReasons.includes("untrusted-evidence-issuer"));
  assert.deepEqual(result.evidence.selectedNotInvoked, []);
  assert.deepEqual(result.evidence.assignmentsWithoutReceipts, []);
  assert.deepEqual(result.evidence.unverifiedRequiredChecks, []);
});

test("caller-authored JSON without a live host issuer can never become verified", () => {
  const plan = preparedPlan();
  const events = eventEnvelope(plan);
  const receipts = receiptEnvelope(plan);
  const result = finalizeExecutionRun({ plan, events, receipts });
  assert.equal(result.readinessState, "blocked");
  assert.equal(result.evidence.verified, false);
  assert.ok(result.blockingReasons.includes("untrusted-evidence-issuer"));

  assert.throws(
    () => finalizeExecutionRun(
      { plan, events, receipts },
      { evidenceIssuer: { issuerId: "caller-authored" } }
    ),
    /privileged host observation bridge is not installed/
  );
  assert.throws(
    () => finalizeExecutionRun(
      { plan, events, receipts },
      { clock: () => new Date(FINALIZED_AT), ownerApproverIdentities: ["repository-owner"] }
    ),
    /privileged host observation bridge is not installed/
  );
});

test("prepared plans require the exact canonical gate closure", () => {
  const missingRequiredGate = basePlan();
  missingRequiredGate.requiredGateIds = ["review-gate"];
  bindPlanDigests(missingRequiredGate);
  assert.throws(
    () => prepareExecutionPlan(missingRequiredGate, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /requiredGateIds must exactly match domain resolved gates/
  );

  const mismatchedScenarioPolicy = basePlan();
  mismatchedScenarioPolicy.scenarioPolicy = {
    requiredGateIds: ["review-gate"],
    requiredCompetencies: ["implementation", "verification"],
    requiredRoles: { lead: "required", verifier: "optional" }
  };
  bindPlanDigests(mismatchedScenarioPolicy);
  assert.throws(
    () => prepareExecutionPlan(mismatchedScenarioPolicy, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /scenarioPolicy.requiredGateIds must exactly match requiredGateIds/
  );
});

test("prepared high-risk plans require an independent read-only verifier in the final wave", () => {
  const forged = basePlan();
  forged.task.risk = "high";
  forged.request.task.risk = "high";
  forged.scenarioPolicy = {
    requiredGateIds: [...forged.requiredGateIds],
    requiredCompetencies: ["implementation", "verification"],
    requiredRoles: { lead: "required", verifier: "independent" }
  };
  bindPlanDigests(forged);
  assert.throws(
    () => prepareExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /high-risk prepared plan requires one verifier assignment in the final wave/
  );
});

test("serialized plans reject assignment permissions broader than their governed ownership", () => {
  const rawPlan = basePlan();
  rawPlan.routing.selected[0].runtimePosture = {
    ...rawPlan.routing.selected[0].runtimePosture,
    sandboxMode: "workspace-write",
    scopedLocalWrite: true
  };
  bindPlanDigests(rawPlan);

  assert.throws(
    () => prepareExecutionPlan(rawPlan, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /read-only assignment A-EXEC-LEAD cannot use fixed workspace-write capability/
  );
});

test("prepared plans reject same-wave dependencies and over-broad waves", () => {
  const forged = basePlan();
  const specialistResource = resource("frontend-agent", "agent", {
    eligibleRoles: ["specialist"]
  });
  forged.routing.selected.push(specialistResource);
  const specialist = assignment({
    id: "A-EXEC-SPECIALIST",
    agentId: "frontend-agent",
    wave: 1,
    dependencies: ["A-EXEC-LEAD"]
  });
  forged.team.specialists = ["frontend-agent"];
  forged.team.assignments.push(specialist);
  forged.team.waves[0].specialists.push("frontend-agent");
  forged.team.waves[0].assignments.push(specialist);
  bindPlanDigests(forged);
  assert.throws(
    () => prepareExecutionPlan(forged, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /dependency .* must belong to an earlier wave/
  );
});

test("execution must complete before context expiry and be finalized within 24 hours", () => {
  const plan = preparedPlan();
  const lateEvents = eventEnvelope(plan, {
    startedAt: "2026-07-17T08:04:00.000Z",
    completedAt: "2026-07-17T08:06:00.000Z"
  });
  lateEvents.events[0].startedAt = "2026-07-17T08:04:00.000Z";
  const lateReceipt = receiptEnvelope(plan, {
    startedAt: "2026-07-17T08:04:00.000Z",
    completedAt: "2026-07-17T08:06:00.000Z"
  });
  const expired = trustedFinalize(
    plan,
    lateEvents,
    lateReceipt,
    "2026-07-17T08:07:00.000Z"
  );
  assert.equal(expired.readinessState, "blocked");
  assert.ok(expired.blockingReasons.includes("context-expired-before-completion:A-EXEC-LEAD"));

  const replayed = trustedFinalize(
    plan,
    eventEnvelope(plan),
    receiptEnvelope(plan),
    "2026-07-18T08:01:01.000Z"
  );
  assert.equal(replayed.readinessState, "blocked");
  assert.ok(replayed.blockingReasons.includes("untrusted-evidence-issuer"));
});

test("skill invocation proof is bound to the assignment, selected resource, adapter, time, and output", () => {
  const plan = preparedPlan();
  const cases = [
    ["assignmentInvocationId", "INVOCATION-FORGED", /assignmentInvocationId must match/],
    ["resourceDigest", "d".repeat(64), /resourceDigest must match/],
    ["adapterDigest", "d".repeat(64), /adapterDigest must match/],
    ["outputHash", "d".repeat(64), /outputHash must bind/],
    ["completedAt", "2026-07-17T08:03:00.000Z", /timestamps must stay within/]
  ];
  for (const [field, value, expected] of cases) {
    const receipts = receiptEnvelope(plan);
    receipts.receipts[0].resourceInvocations[0][field] = value;
    assert.throws(
      () => trustedFinalize(plan, eventEnvelope(plan), receipts),
      expected,
      field
    );
  }
});

test("gate evidence is bound to policy and an authorized producer", () => {
  const plan = preparedPlan();
  const cases = [
    ["evidenceType", "observed-artifact", /evidenceType must match/],
    ["verifierKind", "static-analysis", /verifierKind is not authorized/],
    ["producerAssignmentId", "A-FORGED", /producerAssignmentId must match/],
    ["producerResourceId", "forged-agent", /producerResourceId must match/]
  ];
  for (const [field, value, expected] of cases) {
    const receipts = receiptEnvelope(plan);
    receipts.receipts[0].checks[0][field] = value;
    assert.throws(
      () => trustedFinalize(plan, eventEnvelope(plan), receipts),
      expected,
      field
    );
  }

  const unauthorizedOwner = receiptEnvelope(plan);
  unauthorizedOwner.receipts[0].checks[0].approverIdentity = "unattested-owner";
  const unauthorizedResult = trustedFinalize(plan, eventEnvelope(plan), unauthorizedOwner);
  assert.equal(unauthorizedResult.readinessState, "blocked");
  assert.ok(unauthorizedResult.blockingReasons.includes(
    "unauthorized-owner-approver:review-gate:unattested-owner"
  ));
});

test("every required execution gate must resolve to a canonical DomainGate policy", () => {
  const rawPlan = basePlan();
  rawPlan.task.gates.push("task-smoke");
  rawPlan.requiredGateIds.push("task-smoke");
  bindPlanDigests(rawPlan);
  assert.throws(
    () => prepareExecutionPlan(rawPlan, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /requiredGateIds must exactly match domain resolved gates/
  );
});

test("non-owner gate producers must have an explicit capability for the verifier kind", () => {
  const rawPlan = basePlan();
  rawPlan.routing.selected[0].eligibleRoles = ["specialist"];
  rawPlan.team.assignments[0].role = "specialist";
  rawPlan.team.assignments[0].wave = 1;
  const accountableResource = resource("qa-test-agent", "agent", {
    eligibleRoles: ["lead"]
  });
  const accountableLead = assignment({
    id: "A-ACCOUNTABLE-LEAD",
    agentId: "qa-test-agent",
    wave: 1
  });
  accountableLead.role = "lead";
  rawPlan.routing.selected.push(accountableResource);
  rawPlan.team.lead = "qa-test-agent";
  rawPlan.team.specialists = ["architect-agent"];
  rawPlan.team.assignments = [accountableLead, rawPlan.team.assignments[0]];
  rawPlan.team.waves = [{
    id: "wave-1",
    order: 1,
    lead: "qa-test-agent",
    specialists: ["architect-agent"],
    assignments: [accountableLead, rawPlan.team.assignments[1]]
  }];
  rawPlan.domain.gates[0] = {
    ...domainGate("review-gate", "verified-for-review"),
    verifierKinds: ["unit-test"],
    evidenceType: "observed-verification-receipt"
  };
  bindPlanDigests(rawPlan);
  const plan = prepareExecutionPlan(rawPlan, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  });
  const receipts = receiptEnvelope(plan);
  receipts.receipts[0].checks[0] = gateCheck("review-gate", HASH, {
    evidenceType: "observed-verification-receipt",
    verifierKind: "unit-test",
    approverIdentity: null
  });
  assert.throws(
    () => trustedFinalize(plan, eventEnvelope(plan), receipts),
    /producer resource is not authorized for verifier kind: unit-test/
  );
});

test("selected-but-uninvoked, nonzero exit, expired context, and unresolved freshness block finalization", () => {
  const plan = preparedPlan();
  const expiredEvents = eventEnvelope(plan, {
    startedAt: "2026-07-17T08:06:00.000Z",
    completedAt: "2026-07-17T08:07:00.000Z"
  });
  expiredEvents.events[0].startedAt = "2026-07-17T08:06:00.000Z";
  const cases = [
    [
      "selected resource not invoked",
      eventEnvelope(plan),
      receiptEnvelope(plan, {
        invokedResourceIds: ["architect-agent"],
        resourceInvocations: []
      }),
      "selected-resource-not-invoked:code-quality"
    ],
    [
      "nonzero exit",
      eventEnvelope(plan),
      receiptEnvelope(plan, { status: "failed", exitCode: 2 }),
      "nonzero-exit:A-EXEC-LEAD"
    ],
    [
      "expired context",
      expiredEvents,
      receiptEnvelope(plan, {
        startedAt: "2026-07-17T08:06:00.000Z",
        completedAt: "2026-07-17T08:07:00.000Z"
      }),
      "context-expired:A-EXEC-LEAD"
    ],
    [
      "unresolved freshness",
      eventEnvelope(plan),
      receiptEnvelope(plan, {
        freshness: { state: "unresolved", checkedAt: COMPLETED_AT, sourceIds: [] }
      }),
      "freshness-unresolved:A-EXEC-LEAD"
    ]
  ];
  for (const [name, events, receipts, expected] of cases) {
    const result = trustedFinalize(plan, events, receipts, "2026-07-17T08:08:00.000Z");
    assert.equal(result.readinessState, "blocked", name);
    assert.ok(result.blockingReasons.includes(expected), name);
  }
});

test("event streams require one ordered started-to-terminal invocation with consistent timestamps", () => {
  const plan = preparedPlan();
  assert.equal(ingestExecutionEvents({ plan, events: eventEnvelope(plan) }).readinessState, "in-progress");

  const terminalFirst = eventEnvelope(plan);
  terminalFirst.events[0].sequence = 2;
  terminalFirst.events[1].sequence = 1;
  assert.throws(
    () => ingestExecutionEvents({ plan, events: terminalFirst }),
    /terminal event requires a preceding started event/
  );

  const missingStart = eventEnvelope(plan);
  missingStart.events = [missingStart.events[1]];
  missingStart.events[0].sequence = 1;
  assert.throws(
    () => ingestExecutionEvents({ plan, events: missingStart }),
    /terminal event requires a preceding started event/
  );

  const mismatchedStart = eventEnvelope(plan, { startedAt: "2026-07-17T08:00:01.000Z" });
  assert.throws(
    () => ingestExecutionEvents({ plan, events: mismatchedStart }),
    /terminal startedAt must match started event/
  );

  const duplicateTerminal = eventEnvelope(plan);
  duplicateTerminal.events.push({
    ...structuredClone(duplicateTerminal.events[1]),
    eventId: "EVENT-TERMINAL-2",
    sequence: 3
  });
  assert.throws(
    () => ingestExecutionEvents({ plan, events: duplicateTerminal }),
    /multiple terminal events/
  );
});

test("later waves cannot begin before lower-wave assignments complete successfully", () => {
  const rawPlan = basePlan();
  const specialist = assignment({
    id: "A-EXEC-SPECIALIST",
    agentId: "frontend-agent",
    wave: 2,
    dependencies: ["A-EXEC-LEAD"]
  });
  rawPlan.routing.selected.push(resource("frontend-agent", "agent"));
  rawPlan.team.assignments.push(specialist);
  rawPlan.team.waves.push({
    id: "wave-2",
    order: 2,
    lead: null,
    specialists: ["frontend-agent"],
    assignments: [specialist]
  });
  bindPlanDigests(rawPlan);
  const plan = prepareExecutionPlan(rawPlan, {
    createdAt: "2026-07-17T07:55:00.000Z",
    contextTtlSeconds: 600
  });
  const events = eventEnvelope(plan);
  const leadTerminal = events.events[1];
  leadTerminal.sequence = 4;
  leadTerminal.completedAt = "2026-07-17T08:03:00.000Z";
  const specialistStart = {
    ...structuredClone(events.events[0]),
    eventId: "EVENT-SPECIALIST-START",
    sequence: 2,
    assignmentId: "A-EXEC-SPECIALIST",
    resourceId: "frontend-agent",
    invocationId: "INVOCATION-2",
    startedAt: "2026-07-17T08:00:10.000Z"
  };
  const specialistTerminal = {
    ...structuredClone(leadTerminal),
    eventId: "EVENT-SPECIALIST-TERMINAL",
    sequence: 3,
    assignmentId: "A-EXEC-SPECIALIST",
    resourceId: "frontend-agent",
    invocationId: "INVOCATION-2",
    startedAt: "2026-07-17T08:00:10.000Z",
    completedAt: "2026-07-17T08:00:20.000Z"
  };
  events.events = [events.events[0], specialistStart, specialistTerminal, leadTerminal];
  assert.throws(
    () => ingestExecutionEvents({ plan, events }),
    /started before successful prerequisite A-EXEC-LEAD/
  );
});

test("receipts exactly match terminal event execution evidence", () => {
  const plan = preparedPlan();
  const mismatches = [
    ["startedAt", { startedAt: "2026-07-17T08:00:01.000Z" }, /receipt startedAt must match terminal event/],
    ["completedAt", { completedAt: "2026-07-17T08:01:01.000Z" }, /receipt completedAt must match terminal event/],
    ["outputHash", { outputHash: "d".repeat(64) }, /receipt outputHash must match terminal event/],
    [
      "repositoryState",
      { repositoryState: { commit: COMMIT, dirty: true, changedPaths: ["src/file.js"] } },
      /receipt repositoryState must match terminal event/
    ],
    ["warnings", { warnings: ["observed-warning"] }, /receipt warnings must match terminal event/]
  ];
  for (const [name, overrides, expected] of mismatches) {
    assert.throws(
      () => trustedFinalize(plan, eventEnvelope(plan), receiptEnvelope(plan, overrides)),
      expected,
      name
    );
  }

  const toolPlan = preparedPlanWithTools([{
    id: "project-validator",
    adapterId: "validator",
    commandReference: COMMAND_REFERENCE
  }]);
  const toolCall = {
    toolCallId: "TOOL-CALL-MISMATCH",
    toolName: "validator",
    authorizedAction: "project-validation",
    inputHash: canonicalDigest(COMMAND_REFERENCE, "mismatched receipt command reference"),
    status: "succeeded",
    outputHash: HASH,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT
  };
  assert.throws(
    () => trustedFinalize(
      toolPlan,
      eventEnvelope(toolPlan),
      receiptEnvelope(toolPlan, {
        toolCalls: [toolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations: [
          resourceInvocation(toolPlan, "code-quality"),
          resourceInvocation(toolPlan, "project-validator", {
            invocationId: "RESOURCE-INVOCATION-MISMATCH",
            toolCallId: toolCall.toolCallId
          })
        ]
      })
    ),
    /receipt toolCalls must match terminal event/
  );
});

test("dirty repository evidence requires at least one changed path", () => {
  const plan = preparedPlan();
  assert.throws(
    () => ingestExecutionEvents({
      plan,
      events: eventEnvelope(plan, {
        repositoryState: { commit: COMMIT, dirty: true, changedPaths: [] }
      })
    }),
    /changedPaths must be non-empty when dirty is true/
  );
});

test("freshness cannot be future and release evidence older than 24 hours is blocked", () => {
  const plan = preparedPlan();
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan),
      receiptEnvelope(plan, {
        freshness: {
          state: "current",
          checkedAt: "2026-07-17T08:02:00.000Z",
          sourceIds: ["canonical-registry"]
        }
      })
    ),
    /freshness checkedAt cannot be after receipt completedAt/
  );

  const stale = trustedFinalize(
    plan,
    eventEnvelope(plan),
    receiptEnvelope(plan, {
      freshness: {
        state: "current",
        checkedAt: "2026-07-16T07:59:59.000Z",
        sourceIds: ["canonical-registry"]
      }
    })
  );
  assert.equal(stale.readinessState, "blocked");
  assert.ok(stale.blockingReasons.includes("freshness-stale:A-EXEC-LEAD"));
});

test("ID-only skill invocation claims do not satisfy selected-resource evidence", () => {
  const plan = preparedPlan();
  const result = trustedFinalize(
    plan,
    eventEnvelope(plan),
    receiptEnvelope(plan, { resourceInvocations: [] })
  );
  assert.equal(result.readinessState, "blocked");
  assert.ok(result.blockingReasons.includes("selected-resource-not-invoked:code-quality"));
});

test("selected tools require a structured invocation tied to matching tool-call output", () => {
  const plan = preparedPlanWithTools([{
    id: "project-validator",
    adapterId: "validator",
    commandReference: COMMAND_REFERENCE
  }]);
  const toolCall = {
    toolCallId: "TOOL-CALL-VALIDATOR",
    toolName: "validator",
    authorizedAction: "project-validation",
    inputHash: canonicalDigest(
      plan.routing.selected.at(-1).commandReference,
      "project-validator test command reference"
    ),
    status: "succeeded",
    outputHash: HASH,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT
  };
  const resourceInvocations = [
    resourceInvocation(plan, "code-quality"),
    resourceInvocation(plan, "project-validator", {
      invocationId: "RESOURCE-INVOCATION-2",
      toolCallId: toolCall.toolCallId
    })
  ];
  const good = trustedFinalize(
    plan,
    eventEnvelope(plan, { toolCalls: [toolCall] }),
    receiptEnvelope(plan, {
      toolCalls: [toolCall],
      invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
      resourceInvocations
    })
  );
  assert.equal(good.readinessState, "blocked");
  assert.ok(good.blockingReasons.includes("untrusted-evidence-issuer"));

  const unauthorizedToolCall = { ...toolCall, authorizedAction: "release-change" };
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [unauthorizedToolCall] }),
      receiptEnvelope(plan, {
        toolCalls: [unauthorizedToolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations
      })
    ),
    /authorizedAction is not authorized by the task/
  );

  const wrongInputToolCall = { ...toolCall, inputHash: "d".repeat(64) };
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [wrongInputToolCall] }),
      receiptEnvelope(plan, {
        toolCalls: [wrongInputToolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations
      })
    ),
    /inputHash must bind to the selected command reference/
  );

  const orphanToolCall = {
    ...toolCall,
    toolCallId: "TOOL-CALL-ORPHAN"
  };
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [toolCall, orphanToolCall] }),
      receiptEnvelope(plan, {
        toolCalls: [toolCall, orphanToolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations
      })
    ),
    /selected executable tool may be observed at most once per assignment event/
  );

  const wrongCommandBinding = structuredClone(resourceInvocations);
  wrongCommandBinding[1].commandReferenceDigest = "d".repeat(64);
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [toolCall] }),
      receiptEnvelope(plan, {
        toolCalls: [toolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations: wrongCommandBinding
      })
    ),
    /commandReferenceDigest must match/
  );

  const lateToolCall = {
    ...toolCall,
    completedAt: "2026-07-17T08:02:00.000Z"
  };
  const lateToolInvocations = [
    resourceInvocation(plan, "code-quality"),
    resourceInvocation(plan, "project-validator", {
      invocationId: "RESOURCE-INVOCATION-2",
      completedAt: lateToolCall.completedAt,
      toolCallId: lateToolCall.toolCallId
    })
  ];
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, {
        completedAt: lateToolCall.completedAt,
        toolCalls: [lateToolCall]
      }),
      receiptEnvelope(plan, {
        toolCalls: [lateToolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations: lateToolInvocations
      }),
      "2026-07-17T08:03:00.000Z"
    ),
    /tool call timestamps must stay within the producing receipt/
  );

  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [toolCall] }),
      receiptEnvelope(plan, {
        toolCalls: [toolCall],
        invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
        resourceInvocations: resourceInvocations.slice(0, 1)
      })
    ),
    /selected project-script tool call must be referenced exactly once/
  );
});

test("inspected project command factory creates only digest-bound eligible tool resources", async (t) => {
  const repositoryRoot = await mkdtemp(path.join(os.tmpdir(), "delivery-command-resources-"));
  t.after(() => rm(repositoryRoot, { recursive: true, force: true }));
  await writeFile(
    path.join(repositoryRoot, "package.json"),
    `${JSON.stringify({ scripts: {
      "build:ios": "node --version",
      docs: "node --version",
      lint: "node --check src/index.mjs",
      "package:rollback": "node --version",
      "test:e2e": "node --test",
      "test:focused": "node --test",
      "test:integration": "node --test",
      "test:simulator": "node --test",
      test: "node --test"
    } }, null, 2)}\n`,
    "utf8"
  );
  const inspected = inspectProjectCapabilities({
    repositoryRoot,
    includeHostCapabilities: false
  });
  const resources = resourceCatalog.buildInspectedProjectCommandResources({
    repositoryRoot,
    commandReferences: inspected.commandReferences
  });
  assert.equal(resources.length, 9);
  const classified = Object.fromEntries(resources.map((resource) => [
    resource.commandReference.scriptName,
    {
      competencies: resource.canonicalCompetencies,
      verifierKinds: resource.verificationCapabilities
    }
  ]));
  assert.deepEqual(classified, {
    "build:ios": {
      competencies: ["command-native-build"],
      verifierKinds: []
    },
    docs: {
      competencies: ["project-script"],
      verifierKinds: []
    },
    lint: {
      competencies: ["command-static-analysis"],
      verifierKinds: []
    },
    "package:rollback": {
      competencies: ["command-packaging-install-rollback"],
      verifierKinds: []
    },
    test: {
      competencies: ["project-script"],
      verifierKinds: []
    },
    "test:e2e": {
      competencies: ["command-browser-runtime"],
      verifierKinds: []
    },
    "test:focused": {
      competencies: ["command-unit-test"],
      verifierKinds: []
    },
    "test:integration": {
      competencies: ["command-integration-test"],
      verifierKinds: []
    },
    "test:simulator": {
      competencies: ["command-simulator-device"],
      verifierKinds: []
    }
  });
  for (const resource of resources) {
    assert.equal(resource.type, "tool");
    assert.equal(resource.nativeAdapter.kind, "project-script");
    assert.equal(resource.eligibility.eligible, true);
    assert.equal(resource.detectionEvidence.contentDigest, inspected.manifests[0].sha256);
    assert.equal(JSON.stringify(resource).includes("node --"), false);
  }

  assert.throws(
    () => resourceCatalog.buildInspectedProjectCommandResources({
      repositoryRoot,
      commandReferences: [{
        ...inspected.commandReferences[0],
        digest: "d".repeat(64)
      }]
    }),
    /digest must match the inspected manifest/
  );
});

test("command-required atomic gates reject agent-only receipts for every command verifier kind", () => {
  const commandCases = [
    ["static-analysis", "observed-verification-receipt"],
    ["unit-test", "observed-verification-receipt"],
    ["integration-test", "observed-verification-receipt"],
    ["browser-runtime", "observed-verification-receipt"],
    ["native-build", "observed-verification-receipt"],
    ["simulator-device", "observed-verification-receipt"],
    ["packaging-install-rollback", "observed-artifact"],
    ["owner-review", "observed-command-receipt"]
  ];
  for (const [verifierKind, evidenceType] of commandCases) {
    const plan = commandEvidencePlan({ verifierKind, evidenceType });
    const receipts = receiptEnvelope(plan);
    receipts.receipts[0].checks[0] = gateCheck("review-gate", HASH, {
      evidenceType,
      verifierKind,
      approverIdentity: verifierKind === "owner-review" ? "repository-owner" : null
    });
    assert.throws(
      () => trustedFinalize(plan, eventEnvelope(plan), receipts),
      /commandEvidenceInvocationId is required/,
      verifierKind
    );
  }
});

test("command-required gate evidence binds inspected command, commit, invocation, and output", () => {
  const plan = commandEvidencePlan();
  const toolCall = {
    toolCallId: "TOOL-CALL-COMMAND-EVIDENCE",
    toolName: "project-validator",
    authorizedAction: "project-validation",
    inputHash: canonicalDigest(
      plan.routing.selected.find((resource) => resource.id === "project-validator").commandReference,
      "project-validator command evidence reference"
    ),
    status: "succeeded",
    outputHash: HASH,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT
  };
  const commandInvocation = resourceInvocation(plan, "project-validator", {
    invocationId: "RESOURCE-INVOCATION-COMMAND-EVIDENCE",
    toolCallId: toolCall.toolCallId
  });
  const checks = [
    gateCheck("review-gate", HASH, {
      evidenceType: "observed-verification-receipt",
      verifierKind: "unit-test",
      approverIdentity: null,
      commandEvidenceInvocationId: commandInvocation.invocationId
    }),
    gateCheck("release-gate", HASH)
  ];
  const invocationOptions = {
    checks,
    invokedResourceIds: ["architect-agent", "code-quality", "project-validator"],
    resourceInvocations: [
      resourceInvocation(plan, "code-quality"),
      commandInvocation
    ],
    toolCalls: [toolCall]
  };
  const result = trustedFinalize(
    plan,
    eventEnvelope(plan, { toolCalls: [toolCall] }),
    receiptEnvelope(plan, invocationOptions)
  );
  assert.equal(result.readinessState, "blocked");
  assert.ok(result.blockingReasons.includes("untrusted-evidence-issuer"));

  const missingInvocation = structuredClone(invocationOptions);
  missingInvocation.checks[0].commandEvidenceInvocationId = "RESOURCE-INVOCATION-MISSING";
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [toolCall] }),
      receiptEnvelope(plan, missingInvocation)
    ),
    /must reference a successful selected project command invocation/
  );

  const wrongOutputCall = { ...toolCall, outputHash: "d".repeat(64) };
  const wrongOutputInvocation = {
    ...commandInvocation,
    outputHash: wrongOutputCall.outputHash
  };
  assert.throws(
    () => trustedFinalize(
      plan,
      eventEnvelope(plan, { toolCalls: [wrongOutputCall] }),
      receiptEnvelope(plan, {
        ...invocationOptions,
        resourceInvocations: [resourceInvocation(plan, "code-quality"), wrongOutputInvocation],
        toolCalls: [wrongOutputCall]
      })
    ),
    /outputHash must match command evidence invocation output/
  );

  const wrongCommitPlan = commandEvidencePlan({ verifiedCommit: "d".repeat(40) });
  assert.throws(
    () => trustedFinalize(
      wrongCommitPlan,
      eventEnvelope(wrongCommitPlan, { toolCalls: [toolCall] }),
      receiptEnvelope(wrongCommitPlan, {
        ...invocationOptions,
        resourceInvocations: [
          resourceInvocation(wrongCommitPlan, "code-quality"),
          resourceInvocation(wrongCommitPlan, "project-validator", {
            invocationId: commandInvocation.invocationId,
            toolCallId: toolCall.toolCallId
          })
        ],
        toolCalls: [toolCall]
      })
    ),
    /project inspection commit must match prepared plan/
  );
});

test("wrong identity, commit, digest, and missing output hash are rejected", () => {
  const plan = preparedPlan();
  for (const [name, events, expected] of [
    ["task", eventEnvelope(plan, { taskId: "TASK-WRONG" }), /taskId must match prepared plan/],
    [
      "commit",
      eventEnvelope(plan, { repositoryState: { commit: "d".repeat(40), dirty: false, changedPaths: [] } }),
      /repositoryState\.commit must match prepared plan/
    ],
    ["digest", eventEnvelope(plan, { planDigest: "e".repeat(64) }), /planDigest must match prepared plan/],
    ["hash", eventEnvelope(plan, { outputHash: null }), /completed event requires outputHash/]
  ]) {
    assert.throws(() => ingestExecutionEvents({ plan, events }), expected, name);
  }
});

test("serialized plans with overlapping writer ownership are rejected before execution", () => {
  const plan = basePlan();
  plan.routing.selected[0].runtimePosture = {
    ...plan.routing.selected[0].runtimePosture,
    sandboxMode: "workspace-write",
    scopedLocalWrite: true
  };
  const second = assignment({
    id: "A-EXEC-SPECIALIST",
    agentId: "frontend-agent",
    wave: 2,
    ownership: { mode: "write", ownedPaths: ["src/api"] },
    dependencies: ["A-EXEC-LEAD"]
  });
  plan.team.assignments[0].governedEnvelope.ownership = { mode: "write", ownedPaths: ["src"] };
  plan.team.assignments.push(second);
  plan.team.waves.push({
    id: "wave-2",
    order: 2,
    lead: null,
    specialists: ["frontend-agent"],
    assignments: [second]
  });
  plan.routing.selected.push(resource("frontend-agent", "agent", {
    runtimePosture: {
      registryPresent: true,
      available: true,
      supported: true,
      executionProof: false,
      sandboxMode: "workspace-write",
      scopedLocalWrite: true
    }
  }));
  bindPlanDigests(plan);

  assert.throws(
    () => prepareExecutionPlan(plan, {
      createdAt: "2026-07-17T07:55:00.000Z",
      contextTtlSeconds: 600
    }),
    /writer ownership overlap/
  );
});

test("every observed tool call binds once to one selected executable adapter and its action", () => {
  const plan = preparedPlanWithTools();
  const validCall = {
    toolCallId: "TOOL-CALL-VALIDATOR",
    toolName: "project-validator",
    authorizedAction: "project-validation",
    inputHash: canonicalDigest(COMMAND_REFERENCE, "selected executable command reference"),
    status: "succeeded",
    outputHash: HASH,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT
  };
  assert.equal(
    ingestExecutionEvents({
      plan,
      events: eventEnvelope(plan, { toolCalls: [validCall] })
    }).readinessState,
    "in-progress"
  );

  assert.throws(
    () => ingestExecutionEvents({
      plan,
      events: eventEnvelope(plan, {
        toolCalls: [{ ...validCall, toolCallId: "TOOL-CALL-UNSELECTED", toolName: "shell" }]
      })
    }),
    /toolName must bind to exactly one selected executable tool or native adapter/
  );

  assert.throws(
    () => ingestExecutionEvents({
      plan,
      events: eventEnvelope(plan, {
        toolCalls: [{ ...validCall, authorizedAction: "repository-read" }]
      })
    }),
    /authorizedAction must match the selected executable tool policy/
  );

  assert.throws(
    () => ingestExecutionEvents({
      plan,
      events: eventEnvelope(plan, {
        toolCalls: [
          validCall,
          { ...validCall, toolCallId: "TOOL-CALL-VALIDATOR-DUPLICATE" }
        ]
      })
    }),
    /selected executable tool may be observed at most once per assignment event/
  );
});

test("spawn and delegation tool names are forbidden even if a serialized plan selects them", () => {
  for (const [id, adapterId, toolName] of [
    ["spawn-agent", "spawn_agent", "spawn_agent"],
    ["delegate-task", "delegateTask", "delegateTask"],
    ["apparently-safe-tool", "spawn_agent", "apparently-safe-tool"]
  ]) {
    const plan = preparedPlanWithTools([{ id, adapterId, commandReference: COMMAND_REFERENCE }]);
    const toolCall = {
      toolCallId: `TOOL-CALL-${id.toUpperCase()}`,
      toolName,
      authorizedAction: "project-validation",
      inputHash: canonicalDigest(COMMAND_REFERENCE, `${id} command reference`),
      status: "succeeded",
      outputHash: HASH,
      startedAt: STARTED_AT,
      completedAt: COMPLETED_AT
    };
    assert.throws(
      () => ingestExecutionEvents({
        plan,
        events: eventEnvelope(plan, { toolCalls: [toolCall] })
      }),
      /spawn or delegation tool names are forbidden/,
      adapterId
    );
  }
});

test("ambiguous adapter aliases cannot bind an observed tool call", () => {
  const secondReference = {
    ...COMMAND_REFERENCE,
    manifestPath: "package.secondary.json",
    scriptName: "test:secondary",
    digest: "e".repeat(64)
  };
  const plan = preparedPlanWithTools([
    { id: "project-validator-one", adapterId: "validator", commandReference: COMMAND_REFERENCE },
    { id: "project-validator-two", adapterId: "validator", commandReference: secondReference }
  ]);
  const toolCall = {
    toolCallId: "TOOL-CALL-AMBIGUOUS",
    toolName: "validator",
    authorizedAction: "project-validation",
    inputHash: canonicalDigest(COMMAND_REFERENCE, "ambiguous command reference"),
    status: "succeeded",
    outputHash: HASH,
    startedAt: STARTED_AT,
    completedAt: COMPLETED_AT
  };
  assert.throws(
    () => ingestExecutionEvents({
      plan,
      events: eventEnvelope(plan, { toolCalls: [toolCall] })
    }),
    /toolName must bind to exactly one selected executable tool or native adapter/
  );
});

test("independent verifier receipts require disconfirming checks and reversal criteria", () => {
  const plan = planWithIndependentVerifier();
  const missing = verifierEvidence(plan);
  assert.throws(
    () => trustedFinalize(plan, missing.events, missing.receipts),
    /disconfirmingChecks must be a non-empty array/
  );

  const empty = verifierEvidence(plan, {
    disconfirmingChecks: [],
    reversalCriteria: []
  });
  assert.throws(
    () => trustedFinalize(plan, empty.events, empty.receipts),
    /disconfirmingChecks must be a non-empty array/
  );

  const missingReversal = verifierEvidence(plan, {
    disconfirmingChecks: ["Searched for evidence that the acceptance claim is false."]
  });
  assert.throws(
    () => trustedFinalize(plan, missingReversal.events, missingReversal.receipts),
    /reversalCriteria must be a non-empty array/
  );

  const emptyReversal = verifierEvidence(plan, {
    disconfirmingChecks: ["Searched for evidence that the acceptance claim is false."],
    reversalCriteria: []
  });
  assert.throws(
    () => trustedFinalize(plan, emptyReversal.events, emptyReversal.receipts),
    /reversalCriteria must be a non-empty array/
  );

  const complete = verifierEvidence(plan, {
    disconfirmingChecks: ["Searched for evidence that the acceptance claim is false."],
    reversalCriteria: ["Reverse the pass decision if the scoped output hash or changed paths differ."]
  });
  const result = trustedFinalize(plan, complete.events, complete.receipts);
  assert.equal(result.readinessState, "blocked");
  assert.ok(result.blockingReasons.includes("untrusted-evidence-issuer"));
});
