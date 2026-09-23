#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

const JOURNAL_NAME = "reconciliation-journal.json";
const JOURNAL_VERSION = 2;

class ReportedError extends Error {
  constructor(message, report) {
    super(message);
    this.report = report;
  }
}

function fail(message) {
  throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pathKey(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function resolvePlanPath(value, planDirectory, label) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) {
    fail(`${label} must be a non-empty path string`);
  }
  const resolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(planDirectory, value);
  if (!path.isAbsolute(value) && !isWithin(planDirectory, resolved)) {
    fail(`${label} escapes the plan directory: ${value}`);
  }
  return resolved;
}

function assertNoSymlinkComponents(targetPath, label, includeLeaf = true) {
  const resolved = path.resolve(targetPath);
  const parsed = path.parse(resolved);
  const components = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  const limit = includeLeaf ? components.length : Math.max(components.length - 1, 0);
  for (let index = 0; index < limit; index += 1) {
    current = path.join(current, components[index]);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) fail(`${label} traverses a symbolic link: ${current}`);
  }
}

function requireRegularFile(filePath, label) {
  assertNoSymlinkComponents(filePath, label);
  if (!existsSync(filePath)) fail(`${label} does not exist: ${filePath}`);
  const stat = lstatSync(filePath);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular file: ${filePath}`);
}

function requireSingleLinkFile(filePath, label) {
  requireRegularFile(filePath, label);
  const stat = statSync(filePath);
  if (stat.nlink !== 1) {
    fail(`${label} must have exactly one hard link; found ${stat.nlink}: ${filePath}`);
  }
}

function requireRealParent(filePath, label) {
  const parent = path.dirname(filePath);
  assertNoSymlinkComponents(parent, `${label} parent`);
  if (!existsSync(parent) || !lstatSync(parent).isDirectory()) {
    fail(`${label} parent must be an existing real directory: ${parent}`);
  }
}

function requireDigest(value, label) {
  if (!/^[a-f0-9]{64}$/i.test(value ?? "")) fail(`${label} must be a SHA-256 hex digest`);
  return value.toLowerCase();
}

function helpText() {
  return `Usage:
  reconcile-runtime-installations.mjs --plan <plan-v2.json> [--dry-run]
  reconcile-runtime-installations.mjs --plan <plan-v2.json> --confirm-write
  reconcile-runtime-installations.mjs --plan <plan-v2.json> --rollback [--confirm-write]

Version 2 plans require expectedSourceSha256 for every entry. Replace entries also
require expectedBeforeSha256; create entries are guarded by operation: "create".

The default is a non-mutating dry-run. --rollback is also a dry-run unless paired
with --confirm-write. Rollback uses verified backups and the persisted journal,
accepts only exact planned before/after hashes, and preserves unknown mismatch bytes
for inspection instead of restoring or deleting them.

Guarantees are bounded to hashes observed during each check. Locks are cooperative
with this utility only and coordinate exact destination ownership plus a shared
backup workspace. Filesystem writes are not a cross-filesystem transaction.
Keep the backup directory and journal until rollback is no longer required.
`;
}

function parseArguments(argv) {
  let planPath;
  let confirmWrite = false;
  let rollback = false;
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--confirm-write") confirmWrite = true;
    else if (argument === "--dry-run") { /* explicit safe default */ }
    else if (argument === "--rollback") rollback = true;
    else if (argument === "--help" || argument === "-h") help = true;
    else if (argument === "--plan") {
      if (index + 1 >= argv.length) fail("--plan requires a path");
      planPath = argv[index + 1];
      index += 1;
    } else fail(`Unknown argument: ${argument}`);
  }
  if (help) return { help: true };
  if (!planPath) fail("A version 2 plan is required. Use --help for usage.");
  return { confirmWrite, rollback, planPath: path.resolve(planPath) };
}

function destinationLockPath(destination) {
  const ownershipHash = sha256(Buffer.from(pathKey(destination), "utf8")).slice(0, 24);
  return path.join(path.dirname(destination), `.reconcile-runtime-${ownershipHash}.lock`);
}

function backupWorkspaceLockPath(backupDirectory) {
  const workspaceHash = sha256(Buffer.from(pathKey(backupDirectory), "utf8")).slice(0, 24);
  return path.join(path.dirname(backupDirectory), `.reconcile-runtime-backup-${workspaceHash}.lock`);
}

function validateNoOverlaps(planPath, backupDirectory, lockPaths, entries) {
  const reserved = [
    { path: planPath, label: "plan" },
    { path: path.join(backupDirectory, JOURNAL_NAME), label: "journal" },
    ...lockPaths.map((lockPath) => ({ path: lockPath, label: "destination lock" }))
  ];
  const destinations = new Map();
  for (const entry of entries) {
    const destinationKey = pathKey(entry.destination);
    if (destinations.has(destinationKey)) fail(`Duplicate destination: ${entry.destination}`);
    destinations.set(destinationKey, entry.destination);
    if (pathKey(entry.source) === destinationKey) fail(`Source and destination overlap: ${entry.source}`);
    if (isWithin(backupDirectory, entry.source) || isWithin(backupDirectory, entry.destination)) {
      fail(`Source or destination overlaps the backup directory: ${entry.destination}`);
    }
    for (const item of reserved) {
      if (pathKey(entry.source) === pathKey(item.path) || destinationKey === pathKey(item.path)) {
        fail(`Entry path overlaps the reserved ${item.label} path: ${item.path}`);
      }
    }
  }
  const sourceKeys = new Set(entries.map((entry) => pathKey(entry.source)));
  for (const destination of destinations.values()) {
    if (sourceKeys.has(pathKey(destination))) fail(`A destination is also used as a source: ${destination}`);
  }
}

function loadPlan(planPath) {
  requireRegularFile(planPath, "Plan");
  const planBytes = readFileSync(planPath);
  let raw;
  try {
    raw = JSON.parse(planBytes.toString("utf8"));
  } catch (error) {
    fail(`Plan is not valid JSON: ${error.message}`);
  }
  if (raw?.version !== 2) {
    fail(`Plan version ${JSON.stringify(raw?.version)} is unsupported; version 2 is required and version 1 writes are rejected`);
  }
  if (!Array.isArray(raw.entries) || raw.entries.length === 0) fail("Plan must have a non-empty entries array");
  const planDirectory = path.dirname(planPath);
  const backupDirectory = resolvePlanPath(raw.backupDirectory, planDirectory, "backupDirectory");
  assertNoSymlinkComponents(backupDirectory, "backupDirectory", false);
  const entries = raw.entries.map((entry, index) => {
    const label = `entries[${index}]`;
    const operation = entry?.operation;
    if (operation !== "replace" && operation !== "create") fail(`${label}.operation must be "replace" or "create"`);
    const source = resolvePlanPath(entry.source, planDirectory, `${label}.source`);
    const destination = resolvePlanPath(entry.destination, planDirectory, `${label}.destination`);
    const expectedSourceSha256 = requireDigest(entry.expectedSourceSha256, `${label}.expectedSourceSha256`);
    let expectedBeforeSha256 = null;
    if (operation === "replace") expectedBeforeSha256 = requireDigest(entry.expectedBeforeSha256, `${label}.expectedBeforeSha256`);
    else if (entry.expectedBeforeSha256 !== undefined && entry.expectedBeforeSha256 !== null) {
      fail(`${label}.expectedBeforeSha256 must be omitted for create entries`);
    }
    return { index, operation, source, destination, expectedSourceSha256, expectedBeforeSha256 };
  });
  const destinationLockPaths = [...new Set(entries.map((entry) => destinationLockPath(entry.destination)))];
  const backupLockPath = backupWorkspaceLockPath(backupDirectory);
  const lockPaths = [...new Set([...destinationLockPaths, backupLockPath])].sort((left, right) => pathKey(left).localeCompare(pathKey(right)));
  for (const lockPath of lockPaths) assertNoSymlinkComponents(lockPath, "destination lock", false);
  validateNoOverlaps(planPath, backupDirectory, lockPaths, entries);
  return { backupDirectory, backupLockPath, destinationLockPaths, entries, lockPaths, planPath, planSha256: sha256(planBytes) };
}

function ensureNoHardLinkOverlap(entries) {
  const identities = new Map();
  for (const entry of entries) {
    for (const [role, filePath] of [["source", entry.source], ["destination", entry.destination]]) {
      if (!existsSync(filePath)) continue;
      const stat = statSync(filePath);
      const identity = `${stat.dev}:${stat.ino}`;
      const prior = identities.get(identity);
      if (prior && pathKey(prior.path) !== pathKey(filePath)) {
        fail(`Hard-link overlap between ${prior.role} ${prior.path} and ${role} ${filePath}`);
      }
      identities.set(identity, { role, path: filePath });
    }
  }
}

function inspectDestination(entry, label) {
  requireRealParent(entry.destination, label);
  if (entry.operation === "create") {
    if (existsSync(entry.destination)) fail(`Create-only destination already exists: ${entry.destination}`);
    return { bytes: null, sha256: null };
  }
  requireSingleLinkFile(entry.destination, label);
  const bytes = readFileSync(entry.destination);
  return { bytes, sha256: sha256(bytes) };
}

function plannedBackup(plan, entry) {
  return entry.operation === "replace"
    ? path.join(plan.backupDirectory, `${String(entry.index + 1).padStart(3, "0")}-${path.basename(entry.destination)}`)
    : null;
}

function preflightApply(plan) {
  for (const lockPath of plan.lockPaths) {
    if (existsSync(lockPath)) fail(`Cooperative reconciliation lock is already held: ${lockPath}`);
  }
  if (existsSync(plan.backupDirectory)) {
    const stat = lstatSync(plan.backupDirectory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || readdirSync(plan.backupDirectory).length !== 0) {
      fail(`Backup directory must not exist or must be an empty real directory: ${plan.backupDirectory}`);
    }
  }
  const prepared = plan.entries.map((entry) => {
    requireRegularFile(entry.source, `Source ${entry.index}`);
    const candidateBytes = readFileSync(entry.source);
    const sourceSha256 = sha256(candidateBytes);
    if (sourceSha256 !== entry.expectedSourceSha256) {
      fail(`Source hash mismatch: ${entry.source}; expected ${entry.expectedSourceSha256}, found ${sourceSha256}`);
    }
    const before = inspectDestination(entry, `Destination ${entry.index}`);
    if (entry.operation === "replace" && before.sha256 !== entry.expectedBeforeSha256) {
      fail(`Destination preimage hash mismatch: ${entry.destination}; expected ${entry.expectedBeforeSha256}, found ${before.sha256}`);
    }
    return { ...entry, candidateBytes, beforeBytes: before.bytes, beforeSha256: before.sha256,
      afterSha256: sourceSha256, backup: plannedBackup(plan, entry) };
  });
  ensureNoHardLinkOverlap(prepared);
  return prepared;
}

function acquireLock(lockPath, action) {
  requireRealParent(lockPath, "Lock");
  const token = randomUUID();
  let descriptor;
  try {
    descriptor = openSync(lockPath, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify({ version: 1, token, pid: process.pid, action, createdAt: new Date().toISOString() })}\n`);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (error?.code === "EEXIST") fail(`Cooperative reconciliation lock is already held: ${lockPath}`);
    throw error;
  }
  closeSync(descriptor);
  return { lockPath, token };
}

