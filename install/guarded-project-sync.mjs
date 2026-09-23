#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  closeSync,
  existsSync,
  fstatSync,
  fsyncSync,
  ftruncateSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const INSTALL_ROOT = path.dirname(fileURLToPath(import.meta.url));
const TOOLKIT_ROOT = path.resolve(INSTALL_ROOT, "..");
const EXPORTER = path.join(INSTALL_ROOT, "project-sync-core.mjs");
const JOURNAL_NAME = "guarded-project-sync-journal.json";
const JOURNAL_VERSION = 1;
const MAX_EXPORT_BYTES = 64 * 1024 * 1024;
const GENERATED_DESTINATIONS = Object.freeze({
  projectMap: "context/project-map.json",
  config: ".ai-toolkit.config.json",
  version: ".ai-toolkit-version",
  manifest: ".ai-toolkit-manifest.json"
});

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

function requireDigest(value, label) {
  if (!/^[a-f0-9]{64}$/i.test(value ?? "")) fail(`${label} must be a SHA-256 digest`);
  return value.toLowerCase();
}

function pathKey(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function toSlash(value) {
  return value.split(path.sep).join("/");
}

function requirePath(value, label) {
  if (typeof value !== "string" || value.trim() !== value || value.length === 0) fail(`${label} must be a non-empty path`);
  return path.resolve(value);
}

function assertNoSymlinkComponents(targetPath, label, includeLeaf = true) {
  const resolved = path.resolve(targetPath);
  const parsed = path.parse(resolved);
  const parts = resolved.slice(parsed.root.length).split(path.sep).filter(Boolean);
  let current = parsed.root;
  const limit = includeLeaf ? parts.length : Math.max(parts.length - 1, 0);
  for (let index = 0; index < limit; index += 1) {
    current = path.join(current, parts[index]);
    if (!existsSync(current)) break;
    if (lstatSync(current).isSymbolicLink()) fail(`${label} traverses a symbolic link: ${current}`);
  }
}

function requireRealDirectory(directory, label) {
  assertNoSymlinkComponents(directory, label);
  if (!existsSync(directory)) fail(`${label} does not exist: ${directory}`);
  const stat = lstatSync(directory);
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail(`${label} must be a real directory: ${directory}`);
}

function requireSingleLinkFile(filePath, label) {
  assertNoSymlinkComponents(filePath, label);
  if (!existsSync(filePath)) fail(`${label} does not exist: ${filePath}`);
  const linkStat = lstatSync(filePath);
  if (linkStat.isSymbolicLink() || !linkStat.isFile()) fail(`${label} must be a regular file: ${filePath}`);
  const stat = statSync(filePath);
  if (stat.nlink !== 1) fail(`${label} must have exactly one hard link; found ${stat.nlink}: ${filePath}`);
  return stat;
}

function nearestExistingDirectory(candidate) {
  let current = path.resolve(candidate);
  while (!existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) fail(`No existing ancestor for path: ${candidate}`);
    current = parent;
  }
  requireRealDirectory(current, "Existing path ancestor");
  return current;
}

function helpText() {
  return `Guarded project sync for an explicitly authorized dirty target

Usage:
  node install/guarded-project-sync.mjs --target <project> --backup <empty-dir> [--command update] [--dry-run]
  node install/guarded-project-sync.mjs --target <project> --backup <new-or-empty-dir> --confirm-write
  node install/guarded-project-sync.mjs --target <project> --backup <existing-backup-dir> --rollback [--confirm-write]

Install exports may add --command install plus --agents, --profiles, --skills, or --config.
Update exports may use --config or explicit selections. The default mode is dry-run.

This command captures the existing project-sync export only in memory. It writes
candidate bytes only to managed destinations. The backup workspace contains verified
before-images and a sanitized journal; reports never contain candidate content.

Locks are cooperative with this command. Hash checks narrow filesystem races but do
not provide a cross-filesystem transaction or protection from non-cooperating writers.
`;
}

function parseArguments(argv) {
  const options = {
    command: "update",
    confirmWrite: false,
    dryRun: false,
    rollback: false,
    passthrough: []
  };
  const valueOptions = new Set(["--agents", "--profiles", "--skills", "--config", "--config-path"]);
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const nextValue = (label) => {
      if (index + 1 >= argv.length) fail(`${label} requires a value`);
      index += 1;
      return argv[index];
    };
    if (argument === "--help" || argument === "-h") options.help = true;
    else if (argument === "--confirm-write") options.confirmWrite = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--rollback") options.rollback = true;
    else if (argument === "--target" || argument === "--target-path") options.target = nextValue(argument);
    else if (argument === "--backup" || argument === "--backup-directory") options.backup = nextValue(argument);
    else if (argument === "--command") options.command = nextValue(argument);
    else if (valueOptions.has(argument)) options.passthrough.push(argument, nextValue(argument));
    else if (["--agents=", "--profiles=", "--skills=", "--config=", "--config-path="].some((prefix) => argument.startsWith(prefix))) {
      options.passthrough.push(argument);
    } else fail(`Unknown argument: ${argument}`);
  }
  if (options.help) return options;
  if (!options.target) fail("An explicit --target path is required");
  if (!options.backup) fail("An explicit --backup directory is required");
  if (options.confirmWrite && options.dryRun) fail("--confirm-write cannot be combined with --dry-run");
  if (options.command !== "install" && options.command !== "update") fail("--command must be install or update");
  if (options.rollback && options.passthrough.length > 0) fail("Selection and config options are not used during rollback");
  return options;
}

