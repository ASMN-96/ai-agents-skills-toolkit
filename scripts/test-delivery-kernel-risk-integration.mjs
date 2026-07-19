#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { canonicalDigest } from "./ai-toolkit/kernel/canonical-digest.mjs";
import { prepareExecutionPlan } from "./ai-toolkit/kernel/execution-lifecycle.mjs";
import {
  currentRepositoryCommit,
  TEST_REPOSITORY_ROOT
} from "./test-support/live-repository-fixture.mjs";

const REPOSITORY_COMMIT = currentRepositoryCommit();
const PREPARED_AT = "2026-07-19T08:00:00.000Z";

function assertEffectiveTaskBindings(plan, { declaredRisk, effectiveRisk }) {
  assert.equal(plan.request.task.risk, declaredRisk);
  assert.equal(plan.riskAssessment.declaredRisk, declaredRisk);
  assert.equal(plan.riskAssessment.effectiveRisk, effectiveRisk);
  assert.equal(plan.task.risk, effectiveRisk);
  assert.equal(plan.team.taskDigest, canonicalDigest(plan.task, "effective task regression"));
  assert.equal(plan.context.taskDigest, plan.team.taskDigest);
  assert.equal(plan.codex.risk, effectiveRisk);
  assert.deepEqual(
    [...plan.requiredGateIds].sort(),
    plan.domain.gates.map((gate) => gate.id).sort()
  );

  const prepared = prepareExecutionPlan(plan, {
    createdAt: PREPARED_AT,
    contextTtlSeconds: 600
  });
  assert.equal(prepared.task.risk, effectiveRisk);
  assert.equal(prepared.request.task.risk, declaredRisk);
  assert.equal(prepared.executionManifest.taskId, plan.task.id);
}

function request({
  id,
  scope,
  authorizedActions,
  declaredRisk = "low",
  scenario = "small-low-risk-typo-doc-change",
  contextMode = "concise",
  acceptanceGate = "enterprise-low-risk-scope-review"
}) {
  return {
    schemaVersion: "1.0.0",
    task: {
      id,
      goal: "Exercise automatic risk policy integration",
      scenario,
      scope,
      exclusions: [],
      constraints: ["Treat planning inference separately from execution evidence"],
      risk: declaredRisk,
      targets: { platforms: ["web-saas"], frameworkOverlays: [] },
      authorizedActions,
      acceptanceCriteria: [{
        id: "AC-1",
        statement: "The effective risk is derived from inspected canonical scope.",
        requiredGateIds: [acceptanceGate]
      }]
    },
    repository: { root: ".", expectedCommit: REPOSITORY_COMMIT },
    contextPolicy: {
      mode: contextMode,
      modelWindowTokens: 128000,
      maxInputFraction: 0.35
    }
  };
}

