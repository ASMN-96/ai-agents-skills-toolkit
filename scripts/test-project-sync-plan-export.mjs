#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE_SCRIPT = path.join(REPO_ROOT, "install", "project-sync-core.mjs");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function run(args) {
  const result = spawnSync(process.execPath, [CORE_SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function git(target, args) {
  const result = spawnSync("git", ["-C", target, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  assert.equal(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return result.stdout ?? "";
}

function indexMetadata(indexPath) {
  const stat = statSync(indexPath);
  return {
    size: stat.size,
    mode: stat.mode,
    mtimeMs: stat.mtimeMs,
    ctimeMs: stat.ctimeMs,
    birthtimeMs: stat.birthtimeMs
  };
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function snapshotFiles(root, current = root, entries = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) snapshotFiles(root, fullPath, entries);
    else entries.push({
      path: path.relative(root, fullPath).replace(/\\/g, "/"),
      sha256: sha256(readFileSync(fullPath))
    });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function fixture(callback) {
  const root = mkdtempSync(path.join(tmpdir(), "project-sync-plan-export-"));
  const target = path.join(root, "target with spaces");
  try {
    mkdirSync(path.join(target, ".ai-toolkit", "skills", "governance"), { recursive: true });
    writeFileSync(path.join(target, "README.md"), "# Export fixture\n", "utf8");
    writeFileSync(path.join(target, ".ai-toolkit", "skills", "governance", "SKILL.md"), "stale target\n", "utf8");
    writeJson(path.join(target, ".ai-toolkit", ".ai-toolkit-version"), {
      toolkitVersion: "0.0.0",
      toolkitCommit: "0000000000000000000000000000000000000000"
    });
    writeJson(path.join(target, ".ai-toolkit", ".ai-toolkit.config.json"), {
      selectedAgents: ["reviewer-agent"],
      selectedProfiles: [],
      selectedSkills: ["governance"],
      branchPolicy: "no-direct-main"
    });
    return callback({ root, target });
  } finally {
    assert.equal(path.relative(path.resolve(tmpdir()), root).startsWith(".."), false);
    rmSync(root, { recursive: true, force: true });
  }
}

test("update plan export is deterministic, complete, hashed, and non-mutating", () => {
  fixture(({ target }) => {
    const before = snapshotFiles(target);
    const first = run(["update", "--target", target, "--export-plan"]);
    const second = run(["update", "--target", target, "--export-plan"]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stderr, "");
    assert.equal(first.stdout, second.stdout, "identical target state must produce byte-identical JSON");
    assert.deepEqual(snapshotFiles(target), before, "export must not create or modify target files");

    const exported = JSON.parse(first.stdout);
    assert.equal(exported.exportType, "project-sync-copy-plan");
    assert.equal(exported.command, "update");
    assert.equal(exported.mode, "export-plan");
    assert.equal(exported.writesTargetFiles, false);
    assert.equal(exported.targetPath, path.resolve(target));
    assert.deepEqual(exported.selected, {
      agents: ["reviewer-agent"],
      profiles: [],
      skills: ["governance"]
    });

    const assetPaths = exported.assets.map((asset) => asset.relativePath);
    assert.deepEqual(assetPaths, assetPaths.slice().sort((left, right) => left.localeCompare(right)));
    for (const requiredPath of [
      "compiled-agents/reviewer-agent.compiled.md",
      "skills/governance/SKILL.md",
      "methods/governance/task-intake-routing-gate.md",
      "templates/commit-message-template.md",
      "docs/PROJECT_TOOLING_OPERATING_MODEL.md"
    ]) {
      assert.equal(assetPaths.includes(requiredPath), true, `missing selected/transitive asset ${requiredPath}`);
    }

    for (const asset of exported.assets) {
      assert.equal(path.isAbsolute(asset.sourcePath), true);
      assert.equal(path.isAbsolute(asset.destinationPath), true);
      assert.equal(asset.sourceSha256, sha256(readFileSync(asset.sourcePath)));
      assert.equal(asset.operation, asset.destinationState === "present" ? "replace" : "create");
      assert.equal(["compiled-agent", "skill", "method", "template", "support-doc"].includes(asset.type), true);
      assert.equal(typeof asset.name, "string");
      if (asset.destinationState === "present") {
        assert.equal(asset.destinationBeforeSha256, sha256(readFileSync(asset.destinationPath)));
      } else {
        assert.equal(asset.destinationState, "absent");
        assert.equal(asset.destinationBeforeSha256, null);
      }
    }

    const staleSkill = exported.assets.find((asset) => asset.relativePath === "skills/governance/SKILL.md");
    assert.equal(staleSkill.destinationState, "present");
    assert.equal(staleSkill.destinationBeforeSha256, sha256("stale target\n"));
    const missingAgent = exported.assets.find((asset) => asset.relativePath === "compiled-agents/reviewer-agent.compiled.md");
    assert.equal(missingAgent.destinationState, "absent");
    assert.equal(missingAgent.destinationBeforeSha256, null);

    for (const candidate of Object.values(exported.generatedCandidates)) {
      assert.equal(candidate.sourcePath, null);
      assert.equal(candidate.sourceKind, "generated-json");
      assert.equal(candidate.operation, candidate.destinationState === "present" ? "replace" : "create");
      assert.equal(candidate.serialization, "json-pretty-2-lf-final-newline");
      assert.equal(candidate.sourceSha256, sha256(`${JSON.stringify(candidate.content, null, 2)}\n`));
    }

    const manifest = exported.generatedCandidates.manifest.content;
    const manifestAssets = new Map(manifest.assets.map((asset) => [asset.path, asset]));
    for (const asset of exported.assets) {
      assert.equal(manifestAssets.get(asset.relativePath)?.sha256, asset.sourceSha256);
      assert.equal(manifestAssets.get(asset.relativePath)?.type, asset.type);
      assert.equal(manifestAssets.get(asset.relativePath)?.name, asset.name);
    }
    assert.equal(
      manifestAssets.get("context/project-map.json")?.sha256,
      exported.generatedCandidates.projectMap.sourceSha256
    );
    assert.equal(exported.generatedCandidates.version.content.toolkitCommit, manifest.toolkitCommit);
    assert.equal(exported.generatedCandidates.version.content.toolkitVersion, manifest.toolkitVersion);

    for (const asset of exported.assets) {
      mkdirSync(path.dirname(asset.destinationPath), { recursive: true });
      copyFileSync(asset.sourcePath, asset.destinationPath);
    }
    for (const candidate of Object.values(exported.generatedCandidates)) {
      writeJson(candidate.destinationPath, candidate.content);
    }
    const validation = run(["validate", "--target", target]);
    assert.equal(validation.status, 0, validation.stderr || validation.stdout);
    assert.match(validation.stdout, /Validation passed/);
  });
});

test("invalid export option combinations fail before target mutation", () => {
  fixture(({ target }) => {
    const before = snapshotFiles(target);
    const writeCombination = run(["update", "--target", target, "--export-plan", "--confirm-write"]);
    assert.notEqual(writeCombination.status, 0);
    assert.match(writeCombination.stderr, /cannot be combined with --confirm-write/);

    const validateCombination = run(["validate", "--target", target, "--export-plan"]);
    assert.notEqual(validateCombination.status, 0);
    assert.match(validateCombination.stderr, /supported only for install and update/);
    assert.deepEqual(snapshotFiles(target), before);
  });
});

test("install plan export supports a new target without creating .ai-toolkit", () => {
  const root = mkdtempSync(path.join(tmpdir(), "project-sync-install-export-"));
  const target = path.join(root, "new target with spaces");
  try {
    mkdirSync(target, { recursive: true });
    writeFileSync(path.join(target, "README.md"), "# New install target\n", "utf8");
    const before = snapshotFiles(target);
    const result = run([
      "install",
      "--target",
      target,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance",
      "--export-plan"
    ]);
    assert.equal(result.status, 0, result.stderr);
    const exported = JSON.parse(result.stdout);
    assert.equal(exported.command, "install");
    assert.equal(exported.assets.every((asset) => asset.operation === "create"), true);
    assert.equal(Object.values(exported.generatedCandidates).every((candidate) => candidate.operation === "create"), true);
    assert.deepEqual(snapshotFiles(target), before);
    assert.equal(statSync(target).isDirectory(), true);
  } finally {
    assert.equal(path.relative(path.resolve(tmpdir()), root).startsWith(".."), false);
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejected project map content is never serialized or echoed", () => {
  fixture(({ target }) => {
    const secretSentinel = "CODEX_EXPORT_SECRET_SENTINEL_7e1d57ab";
    writeJson(path.join(target, "package.json"), {
      name: "rejected-export-fixture",
      scripts: {
        unsafe: `echo api_key=${secretSentinel}`
      }
    });
    const before = snapshotFiles(target);
    const result = run(["update", "--target", target, "--export-plan"]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.match(result.stderr, /Export refused: project context preflight safety checks failed \(1 issue\)\./);
    assert.equal(`${result.stdout}${result.stderr}`.includes(secretSentinel), false);
    assert.deepEqual(snapshotFiles(target), before);
  });
});

test("export leaves a real Git index byte-for-byte and metadata unchanged", () => {
  fixture(({ target }) => {
    git(target, ["init"]);
    git(target, ["config", "user.email", "toolkit-export-test@example.invalid"]);
    git(target, ["config", "user.name", "Toolkit Export Test"]);
    git(target, ["add", "."]);
    git(target, ["commit", "-m", "fixture"]);

    const readmePath = path.join(target, "README.md");
    const readmeStat = statSync(readmePath);
    const staleTimestamp = new Date(readmeStat.mtimeMs + 120_000);
    utimesSync(readmePath, staleTimestamp, staleTimestamp);

    const indexPath = path.join(target, ".git", "index");
    const indexBytesBefore = readFileSync(indexPath);
    const indexMetadataBefore = indexMetadata(indexPath);
    const targetBytesBefore = snapshotFiles(target);
    const result = run(["update", "--target", target, "--export-plan"]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readFileSync(indexPath), indexBytesBefore);
    assert.deepEqual(indexMetadata(indexPath), indexMetadataBefore);
    assert.deepEqual(snapshotFiles(target), targetBytesBefore);
    assert.equal(statSync(readmePath).mtimeMs, staleTimestamp.getTime());
  });
});
