#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const OUTPUT_PATH = "docs/STALE_UNVERIFIED_DATA_CLASSIFICATION.md";
const CLASSIFICATIONS = new Set([
  "keep-active",
  "metadata-only",
  "historical",
  "review-required",
  "remove-later",
  "private-overlay-only"
]);

const PATTERNS = [
  {
    id: "old-version-metadata",
    description: "Old toolkit version or compiled-agent version metadata.",
    pattern: /\b0\.(?:1|2|3|4|5)\.0-draft\b/g
  },
  {
    id: "unknown-review-required",
    description: "Explicit unknown review or provenance placeholder.",
    pattern: /unknown-review-required/g
  },
  {
    id: "project-private-naming",
    description: "Project/private naming that must stay out of future public core paths unless preserved as a compatibility alias.",
    pattern: /\bRISS\b|\bVDTwin\b|\bVD\b|\briss-[a-z0-9-]+|\bvd-[a-z0-9-]+/gi
  },
  {
    id: "local-path",
    description: "Local machine path signal.",
    pattern: /[A-Z]:\\Users\\[^\s)`"']+/g
  },
  {
    id: "unverified-metadata",
    description: "Metadata-only, not-yet-verified, or source-review-required signal.",
    pattern: /metadata-only|not-yet-verified|source-review-required|REVIEW_METADATA_MISSING/gi
  },
  {
    id: "non-https-url",
    description: "Non-HTTPS URL signal that requires review before public release.",
    pattern: /http:\/\/[^\s)`"']+/g
  }
];

const EXCLUDED_FILES = new Set([
  OUTPUT_PATH,
  "docs/PUBLIC_PRIVATE_LEAK_REPORT.md"
]);

function parseArgs(argv) {
  const args = { output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--output") {
      const value = argv[index + 1];
      if (!value) throw new Error("--output requires a path");
      args.output = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`Classify stale or unverified toolkit data without deleting anything.

Usage:
  node scripts/classify-stale-unverified-data.mjs
  node scripts/classify-stale-unverified-data.mjs --output ${OUTPUT_PATH}

Only ${OUTPUT_PATH} may be written.`);
}

function resolveOutput(output) {
  if (!output) return null;
  if (output !== OUTPUT_PATH) {
    throw new Error(`Unsafe output path. Only ${OUTPUT_PATH} is allowed.`);
  }
  return path.resolve(process.cwd(), output);
}

function gitTrackedFiles() {
  const stdout = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  return stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
    .filter((file) => !EXCLUDED_FILES.has(file));
}

function lineNumberAt(text, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (text.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function lineAt(text, lineNumber) {
  return text.split(/\r?\n/)[lineNumber - 1]?.trim() || "";
}

function classify(hit) {
  const file = hit.file.replace(/\\/g, "/");
  const value = hit.value.toLowerCase();

  if (hit.patternId === "old-version-metadata") {
    if (file.startsWith("compiled-agents/") || file.startsWith(".ai-toolkit/compiled-agents/")) {
      return "review-required";
    }
    if (file.startsWith("install/") || file.includes("validate-version-consistency")) {
      return "review-required";
    }
    if (file.startsWith("docs/RUNTIME_") || file === "docs/ROADMAP.md" || file.includes("REPORT_")) {
      return "historical";
    }
    return "metadata-only";
  }

  if (hit.patternId === "unknown-review-required") {
    if (file.startsWith("sources/") || file.includes("source-watchlist") || file.includes("tools.registry")) {
      return "review-required";
    }
    if (file.startsWith("templates/") || file.startsWith(".ai-toolkit/templates/")) {
      return "metadata-only";
    }
    return "review-required";
  }

  if (hit.patternId === "project-private-naming") {
    if (
      file.startsWith("skills/riss-") ||
      file.startsWith("skills/vd-") ||
      file.startsWith(".agents/skills/riss-") ||
      file.startsWith(".agents/skills/vd-") ||
      file.includes("skills.registry.json") ||
      file.includes("runtime-boundary-evals") ||
      file.includes("toolkit-routing-evals")
    ) {
      return "keep-active";
    }
    if (
      file.includes("GENERIC_NAMING_COMPATIBILITY") ||
      file.includes("PUBLIC_PRIVATE") ||
      file.includes("STALE_UNVERIFIED") ||
      file.includes("scan-public-private-leaks")
    ) {
      return "metadata-only";
    }
    if (file.startsWith("docs/RUNTIME_") || file === "docs/ROADMAP.md" || file.includes("REPORT_")) {
      return "historical";
    }
    if (file.startsWith(".ai-toolkit/private-overlays/")) {
      return "private-overlay-only";
    }

    if (file.startsWith(".ai-toolkit/checklists/riss-v2") || file.startsWith(".ai-toolkit/tool-packs/riss-v2")) {
      return "remove-later";
    }
    return value.includes("riss") || value.includes("vd") ? "private-overlay-only" : "metadata-only";
  }

  if (hit.patternId === "local-path") {
    return "private-overlay-only";
  }

  if (hit.patternId === "unverified-metadata") {
    if (file.startsWith("sources/") || file.includes("watchlist") || file.includes("tools.registry")) {
      return "review-required";
    }
    return "metadata-only";
  }

  if (hit.patternId === "non-https-url") {
    return "review-required";
  }

  return "metadata-only";
}

function collectHits() {
  const hits = [];
  for (const file of gitTrackedFiles()) {
    let text;
    try {
      text = readFileSync(path.resolve(process.cwd(), file), "utf8");
    } catch {
      continue;
    }

    for (const pattern of PATTERNS) {
      pattern.pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern.pattern)) {
        const line = lineNumberAt(text, match.index ?? 0);
        const value = match[0];
        const hit = {
          patternId: pattern.id,
          description: pattern.description,
          classification: null,
          file,
          line,
          value,
          context: lineAt(text, line)
        };
        hit.classification = classify(hit);
        if (!CLASSIFICATIONS.has(hit.classification)) {
          throw new Error(`Internal error: invalid classification ${hit.classification}`);
        }
        hits.push(hit);
      }
    }
  }
  return hits;
}

