#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const MODES = new Set(["fast-local", "pr-blocking", "frontend-ui", "security-review", "workflow-ci", "deep-release"]);
const SCRIPT_CANDIDATES = {
  "fast-local": ["typecheck", "lint", "test", "build"],
  "pr-blocking": ["typecheck", "lint", "test", "build", "secrets", "audit"],
  "frontend-ui": ["typecheck", "lint", "test", "build", "test:e2e", "test:a11y"],
  "security-review": ["typecheck", "lint", "test", "secrets", "security", "audit"],
  "workflow-ci": ["lint:workflows", "actionlint", "zizmor"],
  "deep-release": ["typecheck", "lint", "test", "build", "secrets", "security", "audit", "test:e2e"]
};

function parseArgs(argv) {
  const args = { mode: "fast-local", dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mode") {
      args.mode = argv[index + 1];
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!MODES.has(args.mode)) {
    throw new Error(`Unknown mode ${args.mode}`);
  }
  return args;
}

async function exists(relativePath) {
  try {
    await access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

function parsePackageManagerField(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^([a-z0-9_-]+)(?:@|$)/);
  if (!match) {
    return "unsupported";
  }
  const manager = match[1];
  return ["npm", "pnpm", "yarn", "bun"].includes(manager) ? manager : "unsupported";
}

async function detectPackageManager(packageJson) {
  const signals = [];
  const fieldManager = parsePackageManagerField(packageJson.packageManager);
  if (fieldManager) {
    signals.push({
      source: "package.json:packageManager",
      manager: fieldManager
    });
  }

  const orderedSignals = [
    ["pnpm-lock.yaml", "pnpm"],
    ["pnpm-workspace.yaml", "pnpm"],
    ["package-lock.json", "npm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"]
  ];
  for (const [file, manager] of orderedSignals) {
    if (await exists(file)) {
      signals.push({ source: file, manager });
    }
  }

  if (signals.length === 0) {
    return { status: "not-detected", manager: null, signals };
  }
  if (signals.some((signal) => signal.manager === "unsupported")) {
    return { status: "ambiguous", manager: null, signals };
  }

  const managers = [...new Set(signals.map((signal) => signal.manager))];
  if (managers.length > 1) {
    return { status: "ambiguous", manager: null, signals };
  }
  return { status: "detected", manager: managers[0], signals };
}

function commandFor(manager, script) {
  if (manager === "npm") {
    return ["npm", ["run", script]];
  }
  if (manager === "pnpm") {
    return ["pnpm", [script]];
  }
  if (manager === "yarn") {
    return ["yarn", [script]];
  }
  if (manager === "bun") {
    return ["bun", ["run", script]];
  }
  return [null, []];
}

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("close", (code) => resolve(code));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/ai-toolkit/run-quality-gate.mjs --mode fast-local --dry-run");
    console.log("       node scripts/ai-toolkit/run-quality-gate.mjs --mode fast-local");
    console.log("Dry-run is capability detection only. Non-dry-run requires runnable project scripts.");
    return;
  }

  console.log(`mode: ${args.mode}`);
  console.log(`dryRun: ${args.dryRun}`);
  console.log(`evidence type: ${args.dryRun ? "dry-run capability detection" : "project script execution requested"}`);

  if (!(await exists("package.json"))) {
    console.log("package.json: missing");
    console.log("scripts detected: none");
    console.log("scripts run: none");
    console.log("quality status: not-run");
    console.log("missing scripts: all; this repository currently has no package.json");
    console.log("skipped tools: all external tools are metadata-only in this pass");
    console.log("approval-required tools: socket, trufflehog, owasp-zap-baseline, harden-runner");
    console.log(args.dryRun
      ? "manual QA required: none for dry-run; implementation validators remain required"
      : "manual QA required: quality gate did not run; add project scripts or run validators manually");
    if (!args.dryRun) {
      process.exitCode = 1;
    }
    return;
  }

  const packageJson = JSON.parse(await readFile(path.resolve(process.cwd(), "package.json"), "utf8"));
  const detection = await detectPackageManager(packageJson);
  if (detection.status !== "detected") {
    console.log(`package manager: ${detection.status === "ambiguous" ? "ambiguous" : "not detected"}`);
    console.log(`package manager signals: ${detection.signals.map((signal) => `${signal.source}=${signal.manager}`).join(", ") || "none"}`);
    console.log("scripts run: none");
    console.log("quality status: not-run");
    console.log("missing scripts: package manager could not be safely inferred from packageManager/workspace/lockfile signals");
    if (!args.dryRun) {
      process.exitCode = 1;
    }
    return;
  }

  const manager = detection.manager;
  const scripts = packageJson.scripts || {};
  const wanted = SCRIPT_CANDIDATES[args.mode];
  const runnable = wanted.filter((script) => scripts[script]);
  const missing = wanted.filter((script) => !scripts[script]);
  console.log(`package manager: ${manager}`);
  console.log(`package manager signals: ${detection.signals.map((signal) => signal.source).join(", ")}`);
  console.log(`scripts detected: ${Object.keys(scripts).sort().join(", ") || "none"}`);
  console.log(`scripts selected: ${runnable.join(", ") || "none"}`);
  console.log(`missing scripts: ${missing.join(", ") || "none"}`);
  console.log("skipped tools: external tools are only used through existing project scripts");

  if (args.dryRun) {
    console.log("scripts run: none");
    console.log("quality status: not-run");
    return;
  }

  if (runnable.length === 0) {
    console.log("scripts run: none");
    console.log("quality status: not-run");
    process.exitCode = 1;
    return;
  }

  for (const script of runnable) {
    const [command, commandArgs] = commandFor(manager, script);
    console.log(`running: ${command} ${commandArgs.join(" ")}`);
    const code = await run(command, commandArgs);
    if (code !== 0) {
      console.log(`failures: ${script} exited ${code}`);
      process.exitCode = code;
      return;
    }
  }
  console.log(`scripts run: ${runnable.join(", ") || "none"}`);
  console.log("quality status: scripts-passed");
}

await main().catch((error) => {
  console.error(`FAIL run-quality-gate: ${error.message}`);
  process.exitCode = 1;
});
