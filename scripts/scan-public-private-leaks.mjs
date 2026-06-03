#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEFAULT_OUTPUT = "docs/PUBLIC_PRIVATE_LEAK_REPORT.md";
const MAX_FINDINGS = 1200;

const INCLUDE_ROOTS = [
  "AGENTS.md",
  "README.md",
  "SECURITY.md",
  ".agents",
  ".ai-toolkit",
  ".codex",
  "agents",
  "checklists",
  "compiled-agents",
  "docs",
  "evals",
  "install",
  "methods",
  "profiles",
  "registries",
  "scripts",
  "skills",
  "templates"
];

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".cache", "temp", "scratch"]);
const SKIP_FILES = new Set([
  "docs/PUBLIC_PRIVATE_LEAK_REPORT.md",
  "docs/PUBLIC_PRIVATE_LEAK_REPORT.json",
  "docs/STALE_UNVERIFIED_DATA_CLASSIFICATION.md"
]);
const TEXT_EXTENSIONS = new Set([
  ".json",
  ".md",
  ".mjs",
  ".js",
  ".ps1",
  ".sh",
  ".toml",
  ".txt",
  ".yaml",
  ".yml"
]);

const SCAN_PATTERNS = [
  {
    id: "riss-v2",
    label: "RISS V2",
    regex: /\bRISS\s+V2\b|\briss-v2\b/gi,
    category: "project-specific-name"
  },
  {
    id: "riss",
    label: "RISS",
    regex: /\bRISS\b|\briss-[a-z0-9-]+\b/gi,
    category: "project-specific-name"
  },
  {
    id: "vdtwin",
    label: "VDTwin",
    regex: /\bVDTwin\b/gi,
    category: "private-project-name"
  },
  {
    id: "visual-twin",
    label: "Visual Twin",
    regex: /\bVisual\s+Twin\b/gi,
    category: "private-project-name"
  },
  {
    id: "vd",
    label: "VD",
    regex: /\bVD\b|\bvd-premium-uiux\b|\blocal-vd-authored\b/gi,
    category: "project-specific-name"
  },
  {
    id: "local-windows-path",
    label: "local Windows path",
    regex: /[A-Za-z]:[\\/]+Users[\\/][^\s)`"'<]+/gi,
    category: "local-machine-path"
  },
  {
    id: "onedrive-path",
    label: "OneDrive path",
    regex: /\bOneDrive[\\/][^\s)`"'<]*/gi,
    category: "local-machine-path"
  },
  {
    id: "private-org-or-repo",
    label: "ASMN-96 org/repo reference",
    regex: /\bASMN-96\b/gi,
    category: "private-repo-reference"
  },
  {
    id: "email-address",
    label: "email address",
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    category: "contact-or-secret-like"
  }
];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function toSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

function parseArgs(argv) {
  const args = { output: DEFAULT_OUTPUT, json: null, maxFindings: MAX_FINDINGS };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--output") {
      args.output = argv[index + 1];
      index += 1;
    } else if (arg === "--json") {
      args.json = argv[index + 1];
      index += 1;
    } else if (arg === "--max-findings") {
      args.maxFindings = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function isTextFile(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext) || ["AGENTS.md", "README.md", "SECURITY.md"].includes(relativePath);
}

async function walk(relativePath, output = []) {
  let entries;
  try {
    entries = await readdir(rootPath(relativePath), { withFileTypes: true });
  } catch {
    if (isTextFile(relativePath)) {
      output.push(relativePath);
    }
    return output;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const child = toSlash(path.join(relativePath, entry.name));
    if (entry.isDirectory()) {
      await walk(child, output);
    } else if (!SKIP_FILES.has(child) && isTextFile(child)) {
      output.push(child);
    }
  }
  return output;
}

function isCompatibilitySurface(relativePath, match) {
  return (
    /(^|\/)(skills|\.agents\/skills|\.ai-toolkit\/skills|registries|\.ai-toolkit\/registries)\//.test(relativePath) &&
    /riss-|vd-premium-uiux|riss-governance|local-vd-authored/i.test(match)
  );
}

function isScannerRuleReference(relativePath) {
  return relativePath === "scripts/scan-public-private-leaks.mjs" ||
    relativePath === "scripts/classify-stale-unverified-data.mjs" ||
    relativePath === "scripts/validate-public-package.mjs" ||
    relativePath === "scripts/test-public-package-validator.mjs";
}