function acquireLocks(lockPaths, action) {
  const locks = [];
  try {
    for (const lockPath of lockPaths) locks.push(acquireLock(lockPath, action));
    return locks;
  } catch (error) {
    for (const lock of [...locks].reverse()) releaseLock(lock);
    throw error;
  }
}

function releaseLock(lock) {
  if (!lock || !existsSync(lock.lockPath)) return;
  try {
    const current = JSON.parse(readFileSync(lock.lockPath, "utf8"));
    if (current.token === lock.token) unlinkSync(lock.lockPath);
  } catch {
    // Never remove a lock that cannot be proven to be ours.
  }
}

function releaseLocks(locks) {
  for (const lock of [...(locks ?? [])].reverse()) releaseLock(lock);
}

function writeJournal(journalPath, journal, createOnly = false) {
  if (createOnly) {
    writeFileSync(journalPath, `${JSON.stringify(journal, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
    return;
  }
  const temporary = `${journalPath}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(journal, null, 2)}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 });
  renameSync(temporary, journalPath);
}

function testPlanFault(stage, plan, entries = []) {
  if (process.env.NODE_ENV !== "test" || process.env.RECONCILE_RUNTIME_TEST_FAULT !== stage) return;
  if (stage === "backup-collision-after-lock") {
    if (!existsSync(plan.backupDirectory)) mkdirSync(plan.backupDirectory, { recursive: false });
    const collision = entries.find((entry) => entry.backup)?.backup ?? path.join(plan.backupDirectory, "unexpected-collision");
    writeFileSync(collision, "deterministic backup collision", { flag: "wx" });
  } else if (stage === "rollback-lock-collision") {
    writeFileSync(plan.lockPaths[0], "deterministic competing owner", { flag: "wx" });
  } else if (stage === "journal-collision-before-create") {
    writeFileSync(path.join(plan.backupDirectory, JOURNAL_NAME), "deterministic competing journal\n", { flag: "wx" });
  }
}

