#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { existsSync, linkSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "ai-toolkit", "reconcile-runtime-installations.mjs");
const RECOVERY_FIXTURE = path.join(ROOT, "scripts", "fixtures", "reconcile-historical-topology.json");
const RECOVERY_FIXTURE_SHA256 = "d5af3b0e422a6b68e1c15a7878feb25c1c204c4cd89af518e16f8464c81367b0";
const BINARY = Buffer.from([0, 1, 2, 255]);

function hash(value) { return createHash("sha256").update(value).digest("hex"); }

async function run(args, fault) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], {
      env: { ...process.env, NODE_ENV: "test", RECONCILE_RUNTIME_TEST_FAULT: fault ?? "" }
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { code: error.code ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? String(error) };
  }
}

async function fixture(callback) {
  const root = mkdtempSync(path.join(tmpdir(), "reconcile-runtime-v2-test-"));
  try {
    mkdirSync(path.join(root, "source"));
    mkdirSync(path.join(root, "destination"));
    writeFileSync(path.join(root, "source", "skill.md"), BINARY);
    writeFileSync(path.join(root, "destination", "skill.md"), "before", "utf8");
    return await callback(root);
  } finally {
    assert.equal(path.relative(path.resolve(tmpdir()), root).startsWith(".."), false);
    rmSync(root, { recursive: true, force: true });
  }
}

function writePlan(root, entries, version = 2, name = "plan.json", backupDirectory = "backup") {
  const planPath = path.join(root, name);
  writeFileSync(planPath, `${JSON.stringify({ version, backupDirectory, entries }, null, 2)}\n`, "utf8");
  return planPath;
}

function replaceEntry(source = "source/skill.md", destination = "destination/skill.md", before = "before", after = BINARY) {
  return { operation: "replace", source, destination, expectedSourceSha256: hash(after), expectedBeforeSha256: hash(before) };
}

function createEntry(source, destination, content) {
  return { operation: "create", source, destination, expectedSourceSha256: hash(content) };
}

function evidence(result) {
  assert.notEqual(result.stdout, "", `expected structured evidence; stderr=${result.stderr}`);
  return JSON.parse(result.stdout);
}

test("version 1 plans are rejected even in write mode", async () => {
  await fixture(async (root) => {
    const result = await run(["--plan", writePlan(root, [replaceEntry()], 1), "--confirm-write"]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /version 2 is required and version 1 writes are rejected/);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(existsSync(path.join(root, "backup")), false);
  });
});

test("dry-run validates without creating lock, backup, journal, or writes", async () => {
  await fixture(async (root) => {
    const result = await run(["--plan", writePlan(root, [replaceEntry()]), "--dry-run"]);
    assert.equal(result.code, 0, result.stderr);
    const report = evidence(result);
    assert.equal(report.mode, "dry-run");
    assert.equal(report.status, "validated");
    assert.equal(report.entries[0].afterSha256, hash(BINARY));
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(existsSync(path.join(root, "backup")), false);
    assert.equal(report.locks.every((lockPath) => !existsSync(lockPath)), true);
  });
});

test("write verifies exact bytes, backup, read-back, and journal", async () => {
  await fixture(async (root) => {
    mkdirSync(path.join(root, "backup"));
    const result = await run(["--plan", writePlan(root, [replaceEntry()]), "--confirm-write"]);
    assert.equal(result.code, 0, result.stderr);
    const report = evidence(result);
    assert.equal(report.status, "applied");
    assert.deepEqual(readFileSync(path.join(root, "destination", "skill.md")), BINARY);
    assert.equal(readFileSync(report.entries[0].backup, "utf8"), "before");
    const journal = JSON.parse(readFileSync(report.journal, "utf8"));
    assert.equal(journal.status, "applied");
    assert.equal(journal.entries[0].backupSha256, hash("before"));
    assert.equal(journal.entries[0].status, "written-and-verified");
    assert.equal(report.locks.every((lockPath) => !existsSync(lockPath)), true);
  });
});

test("stale source rejects the entire plan before mutation", async () => {
  await fixture(async (root) => {
    const entry = replaceEntry();
    entry.expectedSourceSha256 = hash("stale source");
    const result = await run(["--plan", writePlan(root, [entry]), "--confirm-write"]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Source hash mismatch/);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(existsSync(path.join(root, "backup")), false);
  });
});

