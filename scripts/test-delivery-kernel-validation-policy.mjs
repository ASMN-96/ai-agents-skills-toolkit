#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import * as deliveryKernel from "./ai-toolkit/kernel/delivery-kernel.mjs";
import {
  currentRepositoryCommit,
  TEST_REPOSITORY_ROOT
} from "./test-support/live-repository-fixture.mjs";

const REPOSITORY_COMMIT = currentRepositoryCommit();

test("delivery kernel exposes the canonical proportional validation policy", () => {
  assert.equal(typeof deliveryKernel.deriveValidationPolicy, "function");
  assert.deepEqual(deliveryKernel.VALIDATION_LANES, [
    "documentation-only",
    "behavior-code",
    "high-risk-release"
  ]);
});

function policy(overrides = {}) {
  return deliveryKernel.deriveValidationPolicy({
    effectiveRisk: "low",
    authorizedActions: ["repository-read"],
    canonicalScopePaths: ["README.md"],
    changedPaths: ["README.md"],
    requiredGateIds: ["enterprise-low-risk-scope-review"],
    ...overrides
  });
}

test("selects documentation-only only for unambiguous documentation or metadata paths", () => {
  const result = policy({
    authorizedActions: ["repository-read", "scoped-local-write", "project-validation"],
    canonicalScopePaths: ["docs/architecture.md", "STATUS.md"],
    changedPaths: ["docs/architecture.md"]
  });

  assert.equal(result.validationLane, "documentation-only");
  assert.equal(result.evidenceBoundary, "local-static");
  assert.deepEqual(result.evidenceBoundaryRationale, ["no-linked-or-protected-evidence-required"]);
  assert.deepEqual(result.rationale, ["unambiguous-documentation-or-metadata-paths"]);
});

test("keeps public uncredentialed linked documentation evidence proportional", () => {
  for (const gateId of [
    "public-documentation-link-check",
    "public-remote-documentation-check",
    "public-ci-status-check"
  ]) {
    const result = policy({
      authorizedActions: ["repository-read", "network-evidence-read"],
      requiredGateIds: [gateId]
    });

    assert.equal(result.validationLane, "documentation-only", gateId);
    assert.equal(result.evidenceBoundary, "public-linked-read-only", gateId);
    assert.deepEqual(
      result.evidenceBoundaryRationale,
      ["authorized-action:network-evidence-read"],
      gateId
    );
  }
});

test("defaults behavior and ambiguous paths to behavior-code", () => {
  for (const [label, overrides] of [
    ["source", { canonicalScopePaths: ["src/feature.ts"], changedPaths: ["src/feature.ts"] }],
    ["mixed", { canonicalScopePaths: ["docs/guide.md"], changedPaths: ["src/feature.ts"] }],
    ["runtime file under docs", {
      canonicalScopePaths: ["docs/site.config.mjs"],
      changedPaths: ["docs/site.config.mjs"]
    }],
    ["ambiguous metadata", { canonicalScopePaths: ["package.json"], changedPaths: [] }],
    ["ambiguous directory", { canonicalScopePaths: ["config"], changedPaths: [] }],
    ["medium risk docs", { effectiveRisk: "medium" }],
    ["dependency restore", { authorizedActions: ["repository-read", "dependency-restore"] }]
  ]) {
    assert.equal(policy(overrides).validationLane, "behavior-code", label);
  }
});

test("forces high-risk-release for high risk or mutating release actions", () => {
  for (const effectiveRisk of ["high", "critical"]) {
    const result = policy({ effectiveRisk });
    assert.equal(result.validationLane, "high-risk-release", effectiveRisk);
    assert.equal(result.evidenceBoundary, "local-static", effectiveRisk);
  }

  for (const action of ["ci-change", "release-change", "deployment"]) {
    const result = policy({ authorizedActions: ["repository-read", action] });
    assert.equal(result.validationLane, "high-risk-release", action);
    assert.ok(result.rationale.some((reason) => reason.includes(action)), action);
  }
});

test("forces high-risk-release for credentialed protected remote or destructive gates", () => {
  for (const gateId of [
    "release-approval",
    "credentialed-environment-check",
    "credentials-access-check",
    "protected-branch-check",
    "protected-remote-preview-evidence",
    "destructive-migration-review"
  ]) {
    const result = policy({ requiredGateIds: [gateId] });
    assert.equal(result.validationLane, "high-risk-release", gateId);
    assert.ok(result.rationale.some((reason) => reason.includes(gateId)), gateId);
    if (gateId.includes("credential") || gateId.includes("protected")) {
      assert.equal(result.evidenceBoundary, "protected-credentialed", gateId);
      assert.ok(
        result.evidenceBoundaryRationale.some((reason) => reason.includes(gateId)),
        gateId
      );
    }
  }
});