function testFault(stage, entry) {
  if (process.env.NODE_ENV !== "test") return;
  const fault = process.env.RECONCILE_RUNTIME_TEST_FAULT;
  if (!fault) return;
  const [wantedStage, wantedIndex] = fault.split(":");
  if (wantedStage !== stage || Number(wantedIndex) !== entry.index + 1) return;
  if (stage === "stale-destination") {
    writeFileSync(entry.destination, "deterministic external edit", "utf8");
    return;
  }
  if (stage === "corrupt-after-write") {
    writeFileSync(entry.destination, "deterministic read-back corruption", "utf8");
    return;
  }
  fail(`Injected deterministic test failure at ${stage} for entry ${entry.index + 1}`);
}

function recheckBufferedSources(entries) {
  for (const entry of entries) {
    requireRegularFile(entry.source, `Source ${entry.index} recheck`);
    const currentSha256 = sha256(readFileSync(entry.source));
    if (currentSha256 !== entry.expectedSourceSha256) {
      fail(`Source changed after preflight: ${entry.source}; expected ${entry.expectedSourceSha256}, found ${currentSha256}`);
    }
  }
}

function recheckDestinationBeforeWrite(entry) {
  const current = inspectDestination(entry, `Destination ${entry.index} pre-write recheck`);
  if (entry.operation === "replace" && current.sha256 !== entry.beforeSha256) {
    fail(`Destination changed after backup: ${entry.destination}; expected ${entry.beforeSha256}, found ${current.sha256}`);
  }
}

