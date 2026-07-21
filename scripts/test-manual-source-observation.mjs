#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  linkSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  applySourceReview,
  recordManualSourceObservation,
  validateSourceCatalog
} from "./ai-toolkit/source-governance.mjs";
import { recoverManagedDirectoryTransaction } from "../install/safe-filesystem.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL_CATALOG = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
const LATEST_CHECK = Math.max(...CANONICAL_CATALOG.sources.map((source) => Date.parse(source.monitor.checkedAt)));
const OBSERVED_AT = new Date(LATEST_CHECK + 1_000).toISOString();
const REVIEW_NOW = new Date(Date.parse(OBSERVED_AT) + 120_000).toISOString();

function canonicalDigest(text) {
  return `sha256:${createHash("sha256").update(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n"), "utf8").digest("hex")}`;
}

function createFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "manual-source-observation-repository-"));
  const inputRoot = mkdtempSync(path.join(os.tmpdir(), "manual-source-observation-input-"));
  cpSync(path.join(ROOT, "sources"), path.join(root, "sources"), { recursive: true });
  const catalogPath = path.join(root, "sources", "source-watchlist.json");
  const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
  catalog.approverPolicy.authorizedIdentities = ["fixture:reviewer"];
  writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  const manual = catalog.sources.find((source) => source.sourceType === "manual-reviewed-doc");
  assert.ok(manual, "fixture requires a manual-reviewed-doc source");
  return { root, inputRoot, catalogPath, manual };
}

function writeInput(inputRoot, name, value) {
  const candidate = path.join(inputRoot, name);
  writeFileSync(candidate, value);
  return candidate;
}

function cleanup({ root, inputRoot }) {
  rmSync(root, { recursive: true, force: true });
  rmSync(inputRoot, { recursive: true, force: true });
}

function sourceFilePaths(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  };
  visit(path.join(root, "sources"));
  return files.sort();
}

function receiptFor(source, digest, artifactRevision) {
  return {
    schemaVersion: "1.0.0",
    receiptId: `${source.id}:${digest}`,
    sourceId: source.id,
    reviewedRevision: { kind: "content-digest", value: digest },
    contentDigest: digest,
    reviewedAt: new Date(Date.parse(OBSERVED_AT) + 60_000).toISOString(),
    expiresAt: new Date(Date.parse(OBSERVED_AT) + 13 * 24 * 60 * 60 * 1_000).toISOString(),
    licenseReview: {
      classification: "unknown",
      evidence: ["Official documentation terms were reviewed by an authorized approver."],
      notes: "Manual source receipt remains reference-only."
    },
    securityReview: {
      status: "passed",
      evidence: ["Downloaded content was reviewed without execution."],
      dangerousOperations: [],
      networkBehavior: ["No upstream code was executed."],
      secretAccess: ["No credential access was permitted."]
    },
    promptInjectionReview: {
      status: "passed",
      evidence: ["Source instructions were treated as untrusted content."],
      rejectedInstructions: []
    },
    adoption: {
      disposition: "SYNCED_REFERENCE",
      summary: "Retained only as reviewed reference evidence.",
      cleanRoomOnly: true,
      runtimePosture: source.runtimePosture
    },
    affectedArtifacts: source.affectedArtifacts,
    artifactEvidence: {
      mode: "reference-only-no-copy",
      noCopy: true,
      reason: "No downloaded source content was copied or adopted."
    },
    approver: {
      identity: "fixture:reviewer",
      approvedAt: REVIEW_NOW
    },
    rollbackTarget: {
      previousReceipt: null,
      previousReceiptDigest: null,
      artifactRevision
    }
  };
}

