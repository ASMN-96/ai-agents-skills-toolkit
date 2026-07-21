#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { canonicalTextSha256 } from "./ai-toolkit/kernel/canonical-digest.mjs";
import {
  EXPECTED_TASK_IDS,
  OBSERVED_BENCHMARK_RELATIVE_PATH,
  validateObservedEnterpriseBenchmark
} from "./validate-observed-enterprise-benchmark.mjs";
import { validateObservedEnterpriseCoreEvidenceRecord } from "./validate-v0-3-release-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIRECTORY = "evals/observed/fixtures";

function copyCanonicalFixtureSet(root) {
  for (const taskId of EXPECTED_TASK_IDS) {
    const name = `${taskId.toLowerCase()}.json`;
    const source = path.join(ROOT, FIXTURE_DIRECTORY, name);
    const target = path.join(root, FIXTURE_DIRECTORY, name);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(source));
  }
}

function fixtureDigests(root) {
  return Object.fromEntries(EXPECTED_TASK_IDS.map((taskId) => {
    const fixturePath = path.join(root, FIXTURE_DIRECTORY, `${taskId.toLowerCase()}.json`);
    return [taskId, `sha256:${canonicalTextSha256(readFileSync(fixturePath))}`];
  }));
}

function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return `sha256:${canonicalTextSha256(readFileSync(target))}`;
}

function settingsArtifacts(root) {
  return Object.fromEntries(["baseline", "kernel-routed"].map((variant) => {
    const relativePath = `evals/observed/settings/${variant === "baseline" ? "baseline" : "candidate"}.json`;
    return [variant, {
      path: relativePath,
      sha256: writeJson(root, relativePath, {
        schemaVersion: "1.0.0",
        variant,
        modelId: "gpt-5.6-terra",
        reasoningLevel: "high",
        fixtureCopy: "fresh-per-run",
        productRepositoryAccess: "forbidden",
        productSourceAccess: "forbidden",
        remoteAccess: "forbidden",
        runtimeSettings: { toolAccess: "toolkit-only", workspaceScope: "fixture-only" }
      })
    }];
  }));
}

function measuredRecord(root) {
  const fixtures = fixtureDigests(root);
  const taskIds = [...EXPECTED_TASK_IDS];
  const variantSettings = settingsArtifacts(root);
  const runs = taskIds.flatMap((taskId) => ["baseline", "kernel-routed"].flatMap((variant) => (
    [1, 2, 3].map((run) => {
      const artifactVariant = variant === "baseline" ? "baseline" : "candidate";
      const relativePath = `evals/observed/runs/${taskId}/${artifactVariant}-${run}.json`;
      const resultArtifact = {
        path: relativePath,
        sha256: writeJson(root, relativePath, {
          schemaVersion: "1.0.0",
          taskId,
          variant,
          run,
          fixtureDigest: fixtures[taskId],
          settingsDigest: variantSettings[variant].sha256,
          outcome: "accepted",
          mandatoryCompetencyCovered: true,
          requiredGatesCovered: true,
          exactGoldenRouting: true,
          finalAcceptance: true,
          firstPassAccepted: true,
          escapedCriticalOrHighDefects: 0,
          falseReadyCases: 0,
          secretLeakCases: 0,
          unauthorizedWriteCases: 0,
          redundantInvocation: false,
          toolkitControlledInputTokens: variant === "baseline" ? 100 : 70,
          verifiedResultDurationMs: variant === "baseline" ? 1000 : 1000,
          humanReview: { correctness: 4, usefulness: 4, traceability: 4 }
        })
      };
      return { taskId, variant, run, fixtureDigest: fixtures[taskId], resultArtifact };
    })
  )));
  return {
    schemaVersion: "1.0.0",
    status: "measured-passed",
    evidenceType: "owner-reviewed-manual-enterprise-core-observation",
    toolkitCommit: "a".repeat(40),
    hostTrust: "not-trusted-host-bridge",
    model: { id: "gpt-5.6-terra" },
    variantSettings,
    taskIds,
    runsPerVariant: 3,
    fixtureDigests: fixtures,
    runs,
    summary: {
      mandatoryCompetencyCoverage: 1,
      requiredGateCoverage: 1,
      exactGoldenRouting: 1,
      firstPassAcceptance: 1,
      finalAcceptance: 1,
      escapedCriticalOrHighDefects: 0,
      falseReadyCases: 0,
      secretLeakCases: 0,
      unauthorizedWriteCases: 0,
      redundantInvocationRate: 0,
      medianToolkitControlledInputTokenReduction: 0.3,
      medianTimeToVerifiedResultRatio: 1,
      humanCorrectnessAverage: 4,
      humanUsefulnessAverage: 4,
      humanTraceabilityAverage: 4,
      lowestHumanDimension: 4
    },
    ownerReview: {
      identity: "repository-owner:abdal",
      decision: "approved",
      approvedAt: "2026-07-21T00:00:00.000Z"
    }
  };
}

