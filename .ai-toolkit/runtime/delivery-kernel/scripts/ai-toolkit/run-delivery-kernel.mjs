#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import {
  assertManagedNewFilePath,
  writeManagedNewFile
} from "../../install/safe-filesystem.mjs";
import { planDeliveryRun } from "./kernel/delivery-kernel.mjs";
import {
  finalizeExecutionRun,
  ingestExecutionEvents,
  prepareExecutionPlan
} from "./kernel/execution-lifecycle.mjs";
import { canonicalDigest } from "./kernel/canonical-digest.mjs";

const FORBIDDEN_CLI_INPUTS = [
  "capabilityEvidence",
  "freshnessEvidence",
  "environment",
  "now",
  "environmentCapabilities"
];
const CLI_INPUTS = new Set(["argv", "cwd", "stdout", "stderr"]);
const COMMAND_FLAGS = Object.freeze({
  plan: new Set(["input", "created-at", "output", "authorize-action"]),
  "ingest-events": new Set(["plan", "events", "output", "authorize-action"]),
  finalize: new Set(["plan", "events", "receipts", "output", "authorize-action"])
});
const REQUIRED_FLAGS = Object.freeze({
  plan: ["input"],
  "ingest-events": ["plan", "events"],
  finalize: ["plan", "events", "receipts"]
});

function usage(command) {
  if (command === "ingest-events") {
    return "Usage: run-delivery-kernel ingest-events --plan <plan.json> --events <events.json>";
  }
  if (command === "finalize") {
    return "Usage: run-delivery-kernel finalize --plan <plan.json> --events <events.json> --receipts <receipts.json>";
  }
  return "Usage: run-delivery-kernel plan --input <request.json>";
}

function parseArguments(rawArgv) {
  if (!Array.isArray(rawArgv) || rawArgv.some((entry) => typeof entry !== "string")) {
    throw new Error("delivery kernel CLI argv must be an array of strings");
  }
  const argv = [...rawArgv];
  const command = argv.length === 0 || argv[0].startsWith("--") ? "plan" : argv.shift();
  const allowed = COMMAND_FLAGS[command];
  if (!allowed) throw new Error(`unknown delivery kernel command: ${command}`);
  const flags = Object.create(null);
  for (let index = 0; index < argv.length; index += 2) {
    const rawFlag = argv[index];
    const value = argv[index + 1];
    if (typeof rawFlag !== "string" || !rawFlag.startsWith("--") || rawFlag.length === 2) {
      throw new Error(usage(command));
    }
    const flag = rawFlag.slice(2);
    if (!allowed.has(flag)) throw new Error(`${command} option --${flag} is not allowed`);
    if (value === undefined || value.startsWith("--")) throw new Error(`${rawFlag} requires a value`);
    if (Object.hasOwn(flags, flag)) throw new Error(`${rawFlag} may be supplied only once`);
    flags[flag] = value;
  }
  for (const flag of REQUIRED_FLAGS[command]) {
    if (!Object.hasOwn(flags, flag)) throw new Error(usage(command));
  }
  if (flags["authorize-action"] && !flags.output) {
    throw new Error("--authorize-action is valid only with --output");
  }
  if (flags.output && flags["authorize-action"] !== "scoped-local-write") {
    throw new Error("--output requires --authorize-action scoped-local-write");
  }
  return { command, flags };
}

async function readJson(filePath, label) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`could not load ${label} from ${filePath}: ${error.message}`);
  }
}

function assertCliOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("delivery kernel CLI options must be a plain own-property record");
  }
  const prototype = Object.getPrototypeOf(options);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error("delivery kernel CLI options must be a plain own-property record");
  }
  for (const field of FORBIDDEN_CLI_INPUTS) {
    if (Object.prototype.hasOwnProperty.call(options, field)) {
      throw new Error(`caller-injected ${field} is forbidden`);
    }
  }
  for (const field of Object.keys(options)) {
    if (!CLI_INPUTS.has(field)) throw new Error(`delivery kernel CLI option ${field} is not allowed`);
  }
}

function resolveInput(cwd, value) {
  return path.resolve(cwd, value);
}

function validateOutputPath(cwd, value) {
  return assertManagedNewFilePath({
    root: path.resolve(cwd),
    candidate: path.resolve(cwd, value),
    label: "output path"
  });
}

function canonicalPlannerProjection(plan) {
  const { executionManifest: ignoredExecutionManifest, ...plannerOutput } = plan;
  void ignoredExecutionManifest;
  return plannerOutput;
}

async function assertSerializedPlanMatchesCanonicalPolicy(plan, cwd) {
  const replanned = await planDeliveryRun(
    { request: plan.request },
    { invocationRoot: cwd }
  );
  const suppliedDigest = canonicalDigest(
    canonicalPlannerProjection(plan),
    "serialized planner output"
  );
  const canonicalPolicyDigest = canonicalDigest(
    canonicalPlannerProjection(replanned),
    "canonical planner output"
  );
  if (suppliedDigest !== canonicalPolicyDigest) {
    throw new Error(
      "serialized plan does not match the current canonical planner policy; run plan again"
    );
  }
}

async function buildResult(command, flags, cwd) {
  if (command === "plan") {
    const requestPath = resolveInput(cwd, flags.input);
    const request = await readJson(requestPath, "delivery request");
    const planned = await planDeliveryRun({ request }, { invocationRoot: cwd });
    return {
      result: prepareExecutionPlan(planned, {
        createdAt: flags["created-at"] ?? new Date().toISOString()
      }),
      authorizationPlan: planned
    };
  }
  const plan = await readJson(resolveInput(cwd, flags.plan), "prepared execution plan");
  await assertSerializedPlanMatchesCanonicalPolicy(plan, cwd);
  const events = await readJson(resolveInput(cwd, flags.events), "execution events");
  if (command === "ingest-events") {
    return { result: ingestExecutionEvents({ plan, events }), authorizationPlan: plan };
  }
  const receipts = await readJson(resolveInput(cwd, flags.receipts), "execution receipts");
  return { result: finalizeExecutionRun({ plan, events, receipts }), authorizationPlan: plan };
}

export async function runDeliveryKernelCli(options = {}) {
  assertCliOptions(options);
  const {
    argv = process.argv.slice(2),
    cwd = process.cwd(),
    stdout = process.stdout,
    stderr = process.stderr
  } = options;
  void stderr;

  const { command, flags } = parseArguments(argv);
  const outputPath = flags.output ? validateOutputPath(cwd, flags.output) : null;
  const { result, authorizationPlan } = await buildResult(command, flags, cwd);
  if (outputPath) {
    if (!authorizationPlan?.task?.authorizedActions?.includes("scoped-local-write")) {
      throw new Error("prepared plan does not authorize scoped-local-write");
    }
    validateOutputPath(cwd, flags.output);
    writeManagedNewFile({
      root: path.resolve(cwd),
      candidate: outputPath,
      contents: `${JSON.stringify(result, null, 2)}\n`,
      encoding: "utf8",
      label: "output path"
    });
  }
  stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const invokedAsMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedAsMain) {
  await runDeliveryKernelCli().catch((error) => {
    process.stderr.write(`FAIL run-delivery-kernel: ${error.message}\n`);
    process.exitCode = 1;
  });
}
