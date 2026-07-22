#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertRegularFileWithin, runManagedDirectoryTransaction } from "../install/safe-filesystem.mjs";
import {
  buildSourceUtilizationModel,
  loadSourceUtilizationInputs,
  renderSourceUtilizationMatrix
} from "./ai-toolkit/generate-source-utilization.mjs";

const REPORT_PATH = "docs/SOURCE_UTILIZATION_MATRIX.md";

function parseMode(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--dry-run")) return "dry-run";
  if (argv.length === 1 && argv[0] === "--check") return "check";
  if (argv.length === 1 && argv[0] === "--confirm-write") return "confirm-write";
  throw new Error("Usage: generate-source-utilization.mjs [--dry-run|--check|--confirm-write]");
}

function currentReport(root) {
  try {
    return readFileSync(assertRegularFileWithin(root, path.resolve(root, REPORT_PATH), "source utilization report"));
  } catch (error) {
    if (error?.code === "ENOENT" || /does not exist/i.test(error?.message || "")) return null;
    throw error;
  }
}

export async function generateSourceUtilization({ repositoryRoot = process.cwd(), mode = "dry-run" } = {}) {
  const root = path.resolve(repositoryRoot);
  if (!new Set(["dry-run", "check", "confirm-write"]).has(mode)) throw new Error(`unsupported mode: ${mode}`);
  const inputs = await loadSourceUtilizationInputs(root);
  const expected = Buffer.from(renderSourceUtilizationMatrix(buildSourceUtilizationModel(inputs)), "utf8");
  const actual = currentReport(root);
  const matched = actual !== null && Buffer.compare(actual, expected) === 0;
  const result = { mode, reportPath: REPORT_PATH, bytes: expected.length, matched, written: false };

  if (mode === "dry-run") return result;
  if (mode === "check") {
    return { ...result, exitCode: matched ? 0 : 1 };
  }
  if (matched) return result;

  const observed = actual;
  runManagedDirectoryTransaction({
    repositoryRoot: root,
    managedRoot: path.join(root, "docs"),
    label: "source utilization report generation",
    prepare(staging) {
      staging.writeFile("SOURCE_UTILIZATION_MATRIX.md", expected, undefined, "generated source utilization report");
    },
    beforeBackup() {
      const latest = currentReport(root);
      if ((latest === null) !== (observed === null) || (latest && observed && Buffer.compare(latest, observed) !== 0)) {
        throw new Error("source utilization report changed during generation; retry");
      }
    },
    validate(staging) {
      if (!Buffer.from(staging.readFile("SOURCE_UTILIZATION_MATRIX.md")).equals(expected)) {
        throw new Error("staged source utilization report does not match canonical rendering");
      }
    }
  });
  return { ...result, matched: true, written: true };
}

async function main() {
  const result = await generateSourceUtilization({ mode: parseMode(process.argv.slice(2)) });
  console.log(`${result.mode}: ${result.reportPath} (${result.bytes} bytes)${result.written ? " written" : result.matched ? " current" : " drift"}`);
  if (result.exitCode) process.exitCode = result.exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main().catch((error) => {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  });
}
