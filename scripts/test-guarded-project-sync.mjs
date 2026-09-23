#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { writeJournalWithOperations } from "../install/guarded-project-sync.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(REPO_ROOT, "install", "guarded-project-sync.mjs");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeJson(filePath, value) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function run(args, fault = null) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: fault ? "test" : process.env.NODE_ENV,
      GUARDED_PROJECT_SYNC_TEST_FAULT: fault ?? ""
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function evidence(result) {
  assert.notEqual(result.stdout, "", result.stderr);
  return JSON.parse(result.stdout);
}

function snapshot(root, current = root, entries = []) {
  if (!existsSync(current)) return entries;
  for (const item of readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, item.name);
    if (item.isDirectory()) snapshot(root, fullPath, entries);
    else entries.push({ path: path.relative(root, fullPath).replace(/\\/g, "/"), sha256: hash(readFileSync(fullPath)) });
  }
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function changes(before, after) {
  const old = new Map(before.map((entry) => [entry.path, entry.sha256]));
  return after.filter((entry) => old.get(entry.path) !== entry.sha256);
}

function makeFixture(callback, name = "guarded project sync ") {
  const root = mkdtempSync(path.join(tmpdir(), name));
  const target = path.join(root, "dirty target with spaces");
  const backup = path.join(root, "verified backup with spaces");
  try {
    mkdirSync(path.join(target, ".ai-toolkit", "skills", "governance"), { recursive: true });
    writeFileSync(path.join(target, "README.md"), "# dirty fixture\nlocal owner edit\n", "utf8");
    writeJson(path.join(target, "package.json"), {
      name: "guarded-sync-fixture",
      scripts: { test: "echo GENERATED_CANDIDATE_MARKER_d2e581" }
    });
    writeFileSync(path.join(target, ".ai-toolkit", "skills", "governance", "SKILL.md"), "stale governed skill\n", "utf8");
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
    return callback({ root, target, backup });
  } finally {
    assert.equal(path.relative(path.resolve(tmpdir()), root).startsWith(".."), false);
    rmSync(root, { recursive: true, force: true });
  }
}

test("requires explicit target and backup and defaults to a non-mutating dry-run", () => {
  assert.notEqual(run([]).status, 0);
  assert.match(run([]).stderr, /explicit --target/);
  makeFixture(({ root, target, backup }) => {
    const before = snapshot(root);
    const result = run(["--target", target, "--backup", backup]);
    assert.equal(result.status, 0, result.stderr);
    const report = evidence(result);
    assert.equal(report.mode, "dry-run");
    assert.equal(report.status, "validated");
    assert.equal(report.targetPath, path.resolve(target));
    assert.equal(report.backupDirectory, path.resolve(backup));
    assert.equal(report.entries.every((entry) => !Object.hasOwn(entry, "content")), true);
    assert.deepEqual(snapshot(root), before);
  });
});

test("target and toolkit checkout must be disjoint in both containment directions", () => {
  const backup = path.join(tmpdir(), `guarded-overlap-${process.pid}-${Date.now()}`);
  const cases = [
    REPO_ROOT,
    path.join(REPO_ROOT, "install"),
    path.dirname(REPO_ROOT)
  ];
  for (const target of cases) {
    const result = run(["--target", target, "--backup", backup]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Target and toolkit checkout must be disjoint/);
    assert.equal(result.stdout, "");
    assert.equal(existsSync(backup), false);
  }
});

test("journal publication flushes the temporary file before link or rename", () => {
  for (const createOnly of [true, false]) {
    const events = [];
    const operations = {
      open: () => { events.push("open"); return 17; },
      write: (_descriptor, _bytes, _offset, length) => { events.push("write"); return length; },
      fsync: () => events.push("fsync"),
      close: () => events.push("close"),
      link: () => events.push("link"),
      rename: () => events.push("rename"),
      unlink: () => events.push("unlink"),
      flushDirectory: () => events.push("flush-directory")
    };
    writeJournalWithOperations("C:\\fake\\journal.json", { status: "test" }, createOnly, operations);
    const publication = createOnly ? "link" : "rename";
    assert.ok(events.indexOf("fsync") < events.indexOf(publication), events.join(","));
    assert.ok(events.indexOf("close") < events.indexOf(publication), events.join(","));
    assert.ok(events.indexOf(publication) < events.indexOf("flush-directory"), events.join(","));
  }
});

test("unsafe project-map content fails closed without serialization or leakage", () => {
  makeFixture(({ root, target, backup }) => {
    const secret = "CODEX_GUARDED_SECRET_SENTINEL_9f34ad";
    writeJson(path.join(target, "package.json"), {
      name: "unsafe-guarded-sync-fixture",
      scripts: { unsafe: `echo api_key=${secret}` }
    });
    const before = snapshot(root);
    const result = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, "");
    assert.equal(`${result.stdout}${result.stderr}`.includes(secret), false);
    assert.match(result.stderr, /Project-sync export refused/);
    assert.deepEqual(snapshot(root), before);
    assert.equal(existsSync(backup), false);
  });
});

