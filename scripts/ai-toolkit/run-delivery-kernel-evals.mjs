#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EVAL_RUNNER_TEST = "test-delivery-kernel-eval-runner.mjs";
const TEST_FILE_PATTERN = /^test-delivery-kernel.*\.mjs$/u;

function compareCodeUnits(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

export function discoverDeliveryKernelTestFiles(root = ROOT) {
  const scriptsDirectory = path.join(root, "scripts");
  const matchingEntries = readdirSync(scriptsDirectory, { withFileTypes: true })
    .filter((entry) => TEST_FILE_PATTERN.test(entry.name) && entry.name !== EVAL_RUNNER_TEST)
    .sort((left, right) => compareCodeUnits(left.name, right.name));

  for (const entry of matchingEntries) {
    if (!entry.isFile()) {
      throw new Error(`delivery-kernel-test-must-be-regular-file:${entry.name}`);
    }
  }

  if (matchingEntries.length === 0) {
    throw new Error("no-delivery-kernel-tests-discovered");
  }

  return matchingEntries.map((entry) => path.join(scriptsDirectory, entry.name));
}

export function parseNodeTestSummary(output) {
  const counts = {};

  for (const label of ["tests", "pass", "fail", "skipped"]) {
    const pattern = new RegExp(`^# ${label} (\\d+)\\r?$`, "gmu");
    const matches = [...output.matchAll(pattern)];
    if (matches.length === 0) {
      throw new Error(`incomplete-node-test-summary:missing-${label}`);
    }
    counts[label] = Number.parseInt(matches.at(-1)[1], 10);
  }

  return counts;
}

export function runDeliveryKernelEvals({
  root = ROOT,
  spawnSyncImplementation = spawnSync
} = {}) {
  let testFiles;
  try {
    testFiles = discoverDeliveryKernelTestFiles(root);
  } catch (error) {
    return {
      ok: false,
      reason: error.message === "no-delivery-kernel-tests-discovered"
        ? "no-tests-discovered"
        : "test-discovery-failed",
      files: 0,
      tests: 0,
      pass: 0,
      fail: 0,
      skipped: 0,
      diagnostics: `${error.stack ?? error.message}\n`
    };
  }

  const childEnvironment = { ...process.env };
  delete childEnvironment.NODE_TEST_CONTEXT;
  const result = spawnSyncImplementation(process.execPath, ["--test", ...testFiles], {
    cwd: root,
    encoding: "utf8",
    env: childEnvironment,
    maxBuffer: 16 * 1024 * 1024
  });
  const diagnostics = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  let counts;
  try {
    counts = parseNodeTestSummary(diagnostics);
  } catch (error) {
    return {
      ok: false,
      reason: "invalid-node-test-summary",
      files: testFiles.length,
      tests: 0,
      pass: 0,
      fail: 0,
      skipped: 0,
      diagnostics: `${diagnostics}${error.stack ?? error.message}\n`
    };
  }

  const ok = result.status === 0 && counts.tests > 0 && counts.fail === 0;
  return {
    ok,
    reason: ok ? null : "node-test-failed",
    files: testFiles.length,
    ...counts,
    diagnostics
  };
}

export function formatDeliveryKernelEvalResult(result) {
  const status = result.ok ? "PASS" : "FAIL";
  const reason = result.reason === null ? "" : ` reason=${result.reason}`;
  return `${status} run-delivery-kernel-evals files=${result.files} tests=${result.tests} pass=${result.pass} fail=${result.fail} skipped=${result.skipped}${reason}`;
}

function isDirectExecution() {
  return process.argv[1] !== undefined
    && path.relative(path.resolve(process.argv[1]), fileURLToPath(import.meta.url)) === "";
}

if (isDirectExecution()) {
  const result = runDeliveryKernelEvals();
  if (!result.ok && result.diagnostics.length > 0) {
    process.stderr.write(result.diagnostics);
  }
  process.stdout.write(`${formatDeliveryKernelEvalResult(result)}\n`);
  if (!result.ok) {
    process.exitCode = 1;
  }
}
