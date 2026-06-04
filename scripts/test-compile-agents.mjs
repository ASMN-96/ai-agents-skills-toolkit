#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "compile-agents.mjs");

async function runCompiler(cwd, args = []) {
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

async function withCompilerFixture(callback) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "compile-agents-"));
  try {
    mkdirSync(path.join(fixture, "agents"), { recursive: true });
    mkdirSync(path.join(fixture, "compiled-agents"), { recursive: true });
    mkdirSync(path.join(fixture, "profiles"), { recursive: true });
    mkdirSync(path.join(fixture, "methods", "internal"), { recursive: true });
    mkdirSync(path.join(fixture, "registries"), { recursive: true });
    mkdirSync(path.join(fixture, "docs"), { recursive: true });

    writeFileSync(path.join(fixture, "agents", "reviewer-agent.md"), "# Reviewer Agent\n\nReview diffs.\n", "utf8");
    writeFileSync(path.join(fixture, "profiles", "audit-profile.md"), "# Audit Profile\n\nUse concise review.\n", "utf8");
    writeFileSync(path.join(fixture, "methods", "internal", "review.md"), "---\nsourceRef: [\"unknown-review-required\"]\nlastExtracted: unknown-review-required\nstatus: approved\n---\n\n# Review Method\n\nCheck correctness.\n", "utf8");
    writeFileSync(path.join(fixture, "registries", "agents.registry.json"), `${JSON.stringify({
      agents: [{
        name: "reviewer-agent",
        displayName: "Reviewer Agent",
        compiledFallbackPath: "compiled-agents/reviewer-agent.compiled.md",
        profiles: ["audit-profile"]
      }]
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(fixture, "registries", "profiles.registry.json"), `${JSON.stringify({ profiles: [{ name: "audit-profile" }] }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(fixture, "registries", "methods.registry.json"), `${JSON.stringify({
      methods: [{
        id: "internal.review",
        displayName: "Review Method",
        methodPath: "methods/internal/review.md"
      }]
    }, null, 2)}\n`, "utf8");

    return await callback(fixture);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("dry-run reports compiled output without writing generated artifacts", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /compile-agents mode: dry-run/);
    assert.match(result.stdout, /reviewer-agent/);
    assert.match(result.stdout, /would-write/);
    assert.equal(existsSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md")), false);
  });
});

test("confirm-write generates metadata-rich compiled agent and reports provenance", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /compile-agents mode: confirm-write/);
    assert.match(result.stdout, /wrote/);
    const compiled = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");
    assert.match(compiled, /toolkit_version: 0\.1\.0/);
    assert.match(compiled, /source_commit: deterministic-not-recorded/);
    assert.match(compiled, /source_agent: agents\/reviewer-agent\.md/);
    assert.match(compiled, /source_profile_refs:/);
    assert.match(compiled, /source_method_refs:/);
    assert.match(compiled, /compile_contract_version: 1\.0\.0/);
    assert.match(compiled, /## Provenance/);
    assert.match(compiled, /internal\.review/);
  });
});
