#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "sync-runtime.mjs");

async function runSync(args, options = {}) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd: options.cwd ?? ROOT });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error)
    };
  }
}

function sha256Text(text) {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

async function withTempRuntimeFixture(callback) {
  const fixture = mkdtempSync(path.join(tmpdir(), "sync-runtime-test-"));
  try {
    mkdirSync(path.join(fixture, "skills", "riss-governance"), { recursive: true });
    mkdirSync(path.join(fixture, ".ai-toolkit"), { recursive: true });
    writeFileSync(path.join(fixture, "skills", "riss-governance", "SKILL.md"), "skill fixture\n", "utf8");
    return await callback(fixture);
  } finally {
    if (fixture.startsWith(tmpdir())) rmSync(fixture, { recursive: true, force: true });
  }
}

function writeManifest(fixture, mirrors) {
  writeFileSync(path.join(fixture, ".ai-toolkit", "manifest.json"), `${JSON.stringify({ mirrors }, null, 2)}\n`, "utf8");
}

function skillMirrors() {
  return [
    {
      source: "skills/riss-governance/SKILL.md",
      target: ".agents/skills/riss-governance/SKILL.md",
      sha256: ""
    },
    {
      source: "skills/riss-governance/SKILL.md",
      target: ".ai-toolkit/skills/riss-governance/SKILL.md",
      sha256: ""
    }
  ];
}

function mirrorPath(fixture, target) {
  return path.join(fixture, ...target.split("/"));
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

test("dry-run previews missing mirrors without reading or writing them", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    writeManifest(fixture, skillMirrors());

    const result = await runSync(["--dry-run", "--skill", "riss-governance"], { cwd: fixture });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /would-create/);
    assert.match(result.stdout, /manifest: checked; hashes not written/);
    assert.doesNotMatch(result.stderr, /ENOENT/);
    for (const mirror of skillMirrors()) {
      assert.equal(existsSync(mirrorPath(fixture, mirror.target)), false);
    }
  });
});

test("confirm-write fails before partial writes when manifest mirror entries are missing", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    writeManifest(fixture, [skillMirrors()[0]]);

    const result = await runSync(["--confirm-write", "--skill", "riss-governance"], { cwd: fixture });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Manifest missing mirror entries/);
    for (const mirror of skillMirrors()) {
      assert.equal(existsSync(mirrorPath(fixture, mirror.target)), false);
    }
  });
});

test("confirm-write creates missing mirrors and updates manifest hashes", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    const mirrors = skillMirrors();
    writeManifest(fixture, mirrors);

    const result = await runSync(["--confirm-write", "--skill", "riss-governance"], { cwd: fixture });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /created/);
    assert.match(result.stdout, /manifest: hashes updated/);

    const sourceText = readFileSync(path.join(fixture, "skills", "riss-governance", "SKILL.md"), "utf8");
    const expectedHash = sha256Text(sourceText);
    const manifest = JSON.parse(readFileSync(path.join(fixture, ".ai-toolkit", "manifest.json"), "utf8"));
    for (const mirror of mirrors) {
      assert.equal(readFileSync(mirrorPath(fixture, mirror.target), "utf8"), sourceText);
      const manifestMirror = manifest.mirrors.find((entry) => entry.target === mirror.target);
      assert.equal(manifestMirror.sha256, expectedHash);
    }
  });
});