function countBy(items, key) {
  const counts = new Map();
  for (const item of items) {
    const value = item[key];
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return counts;
}

function escapeCell(value) {
  return String(value ?? "")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function renderReport(hits) {
  const generatedAt = new Date().toISOString();
  const byClass = countBy(hits, "classification");
  const byPattern = countBy(hits, "patternId");
  const lines = [
    "# Stale and Unverified Data Classification",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "Report-only classification. No files were deleted, renamed, relocated, activated, installed, or approved by this report.",
    "",
    "## Classification Definitions",
    "",
    "- keep-active: currently active compatibility or runtime-facing naming that must not be removed until a migration is implemented and verified.",
    "- metadata-only: registry, template, policy, or scanner metadata that does not imply approval or runtime activation.",
    "- historical: dated or roadmap evidence retained as history.",
    "- review-required: value needs owner/security/source review before public release or enterprise approval.",
    "- remove-later: candidate for removal after compatibility and package boundaries are proven.",
    "- private-overlay-only: value belongs in a future private overlay, not in public core paths.",
    "",
    "## Summary By Classification",
    "",
    "| Classification | Count |",
    "| --- | ---: |",
    ...Array.from(CLASSIFICATIONS).map((classification) => `| ${classification} | ${byClass.get(classification) || 0} |`),
    "",
    "## Summary By Signal",
    "",
    "| Signal | Count |",
    "| --- | ---: |",
    ...PATTERNS.map((pattern) => `| ${pattern.id} | ${byPattern.get(pattern.id) || 0} |`),
    "",
    "## Review Samples",
    "",
    "Samples are capped to keep the report reviewable. Re-run the script for the current full scan.",
    ""
  ];

  for (const classification of CLASSIFICATIONS) {
    const samples = hits.filter((hit) => hit.classification === classification).slice(0, 25);
    lines.push(`### ${classification}`, "");
    if (samples.length === 0) {
      lines.push("No samples.", "");
      continue;
    }
    lines.push("| Signal | File | Line | Value | Context |", "| --- | --- | ---: | --- | --- |");
    for (const hit of samples) {
      lines.push(
        `| ${hit.patternId} | ${escapeCell(hit.file)} | ${hit.line} | ${escapeCell(hit.value)} | ${escapeCell(hit.context)} |`
      );
    }
    lines.push("");
  }

  lines.push(
    "## Required Follow-Up",
    "",
    "- Do not delete or rename any classified value from this report alone.",
    "- Move private-overlay-only content only in a later public/private migration PR after compatibility gates pass.",
    "- Keep active runtime names until generic aliases or wrappers are implemented and verified.",
    "- Resolve review-required source/tool/license/version values with owner-reviewed evidence.",
    "- Treat remove-later findings as cleanup candidates, not removal approval."
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      return;
    }

    const hits = collectHits();
    const report = renderReport(hits);
    const output = resolveOutput(args.output);
    if (output) {
      writeFileSync(output, report, "utf8");
      console.log(`Wrote ${OUTPUT_PATH}`);
    } else {
      process.stdout.write(report);
    }
  } catch (error) {
    console.error(`FAIL classify-stale-unverified-data: ${error.message}`);
    process.exitCode = 1;
  }
}

await main();
