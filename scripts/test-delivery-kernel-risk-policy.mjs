#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import {
  RISK_POLICY_AUTHORIZED_ACTIONS,
  RISK_POLICY_LEVELS,
  assessRiskPolicy
} from "./ai-toolkit/kernel/risk-policy.mjs";

function request(overrides = {}) {
  return {
    declaredRisk: "low",
    scenarioFloor: "low",
    authorizedActions: ["repository-read"],
    canonicalScopePaths: ["README.md"],
    ...overrides
  };
}

test("exports the DeliveryRequest risk and action vocabulary", () => {
  assert.deepEqual(RISK_POLICY_LEVELS, ["low", "medium", "high", "critical"]);
  assert.deepEqual(RISK_POLICY_AUTHORIZED_ACTIONS, [
    "repository-read",
    "scoped-local-write",
    "project-validation",
    "network-evidence-read",
    "dependency-restore",
    "ci-change",
    "release-change",
    "deployment"
  ]);
});

test("does not over-gate an ordinary documentation typo", () => {
  assert.deepEqual(
    assessRiskPolicy(request({
      authorizedActions: ["repository-read", "scoped-local-write"],
      canonicalScopePaths: [
        "docs/security/authentication-typo.md",
        "docs/privacy/pdpl-guidance.md"
      ]
    })),
    {
      declaredRisk: "low",
      scenarioFloor: "low",
      effectiveRisk: "low",
      elevationReasons: []
    }
  );
});

test("never lowers the declared risk or scenario floor", () => {
  assert.equal(
    assessRiskPolicy(request({ declaredRisk: "critical", scenarioFloor: "low" })).effectiveRisk,
    "critical"
  );
  assert.equal(
    assessRiskPolicy(request({ declaredRisk: "low", scenarioFloor: "high" })).effectiveRisk,
    "high"
  );
  assert.equal(
    assessRiskPolicy(request({ declaredRisk: "medium", scenarioFloor: "high" })).effectiveRisk,
    "high"
  );
});

test("elevates a scoped source write to medium", () => {
  assert.deepEqual(
    assessRiskPolicy(request({
      authorizedActions: ["scoped-local-write"],
      canonicalScopePaths: ["src/features/profile.ts"]
    })),
    {
      declaredRisk: "low",
      scenarioFloor: "low",
      effectiveRisk: "medium",
      elevationReasons: [{
        code: "source-code-write",
        minimumRisk: "medium",
        evidence: { kind: "scope-and-action", path: "src/features/profile.ts", action: "scoped-local-write" }
      }]
    }
  );
});

test("elevates each security, data, public-boundary, payment, and AI category to high", () => {
  const cases = [
    ["src/auth/session.ts", "security-sensitive-path"],
    ["src/authorization/policy.ts", "security-sensitive-path"],
    ["database/tenant/policy.sql", "security-sensitive-path"],
    ["database/rls/policy.sql", "security-sensitive-path"],
    ["database/row-level-security/policy.sql", "security-sensitive-path"],
    ["config/secrets/provider.ts", "security-sensitive-path"],
    ["src/public-api/contracts.ts", "public-integration-path"],
    ["src/webhooks/receiver.ts", "public-integration-path"],
    ["database/migrations/20260719_add_index.sql", "migration-path"],
    ["src/payments/processor.ts", "payment-billing-path"],
    ["src/billing/invoices.ts", "payment-billing-path"],
    ["src/ai/prompts/system.ts", "ai-system-path"],
    ["src/ai/tools/search.ts", "ai-system-path"],
    ["src/ai/retrieval/index.ts", "ai-system-path"],
    ["src/ai/memory/store.ts", "ai-system-path"]
  ];

  for (const [path, expectedCode] of cases) {
    const assessment = assessRiskPolicy(request({ canonicalScopePaths: [path] }));
    assert.equal(assessment.effectiveRisk, "high", path);
    assert.ok(
      assessment.elevationReasons.some((reason) => reason.code === expectedCode),
      `${path} should report ${expectedCode}`
    );
  }
});

