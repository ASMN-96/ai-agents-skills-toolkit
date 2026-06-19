#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
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

    writeFileSync(path.join(fixture, "agents", "reviewer-agent.md"), `# Reviewer Agent

## Role

Reviews diffs, plans, registry changes, generated artifacts, validation evidence, and release-readiness claims.

## Status

Active as a reviewed compiled-fallback source when registry metadata marks it approved.

## Responsibility

- Lead with correctness, regression, security, public/private boundary, and validation findings.
- Ground findings in changed files, commands, registries, generated artifacts, or observed output.
- Separate selected, dry-run, unavailable, metadata-only, and fallback evidence from real execution.
- Report skipped checks and WARN output before completion or release claims.

## Required Checks

- Confirm the branch, intended scope, source files, generated files, and validation evidence are coherent.
- Check that registry metadata does not imply runtime activation or tool execution.
- Check that generated fallback files still match source-agent, profile, and method inputs.

## Output Contract

Return findings first, then assumptions, verification status, residual risk, and release posture when relevant.
`, "utf8");
    writeFileSync(path.join(fixture, "profiles", "audit-profile.md"), "# Audit Profile\n\nUse concise review.\n", "utf8");
    writeFileSync(path.join(fixture, "methods", "internal", "review.md"), "---\nsourceRef: [\"unknown-review-required\"]\nlastExtracted: unknown-review-required\nstatus: approved\n---\n\n# Review Method\n\nCheck correctness.\n", "utf8");
    writeFileSync(path.join(fixture, "registries", "agents.registry.json"), `${JSON.stringify({
      agents: [{
        name: "reviewer-agent",
        displayName: "Reviewer Agent",
        compiledFallbackPath: "compiled-agents/reviewer-agent.compiled.md",
        profiles: ["audit-profile"],
        status: ["approved"],
        activationStatus: ["approved"]
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

    execFileSync("git", ["init"], { cwd: fixture, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "toolkit-test@example.invalid"], { cwd: fixture });
    execFileSync("git", ["config", "user.name", "Toolkit Test"], { cwd: fixture });
    execFileSync("git", ["add", "."], { cwd: fixture, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "fixture"], { cwd: fixture, stdio: "ignore" });

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
    assert.match(compiled, /toolkit_version: 0\.2\.5/);
    assert.match(compiled, /compiled_status: approved/);
    assert.match(compiled, /source_commit: [0-9a-f]{40}/);
    assert.match(compiled, /source_agent: agents\/reviewer-agent\.md/);
    assert.match(compiled, /compiler: scripts\/compile-agents\.mjs/);
    assert.match(compiled, /registry_input: registries\/agents\.registry\.json/);
    assert.match(compiled, /source_profile_refs:/);
    assert.match(compiled, /source_method_refs:/);
    assert.match(compiled, /compile_contract_version: 1\.0\.0/);
    assert.match(compiled, /## Provenance/);
    assert.match(compiled, /internal\.review/);
  });
});

test("approved registry agents with placeholder source text fail instead of compiling as approved", async () => {
  await withCompilerFixture(async (fixture) => {
    writeFileSync(path.join(fixture, "agents", "reviewer-agent.md"), "# Reviewer Agent\n\n## Role\n\nReview diffs.\n\n## Status\n\nStub. This agent will be compiled later.\n", "utf8");

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /approved agent reviewer-agent cannot compile as approved/);
    assert.match(result.stderr, /stub\/placeholder language/);
  });
});

test("--only fails clearly when no registered agent matches", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--only", "missing-agent", "--dry-run"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /--only did not match any registered agent: missing-agent/);
  });
});
