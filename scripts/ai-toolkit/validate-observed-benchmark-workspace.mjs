#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { canonicalTextSha256 } from "./kernel/canonical-digest.mjs";
import { assertPathContained, assertRegularFileWithin } from "../../install/safe-filesystem.mjs";
import {
  assertObservedBenchmarkWorkspaceReceipt,
  OBSERVED_WORKSPACE_EXECUTION_STATUS,
  readObservedBenchmarkWorkspaceContract
} from "./prepare-observed-benchmark-workspace.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(code) {
  throw new Error(`observed-benchmark-workspace:${code}`);
}

function assertFreshWorkspace(workspacePath) {
  if (typeof workspacePath !== "string" || workspacePath === "") fail("workspace-path");
  const canonicalWorkspace = path.resolve(workspacePath);
  const relative = path.relative(tmpdir(), canonicalWorkspace);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)
    || !path.basename(canonicalWorkspace).startsWith("ai-toolkit-observed-")) fail("workspace-not-fresh-os-temp");
  assertPathContained(tmpdir(), canonicalWorkspace, "observed benchmark workspace");
  return canonicalWorkspace;
}

function readWorkspaceDigest(workspacePath, relativePath, label) {
  const target = path.resolve(workspacePath, relativePath);
  assertRegularFileWithin(workspacePath, target, label);
  const contents = readFileSync(target);
  assertRegularFileWithin(workspacePath, target, `${label} post-read`);
  return `sha256:${canonicalTextSha256(contents, label)}`;
}

function runFocusedTest(workspacePath, command) {
  const result = spawnSync(process.execPath, [command[1]], {
    cwd: workspacePath,
    encoding: "utf8",
    shell: false,
    timeout: 30_000,
    windowsHide: true
  });
  if (result.error || result.signal || result.status !== 0) {
    fail(`focused-test-failed:${result.error?.message ?? result.stderr?.trim() ?? "nonzero"}`);
  }
  return Object.freeze({ status: "passed", command: [...command], stdout: String(result.stdout ?? "").trim() });
}

function snapshotCandidateFiles(workspacePath, contract) {
  const allowed = new Set([
    ...contract.sourceFiles.map(({ candidatePath }) => candidatePath),
    contract.focusedTest.path,
    ".observed-benchmark-receipt.json"
  ]);
  const snapshot = [];
  function visit(directory, prefix = "") {
    assertPathContained(workspacePath, directory, "candidate workspace directory");
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(target, relativePath);
      } else if (entry.isFile()) {
        if (!allowed.has(relativePath)) fail("unexpected-file");
        snapshot.push(Object.freeze({ path: relativePath, digest: readWorkspaceDigest(workspacePath, relativePath, "candidate snapshot") }));
      } else {
        fail("candidate-entry-type");
      }
    }
  }
  visit(workspacePath);
  snapshot.sort((left, right) => left.path.localeCompare(right.path));
  if (JSON.stringify(snapshot.map(({ path: relativePath }) => relativePath)) !== JSON.stringify([...allowed].sort())) {
    fail("candidate-files-incomplete");
  }
  return Object.freeze(snapshot);
}

function sameContract(left, right) {
  return left.taskId === right.taskId
    && left.expectedManifestDigest === right.expectedManifestDigest
    && left.focusedTest.digest === right.focusedTest.digest
    && JSON.stringify(left.sourceFiles) === JSON.stringify(right.sourceFiles);
}

export function validateObservedBenchmarkWorkspace({ root = MODULE_ROOT, taskId, workspacePath, receipt } = {}) {
  const canonicalRoot = path.resolve(root);
  const contract = readObservedBenchmarkWorkspaceContract({ root: canonicalRoot, taskId });
  const candidateRoot = assertFreshWorkspace(workspacePath);
  const boundReceipt = assertObservedBenchmarkWorkspaceReceipt({ contract, workspacePath: candidateRoot, receipt });
  const sourceEdits = contract.sourceFiles.map(({ candidatePath, initialDigest, expectedDigest }) => {
    const actualDigest = readWorkspaceDigest(candidateRoot, candidatePath, "candidate source");
    if (actualDigest === initialDigest) fail("source-edit-missing");
    return Object.freeze({ path: candidatePath, digest: actualDigest });
  });
  const focusedTestDigest = readWorkspaceDigest(candidateRoot, contract.focusedTest.path, "candidate focused test");
  if (focusedTestDigest !== contract.focusedTest.digest) fail("focused-test-digest");
  const beforeFocusedTest = snapshotCandidateFiles(candidateRoot, contract);
  const focusedTest = runFocusedTest(candidateRoot, contract.focusedTest.command);
  const afterFocusedTest = snapshotCandidateFiles(candidateRoot, contract);
  if (JSON.stringify(afterFocusedTest) !== JSON.stringify(beforeFocusedTest)) fail("candidate-mutated-during-focused-test");
  const postTestContract = readObservedBenchmarkWorkspaceContract({ root: canonicalRoot, taskId });
  if (!sameContract(contract, postTestContract)) fail("canonical-contract-changed-during-validation");
  return Object.freeze({
    status: "fixture-delivery-verified",
    taskId,
    workspacePath: candidateRoot,
    expectedManifestDigest: contract.expectedManifestDigest,
    receipt: boundReceipt,
    sourceEdits: Object.freeze(sourceEdits),
    focusedTest,
    ...OBSERVED_WORKSPACE_EXECUTION_STATUS
  });
}

function parseArgs(argv) {
  if (argv.length !== 6 || argv[0] !== "--task-id" || argv[2] !== "--workspace" || argv[4] !== "--receipt") fail("cli-arguments");
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(path.resolve(argv[5]), "utf8"));
  } catch {
    fail("receipt-input");
  }
  return { taskId: argv[1], workspacePath: argv[3], receipt };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(validateObservedBenchmarkWorkspace(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL observed-benchmark-workspace-validate ${error.message}\n`);
    process.exitCode = 1;
  }
}
