#!/usr/bin/env node
// Reports upstream changes that touch vendored files, and vendored paths that disappeared upstream.
// Prints nothing when there is nothing to review, so a scheduled job can open an issue only on real changes.
//
//   node scripts/upstream-check.mjs [--out report.md]
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { readLock } from "./vendor.mjs";

function gh(path) {
  return JSON.parse(execFileSync("gh", ["api", path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }));
}

function exists(repo, path, ref) {
  try {
    gh(`repos/${repo}/contents/${path}?ref=${ref}`);
    return true;
  } catch {
    return false;
  }
}

function checkSource(repo, src, files) {
  const head = gh(`repos/${repo}/commits/HEAD`).sha;
  if (head === src.commit) return null;
  const cmp = gh(`repos/${repo}/compare/${src.commit}...${head}`);
  const changedUpstream = new Set((cmp.files || []).map((f) => f.filename));
  const truncated = (cmp.files || []).length >= 300;
  const changed = files.filter((f) => changedUpstream.has(f.from));
  const missing = files.filter((f) => !exists(repo, f.from, head));
  if (!changed.length && !missing.length && !truncated) return null;
  const lines = [`## ${repo}`, "", `Pinned \`${src.commit.slice(0, 7)}\` → HEAD \`${head.slice(0, 7)}\` (${cmp.ahead_by} commits). [Compare](https://github.com/${repo}/compare/${src.commit}...${head})`, ""];
  if (changed.length) lines.push("Changed vendored files:", ...changed.map((f) => `- \`${f.from}\` → \`${f.to}\``), "");
  if (missing.length) lines.push("Missing at HEAD (moved or deleted upstream):", ...missing.map((f) => `- \`${f.from}\` (vendored as \`${f.to}\`)`), "");
  if (truncated) lines.push("The compare API returned 300 files, its limit: check the compare link by hand.", "");
  const subjects = (cmp.commits || []).map((c) => c.commit.message.split("\n")[0]).slice(-15);
  if (subjects.length) lines.push("Recent commit subjects:", ...subjects.map((s) => `- ${s}`), "");
  return lines.join("\n");
}

function main(argv) {
  const lock = readLock();
  const sections = [];
  for (const [repo, src] of Object.entries(lock.sources)) {
    const files = lock.files.filter((f) => f.source === repo);
    try {
      const section = checkSource(repo, src, files);
      if (section) sections.push(section);
    } catch (err) {
      sections.push(`## ${repo}\n\nCheck failed: ${err.message.split("\n")[0]}\n`);
    }
  }
  if (!sections.length) return;
  const report = [
    "# Upstream updates to review",
    "",
    "Adopt a change only for a bug fix, a new capability, or an eval gain. To adopt: `node scripts/vendor.mjs --bump <owner/repo>`, run the checks and evals, open a PR.",
    "",
    ...sections,
  ].join("\n");
  const outAt = argv.indexOf("--out");
  if (outAt !== -1) writeFileSync(argv[outAt + 1], report + "\n");
  else console.log(report);
}

main(process.argv.slice(2));