test("stale destination rejects the entire plan before mutation", async () => {
  await fixture(async (root) => {
    const result = await run(["--plan", writePlan(root, [replaceEntry("source/skill.md", "destination/skill.md", "stale")]), "--confirm-write"]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Destination preimage hash mismatch/);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(existsSync(path.join(root, "backup")), false);
  });
});

test("path overlap and hard-link aliases are rejected", async () => {
  await fixture(async (root) => {
    const same = { ...replaceEntry(), source: "destination/skill.md", expectedSourceSha256: hash("before") };
    const sameResult = await run(["--plan", writePlan(root, [same])]);
    assert.notEqual(sameResult.code, 0);
    assert.match(sameResult.stderr, /Source and destination overlap/);
    const alias = path.join(root, "destination", "alias.md");
    linkSync(path.join(root, "source", "skill.md"), alias);
    const hardResult = await run(["--plan", writePlan(root, [replaceEntry("source/skill.md", "destination/alias.md", BINARY)])]);
    assert.notEqual(hardResult.code, 0);
    assert.match(hardResult.stderr, /Hard-link overlap|exactly one hard link/);
  });
});

test("an existing cooperative lock rejects dry-run and write without removing it", async () => {
  await fixture(async (root) => {
    const planPath = writePlan(root, [replaceEntry()]);
    const preview = await run(["--plan", planPath]);
    assert.equal(preview.code, 0, preview.stderr);
    const lockPath = evidence(preview).destinationLocks[0];
    writeFileSync(lockPath, "held", "utf8");
    for (const args of [["--plan", planPath], ["--plan", planPath, "--confirm-write"]]) {
      const result = await run(args);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /reconciliation lock is already held/);
    }
    assert.equal(readFileSync(lockPath, "utf8"), "held");
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
  });
});

test("plans with the same destination share ownership locks despite different backup directories", async () => {
  await fixture(async (root) => {
    const firstPlan = writePlan(root, [replaceEntry()], 2, "plan-a.json", "backup-a");
    const secondPlan = writePlan(root, [replaceEntry()], 2, "plan-b.json", "backup-b");
    const firstPreview = await run(["--plan", firstPlan]);
    const secondPreview = await run(["--plan", secondPlan]);
    assert.equal(firstPreview.code, 0, firstPreview.stderr);
    assert.equal(secondPreview.code, 0, secondPreview.stderr);
    const firstLock = evidence(firstPreview).destinationLocks[0];
    assert.equal(firstLock, evidence(secondPreview).destinationLocks[0]);
    writeFileSync(firstLock, "first plan owns destination", "utf8");
    const blocked = await run(["--plan", secondPlan, "--confirm-write"]);
    assert.notEqual(blocked.code, 0);
    assert.match(blocked.stderr, /reconciliation lock is already held/);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(existsSync(path.join(root, "backup-b")), false);
  });
});

test("an under-lock backup collision is revalidated before journal mutation", async () => {
  await fixture(async (root) => {
    const planPath = writePlan(root, [replaceEntry()]);
    const result = await run(["--plan", planPath, "--confirm-write"], "backup-collision-after-lock");
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Backup directory collision after lock acquisition|Backup collision after lock acquisition/);
    assert.equal(evidence(result).status, "partial-failure");
    assert.equal(existsSync(path.join(root, "backup", "reconciliation-journal.json")), false);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
  });
});

test("plans with disjoint destinations share a lock when they use the same backup workspace", async () => {
  await fixture(async (root) => {
    writeFileSync(path.join(root, "source", "second.md"), "after second", "utf8");
    writeFileSync(path.join(root, "destination", "second.md"), "before second", "utf8");
    const firstPlan = writePlan(root, [replaceEntry()], 2, "workspace-plan-a.json", "shared-backup");
    const secondPlan = writePlan(root, [replaceEntry("source/second.md", "destination/second.md", "before second", "after second")], 2, "workspace-plan-b.json", "shared-backup");
    const firstPreview = evidence(await run(["--plan", firstPlan]));
    const secondPreview = evidence(await run(["--plan", secondPlan]));
    assert.equal(firstPreview.backupWorkspaceLock, secondPreview.backupWorkspaceLock);
    writeFileSync(firstPreview.backupWorkspaceLock, "workspace owner", "utf8");
    const blocked = await run(["--plan", secondPlan, "--confirm-write"]);
    assert.notEqual(blocked.code, 0);
    assert.match(blocked.stderr, /reconciliation lock is already held/);
    assert.equal(readFileSync(path.join(root, "destination", "second.md"), "utf8"), "before second");
  });
});