function publicEntry(entry, status = "validated") {
  return { index: entry.index + 1, operation: entry.operation, source: entry.source, destination: entry.destination,
    backup: entry.backup, beforeSha256: entry.beforeSha256, afterSha256: entry.afterSha256, status };
}

function baseReport(plan, action, mode, entries) {
  return { schemaVersion: 2, action, mode, status: mode === "dry-run" ? "validated" : "in-progress",
    plan: plan.planPath, planSha256: plan.planSha256, backupDirectory: plan.backupDirectory,
    journal: path.join(plan.backupDirectory, JOURNAL_NAME), locks: plan.lockPaths,
    destinationLocks: plan.destinationLockPaths, backupWorkspaceLock: plan.backupLockPath, manifestMutation: false,
    entries: entries.map((entry) => publicEntry(entry)) };
}

function journalFrom(plan, entries) {
  return { version: JOURNAL_VERSION, plan: plan.planPath, planSha256: plan.planSha256,
    backupDirectory: plan.backupDirectory, status: "preparing", createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), entries: entries.map((entry) => ({ index: entry.index + 1,
      operation: entry.operation, source: entry.source, destination: entry.destination, backup: entry.backup,
      beforeSha256: entry.beforeSha256, afterSha256: entry.afterSha256, status: "pending" })) };
}

