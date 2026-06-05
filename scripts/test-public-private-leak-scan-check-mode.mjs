#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  checkModeExitCode,
  countCurrentTreeBlockers
} from "./scan-public-private-leaks.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "scan-public-private-leaks.mjs");
const DEFAULT_REPORT = path.join(ROOT, "docs", "PUBLIC_PRIVATE_LEAK_REPORT.md");

async function runScanner(args = []) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd: ROOT });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error)
    };
  }
}

test("--check scans without rewriting the default Markdown report", async () => {
  const before = await readFile(DEFAULT_REPORT, "utf8");
  const result = await runScanner(["--check"]);
  const after = await readFile(DEFAULT_REPORT, "utf8");

  assert.equal(result.code, 0, result.stderr);
  assert.equal(after, before);
  assert.match(result.stdout, /check-only \(no files written\)/);
  assert.match(result.stdout, /scanned files: \d+/);
  assert.match(result.stdout, /findings: \d+/);
  assert.match(result.stdout, /Current-tree blockers: 0/);
});

test("--no-write is accepted as a check-mode alias", async () => {
  const result = await runScanner(["--no-write"]);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /check-only \(no files written\)/);
  assert.match(result.stdout, /Current-tree blockers: 0/);
});

test("check-mode blocker count produces a failing exit code", () => {
  const findings = [
    { classification: "current-tree-blocker" },
    { classification: "false-positive" }
  ];

  assert.equal(countCurrentTreeBlockers(findings), 1);
  assert.equal(checkModeExitCode(findings), 1);
});