test("committed observed enterprise-core record is a valid immutable not-measured template", () => {
  const result = validateObservedEnterpriseBenchmark({ root: ROOT });
  assert.equal(result.relativePath, OBSERVED_BENCHMARK_RELATIVE_PATH);
  assert.equal(result.status, "not-measured");
  assert.deepEqual(result.taskIds, EXPECTED_TASK_IDS);
  assert.equal(result.releaseEligible, false);
  assert.equal(result.hostTrust, "not-trusted-host-bridge");
});

test("five observed task fixtures have exact ids and their golden validators remain scoped to no product repository", () => {
  for (const taskId of EXPECTED_TASK_IDS) {
    const fixture = JSON.parse(readFileSync(
      path.join(ROOT, FIXTURE_DIRECTORY, `${taskId.toLowerCase()}.json`),
      "utf8"
    ));
    assert.equal(fixture.id, taskId);
    assert.equal(fixture.executionBoundary.productRepositoryAccess, "forbidden");
    assert.equal(fixture.goldenValidator.expectedTaskId, taskId);
  }
});

test("measured evidence requires three complete baseline and kernel-routed runs for every expected task", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-benchmark-"));
  try {
    copyCanonicalFixtureSet(root);
    const record = measuredRecord(root);
    assert.doesNotThrow(() => validateObservedEnterpriseBenchmark({ root, record }));
    record.runs.pop();
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record }),
      /observed-benchmark:runs-incomplete/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("measured evidence fails closed on exact bindings, threshold regressions, missing owner review, and host-trust escalation", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-benchmark-"));
  try {
    copyCanonicalFixtureSet(root);
    for (const [label, mutate, failure] of [
      ["fixture digest", (record) => { record.fixtureDigests[EXPECTED_TASK_IDS[0]] = "0".repeat(64); }, "fixture-digest"],
      ["toolkit commit", (record) => { record.toolkitCommit = "invalid"; }, "toolkit-commit"],
      ["owner review", (record) => { record.ownerReview = null; }, "owner-review"],
      ["threshold", (record) => {
        for (const run of record.runs.slice(0, 4)) {
          const artifactPath = path.join(root, run.resultArtifact.path);
          const result = JSON.parse(readFileSync(artifactPath, "utf8"));
          result.exactGoldenRouting = false;
          run.resultArtifact.sha256 = writeJson(root, run.resultArtifact.path, result);
        }
        record.summary.exactGoldenRouting = 0.866666666667;
      }, "threshold-exact-golden-routing"],
      ["host trust", (record) => { record.hostTrust = "trusted-host-bridge"; }, "host-trust-boundary"]
    ]) {
      const record = measuredRecord(root);
      mutate(record);
      assert.throws(
        () => validateObservedEnterpriseBenchmark({ root, record }),
        new RegExp(`observed-benchmark:${failure}`, "u"),
        label
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("measured evidence rejects arbitrary settings and run-result artifacts even when their bindings are re-digested", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-benchmark-artifacts-"));
  try {
    copyCanonicalFixtureSet(root);
    const record = measuredRecord(root);
    const baselineSettings = record.variantSettings.baseline;
    baselineSettings.sha256 = writeJson(root, baselineSettings.path, { arbitrary: true });
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record }),
      /observed-benchmark:settings-artifact/u
    );

    const nonCanonicalRecord = measuredRecord(root);
    const nonCanonicalSettings = nonCanonicalRecord.variantSettings.baseline;
    nonCanonicalSettings.path = "evals/observed/settings/non-canonical.json";
    nonCanonicalSettings.sha256 = writeJson(root, nonCanonicalSettings.path, {
      schemaVersion: "1.0.0",
      variant: "baseline",
      modelId: "gpt-5.6-terra",
      reasoningLevel: "high",
      fixtureCopy: "fresh-per-run",
      productRepositoryAccess: "forbidden",
      productSourceAccess: "forbidden",
      remoteAccess: "forbidden",
      runtimeSettings: { toolAccess: "toolkit-only", workspaceScope: "fixture-only" }
    });
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record: nonCanonicalRecord }),
      /observed-benchmark:settings-binding/u
    );

    const unsafeSettingsRecord = measuredRecord(root);
    const unsafeSettings = unsafeSettingsRecord.variantSettings.baseline;
    unsafeSettings.sha256 = writeJson(root, unsafeSettings.path, {
      schemaVersion: "1.0.0",
      variant: "baseline",
      modelId: "gpt-5.6-terra",
      reasoningLevel: "high",
      fixtureCopy: "fresh-per-run",
      productRepositoryAccess: "allowed",
      productSourceAccess: "forbidden",
      remoteAccess: "forbidden",
      runtimeSettings: { toolAccess: "toolkit-only", workspaceScope: "fixture-only" }
    });
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record: unsafeSettingsRecord }),
      /observed-benchmark:settings-artifact/u
    );

    const validRecord = measuredRecord(root);
    const run = validRecord.runs[0];
    run.resultArtifact.sha256 = writeJson(root, run.resultArtifact.path, { arbitrary: true });
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record: validRecord }),
      /observed-benchmark:run-result-artifact/u
    );

    const elsewhereRecord = measuredRecord(root);
    const elsewhereRun = elsewhereRecord.runs[0];
    const canonicalResult = JSON.parse(readFileSync(path.join(root, elsewhereRun.resultArtifact.path), "utf8"));
    elsewhereRun.resultArtifact.path = "evals/observed/runs/elsewhere.json";
    elsewhereRun.resultArtifact.sha256 = writeJson(root, elsewhereRun.resultArtifact.path, canonicalResult);
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record: elsewhereRecord }),
      /observed-benchmark:run-result-binding/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("safe containment rejects an observed fixture behind a linked parent directory", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-benchmark-linked-parent-"));
  const external = mkdtempSync(path.join(tmpdir(), "observed-benchmark-external-"));
  try {
    copyCanonicalFixtureSet(root);
    copyCanonicalFixtureSet(external);
    const fixtureParent = path.join(root, "evals", "observed", "fixtures");
    rmSync(fixtureParent, { recursive: true, force: true });
    symlinkSync(path.join(external, "evals", "observed", "fixtures"), fixtureParent, "junction");
    const record = measuredRecord(root);
    assert.throws(
      () => validateObservedEnterpriseBenchmark({ root, record }),
      /linked|reparse/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(external, { recursive: true, force: true });
  }
});