function persistJournal(journalPath, journal, createOnly = false) {
  journal.updatedAt = new Date().toISOString();
  writeJournal(journalPath, journal, createOnly);
}

function establishBackupWorkspaceUnderLock(plan, entries) {
  if (existsSync(plan.backupDirectory)) {
    const stat = lstatSync(plan.backupDirectory);
    if (stat.isSymbolicLink() || !stat.isDirectory() || readdirSync(plan.backupDirectory).length !== 0) {
      fail(`Backup directory collision after lock acquisition: ${plan.backupDirectory}`);
    }
  } else {
    mkdirSync(plan.backupDirectory, { recursive: false });
  }
  assertNoSymlinkComponents(plan.backupDirectory, "backupDirectory under lock");
  const journalPath = path.join(plan.backupDirectory, JOURNAL_NAME);
  if (existsSync(journalPath)) fail(`Journal collision after lock acquisition: ${journalPath}`);
  for (const entry of entries) {
    if (entry.backup && existsSync(entry.backup)) fail(`Backup collision after lock acquisition: ${entry.backup}`);
  }
  if (readdirSync(plan.backupDirectory).length !== 0) {
    fail(`Backup directory changed after lock acquisition: ${plan.backupDirectory}`);
  }
}

function executeApply(plan, entries) {
  const report = baseReport(plan, "apply", "write", entries);
  const journalPath = report.journal;
  let locks;
  let journal;
  let journalOwned = false;
  try {
    locks = acquireLocks(plan.lockPaths, "apply");
    recheckBufferedSources(entries);
    testPlanFault("backup-collision-after-lock", plan, entries);
    establishBackupWorkspaceUnderLock(plan, entries);
    journal = journalFrom(plan, entries);
    testPlanFault("journal-collision-before-create", plan, entries);
    persistJournal(journalPath, journal, true);
    journalOwned = true;
    for (const entry of entries) {
      const journalEntry = journal.entries[entry.index];
      if (entry.operation === "replace") {
        const current = inspectDestination(entry, `Destination ${entry.index} backup recheck`);
        if (current.sha256 !== entry.beforeSha256) {
          fail(`Destination changed before backup: ${entry.destination}; expected ${entry.beforeSha256}, found ${current.sha256}`);
        }
        writeFileSync(entry.backup, current.bytes, { flag: "wx", mode: 0o600 });
        requireRegularFile(entry.backup, `Backup ${entry.index}`);
        const backupSha256 = sha256(readFileSync(entry.backup));
        if (backupSha256 !== entry.beforeSha256) fail(`Backup verification failed: ${entry.backup}`);
        journalEntry.backupSha256 = backupSha256;
        journalEntry.status = "backed-up";
      } else journalEntry.status = "create-guarded";
      persistJournal(journalPath, journal);
    }
    journal.status = "writing";
    persistJournal(journalPath, journal);
    for (const entry of entries) {
      const journalEntry = journal.entries[entry.index];
      testFault("stale-destination", entry);
      recheckDestinationBeforeWrite(entry);
      journalEntry.status = "write-started";
      persistJournal(journalPath, journal);
      testFault("fail-before-write", entry);
      writeFileSync(entry.destination, entry.candidateBytes, { flag: entry.operation === "create" ? "wx" : "w" });
      testFault("corrupt-after-write", entry);
      requireSingleLinkFile(entry.destination, `Destination ${entry.index} read-back`);
      const readBackSha256 = sha256(readFileSync(entry.destination));
      if (readBackSha256 !== entry.afterSha256) {
        journalEntry.status = "verification-failed";
        journalEntry.observedSha256 = readBackSha256;
        persistJournal(journalPath, journal);
        fail(`Destination read-back verification failed: ${entry.destination}; expected ${entry.afterSha256}, found ${readBackSha256}`);
      }
      journalEntry.status = "written-and-verified";
      report.entries[entry.index].status = "written-and-verified";
      persistJournal(journalPath, journal);
      testFault("fail-after-write", entry);
    }
    journal.status = "applied";
    persistJournal(journalPath, journal);
    report.status = "applied";
    return report;
  } catch (error) {
    report.status = "partial-failure";
    report.error = error.message;
    if (journalOwned) {
      for (const item of journal.entries) report.entries[item.index - 1].status = item.status;
      journal.status = "partial-failure";
      journal.error = error.message;
      try { persistJournal(journalPath, journal); }
      catch (journalError) { report.journalError = journalError.message; }
    }
    throw new ReportedError(error.message, report);
  } finally {
    releaseLocks(locks);
  }
}

