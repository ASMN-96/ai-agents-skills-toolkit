#!/usr/bin/env node
import process from "node:process";

import { applySourceFreshness } from "./ai-toolkit/source-governance.mjs";

function parseArgs(argv) {
  const result = { freshnessReport: null, mode: "dry-run", help: false };
  let selectedMode = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--help", "-h"].includes(arg)) result.help = true;
    else if (arg === "--freshness-report") {
      const value = argv[index + 1];
      if (!value) throw new Error("--freshness-report requires a value");
      result.freshnessReport = value;
      index += 1;
    } else if (["--dry-run", "--confirm-write"].includes(arg)) {
      const mode = arg.slice(2);
      if (selectedMode && selectedMode !== mode) {
        throw new Error("choose exactly one of --dry-run or --confirm-write");
      }
      selectedMode = mode;
      result.mode = mode;
    } else throw new Error(`unknown argument: ${arg}`);
  }
  if (!result.help && !result.freshnessReport) throw new Error("--freshness-report is required");
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node scripts/apply-source-freshness.mjs --freshness-report <report.json> [--dry-run|--confirm-write]"
    );
    console.log("Default is dry-run. This updates monitor evidence only; it never approves reviews or activates resources.");
    return;
  }
  const result = await applySourceFreshness({
    repositoryRoot: process.cwd(),
    freshnessReport: args.freshnessReport,
    mode: args.mode
  });
  console.log(JSON.stringify(result));
}

await main().catch((error) => {
  console.error(`FAIL apply-source-freshness: ${error.message}`);
  process.exitCode = 1;
});