test("elevates CI and release mutation authority to high", () => {
  for (const [action, expectedCode] of [
    ["ci-change", "ci-change-action"],
    ["release-change", "release-change-action"]
  ]) {
    const assessment = assessRiskPolicy(request({
      authorizedActions: ["repository-read", action]
    }));
    assert.equal(assessment.effectiveRisk, "high", action);
    assert.ok(
      assessment.elevationReasons.some((reason) => reason.code === expectedCode),
      `${action} should report ${expectedCode}`
    );
  }
});

test("elevates privacy and confidential-data implementation paths to high", () => {
  for (const scopePath of [
    "src/privacy/customer-profile.ts",
    "src/pii/export.ts",
    "src/confidential/report.ts",
    "src/pdpl/retention.ts",
    "src/gdpr/export.ts",
    "src/personal-data/profile.ts"
  ]) {
    const assessment = assessRiskPolicy(request({ canonicalScopePaths: [scopePath] }));
    assert.equal(assessment.effectiveRisk, "high", scopePath);
    assert.ok(
      assessment.elevationReasons.some((reason) => reason.code === "privacy-sensitive-path"),
      `${scopePath} should report privacy-sensitive-path`
    );
  }
});

test("elevates deployment and privileged production changes to critical", () => {
  const deployment = assessRiskPolicy(request({
    authorizedActions: ["deployment"],
    canonicalScopePaths: ["dist/release.zip"]
  }));
  assert.equal(deployment.effectiveRisk, "critical");
  assert.ok(deployment.elevationReasons.some((reason) => reason.code === "deployment-action"));

  const productionAccess = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["infra/production/iam/access-policy.json"]
  }));
  assert.equal(productionAccess.effectiveRisk, "critical");
  assert.ok(productionAccess.elevationReasons.some(
    (reason) => reason.code === "production-access-policy"
  ));
});

test("elevates credential rotation and destructive data work to critical", () => {
  const rotation = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["scripts/rotate-production-keys.mjs"]
  }));
  assert.equal(rotation.effectiveRisk, "critical");
  assert.ok(rotation.elevationReasons.some((reason) => reason.code === "credential-rotation"));

  const destructive = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["database/migrations/20260719_drop_customer_data.sql"]
  }));
  assert.equal(destructive.effectiveRisk, "critical");
  assert.ok(destructive.elevationReasons.some(
    (reason) => reason.code === "destructive-data-operation"
  ));

  const destructiveWithoutMigration = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["database/scripts/truncate-customer-table.sql"]
  }));
  assert.equal(destructiveWithoutMigration.effectiveRisk, "critical");
  assert.ok(destructiveWithoutMigration.elevationReasons.some(
    (reason) => reason.code === "destructive-data-operation"
  ));
});

test("elevates state-changing AI tool work to critical", () => {
  const assessment = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["src/ai/tools/delete-customer-record.ts"]
  }));

  assert.equal(assessment.effectiveRisk, "critical");
  assert.ok(assessment.elevationReasons.some(
    (reason) => reason.code === "state-changing-ai-tool"
  ));
});

test("orders evidence deterministically regardless of caller array order", () => {
  const forward = assessRiskPolicy(request({
    authorizedActions: ["repository-read", "scoped-local-write", "deployment"],
    canonicalScopePaths: [
      "src/payments/billing-service.ts",
      "src/auth/session.ts",
      "src/ai/tools/delete-customer-record.ts"
    ]
  }));
  const reverse = assessRiskPolicy(request({
    authorizedActions: ["deployment", "scoped-local-write", "repository-read"],
    canonicalScopePaths: [
      "src/ai/tools/delete-customer-record.ts",
      "src/auth/session.ts",
      "src/payments/billing-service.ts"
    ]
  }));

  assert.deepEqual(reverse, forward);
  assert.deepEqual(
    forward.elevationReasons,
    [...forward.elevationReasons].sort((left, right) => {
      const riskDelta = RISK_POLICY_LEVELS.indexOf(right.minimumRisk)
        - RISK_POLICY_LEVELS.indexOf(left.minimumRisk);
      if (riskDelta !== 0) return riskDelta;
      const codeDelta = left.code.localeCompare(right.code);
      if (codeDelta !== 0) return codeDelta;
      return JSON.stringify(left.evidence).localeCompare(JSON.stringify(right.evidence));
    })
  );
});