test("guarded install uses exclusive creates and rollback removes only its created tree", () => {
  const root = mkdtempSync(path.join(tmpdir(), "guarded install "));
  const target = path.join(root, "new dirty target with spaces");
  const backup = path.join(root, "install backup");
  try {
    mkdirSync(target);
    writeFileSync(path.join(target, "README.md"), "uncommitted owner file\n", "utf8");
    const apply = run([
      "--target", target,
      "--backup", backup,
      "--command", "install",
      "--agents", "reviewer-agent",
      "--confirm-write"
    ]);
    assert.equal(apply.status, 0, apply.stderr);
    const report = evidence(apply);
    assert.equal(report.command, "install");
    assert.equal(report.entries.every((entry) => entry.operation === "create"), true);
    assert.equal(readFileSync(path.join(target, "README.md"), "utf8"), "uncommitted owner file\n");
    const rollback = run(["--target", target, "--backup", backup, "--rollback", "--confirm-write"]);
    assert.equal(rollback.status, 0, rollback.stderr);
    assert.equal(existsSync(path.join(target, ".ai-toolkit")), false);
    assert.equal(readFileSync(path.join(target, "README.md"), "utf8"), "uncommitted owner file\n");
  } finally {
    assert.equal(path.relative(path.resolve(tmpdir()), root).startsWith(".."), false);
    rmSync(root, { recursive: true, force: true });
  }
});

test("an exclusive-create collision preserves the competing file", () => {
  const root = mkdtempSync(path.join(tmpdir(), "guarded create collision "));
  const target = path.join(root, "new target");
  const backup = path.join(root, "backup");
  try {
    mkdirSync(target);
    writeFileSync(path.join(target, "README.md"), "owner file\n", "utf8");
    const result = run([
      "--target", target,
      "--backup", backup,
      "--command", "install",
      "--agents", "reviewer-agent",
      "--confirm-write"
    ], "create-collision:1");
    assert.notEqual(result.status, 0);
    const report = evidence(result);
    assert.equal(report.status, "partial-failure");
    assert.equal(report.entries[0].status, "write-started");
    assert.equal(readFileSync(report.entries[0].destinationPath, "utf8"), "deterministic competing create");
  } finally {
    assert.equal(path.relative(path.resolve(tmpdir()), root).startsWith(".."), false);
    rmSync(root, { recursive: true, force: true });
  }
});

test("confirmed dirty-target sync writes only destinations plus verified before-images and a sanitized journal", () => {
  makeFixture(({ root, target, backup }) => {
    const before = snapshot(root);
    const result = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.equal(result.status, 0, result.stderr);
    const report = evidence(result);
    assert.equal(report.status, "applied");
    assert.equal(report.mode, "write");
    assert.equal(result.stdout.includes("GENERATED_CANDIDATE_MARKER_d2e581"), false);
    assert.equal(result.stdout.includes("stale governed skill"), false);
    assert.equal(report.destinationLocks.every((lockPath) => !existsSync(lockPath)), true);
    assert.equal(existsSync(report.targetWorkspaceLock), false);
    assert.equal(existsSync(report.backupWorkspaceLock), false);

    for (const entry of report.entries) {
      assert.equal(hash(readFileSync(entry.destinationPath)), entry.afterSha256);
      if (entry.operation === "replace") {
        assert.equal(hash(readFileSync(entry.backupPath)), entry.beforeSha256);
      } else {
        assert.equal(entry.backupPath, null);
      }
    }

    const journalText = readFileSync(report.journalPath, "utf8");
    const journal = JSON.parse(journalText);
    assert.equal(journal.status, "applied");
    assert.equal(journalText.includes("GENERATED_CANDIDATE_MARKER_d2e581"), false);
    assert.equal(journalText.includes("stale governed skill"), false);
    assert.equal(journalText.includes('"content"'), false);
    assert.equal(journalText.includes("candidateBytes"), false);

    const allowed = new Set([
      ...report.entries.map((entry) => path.relative(root, entry.destinationPath).replace(/\\/g, "/")),
      ...report.entries.filter((entry) => entry.backupPath).map((entry) => path.relative(root, entry.backupPath).replace(/\\/g, "/")),
      path.relative(root, report.journalPath).replace(/\\/g, "/")
    ]);
    const changed = changes(before, snapshot(root));
    assert.equal(changed.length > 0, true);
    for (const item of changed) assert.equal(allowed.has(item.path), true, `unexpected persisted file: ${item.path}`);
  });
});

