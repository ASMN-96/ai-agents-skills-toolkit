#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync, appendFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hasBash = spawnSync("bash", ["--version"], { stdio: "ignore" }).status === 0;
const coreScript = path.join(REPO_ROOT, "install", "project-sync-core.mjs");

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
}

function runResult(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? REPO_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`
  };
}

function git(repo, args) {
  return run("git", ["-C", repo, ...args]);
}

function canonicalToolkitVersion() {
  return run("node", ["--input-type=module", "-e", "import { TOOLKIT_VERSION } from './scripts/ai-toolkit/embedded-data.mjs'; console.log(TOOLKIT_VERSION);"]).trim();
}

function newTestRepo(tempRoot, name) {
  const remote = path.join(tempRoot, `${name}-remote.git`);
  const repo = path.join(tempRoot, `${name}-repo`);
  run("git", ["init", "--bare", remote], { cwd: tempRoot });
  run("git", ["init", repo], { cwd: tempRoot });
  git(repo, ["config", "user.email", "toolkit-test@example.com"]);
  git(repo, ["config", "user.name", "Toolkit Test"]);
  writeFileSync(path.join(repo, "README.md"), `# ${name}\n`, "utf8");
  git(repo, ["add", "README.md"]);
  git(repo, ["commit", "-m", "seed"]);
  git(repo, ["branch", "-M", "main"]);
  git(repo, ["remote", "add", "origin", remote]);
  git(repo, ["push", "-u", "origin", "main"]);
  git(repo, ["switch", "-c", "feature/toolkit-sync"]);
  git(repo, ["push", "-u", "origin", "feature/toolkit-sync"]);
  return repo;
}

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

function createFileLinkOrSkip(t, target, linkPath) {
  try {
    if (process.platform === "win32") linkSync(target, linkPath);
    else symlinkSync(target, linkPath, "file");
    return true;
  } catch (error) {
    if (["EACCES", "EPERM", "UNKNOWN"].includes(error?.code)) {
      t.skip(`final-file links are not supported by this host: ${error.code}`);
      return false;
    }
    throw error;
  }
}

function installManagedFixture(repo) {
  const install = runResult("node", [
    coreScript,
    "install",
    "--target",
    repo,
    "--agents",
    "reviewer-agent",
    "--confirm-write"
  ]);
  assert.equal(install.status, 0, install.output);
  git(repo, ["add", ".ai-toolkit"]);
  git(repo, ["commit", "-m", "install managed toolkit fixture"]);
  git(repo, ["push"]);
}

function transactionArtifacts(repo) {
  return readdirSync(repo).filter((name) => /^\.ai-toolkit\.(?:backup|staging)-/.test(name));
}

test("bash project sync scripts have valid shell syntax", { skip: !hasBash }, () => {
  for (const file of ["install-project.sh", "update-project.sh", "validate-project-install.sh"]) {
    run("bash", ["-n", path.join(REPO_ROOT, "install", file)]);
  }
});

