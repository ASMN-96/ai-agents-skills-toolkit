#!/usr/bin/env node
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { canonicalDigest, canonicalTextSha256 } from "./kernel/canonical-digest.mjs";
import { assertPathContained, assertRegularFileWithin } from "../../install/safe-filesystem.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WORKSPACE_ROOT = "evals/observed/workspaces";
export const EXPECTED_WORKSPACE_TASK_IDS = Object.freeze([
  "BENCH-MAINT-01", "BENCH-WEB-01", "BENCH-WEB-UX-02", "BENCH-API-01", "BENCH-SOURCE-RELEASE-01"
]);
const VARIANTS = Object.freeze(["baseline", "kernel-routed"]);
const RECEIPT_FILE = ".observed-benchmark-receipt.json";
export const OBSERVED_WORKSPACE_EXECUTION_STATUS = Object.freeze({
  executionTrust: "unavailable",
  hostIsolation: "unavailable",
  modelExecution: "blocked-pending-host-owned-disposable-sandbox"
});

function fail(code) {
  throw new Error(`observed-benchmark-workspace:${code}`);
}

function isPlainRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function assertExactFields(value, fields, code) {
  if (!isPlainRecord(value) || JSON.stringify(Object.keys(value)) !== JSON.stringify(fields)) fail(code);
}

function assertRelativeFilePath(value, code) {
  if (typeof value !== "string" || value === "" || value.includes("\\") || path.posix.isAbsolute(value)
    || path.posix.normalize(value) !== value || value.startsWith("../") || value === "." || value === "..") fail(code);
  return value;
}

function taskDirectory(taskId) {
  if (!EXPECTED_WORKSPACE_TASK_IDS.includes(taskId)) fail("task-id");
  return `${WORKSPACE_ROOT}/${taskId.toLowerCase()}`;
}

function readCanonicalText(root, relativePath, label) {
  const target = path.resolve(root, relativePath);
  assertRegularFileWithin(root, target, label);
  const contents = readFileSync(target);
  assertRegularFileWithin(root, target, `${label} post-read`);
  return { contents, digest: `sha256:${canonicalTextSha256(contents, label)}` };
}

export function readObservedBenchmarkWorkspaceContract({ root = MODULE_ROOT, taskId }) {
  const relativeDirectory = taskDirectory(taskId);
  const manifestRelativePath = `${relativeDirectory}/expected/manifest.json`;
  const manifestText = readCanonicalText(root, manifestRelativePath, "canonical expected manifest");
  let manifest;
  try {
    manifest = JSON.parse(manifestText.contents.toString("utf8"));
  } catch {
    fail("expected-manifest-json");
  }
  assertExactFields(manifest, ["schemaVersion", "taskId", "sourceFiles", "focusedTest"], "expected-manifest-schema");
  if (manifest.schemaVersion !== "1.0.0" || manifest.taskId !== taskId || !Array.isArray(manifest.sourceFiles)
    || manifest.sourceFiles.length === 0) fail("expected-manifest-schema");
  const sourceFiles = manifest.sourceFiles.map((source, index) => {
    assertExactFields(source, ["candidatePath", "expectedPath"], "expected-source-schema");
    const candidatePath = assertRelativeFilePath(source.candidatePath, "expected-source-path");
    const expectedPath = assertRelativeFilePath(source.expectedPath, "expected-source-path");
    const template = readCanonicalText(root, `${relativeDirectory}/template/${candidatePath}`, `template source ${index}`);
    const expected = readCanonicalText(root, `${relativeDirectory}/expected/${expectedPath}`, `expected source ${index}`);
    if (template.digest === expected.digest) fail("source-edit-not-required");
    return Object.freeze({ candidatePath, initialDigest: template.digest, expectedDigest: expected.digest });
  });
  assertExactFields(manifest.focusedTest, ["path", "command"], "focused-test-schema");
  const focusedTestPath = assertRelativeFilePath(manifest.focusedTest.path, "focused-test-path");
  if (!Array.isArray(manifest.focusedTest.command)
    || JSON.stringify(manifest.focusedTest.command) !== JSON.stringify(["node", focusedTestPath])) fail("focused-test-command");
  const focusedTest = readCanonicalText(root, `${relativeDirectory}/template/${focusedTestPath}`, "canonical focused test");
  return Object.freeze({
    taskId,
    relativeDirectory,
    templateRelativePath: `${relativeDirectory}/template`,
    expectedManifestDigest: manifestText.digest,
    sourceFiles: Object.freeze(sourceFiles),
    focusedTest: Object.freeze({ path: focusedTestPath, digest: focusedTest.digest, command: Object.freeze(["node", focusedTestPath]) })
  });
}

