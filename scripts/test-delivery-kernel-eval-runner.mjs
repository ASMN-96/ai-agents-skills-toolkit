#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  discoverDeliveryKernelTestFiles,
  formatDeliveryKernelEvalResult,
  parseNodeTestSummary,
  runDeliveryKernelEvals
} from "./ai-toolkit/run-delivery-kernel-evals.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNNER = path.join(ROOT, "scripts", "ai-toolkit", "run-delivery-kernel-evals.mjs");

test("delivery-kernel eval runner discovers the full suite and reports real TAP counts", () => {
  const result = spawnSync(process.execPath, [RUNNER], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  assert.equal(result.status, 0, output);
  const match = result.stdout.match(
    /^PASS run-delivery-kernel-evals files=(\d+) tests=(\d+) pass=(\d+) fail=(\d+) skipped=(\d+)\r?\n?$/u
  );
  assert.ok(match, output);

  const [, files, tests, passed, failed, skipped] = match.map(Number);
  assert.ok(files >= 8, `expected at least 8 discovered files, received ${files}`);
  assert.ok(tests >= 80, `expected at least 80 behavior tests, received ${tests}`);
  assert.equal(failed, 0);
  assert.equal(passed + skipped, tests);
});

test("delivery-kernel eval discovery is deterministic and excludes its own runner test", () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-evals-"));
  const scriptsDirectory = path.join(temporaryRoot, "scripts");

  try {
    mkdirSync(scriptsDirectory);
    for (const fileName of [
      "test-delivery-kernel-zeta.mjs",
      "test-delivery-kernel-eval-runner.mjs",
      "not-a-delivery-kernel-test.mjs",
      "test-delivery-kernel-alpha.mjs"
    ]) {
      writeFileSync(path.join(scriptsDirectory, fileName), "export {};\n", "utf8");
    }

    assert.deepEqual(
      discoverDeliveryKernelTestFiles(temporaryRoot).map((filePath) => path.basename(filePath)),
      ["test-delivery-kernel-alpha.mjs", "test-delivery-kernel-zeta.mjs"]
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("delivery-kernel eval discovery fails closed when the suite is absent", () => {
  const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-evals-empty-"));

  try {
    mkdirSync(path.join(temporaryRoot, "scripts"));
    assert.throws(
      () => discoverDeliveryKernelTestFiles(temporaryRoot),
      /no-delivery-kernel-tests-discovered/u
    );
    const result = runDeliveryKernelEvals({ root: temporaryRoot });
    assert.equal(result.ok, false);
    assert.equal(
      formatDeliveryKernelEvalResult(result),
      "FAIL run-delivery-kernel-evals files=0 tests=0 pass=0 fail=0 skipped=0 reason=no-tests-discovered"
    );
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("delivery-kernel eval summary parser requires all real Node test counts", () => {
  assert.deepEqual(
    parseNodeTestSummary([
      "# tests 91",
      "# pass 87",
      "# fail 1",
      "# skipped 3"
    ].join("\n")),
    { tests: 91, pass: 87, fail: 1, skipped: 3 }
  );
  assert.throws(
    () => parseNodeTestSummary("# tests 1\n# pass 1\n# fail 0"),
    /incomplete-node-test-summary/u
  );
});