function loadJournal(plan) {
  const journalPath = path.join(plan.backupDirectory, JOURNAL_NAME);
  requireRegularFile(journalPath, "Journal");
  let journal;
  try { journal = JSON.parse(readFileSync(journalPath, "utf8")); }
  catch (error) { fail(`Journal is not valid JSON: ${error.message}`); }
  if (journal?.version !== JOURNAL_VERSION || !Array.isArray(journal.entries)) {
    fail(`Journal must have version ${JOURNAL_VERSION} and an entries array`);
  }
  if (journal.planSha256 !== plan.planSha256) fail("Journal plan hash does not match the supplied plan");
  if (pathKey(journal.backupDirectory) !== pathKey(plan.backupDirectory)) fail("Journal backup directory does not match the plan");
  if (journal.entries.length !== plan.entries.length) fail("Journal entry count does not match the plan");
  return { journal, journalPath };
}

function prepareRollback(plan) {
  for (const lockPath of plan.lockPaths) {
    if (existsSync(lockPath)) fail(`Cooperative reconciliation lock is already held: ${lockPath}`);
  }
  const { journal, journalPath } = loadJournal(plan);
  const entries = journal.entries.map((record, index) => {
    const planned = plan.entries[index];
    if (record.index !== index + 1 || record.operation !== planned.operation || pathKey(record.source) !== pathKey(planned.source) ||
        pathKey(record.destination) !== pathKey(planned.destination) || record.afterSha256 !== planned.expectedSourceSha256 ||
        record.beforeSha256 !== planned.expectedBeforeSha256) fail(`Journal entry ${index + 1} does not match the supplied plan`);
    const entry = { ...planned, ...record, index };
    let rollbackAction;
    if (entry.operation === "replace") {
      requireRegularFile(entry.backup, `Backup ${index}`);
      const backupBytes = readFileSync(entry.backup);
      const backupSha256 = sha256(backupBytes);
      if (backupSha256 !== entry.beforeSha256 || record.backupSha256 !== entry.beforeSha256) fail(`Backup hash mismatch: ${entry.backup}`);
      requireSingleLinkFile(entry.destination, `Rollback destination ${index}`);
      const currentSha256 = sha256(readFileSync(entry.destination));
      if (currentSha256 === entry.afterSha256) rollbackAction = "restore-backup";
      else if (currentSha256 === entry.beforeSha256) rollbackAction = "already-restored";
      else fail(`Rollback refuses later edit at ${entry.destination}; found ${currentSha256}`);
      entry.backupBytes = backupBytes;
      entry.currentSha256 = currentSha256;
    } else {
      requireRealParent(entry.destination, `Rollback destination ${index}`);
      if (!existsSync(entry.destination)) { rollbackAction = "already-absent"; entry.currentSha256 = null; }
      else {
        requireSingleLinkFile(entry.destination, `Rollback destination ${index}`);
        const currentSha256 = sha256(readFileSync(entry.destination));
        if (currentSha256 !== entry.afterSha256) {
          fail(`Rollback refuses later edit at ${entry.destination}; found ${currentSha256}`);
        }
        rollbackAction = "remove-created";
        entry.currentSha256 = currentSha256;
      }
    }
    entry.rollbackAction = rollbackAction;
    return entry;
  });
  ensureNoHardLinkOverlap(entries);
  return { entries, journal, journalPath };
}

