#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VALIDATOR = path.join(ROOT, "scripts", "ai-toolkit", "validate-version-consistency.mjs");

test("SourceCatalog v2 keeps schema ownership separate from toolkit release version", () => {
  const canonicalCatalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
  const embeddedCatalog = JSON.parse(readFileSync(path.join(ROOT, ".ai-toolkit", "sources", "watchlist.json"), "utf8"));

  assert.equal(canonicalCatalog.schemaVersion, "2.0.0");
  assert.equal(Object.hasOwn(canonicalCatalog, "toolkitVersion"), false);
  assert.deepEqual(embeddedCatalog, canonicalCatalog);

  const result = spawnSync(process.execPath, [VALIDATOR], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /PASS validate-version-consistency/u);
});
