#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import * as projectContextPreflight from "../install/project-context-preflight.mjs";

const {
  PROJECT_MAP_RELATIVE_PATH,
  buildProjectMap,
  validateProjectMap
} = projectContextPreflight;

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const syncCore = path.join(REPO_ROOT, "install", "project-sync-core.mjs");

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

function write(repo, relativePath, content) {
  const filePath = path.join(repo, ...relativePath.split("/"));
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

function git(repo, args) {
  return run("git", ["-C", repo, ...args]);
}

function newGitRepo(tempRoot, name) {
  const remote = path.join(tempRoot, `${name}-remote.git`);
  const repo = path.join(tempRoot, `${name}-repo`);
  run("git", ["init", "--bare", remote], { cwd: tempRoot });
  run("git", ["init", repo], { cwd: tempRoot });
  git(repo, ["config", "user.email", "toolkit-test@example.com"]);
  git(repo, ["config", "user.name", "Toolkit Test"]);
  write(repo, "README.md", `# ${name}\n`);
  git(repo, ["add", "README.md"]);
  git(repo, ["commit", "-m", "seed"]);
  git(repo, ["branch", "-M", "main"]);
  git(repo, ["remote", "add", "origin", remote]);
  git(repo, ["push", "-u", "origin", "main"]);
  git(repo, ["switch", "-c", "feature/project-map"]);
  git(repo, ["push", "-u", "origin", "feature/project-map"]);
  return repo;
}

function commitAll(repo, message = "fixture") {
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", message]);
  git(repo, ["push"]);
}

function buildFixtureMap(repo) {
  return buildProjectMap({
    targetRoot: repo,
    selectedAgents: ["reviewer-agent"],
    selectedProfiles: [],
    selectedSkills: ["governance"],
    toolkitCommit: "test-toolkit-commit",
    toolkitVersion: "test-toolkit-version"
  });
}

function aggregateStalenessHashes(entries) {
  return createHash("sha256")
    .update(entries.map((entry) => `${entry.path}:${entry.sha256}`).join("\n"))
    .digest("hex");
}

test("project context preflight exposes no standalone raw write API", () => {
  assert.equal("writeProjectMap" in projectContextPreflight, false);
  assert.equal("projectMapOutputPath" in projectContextPreflight, false);
});

function createDirectoryLinkOrSkip(t, target, linkPath) {
  try {
    symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    if (["EACCES", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"].includes(error?.code)) {
      t.skip(`directory links are not supported by this host: ${error.code}`);
      return false;
    }
    throw error;
  }
}

test("project map captures a compact JS/TS app without absolute paths or secrets", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-"));
  try {
    const repo = newGitRepo(tempRoot, "simple-app");
    write(repo, "package.json", JSON.stringify({
      scripts: {
        typecheck: "tsc --noEmit",
        test: "vitest run",
        build: "vite build"
      },
      dependencies: {
        "@vitejs/plugin-react": "^latest"
      },
      devDependencies: {
        typescript: "^latest",
        vitest: "^latest"
      }
    }, null, 2));
    write(repo, "src/index.ts", "export function add(left: number, right: number) { return left + right; }\n");
    write(repo, "src/util.ts", "export const name = 'fixture';\n");
    write(repo, "tests/index.test.ts", "import { add } from '../src/index';\n");
    write(repo, "tsconfig.json", "{\"compilerOptions\":{\"strict\":true}}\n");
    write(repo, "AGENTS.md", "# Repo Rules\n");
    write(repo, ".env", "SECRET_TOKEN=do-not-map\n");
    commitAll(repo);

    const map = buildFixtureMap(repo);
    const mapText = JSON.stringify(map);
    assert.equal(PROJECT_MAP_RELATIVE_PATH, ".ai-toolkit/context/project-map.json");
    assert.equal(map.schemaVersion, "1.0.0");
    assert.equal(map.packageManager.manager, "npm");
    assert.deepEqual(map.repoRoots.map((entry) => entry.path), ["."]);
    assert.ok(map.keyFiles.includes("package.json"));
    assert.ok(map.keyFiles.includes("AGENTS.md"));
    assert.ok(map.sourceLocations.includes("src"));
    assert.ok(map.testLocations.includes("tests"));
    assert.ok(map.configFiles.includes("tsconfig.json"));
    assert.ok(map.scripts.some((script) => script.name === "typecheck" && script.command === "tsc --noEmit"));
    assert.ok(map.validationCommands.includes("npm run typecheck"));
    assert.ok(map.validationCommands.includes("npm test"));
    assert.ok(map.exclusions.includes(".env"));
    assert.equal(map.repomix.posture, "active-if-detected-or-owner-approved-install");
    assert.equal(map.boundedWorkCycle.loopAgents, "forbidden");
    assert.deepEqual(
      map.validationPolicy.lanes.map((lane) => lane.id),
      ["documentation-only", "behavior-code", "high-risk-release"]
    );
    assert.equal(map.validationPolicy.evidenceClasses.localStatic.requiresCredentials, false);
    assert.equal(map.validationPolicy.evidenceClasses.remoteLinkedCredentialed.requiresExplicitAuthorization, true);
    assert.equal(map.taskStart.progressiveDisclosure.reviewHeuristic.lines, 200);
    assert.equal(map.taskStart.progressiveDisclosure.reviewHeuristic.advisoryOnly, true);
    assert.match(map.taskStart.progressiveDisclosure.lineCountPolicy, /no universal file-length optimum/i);
    assert.equal(map.target.gitHeadPosture, "provenance-advisory");
    assert.ok(!mapText.includes(tempRoot));
    assert.ok(!mapText.includes("do-not-map"));
    assert.deepEqual(validateProjectMap(map, { targetRoot: repo }), []);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project map handles monorepo-like and no-package repositories", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-"));
  try {
    const monorepo = newGitRepo(tempRoot, "mono");
    write(monorepo, "package.json", JSON.stringify({
      workspaces: ["apps/*", "packages/*"],
      scripts: { test: "vitest run" }
    }, null, 2));
    write(monorepo, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");
    write(monorepo, "apps/web/package.json", "{\"scripts\":{\"build\":\"vite build\"}}\n");
    write(monorepo, "apps/web/src/main.ts", "export const app = true;\n");
    write(monorepo, "packages/ui/package.json", "{\"scripts\":{\"test\":\"vitest run\"}}\n");
    write(monorepo, "packages/ui/src/button.ts", "export const button = true;\n");
    commitAll(monorepo);
    const monoMap = buildFixtureMap(monorepo);
    assert.equal(monoMap.packageManager.manager, "pnpm");
    assert.deepEqual(monoMap.repoRoots.map((entry) => entry.path), [".", "apps/web", "packages/ui"]);
    assert.ok(monoMap.sourceLocations.includes("apps/web/src"));
    assert.ok(monoMap.sourceLocations.includes("packages/ui/src"));
    assert.ok(monoMap.validationCommands.includes("pnpm test"));
    assert.deepEqual(validateProjectMap(monoMap, { targetRoot: monorepo }), []);

    const docsOnly = newGitRepo(tempRoot, "docs-only");
    write(docsOnly, "docs/overview.md", "# Overview\n");
    commitAll(docsOnly);
    const docsMap = buildFixtureMap(docsOnly);
    assert.equal(docsMap.packageManager.manager, "none");
    assert.deepEqual(docsMap.validationCommands, []);
    assert.ok(docsMap.configFiles.includes("README.md"));
    assert.deepEqual(validateProjectMap(docsMap, { targetRoot: docsOnly }), []);

    const bunRepo = newGitRepo(tempRoot, "bun-app");
    write(bunRepo, "package.json", JSON.stringify({
      scripts: { test: "bun test", build: "vite build" }
    }, null, 2));
    write(bunRepo, "bun.lockb", "");
    commitAll(bunRepo);
    const bunMap = buildFixtureMap(bunRepo);
    assert.equal(bunMap.packageManager.manager, "bun");
    assert.ok(bunMap.validationCommands.includes("bun run test"));
    assert.ok(bunMap.validationCommands.includes("bun run build"));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project map validator rejects deterministic drift while treating git head as advisory provenance", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-"));
  try {
    const repo = newGitRepo(tempRoot, "unsafe");
    write(repo, "package.json", "{\"scripts\":{\"test\":\"node --test\"}}\n");
    commitAll(repo);
    const map = buildFixtureMap(repo);

    const absolutePathMap = structuredClone(map);
    absolutePathMap.keyFiles.push("Z:/synthetic/project/src/index.ts");
    assert.ok(validateProjectMap(absolutePathMap, { targetRoot: repo }).some((issue) => issue.includes("absolute path")));

    const privatePathMap = structuredClone(map);
    privatePathMap.sourceLocations.push("private/overlays");
    assert.ok(validateProjectMap(privatePathMap, { targetRoot: repo }).some((issue) => issue.includes("private overlay")));

    const secretValueMap = structuredClone(map);
    secretValueMap.notes = "sk-proj-1234567890abcdef1234567890abcdef";
    assert.ok(validateProjectMap(secretValueMap, { targetRoot: repo }).some((issue) => issue.includes("secret-like")));

    const oversizedMap = structuredClone(map);
    oversizedMap.notes = "x".repeat(70000);
    assert.ok(validateProjectMap(oversizedMap, { targetRoot: repo }).some((issue) => issue.includes("oversized")));

    const traversalHashMap = structuredClone(map);
    traversalHashMap.target.stalenessHashes.files.push({ path: "../outside-file", sha256: "a".repeat(64) });
    assert.ok(validateProjectMap(traversalHashMap, { targetRoot: repo }).some((issue) => issue.includes("invalid staleness hash path")));

    const missingHashMap = structuredClone(map);
    missingHashMap.target.stalenessHashes.files.push({ path: "missing.js", sha256: "b".repeat(64) });
    assert.ok(validateProjectMap(missingHashMap, { targetRoot: repo }).some((issue) => issue.includes("missing hashed file")));

    const missingShaMap = structuredClone(map);
    missingShaMap.target.stalenessHashes.files.push({ path: "package.json" });
    assert.ok(validateProjectMap(missingShaMap, { targetRoot: repo }).some((issue) => issue.includes("missing staleness hash")));

    const toolkitOnlyMap = buildFixtureMap(repo);
    write(repo, ".ai-toolkit/generated.md", "# generated\n");
    commitAll(repo, "toolkit-only");
    assert.deepEqual(validateProjectMap(toolkitOnlyMap, { targetRoot: repo }), []);

    write(repo, "README.md", "# unsafe\nchanged\n");
    commitAll(repo, "advance head");
    const deterministicDriftIssues = validateProjectMap(map, { targetRoot: repo });
    assert.equal(deterministicDriftIssues.some((issue) => issue.includes("stale git head")), false);
    assert.ok(deterministicDriftIssues.some((issue) => issue.includes("stale file hash: README.md")));
    assert.notEqual(git(repo, ["rev-parse", "HEAD"]).trim(), map.target.gitHead);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project map validator requires governance policy and rederives deterministic repository observations", () => {
  const minimalIssues = validateProjectMap({
    schemaVersion: "1.0.0",
    mapType: "project-context-preflight"
  });
  assert.ok(minimalIssues.some((issue) => issue.includes("gitHeadPosture")));
  assert.ok(minimalIssues.some((issue) => issue.includes("validationPolicy")));
  assert.ok(minimalIssues.some((issue) => issue.includes("progressiveDisclosure")));
  assert.ok(minimalIssues.some((issue) => issue.includes("boundedWorkCycle")));
  assert.ok(minimalIssues.some((issue) => issue.includes("stalenessHashes.files")));

  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-contract-"));
  try {
    const repo = newGitRepo(tempRoot, "contract");
    write(repo, "package.json", JSON.stringify({
      scripts: {
        typecheck: "tsc --noEmit",
        test: "node --test",
        build: "vite build"
      }
    }, null, 2));
    write(repo, "src/index.ts", "export const contract = true;\n");
    write(repo, "tests/index.test.ts", "import '../src/index';\n");
    write(repo, "tsconfig.json", "{\"compilerOptions\":{\"strict\":true}}\n");
    commitAll(repo);
    const map = buildFixtureMap(repo);

    const missingPolicyCases = [
      ["gitHeadPosture", (candidate) => delete candidate.target.gitHeadPosture],
      ["validationPolicy", (candidate) => delete candidate.validationPolicy.evidenceClasses.remoteLinkedCredentialed],
      ["validationPolicy", (candidate) => candidate.validationPolicy.lanes.pop()],
      ["progressiveDisclosure", (candidate) => delete candidate.taskStart.progressiveDisclosure.reviewHeuristic.advisoryOnly],
      ["boundedWorkCycle", (candidate) => delete candidate.boundedWorkCycle.loopAgents]
    ];
    for (const [expectedIssue, mutate] of missingPolicyCases) {
      const candidate = structuredClone(map);
      mutate(candidate);
      assert.ok(
        validateProjectMap(candidate, { targetRoot: repo }).some((issue) => issue.includes(expectedIssue)),
        `missing policy field should report ${expectedIssue}`
      );
    }

    const aggregateTamper = structuredClone(map);
    aggregateTamper.target.stalenessHashes.aggregateSha256 = "a".repeat(64);
    assert.ok(validateProjectMap(aggregateTamper, { targetRoot: repo }).some(
      (issue) => issue.includes("staleness aggregateSha256 mismatch")
    ));

    const missingHashEntry = structuredClone(map);
    missingHashEntry.target.stalenessHashes.files.pop();
    missingHashEntry.target.stalenessHashes.aggregateSha256 = aggregateStalenessHashes(
      missingHashEntry.target.stalenessHashes.files
    );

    const deterministicTamperCases = [
      ["scripts", (candidate) => { candidate.scripts[0].name = "tampered-script"; }],
      ["packageManager", (candidate) => { candidate.packageManager.evidence = ["tampered-lock.yaml"]; }],
      ["validationCommands", (candidate) => { candidate.validationCommands[0] = "npm run tampered"; }],
      ["repoRoots", (candidate) => { candidate.repoRoots[0].evidence = ["package.json"]; }],
      ["keyFiles", (candidate) => { candidate.keyFiles = candidate.keyFiles.filter((entry) => entry !== "README.md"); }],
      ["configFiles", (candidate) => { candidate.configFiles = candidate.configFiles.filter((entry) => entry !== "tsconfig.json"); }],
      ["sourceLocations", (candidate) => { candidate.sourceLocations = ["lib"]; }],
      ["testLocations", (candidate) => { candidate.testLocations = ["specs"]; }],
      ["target.stalenessHashes", (candidate) => {
        candidate.target.stalenessHashes = structuredClone(missingHashEntry.target.stalenessHashes);
      }]
    ];
    for (const [field, mutate] of deterministicTamperCases) {
      const candidate = structuredClone(map);
      mutate(candidate);
      assert.ok(
        validateProjectMap(candidate, { targetRoot: repo }).some(
          (issue) => issue.includes(`repository observation mismatch: ${field}`)
        ),
        `${field} tamper should be rejected`
      );
    }

    const advisoryDrift = structuredClone(map);
    advisoryDrift.target.gitHead = "f".repeat(40);
    advisoryDrift.target.gitBranch = "historical-branch";
    advisoryDrift.target.gitDirty = !map.target.gitDirty;
    assert.deepEqual(validateProjectMap(advisoryDrift, { targetRoot: repo }), []);

    const malformedAdvisoryHead = structuredClone(map);
    malformedAdvisoryHead.target.gitHead = "not-a-git-object-id";
    assert.ok(validateProjectMap(malformedAdvisoryHead, { targetRoot: repo }).some(
      (issue) => issue.includes("gitHead must be a canonical Git object ID or null")
    ));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project map excludes nested worktree checkout paths from generated outputs", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-worktrees-"));
  try {
    const repo = newGitRepo(tempRoot, "worktree-leak");
    write(repo, "package.json", "{\"scripts\":{\"test\":\"vitest run\"}}\n");
    write(repo, "src/index.ts", "export const main = true;\n");
    write(repo, "tests/index.test.ts", "import '../src/index';\n");
    write(repo, ".worktrees/nested/src/leaked.ts", "export const leaked = true;\n");
    write(repo, ".worktrees/nested/tests/leaked.test.ts", "import '../src/leaked';\n");
    write(repo, ".worktree/nested/src/leaked.ts", "export const leaked = true;\n");
    write(repo, "worktrees/nested/tests/leaked.test.ts", "import '../src/leaked';\n");
    write(repo, ".git-worktrees/nested/vite.config.ts", "export default {};\n");
    commitAll(repo);

    const map = buildFixtureMap(repo);
    const blockedPrefixes = [".worktrees/", ".worktree/", "worktrees/", ".git-worktrees/"];
    const assertNoBlockedPrefix = (value) => {
      assert.equal(blockedPrefixes.some((prefix) => String(value).startsWith(prefix)), false, `${value} should not come from a nested worktree`);
    };

    for (const value of map.sourceLocations) assertNoBlockedPrefix(value);
    for (const value of map.testLocations) assertNoBlockedPrefix(value);
    for (const value of map.keyFiles) assertNoBlockedPrefix(value);
    for (const value of map.configFiles) assertNoBlockedPrefix(value);
    for (const entry of map.target.stalenessHashes.files) assertNoBlockedPrefix(entry.path);
    assert.ok(map.sourceLocations.includes("src"));
    assert.ok(map.testLocations.includes("tests"));
    assert.deepEqual(validateProjectMap(map, { targetRoot: repo }), []);

    const injectedMap = structuredClone(map);
    injectedMap.sourceLocations.push(".worktrees/nested/src");
    injectedMap.testLocations.push(".worktree/nested/tests");
    injectedMap.keyFiles.push("worktrees/nested/package.json");
    injectedMap.configFiles.push(".git-worktrees/nested/vite.config.ts");
    injectedMap.target.stalenessHashes.files.push({ path: ".worktrees/nested/package.json", sha256: "a".repeat(64) });
    const issues = validateProjectMap(injectedMap, { targetRoot: repo });
    assert.ok(issues.some((issue) => issue.includes("worktree checkout path")));
    assert.ok(issues.some((issue) => issue.includes("invalid staleness hash path")));
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project map excludes linked workspace packages outside the repository", (t) => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-linked-workspace-"));
  try {
    const repo = newGitRepo(tempRoot, "linked-workspace");
    write(repo, "package.json", JSON.stringify({
      workspaces: ["linked/*"],
      scripts: { test: "node --test" }
    }, null, 2));
    commitAll(repo);

    const externalRoot = path.join(tempRoot, "external-workspaces");
    write(externalRoot, "injected/package.json", JSON.stringify({
      scripts: { exfiltrate: "read-outside-repository" }
    }, null, 2));
    if (!createDirectoryLinkOrSkip(t, externalRoot, path.join(repo, "linked"))) return;

    const map = buildFixtureMap(repo);
    assert.deepEqual(map.repoRoots.map((entry) => entry.path), ["."]);
    assert.equal(map.scripts.some((script) => script.name === "exfiltrate"), false);
    assert.doesNotMatch(JSON.stringify(map), /linked\/injected|read-outside-repository/u);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project map validation rejects linked staleness-hash inputs", (t) => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-linked-hash-"));
  try {
    const repo = newGitRepo(tempRoot, "linked-hash");
    write(repo, "package.json", JSON.stringify({ scripts: { test: "node --test" } }, null, 2));
    commitAll(repo);

    const externalRoot = path.join(tempRoot, "external-hash-input");
    write(externalRoot, "package.json", JSON.stringify({ scripts: { exfiltrate: "outside" } }, null, 2));
    if (!createDirectoryLinkOrSkip(t, externalRoot, path.join(repo, "linked"))) return;

    const map = buildFixtureMap(repo);
    const externalSha = createHash("sha256")
      .update(readFileSync(path.join(externalRoot, "package.json")))
      .digest("hex");
    map.target.stalenessHashes.files.push({ path: "linked/package.json", sha256: externalSha });
    map.target.stalenessHashes.files.sort((left, right) => left.path.localeCompare(right.path));
    map.target.stalenessHashes.aggregateSha256 = aggregateStalenessHashes(map.target.stalenessHashes.files);

    const issues = validateProjectMap(map, { targetRoot: repo });
    assert.ok(
      issues.includes("unsafe or missing hashed file: linked/package.json"),
      issues.join("\n")
    );
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test("project sync reports preflight map in dry-run and writes it only with confirm-write", () => {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "ai-toolkit-preflight-sync-"));
  try {
    const repo = newGitRepo(tempRoot, "sync");
    write(repo, "package.json", "{\"scripts\":{\"test\":\"node --test\"}}\n");
    write(repo, "src/index.js", "export const ok = true;\n");
    commitAll(repo);

    const dryRun = runResult("node", [
      syncCore,
      "install",
      "--target",
      repo,
      "--agents",
      "reviewer-agent",
      "--skills",
      "governance"
    ]);
    assert.equal(dryRun.status, 0, dryRun.output);
    assert.match(dryRun.output, /Project context preflight map:/);
    assert.equal(existsSync(path.join(repo, ...PROJECT_MAP_RELATIVE_PATH.split("/"))), false);

    const install = runResult("node", [
      syncCore,
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
    const mapPath = path.join(repo, ...PROJECT_MAP_RELATIVE_PATH.split("/"));
    assert.equal(existsSync(mapPath), true);
    const map = JSON.parse(readFileSync(mapPath, "utf8"));
    assert.deepEqual(validateProjectMap(map, { targetRoot: repo }), []);
    const manifest = JSON.parse(readFileSync(path.join(repo, ".ai-toolkit", ".ai-toolkit-manifest.json"), "utf8"));
    const mapAsset = manifest.assets.find((asset) => asset.path === "context/project-map.json");
    assert.equal(mapAsset?.type, "context-map");

    const validate = runResult("node", [syncCore, "validate", "--target", repo]);
    assert.equal(validate.status, 0, validate.output);
    assert.match(validate.output, /Validation passed/);
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
