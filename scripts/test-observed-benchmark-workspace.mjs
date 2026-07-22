#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_WORKSPACE_TASK_IDS,
  prepareObservedBenchmarkWorkspace
} from "./ai-toolkit/prepare-observed-benchmark-workspace.mjs";
import { validateObservedBenchmarkWorkspace } from "./ai-toolkit/validate-observed-benchmark-workspace.mjs";
import { collectObservedBenchmarkWorkspace } from "./ai-toolkit/collect-observed-benchmark-workspace.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLLECT_CLI = path.join(ROOT, "scripts", "ai-toolkit", "collect-observed-benchmark-workspace.mjs");

function withWorkspace(taskId, callback) {
  const prepared = prepareObservedBenchmarkWorkspace({ root: ROOT, taskId });
  try {
    return callback(prepared);
  } finally {
    rmSync(prepared.workspacePath, { recursive: true, force: true });
  }
}

function applyExpectedSource(root, prepared) {
  const source = path.join(root, prepared.canonicalWorkspaceRelativePath, "expected", "src", "delivery.mjs");
  writeFileSync(path.join(prepared.workspacePath, "src", "delivery.mjs"), readFileSync(source));
}

function validatePrepared(prepared) {
  return validateObservedBenchmarkWorkspace({
    root: ROOT,
    taskId: prepared.taskId,
    workspacePath: prepared.workspacePath,
    receipt: prepared.receipt
  });
}

test("preparation creates one fresh OS-temp candidate workspace per observed task with a cryptographically bound receipt", () => {
  const canonicalBefore = Object.fromEntries(EXPECTED_WORKSPACE_TASK_IDS.flatMap((taskId) => {
    const directory = path.join(ROOT, "evals", "observed", "workspaces", taskId.toLowerCase(), "template");
    return ["src/delivery.mjs", "tests/delivery.test.mjs"].map((relativePath) => [
      `${taskId}/${relativePath}`, readFileSync(path.join(directory, relativePath), "utf8")
    ]);
  }));
  for (const taskId of EXPECTED_WORKSPACE_TASK_IDS) {
    withWorkspace(taskId, (prepared) => {
      assert.equal(prepared.taskId, taskId);
      const relative = path.relative(tmpdir(), prepared.workspacePath);
      assert.equal(relative === "" || relative.startsWith("..") || path.isAbsolute(relative), false);
      assert.match(prepared.templateDigest, /^sha256:[0-9a-f]{64}$/u);
      assert.match(prepared.expectedManifestDigest, /^sha256:[0-9a-f]{64}$/u);
      assert.match(prepared.receipt.nonce, /^[0-9a-f]{64}$/u);
      assert.match(prepared.receipt.bindingDigest, /^sha256:[0-9a-f]{64}$/u);
      assert.equal(prepared.executionTrust, "unavailable");
      assert.equal(prepared.hostIsolation, "unavailable");
      assert.equal(prepared.receipt.workspaceRealpath, prepared.workspaceRealpath);
      assert.deepEqual(JSON.parse(readFileSync(path.join(prepared.workspacePath, ".observed-benchmark-receipt.json"), "utf8")), prepared.receipt);
      assert.equal(readdirSync(prepared.workspacePath).includes("expected"), false);
      assert.equal(readFileSync(path.join(prepared.workspacePath, "src", "delivery.mjs"), "utf8").includes("TODO"), true);
    });
  }
  const canonicalAfter = Object.fromEntries(EXPECTED_WORKSPACE_TASK_IDS.flatMap((taskId) => {
    const directory = path.join(ROOT, "evals", "observed", "workspaces", taskId.toLowerCase(), "template");
    return ["src/delivery.mjs", "tests/delivery.test.mjs"].map((relativePath) => [
      `${taskId}/${relativePath}`, readFileSync(path.join(directory, relativePath), "utf8")
    ]);
  }));
  assert.deepEqual(canonicalAfter, canonicalBefore);
});

test("validator requires the immutable expected source digest and executes the unchanged focused test", () => {
  withWorkspace("BENCH-SOURCE-RELEASE-01", (prepared) => {
    assert.throws(
      () => validateObservedBenchmarkWorkspace({ root: ROOT, taskId: prepared.taskId, workspacePath: prepared.workspacePath }),
      /receipt-required/u
    );
    applyExpectedSource(ROOT, prepared);
    const result = validatePrepared(prepared);
    assert.equal(result.status, "fixture-delivery-verified");
    assert.equal(result.focusedTest.status, "passed");
    assert.equal(result.sourceEdits.length, 1);
  });
});

