#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "sync-runtime.mjs");

async function runSync(args) {
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

test("dry-run checks active runtime skill mirrors without writing", async () => {
  const result = await runSync(["--dry-run"]);

  assert.equal(result.code, 0);
  assert.match(result.stdout, /sync-runtime mode: dry-run/);
  assert.match(result.stdout, /riss-governance/);
  assert.match(result.stdout, /manifest: checked; hashes not written/);
});

test("refuses internal helper skills", async () => {
  const result = await runSync(["--dry-run", "--skill", "riss-agent-governance"]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Refusing internal helper skill riss-agent-governance/);
});

test("refuses unknown non-allowlisted skills", async () => {
  const result = await runSync(["--dry-run", "--skill", "unknown-skill"]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Refusing non-allowlisted skill unknown-skill/);
});
