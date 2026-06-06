#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, appendFileSync } from "node:fs";
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
