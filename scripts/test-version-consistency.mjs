#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("SourceCatalog v2.1 keeps schema ownership separate while generated mirrors remain deferred", () => {
  const canonicalCatalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
  const embeddedCatalog = JSON.parse(readFileSync(path.join(ROOT, ".ai-toolkit", "sources", "watchlist.json"), "utf8"));

  assert.equal(canonicalCatalog.schemaVersion, "2.1.0");
  assert.equal(Object.hasOwn(canonicalCatalog, "toolkitVersion"), false);
  assert.equal(embeddedCatalog.schemaVersion, "2.0.0");
  assert.notDeepEqual(embeddedCatalog, canonicalCatalog);

});
