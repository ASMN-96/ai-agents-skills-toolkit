import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import path from "node:path";

const JOURNAL_SCHEMA_VERSION = "1.0.0";
const LOCK_SCHEMA_VERSION = "1.0.0";
const TRANSACTION_PHASES = new Set(["prepared", "backup-created", "promoted", "validated"]);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROCESS_OWNER_ID = randomUUID();
const WINDOWS_REPARSE_CACHE_LIMIT = 4096;
const WINDOWS_MAX_PATH = 260;
const WINDOWS_REPARSE_POINT_ATTRIBUTE = 0x400;
const WINDOWS_NATIVE_ATTRIBUTE_PROBE = `
$signature = @'
using System;
using System.Runtime.InteropServices;
public static class SafeFilesystemNativeAttributes {
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  private static extern uint GetFileAttributesW(string path);
  public static int Read(string path) {
    var attributes = GetFileAttributesW(path);
    return attributes == 0xffffffff ? -Marshal.GetLastWin32Error() : unchecked((int)attributes);
  }
}
'@
Add-Type -TypeDefinition $signature
[Console]::Write([SafeFilesystemNativeAttributes]::Read($env:AI_TOOLKIT_REPARSE_PROBE_PATH))
`;
const windowsNonReparseCache = new Map();

function normalizeForComparison(candidate) {
  let normalized = path.resolve(candidate);
  if (normalized.startsWith("\\\\?\\")) normalized = normalized.slice(4);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isWithin(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function lstatIfPresent(candidate) {
  try {
    return lstatSync(candidate);
  } catch (error) {
    if (["ENOENT", "ENOTDIR"].includes(error?.code)) return null;
    throw error;
  }
}

function linkedPathError(label, candidate) {
  return new Error(`${label} contains a linked or redirecting reparse path component: ${candidate}`);
}

function windowsStatFingerprint(stats) {
  return [
    stats.dev,
    stats.ino,
    stats.mode,
    stats.nlink,
    stats.size,
    stats.ctimeMs,
    stats.mtimeMs,
    stats.birthtimeMs
  ].map(String).join(":");
}

function cacheWindowsNonReparse(candidate, fingerprint) {
  if (windowsNonReparseCache.size >= WINDOWS_REPARSE_CACHE_LIMIT) {
    windowsNonReparseCache.delete(windowsNonReparseCache.keys().next().value);
  }
  windowsNonReparseCache.set(normalizeForComparison(candidate), fingerprint);
}

export function isWindowsNonReparseCacheEligible(candidate, systemDrive) {
  if (typeof candidate !== "string" || typeof systemDrive !== "string") return false;
  const windowsPath = candidate.replaceAll("/", "\\");
  if (windowsPath.startsWith("\\\\")) return false;
  const driveMatch = /^([a-z]):\\/i.exec(windowsPath);
  const systemDriveMatch = /^([a-z]):(?:\\)?$/i.exec(systemDrive.trim());
  return Boolean(
    driveMatch &&
    systemDriveMatch &&
    driveMatch[1].toLowerCase() === systemDriveMatch[1].toLowerCase()
  );
}

function toWindowsExtendedPath(candidate) {
  const resolved = path.resolve(candidate);
  if (resolved.startsWith("\\\\?\\")) return resolved;
  if (resolved.startsWith("\\\\")) return `\\\\?\\UNC\\${resolved.slice(2)}`;
  return `\\\\?\\${resolved}`;
}

export function assertWindowsNativeAttributeProbeResult(result, candidate, label) {
  if (result.error) {
    throw new Error(`${label} could not verify Windows reparse-point state for ${candidate}: ${result.error.message}`);
  }
  if (result.signal || result.status === null || result.status !== 0) {
    throw new Error(`${label} could not verify Windows reparse-point state for ${candidate}: native attribute probe did not complete`);
  }
  const output = String(result.stdout ?? "").trim();
  if (!/^\d+$/.test(output)) {
    throw new Error(`${label} could not verify Windows reparse-point state for ${candidate}: native attribute probe returned an invalid result`);
  }
  const attributes = Number.parseInt(output, 10);
  if (!Number.isSafeInteger(attributes)) {
    throw new Error(`${label} could not verify Windows reparse-point state for ${candidate}: native attribute probe returned an invalid result`);
  }
  if ((attributes & WINDOWS_REPARSE_POINT_ATTRIBUTE) !== 0) {
    throw linkedPathError(label, candidate);
  }
}

function assertLongWindowsPathIsNotReparsePoint(candidate, label) {
  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const powershell = path.join(systemRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const result = spawnSync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", WINDOWS_NATIVE_ATTRIBUTE_PROBE], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 10_000,
    env: {
      ...process.env,
      AI_TOOLKIT_REPARSE_PROBE_PATH: toWindowsExtendedPath(candidate)
    }
  });
  assertWindowsNativeAttributeProbeResult(result, candidate, label);
}

function assertNotWindowsReparsePoint(candidate, stats, label) {
  if (process.platform !== "win32") return false;

  const cacheKey = normalizeForComparison(candidate);
  const fingerprint = windowsStatFingerprint(stats);
  const cacheEligible = isWindowsNonReparseCacheEligible(candidate, process.env.SystemDrive);
  if (cacheEligible && windowsNonReparseCache.get(cacheKey) === fingerprint) return false;
  windowsNonReparseCache.delete(cacheKey);

  const systemRoot = process.env.SystemRoot || "C:\\Windows";
  const fsutil = path.join(systemRoot, "System32", "fsutil.exe");
  const result = spawnSync(fsutil, ["reparsepoint", "query", candidate], {
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    timeout: 10_000
  });
  if (result.error) {
    throw new Error(`${label} could not verify Windows reparse-point state for ${candidate}: ${result.error.message}`);
  }
  if (result.signal || result.status === null) {
    throw new Error(`${label} could not verify Windows reparse-point state for ${candidate}: fsutil did not complete`);
  }
  if (result.status === 0) {
    throw linkedPathError(label, candidate);
  }
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (result.status === 1 && /(?:Error\s+4390|not a reparse point)/i.test(output)) {
    if (cacheEligible) cacheWindowsNonReparse(candidate, fingerprint);
    return false;
  }
  if (result.status === 1 && candidate.length >= WINDOWS_MAX_PATH) {
    assertLongWindowsPathIsNotReparsePoint(candidate, label);
    if (cacheEligible) cacheWindowsNonReparse(candidate, fingerprint);
    return false;
  }
  throw new Error(
    `${label} could not verify Windows reparse-point state for ${candidate}: fsutil exited ${result.status}`
  );
}

function assertWindowsOriginalPathAncestorsAreNonReparse(candidate, label) {
  if (process.platform !== "win32") return;
  const resolved = path.resolve(candidate);
  if (resolved.startsWith("\\\\") || !/^[a-z]:\\/i.test(resolved)) {
    throw linkedPathError(label, candidate);
  }

  const driveRoot = resolved.slice(0, 3);
  let current = driveRoot;
  const relative = path.relative(driveRoot, resolved);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stats = lstatIfPresent(current);
    if (!stats) {
      throw new Error(`${label} could not verify every original Windows path ancestor: ${current}`);
    }
    if (stats.isSymbolicLink()) throw linkedPathError(label, current);
    assertNotWindowsReparsePoint(current, stats, label);

    const followedStats = statSync(current);
    if (stats.isFile() !== followedStats.isFile() || stats.isDirectory() !== followedStats.isDirectory()) {
      throw linkedPathError(label, current);
    }
  }
}

