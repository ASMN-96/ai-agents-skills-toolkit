#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "check-source-freshness.mjs");

function source(overrides = {}) {
  return {
    id: "openai-skills",
    name: "OpenAI Skills",
    sourceUrl: "https://github.com/openai/skills",
    repoOwner: "openai",
    repoName: "skills",
    defaultBranch: "main",
    lastReviewedCommit: "a8924c2a35cfa290458852c4fad17c9133054c2e",
    lastReviewedDate: "2026-05-29",
    sourceRecordPath: "sources/openai-skills.md",
    watchedPaths: [],
    licenseConcern: "mixed-license",
    reviewPriority: "High",
    neverAutoImport: true,
    ...overrides
  };
}

async function withWatchlist(sources, callback) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "source-freshness-"));
  await mkdir(path.join(tempRoot, "sources"));
  await writeFile(
    path.join(tempRoot, "sources", "source-watchlist.json"),
    `${JSON.stringify({ schemaVersion: "1.0.0", sources }, null, 2)}\n`
  );

  try {
    return await callback(tempRoot);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function runFreshness(cwd, args) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error)
    };
  }
}

test("rejects non-HTTPS GitHub source URLs before inspection", async () => {
  await withWatchlist([source({ sourceUrl: "ssh://git@github.com/openai/skills" })], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /sourceUrl/i);
    assert.match(result.stderr, /https:\/\/github\.com/i);
  });
});

test("rejects source URL owner/repo mismatches", async () => {
  await withWatchlist([source({ repoOwner: "anthropics" })], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /sourceUrl/i);
    assert.match(result.stderr, /repoOwner\/repoName/i);
  });
});

test("--fail-on-change reports actionable freshness statuses", async () => {
  const sources = [
    source({ id: "first-source", name: "First Source" }),
    source({ id: "second-source", name: "Second Source" })
  ];

  await withWatchlist(sources, async (cwd) => {
    const result = await runFreshness(cwd, ["--mock", "--fail-on-change"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /Status Summary/);
    assert.match(result.stdout, /CHANGED_HIGH_RISK|CHANGED_LOW_RISK|CHANGED_REVIEW_REQUIRED/);
    assert.match(result.stderr, /actionable source freshness status/i);
  });
});

test("mock report includes affected methods from method sourceRef frontmatter", async () => {
  await withWatchlist([source()], async (cwd) => {
    await mkdir(path.join(cwd, "registries"));
    await mkdir(path.join(cwd, "methods", "internal"), { recursive: true });
    await writeFile(
      path.join(cwd, "methods", "internal", "traceability.md"),
      [
        "---",
        "sourceRef: [\"openai-skills\"]",
        "lastExtracted: unknown-review-required",
        "status: approved",
        "---",
        "",
        "# Traceability"
      ].join("\n")
    );
    await writeFile(
      path.join(cwd, "registries", "methods.registry.json"),
      `${JSON.stringify({
        schemaVersion: "1.0.0",
        methods: [
          {
            id: "internal.traceability",
            displayName: "Traceability",
            methodPath: "methods/internal/traceability.md"
          }
        ]
      }, null, 2)}\n`
    );

    const result = await runFreshness(cwd, ["--mock"]);

    assert.equal(result.code, 0);
    assert.match(result.stdout, /Affected methods/);
    assert.match(result.stdout, /internal\.traceability \(Traceability\)/);
  });
});