function validateRoots(options) {
  const target = requirePath(options.target, "Target");
  const backupDirectory = requirePath(options.backup, "Backup directory");
  requireRealDirectory(target, "Target");
  if (isWithin(TOOLKIT_ROOT, target) || isWithin(target, TOOLKIT_ROOT)) {
    fail("Target and toolkit checkout must be disjoint");
  }
  const backupParent = nearestExistingDirectory(path.dirname(backupDirectory));
  if (pathKey(backupParent) !== pathKey(path.dirname(backupDirectory))) {
    fail(`Backup directory parent must already exist: ${path.dirname(backupDirectory)}`);
  }
  assertNoSymlinkComponents(backupDirectory, "Backup directory", false);
  if (isWithin(target, backupDirectory) || isWithin(backupDirectory, target)) {
    fail("Backup directory and target must be disjoint");
  }
  if (isWithin(TOOLKIT_ROOT, backupDirectory) || isWithin(backupDirectory, TOOLKIT_ROOT)) {
    fail("Backup directory and toolkit checkout must be disjoint");
  }
  return { target, backupDirectory, managedRoot: path.join(target, ".ai-toolkit") };
}

function runExport(options, roots) {
  const args = [EXPORTER, options.command, "--target", roots.target, "--export-plan", ...options.passthrough];
  const result = spawnSync(process.execPath, args, {
    cwd: TOOLKIT_ROOT,
    encoding: "buffer",
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: MAX_EXPORT_BYTES,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (result.error) fail(`Project-sync export could not run (${result.error.code ?? "unknown error"})`);
  if (result.status !== 0) fail(`Project-sync export refused the target (exit code ${result.status ?? "unknown"})`);
  if (!Buffer.isBuffer(result.stdout) || result.stdout.length === 0) fail("Project-sync export returned no plan");
  let exported;
  try {
    exported = JSON.parse(result.stdout.toString("utf8"));
  } catch {
    fail("Project-sync export returned invalid JSON");
  }
  return exported;
}

function validateExportEnvelope(exported, options, roots) {
  if (exported?.exportType !== "project-sync-copy-plan" || exported?.schemaVersion !== "1.0.0") {
    fail("Unsupported project-sync export schema");
  }
  if (exported.command !== options.command || exported.mode !== "export-plan" || exported.writesTargetFiles !== false) {
    fail("Project-sync export mode contract mismatch");
  }
  if (pathKey(exported.targetPath ?? "") !== pathKey(roots.target)) fail("Project-sync export target mismatch");
  if (!Array.isArray(exported.projectMapIssues) || exported.projectMapIssues.length !== 0) {
    fail("Project-sync export contains rejected project-map issues");
  }
  if (!Array.isArray(exported.assets) || exported.assets.length === 0) fail("Project-sync export contains no assets");
  if (!exported.generatedCandidates || typeof exported.generatedCandidates !== "object") {
    fail("Project-sync export has no generated candidates");
  }
}

function normalizeRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || path.posix.isAbsolute(value)) {
    fail(`${label} must be a normalized relative path`);
  }
  const normalized = path.posix.normalize(value);
  if (normalized !== value || normalized === ".." || normalized.startsWith("../")) fail(`${label} escapes the managed root`);
  return normalized;
}

function expectedOperation(raw, label) {
  if (raw.operation !== "create" && raw.operation !== "replace") fail(`${label}.operation is invalid`);
  if (raw.destinationState !== (raw.operation === "create" ? "absent" : "present")) {
    fail(`${label} destination state does not match its operation`);
  }
  if (raw.operation === "create" && raw.destinationBeforeSha256 !== null) fail(`${label} create preimage must be absent`);
  if (raw.operation === "replace") requireDigest(raw.destinationBeforeSha256, `${label}.destinationBeforeSha256`);
  return raw.operation;
}

function candidateEntry(raw, index, relativePath, bytes, sourcePath = null) {
  const operation = expectedOperation(raw, `entry ${index + 1}`);
  const sourceSha256 = requireDigest(raw.sourceSha256, `entry ${index + 1}.sourceSha256`);
  if (sha256(bytes) !== sourceSha256) fail(`Buffered source hash mismatch for entry ${index + 1}`);
  return {
    index,
    operation,
    kind: sourcePath ? "asset" : "generated-json",
    relativePath,
    sourcePath,
    destination: path.resolve(raw.destinationPath),
    beforeSha256: operation === "replace" ? raw.destinationBeforeSha256.toLowerCase() : null,
    afterSha256: sourceSha256,
    candidateBytes: bytes,
    beforeBytes: null,
    backup: null,
    status: "validated"
  };
}