function assertSafeExistingComponent(candidate, label, { rejectHardLinks = true } = {}) {
  const stats = lstatIfPresent(candidate);
  if (!stats) return null;
  if (stats.isSymbolicLink()) throw linkedPathError(label, candidate);
  assertNotWindowsReparsePoint(candidate, stats, label);

  const followedStats = statSync(candidate);
  if (stats.isFile() !== followedStats.isFile() || stats.isDirectory() !== followedStats.isDirectory()) {
    throw linkedPathError(label, candidate);
  }

  const realCandidate = realpathSync.native(candidate);
  if (normalizeForComparison(realCandidate) !== normalizeForComparison(candidate)) {
    if (process.platform !== "win32") throw linkedPathError(label, candidate);
    assertWindowsOriginalPathAncestorsAreNonReparse(candidate, label);
  }
  if (rejectHardLinks && stats.isFile() && stats.nlink > 1) {
    throw new Error(`${label} contains a hard-linked file: ${candidate}`);
  }
  return stats;
}

function assertPathComponents(anchorRoot, candidate, label, {
  mustExist = false,
  type = null,
  rejectHardLinks = true
} = {}) {
  const resolvedAnchor = path.resolve(anchorRoot);
  const resolvedCandidate = path.resolve(candidate);
  if (!isWithin(resolvedAnchor, resolvedCandidate)) {
    throw new Error(`${label} is outside the allowed root: ${resolvedCandidate}`);
  }

  const anchorStats = assertSafeExistingComponent(resolvedAnchor, label, { rejectHardLinks });
  if (!anchorStats?.isDirectory()) {
    throw new Error(`${label} root must be an existing regular directory: ${resolvedAnchor}`);
  }

  let current = resolvedAnchor;
  const relative = path.relative(resolvedAnchor, resolvedCandidate);
  const segments = relative ? relative.split(path.sep).filter(Boolean) : [];
  let finalStats = anchorStats;
  for (const segment of segments) {
    current = path.join(current, segment);
    finalStats = assertSafeExistingComponent(current, label, { rejectHardLinks });
    if (!finalStats) break;
  }

  if (mustExist && !finalStats) {
    throw new Error(`${label} does not exist: ${resolvedCandidate}`);
  }
  if (finalStats && type === "file" && !finalStats.isFile()) {
    throw new Error(`${label} must be a regular file: ${resolvedCandidate}`);
  }
  if (finalStats && type === "directory" && !finalStats.isDirectory()) {
    throw new Error(`${label} must be a regular directory: ${resolvedCandidate}`);
  }
  return resolvedCandidate;
}

function ensureDirectoryWithin(repositoryRoot, directoryPath, label) {
  const resolvedRepository = path.resolve(repositoryRoot);
  const resolvedDirectory = assertPathComponents(resolvedRepository, directoryPath, label);
  let current = resolvedRepository;
  const relative = path.relative(resolvedRepository, resolvedDirectory);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stats = assertSafeExistingComponent(current, label);
    if (stats) {
      if (!stats.isDirectory()) throw new Error(`${label} parent must be a regular directory: ${current}`);
      continue;
    }
    assertPathComponents(resolvedRepository, path.dirname(current), label, { mustExist: true, type: "directory" });
    mkdirSync(current);
    assertPathComponents(resolvedRepository, current, label, { mustExist: true, type: "directory" });
  }
  return resolvedDirectory;
}

