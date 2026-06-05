#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "ai-toolkit", "run-quality-gate.mjs");

async function runGate(args, cwd = ROOT) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error)
    };
  }
}

async function withFixture(callback) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "quality-gate-pm-"));
  try {
    await mkdir(fixture, { recursive: true });
    return await callback(fixture);
  } finally {
    await rm(fixture, { recursive: true, force: true });
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

test("dry-run detects packageManager field without assuming npm", async () => {
  await withFixture(async (fixture) => {
    await writeFile(
      path.join(fixture, "package.json"),
      JSON.stringify({ packageManager: "pnpm@10.0.0", scripts: { build: "node -v" } }),
      "utf8"
    );

    const result = await runGate(["--mode", "fast-local", "--dry-run"], fixture);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /package manager: pnpm/);
    assert.match(result.stdout, /package manager signals: package\.json:packageManager/);
    assert.doesNotMatch(result.stdout, /package manager: npm/);
    assert.match(result.stdout, /scripts run: none/);
  });
});

test("conflicting package-manager signals stop before running scripts", async () => {
  await withFixture(async (fixture) => {
    await writeFile(
      path.join(fixture, "package.json"),
      JSON.stringify({ scripts: { build: "node -v" } }),
      "utf8"
    );
    await writeFile(path.join(fixture, "pnpm-lock.yaml"), "", "utf8");
    await writeFile(path.join(fixture, "package-lock.json"), "{}", "utf8");

    const result = await runGate(["--mode", "fast-local"], fixture);

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /package manager: ambiguous/);
    assert.match(result.stdout, /pnpm-lock\.yaml=pnpm/);
    assert.match(result.stdout, /package-lock\.json=npm/);
    assert.match(result.stdout, /scripts run: none/);
    assert.match(result.stdout, /quality status: not-run/);
  });
});