test("project sync core remains dry-run-first and validates confirmed installs", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-"));
  try {
    const repo = newTestRepo(tempRoot, "core-install");
    const dryRun = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance"
    ]);
    assert.equal(dryRun.status, 0, dryRun.output);
    assert.match(dryRun.output, /Dry-run only/);
    assert.equal(existsSync(path.join(repo, ".ai-toolkit")), false);

    const install = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance",
      "--confirm-write"
    ]);
    assert.equal(install.status, 0, install.output);
    const manifestPath = path.join(repo, ".ai-toolkit", ".ai-toolkit-manifest.json");
    assert.equal(existsSync(manifestPath), true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.schemaVersion, "2.0.0");
    assert.equal(manifest.manifestKind, "ai-toolkit-project-install");
    const assetsByPath = new Map(manifest.assets.map((asset) => [asset.path, asset]));
    assert.equal(existsSync(path.join(repo, ".ai-toolkit", "methods", "governance", "task-intake-routing-gate.md")), true);
    assert.equal(assetsByPath.get("methods/governance/task-intake-routing-gate.md")?.type, "method");
    assert.equal(existsSync(path.join(repo, ".ai-toolkit", "docs", "PROJECT_TOOLING_OPERATING_MODEL.md")), true);
    assert.equal(assetsByPath.get("docs/PROJECT_TOOLING_OPERATING_MODEL.md")?.type, "support-doc");
    const installedVersion = JSON.parse(run("node", ["-e", `console.log(require('fs').readFileSync(${JSON.stringify(path.join(repo, ".ai-toolkit", ".ai-toolkit-version"))}, 'utf8'))`]));
    assert.equal(installedVersion.toolkitVersion, canonicalToolkitVersion());

    const validate = runResult("node", [coreScript, "validate", "--target", repo]);
    assert.equal(validate.status, 0, validate.output);
    assert.match(validate.output, /Validation passed/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project sync rejects a .ai-toolkit symlink or junction that escapes the target", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-containment-"));
  try {
    const repo = newTestRepo(tempRoot, "containment");
    const outside = path.join(tempRoot, "outside");
    mkdirSync(outside, { recursive: true });
    symlinkSync(outside, path.join(repo, ".ai-toolkit"), process.platform === "win32" ? "junction" : "dir");

    const result = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent"
    ]);

    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /containment|outside|symlink|junction/i);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("v0.2 schema-1 installs report upgradeRequired and migrate without losing project configuration", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-v02-migration-"));
  try {
    const repo = newTestRepo(tempRoot, "v02-migration");
    const install = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance",
      "--confirm-write"
    ]);
    assert.equal(install.status, 0, install.output);

    const managedRoot = path.join(repo, ".ai-toolkit");
    const manifestPath = path.join(managedRoot, ".ai-toolkit-manifest.json");
    const versionPath = path.join(managedRoot, ".ai-toolkit-version");
    const configPath = path.join(managedRoot, ".ai-toolkit.config.json");
    const previousToolkitCommit = "1".repeat(40);
    const previousToolkitVersion = "0.2.5";

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.schemaVersion = "1.0.0";
    delete manifest.manifestKind;
    delete manifest.migration;
    manifest.toolkitVersion = previousToolkitVersion;
    manifest.toolkitCommit = previousToolkitCommit;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    const version = JSON.parse(readFileSync(versionPath, "utf8"));
    version.toolkitVersion = previousToolkitVersion;
    version.toolkitCommit = previousToolkitCommit;
    writeFileSync(versionPath, `${JSON.stringify(version, null, 2)}\n`, "utf8");

    const config = JSON.parse(readFileSync(configPath, "utf8"));
    config.toolkitVersion = previousToolkitVersion;
    config.toolkitCommit = previousToolkitCommit;
    config.projectContextPath = "docs/company/AI_CONTEXT.md";
    config.approvalMode = "owner-review";
    config.branchPolicy = "no-direct-main";
    writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

    git(repo, ["add", ".ai-toolkit"]);
    git(repo, ["commit", "-m", "add v0.2 project toolkit fixture"]);
    git(repo, ["push"]);

    const legacyValidation = runResult("node", [coreScript, "validate", "--target", repo]);
    assert.equal(legacyValidation.status, 2, legacyValidation.output);
    assert.match(legacyValidation.output, /upgradeRequired/);
    assert.match(legacyValidation.output, /schemaVersion 1\.0\.0/);

    const update = runResult("node", [coreScript, "update", "--target", repo, "--confirm-write"]);
    assert.equal(update.status, 0, update.output);

    const migratedManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const migratedConfig = JSON.parse(readFileSync(configPath, "utf8"));
    assert.equal(migratedManifest.schemaVersion, "2.0.0");
    assert.equal(migratedManifest.migration.fromSchemaVersion, "1.0.0");
    assert.equal(migratedManifest.migration.previousToolkitVersion, previousToolkitVersion);
    assert.equal(migratedManifest.migration.previousToolkitCommit, previousToolkitCommit);
    assert.deepEqual(migratedConfig.selectedAgents, ["reviewer-agent"]);
    assert.deepEqual(migratedConfig.selectedSkills, ["governance"]);
    assert.deepEqual(migratedConfig.selectedProfiles, []);
    assert.equal(migratedConfig.projectContextPath, "docs/company/AI_CONTEXT.md");
    assert.equal(migratedConfig.approvalMode, "owner-review");
    assert.equal(migratedConfig.branchPolicy, "no-direct-main");
    assert.equal(migratedConfig.allowOverwriteProjectContext, false);

    const currentValidation = runResult("node", [coreScript, "validate", "--target", repo]);
    assert.equal(currentValidation.status, 0, currentValidation.output);
    assert.match(currentValidation.output, /Validation passed/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project validate rejects linked version, config, manifest, and managed asset files", (t) => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-validate-links-"));
  try {
    const repo = newTestRepo(tempRoot, "validate-links");
    installManagedFixture(repo);
    const managedRoot = path.join(repo, ".ai-toolkit");
    const cases = [
      [".ai-toolkit-version", "version"],
      [".ai-toolkit.config.json", "config"],
      [".ai-toolkit-manifest.json", "manifest"],
      ["compiled-agents/reviewer-agent.compiled.md", "asset"]
    ];

    for (const [relativePath, label] of cases) {
      const managedPath = path.join(managedRoot, ...relativePath.split("/"));
      const linkTarget = path.join(repo, `validate-linked-${label}.txt`);
      copyFileSync(managedPath, linkTarget);
      rmSync(managedPath, { force: true });
      if (!createFileLinkOrSkip(t, linkTarget, managedPath)) return;

      const result = runResult("node", [coreScript, "validate", "--target", repo]);

      rmSync(managedPath, { force: true });
      copyFileSync(linkTarget, managedPath);
      assert.notEqual(result.status, 0, `${label}: ${result.output}`);
      assert.match(result.output, /linked path|symlink|hard[- ]link(?:ed)?|reparse/i);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project sync rejects a nested managed link even when it resolves inside the target", (t) => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-internal-link-"));
  try {
    const repo = newTestRepo(tempRoot, "internal-link");
    const internalTarget = path.join(repo, "internal-managed-target");
    const managedRoot = path.join(repo, ".ai-toolkit");
    mkdirSync(internalTarget, { recursive: true });
    mkdirSync(managedRoot, { recursive: true });
    if (!createDirectoryLinkOrSkip(t, internalTarget, path.join(managedRoot, "compiled-agents"))) return;

    const result = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent"
    ]);

    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /linked path|symlink|junction|reparse/i);
    assert.equal(existsSync(path.join(internalTarget, "reviewer-agent.compiled.md")), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project sync rejects a nested managed link that resolves outside the target", (t) => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-external-link-"));
  try {
    const repo = newTestRepo(tempRoot, "external-link");
    const outside = path.join(tempRoot, "outside-managed-target");
    const managedRoot = path.join(repo, ".ai-toolkit");
    mkdirSync(outside, { recursive: true });
    mkdirSync(managedRoot, { recursive: true });
    if (!createDirectoryLinkOrSkip(t, outside, path.join(managedRoot, "compiled-agents"))) return;

    const result = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent"
    ]);

    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /containment|outside|linked path|symlink|junction|reparse/i);
    assert.equal(existsSync(path.join(outside, "reviewer-agent.compiled.md")), false);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project sync rejects an existing linked final managed file", (t) => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-final-link-"));
  try {
    const repo = newTestRepo(tempRoot, "final-link");
    const internalTarget = path.join(repo, "linked-agent-target.md");
    const compiledRoot = path.join(repo, ".ai-toolkit", "compiled-agents");
    writeFileSync(internalTarget, "preserve linked target\n", "utf8");
    mkdirSync(compiledRoot, { recursive: true });
    if (!createFileLinkOrSkip(t, internalTarget, path.join(compiledRoot, "reviewer-agent.compiled.md"))) return;

    const result = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent"
    ]);

    assert.notEqual(result.status, 0, result.output);
    assert.match(result.output, /linked path|symlink|hard[- ]link(?:ed)?|reparse/i);
    assert.equal(readFileSync(internalTarget, "utf8"), "preserve linked target\n");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project sync rolls back all writes when a late install record fails", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-rollback-"));
  try {
    const repo = newTestRepo(tempRoot, "rollback");
    const blockingManifest = path.join(repo, ".ai-toolkit", ".ai-toolkit-manifest.json");
    mkdirSync(blockingManifest, { recursive: true });
    writeFileSync(path.join(blockingManifest, "keep.txt"), "preserve me\n", "utf8");
    git(repo, ["add", ".ai-toolkit"]);
    git(repo, ["commit", "-m", "add blocking manifest fixture"]);
    git(repo, ["push"]);

    const result = runResult("node", [
      coreScript,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--confirm-write"
    ]);

    assert.notEqual(result.status, 0, result.output);
    assert.equal(existsSync(path.join(repo, ".ai-toolkit", "compiled-agents", "reviewer-agent.compiled.md")), false);
    assert.equal(readFileSync(path.join(blockingManifest, "keep.txt"), "utf8"), "preserve me\n");
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

for (const [failpoint, expectedPhase] of [
  ["after-backup-rename", "backup-created"],
  ["after-promotion", "promoted"]
]) {
  test(`project sync recovers an interrupted transaction at ${failpoint}`, () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-node-sync-recovery-"));
    try {
      const repo = newTestRepo(tempRoot, `recovery-${expectedPhase}`);
      installManagedFixture(repo);

      const interrupted = runResult("node", [
        coreScript,
        "update",
        "--target",
        repo,
        "--confirm-write"
      ], {
        env: { ...process.env, AI_TOOLKIT_FAILPOINT: failpoint }
      });

      assert.notEqual(interrupted.status, 0, interrupted.output);
      assert.match(interrupted.output, new RegExp(failpoint, "i"));
      const journalPath = path.join(repo, ".ai-toolkit.transaction.json");
      assert.equal(existsSync(journalPath), true, interrupted.output);
      assert.equal(JSON.parse(readFileSync(journalPath, "utf8")).phase, expectedPhase);
      assert.equal(transactionArtifacts(repo).some((name) => name.startsWith(".ai-toolkit.backup-")), true);

      const recovered = runResult("node", [
        coreScript,
        "update",
        "--target",
        repo,
        "--confirm-write"
      ]);

      assert.equal(recovered.status, 0, recovered.output);
      assert.match(recovered.output, /recover/i);
      assert.equal(existsSync(journalPath), false);
      assert.deepEqual(transactionArtifacts(repo), []);
      const validate = runResult("node", [coreScript, "validate", "--target", repo]);
      assert.equal(validate.status, 0, validate.output);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
}

test("bash install stays dry-run by default and writes only after confirm", { skip: !hasBash }, () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-bash-sync-"));
  try {
    const repo = newTestRepo(tempRoot, "install");
    const dryRun = runResult("bash", [
      path.join(REPO_ROOT, "install", "install-project.sh"),
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance"
    ]);
    assert.equal(dryRun.status, 0, dryRun.output);
    assert.match(dryRun.output, /Dry-run only/);
    assert.equal(existsSync(path.join(repo, ".ai-toolkit")), false);

    const install = runResult("bash", [
      path.join(REPO_ROOT, "install", "install-project.sh"),
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance",
      "--confirm-write"
    ]);
    assert.equal(install.status, 0, install.output);
    assert.equal(existsSync(path.join(repo, ".ai-toolkit", ".ai-toolkit-manifest.json")), true);

    const validate = runResult("bash", [
      path.join(REPO_ROOT, "install", "validate-project-install.sh"),
      "--target",
      repo
    ]);
    assert.equal(validate.status, 0, validate.output);
    assert.match(validate.output, /Validation passed/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("bash confirm-write refuses protected target states", { skip: !hasBash }, () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-bash-sync-"));
  try {
    const mainRepo = newTestRepo(tempRoot, "main");
    git(mainRepo, ["switch", "main"]);
    const mainResult = runResult("bash", [
      path.join(REPO_ROOT, "install", "install-project.sh"),
      "--target",
      mainRepo,
      "--agents",
      "reviewer-agent",
      "--confirm-write"
    ]);
    assert.notEqual(mainResult.status, 0);
    assert.match(mainResult.output, /main|master|no-direct-main/);

    const dirtyRepo = newTestRepo(tempRoot, "dirty");
    appendFileSync(path.join(dirtyRepo, "README.md"), "dirty\n", "utf8");
    const dirtyResult = runResult("bash", [
      path.join(REPO_ROOT, "install", "install-project.sh"),
      "--target",
      dirtyRepo,
      "--agents",
      "reviewer-agent",
      "--confirm-write"
    ]);
    assert.notEqual(dirtyResult.status, 0);
    assert.match(dirtyResult.output, /dirty|uncommitted/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