function materializeEntries(exported, roots) {
  const entries = [];
  for (const raw of exported.assets) {
    const relativePath = normalizeRelativePath(raw.relativePath, "Asset relativePath");
    const expectedDestination = path.join(roots.managedRoot, ...relativePath.split("/"));
    if (pathKey(raw.destinationPath ?? "") !== pathKey(expectedDestination)) fail(`Asset destination mismatch: ${relativePath}`);
    const sourcePath = requirePath(raw.sourcePath, "Asset sourcePath");
    if (!isWithin(TOOLKIT_ROOT, sourcePath)) fail(`Asset source is outside the toolkit checkout: ${relativePath}`);
    requireSingleLinkFile(sourcePath, `Asset source ${relativePath}`);
    const bytes = readFileSync(sourcePath);
    entries.push(candidateEntry(raw, entries.length, relativePath, bytes, sourcePath));
  }

  const generatedKeys = Object.keys(exported.generatedCandidates).sort();
  const expectedKeys = Object.keys(GENERATED_DESTINATIONS).sort();
  if (JSON.stringify(generatedKeys) !== JSON.stringify(expectedKeys)) fail("Generated candidate set mismatch");
  for (const key of Object.keys(GENERATED_DESTINATIONS)) {
    const raw = exported.generatedCandidates[key];
    const relativePath = GENERATED_DESTINATIONS[key];
    const expectedDestination = path.join(roots.managedRoot, ...relativePath.split("/"));
    if (raw?.sourcePath !== null || raw?.sourceKind !== "generated-json") fail(`Generated candidate ${key} source contract mismatch`);
    if (raw?.serialization !== "json-pretty-2-lf-final-newline") fail(`Generated candidate ${key} serialization is unsupported`);
    if (raw.content === null || typeof raw.content !== "object" || Array.isArray(raw.content)) {
      fail(`Generated candidate ${key} content contract mismatch`);
    }
    if (pathKey(raw.destinationPath ?? "") !== pathKey(expectedDestination)) fail(`Generated candidate ${key} destination mismatch`);
    let serialized;
    try {
      serialized = `${JSON.stringify(raw.content, null, 2)}\n`;
    } catch {
      fail(`Generated candidate ${key} could not be serialized`);
    }
    entries.push(candidateEntry(raw, entries.length, relativePath, Buffer.from(serialized, "utf8")));
  }
  return entries;
}

function inspectDestination(entry, label) {
  assertNoSymlinkComponents(entry.destination, label, false);
  nearestExistingDirectory(path.dirname(entry.destination));
  if (entry.operation === "create") {
    if (existsSync(entry.destination)) fail(`Create-only destination already exists: ${entry.destination}`);
    return { bytes: null, sha256: null, identity: null };
  }
  const stat = requireSingleLinkFile(entry.destination, label);
  const bytes = readFileSync(entry.destination);
  return { bytes, sha256: sha256(bytes), identity: `${stat.dev}:${stat.ino}` };
}

function destinationLockPath(roots, destination) {
  const digest = sha256(Buffer.from(pathKey(destination), "utf8")).slice(0, 24);
  return path.join(roots.target, `.guarded-project-sync-destination-${digest}.lock`);
}

function targetWorkspaceLockPath(roots) {
  const digest = sha256(Buffer.from(pathKey(roots.target), "utf8")).slice(0, 24);
  return path.join(roots.target, `.guarded-project-sync-workspace-${digest}.lock`);
}

function backupWorkspaceLockPath(roots) {
  const digest = sha256(Buffer.from(pathKey(roots.backupDirectory), "utf8")).slice(0, 24);
  return path.join(path.dirname(roots.backupDirectory), `.guarded-project-sync-backup-${digest}.lock`);
}

function attachPlanMetadata(entries, roots) {
  const seen = new Set();
  const identities = new Map();
  for (const entry of entries) {
    if (!isWithin(roots.managedRoot, entry.destination) || pathKey(entry.destination) === pathKey(roots.managedRoot)) {
      fail(`Destination escapes target .ai-toolkit: ${entry.destination}`);
    }
    const key = pathKey(entry.destination);
    if (seen.has(key)) fail(`Duplicate destination: ${entry.destination}`);
    seen.add(key);
    const inspected = inspectDestination(entry, `Destination ${entry.index + 1}`);
    if (entry.operation === "replace" && inspected.sha256 !== entry.beforeSha256) {
      fail(`Destination preimage hash mismatch: ${entry.destination}`);
    }
    entry.beforeBytes = inspected.bytes;
    entry.destinationIdentity = inspected.identity;
    if (entry.sourcePath && existsSync(entry.sourcePath)) {
      const stat = statSync(entry.sourcePath);
      const identity = `${stat.dev}:${stat.ino}`;
      const prior = identities.get(identity);
      if (prior && pathKey(prior) !== pathKey(entry.sourcePath)) fail(`Hard-link overlap involving source: ${entry.sourcePath}`);
      identities.set(identity, entry.sourcePath);
    }
    if (inspected.identity) {
      const prior = identities.get(inspected.identity);
      if (prior && pathKey(prior) !== key) fail(`Hard-link overlap involving destination: ${entry.destination}`);
      identities.set(inspected.identity, entry.destination);
    }
    if (entry.operation === "replace") {
      const backupName = `${String(entry.index + 1).padStart(3, "0")}-${sha256(Buffer.from(key)).slice(0, 12)}-${path.basename(entry.destination)}`;
      entry.backup = path.join(roots.backupDirectory, backupName);
    }
  }
  const destinationLocks = entries.map((entry) => destinationLockPath(roots, entry.destination));
  const targetLock = targetWorkspaceLockPath(roots);
  const backupLock = backupWorkspaceLockPath(roots);
  const lockPaths = [...new Set([...destinationLocks, targetLock, backupLock])]
    .sort((left, right) => pathKey(left).localeCompare(pathKey(right)));
  return { destinationLocks, targetLock, backupLock, lockPaths };
}

