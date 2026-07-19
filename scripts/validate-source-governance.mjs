#!/usr/bin/env node
import process from "node:process";
import { validateSourceGovernanceRepository } from "./ai-toolkit/source-governance.mjs";

function parseArgs(argv) {
  const result = { freshnessReport: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--help", "-h"].includes(arg)) {
      result.help = true;
    } else if (arg === "--freshness-report") {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      result.freshnessReport = value;
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log("Usage: node scripts/validate-source-governance.mjs [--freshness-report <report.json>]");
    console.log("Read-only validation. It never imports, installs, activates, or refreshes a source.");
    return;
  }
  const result = await validateSourceGovernanceRepository({
    repositoryRoot: process.cwd(),
    freshnessReport: args.freshnessReport
  });
  console.log(`PASS validate-source-governance ${JSON.stringify(result)}`);
}

await main().catch((error) => {
  console.error(`FAIL validate-source-governance: ${error.message}`);
  process.exitCode = 1;
});
