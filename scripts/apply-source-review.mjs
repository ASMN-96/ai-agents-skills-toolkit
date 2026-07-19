#!/usr/bin/env node
import process from "node:process";
import { applySourceReview } from "./ai-toolkit/source-governance.mjs";

function parseArgs(argv) {
  const result = { receiptPath: null, mode: "dry-run", help: false };
  let selectedMode = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--help", "-h"].includes(arg)) {
      result.help = true;
    } else if (arg === "--receipt") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      result.receiptPath = value;
      index += 1;
    } else if (["--dry-run", "--confirm-write"].includes(arg)) {
      const mode = arg.slice(2);
      if (selectedMode && selectedMode !== mode) throw new Error("choose exactly one of --dry-run or --confirm-write");
      selectedMode = mode;
      result.mode = mode;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!result.help && !result.receiptPath) throw new Error("--receipt is required");
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/apply-source-review.mjs --receipt <receipt.json> [--dry-run|--confirm-write]");
    console.log("Default is dry-run. --confirm-write stores immutable evidence and updates only the canonical catalog.");
    return;
  }
  const result = await applySourceReview({
    repositoryRoot: process.cwd(),
    receiptPath: args.receiptPath,
    mode: args.mode
  });
  console.log(JSON.stringify(result));
}

await main().catch((error) => {
  console.error(`FAIL apply-source-review: ${error.message}`);
  process.exitCode = 1;
});