test("manual observation defaults to dry-run and records only normalized monitor evidence when confirmed", async () => {
  const fixture = createFixture();
  try {
    const originalCatalog = readFileSync(fixture.catalogPath, "utf8");
    const original = JSON.parse(originalCatalog);
    const inputText = "Manual downloaded document\r\nwith CRLF line endings\r\n";
    const contentFile = writeInput(fixture.inputRoot, "downloaded-document.txt", inputText);
    const expectedDigest = canonicalDigest(inputText);
    const filesBefore = sourceFilePaths(fixture.root);

    const dryRun = await recordManualSourceObservation({
      repositoryRoot: fixture.root,
      sourceId: fixture.manual.id,
      contentFile,
      observedAt: OBSERVED_AT,
      now: REVIEW_NOW
    });
    assert.equal(dryRun.mode, "dry-run");
    assert.equal(dryRun.monitorState, "CHANGED");
    assert.equal(dryRun.contentDigest, expectedDigest);
    assert.deepEqual(dryRun.observedRevision, { kind: "content-digest", value: expectedDigest });
    assert.equal(dryRun.reviewsApproved, false);
    assert.equal(dryRun.runtimePosturesChanged, false);
    assert.equal(readFileSync(fixture.catalogPath, "utf8"), originalCatalog);

    const applied = await recordManualSourceObservation({
      repositoryRoot: fixture.root,
      sourceId: fixture.manual.id,
      contentFile,
      observedAt: OBSERVED_AT,
      etag: "\"manual-etag-1\"",
      lastModified: "Mon, 20 Jul 2026 10:00:00 GMT",
      mode: "confirm-write",
      now: REVIEW_NOW
    });
    assert.equal(applied.mode, "confirm-write");
    assert.equal(applied.reviewsApproved, false);
    assert.equal(applied.runtimePosturesChanged, false);
    assert.equal(applied.generatedMirrorsUpdated, false);

    const updated = JSON.parse(readFileSync(fixture.catalogPath, "utf8"));
    const observed = updated.sources.find((source) => source.id === fixture.manual.id);
    const originalManual = original.sources.find((source) => source.id === fixture.manual.id);
    assert.deepEqual(observed.monitor, {
      state: "CHANGED",
      checkedAt: OBSERVED_AT,
      observedRevision: { kind: "content-digest", value: expectedDigest },
      contentDigest: expectedDigest,
      failureReason: null
    });
    assert.deepEqual(observed.review, originalManual.review);
    assert.equal(observed.runtimePosture, originalManual.runtimePosture);
    assert.equal(observed.neverAutoImport, true);
    assert.deepEqual(sourceFilePaths(fixture.root), filesBefore);
    assert.equal(readFileSync(fixture.catalogPath, "utf8").includes(inputText), false);
    validateSourceCatalog(updated, { now: REVIEW_NOW });
  } finally {
    cleanup(fixture);
  }
});

test("manual observation canonicalizes a leading UTF-8 BOM before computing the LF-normalized digest", async () => {
  const fixture = createFixture();
  try {
    const plainText = "Manual downloaded document\r\nwith CRLF line endings\r\n";
    const plain = writeInput(fixture.inputRoot, "plain-document.txt", plainText);
    const bomPrefixed = writeInput(
      fixture.inputRoot,
      "bom-prefixed-document.txt",
      Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(plainText, "utf8")])
    );
    const plainObservation = await recordManualSourceObservation({
      repositoryRoot: fixture.root,
      sourceId: fixture.manual.id,
      contentFile: plain,
      observedAt: OBSERVED_AT,
      now: REVIEW_NOW
    });
    const bomObservation = await recordManualSourceObservation({
      repositoryRoot: fixture.root,
      sourceId: fixture.manual.id,
      contentFile: bomPrefixed,
      observedAt: OBSERVED_AT,
      now: REVIEW_NOW
    });
    assert.equal(bomObservation.contentDigest, plainObservation.contentDigest);
    assert.equal(bomObservation.contentDigest, canonicalDigest(plainText));
  } finally {
    cleanup(fixture);
  }
});

test("manual observation command keeps the required CLI dry-run default and verifies an optional source URL claim", () => {
  const fixture = createFixture();
  try {
    const originalCatalog = readFileSync(fixture.catalogPath, "utf8");
    const contentFile = writeInput(fixture.inputRoot, "downloaded-document.txt", "Manual document\n");
    const output = execFileSync(process.execPath, [
      path.join(ROOT, "scripts", "record-manual-source-observation.mjs"),
      "--source-id", fixture.manual.id,
      "--content-file", contentFile,
      "--observed-at", OBSERVED_AT,
      "--source-url", fixture.manual.sourceUrl
    ], { cwd: fixture.root, encoding: "utf8" });
    const result = JSON.parse(output);
    assert.equal(result.mode, "dry-run");
    assert.equal(readFileSync(fixture.catalogPath, "utf8"), originalCatalog);

    assert.throws(
      () => execFileSync(process.execPath, [
        path.join(ROOT, "scripts", "record-manual-source-observation.mjs"),
        "--source-id", fixture.manual.id,
        "--content-file", contentFile,
        "--observed-at", OBSERVED_AT,
        "--source-url", "https://wrong.example.invalid/document"
      ], { cwd: fixture.root, encoding: "utf8", stdio: "pipe" }),
      /source URL.*does not match/i
    );
  } finally {
    cleanup(fixture);
  }
});