test("validator accepts an independently written behaviorally correct source rather than requiring expected source bytes", () => {
  withWorkspace("BENCH-MAINT-01", (prepared) => {
    writeFileSync(path.join(prepared.workspacePath, "src", "delivery.mjs"), [
      "export const repairDisplayName = (value) => {",
      "  if (typeof value !== 'string') throw new TypeError('display name must be a string');",
      "  const result = value.trim().split(/\\s+/u).join(' ');",
      "  if (!result) throw new Error('display name is required');",
      "  return result;",
      "};",
      ""
    ].join("\n"));
    assert.notEqual(
      readFileSync(path.join(prepared.workspacePath, "src", "delivery.mjs"), "utf8"),
      readFileSync(path.join(ROOT, prepared.canonicalWorkspaceRelativePath, "expected", "src", "delivery.mjs"), "utf8")
    );
    assert.equal(validatePrepared(prepared).status, "fixture-delivery-verified");
  });
});

test("validator rejects candidate source self-mutation or files created during the focused test", () => {
  withWorkspace("BENCH-MAINT-01", (prepared) => {
    writeFileSync(path.join(prepared.workspacePath, "src", "delivery.mjs"), [
      "import { writeFileSync } from 'node:fs';",
      "writeFileSync(new URL(import.meta.url), 'export const repairDisplayName = () => 1;\\n');",
      "export const repairDisplayName = (value) => {",
      "  const result = value.trim().split(/\\s+/u).join(' ');",
      "  if (!result) throw new Error('display name is required');",
      "  return result;",
      "};",
      ""
    ].join("\n"));
    assert.throws(() => validatePrepared(prepared), /candidate-mutated-during-focused-test/u);
  });
});

