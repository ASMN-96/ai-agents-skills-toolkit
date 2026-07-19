#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  ManagedFilesystem,
  recoverManagedDirectoryTransaction,
  runManagedDirectoryTransaction
} from "./safe-filesystem.mjs";

const PROJECT_TYPES = [
  "react-typescript-saas",
  "backend-api",
  "infra-iac",
  "mobile-webview",
  "deep-release",
  "architecture-hardening"
];

const SHARED_TEMPLATES = [
  "quality-gates.md",
  "owner-approval-checklist.md",
  "react-doctor-adoption-checklist.md",
  "repomix-scoped-context-checklist.md",
  "reviewdog-output-policy.md"
];

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function usage() {
  console.log("Usage: node install/tooling-apply.mjs --target <path> --project-type <type> [--confirm-write] [--overwrite]");
  console.log("Default mode is dry-run. Writes require --confirm-write.");
  console.log(`Supported project types: ${PROJECT_TYPES.join(", ")}`);
}

const target = getArg("--target");
const projectType = getArg("--project-type");
const confirmWrite = process.argv.includes("--confirm-write");
const overwrite = process.argv.includes("--overwrite");

if (!target || !projectType || !PROJECT_TYPES.includes(projectType)) {
  usage();
  process.exitCode = 1;
} else {
  const thisFile = fileURLToPath(import.meta.url);
  const root = path.resolve(path.dirname(thisFile), "..");
  const templateDir = path.join(root, "templates", "tooling");
  const targetRoot = path.resolve(target);
  const destDir = path.join(targetRoot, ".ai-toolkit", "tooling");
  if (confirmWrite) {
    recoverManagedDirectoryTransaction({
      repositoryRoot: targetRoot,
      managedRoot: destDir,
      log: (message) => console.log(message)
    });
  }
  const destinationFilesystem = new ManagedFilesystem({
    repositoryRoot: targetRoot,
    managedRoot: destDir,
    label: "tooling destination"
  });
  const templates = [
    `package-scripts.${projectType}.json`,
    ...SHARED_TEMPLATES
  ];

  console.log(`Tooling apply plan: ${projectType}`);
  console.log(`Target: ${targetRoot}`);
  console.log(confirmWrite ? "Mode: confirm-write" : "Mode: dry-run; no files will be written.");
  console.log("This command copies toolkit-owned templates only into <target>/.ai-toolkit/tooling/.");
  console.log("It does not edit package.json, install packages, run package managers, wire CI, configure MCP, touch global config, or touch product repositories.");

  const copied = [];
  const skipped = [];
  const plannedCopies = [];

  for (const template of templates) {
    const source = path.join(templateDir, template);
    const destination = destinationFilesystem.resolve(template, `tooling destination for ${template}`);
    if (!existsSync(source)) {
      skipped.push(`${template} (missing toolkit template)`);
      continue;
    }
    if (existsSync(destination) && !overwrite) {
      skipped.push(`${template} (exists; use --overwrite to replace)`);
      continue;
    }
    if (confirmWrite) {
      plannedCopies.push({ source, template });
      copied.push(template);
    } else {
      copied.push(`${template} (would copy)`);
    }
  }

  if (confirmWrite) {
    runManagedDirectoryTransaction({
      repositoryRoot: targetRoot,
      managedRoot: destDir,
      label: "tooling apply",
      log: (message) => console.log(message),
      prepare: (filesystem) => {
        for (const item of plannedCopies) {
          filesystem.copyFileFrom(templateDir, item.source, item.template, `tooling template ${item.template}`);
        }
      },
      validate: (filesystem) => {
        for (const item of plannedCopies) {
          const destination = filesystem.assertRegularFile(item.template, `tooling template ${item.template}`);
          const sourceDigest = createHash("sha256").update(readFileSync(item.source)).digest("hex");
          const destinationDigest = createHash("sha256").update(readFileSync(destination)).digest("hex");
          if (sourceDigest !== destinationDigest) {
            throw new Error(`tooling template digest validation failed: ${item.template}`);
          }
        }
      }
    });
  }

  console.log("\nCopied");
  for (const item of copied) {
    console.log(`- ${item}`);
  }
  console.log("\nSkipped");
  for (const item of skipped) {
    console.log(`- ${item}`);
  }
  if (skipped.length === 0) {
    console.log("- none");
  }

  console.log("\nNext manual steps");
  console.log("- Owner reviews copied templates before applying anything to package files.");
  console.log("- Detect the target package manager before recommending package-manager commands; do not assume npm.");
  console.log("- Package-manager changes require separate approval.");
  console.log("- Codex must not claim script or tool output unless the actual command ran.");
}