export function assertPathContained(root, candidate, label = "path") {
  return assertPathComponents(root, candidate, label);
}

export function assertRegularFileWithin(root, candidate, label = "input") {
  return assertPathComponents(root, candidate, label, { mustExist: true, type: "file" });
}

const WINDOWS_DEVICE_BASENAME = /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[0-9\u00b9\u00b2\u00b3]|lpt[0-9\u00b9\u00b2\u00b3])(?:\..*)?$/i;

function assertWindowsSafeRelativeSegments(root, candidate, label) {
  const relative = path.relative(root, candidate);
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    if (segment.includes(":")) {
      throw new Error(`${label} contains an unsafe Windows alternate data stream segment: ${segment}`);
    }
    if (segment.endsWith(".")) {
      throw new Error(`${label} contains an unsafe Windows trailing dot alias: ${segment}`);
    }
    if (segment.endsWith(" ")) {
      throw new Error(`${label} contains an unsafe Windows trailing space alias: ${segment}`);
    }
    if (WINDOWS_DEVICE_BASENAME.test(segment)) {
      throw new Error(`${label} contains an unsafe Windows reserved device name: ${segment}`);
    }
  }
}

export function assertManagedNewFilePath({ root, candidate, label = "managed new file" }) {
  const resolvedRoot = path.resolve(root);
  const resolvedCandidate = path.resolve(candidate);
  if (
    normalizeForComparison(resolvedRoot) === normalizeForComparison(resolvedCandidate) ||
    !isWithin(resolvedRoot, resolvedCandidate)
  ) {
    throw new Error(`${label} must be contained below the exact managed root ${resolvedRoot}: ${resolvedCandidate}`);
  }
  assertWindowsSafeRelativeSegments(resolvedRoot, resolvedCandidate, label);
  assertPathComponents(resolvedRoot, resolvedRoot, `${label} root`, {
    mustExist: true,
    type: "directory"
  });
  assertPathComponents(resolvedRoot, path.dirname(resolvedCandidate), `${label} parent`, {
    mustExist: true,
    type: "directory"
  });
  assertPathComponents(resolvedRoot, resolvedCandidate, label);
  if (lstatIfPresent(resolvedCandidate)) {
    throw new Error(`${label} target already exists; refusing to overwrite: ${resolvedCandidate}`);
  }
  return resolvedCandidate;
}

export function writeManagedNewFile({
  root,
  candidate,
  contents,
  encoding = "utf8",
  label = "managed new file"
}) {
  if (typeof contents !== "string" && !ArrayBuffer.isView(contents)) {
    throw new TypeError(`${label} contents must be a string or byte view`);
  }
  const resolvedCandidate = assertManagedNewFilePath({ root, candidate, label });
  let descriptor;
  try {
    // Revalidate every existing component immediately before exclusive creation.
    assertManagedNewFilePath({ root, candidate: resolvedCandidate, label });
    descriptor = openSync(resolvedCandidate, "wx", 0o600);
    writeFileSync(descriptor, contents, typeof contents === "string" ? encoding : undefined);
    fsyncSync(descriptor);
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`${label} target already exists; refusing to overwrite: ${resolvedCandidate}`, { cause: error });
    }
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  assertPathComponents(path.resolve(root), resolvedCandidate, label, {
    mustExist: true,
    type: "file"
  });
  return resolvedCandidate;
}

export class ManagedFilesystem {
  constructor({ repositoryRoot, managedRoot, label = "managed filesystem" }) {
    this.repositoryRoot = assertPathComponents(repositoryRoot, repositoryRoot, `${label} repository root`, {
      mustExist: true,
      type: "directory"
    });
    this.root = path.resolve(managedRoot);
    this.label = label;
    if (!isWithin(this.repositoryRoot, this.root) || normalizeForComparison(this.root) === normalizeForComparison(this.repositoryRoot)) {
      throw new Error(`${label} must use an exact managed root below the repository root: ${this.root}`);
    }
    assertPathComponents(this.repositoryRoot, this.root, `${label} root`);
  }

  resolve(candidate = ".", label = this.label) {
    const resolved = path.isAbsolute(candidate) ? path.resolve(candidate) : path.resolve(this.root, candidate);
    if (!isWithin(this.root, resolved)) {
      throw new Error(`${label} is outside the exact managed root ${this.root}: ${resolved}`);
    }
    return assertPathComponents(this.repositoryRoot, resolved, label);
  }

  assertDirectory(candidate = ".", label = `${this.label} directory`) {
    const resolved = this.resolve(candidate, label);
    return assertPathComponents(this.repositoryRoot, resolved, label, { mustExist: true, type: "directory" });
  }

  assertRegularFile(candidate, label = `${this.label} file`) {
    const resolved = this.resolve(candidate, label);
    return assertPathComponents(this.repositoryRoot, resolved, label, { mustExist: true, type: "file" });
  }

  ensureDirectory(candidate = ".", label = `${this.label} directory`) {
    const resolved = this.resolve(candidate, label);
    ensureDirectoryWithin(this.repositoryRoot, resolved, label);
    return this.assertDirectory(resolved, label);
  }

