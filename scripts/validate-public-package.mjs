#!/usr/bin/env node
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DEFAULT_OUTPUT = "docs/PUBLIC_PACKAGE_VALIDATION_REPORT.md";

const PUBLIC_ROOTS = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "docs/ROLLOUT_MATURITY_AND_PUBLIC_RELEASE_READINESS.md",
  "docs/PRIVATE_OVERLAY_BOUNDARY.md",
  "docs/PUBLIC_RELEASE_CHECKLIST.md",
  "skills/governance",
  "skills/uiux",
  "skills/code-quality",
  "skills/security-review",
  "skills/pr-release-gate",
  "templates"
];

const REQUIRED_POLICY_FILES = [
  "LICENSE",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md"
];

const TEXT_EXTENSIONS = new Set([".md", ".json", ".toml", ".txt", ".yml", ".yaml"]);

const PATTERNS = [
  {
    label: "local Windows path",
    regex: /[A-Za-z]:[\\/]+Users[\\/][^\s)`"'<]+/gi
  },
  {
    label: "OneDrive path",
    regex: /\bOneDrive[\\/][^\s)`"'<]*/gi
  },
  {
    label: "private org/repo reference",
    regex: /\bASMN-96\b/gi
  },
  {
    label: "project-specific naming",
    regex: /\bRISS\b|\briss-[a-z0-9-]+\b|\bVD\b|\bvd-[a-z0-9-]+\b|\bVDTwin\b|\bVisual\s+Twin\b|\blocal-vd-authored\b/gi
  },
  {
    label: "public release removal marker",
    regex: /\bmust-remove-before-public-release\b/gi
  },
  {
    label: "private overlay marker",
    regex: /\bprivate-overlay-only\b/gi
  },
  {
    label: "unresolved public blocker",
    regex: /\bunresolved-public-blocker\b|\bpublic release blocker\b|\bpublicReleaseStatus\s*:\s*blocked\b/gi
  },
  {
    label: "non-reproducible generated artifact",
    regex: /\bnon-reproducible generated artifact\b|\bnonreproducible generated artifact\b/gi
  }
];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function toSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

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

function usage() {
  return `Usage:
  node scripts/validate-public-package.mjs
  node scripts/validate-public-package.mjs --output ${DEFAULT_OUTPUT}

Validates only the public package allowlist. It does not publish, copy,
install, activate, or mutate runtime configuration.
`;
}

async function exists(relativePath) {
  try {
    await stat(rootPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

function isTextFile(relativePath) {
  if (["README.md", "LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md"].includes(relativePath)) {
    return true;
  }
  return TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
}

async function walk(relativePath, output = []) {
  let stats;
  try {
    stats = await stat(rootPath(relativePath));
  } catch {
    return output;
  }

  if (stats.isFile()) {
    if (isTextFile(relativePath)) output.push(relativePath);
    return output;
  }

  const entries = await readdir(rootPath(relativePath), { withFileTypes: true });
  for (const entry of entries) {
    const child = toSlash(path.join(relativePath, entry.name));
    if (entry.isDirectory()) {
      await walk(child, output);
    } else if (isTextFile(child)) {
      output.push(child);
    }
  }
  return output;
}

function scanText(file, text) {
  const findings = [];
  const lines = text.split(/\r?\n/);
  for (const [lineIndex, line] of lines.entries()) {
    for (const pattern of PATTERNS) {
      pattern.regex.lastIndex = 0;
      let match;
      while ((match = pattern.regex.exec(line)) !== null) {
        findings.push({
          file,
          line: lineIndex + 1,
          pattern: pattern.label,
          match: match[0]
        });
      }
    }
  }
  return findings;
}

function renderReport(files, missingPolicyFiles, findings) {
  const status = missingPolicyFiles.length === 0 && findings.length === 0 ? "PASS" : "FAIL";
  const lines = [
    "# Public Package Validation Report",
    "",
    `Status: ${status}`,
    "",
    "This report validates the public package allowlist only. It does not publish, copy, install, activate, or change runtime configuration.",
    "",
    "## Summary",
    "",
    `- Public files scanned: ${files.length}`,
    `- Missing policy files: ${missingPolicyFiles.length}`,
    `- Findings: ${findings.length}`,
    "",
    "## Missing Policy Files",
    "",
    ...(missingPolicyFiles.length === 0 ? ["None."] : missingPolicyFiles.map((file) => `- ${file}`)),
    "",
    "## Findings",
    ""
  ];

  if (findings.length === 0) {
    lines.push("None.");
  } else {
    lines.push("| Pattern | File | Line | Match |");
    lines.push("| --- | --- | ---: | --- |");
    for (const finding of findings) {
      lines.push(`| ${finding.pattern} | ${finding.file} | ${finding.line} | \`${String(finding.match).replace(/\|/g, "\\|")}\` |`);
    }
  }

  lines.push(
    "",
    "## Public Allowlist",
    "",
    ...PUBLIC_ROOTS.map((entry) => `- ${entry}`)
  );

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const files = [];
  for (const root of PUBLIC_ROOTS) {
    await walk(root, files);
  }
  const uniqueFiles = [...new Set(files)].sort();
  const missingPolicyFiles = [];
  for (const file of REQUIRED_POLICY_FILES) {
    if (!(await exists(file))) {
      missingPolicyFiles.push(file);
    }
  }

  const findings = [];
  for (const file of uniqueFiles) {
    const text = await readFile(rootPath(file), "utf8");
    findings.push(...scanText(file, text));
  }

  const report = renderReport(uniqueFiles, missingPolicyFiles, findings);
  if (args.output) {
    if (args.output !== DEFAULT_OUTPUT) {
      throw new Error(`Unsafe output path. Only ${DEFAULT_OUTPUT} is allowed.`);
    }
    await mkdir(path.dirname(rootPath(args.output)), { recursive: true });
    await writeFile(rootPath(args.output), report, "utf8");
  }

  const passed = missingPolicyFiles.length === 0 && findings.length === 0;
  console.log(passed ? "PASS validate-public-package" : "FAIL validate-public-package");
  console.log(`public files scanned: ${uniqueFiles.length}`);
  console.log(`missing policy files: ${missingPolicyFiles.length}`);
  console.log(`findings: ${findings.length}`);
  for (const finding of findings) {
    console.log(`- ${finding.pattern}: ${finding.file}:${finding.line}: ${finding.match}`);
  }
  if (args.output) console.log(`Wrote ${args.output}`);
  if (!passed) process.exitCode = 1;
}

await main().catch((error) => {
  console.error(`FAIL validate-public-package: ${error.message}`);
  process.exitCode = 1;
});