function isGuardrailScriptReference(relativePath) {
  return relativePath === "scripts/ai-toolkit/build-embedded-package.mjs" ||
    relativePath === "scripts/ai-toolkit/run-toolkit-evals.mjs" ||
    relativePath === "scripts/test-sync-runtime.mjs" ||
    relativePath === "scripts/validate-toolkit.mjs";
}

function isMigrationNote(relativePath) {
  return relativePath === "docs/MIGRATION_TO_CANONICAL_SKILLS.md";
}

function isPublicationReviewEvidence(relativePath) {
  return relativePath === "docs/PUBLICATION_REVIEW.md" ||
    relativePath === "docs/PUBLIC_REPOSITORY_READINESS_AUDIT.md";
}

function isHistoricalDoc(relativePath) {
  return /^(CHANGELOG\.md|docs\/(ROADMAP|REAL_PROJECT_READINESS|PROJECT_SYNC_VALIDATION_REPORT|RUNTIME_VERIFICATION|RUNTIME_VERIFICATION_REPORT|UI_UX_PRO_MAX_AUDIT|UPDATE_POLICY|TOOLKIT_ARCHITECTURE|CODEX_GLOBAL_AVAILABILITY))/i.test(relativePath);
}

function isAllowedExampleEmail(match) {
  return /@example\.com$/i.test(match) || match === "git@github.com";
}

function classify(finding) {
  if (finding.file.startsWith(".ai-toolkit/private-overlays/")) {
    return {
      classification: "history-only-blocker",
      action: "Private overlay content must stay out of public output; if present historically, resolve by sanitized mirror or verified history cleanup before visibility change."
    };
  }

  if (isScannerRuleReference(finding.file)) {
    return {
      classification: "safe-guardrail-scanner-evidence",
      action: "Keep; the report-only scanner must name the terms it detects."
    };
  }

  if (isGuardrailScriptReference(finding.file)) {
    return {
      classification: "safe-guardrail-scanner-evidence",
      action: "Keep as guardrail evidence; the script/test names retired or rejected terms so they cannot return to active runtime."
    };
  }

  if (isMigrationNote(finding.file)) {
    return {
      classification: "safe-guardrail-scanner-evidence",
      action: "Keep as migration evidence; old names are documented as removed from active runtime."
    };
  }

  if (isPublicationReviewEvidence(finding.file)) {
    return {
      classification: "owner-decision-blocker",
      action: "Keep as generated publication evidence while the repo remains private; owner must resolve the documented decision before visibility changes."
    };
  }

  if (finding.id === "email-address" && isAllowedExampleEmail(finding.match)) {
    return {
      classification: "false-positive",
      action: "Keep as masked or synthetic example contact data."
    };
  }

  if (finding.category === "local-machine-path" || finding.id === "private-org-or-repo") {
    return {
      classification: "current-tree-blocker",
      action: "Replace, mask, or explicitly approve before any public package or repository release."
    };
  }

  if (["vdtwin", "visual-twin"].includes(finding.id)) {
    return {
      classification: "current-tree-blocker",
      action: "Neutralize project-specific naming or move it out of the public candidate tree before publication."
    };
  }

  if (isCompatibilitySurface(finding.file, finding.context)) {
    return {
      classification: "current-tree-blocker",
      action: "Neutralize active registry/runtime metadata; old private labels must not remain on active public surfaces."
    };
  }

  if (isHistoricalDoc(finding.file)) {
    return {
      classification: "history-only-blocker",
      action: "Historical internal reference; exclude, rewrite, archive, or publish only from a sanitized mirror before public release."
    };
  }

  if (finding.category === "project-specific-name") {
    return {
      classification: "current-tree-blocker",
      action: "Neutralize public/core wording or move project-specific detail out of the public candidate tree."
    };
  }

  return {
    classification: "owner-decision-blocker",
    action: "Review manually before public release."
  };
}

function scanFile(relativePath, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (const [lineIndex, line] of lines.entries()) {
    for (const pattern of SCAN_PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        const rawFinding = {
          id: pattern.id,
          label: pattern.label,
          category: pattern.category,
          file: relativePath,
          line: lineIndex + 1,
          match: match[0],
          context: line.trim().slice(0, 220)
        };
        findings.push({ ...rawFinding, ...classify(rawFinding) });
      }
    }
  }
  return findings;
}