test("requires an exact closed plain input record", () => {
  assert.throws(
    () => assessRiskPolicy(null),
    /risk policy input must be a plain own-property record/
  );
  assert.throws(
    () => assessRiskPolicy(new (class RiskInput {})()),
    /risk policy input must be a plain own-property record/
  );
  assert.throws(
    () => assessRiskPolicy({ ...request(), callerOverride: "low" }),
    /risk policy input\.callerOverride is not allowed/
  );
  assert.throws(
    () => assessRiskPolicy({
      declaredRisk: "low",
      scenarioFloor: "low",
      authorizedActions: ["repository-read"]
    }),
    /risk policy input\.canonicalScopePaths is required/
  );
});

test("rejects invalid risks, actions, and non-canonical scope paths", () => {
  assert.throws(
    () => assessRiskPolicy(request({ declaredRisk: "routine" })),
    /declaredRisk must be one of: low, medium, high, critical/
  );
  assert.throws(
    () => assessRiskPolicy(request({ scenarioFloor: "routine" })),
    /scenarioFloor must be one of: low, medium, high, critical/
  );
  assert.throws(
    () => assessRiskPolicy(request({ authorizedActions: ["rotate-keys"] })),
    /authorizedActions\[0\] must be one of:/
  );

  for (const path of [
    "../src/auth.ts",
    "/src/auth.ts",
    "C:/src/auth.ts",
    "src\\auth.ts",
    "src//auth.ts",
    "src/./auth.ts",
    "src/auth.ts/",
    " src/auth.ts"
  ]) {
    assert.throws(
      () => assessRiskPolicy(request({ canonicalScopePaths: [path] })),
      /canonicalScopePaths\[0\] must be a canonical repository-relative POSIX path/,
      path
    );
  }
});

test("accepts canonical Unicode repository paths", () => {
  const assessment = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["src/واجهة.ts"]
  }));

  assert.equal(assessment.effectiveRisk, "medium");
});

test("rejects duplicate or malformed action and path arrays", () => {
  assert.throws(
    () => assessRiskPolicy(request({ authorizedActions: "repository-read" })),
    /authorizedActions must be a non-empty array/
  );
  assert.throws(
    () => assessRiskPolicy(request({ authorizedActions: [] })),
    /authorizedActions must be a non-empty array/
  );
  assert.throws(
    () => assessRiskPolicy(request({ authorizedActions: ["repository-read", "repository-read"] })),
    /authorizedActions\[1\] must be unique/
  );
  assert.throws(
    () => assessRiskPolicy(request({ canonicalScopePaths: [] })),
    /canonicalScopePaths must be a non-empty array/
  );
  assert.throws(
    () => assessRiskPolicy(request({ canonicalScopePaths: ["src/auth.ts", "src/auth.ts"] })),
    /canonicalScopePaths\[1\] must be unique/
  );
});

test("deeply freezes the assessment and nested evidence", () => {
  const assessment = assessRiskPolicy(request({
    authorizedActions: ["scoped-local-write"],
    canonicalScopePaths: ["src/auth/session.ts"]
  }));

  assert.equal(Object.isFrozen(assessment), true);
  assert.equal(Object.isFrozen(assessment.elevationReasons), true);
  assert.equal(Object.isFrozen(assessment.elevationReasons[0]), true);
  assert.equal(Object.isFrozen(assessment.elevationReasons[0].evidence), true);
  assert.throws(() => {
    assessment.effectiveRisk = "low";
  }, TypeError);
  assert.throws(() => {
    assessment.elevationReasons[0].evidence.path = "docs/README.md";
  }, TypeError);
});