  writeFile(candidate, contents, options = "utf8", label = `${this.label} write`) {
    const resolved = this.resolve(candidate, label);
    this.ensureDirectory(path.dirname(resolved), `${label} parent`);
    this.resolve(resolved, label);
    writeFileSync(resolved, contents, options);
    return this.assertRegularFile(resolved, label);
  }

  copyFileFrom(sourceRoot, sourcePath, candidate, label = `${this.label} copy`) {
    const resolved = this.resolve(candidate, label);
    assertRegularFileWithin(sourceRoot, sourcePath, `${label} source`);
    this.ensureDirectory(path.dirname(resolved), `${label} parent`);
    assertRegularFileWithin(sourceRoot, sourcePath, `${label} source`);
    this.resolve(resolved, label);
    copyFileSync(sourcePath, resolved);
    return this.assertRegularFile(resolved, label);
  }

  readFile(candidate, options = null, label = `${this.label} read`) {
    const resolved = this.assertRegularFile(candidate, label);
    return readFileSync(resolved, options ?? undefined);
  }
}

function sha256File(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function snapshotManagedTree(repositoryRoot, managedRoot, label = "managed tree") {
  const manager = new ManagedFilesystem({ repositoryRoot, managedRoot, label });
  if (!lstatIfPresent(manager.root)) return [];
  manager.assertDirectory(".", `${label} root`);
  const entries = [];

  function visit(relativeDirectory) {
    const directory = manager.assertDirectory(relativeDirectory || ".", `${label} directory`);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory ? path.join(relativeDirectory, entry.name) : entry.name;
      const fullPath = manager.resolve(relativePath, `${label} entry`);
      const stats = assertSafeExistingComponent(fullPath, `${label} entry`);
      if (stats.isDirectory()) {
        entries.push({ path: relativePath.split(path.sep).join("/"), type: "directory" });
        visit(relativePath);
      } else if (stats.isFile()) {
        entries.push({
          path: relativePath.split(path.sep).join("/"),
          type: "file",
          size: stats.size,
          sha256: sha256File(fullPath)
        });
      } else {
        throw new Error(`${label} contains a non-regular entry: ${fullPath}`);
      }
    }
  }

  visit("");
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function copyManagedTree(repositoryRoot, sourceRoot, destinationManager, label) {
  const sourceManager = new ManagedFilesystem({ repositoryRoot, managedRoot: sourceRoot, label: `${label} source` });
  sourceManager.assertDirectory(".", `${label} source root`);
  destinationManager.ensureDirectory(".", `${label} staging root`);

  function visit(relativeDirectory) {
    const directory = sourceManager.assertDirectory(relativeDirectory || ".", `${label} source directory`);
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const relativePath = relativeDirectory ? path.join(relativeDirectory, entry.name) : entry.name;
      const fullPath = sourceManager.resolve(relativePath, `${label} source entry`);
      const stats = assertSafeExistingComponent(fullPath, `${label} source entry`);
      if (stats.isDirectory()) {
        destinationManager.ensureDirectory(relativePath, `${label} staging directory`);
        visit(relativePath);
      } else if (stats.isFile()) {
        destinationManager.copyFileFrom(sourceRoot, fullPath, relativePath, `${label} staged file`);
      } else {
        throw new Error(`${label} source contains a non-regular entry: ${fullPath}`);
      }
    }
  }

  visit("");
}

function snapshotsEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSnapshot(repositoryRoot, managedRoot, expected, label) {
  const actual = snapshotManagedTree(repositoryRoot, managedRoot, label);
  if (!snapshotsEqual(actual, expected)) {
    throw new Error(`${label} digest, size, or output validation failed`);
  }
  return actual;
}

function artifactPrefix(managedRoot) {
  const name = path.basename(managedRoot);
  return name.startsWith(".") ? name : `.${name}`;
}

function transactionCoordinates(repositoryRoot, managedRoot, id = null, { legacyArtifacts = false } = {}) {
  const resolvedRepository = path.resolve(repositoryRoot);
  const resolvedManaged = path.resolve(managedRoot);
  if (!isWithin(resolvedRepository, resolvedManaged) || normalizeForComparison(resolvedManaged) === normalizeForComparison(resolvedRepository)) {
    throw new Error(`transaction managed root must be below the repository root: ${resolvedManaged}`);
  }
  const parent = path.dirname(resolvedManaged);
  const prefix = artifactPrefix(resolvedManaged);
  const transactionArtifactId = id?.replaceAll("-", "").slice(0, 12);
  return {
    repositoryRoot: resolvedRepository,
    managedRoot: resolvedManaged,
    parent,
    lockPath: path.join(parent, `${prefix}.transaction.lock`),
    journalPath: path.join(parent, `${prefix}.transaction.json`),
    stagingRoot: id ? path.join(parent, legacyArtifacts ? `${prefix}.staging-${id}` : `.s-${transactionArtifactId}`) : null,
    backupRoot: id ? path.join(parent, legacyArtifacts ? `${prefix}.backup-${id}` : `.b-${transactionArtifactId}`) : null
  };
}

