import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertRegularFileWithin } from "../../../install/safe-filesystem.mjs";
import { readCanonicalJsonDocumentWithin } from "./canonical-json.mjs";
import {
  validateSourceCatalog,
  validateSourceReviewReceipt
} from "./source-catalog-contract.mjs";

const CATALOG_PATH = "sources/source-watchlist.json";

function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function sha256Bytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function sameRevision(left, right) {
  if (left === null || right === null) return left === right;
  return Boolean(left && right && left.kind === right.kind && left.value === right.value);
}

function receiptRelativePath(receipt) {
  const revision = receipt.reviewedRevision.value.replace(/^sha256:/, "");
  return `sources/reviews/${receipt.sourceId}/${revision}.json`;
}

function historicalReceiptSource(source, receipt) {
  return {
    ...source,
    monitor: {
      state: "CURRENT",
      checkedAt: receipt.reviewedAt,
      observedRevision: receipt.reviewedRevision,
      contentDigest: receipt.contentDigest,
      failureReason: null
    },
    runtimePosture: receipt.adoption?.runtimePosture ?? source.runtimePosture,
    affectedArtifacts: Array.isArray(receipt.affectedArtifacts)
      ? receipt.affectedArtifacts
      : source.affectedArtifacts
  };
}

async function readDocument(repositoryRoot, relativePath, label) {
  return readCanonicalJsonDocumentWithin(
    repositoryRoot,
    path.resolve(repositoryRoot, ...relativePath.split("/")),
    label
  );
}

async function readRegularEvidence(repositoryRoot, relativePath, label) {
  const candidate = path.resolve(repositoryRoot, ...relativePath.split("/"));
  const trustedPath = assertRegularFileWithin(repositoryRoot, candidate, label);
  const bytes = await readFile(trustedPath);
  assertRegularFileWithin(repositoryRoot, trustedPath, `${label} recheck`);
  return {
    relativePath,
    digest: sha256Bytes(bytes)
  };
}

function recordEvidence(evidenceByPath, entry, label) {
  const previous = evidenceByPath.get(entry.relativePath);
  if (previous !== undefined && previous !== entry.digest) {
    throw new Error(`Source governance: ${label} has conflicting immutable digests at ${entry.relativePath}`);
  }
  evidenceByPath.set(entry.relativePath, entry.digest);
}