function rollbackReport(plan, mode, prepared) {
  return { schemaVersion: 2, action: "rollback", mode, status: mode === "dry-run" ? "validated" : "in-progress",
    plan: plan.planPath, planSha256: plan.planSha256, backupDirectory: plan.backupDirectory,
    journal: prepared.journalPath, locks: plan.lockPaths,
    destinationLocks: plan.destinationLockPaths, backupWorkspaceLock: plan.backupLockPath, manifestMutation: false,
    entries: prepared.entries.map((entry) => ({ index: entry.index + 1, operation: entry.operation,
      destination: entry.destination, backup: entry.backup, beforeSha256: entry.beforeSha256,
      afterSha256: entry.afterSha256, currentSha256: entry.currentSha256,
      rollbackAction: entry.rollbackAction, status: mode === "dry-run" ? "validated" : "pending" })) };
}

function executeRollback(plan, prepared) {
  const report = rollbackReport(plan, "write", prepared);
  const { entries, journal, journalPath } = prepared;
  let locks;
  try {
    testPlanFault("rollback-lock-collision", plan);
    locks = acquireLocks(plan.lockPaths, "rollback");
    journal.status = "rolling-back";
    persistJournal(journalPath, journal);
    for (const entry of [...entries].reverse()) {
      const reportEntry = report.entries[entry.index];
      const journalEntry = journal.entries[entry.index];
      journalEntry.rollbackStatus = "rollback-started";
      persistJournal(journalPath, journal);
      if (entry.rollbackAction === "restore-backup") {
        requireSingleLinkFile(entry.destination, `Rollback destination ${entry.index} recheck`);
        const currentSha256 = sha256(readFileSync(entry.destination));
        if (currentSha256 !== entry.currentSha256) fail(`Rollback destination changed after preflight: ${entry.destination}`);
        writeFileSync(entry.destination, entry.backupBytes, { flag: "w" });
        const restoredSha256 = sha256(readFileSync(entry.destination));
        if (restoredSha256 !== entry.beforeSha256) fail(`Rollback read-back verification failed: ${entry.destination}`);
      } else if (entry.rollbackAction === "remove-created") {
        requireSingleLinkFile(entry.destination, `Rollback destination ${entry.index} recheck`);
        const currentSha256 = sha256(readFileSync(entry.destination));
        if (currentSha256 !== entry.currentSha256) fail(`Rollback destination changed after preflight: ${entry.destination}`);
        unlinkSync(entry.destination);
        if (existsSync(entry.destination)) fail(`Rollback failed to remove created destination: ${entry.destination}`);
      }
      journalEntry.rollbackStatus = "rolled-back";
      reportEntry.status = "rolled-back";
      persistJournal(journalPath, journal);
    }
    journal.status = "rolled-back";
    persistJournal(journalPath, journal);
    report.status = "rolled-back";
    return report;
  } catch (error) {
    report.status = "partial-failure";
    report.error = error.message;
    if (!locks) throw new ReportedError(error.message, report);
    for (const item of journal.entries) report.entries[item.index - 1].status = item.rollbackStatus ?? report.entries[item.index - 1].status;
    journal.status = "rollback-partial-failure";
    journal.rollbackError = error.message;
    try { persistJournal(journalPath, journal); }
    catch (journalError) { report.journalError = journalError.message; }
    throw new ReportedError(error.message, report);
  } finally {
    releaseLocks(locks);
  }
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) { process.stdout.write(helpText()); return; }
  const plan = loadPlan(options.planPath);
  let report;
  if (options.rollback) {
    const prepared = prepareRollback(plan);
    report = options.confirmWrite ? executeRollback(plan, prepared) : rollbackReport(plan, "dry-run", prepared);
  } else {
    const entries = preflightApply(plan);
    report = options.confirmWrite ? executeApply(plan, entries) : baseReport(plan, "apply", "dry-run", entries);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try { main(); }
catch (error) {
  if (error instanceof ReportedError) process.stdout.write(`${JSON.stringify(error.report, null, 2)}\n`);
  process.stderr.write(`reconcile-runtime-installations: ${error.message}\n`);
  process.exitCode = 1;
}
