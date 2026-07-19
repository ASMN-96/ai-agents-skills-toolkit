#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatReleaseEvidenceSummary,
  renderStatusRuntimeBoundaryLines,
  validateRepositoryState,
  validateReleaseEvidence
} from "./validate-v0-3-release-evidence.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATOR = path.join(ROOT, "scripts", "validate-v0-3-release-evidence.mjs");
const RELEASE_GATE = path.join(ROOT, "scripts", "run-release-gate.mjs");

function git(root, args) {
  const hooksPath = path.join(root, ".git-test-hooks");
  mkdirSync(hooksPath, { recursive: true });
  const result = spawnSync("git", [
    "-c", `core.hooksPath=${hooksPath}`,
    "-c", "commit.gpgsign=false",
    "-c", "user.name=Toolkit Test",
    "-c", "user.email=toolkit-test@example.invalid",
    ...args
  ], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "0",
      GIT_CONFIG_GLOBAL: path.join(root, ".gitconfig-isolated"),
      GIT_CONFIG_NOSYSTEM: "1"
    },
    timeout: 15_000,
    windowsHide: true
  });
  assert.equal(result.error, undefined, result.error?.message ?? "git fixture process failed to start");
  assert.equal(result.status, 0, `${result.stdout ?? ""}${result.stderr ?? ""}`);
  return result.stdout.trim();
}

test("STATUS runtime inventory is derived from the release evidence record", () => {
  const evidence = JSON.parse(readFileSync(path.join(ROOT, "docs", "V0_3_0_RELEASE_EVIDENCE.json"), "utf8"));
  const status = readFileSync(path.join(ROOT, "STATUS.md"), "utf8");
  for (const line of renderStatusRuntimeBoundaryLines(evidence)) {
    assert.ok(status.includes(line), `STATUS.md must contain evidence-derived line: ${line}`);
  }
});

test("release evidence accepts source and compiler commits that are ancestors of generated HEAD", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "release-evidence-ancestor-"));
  try {
    git(fixture, ["init"]);
    writeFileSync(path.join(fixture, "source.txt"), "source\n", "utf8");
    git(fixture, ["add", "source.txt"]);
    git(fixture, ["commit", "-m", "source"]);
    const sourceCommit = git(fixture, ["rev-parse", "HEAD"]);
    writeFileSync(path.join(fixture, "generated.txt"), "generated\n", "utf8");
    git(fixture, ["add", "generated.txt"]);
    git(fixture, ["commit", "-m", "generated"]);
    writeFileSync(path.join(fixture, "uncommitted.txt"), "uncommitted\n", "utf8");

    assert.doesNotThrow(() => validateRepositoryState(fixture, {
      repository: {
        sourceCommit,
        compilerCommit: sourceCommit,
        worktreeState: "uncommitted"
      }
    }));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("candidate release evidence is internally consistent while honestly blocked", async () => {
  const result = await validateReleaseEvidence({ root: ROOT });

  assert.equal(result.consistent, true);
  assert.equal(result.releaseState, "blocked");
  assert.equal(result.controlledRelease, "0.2.5");
  assert.equal(result.candidateVersion, "0.3.0");
  assert.ok(result.releaseBlockers.length > 0);
  assert.match(formatReleaseEvidenceSummary(result), /^PASS v0\.3-release-evidence .*release=BLOCKED/u);
});

test("release evidence CLI passes consistency check but fails release-ready mode", () => {
  const checked = spawnSync(process.execPath, [VALIDATOR, "--check"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(checked.status, 0, `${checked.stdout ?? ""}${checked.stderr ?? ""}`);
  assert.match(checked.stdout, /^PASS v0\.3-release-evidence /u);

  const release = spawnSync(process.execPath, [VALIDATOR, "--require-release-ready"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.notEqual(release.status, 0);
  assert.match(`${release.stdout ?? ""}${release.stderr ?? ""}`, /release-evidence-state-blocked/u);
});

test("release gate profiles include consistency and release-ready evidence checks", () => {
  const pr = spawnSync(process.execPath, [RELEASE_GATE, "pr", "--list", "--json"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const release = spawnSync(process.execPath, [RELEASE_GATE, "release", "--list", "--json"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  assert.equal(pr.status, 0, `${pr.stdout ?? ""}${pr.stderr ?? ""}`);
  assert.equal(release.status, 0, `${release.stdout ?? ""}${release.stderr ?? ""}`);
  const prCommands = JSON.parse(pr.stdout).commands;
  const releaseCommands = JSON.parse(release.stdout).commands;
  assert.ok(prCommands.some((command) => command.id === "release-evidence-check"));
  assert.ok(releaseCommands.some((command) => command.id === "release-evidence-ready"
    && command.args.includes("--require-release-ready")));
});
