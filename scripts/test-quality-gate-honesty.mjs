#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "ai-toolkit", "run-quality-gate.mjs");

async function runGate(args) {
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

test("dry-run reports capability detection, not executed validation", async () => {
  const result = await runGate(["--mode", "fast-local", "--dry-run"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /evidence type: dry-run capability detection/);
  assert.match(result.stdout, /scripts run: none/);
  assert.match(result.stdout, /quality status: not-run/);
});

test("non-dry-run fails when no project scripts can run", async () => {
  const result = await runGate(["--mode", "fast-local"]);

  assert.notEqual(result.code, 0);
  assert.match(result.stdout, /scripts run: none/);
  assert.match(result.stdout, /quality status: not-run/);
});
