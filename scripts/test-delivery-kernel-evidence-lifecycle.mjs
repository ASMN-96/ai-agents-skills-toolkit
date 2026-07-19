#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import { buildEvidenceRecord } from "./ai-toolkit/kernel/evidence.mjs";

test("legacy evidence cannot verify while a selected resource was never invoked", () => {
  const evidence = buildEvidenceRecord({
    taskId: "TASK-EVIDENCE-1",
    selectedResources: ["architect-agent", "code-quality"],
    invokedResources: ["architect-agent"],
    requiredChecks: ["focused-tests"],
    checks: [{
      id: "focused-tests",
      status: "passed",
      command: "node --test",
      outputRef: "sha256:observed"
    }]
  });

  assert.equal(evidence.verified, false);
  assert.equal(evidence.disposition, "blocked");
  assert.deepEqual(evidence.selectedNotInvoked, ["code-quality"]);
});