function copyCanonicalDirectory(root, source, destination) {
  assertPathContained(root, source, "canonical workspace template");
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyCanonicalDirectory(root, sourcePath, destinationPath);
    } else if (entry.isFile()) {
      assertRegularFileWithin(root, sourcePath, "canonical workspace template file");
      writeFileSync(destinationPath, readFileSync(sourcePath));
    } else {
      fail("template-entry-type");
    }
  }
}

function templateDigest(root, contract) {
  const values = contract.sourceFiles.map(({ candidatePath, initialDigest }) => ({ candidatePath, initialDigest }));
  values.push({ candidatePath: contract.focusedTest.path, initialDigest: contract.focusedTest.digest });
  return `sha256:${canonicalDigest(values, "canonical workspace template")}`;
}

function runIdentity({ variant = undefined, run = undefined } = {}) {
  if (variant === undefined && run === undefined) return Object.freeze({ variant: null, run: null });
  if (variant === null && run === null) return Object.freeze({ variant: null, run: null });
  if (!VARIANTS.includes(variant) || !Number.isInteger(run) || run < 1 || run > 3) fail("run-identity");
  return Object.freeze({ variant, run });
}

function receiptPayload({ contract, workspaceRealpath, templateDigest: digest, nonce, variant, run }) {
  return {
    schemaVersion: "1.0.0",
    taskId: contract.taskId,
    variant,
    run,
    nonce,
    workspaceRealpath,
    templateDigest: digest,
    expectedManifestDigest: contract.expectedManifestDigest,
    expectedSourceDigests: contract.sourceFiles.map(({ candidatePath, expectedDigest }) => ({ path: candidatePath, digest: expectedDigest })),
    focusedTestDigest: contract.focusedTest.digest
  };
}

function receiptBindingDigest(payload) {
  return `sha256:${canonicalDigest(payload, "observed workspace preparation receipt")}`;
}

function sameContract(left, right) {
  return left.taskId === right.taskId
    && left.expectedManifestDigest === right.expectedManifestDigest
    && left.focusedTest.path === right.focusedTest.path
    && left.focusedTest.digest === right.focusedTest.digest
    && JSON.stringify(left.sourceFiles) === JSON.stringify(right.sourceFiles);
}

