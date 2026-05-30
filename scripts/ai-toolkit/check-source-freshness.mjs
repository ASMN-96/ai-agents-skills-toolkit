#!/usr/bin/env node
import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const WATCHLIST_PATH = ".ai-toolkit/sources/watchlist.json";
const METHODS_REGISTRY_PATH = ".ai-toolkit/registries/methods.registry.json";
const ALLOWED_OUTPUT = ".ai-toolkit/sources/SOURCE_FRESHNESS_REPORT.md";

function parseArgs(argv) {
  const args = { mock: false, output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--mock") {
      args.mock = true;
    } else if (arg === "--output") {
      args.output = argv[index + 1];
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function resolveOutput(output) {
  if (!output) {
    return null;
  }
  if (output !== ALLOWED_OUTPUT) {
    throw new Error(`Unsafe output path. Only ${ALLOWED_OUTPUT} is allowed.`);
  }
  return path.resolve(process.cwd(), output);
}

async function readJsonIfPresent(relativePath) {
  try {
    return JSON.parse(await readFile(path.resolve(process.cwd(), relativePath), "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function parseMethodFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return null;
  }

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function parseSourceRef(value) {
  if (!value) {
    return [];
  }
  if (value.startsWith("[")) {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  }
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

async function buildMethodImpactIndex() {
  const registry = await readJsonIfPresent(METHODS_REGISTRY_PATH);
  const impactIndex = new Map();
  if (!registry) {
    return impactIndex;
  }

  for (const method of registry.methods || []) {
    if (!method.methodPath) {
      continue;
    }
    let text;
    try {
      text = await readFile(path.resolve(process.cwd(), method.methodPath), "utf8");
    } catch (error) {
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }
    const frontmatter = parseMethodFrontmatter(text);
    const sourceRefs = parseSourceRef(frontmatter?.sourceRef || "unknown-review-required")
      .filter((sourceRef) => sourceRef !== "unknown-review-required");
    const label = method.displayName ? `${method.id} (${method.displayName})` : method.id;
    for (const sourceRef of sourceRefs) {
      const existing = impactIndex.get(sourceRef) || [];
      existing.push(label);
      impactIndex.set(sourceRef, existing);
    }
  }

  return impactIndex;
}

function formatAffectedMethods(methods) {
  if (!Array.isArray(methods) || methods.length === 0) {
    return "none registered";
  }
  return methods.sort().join("; ");
}

function render(sources, mock, methodImpactIndex) {
  const generatedAt = new Date().toISOString();
  const lines = [
    "# Embedded Source Freshness Report",
    "",
    mock ? "Generated from mock data." : "Live mode is intentionally not implemented in this embedded pass.",
    "",
    `Generated at: ${generatedAt}`,
    "",
    "Read-only freshness signal only. No import, install, activation, extraction, CI wiring, MCP setup, or global config approval is granted.",
    "",
    "| Source | Repo | Status | Reviewed commit | Reviewed date | Affected methods | Next step |",
    "| --- | --- | --- | --- | --- | --- | --- |"
  ];
  for (const source of sources) {
    const status = source.lastReviewedCommit ? "UNCHANGED_MOCK" : "REVIEW_METADATA_MISSING";
    const nextStep = source.lastReviewedCommit ? "no action" : "source review required before monitoring";
    lines.push(`| ${source.name} | ${source.repoOwner}/${source.repoName} | ${status} | ${source.lastReviewedCommit || "n/a"} | ${source.lastReviewedDate || "n/a"} | ${formatAffectedMethods(methodImpactIndex.get(source.id))} | ${nextStep} |`);
  }
  lines.push(
    "",
    "Affected methods are derived from method `sourceRef` frontmatter and are review-routing hints only.",
    "",
    "This monitor never clones repositories, runs external scripts, copies raw files, installs tools, activates plugins, configures MCP, or updates source records automatically."
  );
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/ai-toolkit/check-source-freshness.mjs --mock [--output ${ALLOWED_OUTPUT}]`);
    return;
  }
  if (!args.mock) {
    throw new Error("Only --mock is enabled in this implementation pass.");
  }
  const outputPath = resolveOutput(args.output);
  const watchlist = JSON.parse(await readFile(path.resolve(process.cwd(), WATCHLIST_PATH), "utf8"));
  const methodImpactIndex = await buildMethodImpactIndex();
  const report = render(watchlist.sources || [], args.mock, methodImpactIndex);
  if (outputPath) {
    await writeFile(outputPath, report, "utf8");
    console.log(`Wrote ${ALLOWED_OUTPUT}`);
  } else {
    process.stdout.write(report);
  }
}

await main().catch((error) => {
  console.error(`FAIL check-source-freshness: ${error.message}`);
  process.exitCode = 1;
});
