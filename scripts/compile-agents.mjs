#!/usr/bin/env node
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

const ROOT = process.cwd();
const TOOLKIT_VERSION = "0.2.3";
const COMPILE_CONTRACT_VERSION = "1.0.0";
const GENERATED_ROOT = "compiled-agents";
const HARD_WORD_WARNING = 30000;
const METHOD_SUMMARY_LINES = 28;
const execFileAsync = promisify(execFile);

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function parseArgs(argv) {
  const args = { confirmWrite: false, help: false, only: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--dry-run") args.confirmWrite = false;
    else if (arg === "--confirm-write") args.confirmWrite = true;
    else if (arg === "--only") {
      const value = argv[index + 1];
      if (!value) throw new Error("--only requires an agent id");
      args.only = value;
      index += 1;
    }
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  node scripts/compile-agents.mjs --dry-run
  node scripts/compile-agents.mjs --confirm-write
  node scripts/compile-agents.mjs --only reviewer-agent --dry-run

Reads only reviewed repo-owned agent, profile, method, and registry inputs.
Write mode updates compiled-agents/*.compiled.md only.
`;
}

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
  } catch {
    return fallback;
  }
}

async function readText(relativePath, fallback = "") {
  try {
    return await readFile(rootPath(relativePath), "utf8");
  } catch {
    return fallback;
  }
}

async function sourceCommit() {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      timeout: 10_000,
      maxBuffer: 1024 * 1024
    });
    return stdout.trim();
  } catch (error) {
    throw new Error(`could not resolve source commit with git rev-parse HEAD: ${error.message}`);
  }
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function blockList(items) {
  return items.length === 0 ? "[]" : `[${items.map((item) => `"${item}"`).join(", ")}]`;
}

function extractTitle(text, fallback) {
  const match = text.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function summarize(text, maxLines = 18) {
  return text
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
}

function methodSourceRefs(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return ["unknown-review-required"];
  const sourceLine = match[1].split(/\r?\n/).find((line) => line.startsWith("sourceRef:"));
  if (!sourceLine) return ["unknown-review-required"];
  const value = sourceLine.slice("sourceRef:".length).trim();
  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : ["unknown-review-required"];
    } catch {
      return ["unknown-review-required"];
    }
  }
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function assertGeneratedPath(relativePath) {
  const resolved = rootPath(relativePath);
  const allowedRoot = rootPath(GENERATED_ROOT);
  if (!(resolved === allowedRoot || resolved.startsWith(`${allowedRoot}${path.sep}`))) {
    throw new Error(`Refusing to write outside ${GENERATED_ROOT}: ${relativePath}`);
  }
}

async function compileAgent(agent, registries, commit) {
  const sourceAgent = `agents/${agent.name}.md`;
  const agentText = await readText(sourceAgent);
  const profileRefs = asArray(agent.profiles).filter((profile) => registries.profiles.has(profile));
  const methodRefs = [];

  for (const method of registries.methods.values()) {
    const passiveConsumers = asArray(method.passiveConsumerAgents).join(" ");
    const relatedScenarios = asArray(method.relatedRoutingScenarios).join(" ");
    if (
      passiveConsumers.includes(agent.displayName || agent.name) ||
      passiveConsumers.includes(agent.name) ||
      relatedScenarios.includes(agent.name)
    ) {
      methodRefs.push(method.id);
    }
  }

  if (methodRefs.length === 0) {
    for (const method of registries.methods.values()) {
      if (asArray(method.passiveConsumerAgents).join(" ").includes("All internal agents")) {
        methodRefs.push(method.id);
      }
    }
  }

  if (methodRefs.length === 0) {
    methodRefs.push(...[...registries.methods.keys()]);
  }

  const profileSections = [];
  for (const profile of profileRefs) {
    profileSections.push(`### ${profile}\n\n${summarize(await readText(`profiles/${profile}.md`, ""), 10) || "No profile body available."}`);
  }

  const methodSections = [];
  const inheritedSourceRefs = new Set();
  for (const methodId of methodRefs) {
    const method = registries.methods.get(methodId);
    if (!method?.methodPath) continue;
    const methodText = await readText(method.methodPath);
    for (const ref of methodSourceRefs(methodText)) inheritedSourceRefs.add(ref);
    methodSections.push(`### ${methodId}\n\nSource: \`${method.methodPath}\`\n\n${summarize(methodText, METHOD_SUMMARY_LINES) || "No method body available."}`);
  }

  const output = `---
toolkit_name: AI Agent Skills Toolkit
toolkit_version: ${TOOLKIT_VERSION}
toolkit_pin: ai-agents-skills-toolkit@${TOOLKIT_VERSION}
compiled_status: review
compiled_at: deterministic-not-recorded
source_commit: ${commit}
source_agent: ${sourceAgent}
compiler: scripts/compile-agents.mjs
registry_input: registries/agents.registry.json
source_profile_refs: ${blockList(profileRefs.map((profile) => `profiles/${profile}.md`))}
source_method_refs: ${blockList(methodRefs)}
compile_contract_version: ${COMPILE_CONTRACT_VERSION}
---

# ${extractTitle(agentText, agent.displayName || agent.name)}

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: \`${sourceAgent}\`

${summarize(agentText, 24) || "No source agent body available."}

## Profiles

${profileSections.length > 0 ? profileSections.join("\n\n") : "No profile references registered."}

## Methods

${methodSections.length > 0 ? methodSections.join("\n\n") : "No passive method references registered."}

## Provenance

- Source agent path: \`${sourceAgent}\`
- Compiler: \`scripts/compile-agents.mjs\`
- Agent registry input: \`registries/agents.registry.json\`
- Profile paths: ${profileRefs.length > 0 ? profileRefs.map((profile) => `\`profiles/${profile}.md\``).join(", ") : "none"}
- Method IDs: ${methodRefs.length > 0 ? methodRefs.map((method) => `\`${method}\``).join(", ") : "none"}
- Inherited sourceRef IDs: ${inheritedSourceRefs.size > 0 ? [...inheritedSourceRefs].sort().map((ref) => `\`${ref}\``).join(", ") : "`unknown-review-required`"}
- Registry files: \`registries/agents.registry.json\`, \`registries/profiles.registry.json\`, \`registries/methods.registry.json\`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
`;

  return {
    agent: agent.name,
    target: agent.compiledFallbackPath || `compiled-agents/${agent.name}.compiled.md`,
    text: output,
    words: output.trim().split(/\s+/).filter(Boolean).length
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const agentsRegistry = await readJson("registries/agents.registry.json", { agents: [] });
  const profilesRegistry = await readJson("registries/profiles.registry.json", { profiles: [] });
  const methodsRegistry = await readJson("registries/methods.registry.json", { methods: [] });
  const registries = {
    profiles: new Map(asArray(profilesRegistry.profiles).map((profile) => [profile.name, profile])),
    methods: new Map(asArray(methodsRegistry.methods).map((method) => [method.id, method]))
  };
  const commit = await sourceCommit();
  const outputs = [];

  const selectedAgents = asArray(agentsRegistry.agents).filter((agent) => !args.only || agent?.name === args.only);
  if (args.only && selectedAgents.length === 0) {
    throw new Error(`--only did not match any registered agent: ${args.only}`);
  }

  for (const agent of selectedAgents) {
    if (!agent?.name || !agent?.compiledFallbackPath) continue;
    outputs.push(await compileAgent(agent, registries, commit));
  }

  console.log(`compile-agents mode: ${args.confirmWrite ? "confirm-write" : "dry-run"}`);
  console.log(`agents: ${outputs.length}`);
  for (const output of outputs) {
    assertGeneratedPath(output.target);
    const sizeStatus = output.words > HARD_WORD_WARNING ? "warn-size" : "size-ok";
    if (args.confirmWrite) {
      await mkdir(path.dirname(rootPath(output.target)), { recursive: true });
      await writeFile(rootPath(output.target), output.text, "utf8");
      console.log(`- ${output.agent}: wrote ${output.target}; words=${output.words}; ${sizeStatus}`);
    } else {
      console.log(`- ${output.agent}: would-write ${output.target}; words=${output.words}; ${sizeStatus}`);
    }
  }
  console.log(args.confirmWrite ? "provenance: generated" : "provenance: preview-only");
}

await main().catch((error) => {
  console.error(`FAIL compile-agents: ${error.message}`);
  process.exitCode = 1;
});