test("release evidence accepts only a measured-passed benchmark record with matching digest, commit, and owner review", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-benchmark-release-"));
  try {
    copyCanonicalFixtureSet(root);
    const record = measuredRecord(root);
    const evidencePath = path.join(root, "evals", "observed", "enterprise-core-v0.3.json");
    mkdirSync(path.dirname(evidencePath), { recursive: true });
    writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    const observed = {
      status: "observed",
      evidencePath: "evals/observed/enterprise-core-v0.3.json",
      sha256: canonicalTextSha256(readFileSync(evidencePath)),
      repositoryCommit: record.toolkitCommit,
      ownerReview: {
        ownerId: record.ownerReview.identity,
        decision: record.ownerReview.decision,
        reviewedAt: record.ownerReview.approvedAt
      }
    };
    assert.doesNotThrow(() => validateObservedEnterpriseCoreEvidenceRecord(root, observed));
    record.status = "measured-failed";
    for (const run of record.runs.slice(0, 4)) {
      const artifactPath = path.join(root, run.resultArtifact.path);
      const result = JSON.parse(readFileSync(artifactPath, "utf8"));
      result.exactGoldenRouting = false;
      run.resultArtifact.sha256 = writeJson(root, run.resultArtifact.path, result);
    }
    record.summary.exactGoldenRouting = 0.866666666667;
    writeFileSync(evidencePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    observed.sha256 = canonicalTextSha256(readFileSync(evidencePath));
    assert.throws(
      () => validateObservedEnterpriseCoreEvidenceRecord(root, observed),
      /measured-passed/u
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