test("exclusive journal-creation race preserves the competing journal byte-for-byte", async () => {
  await fixture(async (root) => {
    const planPath = writePlan(root, [replaceEntry()]);
    const result = await run(["--plan", planPath, "--confirm-write"], "journal-collision-before-create");
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /EEXIST|file already exists/);
    const report = evidence(result);
    assert.equal(report.status, "partial-failure");
    assert.equal(readFileSync(report.journal, "utf8"), "deterministic competing journal\n");
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(report.locks.every((lockPath) => !existsSync(lockPath)), true);
  });
});

test("an unlisted hard-link alias blocks destination writes and preserves its sentinel", async () => {
  await fixture(async (root) => {
    const sentinel = path.join(root, "destination", "unlisted-sentinel.md");
    linkSync(path.join(root, "destination", "skill.md"), sentinel);
    const result = await run(["--plan", writePlan(root, [replaceEntry()]), "--confirm-write"]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /exactly one hard link; found 2/);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(readFileSync(sentinel, "utf8"), "before");
    assert.equal(existsSync(path.join(root, "backup")), false);
  });
});

test("create-only and backup-directory collisions fail closed", async () => {
  await fixture(async (root) => {
    writeFileSync(path.join(root, "source", "new.md"), "new", "utf8");
    writeFileSync(path.join(root, "destination", "new.md"), "occupied", "utf8");
    const createResult = await run(["--plan", writePlan(root, [createEntry("source/new.md", "destination/new.md", "new")]), "--confirm-write"]);
    assert.notEqual(createResult.code, 0);
    assert.match(createResult.stderr, /Create-only destination already exists/);
    assert.equal(readFileSync(path.join(root, "destination", "new.md"), "utf8"), "occupied");
    rmSync(path.join(root, "destination", "new.md"));
    mkdirSync(path.join(root, "backup"));
    writeFileSync(path.join(root, "backup", "collision"), "occupied", "utf8");
    const backupResult = await run(["--plan", writePlan(root, [replaceEntry()]), "--confirm-write"]);
    assert.notEqual(backupResult.code, 0);
    assert.match(backupResult.stderr, /Backup directory must not exist or must be an empty/);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
  });
});

test("a pre-write destination change yields structured partial-failure evidence", async () => {
  await fixture(async (root) => {
    writeFileSync(path.join(root, "source", "second.md"), "after second", "utf8");
    writeFileSync(path.join(root, "destination", "second.md"), "before second", "utf8");
    const planPath = writePlan(root, [replaceEntry(), replaceEntry("source/second.md", "destination/second.md", "before second", "after second")]);
    const result = await run(["--plan", planPath, "--confirm-write"], "stale-destination:2");
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Destination changed after backup/);
    const report = evidence(result);
    assert.equal(report.status, "partial-failure");
    assert.equal(report.entries[0].status, "written-and-verified");
    assert.equal(report.entries[1].status, "backed-up");
    assert.equal(readFileSync(path.join(root, "destination", "second.md"), "utf8"), "deterministic external edit");
  });
});

test("read-back mismatch bytes are reported, preserved, and never authorized for rollback", async () => {
  await fixture(async (root) => {
    const planPath = writePlan(root, [replaceEntry()]);
    const apply = await run(["--plan", planPath, "--confirm-write"], "corrupt-after-write:1");
    assert.notEqual(apply.code, 0);
    assert.match(apply.stderr, /read-back verification failed/);
    assert.equal(evidence(apply).entries[0].status, "verification-failed");
    const unknownBytes = readFileSync(path.join(root, "destination", "skill.md"));
    const rollback = await run(["--plan", planPath, "--rollback", "--confirm-write"]);
    assert.notEqual(rollback.code, 0);
    assert.match(rollback.stderr, /Rollback refuses later edit/);
    assert.deepEqual(readFileSync(path.join(root, "destination", "skill.md")), unknownBytes);
  });
});

