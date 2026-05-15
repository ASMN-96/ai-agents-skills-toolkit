#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const WATCHLIST_PATH = "sources/source-watchlist.json";
const ALLOWED_OUTPUT = "docs/SOURCE_FRESHNESS_REPORT.md";
const DISCLAIMER =
  "Changed upstream source is not approved for import. This report does not authorize copying, installing, activating, extracting methods, updating source records, or changing runtime configuration.";

const STATUSES = new Set([
  "UNCHANGED",
  "CHANGED_LOW_RISK",
  "CHANGED_REVIEW_REQUIRED",
  "CHANGED_HIGH_RISK",
  "REVIEW_METADATA_MISSING",
  "UNSUPPORTED_SOURCE_TYPE",
  "CHECK_FAILED"
]);

function parseArgs(argv) {
  const args = {
    help: false,
    mock: false,
    output: null
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--mock") {
      args.mock = true;
    } else if (arg === "--output") {
      const value = argv[i + 1];
      if (!value) {
        throw new Error("--output requires a path");
      }
      args.output = value;
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Read-only source freshness monitor.

Usage:
  node scripts/check-source-freshness.mjs [--mock] [--output docs/SOURCE_FRESHNESS_REPORT.md]
  node scripts/check-source-freshness.mjs --help

Behavior:
  - Reads ${WATCHLIST_PATH}
  - Checks GitHub repository metadata without cloning, installing, activating, or copying external files
  - Prints a Markdown report to stdout by default
  - Writes only to ${ALLOWED_OUTPUT} when --output is provided
  - Uses GITHUB_TOKEN only as an Authorization header for GitHub API rate limits and never prints it
`);
}

function resolveOutputPath(outputArg) {
  if (!outputArg) {
    return null;
  }
  if (outputArg !== ALLOWED_OUTPUT) {
    throw new Error(`Unsafe output path. Only ${ALLOWED_OUTPUT} is allowed.`);
  }
  if (path.isAbsolute(outputArg)) {
    throw new Error(`Unsafe output path. Absolute paths are not allowed.`);
  }

  const cwd = process.cwd();
  const resolved = path.resolve(cwd, outputArg);
  const allowed = path.resolve(cwd, ALLOWED_OUTPUT);
  if (resolved !== allowed) {
    throw new Error(`Unsafe output path. Only ${ALLOWED_OUTPUT} is allowed.`);
  }
  return resolved;
}

async function readWatchlist() {
  const raw = await readFile(WATCHLIST_PATH, "utf8");
  const parsed = JSON.parse(raw);
  validateWatchlist(parsed);
  return parsed;
}

function validateWatchlist(watchlist) {
  if (!watchlist || typeof watchlist !== "object") {
    throw new Error("Watchlist must be a JSON object");
  }
  if (!Array.isArray(watchlist.sources)) {
    throw new Error("Watchlist must include a sources array");
  }

  const ids = new Set();
  for (const source of watchlist.sources) {
    const required = [
      "id",
      "name",
      "sourceUrl",
      "repoOwner",
      "repoName",
      "defaultBranch",
      "lastReviewedCommit",
      "lastReviewedDate",
      "sourceRecordPath",
      "watchedPaths",
      "licenseConcern",
      "reviewPriority",
      "neverAutoImport"
    ];

    for (const field of required) {
      if (!(field in source)) {
        throw new Error(`Source ${source.id || "<unknown>"} is missing ${field}`);
      }
    }
    if (ids.has(source.id)) {
      throw new Error(`Duplicate source id: ${source.id}`);
    }
    ids.add(source.id);
    if (source.neverAutoImport !== true) {
      throw new Error(`Source ${source.id} must set neverAutoImport: true`);
    }
    if (!Array.isArray(source.watchedPaths)) {
      throw new Error(`Source ${source.id} watchedPaths must be an array`);
    }
    if (source.lastReviewedCommit !== null && typeof source.lastReviewedCommit !== "string") {
      throw new Error(`Source ${source.id} lastReviewedCommit must be string or null`);
    }
    if (source.lastReviewedDate !== null && typeof source.lastReviewedDate !== "string") {
      throw new Error(`Source ${source.id} lastReviewedDate must be string or null`);
    }
  }
}

async function githubJson(endpoint) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "ai-agents-skills-toolkit-source-freshness-monitor"
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(`https://api.github.com${endpoint}`, { headers });
  if (response.status === 404) {
    return null;
  }
  if (response.status === 403 || response.status === 429) {
    throw new Error(`GitHub API rate limit or access failure (${response.status})`);
  }
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status})`);
  }
  return response.json();
}

async function inspectGithubSource(source) {
  if (!source.repoOwner || !source.repoName) {
    return {
      status: "UNSUPPORTED_SOURCE_TYPE",
      latestCommit: null,
      latestCommitDate: null,
      releaseSignal: "unsupported",
      licenseSignal: "unsupported",
      watchedPathSignals: [],
      notes: "Source has no GitHub owner/repo metadata."
    };
  }

  if (source.lastReviewedCommit === null) {
    return {
      status: "REVIEW_METADATA_MISSING",
      latestCommit: null,
      latestCommitDate: null,
      releaseSignal: "not checked",
      licenseSignal: "not checked",
      watchedPathSignals: [],
      notes: "Add a reviewed commit before monitoring this source."
    };
  }

  try {
    const repoPath = `/repos/${encodeURIComponent(source.repoOwner)}/${encodeURIComponent(source.repoName)}`;
    const repo = await githubJson(repoPath);
    if (!repo) {
      throw new Error("Repository was not found");
    }

    const branch = source.defaultBranch || repo.default_branch;
    const commit = await githubJson(`${repoPath}/commits/${encodeURIComponent(branch)}`);
    const release = await latestReleaseOrTag(repoPath);
    const license = await githubJson(`${repoPath}/license`);
    const watchedPathSignals = [];

    for (const watchedPath of source.watchedPaths) {
      const commits = await githubJson(
        `${repoPath}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(watchedPath)}&per_page=1`
      );
      watchedPathSignals.push({
        path: watchedPath,
        sha: Array.isArray(commits) && commits[0] ? commits[0].sha : null,
        date: Array.isArray(commits) && commits[0] ? commits[0].commit?.committer?.date || null : null
      });
    }

    const latestCommit = commit?.sha || null;
    const latestCommitDate = commit?.commit?.committer?.date || null;
    const changed = Boolean(latestCommit && latestCommit !== source.lastReviewedCommit);

    return {
      status: classifyStatus(source, changed),
      latestCommit,
      latestCommitDate,
      releaseSignal: release,
      licenseSignal: license
        ? `${license.license?.spdx_id || "unknown"} (${license.path || "license file"})`
        : repo.license?.spdx_id || "not found",
      watchedPathSignals,
      notes: changed ? "Upstream default branch changed since last reviewed commit." : "Default branch commit matches last reviewed commit."
    };
  } catch (error) {
    return {
      status: "CHECK_FAILED",
      latestCommit: null,
      latestCommitDate: null,
      releaseSignal: "check failed",
      licenseSignal: "check failed",
      watchedPathSignals: [],
      notes: error.message
    };
  }
}

async function latestReleaseOrTag(repoPath) {
  const release = await githubJson(`${repoPath}/releases/latest`);
  if (release) {
    return `release ${release.tag_name || release.name || "unknown"}`;
  }

  const tags = await githubJson(`${repoPath}/tags?per_page=1`);
  if (Array.isArray(tags) && tags[0]) {
    return `tag ${tags[0].name}`;
  }
  return "none found";
}

function classifyStatus(source, changed) {
  if (!changed) {
    return "UNCHANGED";
  }

  const licenseConcern = String(source.licenseConcern || "").toLowerCase();
  const highConcern = ["mixed-license", "license-unclear", "source-available", "cc-by-sa"].includes(licenseConcern);
  if (source.reviewPriority === "High" && highConcern) {
    return "CHANGED_HIGH_RISK";
  }
  if (source.reviewPriority === "High" || highConcern) {
    return "CHANGED_REVIEW_REQUIRED";
  }
  return "CHANGED_LOW_RISK";
}

function mockInspection(source, index) {
  if (source.lastReviewedCommit === null) {
    return {
      status: "REVIEW_METADATA_MISSING",
      latestCommit: null,
      latestCommitDate: null,
      releaseSignal: "mock: not checked",
      licenseSignal: "mock: not checked",
      watchedPathSignals: [],
      notes: "Mock: reviewed commit metadata is missing."
    };
  }

  const changed = index % 4 === 1;
  const latestCommit = changed ? `feed${source.lastReviewedCommit.slice(4)}` : source.lastReviewedCommit;
  return {
    status: classifyStatus(source, changed),
    latestCommit,
    latestCommitDate: changed ? "2026-05-10T00:00:00Z" : source.lastReviewedDate,
    releaseSignal: changed ? "mock: new tag signal" : "mock: unchanged",
    licenseSignal: source.licenseConcern === "clear" ? "mock: license metadata present" : `mock: ${source.licenseConcern}`,
    watchedPathSignals: source.watchedPaths.map((watchedPath) => ({
      path: watchedPath,
      sha: latestCommit,
      date: changed ? "2026-05-10T00:00:00Z" : source.lastReviewedDate
    })),
    notes: changed ? "Mock: upstream changed since review." : "Mock: default branch commit is unchanged."
  };
}

function nextStepFor(status) {
  switch (status) {
    case "UNCHANGED":
      return "no action";
    case "CHANGED_LOW_RISK":
      return "refresh source record";
    case "CHANGED_REVIEW_REQUIRED":
    case "CHECK_FAILED":
      return "Skill Scout review required";
    case "CHANGED_HIGH_RISK":
    case "UNSUPPORTED_SOURCE_TYPE":
      return "reject/hold due to safety or license concern";
    case "REVIEW_METADATA_MISSING":
      return "add reviewed metadata before monitoring";
    default:
      return "Skill Scout review required";
  }
}

async function buildResults(watchlist, useMock, checkedAt) {
  const results = [];
  for (let index = 0; index < watchlist.sources.length; index += 1) {
    const source = watchlist.sources[index];
    const inspection = useMock ? mockInspection(source, index) : await inspectGithubSource(source);
    if (!STATUSES.has(inspection.status)) {
      throw new Error(`Internal error: unknown status ${inspection.status}`);
    }
    results.push({
      ...source,
      ...inspection,
      lastCheckedDate: checkedAt,
      nextStep: nextStepFor(inspection.status)
    });
  }
  return results;
}

function shortSha(sha) {
  return sha ? sha.slice(0, 12) : "n/a";
}

function renderReport(results, useMock, checkedAt) {
  const generatedAt = checkedAt || new Date().toISOString();
  const counts = new Map();
  for (const status of STATUSES) {
    counts.set(status, 0);
  }
  for (const result of results) {
    counts.set(result.status, (counts.get(result.status) || 0) + 1);
  }

  const lines = [
    "# Source Freshness Report",
    "",
    useMock ? "Generated report / sample report from mock data." : "Generated report from live GitHub metadata.",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "Read-only freshness signal only. No source import approval, activation approval, extraction approval, source-record update, or runtime configuration approval is granted.",
    "",
    `> ${DISCLAIMER}`,
    "",
    "## Status Summary",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...Array.from(counts.entries()).map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "## Sources",
    "",
    "| Source | Repo | Status | Reviewed | Checked | Latest | Reviewed date | Latest date | License signal | Next step | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"
  ];

  for (const result of results) {
    lines.push(
      `| ${escapeCell(result.name)} | ${escapeCell(`${result.repoOwner}/${result.repoName}`)} | ${result.status} | ${shortSha(result.lastReviewedCommit)} | ${escapeCell(result.lastCheckedDate || "n/a")} | ${shortSha(result.latestCommit)} | ${escapeCell(result.lastReviewedDate || "n/a")} | ${escapeCell(result.latestCommitDate || "n/a")} | ${escapeCell(result.licenseSignal)} | ${escapeCell(result.nextStep)} | ${escapeCell(result.notes)} |`
    );

    if (result.watchedPathSignals.length > 0) {
      for (const signal of result.watchedPathSignals) {
        lines.push(
          `| ${escapeCell(`${result.name} watched path`)} | ${escapeCell(signal.path)} | signal | n/a | n/a | ${shortSha(signal.sha)} | ${escapeCell(signal.date || "n/a")} | n/a | path commit signal only | ${escapeCell(result.nextStep)} | watched-path signal only |`
        );
      }
    }
  }

  lines.push(
    "",
    "## Next Step Meanings",
    "",
    "- no action: current default-branch signal matches the reviewed commit; this does not mean the source is safe forever.",
    "- refresh source record: upstream changed and a source-record refresh is the next safe step.",
    "- Skill Scout review required: review trust, license, maintenance, prompt-injection risk, dangerous commands, secret access, network behavior, and filesystem writes before any later phase.",
    "- reject/hold due to safety or license concern: do not import or extract until the concern is resolved in a separate reviewed phase.",
    "- add reviewed metadata before monitoring: add a reviewed commit/date in a separate source-record review before treating freshness as meaningful.",
    "",
    "## Caveats",
    "",
    "- `Last checked` is the freshness scan timestamp and is not persisted back into source records automatically.",
    "- Freshness signals only select review priority; they do not authorize source-record edits, extraction, activation, installation, or runtime writes.",
    "- License metadata is a signal only, not approval.",
    "- Watched-path changes are signals only, not approval.",
    "- CHECK_FAILED is per source and does not authorize fallback import or activation.",
    "- This monitor never clones repositories, runs external scripts, copies raw files, installs skills, activates plugins, or updates source records."
  );

  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const outputPath = resolveOutputPath(args.output);
    const checkedAt = new Date().toISOString();
    const watchlist = await readWatchlist();
    const results = await buildResults(watchlist, args.mock, checkedAt);
    const report = renderReport(results, args.mock, checkedAt);

    if (outputPath) {
      await writeFile(outputPath, report, "utf8");
      console.log(`Wrote ${ALLOWED_OUTPUT}`);
    } else {
      process.stdout.write(report);
    }
  } catch (error) {
    console.error(`Fatal: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
