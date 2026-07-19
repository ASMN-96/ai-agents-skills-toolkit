#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "run-release-gate.mjs");

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

test("list mode discovers every test-*.mjs file deterministically without a hardcoded count", async () => {
  const result = await runGate(["pr", "--list", "--json"]);
  assert.equal(result.code, 0, result.stderr);
  const listed = JSON.parse(result.stdout);
  const expected = readdirSync(path.join(ROOT, "scripts"))
    .filter((file) => /^test-.*\.mjs$/.test(file))
    .sort()
    .map((file) => `scripts/${file}`);

  assert.equal(listed.profile, "pr");
  assert.deepEqual(listed.testFiles, expected);
  assert.equal(listed.testCount, expected.length);
  assert.ok(listed.commands.some((command) => command.id === "node-tests"));
  assert.ok(listed.commands.some((command) => command.args.includes("scripts/compile-agents.mjs") && command.args.includes("--check")));
  assert.ok(listed.commands.some((command) => command.args.includes("scripts/sync-runtime.mjs") && command.args.includes("--check")));
  const mockFreshness = listed.commands.find((command) => command.id === "deterministic-mock-source-freshness");
  assert.deepEqual(mockFreshness?.args, ["scripts/check-source-freshness.mjs", "--mock"]);
  const sourceGovernance = listed.commands.find((command) => command.id === "source-governance");
  assert.deepEqual(sourceGovernance?.args, ["scripts/validate-source-governance.mjs"]);
  assert.equal(
    listed.commands.some((command) => command.id === "live-source-freshness"),
    false,
    "PR validation must not run the live, report-writing freshness command"
  );
});

test("discovery follows the selected repository rather than the orchestrator source checkout", async () => {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "release-gate-discovery-"));
  try {
    mkdirSync(path.join(fixture, "scripts"), { recursive: true });
    writeFileSync(path.join(fixture, "scripts", "test-zeta.mjs"), "// fixture\n", "utf8");
    writeFileSync(path.join(fixture, "scripts", "test-alpha.mjs"), "// fixture\n", "utf8");
    writeFileSync(path.join(fixture, "scripts", "not-a-test.mjs"), "// fixture\n", "utf8");

    const result = await runGate(["release", "--list", "--json"], fixture);
    assert.equal(result.code, 0, result.stderr);
    const listed = JSON.parse(result.stdout);
    assert.deepEqual(listed.testFiles, ["scripts/test-alpha.mjs", "scripts/test-zeta.mjs"]);
    assert.equal(listed.profile, "release");
    assert.ok(listed.commands.some((command) => command.id === "live-source-freshness"));
    assert.ok(listed.commands.some((command) => command.id === "deterministic-mock-source-freshness"));
    const live = listed.commands.find((command) => command.id === "live-source-freshness");
    assert.ok(live.args.includes("--output"));
    assert.ok(live.args.includes("--json-output"));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("profiles are closed and post-tag keeps validation separate from publishing", async () => {
  const invalid = await runGate(["production", "--list"]);
  assert.notEqual(invalid.code, 0);
  assert.match(invalid.stderr, /profile must be one of: pr, release, post-tag/);

  const postTag = await runGate(["post-tag", "--list", "--json"]);
  assert.equal(postTag.code, 0, postTag.stderr);
  const listed = JSON.parse(postTag.stdout);
  assert.equal(listed.profile, "post-tag");
  assert.ok(listed.commands.some((command) => command.id === "version-consistency"));
  assert.ok(listed.commands.some((command) => command.id === "public-package"));
  assert.ok(listed.commands.every((command) => !/publish|tag|release-create/.test(command.id)));
});
