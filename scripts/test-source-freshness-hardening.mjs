#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

test("--fail-on-change reports exact reviewed-held source commits as unresolved", async () => {
  const reviewedCommit = "a8924c2a35cfa290458852c4fad17c9133054c2e";
  const heldCommit = `feed${reviewedCommit.slice(4)}`;
  const sources = [
    source({ id: "unchanged-source", name: "Unchanged Source" }),
    source({
      id: "held-source",
      name: "Held Source",
      lastReviewedCommit: reviewedCommit,
      reviewedHold: {
        status: "REVIEWED_HELD",
        reviewedCommit: heldCommit,
        reviewedDate: "2026-06-04",
        classification: "reviewed-held reference-only",
        decision: "reference-only hold; no import, no install, no activation, and no extraction",
        noImportNoInstallNoExtraction: true,
        forbiddenActions: ["import", "install", "activation", "extraction"]
      }
    })
  ];

  await withWatchlist(sources, async (cwd) => {
    const result = await runFreshness(cwd, ["--mock", "--fail-on-change"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /REVIEWED_HELD/);
    assert.match(result.stderr, /actionable source freshness status/i);
  });
});

test("mock report renders resolved v0.2.3 source decisions", async () => {
  const reviewedCommit = "a8924c2a35cfa290458852c4fad17c9133054c2e";
  await withWatchlist([
    source({
      reviewDecision: {
        outcome: "SYNCED_PLUGIN_DELEGATED",
        reviewedCommit,
        reviewedDate: "2026-06-06",
        summary: "Latest upstream reviewed; execution delegated to a first-party plugin.",
        boundaries: ["no import", "no install", "no activation"]
      }
    })
  ], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /v0\.2\.3 outcome/);
    assert.match(result.stdout, /SYNCED_PLUGIN_DELEGATED/);
  });
});

test("manual reviewed-doc sources are tracked without live GitHub or GitLab freshness claims", async () => {
  await withWatchlist([
    source({
      id: "gitlab-agent-skills",
      name: "GitLab Agent Skills Docs",
      sourceUrl: "https://docs.gitlab.com/ee/development/ai_features/agent_skills/",
      sourceType: "manual-reviewed-doc",
      watchMode: "manual-reviewed-doc",
      repoOwner: undefined,
      repoName: undefined,
      defaultBranch: undefined,
      lastReviewedCommit: null,
      lastReviewedDate: "2026-05-15",
      sourceRecordPath: "sources/gitlab-agent-skills.md",
      licenseConcern: "official-docs-terms-not-reviewed",
      manualReview: {
        publisher: "GitLab",
        cadence: "periodic owner review",
        reason: "Official docs page without immutable commit checkpoint.",
        forbiddenClaims: [
          "live GitHub/GitLab freshness proof",
          "runtime support"
        ]
      }
    })
  ], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock", "--fail-on-change"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /MANUAL_REVIEW_TRACKED/);
    assert.match(result.stdout, /manual-reviewed-doc/);
    assert.doesNotMatch(result.stderr, /actionable source freshness status/i);
  });
});

test("manual reviewed-doc sources require complete manualReview metadata", async () => {
  await withWatchlist([
    source({
      id: "gitlab-agent-skills",
      name: "GitLab Agent Skills Docs",
      sourceUrl: "https://docs.gitlab.com/ee/development/ai_features/agent_skills/",
      sourceType: "manual-reviewed-doc",
      watchMode: "manual-reviewed-doc",
      repoOwner: undefined,
      repoName: undefined,
      defaultBranch: undefined,
      lastReviewedCommit: null,
      lastReviewedDate: "2026-05-15",
      sourceRecordPath: "sources/gitlab-agent-skills.md",
      licenseConcern: "official-docs-terms-not-reviewed",
      manualReview: {}
    })
  ], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /manualReview\.publisher must be a non-empty string/);
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

test("--create-issues writes dry-run issue drafts with dedupe labels and no-import language", async () => {
  await withWatchlist([
    source({ id: "first-source", name: "First Source", lastReviewedCommit: null, lastReviewedDate: null }),
    source({ id: "second-source", name: "Second Source" })
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    await mkdir(path.join(cwd, "registries"));
    await mkdir(path.join(cwd, "methods", "internal"), { recursive: true });
    await writeFile(
      path.join(cwd, "methods", "internal", "traceability.md"),
      [
        "---",
        "sourceRef: [\"first-source\"]",
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

    const result = await runFreshness(cwd, [
      "--mock",
      "--create-issues",
      "--issues-output",
      "docs/SOURCE_FRESHNESS_ISSUES_DRY_RUN.md"
    ]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Wrote docs\/SOURCE_FRESHNESS_ISSUES_DRY_RUN\.md/);
    const draft = await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_ISSUES_DRY_RUN.md"), "utf8");
    assert.match(draft, /Source Freshness Issue Drafts/);
    assert.match(draft, /source-freshness\/first-source\/REVIEW_METADATA_MISSING/);
    assert.match(draft, /no-import-no-activation/);
    assert.match(draft, /internal\.traceability \(Traceability\)/);
    assert.match(draft, /No live GitHub issues were created/);
    assert.match(draft, /Do not import, clone, copy raw source files/);
  });
});

test("--issues-output is rejected without --create-issues", async () => {
  await withWatchlist([source()], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--mock",
      "--issues-output",
      "docs/SOURCE_FRESHNESS_ISSUES_DRY_RUN.md"
    ]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /--issues-output requires --create-issues/);
  });
});
