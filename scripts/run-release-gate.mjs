#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const PROFILES = new Set(["pr", "release", "post-tag"]);

function usage() {
  return `Usage:
  node scripts/run-release-gate.mjs pr [--list] [--json]
  node scripts/run-release-gate.mjs release [--list] [--json]
  node scripts/run-release-gate.mjs post-tag [--list] [--json]

List mode is read-only. Execution runs each profile command in order and stops on
the first non-zero exit. This command never commits, tags, publishes, merges, or
changes remote state.
`;
}

function parseArgs(argv) {
  const args = { profile: null, list: false, json: false, help: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--list") args.list = true;
    else if (arg === "--json") args.json = true;
    else if (!args.profile) args.profile = arg;
    else throw new Error(`unknown argument: ${arg}`);
  }
  if (args.help) return args;
  if (!PROFILES.has(args.profile)) {
    throw new Error("profile must be one of: pr, release, post-tag");
  }
  if (args.json && !args.list) {
    throw new Error("--json is available only with --list");
  }
  return args;
}

function discoverTests() {
  const scriptsRoot = path.join(ROOT, "scripts");
  return readdirSync(scriptsRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^test-.*\.mjs$/.test(entry.name))
    .map((entry) => `scripts/${entry.name}`)
    .sort((left, right) => left.localeCompare(right));
}

function nodeCommand(id, args) {
  return Object.freeze({ id, executable: process.execPath, args: Object.freeze([...args]) });
}

function prCommands(testFiles) {
  return [
    nodeCommand("node-tests", ["--test", "--test-concurrency=1", ...testFiles]),
    nodeCommand("toolkit-policy", ["scripts/validate-toolkit.mjs"]),
    nodeCommand("deterministic-mock-source-freshness", ["scripts/check-source-freshness.mjs", "--mock"]),
    nodeCommand("source-governance", ["scripts/validate-source-governance.mjs"]),
    nodeCommand("embedded-policy", ["scripts/ai-toolkit/validate-ai-toolkit.mjs"]),
    nodeCommand("codex-runtime", ["scripts/ai-toolkit/validate-codex-runtime.mjs"]),
    nodeCommand("reference-closure", ["scripts/ai-toolkit/validate-reference-closure.mjs"]),
    nodeCommand("project-tooling", ["scripts/validate-project-tooling-profiles.mjs"]),
    nodeCommand("public-private-leaks", ["scripts/scan-public-private-leaks.mjs", "--check"]),
    nodeCommand("toolkit-evals", ["scripts/ai-toolkit/run-toolkit-evals.mjs"]),
    nodeCommand("delivery-kernel-evals", ["scripts/ai-toolkit/run-delivery-kernel-evals.mjs"]),
    nodeCommand("enterprise-delivery-benchmark", ["scripts/ai-toolkit/run-enterprise-delivery-benchmark.mjs", "--summary"]),
    nodeCommand("release-evidence-check", ["scripts/validate-v0-3-release-evidence.mjs", "--check"]),
    nodeCommand("compile-check", ["scripts/compile-agents.mjs", "--check"]),
    nodeCommand("runtime-sync-check", ["scripts/sync-runtime.mjs", "--check"]),
    nodeCommand("embedded-package-check", ["scripts/ai-toolkit/build-embedded-package.mjs", "--check"]),
    nodeCommand("public-package", ["scripts/validate-public-package.mjs"])
  ];
}

function commandsFor(profile, testFiles) {
  if (profile === "pr") return prCommands(testFiles);
  if (profile === "release") {
    return [
      ...prCommands(testFiles),
      nodeCommand("release-scoped-source-freshness", [
        "scripts/check-source-freshness.mjs",
        "--fail-on-release-blocker",
        "--output",
        "docs/SOURCE_FRESHNESS_REPORT.md",
        "--json-output",
        "docs/SOURCE_FRESHNESS_REPORT.json"
      ]),
      nodeCommand("live-source-governance", [
        "scripts/validate-source-governance.mjs",
        "--freshness-report",
        "docs/SOURCE_FRESHNESS_REPORT.json"
      ]),
      nodeCommand("release-evidence-ready", [
        "scripts/validate-v0-3-release-evidence.mjs",
        "--require-release-ready"
      ]),
      nodeCommand("level4-readiness", ["scripts/validate-level4-readiness.mjs"]),
      nodeCommand("version-consistency", ["scripts/ai-toolkit/validate-version-consistency.mjs"])
    ];
  }
  return [
    nodeCommand("version-consistency", ["scripts/ai-toolkit/validate-version-consistency.mjs"]),
    nodeCommand("public-package", ["scripts/validate-public-package.mjs"]),
    nodeCommand("toolkit-policy", ["scripts/validate-toolkit.mjs"])
  ];
}

function serializableCommand(command) {
  return { id: command.id, executable: command.executable, args: [...command.args] };
}

function printList(profile, testFiles, commands, asJson) {
  const result = {
    schemaVersion: "1.0.0",
    profile,
    mode: "list",
    testCount: testFiles.length,
    testFiles,
    commands: commands.map(serializableCommand),
    externalMutation: false
  };
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  console.log(`release-gate profile: ${profile}`);
  console.log(`discovered tests: ${testFiles.length}`);
  for (const command of commands) {
    console.log(`- ${command.id}: ${path.basename(command.executable)} ${command.args.join(" ")}`);
  }
}

function execute(profile, testFiles, commands) {
  console.log(`release-gate profile: ${profile}`);
  console.log(`discovered tests: ${testFiles.length}`);
  for (const command of commands) {
    console.log(`RUN ${command.id}`);
    execFileSync(command.executable, [...command.args], {
      cwd: ROOT,
      stdio: "inherit",
      windowsHide: true
    });
  }
  console.log(`PASS release-gate ${profile}`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const testFiles = discoverTests();
  if (testFiles.length === 0 && args.profile !== "post-tag") {
    throw new Error("release gate discovered zero scripts/test-*.mjs files");
  }
  const commands = commandsFor(args.profile, testFiles);
  if (args.list) printList(args.profile, testFiles, commands, args.json);
  else execute(args.profile, testFiles, commands);
}

try {
  main();
} catch (error) {
  console.error(`FAIL run-release-gate: ${error.message}`);
  process.exitCode = 1;
}
