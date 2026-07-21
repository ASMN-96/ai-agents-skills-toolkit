#!/usr/bin/env node
import process from "node:process";

import { recordManualSourceObservation } from "./ai-toolkit/source-governance.mjs";

function parseArgs(argv) {
  const result = {
    sourceId: null,
    contentFile: null,
    observedAt: null,
    sourceUrl: undefined,
    etag: undefined,
    lastModified: undefined,
    mode: "dry-run",
    help: false
  };
  let selectedMode = null;
  const values = new Map([
    ["--source-id", "sourceId"],
    ["--content-file", "contentFile"],
    ["--observed-at", "observedAt"],
    ["--source-url", "sourceUrl"],
    ["--etag", "etag"],
    ["--last-modified", "lastModified"]
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--help", "-h"].includes(arg)) {
      result.help = true;
    } else if (values.has(arg)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${arg} requires a value`);
      const field = values.get(arg);
      if (result[field] !== null && result[field] !== undefined) throw new Error(`${arg} may be supplied only once`);
      result[field] = value;
      index += 1;
    } else if (["--dry-run", "--confirm-write"].includes(arg)) {
      const mode = arg.slice(2);
      if (selectedMode && selectedMode !== mode) {
        throw new Error("choose exactly one of --dry-run or --confirm-write");
      }
      selectedMode = mode;
      result.mode = mode;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!result.help) {
    for (const [flag, field] of [["--source-id", "sourceId"], ["--content-file", "contentFile"], ["--observed-at", "observedAt"]]) {
      if (!result[field]) throw new Error(`${flag} is required`);
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(
      "Usage: node scripts/record-manual-source-observation.mjs --source-id <id> --content-file <temporary-downloaded-file> --observed-at <ISO> [--source-url <catalog-url>] [--etag <value>] [--last-modified <value>] [--dry-run|--confirm-write]"
    );
    console.log("Default is dry-run. This records only a normalized content-digest monitor observation; it never copies source content, approves a review, or activates runtime resources.");
    return;
  }
  const result = await recordManualSourceObservation({
    repositoryRoot: process.cwd(),
    sourceId: args.sourceId,
    contentFile: args.contentFile,
    observedAt: args.observedAt,
    sourceUrl: args.sourceUrl,
    etag: args.etag,
    lastModified: args.lastModified,
    mode: args.mode
  });
  console.log(JSON.stringify(result));
}

await main().catch((error) => {
  console.error(`FAIL record-manual-source-observation: ${error.message}`);
  process.exitCode = 1;
});
