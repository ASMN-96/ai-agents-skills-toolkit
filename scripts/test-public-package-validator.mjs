#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "validate-public-package.mjs");

async function runValidator(cwd, args = []) {
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
  const fixture = await mkdtemp(path.join(os.tmpdir(), "public-package-validator-"));
  try {
    await mkdir(path.join(fixture, "docs"), { recursive: true });
    await mkdir(path.join(fixture, "skills", "governance"), { recursive: true });
    await writeFile(path.join(fixture, "README.md"), "# Public Package\n", "utf8");
    await writeFile(path.join(fixture, "LICENSE"), "MIT License\n", "utf8");
    await writeFile(path.join(fixture, "CONTRIBUTING.md"), "# Contributing\n", "utf8");
    await writeFile(path.join(fixture, "CODE_OF_CONDUCT.md"), "# Code of Conduct\n", "utf8");
    await writeFile(path.join(fixture, "SECURITY.md"), "# Security\n\nReport vulnerabilities without secrets.\n", "utf8");
    await writeFile(path.join(fixture, "skills", "governance", "SKILL.md"), "---\nname: governance\ndescription: Public governance entrypoint; do not install tools.\n---\n\n# Governance\n", "utf8");
    return await callback(fixture);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

test("passes a clean public package fixture and writes an optional report", async () => {
  await withFixture(async (fixture) => {
    const result = await runValidator(fixture, ["--output", "docs/PUBLIC_PACKAGE_VALIDATION_REPORT.md"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /PASS validate-public-package/);
    const report = await readFile(path.join(fixture, "docs", "PUBLIC_PACKAGE_VALIDATION_REPORT.md"), "utf8");
    assert.match(report, /Public Package Validation Report/);
    assert.match(report, /Status: PASS/);
  });
});

test("fails when public package paths contain private or release-blocking identifiers", async () => {
  await withFixture(async (fixture) => {
    await writeFile(
      path.join(fixture, "README.md"),
      [
        "Internal path C:\\Users\\Example and ASMN-96 plus RISS",
        "must-remove-before-public-release",
        "private-overlay-only",
        "unresolved-public-blocker",
        "non-reproducible generated artifact"
      ].join("\n"),
      "utf8"
    );

    const result = await runValidator(fixture);

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /FAIL validate-public-package/);
    assert.match(result.stdout, /local Windows path/);
    assert.match(result.stdout, /private org\/repo reference/);
    assert.match(result.stdout, /project-specific naming/);
    assert.match(result.stdout, /public release removal marker/);
    assert.match(result.stdout, /private overlay marker/);
    assert.match(result.stdout, /unresolved public blocker/);
    assert.match(result.stdout, /non-reproducible generated artifact/);
  });
});