test("delivery planning keeps an ordinary documentation typo low risk", async () => {
  const plan = await planDeliveryRun({
    request: request({
      id: "RISK-DOCS",
      scope: ["docs/security/authentication-typo.md"],
      authorizedActions: ["repository-read", "scoped-local-write"]
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });

  assert.equal(plan.task.risk, "low");
  assert.deepEqual(plan.riskAssessment, {
    schemaVersion: "1.0.0",
    declaredRisk: "low",
    scenarioFloor: "low",
    inferredRisk: "low",
    effectiveRisk: "low",
    elevationReasons: [],
    provenance: {
      classification: "planning-policy-inference",
      policy: "automatic-risk-policy-v1",
      declaredRiskSource: "DeliveryRequest-v1.task.risk",
      scenarioFloorSource: "scenario-policy-v2:small-low-risk-typo-doc-change",
      inferredRiskSource: "read-only-project-and-scoped-diff-inspection",
      inspectionMode: "read-only",
      repositoryCommit: REPOSITORY_COMMIT,
      canonicalScopePaths: ["docs/security/authentication-typo.md"],
      authorizedActions: ["repository-read", "scoped-local-write"],
      executionEvidenceClaimed: false
    }
  });
  assert.equal(plan.scenarioPolicy.risk, "low");
  assert.equal(plan.scenarioPolicy.provenance.requested.risk, "low");
});

test("delivery planning applies a scenario floor even when declared and inferred risk are low", async () => {
  const plan = await planDeliveryRun({
    request: request({
      id: "RISK-SCENARIO-FLOOR",
      scope: ["docs/security/review-notes.md"],
      authorizedActions: ["repository-read"],
      scenario: "high-risk-security-data-request",
      contextMode: "detailed",
      acceptanceGate: "enterprise-security-privacy"
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });

  assertEffectiveTaskBindings(plan, { declaredRisk: "low", effectiveRisk: "high" });
  assert.equal(plan.riskAssessment.declaredRisk, "low");
  assert.equal(plan.riskAssessment.scenarioFloor, "high");
  assert.equal(plan.riskAssessment.inferredRisk, "low");
  assert.equal(plan.riskAssessment.effectiveRisk, "high");
  assert.deepEqual(plan.riskAssessment.elevationReasons, []);
  assert.equal(plan.scenarioPolicy.risk, "high");
  assert.equal(plan.scenarioPolicy.provenance.requested.risk, "high");
});

test("delivery planning elevates an auth scope and prepares the effective high-risk task", async () => {
  const plan = await planDeliveryRun({
    request: request({
      id: "RISK-AUTH",
      scope: ["src/auth/session.ts"],
      authorizedActions: ["repository-read"],
      declaredRisk: "medium",
      scenario: "plain-language-product-request",
      contextMode: "standard",
      acceptanceGate: "enterprise-product-acceptance"
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });

  assertEffectiveTaskBindings(plan, { declaredRisk: "medium", effectiveRisk: "high" });
  assert.equal(plan.riskAssessment.declaredRisk, "medium");
  assert.equal(plan.riskAssessment.scenarioFloor, "medium");
  assert.equal(plan.riskAssessment.inferredRisk, "high");
  assert.equal(plan.riskAssessment.effectiveRisk, "high");
  assert.ok(plan.riskAssessment.elevationReasons.some(
    (reason) => reason.code === "security-sensitive-path"
  ));
  assert.equal(plan.scenarioPolicy.risk, "high");
  assert.equal(plan.scenarioPolicy.provenance.requested.risk, "high");
  assert.equal(plan.scenarioPolicy.requiredRoles.verifier, "independent");
  assert.equal(Object.isFrozen(plan.riskAssessment), true);
  assert.equal(Object.isFrozen(plan.riskAssessment.elevationReasons), true);
  assert.equal(Object.isFrozen(plan.riskAssessment.elevationReasons[0]), true);
  assert.equal(Object.isFrozen(plan.riskAssessment.elevationReasons[0].evidence), true);
  assert.equal(Object.isFrozen(plan.riskAssessment.provenance), true);
  assert.equal(Object.isFrozen(plan.riskAssessment.provenance.canonicalScopePaths), true);
  assert.equal(Object.isFrozen(plan.riskAssessment.provenance.authorizedActions), true);
  assert.equal(plan.riskAssessment.provenance.executionEvidenceClaimed, false);
  assert.equal(Object.hasOwn(plan.riskAssessment, "executionStatus"), false);
  assert.equal(Object.hasOwn(plan.riskAssessment, "checks"), false);
  assert.throws(() => {
    plan.riskAssessment.provenance.canonicalScopePaths[0] = "docs/README.md";
  }, TypeError);
});

test("delivery planning elevates deployment and production access-policy work to critical", async () => {
  const deployment = await planDeliveryRun({
    request: request({
      id: "RISK-DEPLOY",
      scope: ["docs/release.md"],
      authorizedActions: ["repository-read", "deployment"]
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.equal(deployment.riskAssessment.inferredRisk, "critical");
  assert.equal(deployment.riskAssessment.effectiveRisk, "critical");
  assert.equal(deployment.scenarioPolicy.risk, "critical");
  assert.ok(deployment.riskAssessment.elevationReasons.some(
    (reason) => reason.code === "deployment-action"
  ));

  const productionAccess = await planDeliveryRun({
    request: request({
      id: "RISK-PROD-ACCESS",
      scope: ["infra/production/iam/access-policy.json"],
      authorizedActions: ["repository-read", "scoped-local-write"]
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.equal(productionAccess.riskAssessment.inferredRisk, "critical");
  assert.equal(productionAccess.riskAssessment.effectiveRisk, "critical");
  assert.equal(productionAccess.scenarioPolicy.risk, "critical");
  assert.ok(productionAccess.riskAssessment.elevationReasons.some(
    (reason) => reason.code === "production-access-policy"
  ));
});
