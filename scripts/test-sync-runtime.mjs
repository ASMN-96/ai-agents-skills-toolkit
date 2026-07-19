#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
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
  return createHash("sha256").update(text).digest("hex");
}

async function withTempRuntimeFixture(callback) {
  const fixture = mkdtempSync(path.join(tmpdir(), "sync-runtime-test-"));
  try {
    mkdirSync(path.join(fixture, "skills", "governance"), { recursive: true });
    mkdirSync(path.join(fixture, ".ai-toolkit"), { recursive: true });
    writeFileSync(path.join(fixture, "skills", "governance", "SKILL.md"), "skill fixture\n", "utf8");
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
      source: "skills/governance/SKILL.md",
      target: ".agents/skills/governance/SKILL.md",
      sha256: ""
    },
    {
      source: "skills/governance/SKILL.md",
      target: ".ai-toolkit/skills/governance/SKILL.md",
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
  assert.match(result.stdout, /governance/);
  assert.match(result.stdout, /manifest: checked; hashes not written/);
});

test("embedded manifest governs package mirrors while repo runtime mirrors remain content-checked", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    const mirrors = skillMirrors();
    writeManifest(fixture, [mirrors[1]]);

    const generated = await runSync(["--confirm-write", "--skill", "governance"], { cwd: fixture });
    assert.equal(generated.code, 0, generated.stderr);

    const current = await runSync(["--check", "--skill", "governance"], { cwd: fixture });
    assert.equal(current.code, 0, current.stderr);

    writeFileSync(mirrorPath(fixture, mirrors[0].target), "drifted repo runtime mirror\n", "utf8");
    const contentDrift = await runSync(["--check", "--skill", "governance"], { cwd: fixture });
    assert.notEqual(contentDrift.code, 0);
    assert.match(contentDrift.stderr, /runtime mirror check.*drift/i);
  });
});

test("manifest attests exact embedded skill bytes including CRLF", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    const mirrors = skillMirrors();
    const sourceText = "skill fixture with CRLF\r\n";
    writeFileSync(path.join(fixture, "skills", "governance", "SKILL.md"), sourceText, "utf8");
    writeManifest(fixture, [mirrors[1]]);

    const generated = await runSync(["--confirm-write", "--skill", "governance"], { cwd: fixture });
    assert.equal(generated.code, 0, generated.stderr);

    const manifest = JSON.parse(readFileSync(path.join(fixture, ".ai-toolkit", "manifest.json"), "utf8"));
    const embeddedMirror = manifest.mirrors.find((entry) => entry.target === mirrors[1].target);
    const exactByteHash = createHash("sha256").update(sourceText).digest("hex");
    assert.equal(embeddedMirror.sha256, exactByteHash);
  });
});

test("check mode is non-mutating and fails closed on missing, content, or manifest-hash drift", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    const mirrors = skillMirrors();
    writeManifest(fixture, mirrors);

    const missing = await runSync(["--check", "--skill", "governance"], { cwd: fixture });
    assert.notEqual(missing.code, 0);
    assert.match(missing.stderr, /runtime mirror check.*drift|missing/i);

    const generated = await runSync(["--confirm-write", "--skill", "governance"], { cwd: fixture });
    assert.equal(generated.code, 0, generated.stderr);
    const firstTarget = mirrorPath(fixture, mirrors[0].target);
    const manifestPath = path.join(fixture, ".ai-toolkit", "manifest.json");
    const beforeCheck = {
      target: statSync(firstTarget, { bigint: true }).mtimeNs,
      manifest: statSync(manifestPath, { bigint: true }).mtimeNs
    };
    const current = await runSync(["--check", "--skill", "governance"], { cwd: fixture });
    assert.equal(current.code, 0, current.stderr);
    assert.match(current.stdout, /sync-runtime mode: check/);
    assert.match(current.stdout, /up-to-date/);
    assert.equal(statSync(firstTarget, { bigint: true }).mtimeNs, beforeCheck.target);
    assert.equal(statSync(manifestPath, { bigint: true }).mtimeNs, beforeCheck.manifest);

    writeFileSync(firstTarget, "drifted mirror\n", "utf8");
    const contentDrift = await runSync(["--check", "--skill", "governance"], { cwd: fixture });
    assert.notEqual(contentDrift.code, 0);
    assert.match(contentDrift.stderr, /runtime mirror check.*drift/i);

    writeFileSync(firstTarget, "skill fixture\n", "utf8");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.mirrors[0].sha256 = "0".repeat(64);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const hashDrift = await runSync(["--check", "--skill", "governance"], { cwd: fixture });
    assert.notEqual(hashDrift.code, 0);
    assert.match(hashDrift.stderr, /manifest hash.*drift/i);
  });
});

test("runtime skill word budgets warn above 800 and fail above 1200 words", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    writeManifest(fixture, skillMirrors());
    const sourcePath = path.join(fixture, "skills", "governance", "SKILL.md");
    writeFileSync(sourcePath, `${Array(850).fill("bounded").join(" ")}\n`, "utf8");

    const warning = await runSync(["--dry-run", "--skill", "governance"], { cwd: fixture });
    assert.equal(warning.code, 0, warning.stderr);
    assert.match(warning.stdout, /WARN.*word-budget|word-budget.*WARN/i);

    writeFileSync(sourcePath, `${Array(1201).fill("excessive").join(" ")}\n`, "utf8");
    const failure = await runSync(["--dry-run", "--skill", "governance"], { cwd: fixture });
    assert.notEqual(failure.code, 0);
    assert.match(failure.stderr, /skill.*word budget.*1200|word budget.*skill.*1200/i);
  });
});

test("refuses removed alias skills", async () => {
  const result = await runSync(["--dry-run", "--skill", "legacy-governance"]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Refusing non-allowlisted skill legacy-governance/);
});

test("refuses unknown non-allowlisted skills", async () => {
  const result = await runSync(["--dry-run", "--skill", "unknown-skill"]);

  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /Refusing non-allowlisted skill unknown-skill/);
});

test("dry-run previews missing mirrors without reading or writing them", async () => {
  await withTempRuntimeFixture(async (fixture) => {
    writeManifest(fixture, skillMirrors());

    const result = await runSync(["--dry-run", "--skill", "governance"], { cwd: fixture });

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

    const result = await runSync(["--confirm-write", "--skill", "governance"], { cwd: fixture });

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

    const result = await runSync(["--confirm-write", "--skill", "governance"], { cwd: fixture });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /created/);
    assert.match(result.stdout, /manifest: hashes updated/);

    const sourceText = readFileSync(path.join(fixture, "skills", "governance", "SKILL.md"), "utf8");
    const expectedHash = sha256Text(sourceText);
    const manifest = JSON.parse(readFileSync(path.join(fixture, ".ai-toolkit", "manifest.json"), "utf8"));
    for (const mirror of mirrors) {
      assert.equal(readFileSync(mirrorPath(fixture, mirror.target), "utf8"), sourceText);
      const manifestMirror = manifest.mirrors.find((entry) => entry.target === mirror.target);
      assert.equal(manifestMirror.sha256, expectedHash);
    }
  });
});