function preflightBackupAndLocks(roots, metadata, rollback = false) {
  for (const lockPath of metadata.lockPaths) {
    assertNoSymlinkComponents(lockPath, "Lock", false);
    requireRealDirectory(path.dirname(lockPath), "Lock parent");
    if (existsSync(lockPath)) fail(`Cooperative guarded-sync lock is already held: ${lockPath}`);
  }
  if (rollback) {
    requireRealDirectory(roots.backupDirectory, "Backup directory");
    return;
  }
  if (existsSync(roots.backupDirectory)) {
    requireRealDirectory(roots.backupDirectory, "Backup directory");
    if (readdirSync(roots.backupDirectory).length !== 0) fail(`Backup directory must be new or empty: ${roots.backupDirectory}`);
  }
}

function acquireLock(lockPath, action) {
  const token = randomUUID();
  let descriptor;
  try {
    descriptor = openSync(lockPath, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify({ version: 1, token, pid: process.pid, action, createdAtUtc: new Date().toISOString() })}\n`);
    fsyncSync(descriptor);
  } catch (error) {
    if (descriptor !== undefined) closeSync(descriptor);
    if (error?.code === "EEXIST") fail(`Cooperative guarded-sync lock is already held: ${lockPath}`);
    throw error;
  }
  closeSync(descriptor);
  return { path: lockPath, token };
}

function acquireLocks(paths, action) {
  const locks = [];
  try {
    for (const lockPath of paths) locks.push(acquireLock(lockPath, action));
    return locks;
  } catch (error) {
    releaseLocks(locks);
    throw error;
  }
}

function releaseLocks(locks = []) {
  for (const lock of [...locks].reverse()) {
    if (!existsSync(lock.path)) continue;
    try {
      const current = JSON.parse(readFileSync(lock.path, "utf8"));
      if (current.token === lock.token) unlinkSync(lock.path);
    } catch {
      // Never remove a lock whose ownership cannot be proven.
    }
  }
}

function publicEntry(entry, status = entry.status) {
  return {
    index: entry.index + 1,
    operation: entry.operation,
    kind: entry.kind,
    relativePath: entry.relativePath,
    destinationPath: entry.destination,
    backupPath: entry.backup,
    beforeSha256: entry.beforeSha256,
    afterSha256: entry.afterSha256,
    status
  };
}

function baseReport(roots, options, entries, metadata, action, mode) {
  return {
    schemaVersion: 1,
    action,
    mode,
    status: mode === "dry-run" ? "validated" : "in-progress",
    command: options.command,
    targetPath: roots.target,
    backupDirectory: roots.backupDirectory,
    journalPath: path.join(roots.backupDirectory, JOURNAL_NAME),
    targetWorkspaceLock: metadata.targetLock,
    backupWorkspaceLock: metadata.backupLock,
    destinationLocks: metadata.destinationLocks,
    entries: entries.map((entry) => publicEntry(entry))
  };
}

function flushDirectoryMetadata(directory) {
  if (process.platform === "win32") return "unsupported-on-win32";
  let descriptor;
  try {
    descriptor = openSync(directory, "r");
    fsyncSync(descriptor);
    return "flushed";
  } catch (error) {
    if (["EINVAL", "ENOTSUP", "EISDIR", "EPERM"].includes(error?.code)) return "unsupported";
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function replaceJournalWithRecoverableLinks(oldPath, newPath) {
  requireSingleLinkFile(newPath, "Published journal");
  const recoveryPath = `${newPath}.previous-${process.pid}-${randomUUID()}.tmp`;
  linkSync(newPath, recoveryPath);
  try {
    unlinkSync(newPath);
  } catch (error) {
    try { unlinkSync(recoveryPath); }
    catch { /* Preserve the original journal through its still-published path. */ }
    throw error;
  }
  try {
    linkSync(oldPath, newPath);
  } catch (error) {
    try { linkSync(recoveryPath, newPath); }
    catch { /* Keep the recovery link for operator inspection. */ }
    if (existsSync(recoveryPath) && existsSync(newPath)) {
      try { unlinkSync(recoveryPath); }
      catch { /* Keep the recovery link rather than obscure the publication error. */ }
    }
    throw error;
  }
  try { unlinkSync(oldPath); }
  catch { /* Publication succeeded; a same-bytes temporary hard link may remain. */ }
  try { unlinkSync(recoveryPath); }
  catch { /* Publication succeeded; a prior-journal recovery hard link may remain. */ }
}

function renameJournalTemporary(oldPath, newPath) {
  if (process.platform === "win32") {
    replaceJournalWithRecoverableLinks(oldPath, newPath);
    return;
  }
  const retrySignal = new Int32Array(new SharedArrayBuffer(4));
  for (let attempt = 0; ; attempt += 1) {
    try {
      renameSync(oldPath, newPath);
      return;
    } catch (error) {
      if (process.platform !== "win32" || !["EPERM", "EACCES"].includes(error?.code) || attempt >= 7) throw error;
      Atomics.wait(retrySignal, 0, 0, 20 * (attempt + 1));
    }
  }
}

const JOURNAL_FILE_OPERATIONS = Object.freeze({
  open: (filePath, flags, mode) => openSync(filePath, flags, mode),
  write: (descriptor, bytes, offset, length, position) => writeSync(descriptor, bytes, offset, length, position),
  fsync: (descriptor) => fsyncSync(descriptor),
  close: (descriptor) => closeSync(descriptor),
  link: (existingPath, newPath) => linkSync(existingPath, newPath),
  rename: (oldPath, newPath) => renameJournalTemporary(oldPath, newPath),
  unlink: (filePath) => unlinkSync(filePath),
  flushDirectory: (directory) => flushDirectoryMetadata(directory)
});

export function writeJournalWithOperations(journalPath, journal, createOnly = false, operations = JOURNAL_FILE_OPERATIONS) {
  const serialized = `${JSON.stringify(journal, null, 2)}\n`;
  const bytes = Buffer.from(serialized, "utf8");
  const temporary = `${journalPath}.${process.pid}.${randomUUID()}.tmp`;
  let descriptor;
  let temporaryExists = false;
  try {
    descriptor = operations.open(temporary, "wx", 0o600);
    temporaryExists = true;
    let offset = 0;
    while (offset < bytes.length) {
      const written = operations.write(descriptor, bytes, offset, bytes.length - offset, offset);
      if (!Number.isInteger(written) || written <= 0) fail("Journal temporary file write made no progress");
      offset += written;
    }
    operations.fsync(descriptor);
    operations.close(descriptor);
    descriptor = undefined;
    if (createOnly) operations.link(temporary, journalPath);
    else operations.rename(temporary, journalPath);
    if (!createOnly) temporaryExists = false;
    if (createOnly) {
      operations.unlink(temporary);
      temporaryExists = false;
    }
    operations.flushDirectory(path.dirname(journalPath));
  } finally {
    if (descriptor !== undefined) operations.close(descriptor);
    if (temporaryExists) {
      try { operations.unlink(temporary); }
      catch { /* Preserve the publication error; a flushed orphan is safer than deleting an unknown path. */ }
    }
  }
}

function writeJournal(journalPath, journal, createOnly = false) {
  writeJournalWithOperations(journalPath, journal, createOnly);
}

function persistJournal(journalPath, journal, createOnly = false) {
  journal.updatedAtUtc = new Date().toISOString();
  writeJournal(journalPath, journal, createOnly);
}

function journalFrom(roots, options, entries) {
  const now = new Date().toISOString();
  return {
    schemaVersion: JOURNAL_VERSION,
    operationId: randomUUID(),
    command: options.command,
    targetPath: roots.target,
    backupDirectory: roots.backupDirectory,
    status: "preparing",
    createdAtUtc: now,
    updatedAtUtc: now,
    createdDirectories: [],
    entries: entries.map((entry) => publicEntry(entry, "pending"))
  };
}

function testPlanFault(stage, roots, entries = [], metadata = null) {
  if (process.env.NODE_ENV !== "test" || process.env.GUARDED_PROJECT_SYNC_TEST_FAULT !== stage) return;
  if (stage === "backup-collision-after-lock") {
    if (!existsSync(roots.backupDirectory)) mkdirSync(roots.backupDirectory);
    const collision = entries.find((entry) => entry.backup)?.backup ?? path.join(roots.backupDirectory, "collision");
    writeFileSync(collision, "test collision", { flag: "wx" });
  } else if (stage === "rollback-lock-collision") {
    writeFileSync(metadata.lockPaths[0], "deterministic competing owner", { flag: "wx" });
  }
}

function testEntryFault(stage, entry) {
  if (process.env.NODE_ENV !== "test") return;
  const fault = process.env.GUARDED_PROJECT_SYNC_TEST_FAULT;
  if (!fault) return;
  const [wantedStage, wantedIndex] = fault.split(":");
  if (wantedStage !== stage || Number(wantedIndex) !== entry.index + 1) return;
  if (stage === "stale-destination") {
    writeFileSync(entry.destination, "deterministic external edit", "utf8");
    return;
  }
  if (stage === "create-collision") {
    writeFileSync(entry.destination, "deterministic competing create", { flag: "wx" });
    return;
  }
  if (stage === "corrupt-after-write") {
    writeFileSync(entry.destination, "deterministic read-back corruption", "utf8");
    return;
  }
  fail(`Injected deterministic failure at ${stage} for entry ${entry.index + 1}`);
}

function establishBackupWorkspace(roots, entries) {
  if (existsSync(roots.backupDirectory)) {
    requireRealDirectory(roots.backupDirectory, "Backup directory under lock");
    if (readdirSync(roots.backupDirectory).length !== 0) fail(`Backup directory collision after lock acquisition: ${roots.backupDirectory}`);
  } else {
    mkdirSync(roots.backupDirectory, { recursive: false });
  }
  const journalPath = path.join(roots.backupDirectory, JOURNAL_NAME);
  if (existsSync(journalPath)) fail(`Journal collision after lock acquisition: ${journalPath}`);
  for (const entry of entries) {
    if (entry.backup && existsSync(entry.backup)) fail(`Backup collision after lock acquisition: ${entry.backup}`);
  }
}

function recheckSources(entries) {
  for (const entry of entries) {
    if (!entry.sourcePath) continue;
    requireSingleLinkFile(entry.sourcePath, `Source recheck ${entry.index + 1}`);
    if (sha256(readFileSync(entry.sourcePath)) !== entry.afterSha256) fail(`Source changed after buffering: ${entry.sourcePath}`);
  }
}

function recheckAllDestinations(entries) {
  for (const entry of entries) {
    const current = inspectDestination(entry, `Destination recheck ${entry.index + 1}`);
    if (entry.operation === "replace" && current.sha256 !== entry.beforeSha256) fail(`Destination changed after preflight: ${entry.destination}`);
  }
}

function writeExclusiveFile(filePath, bytes, mode = 0o600) {
  let descriptor;
  try {
    descriptor = openSync(filePath, "wx", mode);
    writeFileSync(descriptor, bytes);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function sameIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function writeAllAtStart(descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.length) {
    offset += writeSync(descriptor, bytes, offset, bytes.length - offset, offset);
  }
}

function overwriteVerifiedFile(filePath, expectedSha256, bytes, label) {
  const beforeOpen = requireSingleLinkFile(filePath, label);
  let descriptor;
  try {
    descriptor = openSync(filePath, "r+");
    const opened = fstatSync(descriptor);
    if (!opened.isFile() || opened.nlink !== 1 || !sameIdentity(beforeOpen, opened)) fail(`${label} identity changed during open: ${filePath}`);
    const current = readFileSync(descriptor);
    if (sha256(current) !== expectedSha256) fail(`${label} hash changed before write: ${filePath}`);
    ftruncateSync(descriptor, 0);
    writeAllAtStart(descriptor, bytes);
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function ensureDestinationDirectories(roots, entries, journal, journalPath) {
  const required = [...new Set(entries.map((entry) => path.dirname(entry.destination)))]
    .sort((left, right) => left.length - right.length);
  for (const directory of required) {
    const relative = path.relative(roots.managedRoot, directory);
    const parts = relative === "" ? [] : relative.split(path.sep);
    let current = roots.managedRoot;
    const chain = [roots.managedRoot];
    for (const part of parts) {
      current = path.join(current, part);
      chain.push(current);
    }
    for (const candidate of chain) {
      if (existsSync(candidate)) {
        requireRealDirectory(candidate, "Destination parent");
        continue;
      }
      mkdirSync(candidate, { recursive: false });
      requireRealDirectory(candidate, "Created destination parent");
      journal.createdDirectories.push(candidate);
      persistJournal(journalPath, journal);
    }
  }
}

function executeApply(roots, options, entries, metadata) {
  const report = baseReport(roots, options, entries, metadata, "apply", "write");
  const journalPath = report.journalPath;
  let locks;
  let journal;
  let journalOwned = false;
  try {
    locks = acquireLocks(metadata.lockPaths, "apply");
    recheckSources(entries);
    recheckAllDestinations(entries);
    testPlanFault("backup-collision-after-lock", roots, entries);
    establishBackupWorkspace(roots, entries);
    journal = journalFrom(roots, options, entries);
    persistJournal(journalPath, journal, true);
    journalOwned = true;

    for (const entry of entries) {
      const journalEntry = journal.entries[entry.index];
      if (entry.operation === "replace") {
        const current = inspectDestination(entry, `Backup recheck ${entry.index + 1}`);
        if (current.sha256 !== entry.beforeSha256) fail(`Destination changed before backup: ${entry.destination}`);
        writeExclusiveFile(entry.backup, entry.beforeBytes);
        const backupBytes = readFileSync(entry.backup);
        const backupSha256 = sha256(backupBytes);
        if (backupSha256 !== entry.beforeSha256) fail(`Backup read-back verification failed: ${entry.backup}`);
        journalEntry.backupSha256 = backupSha256;
        journalEntry.status = "backed-up";
      } else {
        const current = inspectDestination(entry, `Create guard ${entry.index + 1}`);
        if (current.sha256 !== null) fail(`Create guard failed: ${entry.destination}`);
        journalEntry.status = "create-guarded";
      }
      persistJournal(journalPath, journal);
    }

    ensureDestinationDirectories(roots, entries, journal, journalPath);
    journal.status = "writing";
    persistJournal(journalPath, journal);
    for (const entry of entries) {
      const reportEntry = report.entries[entry.index];
      const journalEntry = journal.entries[entry.index];
      testEntryFault("stale-destination", entry);
      const current = inspectDestination(entry, `Pre-write destination ${entry.index + 1}`);
      if (entry.operation === "replace" && current.sha256 !== entry.beforeSha256) fail(`Destination changed after backup: ${entry.destination}`);
      journalEntry.status = "write-started";
      reportEntry.status = "write-started";
      persistJournal(journalPath, journal);
      testEntryFault("fail-before-write", entry);
      testEntryFault("create-collision", entry);
      if (entry.operation === "create") writeExclusiveFile(entry.destination, entry.candidateBytes);
      else overwriteVerifiedFile(entry.destination, entry.beforeSha256, entry.candidateBytes, `Destination ${entry.index + 1}`);
      testEntryFault("corrupt-after-write", entry);
      requireSingleLinkFile(entry.destination, `Written destination ${entry.index + 1}`);
      const readBackSha256 = sha256(readFileSync(entry.destination));
      if (readBackSha256 !== entry.afterSha256) {
        journalEntry.status = "verification-failed";
        reportEntry.status = "verification-failed";
        journalEntry.observedSha256 = readBackSha256;
        persistJournal(journalPath, journal);
        fail(`Destination read-back verification failed: ${entry.destination}`);
      }
      journalEntry.status = "written-and-verified";
      reportEntry.status = "written-and-verified";
      persistJournal(journalPath, journal);
    }
    journal.status = "applied";
    persistJournal(journalPath, journal);
    report.status = "applied";
    return report;
  } catch (error) {
    report.status = "partial-failure";
    report.error = error.message;
    if (journal) {
      for (const item of journal.entries) report.entries[item.index - 1].status = item.status;
    }
    if (journalOwned) {
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

function loadJournal(roots) {
  const journalPath = path.join(roots.backupDirectory, JOURNAL_NAME);
  requireSingleLinkFile(journalPath, "Journal");
  let journal;
  try {
    journal = JSON.parse(readFileSync(journalPath, "utf8"));
  } catch {
    fail("Guarded-sync journal is not valid JSON");
  }
  if (journal?.schemaVersion !== JOURNAL_VERSION || !Array.isArray(journal.entries) || journal.entries.length === 0) {
    fail("Unsupported guarded-sync journal");
  }
  if (pathKey(journal.targetPath ?? "") !== pathKey(roots.target) || pathKey(journal.backupDirectory ?? "") !== pathKey(roots.backupDirectory)) {
    fail("Journal target or backup directory mismatch");
  }
  const sanitized = {
    schemaVersion: JOURNAL_VERSION,
    operationId: typeof journal.operationId === "string" ? journal.operationId : "unknown",
    command: journal.command === "install" ? "install" : "update",
    targetPath: roots.target,
    backupDirectory: roots.backupDirectory,
    status: typeof journal.status === "string" ? journal.status : "unknown",
    createdAtUtc: typeof journal.createdAtUtc === "string" ? journal.createdAtUtc : null,
    updatedAtUtc: typeof journal.updatedAtUtc === "string" ? journal.updatedAtUtc : null,
    createdDirectories: Array.isArray(journal.createdDirectories) ? journal.createdDirectories.slice() : [],
    entries: journal.entries.map((entry) => ({
      index: entry.index,
      operation: entry.operation,
      kind: entry.kind,
      relativePath: entry.relativePath,
      destinationPath: entry.destinationPath,
      backupPath: entry.backupPath ?? null,
      beforeSha256: entry.beforeSha256 ?? null,
      afterSha256: entry.afterSha256,
      status: entry.status,
      ...(entry.backupSha256 ? { backupSha256: entry.backupSha256 } : {}),
      ...(entry.observedSha256 ? { observedSha256: entry.observedSha256 } : {}),
      ...(entry.rollbackStatus ? { rollbackStatus: entry.rollbackStatus } : {})
    }))
  };
  return { journal: sanitized, journalPath };
}

function rollbackEntries(roots, journal) {
  const entries = journal.entries.map((raw, index) => {
    if (raw?.index !== index + 1 || (raw.operation !== "create" && raw.operation !== "replace")) fail(`Invalid journal entry ${index + 1}`);
    const relativePath = normalizeRelativePath(raw.relativePath, `Journal entry ${index + 1} relativePath`);
    const destination = requirePath(raw.destinationPath, `Journal entry ${index + 1} destination`);
    const expectedDestination = path.join(roots.managedRoot, ...relativePath.split("/"));
    if (pathKey(destination) !== pathKey(expectedDestination)) fail(`Journal destination mismatch: ${relativePath}`);
    const beforeSha256 = raw.operation === "replace" ? requireDigest(raw.beforeSha256, `Journal entry ${index + 1} beforeSha256`) : null;
    const afterSha256 = requireDigest(raw.afterSha256, `Journal entry ${index + 1} afterSha256`);
    let backup = null;
    let backupBytes = null;
    if (raw.operation === "replace") {
      backup = requirePath(raw.backupPath, `Journal entry ${index + 1} backupPath`);
      if (!isWithin(roots.backupDirectory, backup) || pathKey(backup) === pathKey(roots.backupDirectory)) fail(`Journal backup escapes backup directory: ${backup}`);
      requireSingleLinkFile(backup, `Rollback backup ${index + 1}`);
      backupBytes = readFileSync(backup);
      if (sha256(backupBytes) !== beforeSha256 || requireDigest(raw.backupSha256, `Journal entry ${index + 1} backupSha256`) !== beforeSha256) {
        fail(`Rollback backup verification failed: ${backup}`);
      }
    } else if (raw.backupPath !== null) fail(`Create journal entry has an unexpected backup: ${relativePath}`);
    return {
      index,
      operation: raw.operation,
      kind: raw.kind === "asset" ? "asset" : "generated-json",
      relativePath,
      destination,
      backup,
      backupBytes,
      beforeSha256,
      afterSha256,
      status: raw.status
    };
  });
  return entries;
}

function prepareRollback(roots, entries) {
  for (const entry of entries) {
    if (!existsSync(entry.destination)) {
      if (entry.operation === "create") {
        entry.currentSha256 = null;
        entry.rollbackAction = "already-absent";
        continue;
      }
      fail(`Rollback refuses missing replacement destination: ${entry.destination}`);
    }
    requireSingleLinkFile(entry.destination, `Rollback destination ${entry.index + 1}`);
    entry.currentSha256 = sha256(readFileSync(entry.destination));
    if (entry.operation === "replace") {
      if (entry.currentSha256 === entry.afterSha256) entry.rollbackAction = "restore-backup";
      else if (entry.currentSha256 === entry.beforeSha256) entry.rollbackAction = "already-restored";
      else fail(`Rollback refuses later edit: ${entry.destination}`);
    } else if (entry.currentSha256 === entry.afterSha256) entry.rollbackAction = "remove-created";
    else fail(`Rollback refuses later edit: ${entry.destination}`);
  }
}

function rollbackReport(roots, options, entries, metadata, mode) {
  const report = baseReport(roots, options, entries, metadata, "rollback", mode);
  report.entries = entries.map((entry) => ({ ...publicEntry(entry, mode === "dry-run" ? "validated" : "pending"), rollbackAction: entry.rollbackAction }));
  return report;
}

function recheckRollbackEntry(entry) {
  if (entry.rollbackAction === "already-absent") {
    if (existsSync(entry.destination)) fail(`Rollback destination changed after preflight: ${entry.destination}`);
    return;
  }
  requireSingleLinkFile(entry.destination, `Rollback destination recheck ${entry.index + 1}`);
  const current = sha256(readFileSync(entry.destination));
  if (current !== entry.currentSha256) fail(`Rollback destination changed after preflight: ${entry.destination}`);
}

function removeCreatedDirectories(roots, journal) {
  const directories = Array.isArray(journal.createdDirectories) ? journal.createdDirectories : [];
  for (const raw of [...directories].reverse()) {
    const directory = requirePath(raw, "Created directory");
    if (!isWithin(roots.managedRoot, directory)) fail(`Created directory escapes managed root: ${directory}`);
    if (!existsSync(directory)) continue;
    requireRealDirectory(directory, "Created directory cleanup");
    if (readdirSync(directory).length === 0) rmdirSync(directory);
  }
}

function executeRollback(roots, options, entries, metadata, journal, journalPath) {
  const report = rollbackReport(roots, options, entries, metadata, "write");
  let locks;
  try {
    testPlanFault("rollback-lock-collision", roots, entries, metadata);
    locks = acquireLocks(metadata.lockPaths, "rollback");
    for (const entry of entries) recheckRollbackEntry(entry);
    journal.status = "rolling-back";
    persistJournal(journalPath, journal);
    for (const entry of [...entries].reverse()) {
      const reportEntry = report.entries[entry.index];
      const journalEntry = journal.entries[entry.index];
      recheckRollbackEntry(entry);
      journalEntry.rollbackStatus = "rollback-started";
      persistJournal(journalPath, journal);
      if (entry.rollbackAction === "restore-backup") {
        overwriteVerifiedFile(entry.destination, entry.currentSha256, entry.backupBytes, `Rollback destination ${entry.index + 1}`);
        if (sha256(readFileSync(entry.destination)) !== entry.beforeSha256) fail(`Rollback read-back verification failed: ${entry.destination}`);
      } else if (entry.rollbackAction === "remove-created") {
        unlinkSync(entry.destination);
        if (existsSync(entry.destination)) fail(`Rollback failed to remove created destination: ${entry.destination}`);
      }
      journalEntry.rollbackStatus = "rolled-back";
      reportEntry.status = "rolled-back";
      persistJournal(journalPath, journal);
    }
    removeCreatedDirectories(roots, journal);
    journal.status = "rolled-back";
    persistJournal(journalPath, journal);
    report.status = "rolled-back";
    return report;
  } catch (error) {
    report.status = "partial-failure";
    report.error = error.message;
    if (!locks) throw new ReportedError(error.message, report);
    if (journal) {
      journal.status = "rollback-partial-failure";
      journal.rollbackError = error.message;
      try { persistJournal(journalPath, journal); }
      catch (journalError) { report.journalError = journalError.message; }
      for (const item of journal.entries) report.entries[item.index - 1].status = item.rollbackStatus ?? report.entries[item.index - 1].status;
    }
    throw new ReportedError(error.message, report);
  } finally {
    releaseLocks(locks);
  }
}

function metadataForRollback(entries, roots) {
  const destinationLocks = entries.map((entry) => destinationLockPath(roots, entry.destination));
  const targetLock = targetWorkspaceLockPath(roots);
  const backupLock = backupWorkspaceLockPath(roots);
  const lockPaths = [...new Set([...destinationLocks, targetLock, backupLock])]
    .sort((left, right) => pathKey(left).localeCompare(pathKey(right)));
  return { destinationLocks, targetLock, backupLock, lockPaths };
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(helpText());
    return;
  }
  const roots = validateRoots(options);
  let report;
  if (options.rollback) {
    const { journal, journalPath } = loadJournal(roots);
    options.command = journal.command === "install" ? "install" : "update";
    const entries = rollbackEntries(roots, journal);
    const metadata = metadataForRollback(entries, roots);
    preflightBackupAndLocks(roots, metadata, true);
    prepareRollback(roots, entries);
    report = options.confirmWrite
      ? executeRollback(roots, options, entries, metadata, journal, journalPath)
      : rollbackReport(roots, options, entries, metadata, "dry-run");
  } else {
    const exported = runExport(options, roots);
    validateExportEnvelope(exported, options, roots);
    const entries = materializeEntries(exported, roots);
    const metadata = attachPlanMetadata(entries, roots);
    preflightBackupAndLocks(roots, metadata, false);
    report = options.confirmWrite
      ? executeApply(roots, options, entries, metadata)
      : baseReport(roots, options, entries, metadata, "apply", "dry-run");
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && pathKey(process.argv[1]) === pathKey(fileURLToPath(import.meta.url))) {
  try {
    main();
  } catch (error) {
    if (error instanceof ReportedError) process.stdout.write(`${JSON.stringify(error.report, null, 2)}\n`);
    process.stderr.write(`guarded-project-sync: ${error.message}\n`);
    process.exitCode = 1;
  }
}