function countBy(findings, key) {
  const counts = new Map();
  for (const finding of findings) {
    counts.set(finding[key], (counts.get(finding[key]) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function escapeCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderReport(findings, scannedFiles, maxFindings) {
  const limitedFindings = findings.slice(0, maxFindings);
  const truncated = findings.length > limitedFindings.length;
  const publicReleaseBlocked = findings.some((finding) => finding.classification !== "false-positive");

  const sections = [
    "# Public/Private Leak Report",
    "",
    "This report is generated by `node scripts/scan-public-private-leaks.mjs`. It is report-only and does not delete, rename, relocate, activate, install, or change runtime behavior.",
    "",
    "## Summary",
    "",
    `- Scanned files: ${scannedFiles}`,
    `- Findings: ${findings.length}`,
    `- Public release status: ${publicReleaseBlocked ? "blocked until findings are resolved or explicitly classified for exclusion" : "no blocking findings detected"}`,
    `- Detail rows shown: ${limitedFindings.length}${truncated ? ` of ${findings.length}` : ""}`,
    "",
    "## Classification Counts",
    "",
    "| Classification | Count |",
    "| --- | ---: |",
    ...countBy(findings, "classification").map(([classification, count]) => `| ${classification} | ${count} |`),
    "",
    "## Pattern Counts",
    "",
    "| Pattern | Count |",
    "| --- | ---: |",
    ...countBy(findings, "label").map(([label, count]) => `| ${label} | ${count} |`),
    "",
    "## Detailed Findings",
    "",
    "| Classification | Pattern | File | Line | Match | Action |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...limitedFindings.map((finding) => [
      finding.classification,
      finding.label,
      finding.file,
      finding.line,
      `\`${escapeCell(finding.match)}\``,
      finding.action
    ].map(escapeCell).join(" | ")).map((row) => `| ${row} |`)
  ];

  if (truncated) {
    sections.push("", `Report truncated at ${maxFindings} findings. Re-run with \`--max-findings ${findings.length}\` to render every row.`);
  }

  sections.push(
    "",
    "## Rules",
    "",
    "- This scan is evidence only; it does not authorize deletion or renaming.",
    "- `current-tree-blocker` means the current repository tree still contains public-candidate content that must be neutralized, moved out of public scope, or explicitly approved before publication.",
    "- `history-only-blocker` means the current text is historical evidence or prior exposure; resolve by archival exclusion, rewrite, sanitized mirror, or verified history cleanup before publication.",
    "- `owner-decision-blocker` means the current text is publication-review evidence that requires an owner decision before visibility changes.",
    "- `safe-guardrail-scanner-evidence` means the term appears only in scanner rules, migration notes, or guardrails that prevent old names from returning to active runtime.",
    "- `false-positive` means the match is synthetic, masked, or otherwise non-sensitive evidence."
  );

  return `${sections.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/scan-public-private-leaks.mjs [--output docs/PUBLIC_PRIVATE_LEAK_REPORT.md] [--json docs/PUBLIC_PRIVATE_LEAK_REPORT.json]");
    return;
  }

  const files = [];
  for (const root of INCLUDE_ROOTS) {
    await walk(root, files);
  }

  const uniqueFiles = [...new Set(files)].sort();
  const findings = [];
  for (const file of uniqueFiles) {
    const text = await readFile(rootPath(file), "utf8");
    findings.push(...scanFile(file, text));
  }

  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.id.localeCompare(b.id));
  const report = renderReport(findings, uniqueFiles.length, args.maxFindings);
  await writeFile(rootPath(args.output), report, "utf8");
  if (args.json) {
    await writeFile(rootPath(args.json), `${JSON.stringify({ scannedFiles: uniqueFiles.length, findings }, null, 2)}\n`, "utf8");
  }

  console.log(`PUBLIC_PRIVATE_LEAK_REPORT ${args.output}`);
  console.log(`scanned files: ${uniqueFiles.length}`);
  console.log(`findings: ${findings.length}`);
  for (const [classification, count] of countBy(findings, "classification")) {
    console.log(`${classification}: ${count}`);
  }
}

await main().catch((error) => {
  console.error(`FAIL scan-public-private-leaks: ${error.message}`);
  process.exitCode = 1;
});
