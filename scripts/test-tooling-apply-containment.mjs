#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = path.join(ROOT, "install", "tooling-apply.mjs");

function createDirectoryLinkOrSkip(t, target, linkPath) {
  try {
    symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    if (["EACCES", "EPERM", "UNKNOWN"].includes(error?.code)) {
      t.skip(`directory links are not supported by this host: ${error.code}`);
      return false;
    }
    throw error;
  }
}

test("tooling apply rejects a .ai-toolkit symlink or junction that escapes the target", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "tooling-apply-containment-"));
  try {
    const target = path.join(fixture, "target");
    const outside = path.join(fixture, "outside");
    mkdirSync(target, { recursive: true });
    mkdirSync(outside, { recursive: true });
    symlinkSync(outside, path.join(target, ".ai-toolkit"), process.platform === "win32" ? "junction" : "dir");

    const result = spawnSync(process.execPath, [
      APPLY,
      "--target",
      target,
      "--project-type",
      "react-typescript-saas",
      "--confirm-write"
    ], {
      cwd: ROOT,
      encoding: "utf8"
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /containment|outside|symlink|junction/i);
    assert.equal(existsSync(path.join(outside, "tooling")), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("tooling apply rejects a nested tooling link even when it resolves inside the target", (t) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "tooling-apply-internal-link-"));
  try {
    const target = path.join(fixture, "target");
    const internal = path.join(target, "internal-tooling-target");
    const aiRoot = path.join(target, ".ai-toolkit");
    mkdirSync(internal, { recursive: true });
    mkdirSync(aiRoot, { recursive: true });
    if (!createDirectoryLinkOrSkip(t, internal, path.join(aiRoot, "tooling"))) return;

    const result = spawnSync(process.execPath, [
      APPLY,
      "--target",
      target,
      "--project-type",
      "react-typescript-saas",
      "--confirm-write"
    ], {
      cwd: ROOT,
      encoding: "utf8"
    });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

    assert.notEqual(result.status, 0, output);
    assert.match(output, /linked path|symlink|junction|reparse/i);
    assert.equal(existsSync(path.join(internal, "quality-gates.md")), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("tooling apply recovers before overwrite planning and preserves custom files", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "tooling-apply-recovery-planning-"));
  try {
    const target = path.join(fixture, "target");
    const toolingRoot = path.join(target, ".ai-toolkit", "tooling");
    const customPath = path.join(toolingRoot, "quality-gates.md");
    mkdirSync(toolingRoot, { recursive: true });
    writeFileSync(customPath, "owner custom quality gates\n", "utf8");

    const interrupted = spawnSync(process.execPath, [
      APPLY,
      "--target",
      target,
      "--project-type",
      "react-typescript-saas",
      "--confirm-write"
    ], {
      cwd: ROOT,
      encoding: "utf8",
      env: { ...process.env, AI_TOOLKIT_FAILPOINT: "after-promotion" }
    });
    const interruptedOutput = `${interrupted.stdout ?? ""}${interrupted.stderr ?? ""}`;
    assert.notEqual(interrupted.status, 0, interruptedOutput);
    assert.equal(existsSync(path.join(target, ".ai-toolkit", ".tooling.transaction.json")), true);

    const recovered = spawnSync(process.execPath, [
      APPLY,
      "--target",
      target,
      "--project-type",
      "react-typescript-saas",
      "--confirm-write"
    ], {
      cwd: ROOT,
      encoding: "utf8"
    });
    const recoveredOutput = `${recovered.stdout ?? ""}${recovered.stderr ?? ""}`;

    assert.equal(recovered.status, 0, recoveredOutput);
    assert.match(recoveredOutput, /recover/i);
    assert.equal(readFileSync(customPath, "utf8"), "owner custom quality gates\n");
    assert.equal(existsSync(path.join(toolingRoot, "package-scripts.react-typescript-saas.json")), true);
    assert.equal(existsSync(path.join(target, ".ai-toolkit", ".tooling.transaction.json")), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
