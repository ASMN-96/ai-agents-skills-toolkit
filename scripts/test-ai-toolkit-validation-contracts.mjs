#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import {
  VALIDATION_TIERS,
  classifyValidationTier,
  collectMirrorRecordFailures,
  sha256NormalizedText
} from "./ai-toolkit/validation-contracts.mjs";

test("every copy-only mode rejects a stale target with its matching stale manifest hash", () => {
  const staleTarget = "stale packaged content\r\n";
  for (const [mode, expected] of [
    ["byte-identical", "byte-identical mirror source/target drift"],
    ["packaged-support-asset", "packaged-support-asset mirror source/target content drift after LF normalization"],
    ["packaged-source-hash", "packaged-source-hash mirror source/target content drift after LF normalization"]
  ]) {
    const failures = collectMirrorRecordFailures({
      mode,
      sourceContent: "current canonical content\n",
      targetContent: staleTarget,
      manifestSha256: sha256NormalizedText(staleTarget)
    });

    assert.deepEqual(failures, [expected], mode);
  }
});

test("packaged text modes deliberately accept CRLF/LF differences", () => {
  for (const mode of ["packaged-support-asset", "packaged-source-hash"]) {
    assert.deepEqual(collectMirrorRecordFailures({
      mode,
      sourceContent: "same content\r\n",
      targetContent: "same content\n",
      manifestSha256: sha256NormalizedText("same content\n")
    }), []);
  }
});

test("byte-identical mode rejects line-ending byte drift", () => {
  assert.deepEqual(collectMirrorRecordFailures({
    mode: "byte-identical",
    sourceContent: "same content\r\n",
    targetContent: "same content\n",
    manifestSha256: sha256NormalizedText("same content\n")
  }), ["byte-identical mirror source/target drift"]);
});

const tierCases = [
  ["release request", { releaseReadinessRequested: true }, VALIDATION_TIERS.RELEASE_READINESS],
  ["inspection", { inspectionOnly: true, affectedSurfaces: ["security-controls"] }, VALIDATION_TIERS.INSPECTION],
  ["high-risk security", { changeRequested: true, affectedSurfaces: ["authorization"] }, VALIDATION_TIERS.HIGH_RISK_SECURITY],
  ["executable behavior", { changeRequested: true, affectedSurfaces: ["application-code"] }, VALIDATION_TIERS.EXECUTABLE_BEHAVIOR],
  ["docs only", { changeRequested: true, documentationOnly: true }, VALIDATION_TIERS.DOCUMENTATION],
  ["docs changing executable contract", { changeRequested: true, documentationOnly: true, documentationChangesExecutableContract: true }, VALIDATION_TIERS.EXECUTABLE_BEHAVIOR],
  ["instruction/runtime only", { changeRequested: true, instructionRuntimeOnly: true }, VALIDATION_TIERS.INSTRUCTION_RUNTIME],
  ["unknown executable", { changeRequested: true, affectedSurfaces: ["unknown"] }, VALIDATION_TIERS.EXECUTABLE_BEHAVIOR],
  ["mixed work uses highest tier", { changeRequested: true, documentationOnly: true, instructionRuntimeOnly: true, affectedSurfaces: ["security-controls"] }, VALIDATION_TIERS.HIGH_RISK_SECURITY]
];

for (const [name, signals, expected] of tierCases) {
  test(`validation tier: ${name}`, () => {
    assert.equal(classifyValidationTier(signals), expected);
  });
}
