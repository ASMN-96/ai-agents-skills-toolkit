#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const OUTPUT = "docs/REGISTRY_GENERATION_READINESS_REPORT.md";
const REGISTRIES = [
  ["skills", "registries/skills.registry.json", "skills", "skillPath"],
  ["agents", "registries/agents.registry.json", "agents", "sourcePath"],
  ["profiles", "registries/profiles.registry.json", "profiles", "profilePath"],
  ["methods", "registries/methods.registry.json", "methods", "methodPath"]
];

function parseArgs(argv) {
  const args = { output: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--output") {
      const output = argv[index + 1];
      if (!output) {
        throw new Error("--output requires a path");
      }
      if (output !== OUTPUT) {
        throw new Error(`Unsafe output path. Only ${OUTPUT} is allowed.`);
      }
      args.output = output;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function rootPath(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
}

async function readTextIfPresent(relativePath) {
  if (!relativePath) {
    return null;
  }
  try {
    return await readFile(rootPath(relativePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function parseFrontmatter(text) {
  const match = text?.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
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

function fieldStatus(frontmatter, requiredFields) {
  if (!frontmatter) {
    return { status: "frontmatter-missing", missing: requiredFields };
  }
  const missing = requiredFields.filter((field) => !(field in frontmatter));
  return {
    status: missing.length === 0 ? "frontmatter-ready" : "frontmatter-partial",
    missing
  };
}

function entryPath(type, entry, pathField) {
  if (entry[pathField]) {
    return entry[pathField];
  }
  if (type === "agents" && entry.name) {
    return `agents/${entry.name}.md`;
  }
  if (type === "profiles" && entry.name) {
    return `profiles/${entry.name}.md`;
  }
  return null;
}

async function inspectRegistry([type, registryPath, collectionKey, pathField]) {
  const registry = await readJson(registryPath);
  const requiredFrontmatter = type === "methods"
    ? ["sourceRef", "lastExtracted", "status"]
    : ["name", "description"];
  const rows = [];

  for (const entry of registry[collectionKey] || []) {
    const id = entry.name || entry.id || entry.displayName || "<unknown>";
    const sourcePath = entryPath(type, entry, pathField);
    const text = await readTextIfPresent(sourcePath);
    const frontmatter = parseFrontmatter(text);
    const status = fieldStatus(frontmatter, requiredFrontmatter);
    rows.push({
      id,
      sourcePath: sourcePath || "n/a",
      frontmatterStatus: text ? status.status : "source-missing",
      missing: status.missing.join(", ") || "none",
      generatorPosture: type === "skills" || type === "methods" ? "candidate-input" : "manual-until-frontmatter-exists"
    });
  }

  return { type, rows };
}

function render(sections) {
  const lines = [
    "# Registry Generation Readiness Report",
    "",
    "Report-only readiness signal. This file does not generate registries, approve sources, approve tools, change routing, change trust status, or update runtime activation.",
    "",
    "Future generation may derive stable identity and descriptive fields from frontmatter. Routing decisions, tool trust, license approvals, security status, allowed environments, activation status, and release gates must remain hand-maintained unless a later reviewed contract explicitly narrows that rule.",
    ""
  ];

  for (const section of sections) {
    lines.push(`## ${section.type}`, "");
    lines.push("| Entry | Source path | Frontmatter status | Missing fields | Generator posture |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const row of section.rows) {
      lines.push(`| ${row.id} | ${row.sourcePath} | ${row.frontmatterStatus} | ${row.missing} | ${row.generatorPosture} |`);
    }
    lines.push("");
  }

  lines.push("## Manual Fields That Must Not Be Auto-Generated", "");
  lines.push("- routing matrix scenarios and selected skills");
  lines.push("- external tool enterprise-risk judgments");
  lines.push("- license, trust, security, approval, and allowed-environment decisions");
  lines.push("- active runtime status");
  lines.push("- CI, MCP, GitHub, or product-repository permissions");
  lines.push("- public/private release classifications");

  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(`Usage: node scripts/report-registry-generation-readiness.mjs [--output ${OUTPUT}]`);
    return;
  }

  const sections = [];
  for (const registry of REGISTRIES) {
    sections.push(await inspectRegistry(registry));
  }
  const report = render(sections);

  if (args.output) {
    await writeFile(rootPath(args.output), report, "utf8");
    console.log(`Wrote ${args.output}`);
  } else {
    process.stdout.write(report);
  }
}

await main().catch((error) => {
  console.error(`FAIL report-registry-generation-readiness: ${error.message}`);
  process.exitCode = 1;
});