test("receipt binds optional variant and run identity and fails closed if canonical contract changes", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-workspace-contract-"));
  let prepared = null;
  try {
    cpSync(path.join(ROOT, "evals", "observed", "workspaces"), path.join(root, "evals", "observed", "workspaces"), { recursive: true });
    prepared = prepareObservedBenchmarkWorkspace({ root, taskId: "BENCH-API-01", variant: "baseline", run: 2 });
    assert.equal(prepared.receipt.variant, "baseline");
    assert.equal(prepared.receipt.run, 2);
    applyExpectedSource(root, prepared);
    writeFileSync(
      path.join(root, prepared.canonicalWorkspaceRelativePath, "expected", "src", "delivery.mjs"),
      "export const changed = true;\n"
    );
    assert.throws(
      () => validateObservedBenchmarkWorkspace({ root, taskId: prepared.taskId, workspacePath: prepared.workspacePath, receipt: prepared.receipt }),
      /receipt-binding/u
    );
  } finally {
    if (prepared !== null) rmSync(prepared.workspacePath, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test("validator cannot be passed by mutating the focused test or adding linked candidate input", () => {
  withWorkspace("BENCH-API-01", (prepared) => {
    applyExpectedSource(ROOT, prepared);
    writeFileSync(path.join(prepared.workspacePath, "tests", "delivery.test.mjs"), "process.exit(0);\n");
    assert.throws(
      () => validatePrepared(prepared),
      /focused-test-digest/u
    );
  });

  withWorkspace("BENCH-WEB-01", (prepared) => {
    applyExpectedSource(ROOT, prepared);
    const external = mkdtempSync(path.join(tmpdir(), "observed-workspace-external-"));
    try {
      rmSync(path.join(prepared.workspacePath, "src"), { recursive: true, force: true });
      symlinkSync(external, path.join(prepared.workspacePath, "src"), "junction");
      assert.throws(
        () => validatePrepared(prepared),
        /linked|reparse/u
      );
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });
});

test("validator rejects a manually made matching-prefix temp directory without a preparation receipt", () => {
  const workspacePath = mkdtempSync(path.join(tmpdir(), "ai-toolkit-observed-bench-web-01-manual-"));
  try {
    assert.throws(
      () => validateObservedBenchmarkWorkspace({ root: ROOT, taskId: "BENCH-WEB-01", workspacePath }),
      /receipt-required/u
    );
  } finally {
    rmSync(workspacePath, { recursive: true, force: true });
  }
});

test("validator rejects a workspace-root junction even when a receipt names its original path", () => {
  withWorkspace("BENCH-WEB-01", (prepared) => {
    const external = mkdtempSync(path.join(tmpdir(), "observed-workspace-root-external-"));
    try {
      cpSync(prepared.workspacePath, external, { recursive: true });
      rmSync(prepared.workspacePath, { recursive: true, force: true });
      symlinkSync(external, prepared.workspacePath, "junction");
      assert.throws(() => validatePrepared(prepared), /linked|reparse/u);
    } finally {
      rmSync(external, { recursive: true, force: true });
    }
  });
});

test("validator rejects a traversal-shaped workspace path before it can inspect candidate files", () => {
  withWorkspace("BENCH-WEB-UX-02", (prepared) => {
    applyExpectedSource(ROOT, prepared);
    const outsideTemp = path.resolve(tmpdir(), "..", "observed-workspace-outside-temp");
    assert.throws(
      () => validateObservedBenchmarkWorkspace({ root: ROOT, taskId: prepared.taskId, workspacePath: outsideTemp, receipt: prepared.receipt }),
      /workspace-not-fresh-os-temp/u
    );
  });
});

test("collector returns validated fixture-local execution evidence without benchmark metrics or record mutation", () => {
  withWorkspace("BENCH-MAINT-01", (prepared) => {
    applyExpectedSource(ROOT, prepared);
    const before = readFileSync(path.join(ROOT, "evals", "observed", "enterprise-core-v0.3.json"), "utf8");
    const result = collectObservedBenchmarkWorkspace({ root: ROOT, taskId: prepared.taskId, workspacePath: prepared.workspacePath, receipt: prepared.receipt });
    assert.equal(result.status, "fixture-delivery-verified");
    assert.equal(Object.hasOwn(result, "metrics"), false);
    assert.equal(Object.hasOwn(result, "humanReview"), false);
    assert.equal(result.receipt.bindingDigest, prepared.receipt.bindingDigest);
    assert.equal(result.executionTrust, "unavailable");
    assert.equal(result.hostIsolation, "unavailable");
    assert.equal(readFileSync(path.join(ROOT, "evals", "observed", "enterprise-core-v0.3.json"), "utf8"), before);
  });
});

test("collector CLI requires a receipt and invokes validation with it", () => {
  withWorkspace("BENCH-API-01", (prepared) => {
    applyExpectedSource(ROOT, prepared);
    const receiptPath = path.join(prepared.workspacePath, ".observed-benchmark-receipt.json");
    const missingReceipt = spawnSync(process.execPath, [COLLECT_CLI,
      "--task-id", prepared.taskId,
      "--workspace", prepared.workspacePath
    ], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    assert.equal(missingReceipt.status, 1);
    assert.match(missingReceipt.stderr, /cli-arguments/u);
    const result = spawnSync(process.execPath, [COLLECT_CLI,
      "--task-id", prepared.taskId,
      "--workspace", prepared.workspacePath,
      "--receipt", receiptPath
    ], { cwd: ROOT, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    const collected = JSON.parse(result.stdout);
    assert.equal(collected.status, "fixture-delivery-verified");
    assert.equal(collected.receipt.bindingDigest, prepared.receipt.bindingDigest);
    assert.equal(collected.executionTrust, "unavailable");
  });
});

test("preparation failure removes its fresh temp root and never changes a canonical template", () => {
  const root = mkdtempSync(path.join(tmpdir(), "observed-workspace-canonical-"));
  let external = null;
  const tempEntriesBefore = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("ai-toolkit-observed-bench-api-01-")));
  try {
    cpSync(path.join(ROOT, "evals", "observed", "workspaces"), path.join(root, "evals", "observed", "workspaces"), { recursive: true });
    const templateSourceDirectory = path.join(root, "evals", "observed", "workspaces", "bench-api-01", "template", "src");
    external = mkdtempSync(path.join(tmpdir(), "observed-workspace-template-external-"));
    rmSync(templateSourceDirectory, { recursive: true, force: true });
    symlinkSync(external, templateSourceDirectory, "junction");
    assert.throws(() => prepareObservedBenchmarkWorkspace({ root, taskId: "BENCH-API-01" }), /template-entry-type|linked|reparse/u);
    assert.deepEqual(
      new Set(readdirSync(tmpdir()).filter((name) => name.startsWith("ai-toolkit-observed-bench-api-01-"))),
      tempEntriesBefore
    );
  } finally {
    if (external !== null) rmSync(external, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