test("rollback dry-run is non-mutating and confirmed rollback restores replacements and removes creates", async () => {
  await fixture(async (root) => {
    writeFileSync(path.join(root, "source", "created.md"), "created", "utf8");
    const planPath = writePlan(root, [replaceEntry(), createEntry("source/created.md", "destination/created.md", "created")]);
    assert.equal((await run(["--plan", planPath, "--confirm-write"])).code, 0);
    const dry = await run(["--plan", planPath, "--rollback"]);
    assert.equal(dry.code, 0, dry.stderr);
    assert.deepEqual(evidence(dry).entries.map((entry) => entry.rollbackAction), ["restore-backup", "remove-created"]);
    assert.deepEqual(readFileSync(path.join(root, "destination", "skill.md")), BINARY);
    assert.equal(existsSync(path.join(root, "destination", "created.md")), true);
    const rollback = await run(["--plan", planPath, "--rollback", "--confirm-write"]);
    assert.equal(rollback.code, 0, rollback.stderr);
    assert.equal(evidence(rollback).status, "rolled-back");
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(existsSync(path.join(root, "destination", "created.md")), false);
  });
});

test("rollback lock-acquisition failure leaves the journal byte-for-byte unchanged", async () => {
  await fixture(async (root) => {
    const planPath = writePlan(root, [replaceEntry()]);
    const apply = await run(["--plan", planPath, "--confirm-write"]);
    assert.equal(apply.code, 0, apply.stderr);
    const applyReport = evidence(apply);
    const journalBefore = readFileSync(applyReport.journal);
    const rollback = await run(["--plan", planPath, "--rollback", "--confirm-write"], "rollback-lock-collision");
    assert.notEqual(rollback.code, 0);
    assert.match(rollback.stderr, /reconciliation lock is already held/);
    assert.deepEqual(readFileSync(applyReport.journal), journalBefore);
    assert.deepEqual(readFileSync(path.join(root, "destination", "skill.md")), BINARY);
    assert.equal(readFileSync(applyReport.locks[0], "utf8"), "deterministic competing owner");
  });
});

test("rollback preserves later edits by rejecting the whole rollback before writes", async () => {
  await fixture(async (root) => {
    writeFileSync(path.join(root, "source", "second.md"), "after second", "utf8");
    writeFileSync(path.join(root, "destination", "second.md"), "before second", "utf8");
    const planPath = writePlan(root, [replaceEntry(), replaceEntry("source/second.md", "destination/second.md", "before second", "after second")]);
    assert.equal((await run(["--plan", planPath, "--confirm-write"])).code, 0);
    writeFileSync(path.join(root, "destination", "second.md"), "later owner edit", "utf8");
    const rollback = await run(["--plan", planPath, "--rollback", "--confirm-write"]);
    assert.notEqual(rollback.code, 0);
    assert.match(rollback.stderr, /Rollback refuses later edit/);
    assert.deepEqual(readFileSync(path.join(root, "destination", "skill.md")), BINARY);
    assert.equal(readFileSync(path.join(root, "destination", "second.md"), "utf8"), "later owner edit");
  });
});

test("rollback interprets an interrupted write-started entry from hashes", async () => {
  await fixture(async (root) => {
    writeFileSync(path.join(root, "source", "second.md"), "after second", "utf8");
    writeFileSync(path.join(root, "destination", "second.md"), "before second", "utf8");
    const planPath = writePlan(root, [replaceEntry(), replaceEntry("source/second.md", "destination/second.md", "before second", "after second")]);
    const apply = await run(["--plan", planPath, "--confirm-write"], "fail-before-write:2");
    assert.notEqual(apply.code, 0);
    assert.equal(evidence(apply).entries[1].status, "write-started");
    const rollback = await run(["--plan", planPath, "--rollback", "--confirm-write"]);
    assert.equal(rollback.code, 0, rollback.stderr);
    assert.equal(readFileSync(path.join(root, "destination", "skill.md"), "utf8"), "before");
    assert.equal(readFileSync(path.join(root, "destination", "second.md"), "utf8"), "before second");
  });
});