function assertCatalogHeadMatchesReceipt(source, receipt) {
  if (!sameRevision(source.review.reviewedRevision, receipt.reviewedRevision)) {
    throw new Error(`Source governance: catalog reviewedRevision does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.reviewedDigest !== receipt.contentDigest) {
    throw new Error(`Source governance: catalog reviewedDigest does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.reviewedAt !== receipt.reviewedAt) {
    throw new Error(`Source governance: catalog reviewedAt does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.expiresAt !== receipt.expiresAt) {
    throw new Error(`Source governance: catalog expiresAt does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.disposition !== receipt.adoption.disposition) {
    throw new Error(`Source governance: catalog disposition does not match immutable head receipt for ${source.id}`);
  }
}

async function validateAdoptedArtifacts({ repositoryRoot, source, receipt, evidenceByPath }) {
  if (receipt.adoption.disposition !== "SYNCED_ADOPTED") return;
  for (const artifact of receipt.artifactEvidence.artifacts) {
    const evidence = await readRegularEvidence(
      repositoryRoot,
      artifact.path,
      `adopted artifact for ${source.id}`
    );
    if (evidence.digest !== artifact.contentDigest) {
      throw new Error(
        `Source governance: adopted artifact content digest for ${artifact.path} does not match immutable head receipt`
      );
    }
    recordEvidence(evidenceByPath, evidence, `adopted artifact for ${source.id}`);
  }
}

async function recheckEvidence(repositoryRoot, evidenceByPath) {
  for (const [relativePath, expectedDigest] of [...evidenceByPath.entries()]
    .sort(([left], [right]) => left.localeCompare(right))) {
    const observed = await readRegularEvidence(
      repositoryRoot,
      relativePath,
      `trusted source evidence ${relativePath}`
    );
    if (observed.digest !== expectedDigest) {
      throw new Error(`Source governance: trusted source evidence changed during runtime inspection: ${relativePath}`);
    }
  }
}

async function validateReceiptChain({
  repositoryRoot,
  source,
  authorizedApproverIdentities,
  now,
  evidenceByPath
}) {
  let receiptPath = source.review.currentReceipt;
  let expectedDigest = source.review.receiptDigest;
  if (receiptPath === null) return 0;

  const seen = new Set();
  let count = 0;
  let childReviewedAt = null;
  while (receiptPath !== null) {
    if (seen.has(receiptPath)) {
      throw new Error(`Source governance: receipt chain for ${source.id} contains a cycle at ${receiptPath}`);
    }
    seen.add(receiptPath);
    const document = await readDocument(
      repositoryRoot,
      receiptPath,
      `immutable receipt chain for ${source.id}`
    );
    const documentDigest = sha256Text(document.text);
    const receiptEvidence = await readRegularEvidence(
      repositoryRoot,
      receiptPath,
      `immutable receipt bytes for ${source.id}`
    );
    if (receiptEvidence.digest !== documentDigest) {
      throw new Error(`Source governance: receipt changed during runtime inspection at ${receiptPath}`);
    }
    if (documentDigest !== expectedDigest) {
      throw new Error(`Source governance: receipt chain digest for ${source.id} does not match at ${receiptPath}`);
    }
    recordEvidence(evidenceByPath, receiptEvidence, `receipt chain for ${source.id}`);
    const receipt = document.parsed;
    if (receipt.sourceId !== source.id) {
      throw new Error(`Source governance: receipt chain path ${receiptPath} belongs to a different source`);
    }
    if (receiptRelativePath(receipt) !== receiptPath) {
      throw new Error(`Source governance: receipt chain path for ${source.id} is not deterministic`);
    }

    const rollback = receipt.rollbackTarget ?? {};
    const isHead = count === 0;
    if (isHead && (
      rollback.previousReceipt !== source.review.previousReceipt
      || rollback.previousReceiptDigest !== source.review.previousReceiptDigest
    )) {
      throw new Error(`Source governance: receipt chain head for ${source.id} does not match the catalog prior receipt link`);
    }
    const isCurrentReview = Boolean(
      isHead
      && source.review.state === "REVIEWED_CURRENT"
      && sameRevision(receipt.reviewedRevision, source.monitor.observedRevision)
      && receipt.contentDigest === source.monitor.contentDigest
    );
    validateSourceReviewReceipt(receipt, {
      source: isCurrentReview ? source : historicalReceiptSource(source, receipt),
      now: isCurrentReview ? now : receipt.approver?.approvedAt ?? now,
      authorizedApproverIdentities,
      expectedPreviousReceipt: rollback.previousReceipt,
      expectedPreviousReceiptDigest: rollback.previousReceiptDigest
    });
    if (isHead) {
      assertCatalogHeadMatchesReceipt(source, receipt);
      await validateAdoptedArtifacts({ repositoryRoot, source, receipt, evidenceByPath });
    }
    if (childReviewedAt !== null && Date.parse(receipt.reviewedAt) >= Date.parse(childReviewedAt)) {
      throw new Error(`Source governance: receipt chain for ${source.id} is not strictly newest to oldest`);
    }
    childReviewedAt = receipt.reviewedAt;
    receiptPath = rollback.previousReceipt;
    expectedDigest = rollback.previousReceiptDigest;
    count += 1;
  }
  return count;
}

export async function loadValidatedSourceCatalog({ repositoryRoot, now } = {}) {
  const root = path.resolve(repositoryRoot);
  const before = await readDocument(root, CATALOG_PATH, "canonical SourceCatalog v2");
  const catalog = validateSourceCatalog(before.parsed, { now });
  let receiptCount = 0;
  const evidenceByPath = new Map();
  for (const source of catalog.sources) {
    receiptCount += await validateReceiptChain({
      repositoryRoot: root,
      source,
      authorizedApproverIdentities: catalog.approverPolicy.authorizedIdentities,
      now,
      evidenceByPath
    });
  }
  await recheckEvidence(root, evidenceByPath);
  const after = await readDocument(root, CATALOG_PATH, "canonical SourceCatalog v2 recheck");
  if (sha256Text(before.text) !== sha256Text(after.text)) {
    throw new Error("Source governance: SourceCatalog changed during trusted runtime inspection");
  }
  validateSourceCatalog(after.parsed, { now });
  return {
    catalog,
    validation: {
      schemaVersion: "2.0.0",
      sourceCount: catalog.sources.length,
      receiptCount,
      immutableReceiptChainsValidated: true
    }
  };
}
