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

test("--fail-on-change reports canonical GitHub source relocations", async () => {
  await withWatchlist([
    source({
      mockCanonicalFullName: "openai/skills-renamed"
    })
  ], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock", "--fail-on-change"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /RELOCATED_REVIEW_REQUIRED/);
    assert.match(result.stdout, /refresh source identity after Skill Scout review/);
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

test("--json-output emits deterministic SourceCatalog v2 monitor evidence", async () => {
  await withWatchlist([
    source({
      monitor: {
        state: "CURRENT",
        checkedAt: "2026-07-16T00:00:00.000Z",
        observedRevision: { kind: "git-sha", value: "f".repeat(40) },
        contentDigest: `sha256:${"e".repeat(64)}`,
        failureReason: null
      },
      review: {
        state: "QUARANTINED",
        currentReceipt: null
      }
    }),
    source({
      id: "official-docs",
      name: "Official Docs",
      sourceUrl: "https://docs.example.com/guidance",
      sourceType: "manual-reviewed-doc",
      watchMode: "manual-reviewed-doc",
      repoOwner: undefined,
      repoName: undefined,
      defaultBranch: undefined,
      lastReviewedCommit: null,
      sourceRecordPath: "sources/official-docs.md",
      manualReview: {
        publisher: "Example",
        cadence: "30 days",
        reason: "Mutable documentation requires manual review.",
        forbiddenClaims: ["immutable source freshness"]
      }
    })
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--mock",
      "--json-output",
      "docs/SOURCE_FRESHNESS_REPORT.json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_REPORT.json"), "utf8"));
    assert.equal(report.schemaVersion, "2.1.0");
    assert.equal(report.sourceCount, 2);
    assert.equal(report.actionableCount, 2);
    assert.equal(report.releaseScope.releaseBlockingSourceCount, 0);
    assert.equal(report.mode, "mock");
    assert.equal(report.checkedAt, "2026-07-17T00:00:00.000Z");
    assert.deepEqual(report.sources.map((entry) => entry.monitorState), ["CURRENT", "CHECK_FAILED"]);
    assert.deepEqual(report.sources[0].observedRevision, {
      kind: "git-sha",
      value: "f".repeat(40)
    });
    assert.match(report.sources[0].contentDigest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(report.sources[0].evidence.digestBasis, "git-revision-identity");
    assert.equal(report.sources[0].evidence.legacyStatus, "UNCHANGED");
    assert.equal(report.sources[0].comparisonRevision, "f".repeat(40));
    assert.equal(report.sources[0].comparisonBasis, "PRIOR_MONITOR_OBSERVATION");
    assert.equal(report.sources[0].reasonCode, "COMPARISON_MATCH");
    assert.equal(report.sources[0].missingCurrentReview, true);
    assert.equal(report.sources[1].observedRevision, null);
    assert.equal(report.sources[1].contentDigest, null);
    assert.equal(report.sources[1].comparisonRevision, null);
    assert.equal(report.sources[1].comparisonBasis, "MISSING");
    assert.equal(report.sources[1].reasonCode, "MANUAL_EVIDENCE_REQUIRED");
  });
});

test("canonical relocation is fail-closed identity drift even when the compared commit is unchanged", async () => {
  await withWatchlist([
    source({ mockCanonicalFullName: "openai/skills-renamed" })
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--mock",
      "--json-output",
      "docs/SOURCE_FRESHNESS_REPORT.json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_REPORT.json"), "utf8"));
    assert.equal(report.sources[0].monitorState, "CHECK_FAILED");
    assert.equal(report.sources[0].reasonCode, "IDENTITY_DRIFT_DETECTED");
    assert.equal(report.sources[0].observedRevision, null);
    assert.equal(report.sources[0].contentDigest, null);
    assert.equal(report.sources[0].comparisonRevision, "a8924c2a35cfa290458852c4fad17c9133054c2e");
  });
});

test("mock freshness evidence distinguishes a missing Git baseline from remote failure", async () => {
  await withWatchlist([
    source({ lastReviewedCommit: null, lastReviewedDate: null })
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--mock",
      "--json-output",
      "docs/SOURCE_FRESHNESS_REPORT.json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_REPORT.json"), "utf8"));
    assert.equal(report.sources[0].monitorState, "CHECK_FAILED");
    assert.equal(report.sources[0].comparisonRevision, null);
    assert.equal(report.sources[0].comparisonBasis, "MISSING");
    assert.equal(report.sources[0].reasonCode, "BASELINE_MISSING");
    assert.doesNotMatch(report.sources[0].evidence.notes, /remote|network/i);
  });
});

test("mock fallback evidence distinguishes degraded success from a failed remote check", async () => {
  const baseline = "a8924c2a35cfa290458852c4fad17c9133054c2e";
  await withWatchlist([
    source({
      mockRemoteStatus: 403,
      mockLsRemoteRevision: baseline
    }),
    source({
      id: "remote-and-fallback-failed",
      name: "Remote and Fallback Failed",
      mockRemoteStatus: 429,
      mockLsRemoteFailure: true
    }),
    source({
      id: "fallback-changed",
      name: "Fallback Changed",
      mockRemoteStatus: 403,
      mockLsRemoteRevision: `feed${baseline.slice(4)}`
    })
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--mock",
      "--json-output",
      "docs/SOURCE_FRESHNESS_REPORT.json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_REPORT.json"), "utf8"));
    assert.deepEqual(report.sources.map((entry) => entry.monitorState), ["CURRENT", "CHECK_FAILED", "CHANGED"]);
    assert.deepEqual(report.sources.map((entry) => entry.reasonCode), [
      "DEGRADED_COMPARISON_MATCH",
      "REMOTE_CHECK_FAILED",
      "DEGRADED_UPSTREAM_CHANGED"
    ]);
  });
});

