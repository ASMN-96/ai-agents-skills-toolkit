#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

import { validateObservedBenchmarkWorkspace } from "./validate-observed-benchmark-workspace.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function collectObservedBenchmarkWorkspace(input = {}) {
  const validated = validateObservedBenchmarkWorkspace({ root: MODULE_ROOT, ...input });
  return Object.freeze({
    evidenceType: "fixture-local-code-delivery",
    status: validated.status,
    taskId: validated.taskId,
    expectedManifestDigest: validated.expectedManifestDigest,
    receipt: validated.receipt,
    sourceEdits: validated.sourceEdits,
    focusedTest: validated.focusedTest,
    benchmarkMetricsRecorded: false,
    humanScoresRecorded: false,
    observedRecordMutation: "none",
    executionTrust: validated.executionTrust,
    hostIsolation: validated.hostIsolation,
    modelExecution: validated.modelExecution
  });
}

function parseArgs(argv) {
  if (argv.length !== 6 || argv[0] !== "--task-id" || argv[2] !== "--workspace" || argv[4] !== "--receipt") {
    throw new Error("observed-benchmark-workspace:cli-arguments");
  }
  try {
    return { taskId: argv[1], workspacePath: argv[3], receipt: JSON.parse(readFileSync(path.resolve(argv[5]), "utf8")) };
  } catch {
    throw new Error("observed-benchmark-workspace:receipt-input");
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(collectObservedBenchmarkWorkspace(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL observed-benchmark-workspace-collect ${error.message}\n`);
    process.exitCode = 1;
  }
}