test("rejects caller lane injection and malformed policy inputs", () => {
  assert.throws(
    () => policy({ validationLane: "documentation-only" }),
    /validation policy input\.validationLane is not allowed/
  );
  assert.throws(
    () => policy({ evidenceBoundary: "local-static" }),
    /validation policy input\.evidenceBoundary is not allowed/
  );
  assert.throws(
    () => policy({ effectiveRisk: "routine" }),
    /effectiveRisk must be one of: low, medium, high, critical/
  );
  assert.throws(
    () => policy({ canonicalScopePaths: ["../README.md"] }),
    /canonicalScopePaths\[0\] must be a canonical repository-relative POSIX path/
  );
});

test("deeply freezes the derived lane and rationale", () => {
  const result = policy();

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.rationale), true);
  assert.equal(Object.isFrozen(result.evidenceBoundaryRationale), true);
  assert.equal(Object.isFrozen(result.provenance), true);
  assert.throws(() => {
    result.validationLane = "behavior-code";
  }, TypeError);
  assert.throws(() => {
    result.rationale[0] = "caller-downgrade";
  }, TypeError);
});

function deliveryRequest({
  id,
  scope = ["docs/validation-policy.md"],
  risk = "low",
  authorizedActions = ["repository-read"]
}) {
  return {
    schemaVersion: "1.0.0",
    task: {
      id,
      goal: "Exercise policy-derived proportional validation",
      scenario: "small-low-risk-typo-doc-change",
      scope,
      exclusions: [],
      constraints: ["Do not treat planning as execution evidence"],
      risk,
      targets: { platforms: ["web-saas"], frameworkOverlays: [] },
      authorizedActions,
      acceptanceCriteria: [{
        id: "AC-1",
        statement: "The validation lane is derived from trusted policy inputs.",
        requiredGateIds: ["enterprise-low-risk-scope-review"]
      }]
    },
    repository: { root: ".", expectedCommit: REPOSITORY_COMMIT },
    contextPolicy: {
      mode: "concise",
      modelWindowTokens: 128000,
      maxInputFraction: 0.35
    }
  };
}

test("delivery plan and initial evidence emit the immutable derived lane and rationale", async () => {
  const plan = await deliveryKernel.planDeliveryRun({
    request: deliveryRequest({ id: "VALIDATION-LANE-DOCS" })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });

  assert.equal(plan.validationLane, "documentation-only");
  assert.deepEqual(plan.validationRationale, ["unambiguous-documentation-or-metadata-paths"]);
  assert.equal(plan.validationPolicy.validationLane, plan.validationLane);
  assert.equal(Object.isFrozen(plan.validationPolicy), true);
  assert.equal(Object.isFrozen(plan.validationRationale), true);
  assert.equal(Object.getOwnPropertyDescriptor(plan, "validationLane").writable, false);
  assert.equal(plan.evidence.validationLane, plan.validationLane);
  assert.deepEqual(plan.evidence.validationRationale, plan.validationRationale);
  assert.equal(Object.isFrozen(plan.evidence.validationRationale), true);
  assert.throws(() => {
    plan.validationLane = "behavior-code";
  }, TypeError);
});

test("delivery planning keeps behavior ambiguity strict and public link reads proportional", async () => {
  const behavior = await deliveryKernel.planDeliveryRun({
    request: deliveryRequest({
      id: "VALIDATION-LANE-BEHAVIOR",
      scope: ["package.json"]
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.equal(behavior.validationLane, "behavior-code");

  const remote = await deliveryKernel.planDeliveryRun({
    request: deliveryRequest({
      id: "VALIDATION-LANE-REMOTE",
      authorizedActions: ["repository-read", "network-evidence-read"]
    })
  }, { invocationRoot: TEST_REPOSITORY_ROOT });
  assert.equal(remote.validationLane, "documentation-only");
  assert.equal(remote.validationPolicy.evidenceBoundary, "public-linked-read-only");
});

test("DeliveryRequest cannot inject or downgrade the validation lane", async () => {
  const request = deliveryRequest({ id: "VALIDATION-LANE-INJECTION" });
  request.task.validationLane = "documentation-only";

  await assert.rejects(
    () => deliveryKernel.planDeliveryRun(
      { request },
      { invocationRoot: TEST_REPOSITORY_ROOT }
    ),
    /validationLane/
  );
});
