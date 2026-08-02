#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPRESENTATIVE_PATHS = [
  "scripts/compile-agents.mjs",
  "sources/source-watchlist.json",
  "sources/reviews/openssf-ai-code-assistant-instructions/d2152d99ebef23026d9813692c81f96d626ab16c1aa49d53f6a8bb82874a453d.json",
  ".ai-toolkit/manifest.json",
  ".ai-toolkit/sources/watchlist.json"
];

test("root attributes enforce LF for canonical, receipt, and generated text", () => {
  assert.equal(
    readFileSync(path.join(ROOT, ".gitattributes"), "utf8"),
    "* text=auto eol=lf\n"
  );

  const output = execFileSync("git", ["check-attr", "eol", "--", ...REPRESENTATIVE_PATHS], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const attributes = new Map(output.trim().split(/\r?\n/u).map((line) => {
    const match = /^(.*): eol: (.*)$/u.exec(line);
    assert.ok(match, `unexpected git check-attr output: ${line}`);
    return [match[1], match[2]];
  }));

  for (const relativePath of REPRESENTATIVE_PATHS) {
    assert.equal(attributes.get(relativePath), "lf", `${relativePath} must resolve to eol=lf`);
  }
});
