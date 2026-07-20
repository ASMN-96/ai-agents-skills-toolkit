#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("SourceCatalog v2.1 keeps schema ownership separate and its regenerated mirror validates", async () => {
  const canonicalCatalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
  const embeddedCatalog = JSON.parse(readFileSync(path.join(ROOT, ".ai-toolkit", "sources", "watchlist.json"), "utf8"));

  assert.equal(canonicalCatalog.schemaVersion, "2.1.0");
  assert.equal(Object.hasOwn(canonicalCatalog, "toolkitVersion"), false);
  assert.equal(embeddedCatalog.schemaVersion, "2.1.0");
  assert.deepEqual(embeddedCatalog, canonicalCatalog);
  const { validateSourceGovernanceRepository } = await import("./ai-toolkit/source-governance.mjs");
  const latestCanonicalCheck = Math.max(...canonicalCatalog.sources.map((source) => Date.parse(source.monitor.checkedAt)));
  const validation = await validateSourceGovernanceRepository({
    repositoryRoot: ROOT,
    now: new Date(latestCanonicalCheck + 1_000).toISOString()
  });
  assert.equal(validation.schemaVersion, "2.1.0");
  assert.equal(validation.sourceCount, canonicalCatalog.sources.length);
  assert.equal(validation.releaseEligible, false);
});
