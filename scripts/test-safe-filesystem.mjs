#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import * as safeFilesystemModule from "../install/safe-filesystem.mjs";
import {
  ManagedFilesystem,
  assertManagedNewFilePath,
  recoverManagedDirectoryTransaction,
  runManagedDirectoryTransaction,
  writeManagedNewFile
} from "../install/safe-filesystem.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SAFE_FILESYSTEM_URL = pathToFileURL(path.join(ROOT, "install", "safe-filesystem.mjs")).href;

function writeSentinel(root, contents) {
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, "sentinel.txt"), contents, "utf8");
}

function fileSnapshot(relativePath, contents) {
  return [{
    path: relativePath,
    type: "file",
    size: Buffer.byteLength(contents, "utf8"),
    sha256: createHash("sha256").update(contents).digest("hex")
  }];
}

function transactionArtifacts(root) {
  return readdirSync(root).filter((name) => /^(?:\.managed\.(?:staging|backup)-|\.[sb]-[0-9a-f]+)$/i.test(name));
}

async function waitForFile(filePath, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (!existsSync(filePath)) {
    if (Date.now() - startedAt > timeoutMs) throw new Error(`timed out waiting for ${filePath}`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function waitForChild(child) {
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => { stdout += chunk; });
  child.stderr?.on("data", (chunk) => { stderr += chunk; });
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  return { ...result, stdout, stderr };
}

function spawnTransactionChild(source) {
  return spawn(process.execPath, ["--input-type=module", "--eval", source], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });
}

function windowsShortPathAlias(candidate) {
  const result = spawnSync(process.env.ComSpec || "cmd.exe", [
    "/d",
    "/c",
    `for %I in ("${candidate}") do @echo %~sI`
  ], { encoding: "utf8", windowsHide: true, windowsVerbatimArguments: true, timeout: 10_000 });
  if (result.error || result.status !== 0) return null;
  const alias = String(result.stdout ?? "").trim().replace(/^"|"$/gu, "");
  return alias && alias.toLowerCase() !== candidate.toLowerCase() ? alias : null;
}

test("a live per-root transaction lock rejects a concurrent writer", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-live-lock-"));
  const managedRoot = path.join(fixture, "managed");
  const readyPath = path.join(fixture, "writer-ready");
  const releasePath = path.join(fixture, "writer-release");
  writeSentinel(managedRoot, "current\n");
  const child = spawnTransactionChild(`
    import { existsSync, writeFileSync } from "node:fs";
    import { runManagedDirectoryTransaction } from ${JSON.stringify(SAFE_FILESYSTEM_URL)};
    runManagedDirectoryTransaction({
      repositoryRoot: ${JSON.stringify(fixture)},
      managedRoot: ${JSON.stringify(managedRoot)},
      prepare(filesystem) {
        filesystem.writeFile("sentinel.txt", "writer-one\\n", "utf8");
        writeFileSync(${JSON.stringify(readyPath)}, "ready\\n", "utf8");
        while (!existsSync(${JSON.stringify(releasePath)})) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
      }
    });
  `);
  try {
    await waitForFile(readyPath);
    assert.throws(() => runManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot,
      label: "writer two",
      prepare: (filesystem) => filesystem.writeFile("second.txt", "writer-two\n", "utf8")
    }), /transaction lock.*live|live.*transaction lock|already.*locked/i);
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "current\n");
  } finally {
    writeFileSync(releasePath, "release\n", "utf8");
    const result = await waitForChild(child);
    assert.equal(result.code, 0, `${result.stdout}\n${result.stderr}`);
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("a dead owner's same-transaction lock permits bounded journal recovery", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-stale-lock-"));
  const managedRoot = path.join(fixture, "managed");
  writeSentinel(managedRoot, "current\n");
  const child = spawnTransactionChild(`
    import { runManagedDirectoryTransaction } from ${JSON.stringify(SAFE_FILESYSTEM_URL)};
    runManagedDirectoryTransaction({
      repositoryRoot: ${JSON.stringify(fixture)},
      managedRoot: ${JSON.stringify(managedRoot)},
      prepare: (filesystem) => filesystem.writeFile("sentinel.txt", "candidate\\n", "utf8"),
      beforePromote() { process.exit(73); }
    });
  `);
  try {
    const result = await waitForChild(child);
    assert.equal(result.code, 73, `${result.stdout}\n${result.stderr}`);
    const lockPath = path.join(fixture, ".managed.transaction.lock");
    assert.equal(existsSync(lockPath), true, "a hard process exit must leave owner evidence");

    const recovery = recoverManagedDirectoryTransaction({ repositoryRoot: fixture, managedRoot });
    assert.equal(recovery.recovered, true);
    assert.equal(recovery.phase, "backup-created");
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "current\n");
    assert.equal(existsSync(lockPath), false);
    assert.equal(existsSync(path.join(fixture, ".managed.transaction.json")), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("a stale lock from another transaction cannot authorize journal rollback", async () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-cross-transaction-lock-"));
  const managedRoot = path.join(fixture, "managed");
  writeSentinel(managedRoot, "current\n");
  const child = spawnTransactionChild(`
    import { runManagedDirectoryTransaction } from ${JSON.stringify(SAFE_FILESYSTEM_URL)};
    runManagedDirectoryTransaction({
      repositoryRoot: ${JSON.stringify(fixture)},
      managedRoot: ${JSON.stringify(managedRoot)},
      prepare: (filesystem) => filesystem.writeFile("sentinel.txt", "candidate\\n", "utf8"),
      beforePromote() { process.exit(74); }
    });
  `);
  try {
    const result = await waitForChild(child);
    assert.equal(result.code, 74, `${result.stdout}\n${result.stderr}`);
    const lockPath = path.join(fixture, ".managed.transaction.lock");
    const lock = JSON.parse(readFileSync(lockPath, "utf8"));
    lock.transactionId = "22222222-2222-4222-8222-222222222222";
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");

    assert.throws(
      () => recoverManagedDirectoryTransaction({ repositoryRoot: fixture, managedRoot }),
      /stale lock.*transaction.*journal|journal.*stale lock.*transaction/i
    );
    assert.equal(existsSync(lockPath), true, "mismatched stale owner evidence must be preserved");
    assert.equal(existsSync(path.join(fixture, ".managed.transaction.json")), true);
    assert.equal(existsSync(JSON.parse(readFileSync(path.join(fixture, ".managed.transaction.json"), "utf8")).backupRoot), true);
    assert.equal(existsSync(managedRoot), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("Windows exact-root rejection is case-insensitive", { skip: process.platform !== "win32" }, () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-root-case-"));
  try {
    const alternateCase = `${fixture[0] === fixture[0].toUpperCase() ? fixture[0].toLowerCase() : fixture[0].toUpperCase()}${fixture.slice(1)}`;
    assert.throws(() => new ManagedFilesystem({
      repositoryRoot: fixture,
      managedRoot: alternateCase,
      label: "case-insensitive exact root"
    }), /exact managed root below the repository root/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("Windows rejects a name-surrogate junction using the strongest portable Node link checks", { skip: process.platform !== "win32" }, () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-junction-"));
  try {
    const target = path.join(fixture, "junction-target");
    const junction = path.join(fixture, "managed");
    mkdirSync(target, { recursive: true });
    symlinkSync(target, junction, "junction");
    assert.throws(() => new ManagedFilesystem({
      repositoryRoot: fixture,
      managedRoot: junction,
      label: "Windows name-surrogate reparse path"
    }), /linked|junction|reparse/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("Windows reparse negative-cache eligibility excludes UNC, extended UNC, and non-system drives", () => {
  assert.equal(typeof safeFilesystemModule.isWindowsNonReparseCacheEligible, "function");
  const isEligible = safeFilesystemModule.isWindowsNonReparseCacheEligible;
  assert.equal(isEligible("C:\\repo\\managed", "C:"), true);
  assert.equal(isEligible("\\\\server\\share\\managed", "C:"), false);
  assert.equal(isEligible("\\\\?\\UNC\\server\\share\\managed", "C:"), false);
  assert.equal(isEligible("Z:\\mapped\\managed", "C:"), false);
});

test("Windows containment permits a verified local 8.3 spelling alias", { skip: process.platform !== "win32" }, (context) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-8dot3-alias-"));
  const originalRoot = path.join(fixture, "long-parent-component-for-alias", "managed-root");
  try {
    mkdirSync(originalRoot, { recursive: true });
    const aliasRoot = windowsShortPathAlias(originalRoot);
    if (!aliasRoot) {
      context.skip("the test volume does not expose a distinct Windows 8.3 path alias");
      return;
    }
    assert.doesNotThrow(() => safeFilesystemModule.assertPathContained(
      aliasRoot,
      path.join(aliasRoot, "child"),
      "Windows 8.3 alias containment"
    ));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("Windows containment rejects a root beneath a parent junction", { skip: process.platform !== "win32" }, () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-parent-junction-"));
  const target = mkdtempSync(path.join(tmpdir(), "managed-fs-parent-junction-target-"));
  const junction = path.join(fixture, "redirecting-parent");
  try {
    mkdirSync(path.join(target, "managed-root"), { recursive: true });
    symlinkSync(target, junction, "junction");
    assert.throws(() => safeFilesystemModule.assertPathContained(
      fixture,
      path.join(junction, "managed-root"),
      "root beneath a parent junction"
    ), /linked|junction|reparse/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test("POSIX containment rejects a root beneath a symlinked ancestor", { skip: process.platform === "win32" }, () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-parent-symlink-"));
  const target = mkdtempSync(path.join(tmpdir(), "managed-fs-parent-symlink-target-"));
  const linkedParent = path.join(fixture, "redirecting-parent");
  try {
    mkdirSync(path.join(target, "managed-root"), { recursive: true });
    symlinkSync(target, linkedParent, "dir");
    assert.throws(() => safeFilesystemModule.assertPathContained(
      fixture,
      path.join(linkedParent, "managed-root"),
      "root beneath a POSIX symlink ancestor"
    ), /linked|symlink|reparse/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test("Windows native reparse attribute probe accepts only a completed non-reparse result", () => {
  assert.equal(typeof safeFilesystemModule.assertWindowsNativeAttributeProbeResult, "function");
  const assertProbe = safeFilesystemModule.assertWindowsNativeAttributeProbeResult;
  const candidate = "C:\\managed\\candidate";
  const label = "native probe fixture";
  assert.doesNotThrow(() => assertProbe({ status: 0, signal: null, stdout: "16" }, candidate, label));
  assert.throws(
    () => assertProbe({ status: 0, signal: null, stdout: "1024" }, candidate, label),
    /linked|junction|reparse/i
  );
  for (const result of [
    { status: 0, signal: null, stdout: "not-a-number" },
    { status: 0, signal: null, stdout: "16trailing" },
    { status: 0, signal: null, stdout: "-3" },
    { status: 1, signal: null, stdout: "16" },
    { status: null, signal: "SIGTERM", stdout: "16" },
    { status: null, signal: null, error: new Error("spawn EPERM"), stdout: "" }
  ]) {
    assert.throws(
      () => assertProbe(result, candidate, label),
      /could not verify Windows reparse-point state/i
    );
  }
});

test("Windows containment accepts an existing local path longer than MAX_PATH", { skip: process.platform !== "win32" }, () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-long-path-"));
  const longDirectory = path.join(
    fixture,
    ...Array.from({ length: 8 }, (_, index) => `segment-${index}-${"x".repeat(32)}`)
  );
  try {
    mkdirSync(longDirectory, { recursive: true });
    assert.ok(longDirectory.length > 260, `fixture must exceed MAX_PATH: ${longDirectory.length}`);
    assert.doesNotThrow(() => safeFilesystemModule.assertPathContained(
      fixture,
      longDirectory,
      "long Windows containment path"
    ));
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("Windows containment rejects a reparse point at a path longer than MAX_PATH", { skip: process.platform !== "win32" }, () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-long-reparse-"));
  const target = mkdtempSync(path.join(tmpdir(), "managed-fs-long-reparse-target-"));
  const parent = path.join(
    fixture,
    ...Array.from({ length: 8 }, (_, index) => `segment-${index}-${"x".repeat(32)}`)
  );
  const linked = path.join(parent, "linked");
  try {
    mkdirSync(parent, { recursive: true });
    assert.ok(linked.length > 260, `fixture must exceed MAX_PATH: ${linked.length}`);
    symlinkSync(target, linked, "junction");
    assert.throws(() => safeFilesystemModule.assertPathContained(
      fixture,
      linked,
      "long Windows reparse path"
    ), /linked|junction|reparse/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test("managed new-file paths reject NTFS streams, device aliases, and trailing dot or space segments", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-portable-name-"));
  try {
    for (const unsafeName of [
      "report.json:stream",
      "CON",
      "con.txt",
      "PRN.json",
      "AUX ",
      "NUL.",
      "CLOCK$.txt",
      "CONOUT$",
      "COM0.log",
      "COM1.log",
      "LPT9",
      "nested. /result.json"
    ]) {
      assert.throws(
        () => assertManagedNewFilePath({
          root: fixture,
          candidate: path.join(fixture, ...unsafeName.split("/")),
          label: "portable output"
        }),
        /unsafe Windows|alternate data stream|device|trailing dot|trailing space/i,
        unsafeName
      );
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("managed new-file writes are exact-root contained and use exclusive creation", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-new-file-"));
  const outside = path.join(path.dirname(fixture), `${path.basename(fixture)}-outside.json`);
  try {
    const output = path.join(fixture, "result.json");
    assert.equal(
      writeManagedNewFile({ root: fixture, candidate: output, contents: "first\n", label: "test output" }),
      output
    );
    assert.equal(readFileSync(output, "utf8"), "first\n");
    assert.throws(
      () => writeManagedNewFile({ root: fixture, candidate: output, contents: "second\n", label: "test output" }),
      /already exists|exclusive|overwrite/i
    );
    assert.equal(readFileSync(output, "utf8"), "first\n");
    assert.throws(
      () => writeManagedNewFile({ root: fixture, candidate: outside, contents: "escape\n", label: "test output" }),
      /outside|contained|exact managed root/i
    );
    assert.equal(existsSync(outside), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});

test("managed new-file writes reject linked parent components", (context) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-new-file-link-"));
  const target = mkdtempSync(path.join(tmpdir(), "managed-fs-new-file-link-target-"));
  try {
    const linked = path.join(fixture, "linked");
    try {
      symlinkSync(target, linked, process.platform === "win32" ? "junction" : "dir");
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("host does not permit creating a test link");
        return;
      }
      throw error;
    }
    assert.throws(
      () => writeManagedNewFile({
        root: fixture,
        candidate: path.join(linked, "result.json"),
        contents: "escape\n",
        label: "linked output"
      }),
      /linked|symlink|junction|reparse/i
    );
    assert.equal(existsSync(path.join(target, "result.json")), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(target, { recursive: true, force: true });
  }
});

test("managed new-file writes reject a linked final-file component", (context) => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-new-file-final-link-"));
  const targetRoot = mkdtempSync(path.join(tmpdir(), "managed-fs-new-file-final-target-"));
  const target = process.platform === "win32" ? targetRoot : path.join(targetRoot, "target.json");
  const sentinel = process.platform === "win32" ? path.join(targetRoot, "sentinel.txt") : target;
  const linked = path.join(fixture, "result.json");
  try {
    writeFileSync(sentinel, "original\n", "utf8");
    try {
      symlinkSync(target, linked, process.platform === "win32" ? "junction" : "file");
    } catch (error) {
      if (error?.code === "EPERM") {
        context.skip("host does not permit creating a test link");
        return;
      }
      throw error;
    }
    assert.throws(
      () => writeManagedNewFile({ root: fixture, candidate: linked, contents: "replacement\n", label: "linked output" }),
      /linked|symlink|junction|reparse/i
    );
    assert.equal(readFileSync(sentinel, "utf8"), "original\n");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(targetRoot, { recursive: true, force: true });
  }
});

test("beforeBackup CAS failure preserves the current root and removes transaction artifacts", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-before-backup-cas-"));
  try {
    const managedRoot = path.join(fixture, "managed");
    writeSentinel(managedRoot, "current\n");

    assert.throws(() => runManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot,
      label: "before-backup CAS fixture",
      prepare: (filesystem) => filesystem.writeFile("sentinel.txt", "candidate\n", "utf8"),
      beforeBackup: () => {
        throw new Error("catalog compare-and-swap failed");
      }
    }), /compare-and-swap failed/i);

    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "current\n");
    assert.equal(existsSync(path.join(fixture, ".managed.transaction.json")), false);
    assert.deepEqual(transactionArtifacts(fixture), []);
    assert.throws(() => runManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot,
      prepare: () => {},
      beforeBackup: "not-a-function"
    }), /beforeBackup must be a function/i);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("truncated transaction journals fail closed without deleting any transaction tree", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-truncated-journal-"));
  try {
    const managedRoot = path.join(fixture, "managed");
    const stagingRoot = path.join(fixture, ".managed.staging-truncated");
    const backupRoot = path.join(fixture, ".managed.backup-truncated");
    writeSentinel(managedRoot, "managed\n");
    writeSentinel(stagingRoot, "staging\n");
    writeSentinel(backupRoot, "backup\n");
    writeFileSync(path.join(fixture, ".managed.transaction.json"), "{\"schemaVersion\":\"1.0.0\",", "utf8");

    assert.throws(() => recoverManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot
    }), /JSON|journal|unexpected/i);
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "managed\n");
    assert.equal(readFileSync(path.join(stagingRoot, "sentinel.txt"), "utf8"), "staging\n");
    assert.equal(readFileSync(path.join(backupRoot, "sentinel.txt"), "utf8"), "backup\n");
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("forged no-prior promoted state-100 journal preserves mismatched current managed tree", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-forged-journal-"));
  try {
    const id = "11111111-1111-4111-8111-111111111111";
    const managedRoot = path.join(fixture, "managed");
    const stagingRoot = path.join(fixture, `.managed.staging-${id}`);
    const backupRoot = path.join(fixture, `.managed.backup-${id}`);
    writeSentinel(managedRoot, "managed\n");
    const journalPath = path.join(fixture, ".managed.transaction.json");
    writeFileSync(journalPath, `${JSON.stringify({
      schemaVersion: "1.0.0",
      id,
      phase: "promoted",
      managedRoot,
      stagingRoot,
      backupRoot,
      hadManagedRoot: false,
      backupSnapshot: [],
      outputSnapshot: fileSnapshot("sentinel.txt", "different promoted output\n")
    }, null, 2)}\n`, "utf8");

    assert.throws(() => recoverManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot
    }), /digest|output|trust|validation/i);
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "managed\n");
    assert.equal(existsSync(stagingRoot), false);
    assert.equal(existsSync(backupRoot), false);
    assert.equal(existsSync(journalPath), true);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("valid legacy backup-created journal restores the prior managed tree and removes every transaction artifact", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-legacy-recovery-"));
  try {
    const id = "11111111-1111-4111-8111-111111111111";
    const managedRoot = path.join(fixture, "managed");
    const stagingRoot = path.join(fixture, `.managed.staging-${id}`);
    const backupRoot = path.join(fixture, `.managed.backup-${id}`);
    const journalPath = path.join(fixture, ".managed.transaction.json");
    writeSentinel(stagingRoot, "candidate\n");
    writeSentinel(backupRoot, "current\n");
    writeFileSync(journalPath, `${JSON.stringify({
      schemaVersion: "1.0.0",
      id,
      phase: "backup-created",
      managedRoot,
      stagingRoot,
      backupRoot,
      hadManagedRoot: true,
      backupSnapshot: fileSnapshot("sentinel.txt", "current\n"),
      outputSnapshot: fileSnapshot("sentinel.txt", "candidate\n")
    }, null, 2)}\n`, "utf8");

    const recovery = recoverManagedDirectoryTransaction({ repositoryRoot: fixture, managedRoot });

    assert.equal(recovery.recovered, true);
    assert.equal(recovery.phase, "backup-created");
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "current\n");
    assert.equal(existsSync(journalPath), false);
    assert.deepEqual(transactionArtifacts(fixture), []);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("legitimate no-prior promotion recovery validates and finalizes promoted output", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "managed-fs-no-prior-promotion-"));
  const managedRoot = path.join(fixture, "managed");
  const previousFailpoint = process.env.AI_TOOLKIT_FAILPOINT;
  try {
    process.env.AI_TOOLKIT_FAILPOINT = "after-promotion";
    assert.throws(() => runManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot,
      label: "no-prior promotion fixture",
      prepare: (filesystem) => filesystem.writeFile("sentinel.txt", "promoted\n", "utf8")
    }), /after-promotion/i);
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "promoted\n");

    delete process.env.AI_TOOLKIT_FAILPOINT;
    const recovery = recoverManagedDirectoryTransaction({ repositoryRoot: fixture, managedRoot });

    assert.equal(recovery.recovered, true);
    assert.equal(recovery.phase, "promoted");
    assert.equal(readFileSync(path.join(managedRoot, "sentinel.txt"), "utf8"), "promoted\n");
    assert.equal(existsSync(path.join(fixture, ".managed.transaction.json")), false);
    assert.deepEqual(transactionArtifacts(fixture), []);
  } finally {
    if (previousFailpoint === undefined) delete process.env.AI_TOOLKIT_FAILPOINT;
    else process.env.AI_TOOLKIT_FAILPOINT = previousFailpoint;
    rmSync(fixture, { recursive: true, force: true });
  }
});