test("manual freshness requires a complete receipt and reports expiry only after a usable receipt", async () => {
  const digest = `sha256:${"d".repeat(64)}`;
  const reviewedRevision = { kind: "content-digest", value: digest };
  const manual = (id, review) => source({
    id,
    name: id,
    sourceType: "manual-reviewed-doc",
    watchMode: "manual-reviewed-doc",
    sourceUrl: `https://docs.example.com/${id}`,
    repoOwner: undefined,
    repoName: undefined,
    defaultBranch: undefined,
    lastReviewedCommit: null,
    manualReview: {
      publisher: "Example",
      cadence: "manual",
      reason: "Manual source.",
      forbiddenClaims: ["live freshness"]
    },
    review
  });
  const completeReview = (expiresAt) => ({
    state: "REVIEWED_CURRENT",
    currentReceipt: "sources/reviews/manual/receipt.json",
    reviewedRevision,
    reviewedDigest: digest,
    reviewedAt: "2026-07-01T00:00:00.000Z",
    expiresAt,
    previousReceipt: null,
    receiptDigest: `sha256:${"e".repeat(64)}`,
    previousReceiptDigest: null,
    disposition: "SYNCED_REFERENCE"
  });

  await withWatchlist([
    manual("manual-missing", { state: "QUARANTINED", currentReceipt: null }),
    manual("manual-current", completeReview("2026-07-18T00:00:00.000Z")),
    manual("manual-due", completeReview("2026-07-16T00:00:00.000Z"))
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--mock",
      "--json-output",
      "docs/SOURCE_FRESHNESS_REPORT.json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_REPORT.json"), "utf8"));
    assert.deepEqual(report.sources.map((entry) => [entry.monitorState, entry.reasonCode]), [
      ["CHECK_FAILED", "MANUAL_EVIDENCE_REQUIRED"],
      ["CURRENT", "MANUAL_CURRENT"],
      ["MANUAL_DUE", "MANUAL_DUE"]
    ]);
    assert.equal(report.sources[1].comparisonBasis, "MANUAL_REVIEW_RECEIPT");
    assert.equal(report.sources[1].comparisonRevision, digest);
    assert.equal(report.sources[1].evidence.observationMode, "deterministic-mock");
  });
});

test("live manual receipt evidence is labelled manual-receipt-only", async () => {
  const digest = `sha256:${"d".repeat(64)}`;
  await withWatchlist([
    source({
      id: "manual-current",
      name: "Manual Current",
      sourceType: "manual-reviewed-doc",
      watchMode: "manual-reviewed-doc",
      sourceUrl: "https://docs.example.com/manual-current",
      repoOwner: undefined,
      repoName: undefined,
      defaultBranch: undefined,
      lastReviewedCommit: null,
      manualReview: {
        publisher: "Example",
        cadence: "manual",
        reason: "Manual source.",
        forbiddenClaims: ["live freshness"]
      },
      review: {
        state: "REVIEWED_CURRENT",
        currentReceipt: "sources/reviews/manual-current/receipt.json",
        reviewedRevision: { kind: "content-digest", value: digest },
        reviewedDigest: digest,
        reviewedAt: "2026-07-01T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        previousReceipt: null,
        receiptDigest: `sha256:${"e".repeat(64)}`,
        previousReceiptDigest: null,
        disposition: "SYNCED_REFERENCE"
      }
    })
  ], async (cwd) => {
    await mkdir(path.join(cwd, "docs"));
    const result = await runFreshness(cwd, [
      "--json-output",
      "docs/SOURCE_FRESHNESS_REPORT.json"
    ]);

    assert.equal(result.code, 0, result.stderr);
    const report = JSON.parse(await readFile(path.join(cwd, "docs", "SOURCE_FRESHNESS_REPORT.json"), "utf8"));
    assert.equal(report.sources[0].monitorState, "CURRENT");
    assert.equal(report.sources[0].evidence.observationMode, "manual-receipt-only");
    assert.equal(report.sources[0].evidence.digestBasis, "manual-review-receipt");
  });
});

test("current report wording names the comparison baseline without implying review", async () => {
  await withWatchlist([source()], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /matches comparison baseline/i);
    assert.doesNotMatch(result.stdout, /matches last reviewed commit/i);
  });
});

test("--json-output rejects paths outside the governed report target", async () => {
  await withWatchlist([source()], async (cwd) => {
    const result = await runFreshness(cwd, ["--mock", "--json-output", "freshness.json"]);
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Only docs\/SOURCE_FRESHNESS_REPORT\.json is allowed/i);
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

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /MANUAL_REVIEW_TRACKED/);
    assert.match(result.stdout, /manual-reviewed-doc/);
    assert.match(result.stderr, /actionable source freshness status/i);
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