test("cooperative lock, non-empty backup, symlink, and hard-link collisions fail closed", () => {
  makeFixture(({ target, backup }) => {
    const preview = evidence(run(["--target", target, "--backup", backup]));
    const heldLock = preview.destinationLocks[0];
    writeFileSync(heldLock, "competing owner", "utf8");
    const blocked = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /lock is already held/);
    assert.equal(readFileSync(heldLock, "utf8"), "competing owner");
    rmSync(heldLock);

    mkdirSync(backup);
    writeFileSync(path.join(backup, "collision"), "occupied", "utf8");
    const backupBlocked = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.notEqual(backupBlocked.status, 0);
    assert.match(backupBlocked.stderr, /new or empty/);
  });

  makeFixture(({ target, backup }) => {
    const skill = path.join(target, ".ai-toolkit", "skills", "governance", "SKILL.md");
    const alias = path.join(target, ".ai-toolkit", "skills", "governance", "alias.md");
    linkSync(skill, alias);
    const result = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exactly one hard link/);
    assert.equal(readFileSync(alias, "utf8"), "stale governed skill\n");
    assert.equal(existsSync(backup), false);
  });

  makeFixture(({ root, target, backup }) => {
    const outside = path.join(root, "outside managed root");
    mkdirSync(outside);
    symlinkSync(outside, path.join(target, ".ai-toolkit", "methods"), "junction");
    const result = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /symbolic link/);
    assert.deepEqual(snapshot(outside), []);
    assert.equal(existsSync(backup), false);
  });
});

test("structured partial failure can be rolled back without candidate source persistence", () => {
  makeFixture(({ target, backup }) => {
    const apply = run(["--target", target, "--backup", backup, "--confirm-write"], "fail-before-write:2");
    assert.notEqual(apply.status, 0);
    const partial = evidence(apply);
    assert.equal(partial.status, "partial-failure");
    assert.equal(partial.entries[0].status, "written-and-verified");
    assert.equal(partial.entries[1].status, "write-started");
    const journalText = readFileSync(partial.journalPath, "utf8");
    assert.equal(journalText.includes('"content"'), false);
    assert.equal(journalText.includes("candidateBytes"), false);

    const dryRollback = run(["--target", target, "--backup", backup, "--rollback"]);
    assert.equal(dryRollback.status, 0, dryRollback.stderr);
    assert.equal(evidence(dryRollback).mode, "dry-run");
    const rollback = run(["--target", target, "--backup", backup, "--rollback", "--confirm-write"]);
    assert.equal(rollback.status, 0, rollback.stderr);
    assert.equal(evidence(rollback).status, "rolled-back");
    assert.equal(readFileSync(path.join(target, ".ai-toolkit", "skills", "governance", "SKILL.md"), "utf8"), "stale governed skill\n");
  });
});

test("rollback rejects the whole operation when a destination has a later owner edit", () => {
  makeFixture(({ target, backup }) => {
    const apply = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.equal(apply.status, 0, apply.stderr);
    const report = evidence(apply);
    const laterEntry = report.entries.find((entry) => entry.operation === "replace");
    assert.ok(laterEntry);
    writeFileSync(laterEntry.destinationPath, "later owner edit must survive\n", "utf8");
    const beforeRollback = snapshot(target);
    const rollback = run(["--target", target, "--backup", backup, "--rollback", "--confirm-write"]);
    assert.notEqual(rollback.status, 0);
    assert.match(rollback.stderr, /Rollback refuses later edit/);
    assert.equal(readFileSync(laterEntry.destinationPath, "utf8"), "later owner edit must survive\n");
    assert.deepEqual(snapshot(target), beforeRollback, "rollback must reject every write before mutation");
  });
});

test("rollback lock acquisition failure preserves the journal byte-for-byte", () => {
  makeFixture(({ target, backup }) => {
    const apply = run(["--target", target, "--backup", backup, "--confirm-write"]);
    assert.equal(apply.status, 0, apply.stderr);
    const applyReport = evidence(apply);
    const journalBefore = readFileSync(applyReport.journalPath);
    const rollback = run(
      ["--target", target, "--backup", backup, "--rollback", "--confirm-write"],
      "rollback-lock-collision"
    );
    assert.notEqual(rollback.status, 0);
    const failure = evidence(rollback);
    assert.equal(failure.status, "partial-failure");
    assert.match(rollback.stderr, /lock is already held/);
    assert.deepEqual(readFileSync(applyReport.journalPath), journalBefore);
    const competingLock = [
      ...failure.destinationLocks,
      failure.targetWorkspaceLock,
      failure.backupWorkspaceLock
    ].find((lockPath) => existsSync(lockPath));
    assert.ok(competingLock);
    assert.equal(readFileSync(competingLock, "utf8"), "deterministic competing owner");
  });
});

test("an under-lock backup collision yields structured failure and preserves the target", () => {
  makeFixture(({ root, target, backup }) => {
    const beforeTarget = snapshot(target);
    const result = run(
      ["--target", target, "--backup", backup, "--confirm-write"],
      "backup-collision-after-lock"
    );
    assert.notEqual(result.status, 0);
    assert.equal(evidence(result).status, "partial-failure");
    assert.match(result.stderr, /collision after lock acquisition/);
    assert.deepEqual(snapshot(target), beforeTarget);
    assert.equal(snapshot(root).some((item) => item.path.includes("guarded-project-sync-destination") && item.path.endsWith(".lock")), false);
  });
});