test("disposable rehearsal remaps the immutable reviewed 33-record topology fixture", async () => {
  await fixture(async (root) => {
    rmSync(path.join(root, "source"), { recursive: true });
    rmSync(path.join(root, "destination"), { recursive: true });
    mkdirSync(path.join(root, "source"));
    mkdirSync(path.join(root, "destination"));
    const fixtureBytes = readFileSync(RECOVERY_FIXTURE);
    assert.equal(hash(fixtureBytes), RECOVERY_FIXTURE_SHA256);
    const recovery = JSON.parse(fixtureBytes.toString("utf8"));
    assert.equal(recovery.schemaVersion, 1);
    assert.equal(recovery.provenance.sourceArtifact, "codex-rollout-recovery-rehearsal.json");
    assert.equal(recovery.provenance.sourceSha256, "07f9178ab730e71fc52568fff2c58c69e9cdefb54ed13477064c88fbffd116e7");
    assert.equal(recovery.existingRecords.length, recovery.provenance.existingRecordCount);
    assert.equal(recovery.createdRecords.length, recovery.provenance.createdRecordCount);
    const uniqueHistorical = [...new Map(recovery.existingRecords.map((record) => [record.destinationId, record])).values()];
    assert.equal(uniqueHistorical.length, recovery.provenance.uniqueDestinationCount);
    const entries = [];
    const remappedDestinations = new Map();
    for (let index = 0; index < uniqueHistorical.length; index += 1) {
      const record = uniqueHistorical[index];
      assert.match(record.expectedBeforeSha256, /^[a-f0-9]{64}$/);
      const name = `${record.destinationId}.md`;
      const before = `before-image:${record.expectedBeforeSha256}`;
      const after = `candidate:${record.plan}:${record.destinationId}`;
      writeFileSync(path.join(root, "source", name), after, "utf8");
      writeFileSync(path.join(root, "destination", name), before, "utf8");
      entries.push(replaceEntry(`source/${name}`, `destination/${name}`, before, after));
      remappedDestinations.set(record.destinationId, `destination/${name}`);
    }
    const remappedRecords = recovery.existingRecords.map((record) => ({
      plan: record.plan,
      destinationId: record.destinationId,
      destination: remappedDestinations.get(record.destinationId),
      expectedBeforeSha256: record.expectedBeforeSha256
    }));
    assert.equal(remappedRecords.length, recovery.provenance.existingRecordCount);
    assert.equal(new Set(remappedRecords.map((record) => record.destination)).size, recovery.provenance.uniqueDestinationCount);
    for (let index = 0; index < recovery.createdRecords.length; index += 1) {
      const record = recovery.createdRecords[index];
      assert.match(record.sha256, /^[a-f0-9]{64}$/);
      const name = `${record.templateId}.md`;
      const content = `created-template:${record.templateId}:${record.sha256}`;
      writeFileSync(path.join(root, "source", name), content, "utf8");
      entries.push(createEntry(`source/${name}`, `destination/${name}`, content));
    }
    const sentinel = path.join(root, "destination", "SENTINEL.keep");
    writeFileSync(sentinel, "preserve-me", "utf8");
    const planPath = writePlan(root, entries);
    const apply = await run(["--plan", planPath, "--confirm-write"]);
    assert.equal(apply.code, 0, apply.stderr);
    assert.equal(evidence(apply).entries.length, 27);
    assert.equal(readFileSync(sentinel, "utf8"), "preserve-me");
    const rollback = await run(["--plan", planPath, "--rollback", "--confirm-write"]);
    assert.equal(rollback.code, 0, rollback.stderr);
    for (let index = 0; index < uniqueHistorical.length; index += 1) {
      const record = uniqueHistorical[index];
      assert.equal(readFileSync(path.join(root, "destination", `${record.destinationId}.md`), "utf8"), `before-image:${record.expectedBeforeSha256}`);
    }
    for (const record of recovery.createdRecords) {
      assert.equal(existsSync(path.join(root, "destination", `${record.templateId}.md`)), false);
    }
    assert.equal(readFileSync(sentinel, "utf8"), "preserve-me");
  });
});