function transactionLockText(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function validateTransactionLock(document, coordinates) {
  if (!hasExactKeys(document, [
    "acquiredAt",
    "managedRoot",
    "ownerId",
    "ownerPid",
    "repositoryRoot",
    "schemaVersion",
    "transactionId"
  ])) {
    throw new Error(`invalid managed transaction lock: ${coordinates.lockPath}`);
  }
  if (
    document.schemaVersion !== LOCK_SCHEMA_VERSION
    || document.repositoryRoot !== coordinates.repositoryRoot
    || document.managedRoot !== coordinates.managedRoot
    || !UUID_V4.test(document.transactionId ?? "")
    || !UUID_V4.test(document.ownerId ?? "")
    || !Number.isSafeInteger(document.ownerPid)
    || document.ownerPid <= 0
    || typeof document.acquiredAt !== "string"
    || Number.isNaN(Date.parse(document.acquiredAt))
    || new Date(document.acquiredAt).toISOString() !== document.acquiredAt
  ) {
    throw new Error(`invalid or cross-root managed transaction lock: ${coordinates.lockPath}`);
  }
  return document;
}

function readTransactionLock(coordinates) {
  if (!lstatIfPresent(coordinates.lockPath)) return null;
  assertPathComponents(coordinates.repositoryRoot, coordinates.lockPath, "transaction lock", {
    mustExist: true,
    type: "file"
  });
  const text = readFileSync(coordinates.lockPath, "utf8");
  let document;
  try {
    document = JSON.parse(text);
  } catch (error) {
    throw new Error(`invalid or torn managed transaction lock ${coordinates.lockPath}: ${error.message}`);
  }
  validateTransactionLock(document, coordinates);
  return { document, text };
}

function ownerProcessIsDefinitivelyAbsent(ownerPid) {
  try {
    process.kill(ownerPid, 0);
    return false;
  } catch (error) {
    return error?.code === "ESRCH";
  }
}

function createTransactionLock(coordinates, transactionId) {
  const document = {
    schemaVersion: LOCK_SCHEMA_VERSION,
    repositoryRoot: coordinates.repositoryRoot,
    managedRoot: coordinates.managedRoot,
    transactionId,
    ownerPid: process.pid,
    ownerId: PROCESS_OWNER_ID,
    acquiredAt: new Date().toISOString()
  };
  const text = transactionLockText(document);
  let descriptor;
  try {
    descriptor = openSync(coordinates.lockPath, "wx", 0o600);
    writeFileSync(descriptor, text, "utf8");
    fsyncSync(descriptor);
  } catch (error) {
    if (error?.code === "EEXIST") return null;
    throw error;
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  assertPathComponents(coordinates.repositoryRoot, coordinates.lockPath, "transaction lock", {
    mustExist: true,
    type: "file"
  });
  const observed = readFileSync(coordinates.lockPath, "utf8");
  if (observed !== text) throw new Error("managed transaction lock changed during acquisition");
  return { document, text, staleLock: null };
}

function acquireTransactionLock(coordinates, transactionId, label) {
  ensureDirectoryWithin(coordinates.repositoryRoot, coordinates.parent, `${label} parent`);
  assertPathComponents(coordinates.repositoryRoot, coordinates.lockPath, `${label} transaction lock`);
  const immediate = createTransactionLock(coordinates, transactionId);
  if (immediate) return immediate;

  const existing = readTransactionLock(coordinates);
  if (!existing || !ownerProcessIsDefinitivelyAbsent(existing.document.ownerPid)) {
    throw new Error(`${label} transaction lock is held by a live or unverifiable owner`);
  }
  const interruptedJournal = readJournal(coordinates);
  if (interruptedJournal && interruptedJournal.journal.id !== existing.document.transactionId) {
    throw new Error("stale lock transaction does not match the managed transaction journal");
  }
  assertPathComponents(coordinates.repositoryRoot, coordinates.lockPath, `${label} stale transaction lock`, {
    mustExist: true,
    type: "file"
  });
  if (readFileSync(coordinates.lockPath, "utf8") !== existing.text) {
    throw new Error(`${label} stale transaction lock changed before recovery`);
  }
  rmSync(coordinates.lockPath);
  const acquired = createTransactionLock(coordinates, transactionId);
  if (!acquired) {
    throw new Error(`${label} transaction lock contention changed during stale-lock recovery`);
  }
  acquired.staleLock = existing.document;
  return acquired;
}

function assertTransactionLockOwned(coordinates, ownership) {
  const observed = readTransactionLock(coordinates);
  if (!observed || observed.text !== ownership.text) {
    throw new Error("managed transaction lock ownership changed during operation");
  }
}

function releaseTransactionLock(coordinates, ownership) {
  assertTransactionLockOwned(coordinates, ownership);
  rmSync(coordinates.lockPath);
}

function removeRegularFile(repositoryRoot, filePath, label) {
  if (!lstatIfPresent(filePath)) return;
  assertPathComponents(repositoryRoot, filePath, label, { mustExist: true, type: "file" });
  rmSync(filePath);
}

function removeManagedTree(repositoryRoot, managedRoot, label) {
  if (!lstatIfPresent(managedRoot)) return;
  snapshotManagedTree(repositoryRoot, managedRoot, label);
  assertPathComponents(repositoryRoot, managedRoot, label, { mustExist: true, type: "directory" });
  rmSync(managedRoot, { recursive: true, force: true });
}

function journalTempPath(coordinates, journal) {
  return `${coordinates.journalPath}.tmp-${journal.id}`;
}

function writeJournal(coordinates, journal, ownership) {
  assertTransactionLockOwned(coordinates, ownership);
  ensureDirectoryWithin(coordinates.repositoryRoot, coordinates.parent, "transaction parent");
  assertPathComponents(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal");
  const tempPath = journalTempPath(coordinates, journal);
  if (lstatIfPresent(tempPath)) {
    removeRegularFile(coordinates.repositoryRoot, tempPath, "transaction journal temporary file");
  }
  assertPathComponents(coordinates.repositoryRoot, tempPath, "transaction journal temporary file");

  let descriptor;
  try {
    descriptor = openSync(tempPath, "wx", 0o600);
    writeFileSync(descriptor, `${JSON.stringify(journal, null, 2)}\n`, "utf8");
    fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
  assertPathComponents(coordinates.repositoryRoot, tempPath, "transaction journal temporary file", {
    mustExist: true,
    type: "file"
  });
  if (lstatIfPresent(coordinates.journalPath)) {
    assertPathComponents(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal", {
      mustExist: true,
      type: "file"
    });
  }
  renameSync(tempPath, coordinates.journalPath);
  assertPathComponents(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal", {
    mustExist: true,
    type: "file"
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expectedKeys) {
  if (!isPlainObject(value)) return false;
  const actualKeys = Object.keys(value).sort();
  return JSON.stringify(actualKeys) === JSON.stringify([...expectedKeys].sort());
}

function assertValidSnapshot(snapshot, field, journalPath) {
  if (!Array.isArray(snapshot)) {
    throw new Error(`invalid managed transaction journal ${field} in ${journalPath}`);
  }
  let previousPath = null;
  const entryTypes = new Map();
  for (const entry of snapshot) {
    const directoryEntry = entry?.type === "directory";
    const fileEntry = entry?.type === "file";
    const expectedKeys = directoryEntry
      ? ["path", "type"]
      : fileEntry
        ? ["path", "sha256", "size", "type"]
        : [];
    if (expectedKeys.length === 0 || !hasExactKeys(entry, expectedKeys)) {
      throw new Error(`invalid managed transaction journal ${field} entry in ${journalPath}`);
    }
    if (
      typeof entry.path !== "string" ||
      entry.path.length === 0 ||
      entry.path.includes("\\") ||
      entry.path.includes("\0") ||
      path.posix.isAbsolute(entry.path) ||
      path.posix.normalize(entry.path) !== entry.path ||
      entry.path === "." ||
      entry.path === ".." ||
      entry.path.startsWith("../")
    ) {
      throw new Error(`invalid managed transaction journal ${field} path in ${journalPath}`);
    }
    if (previousPath !== null && previousPath.localeCompare(entry.path) >= 0) {
      throw new Error(`invalid managed transaction journal ${field} ordering in ${journalPath}`);
    }
    previousPath = entry.path;
    const segments = entry.path.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      const ancestor = segments.slice(0, index).join("/");
      if (entryTypes.get(ancestor) === "file") {
        throw new Error(`invalid managed transaction journal ${field} file ancestry in ${journalPath}`);
      }
    }
    if (fileEntry && (
      !Number.isSafeInteger(entry.size) ||
      entry.size < 0 ||
      typeof entry.sha256 !== "string" ||
      !/^[0-9a-f]{64}$/.test(entry.sha256)
    )) {
      throw new Error(`invalid managed transaction journal ${field} file metadata in ${journalPath}`);
    }
    entryTypes.set(entry.path, entry.type);
  }
}

function assertJournalPhaseState(journal, coordinates) {
  const state = [
    Boolean(lstatIfPresent(coordinates.managedRoot)),
    Boolean(lstatIfPresent(journal.stagingRoot)),
    Boolean(lstatIfPresent(journal.backupRoot))
  ].map((value) => value ? "1" : "0").join("");
  const allowed = journal.hadManagedRoot
    ? {
        prepared: new Set(["110", "011"]),
        "backup-created": new Set(["011", "101"]),
        promoted: new Set(["101"]),
        validated: new Set(["101", "100"])
      }
    : {
        prepared: new Set(["010"]),
        "backup-created": new Set(["010", "100"]),
        promoted: new Set(["100"]),
        validated: new Set(["100"])
      };
  if (!allowed[journal.phase].has(state)) {
    throw new Error(
      `invalid managed transaction journal phase/state consistency in ${coordinates.journalPath}`
    );
  }
}

function readJournal(coordinates) {
  if (!lstatIfPresent(coordinates.journalPath)) return null;
  assertPathComponents(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal", {
    mustExist: true,
    type: "file"
  });
  let journal;
  try {
    journal = JSON.parse(readFileSync(coordinates.journalPath, "utf8"));
  } catch (error) {
    throw new Error(`invalid or torn managed transaction journal ${coordinates.journalPath}: ${error.message}`);
  }
  const journalKeys = [
    "backupRoot",
    "backupSnapshot",
    "hadManagedRoot",
    "id",
    "managedRoot",
    "outputSnapshot",
    "phase",
    "schemaVersion",
    "stagingRoot"
  ];
  if (!hasExactKeys(journal, journalKeys)) {
    throw new Error(`invalid managed transaction journal: ${coordinates.journalPath}`);
  }
  if (journal.schemaVersion !== JOURNAL_SCHEMA_VERSION || !TRANSACTION_PHASES.has(journal.phase)) {
    throw new Error(`invalid managed transaction journal: ${coordinates.journalPath}`);
  }
  if (typeof journal.id !== "string" || !UUID_V4.test(journal.id)) {
    throw new Error(`invalid managed transaction id in ${coordinates.journalPath}`);
  }
  if (typeof journal.hadManagedRoot !== "boolean") {
    throw new Error(`invalid managed transaction journal hadManagedRoot in ${coordinates.journalPath}`);
  }
  assertValidSnapshot(journal.backupSnapshot, "backupSnapshot", coordinates.journalPath);
  assertValidSnapshot(journal.outputSnapshot, "outputSnapshot", coordinates.journalPath);
  if (!journal.hadManagedRoot && journal.backupSnapshot.length !== 0) {
    throw new Error(`invalid managed transaction journal backupSnapshot in ${coordinates.journalPath}`);
  }
  const expectedCoordinates = [
    transactionCoordinates(coordinates.repositoryRoot, coordinates.managedRoot, journal.id),
    transactionCoordinates(coordinates.repositoryRoot, coordinates.managedRoot, journal.id, { legacyArtifacts: true })
  ].find((candidate) => [
    ["managedRoot", candidate.managedRoot],
    ["stagingRoot", candidate.stagingRoot],
    ["backupRoot", candidate.backupRoot]
  ].every(([field, value]) => typeof journal[field] === "string" && journal[field] === value));
  if (!expectedCoordinates) {
    throw new Error("managed transaction journal has invalid transaction paths");
  }
  assertJournalPhaseState(journal, expectedCoordinates);
  return { journal, coordinates: expectedCoordinates };
}

function renameDirectory(repositoryRoot, source, destination, label) {
  assertPathComponents(repositoryRoot, source, `${label} source`, { mustExist: true, type: "directory" });
  if (lstatIfPresent(destination)) throw new Error(`${label} destination already exists: ${destination}`);
  assertPathComponents(repositoryRoot, destination, `${label} destination`);
  renameSync(source, destination);
  assertPathComponents(repositoryRoot, destination, `${label} destination`, { mustExist: true, type: "directory" });
}

function rollbackJournal(coordinates, journal, ownership) {
  assertTransactionLockOwned(coordinates, ownership);
  const { repositoryRoot, managedRoot } = coordinates;
  const backupPresent = Boolean(lstatIfPresent(journal.backupRoot));
  if (journal.hadManagedRoot) {
    if (backupPresent) {
      validateSnapshot(repositoryRoot, journal.backupRoot, journal.backupSnapshot, "transaction backup");
      assertTransactionLockOwned(coordinates, ownership);
      removeManagedTree(repositoryRoot, managedRoot, "interrupted promoted tree");
      renameDirectory(repositoryRoot, journal.backupRoot, managedRoot, "transaction backup restore");
    } else if (["backup-created", "promoted"].includes(journal.phase)) {
      throw new Error("interrupted transaction is missing its required known-valid backup");
    }
  } else if (lstatIfPresent(managedRoot)) {
    throw new Error("refusing to delete a managed tree when the journal records no prior managed root");
  }
  removeManagedTree(repositoryRoot, journal.stagingRoot, "interrupted staging tree");
  removeRegularFile(repositoryRoot, journalTempPath(coordinates, journal), "transaction journal temporary file");
  removeRegularFile(repositoryRoot, coordinates.journalPath, "transaction journal");
}

function recoverManagedDirectoryTransactionLocked({ coordinates, ownership, log }) {
  assertTransactionLockOwned(coordinates, ownership);
  const journalRecord = readJournal(coordinates);
  if (!journalRecord) return { recovered: false, phase: null };
  const { journal } = journalRecord;
  coordinates = journalRecord.coordinates;
  if (ownership.staleLock && ownership.staleLock.transactionId !== journal.id) {
    throw new Error("stale lock transaction does not match the managed transaction journal");
  }

  if (!journal.hadManagedRoot && lstatIfPresent(coordinates.managedRoot)) {
    try {
      validateSnapshot(
        coordinates.repositoryRoot,
        coordinates.managedRoot,
        journal.outputSnapshot,
        "no-prior promoted tree"
      );
    } catch (error) {
      throw new Error(`no-prior promoted tree could not be trusted for finalization: ${error.message}`);
    }
    assertJournalPhaseState(journal, coordinates);
    assertTransactionLockOwned(coordinates, ownership);
    removeRegularFile(
      coordinates.repositoryRoot,
      journalTempPath(coordinates, journal),
      "transaction journal temporary file"
    );
    removeRegularFile(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal");
    log(`Recovered interrupted managed transaction for ${coordinates.managedRoot} from phase ${journal.phase}.`);
    return { recovered: true, phase: journal.phase, finalized: true };
  }

  if (journal.phase === "validated") {
    try {
      validateSnapshot(coordinates.repositoryRoot, coordinates.managedRoot, journal.outputSnapshot, "validated promoted tree");
      assertTransactionLockOwned(coordinates, ownership);
      removeManagedTree(coordinates.repositoryRoot, journal.backupRoot, "validated transaction backup");
      removeManagedTree(coordinates.repositoryRoot, journal.stagingRoot, "validated transaction staging");
      removeRegularFile(
        coordinates.repositoryRoot,
        journalTempPath(coordinates, journal),
        "transaction journal temporary file"
      );
      removeRegularFile(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal");
    } catch (error) {
      throw new Error(`validated managed transaction could not be trusted for cleanup: ${error.message}`);
    }
  } else {
    rollbackJournal(coordinates, journal, ownership);
  }
  log(`Recovered interrupted managed transaction for ${coordinates.managedRoot} from phase ${journal.phase}.`);
  return { recovered: true, phase: journal.phase };
}

export function recoverManagedDirectoryTransaction({ repositoryRoot, managedRoot, log = () => {} }) {
  const transactionId = randomUUID();
  const coordinates = transactionCoordinates(repositoryRoot, managedRoot, transactionId);
  const ownership = acquireTransactionLock(coordinates, transactionId, "managed directory recovery");
  try {
    return recoverManagedDirectoryTransactionLocked({ coordinates, ownership, log });
  } finally {
    releaseTransactionLock(coordinates, ownership);
  }
}

function triggerFailpoint(name) {
  if (process.env.AI_TOOLKIT_FAILPOINT !== name) return;
  const error = new Error(`managed filesystem failpoint: ${name}`);
  error.code = "AI_TOOLKIT_MANAGED_FS_FAILPOINT";
  throw error;
}

export function runManagedDirectoryTransaction({
  repositoryRoot,
  managedRoot,
  prepare,
  validate = () => {},
  beforeBackup = () => {},
  beforePromote = () => {},
  label = "managed directory",
  log = () => {}
}) {
  if (typeof beforeBackup !== "function") {
    throw new TypeError("beforeBackup must be a function");
  }
  const id = randomUUID();
  const coordinates = transactionCoordinates(repositoryRoot, managedRoot, id);
  const ownership = acquireTransactionLock(coordinates, id, label);
  try {
    recoverManagedDirectoryTransactionLocked({ coordinates, ownership, log });
    assertPathComponents(coordinates.repositoryRoot, coordinates.managedRoot, `${label} root`);
    assertPathComponents(coordinates.repositoryRoot, coordinates.stagingRoot, `${label} staging root`);
    assertPathComponents(coordinates.repositoryRoot, coordinates.backupRoot, `${label} backup root`);
    if (lstatIfPresent(coordinates.stagingRoot) || lstatIfPresent(coordinates.backupRoot)) {
      throw new Error(`${label} transaction paths already exist`);
    }

    const hadManagedRoot = Boolean(lstatIfPresent(coordinates.managedRoot));
    const backupSnapshot = hadManagedRoot
      ? snapshotManagedTree(coordinates.repositoryRoot, coordinates.managedRoot, `${label} existing tree`)
      : [];
    const stagingManager = new ManagedFilesystem({
      repositoryRoot: coordinates.repositoryRoot,
      managedRoot: coordinates.stagingRoot,
      label: `${label} staging`
    });
    let journalWritten = false;

    try {
      stagingManager.ensureDirectory(".", `${label} staging root`);
    if (hadManagedRoot) {
      copyManagedTree(coordinates.repositoryRoot, coordinates.managedRoot, stagingManager, label);
    }
    prepare(stagingManager);
    const outputSnapshot = snapshotManagedTree(
      coordinates.repositoryRoot,
      coordinates.stagingRoot,
      `${label} prepared output`
    );
    validate(stagingManager, outputSnapshot);

    const journal = {
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      id,
      phase: "prepared",
      managedRoot: coordinates.managedRoot,
      stagingRoot: coordinates.stagingRoot,
      backupRoot: coordinates.backupRoot,
      hadManagedRoot,
      backupSnapshot,
      outputSnapshot
    };
    writeJournal(coordinates, journal, ownership);
    journalWritten = true;

    beforeBackup(stagingManager, outputSnapshot);
    assertTransactionLockOwned(coordinates, ownership);
    if (hadManagedRoot) {
      renameDirectory(coordinates.repositoryRoot, coordinates.managedRoot, coordinates.backupRoot, `${label} backup`);
    }
    journal.phase = "backup-created";
    writeJournal(coordinates, journal, ownership);
    triggerFailpoint("after-backup-rename");

    beforePromote(stagingManager, outputSnapshot);
    assertTransactionLockOwned(coordinates, ownership);
    renameDirectory(coordinates.repositoryRoot, coordinates.stagingRoot, coordinates.managedRoot, `${label} promotion`);
    journal.phase = "promoted";
    writeJournal(coordinates, journal, ownership);
    triggerFailpoint("after-promotion");

    validateSnapshot(coordinates.repositoryRoot, coordinates.managedRoot, outputSnapshot, `${label} promoted output`);
    const promotedManager = new ManagedFilesystem({
      repositoryRoot: coordinates.repositoryRoot,
      managedRoot: coordinates.managedRoot,
      label: `${label} promoted`
    });
    validate(promotedManager, outputSnapshot);
    journal.phase = "validated";
    writeJournal(coordinates, journal, ownership);

    assertTransactionLockOwned(coordinates, ownership);
    removeManagedTree(coordinates.repositoryRoot, coordinates.backupRoot, `${label} validated backup`);
    removeRegularFile(coordinates.repositoryRoot, coordinates.journalPath, "transaction journal");
    return { outputSnapshot };
    } catch (error) {
      if (error?.code === "AI_TOOLKIT_MANAGED_FS_FAILPOINT") throw error;
      if (journalWritten) {
        recoverManagedDirectoryTransactionLocked({ coordinates, ownership, log });
      } else {
        removeManagedTree(coordinates.repositoryRoot, coordinates.stagingRoot, `${label} failed staging`);
      }
      throw error;
    }
  } finally {
    releaseTransactionLock(coordinates, ownership);
  }
}