function readWorkspaceReceipt(workspacePath) {
  const receiptPath = path.join(workspacePath, RECEIPT_FILE);
  assertRegularFileWithin(tmpdir(), receiptPath, "prepared workspace receipt");
  try {
    return JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch {
    fail("receipt-json");
  }
}

export function assertObservedBenchmarkWorkspaceReceipt({ contract, workspacePath, receipt }) {
  if (!isPlainRecord(receipt)) fail("receipt-required");
  const expectedFields = [
    "schemaVersion", "taskId", "variant", "run", "nonce", "workspaceRealpath", "templateDigest",
    "expectedManifestDigest", "expectedSourceDigests", "focusedTestDigest", "bindingDigest"
  ];
  assertExactFields(receipt, expectedFields, "receipt-schema");
  const actualRealpath = realpathSync.native(workspacePath);
  const payload = receiptPayload({
    contract,
    workspaceRealpath: actualRealpath,
    templateDigest: templateDigest("receipt", contract),
    nonce: receipt.nonce,
    variant: receipt.variant,
    run: receipt.run
  });
  const identity = runIdentity(receipt);
  if (receipt.schemaVersion !== "1.0.0" || !/^[0-9a-f]{64}$/u.test(receipt.nonce)
    || receipt.taskId !== contract.taskId || receipt.workspaceRealpath !== actualRealpath
    || receipt.templateDigest !== payload.templateDigest
    || receipt.expectedManifestDigest !== contract.expectedManifestDigest
    || receipt.focusedTestDigest !== contract.focusedTest.digest
    || JSON.stringify(receipt.expectedSourceDigests) !== JSON.stringify(payload.expectedSourceDigests)
    || receipt.bindingDigest !== receiptBindingDigest(payload)
    || JSON.stringify(identity) !== JSON.stringify({ variant: receipt.variant, run: receipt.run })) {
    fail("receipt-binding");
  }
  const workspaceReceipt = readWorkspaceReceipt(workspacePath);
  if (JSON.stringify(workspaceReceipt) !== JSON.stringify(receipt)) fail("receipt-workspace-binding");
  return Object.freeze({ ...receipt });
}

export function prepareObservedBenchmarkWorkspace({ root = MODULE_ROOT, taskId, variant = undefined, run = undefined } = {}) {
  const canonicalRoot = path.resolve(root);
  const identity = runIdentity({ variant, run });
  const contract = readObservedBenchmarkWorkspaceContract({ root: canonicalRoot, taskId });
  const digest = templateDigest(canonicalRoot, contract);
  let workspacePath = null;
  try {
    workspacePath = mkdtempSync(path.join(tmpdir(), `ai-toolkit-observed-${taskId.toLowerCase()}-`));
    copyCanonicalDirectory(canonicalRoot, path.join(canonicalRoot, contract.templateRelativePath), workspacePath);
    assertPathContained(tmpdir(), workspacePath, "fresh observed workspace");
    const postCopyContract = readObservedBenchmarkWorkspaceContract({ root: canonicalRoot, taskId });
    if (!sameContract(contract, postCopyContract) || digest !== templateDigest(canonicalRoot, postCopyContract)) {
      fail("canonical-contract-changed-during-prepare");
    }
    const workspaceRealpath = realpathSync.native(workspacePath);
    const payload = receiptPayload({
      contract,
      workspaceRealpath,
      templateDigest: digest,
      nonce: randomBytes(32).toString("hex"),
      ...identity
    });
    const receipt = Object.freeze({ ...payload, bindingDigest: receiptBindingDigest(payload) });
    writeFileSync(path.join(workspacePath, RECEIPT_FILE), `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    assertObservedBenchmarkWorkspaceReceipt({ contract, workspacePath, receipt });
    const postReceiptContract = readObservedBenchmarkWorkspaceContract({ root: canonicalRoot, taskId });
    if (!sameContract(contract, postReceiptContract) || digest !== templateDigest(canonicalRoot, postReceiptContract)) {
      fail("canonical-contract-changed-during-prepare");
    }
    return Object.freeze({
      taskId,
      workspacePath,
      workspaceRealpath,
      canonicalWorkspaceRelativePath: contract.relativeDirectory,
      templateDigest: digest,
      expectedManifestDigest: contract.expectedManifestDigest,
      receipt,
      ...OBSERVED_WORKSPACE_EXECUTION_STATUS
    });
  } catch (error) {
    if (workspacePath !== null) rmSync(workspacePath, { recursive: true, force: true });
    fail(`prepare:${error.message}`);
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (typeof value !== "string" || !["--task-id", "--variant", "--run"].includes(option) || Object.hasOwn(parsed, option)) {
      fail("cli-arguments");
    }
    parsed[option] = value;
  }
  if (typeof parsed["--task-id"] !== "string") fail("cli-arguments");
  if ((parsed["--variant"] === undefined) !== (parsed["--run"] === undefined)) fail("cli-arguments");
  return {
    taskId: parsed["--task-id"],
    ...(parsed["--variant"] === undefined ? {} : { variant: parsed["--variant"], run: Number(parsed["--run"]) })
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(`${JSON.stringify(prepareObservedBenchmarkWorkspace(parseArgs(process.argv.slice(2))), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL observed-benchmark-workspace-prepare ${error.message}\n`);
    process.exitCode = 1;
  }
}
