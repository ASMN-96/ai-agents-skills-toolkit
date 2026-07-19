#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  COMPILER_DIGEST_PATHS,
  digestCanonicalCompilerInputs
} from "./ai-toolkit/compiler-provenance.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("compiler preview and shared provenance policy produce the same compiler digest", async () => {
  const inputs = await Promise.all(COMPILER_DIGEST_PATHS.map(async (relativePath) => ({
    relativePath,
    text: await readFile(path.join(ROOT, relativePath), "utf8")
  })));
  const expected = digestCanonicalCompilerInputs(inputs);
  const result = await execFileAsync(
    process.execPath,
    ["scripts/compile-agents.mjs", "--only", "product-agent", "--dry-run"],
    { cwd: ROOT, timeout: 30_000 }
  );
  const match = result.stdout.match(/^compiler digest: (sha256:[a-f0-9]{64})$/mu);

  assert.ok(match, result.stdout);
  assert.equal(match[1], expected);
});

test("compiler digest policy is closed, ordered, and normalizes line endings", () => {
  assert.deepEqual(COMPILER_DIGEST_PATHS, [
    "scripts/compile-agents.mjs",
    "scripts/ai-toolkit/compiler-provenance.mjs",
    "install/safe-filesystem.mjs"
  ]);
  assert.equal(Object.isFrozen(COMPILER_DIGEST_PATHS), true);
  assert.equal(
    digestCanonicalCompilerInputs([
      { relativePath: "a", text: "one\r\ntwo\r\n" }
    ]),
    digestCanonicalCompilerInputs([
      { relativePath: "a", text: "one\ntwo\n" }
    ])
  );
  assert.throws(
    () => digestCanonicalCompilerInputs([{ relativePath: "a", text: "x" }, { relativePath: "a", text: "x" }]),
    /unique and ordered/u
  );
});