test("manual observation rejects non-manual sources, unsafe temporary inputs, invalid UTF-8, oversized content, and future observations", async () => {
  const fixture = createFixture();
  try {
    const contentFile = writeInput(fixture.inputRoot, "downloaded-document.txt", "Manual document\n");
    const githubSource = JSON.parse(readFileSync(fixture.catalogPath, "utf8")).sources.find((source) => source.sourceType === "github-repo");
    assert.ok(githubSource, "fixture requires a GitHub source");

    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: githubSource.id,
        contentFile,
        observedAt: OBSERVED_AT,
        now: REVIEW_NOW
      }),
      /manual-reviewed-doc/i
    );
    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile: path.relative(fixture.root, contentFile),
        observedAt: OBSERVED_AT,
        now: REVIEW_NOW
      }),
      /absolute temporary file/i
    );

    const original = writeInput(fixture.inputRoot, "original.txt", "Manual document\n");
    const linked = path.join(fixture.inputRoot, "linked.txt");
    linkSync(original, linked);
    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile: linked,
        observedAt: OBSERVED_AT,
        now: REVIEW_NOW
      }),
      /hard-linked|linked/i
    );

    const invalidUtf8 = writeInput(fixture.inputRoot, "invalid-utf8.txt", Buffer.from([0xc3, 0x28]));
    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile: invalidUtf8,
        observedAt: OBSERVED_AT,
        now: REVIEW_NOW
      }),
      /valid UTF-8/i
    );

    const oversized = writeInput(fixture.inputRoot, "oversized.txt", Buffer.alloc(1_048_577, 0x61));
    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile: oversized,
        observedAt: OBSERVED_AT,
        now: REVIEW_NOW
      }),
      /maximum size/i
    );
    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile,
        observedAt: new Date(Date.parse(REVIEW_NOW) + 1_000).toISOString(),
        now: REVIEW_NOW
      }),
      /must not be in the future/i
    );
  } finally {
    cleanup(fixture);
  }
});

test("manual observation rejects a temporary input that is replaced after pathname validation", async () => {
  const fixture = createFixture();
  try {
    const originalCatalog = readFileSync(fixture.catalogPath, "utf8");
    const contentFile = writeInput(fixture.inputRoot, "downloaded-document.txt", "Validated document\n");
    const replacement = writeInput(fixture.inputRoot, "replacement-document.txt", "Replacement content\n");
    let validationHookRan = false;

    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile,
        observedAt: OBSERVED_AT,
        now: REVIEW_NOW,
        testHooks: {
          afterContentPathValidated() {
            validationHookRan = true;
            rmSync(contentFile);
            renameSync(replacement, contentFile);
          }
        }
      }),
      /changed after validation/i
    );
    assert.equal(validationHookRan, true);
    assert.equal(readFileSync(fixture.catalogPath, "utf8"), originalCatalog);
  } finally {
    cleanup(fixture);
  }
});

test("a standard approved receipt can later promote a manual CHANGED observation to REVIEWED_CURRENT", async () => {
  const fixture = createFixture();
  try {
    const contentFile = writeInput(fixture.inputRoot, "downloaded-document.txt", "Manual document\n");
    const observed = await recordManualSourceObservation({
      repositoryRoot: fixture.root,
      sourceId: fixture.manual.id,
      contentFile,
      observedAt: OBSERVED_AT,
      mode: "confirm-write",
      now: REVIEW_NOW
    });
    execFileSync("git", ["init", "--quiet"], { cwd: fixture.root });
    execFileSync("git", ["add", "--", "sources"], { cwd: fixture.root });
    execFileSync("git", [
      "-c", "user.name=Source Governance Fixture",
      "-c", "user.email=fixture@example.invalid",
      "commit", "--quiet", "-m", "fixture baseline"
    ], { cwd: fixture.root });
    const artifactRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: fixture.root, encoding: "utf8" }).trim();
    const receipt = receiptFor(fixture.manual, observed.contentDigest, artifactRevision);
    const pendingPath = path.join(fixture.root, "sources", "pending-receipt.json");
    writeFileSync(pendingPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");

    await applySourceReview({
      repositoryRoot: fixture.root,
      receiptPath: "sources/pending-receipt.json",
      mode: "confirm-write",
      now: REVIEW_NOW
    });
    const updated = JSON.parse(readFileSync(fixture.catalogPath, "utf8"));
    const reviewed = updated.sources.find((source) => source.id === fixture.manual.id);
    assert.equal(reviewed.monitor.state, "CURRENT");
    assert.equal(reviewed.review.state, "REVIEWED_CURRENT");
    assert.equal(reviewed.review.reviewedDigest, observed.contentDigest);
    assert.equal(reviewed.runtimePosture, fixture.manual.runtimePosture);
  } finally {
    cleanup(fixture);
  }
});

test("failed manual-observation writes recover atomically to the prior valid catalog", async () => {
  const fixture = createFixture();
  try {
    const originalCatalog = readFileSync(fixture.catalogPath, "utf8");
    const contentFile = writeInput(fixture.inputRoot, "downloaded-document.txt", "Manual document\n");
    process.env.AI_TOOLKIT_FAILPOINT = "after-backup-rename";
    await assert.rejects(
      recordManualSourceObservation({
        repositoryRoot: fixture.root,
        sourceId: fixture.manual.id,
        contentFile,
        observedAt: OBSERVED_AT,
        mode: "confirm-write",
        now: REVIEW_NOW
      }),
      /managed filesystem failpoint/i
    );
    recoverManagedDirectoryTransaction({
      repositoryRoot: fixture.root,
      managedRoot: path.join(fixture.root, "sources")
    });
    assert.equal(readFileSync(fixture.catalogPath, "utf8"), originalCatalog);
    validateSourceCatalog(JSON.parse(originalCatalog), { now: REVIEW_NOW });
  } finally {
    delete process.env.AI_TOOLKIT_FAILPOINT;
    cleanup(fixture);
  }
});
