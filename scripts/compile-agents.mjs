#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  ManagedFilesystem,
  assertRegularFileWithin,
  runManagedDirectoryTransaction,
  snapshotManagedTree
} from "../install/safe-filesystem.mjs";
import {
  COMPILER_DIGEST_PATHS,
  createCompilerPromotionValidator,
  digestCanonicalCompilerInputs,
  resolveProfileSourcePath
} from "./ai-toolkit/compiler-provenance.mjs";

const ROOT = process.cwd();
const COMPILER_PATH = fileURLToPath(import.meta.url);
const COMPILER_PROVENANCE_PATH = fileURLToPath(new URL("./ai-toolkit/compiler-provenance.mjs", import.meta.url));
const SAFE_FILESYSTEM_PATH = fileURLToPath(new URL("../install/safe-filesystem.mjs", import.meta.url));
const TOOLKIT_VERSION = "0.3.0";
const COMPILE_CONTRACT_VERSION = "1.0.0";
const GENERATED_ROOT = "compiled-agents";
const COMPILED_FALLBACK_TARGET_WORDS = 3500;
const COMPILED_FALLBACK_WARN_WORDS = 4500;
const COMPILED_FALLBACK_MAX_WORDS = 6000;
const CANONICAL_DIRECTORY_ROOTS = ["agents", "profiles", "methods"];
const CANONICAL_REGISTRY_FILES = [
  "registries/agents.registry.json",
  "registries/profiles.registry.json",
  "registries/methods.registry.json"
];
const CANONICAL_SOURCE_PATHS = Object.freeze([
  ...CANONICAL_DIRECTORY_ROOTS,
  ...CANONICAL_REGISTRY_FILES,
  ...COMPILER_DIGEST_PATHS
]);
const COMPILER_PATH_BINDINGS = new Map([
  ["scripts/compile-agents.mjs", COMPILER_PATH],
  ["scripts/ai-toolkit/compiler-provenance.mjs", COMPILER_PROVENANCE_PATH],
  ["install/safe-filesystem.mjs", SAFE_FILESYSTEM_PATH]
]);
const METHOD_SUMMARY_LINES = 7;
const PLACEHOLDER_PATTERN = /\b(?:Stub\.?|placeholder|TBD|compiled later|will be compiled later)\b/i;
const GENERATED_PROVENANCE_KEYS = new Set([
  "compile_contract_version",
  "compiled_at",
  "compiled_status",
  "compiler",
  "compiler_digest",
  "input_digest",
  "input_digest_scope",
  "last_compiled_against",
  "registry_input",
  "source_commit",
  "source_method_refs",
  "source_profile_refs",
  "toolkit_name",
  "toolkit_pin",
  "toolkit_version"
]);
const execFileAsync = promisify(execFile);

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function canonicalFilesystem(relativeRoot, label) {
  return new ManagedFilesystem({
    repositoryRoot: ROOT,
    managedRoot: rootPath(relativeRoot),
    label
  });
}

function filesystemForCanonicalInput(relativePath) {
  const normalized = String(relativePath).replace(/\\/g, "/");
  const root = CANONICAL_DIRECTORY_ROOTS.find((candidate) => normalized === candidate || normalized.startsWith(`${candidate}/`));
  if (root) return canonicalFilesystem(root, `canonical ${root} input`);
  if (normalized.startsWith("registries/")) return canonicalFilesystem("registries", "canonical registry input");
  throw new Error(`path is not a canonical compiler input: ${relativePath}`);
}

function assertCanonicalInput(relativePath, label = `canonical input ${relativePath}`) {
  return filesystemForCanonicalInput(relativePath).assertRegularFile(rootPath(relativePath), label);
}

function assertCompilerInput(relativePath) {
  const compilerPath = COMPILER_PATH_BINDINGS.get(relativePath);
  if (!compilerPath) {
    throw new Error(`canonical compiler digest path is not bound: ${relativePath}`);
  }
  if (path.relative(rootPath(relativePath), compilerPath) !== "") {
    throw new Error(`canonical compiler digest path is not rooted at ${relativePath}`);
  }
  return assertRegularFileWithin(ROOT, compilerPath, `canonical compiler input ${relativePath}`);
}

function assertCanonicalRoots() {
  for (const relativeRoot of CANONICAL_DIRECTORY_ROOTS) {
    canonicalFilesystem(relativeRoot, `canonical ${relativeRoot} input`).assertDirectory(".");
  }
  const registryFilesystem = canonicalFilesystem("registries", "canonical registry input");
  registryFilesystem.assertDirectory(".", "canonical registry parent");
  for (const registry of CANONICAL_REGISTRY_FILES) {
    registryFilesystem.assertRegularFile(rootPath(registry), `canonical registry file ${registry}`);
  }
  for (const relativePath of COMPILER_DIGEST_PATHS) assertCompilerInput(relativePath);
}

function parseArgs(argv) {
  const args = { confirmWrite: false, check: false, help: false, only: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--dry-run") {
      args.confirmWrite = false;
      args.check = false;
    }
    else if (arg === "--confirm-write") {
      args.confirmWrite = true;
      args.check = false;
    }
    else if (arg === "--check") {
      args.confirmWrite = false;
      args.check = true;
    }
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
  node scripts/compile-agents.mjs --check
  node scripts/compile-agents.mjs --confirm-write
  node scripts/compile-agents.mjs --only reviewer-agent --dry-run

Reads only reviewed repo-owned agent, profile, method, and registry inputs.
Write mode updates compiled-agents/*.compiled.md only.
`;
}

async function readJson(relativePath) {
  let text;
  try {
    text = readFileSync(assertCanonicalInput(relativePath), "utf8");
  } catch (error) {
    throw new Error(`could not read canonical JSON ${relativePath}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`invalid JSON in ${relativePath}: ${error.message}`);
  }
}

async function readText(relativePath) {
  try {
    return readFileSync(assertCanonicalInput(relativePath), "utf8");
  } catch (error) {
    throw new Error(`could not read canonical input ${relativePath}: ${error.message}`);
  }
}

async function sourceCommit() {
  try {
    const { stdout } = await execFileAsync("git", [
      "log",
      "-1",
      "--format=%H",
      "--",
      ...CANONICAL_SOURCE_PATHS
    ], {
      cwd: ROOT,
      timeout: 10_000,
      maxBuffer: 1024 * 1024
    });
    const commit = stdout.trim();
    if (!/^[0-9a-f]{40}$/.test(commit)) {
      throw new Error(`expected one lowercase 40-hex commit, received ${commit || "no commit"}`);
    }
    return commit;
  } catch (error) {
    throw new Error(`could not resolve canonical source commit with path-scoped git log: ${error.message}`);
  }
}

async function assertCleanCanonicalInputs() {
  try {
    const { stdout } = await execFileAsync("git", [
      "status",
      "--porcelain",
      "--untracked-files=all",
      "--",
      ...CANONICAL_SOURCE_PATHS
    ], {
      cwd: ROOT,
      timeout: 10_000,
      maxBuffer: 1024 * 1024
    });
    if (stdout.trim()) {
      throw new Error(`dirty canonical inputs:\n${stdout.trim()}`);
    }
  } catch (error) {
    if (String(error.message).includes("dirty canonical inputs")) throw error;
    throw new Error(`could not verify clean canonical inputs: ${error.message}`);
  }
}

function canonicalInputFiles(relativeDirectory) {
  return snapshotManagedTree(ROOT, rootPath(relativeDirectory), `canonical ${relativeDirectory} input`)
    .filter((entry) => entry.type === "file")
    .map((entry) => `${relativeDirectory}/${entry.path}`);
}

function canonicalInputDigest() {
  const files = [
    "agents",
    "profiles",
    "methods"
  ].flatMap(canonicalInputFiles);
  files.push(
    "registries/agents.registry.json",
    "registries/profiles.registry.json",
    "registries/methods.registry.json"
  );
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const normalizedText = readFileSync(assertCanonicalInput(file), "utf8").replace(/\r\n/g, "\n");
    hash.update(file);
    hash.update("\0");
    hash.update(normalizedText);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

function compilerDigest() {
  return digestCanonicalCompilerInputs(COMPILER_DIGEST_PATHS.map((relativePath) => {
    const verifiedPath = assertCompilerInput(relativePath);
    return { relativePath, text: readFileSync(verifiedPath, "utf8") };
  }));
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
  return stripFrontmatter(text)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, maxLines)
    .join("\n");
}

function stripFrontmatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

function generatedProvenanceKeysInSource(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(text);
  if (!match) return [];
  return match[1]
    .split(/\r?\n/u)
    .map((line) => /^([A-Za-z][A-Za-z0-9_-]*)\s*:/u.exec(line)?.[1] ?? null)
    .filter((key) => key !== null && GENERATED_PROVENANCE_KEYS.has(key))
    .sort();
}

function normalizedSectionNames(text) {
  return new Set([...stripFrontmatter(text).matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim().toLowerCase()));
}

function isApprovedAgent(agent) {
  return asArray(agent.status).includes("approved") || asArray(agent.activationStatus).includes("approved");
}

function agentQualityIssues(agentText) {
  const body = stripFrontmatter(agentText);
  const sections = normalizedSectionNames(agentText);
  const words = body.split(/\s+/).filter(Boolean).length;
  const issues = [];
  if (PLACEHOLDER_PATTERN.test(body)) {
    issues.push("contains stub/placeholder language");
  }
  if (words < 120) {
    issues.push(`source body is too thin for approved compilation: ${words} words`);
  }
  if (!sections.has("role")) {
    issues.push("missing ## Role section");
  }
  if (!["status", "operating rules", "runtime status", "operating mode", "hard boundaries", "boundaries"].some((section) => sections.has(section))) {
    issues.push("missing status, operating rules, or boundary section");
  }
  if (![
    "responsibility",
    "responsibilities",
    "required checks",
    "validation evidence rules",
    "review output contract",
    "output contract",
    "operating rules",
    "evaluation checklist"
  ].some((section) => sections.has(section))) {
    issues.push("missing operational responsibility or output section");
  }
  return issues;
}

function normalizeMarkdownHeadingSpacing(text) {
  const lines = text.split("\n");
  const output = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("```")) {
      inFence = !inFence;
      output.push(line);
      continue;
    }

    const isHeading = !inFence && /^#{1,6}\s+\S/.test(line);
    if (isHeading && output.length > 0 && output[output.length - 1] !== "") {
      output.push("");
    }
    output.push(line);
    if (isHeading && index + 1 < lines.length && lines[index + 1] !== "") {
      output.push("");
    }
  }

  return output.join("\n");
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

function validateCompiledOutput(output) {
  assertGeneratedPath(output.target);
  if (typeof output.text !== "string" || output.text.trim().length === 0) {
    throw new Error(`compiled output is empty: ${output.target}`);
  }
  const words = output.text.trim().split(/\s+/).filter(Boolean).length;
  if (!Number.isSafeInteger(output.words) || output.words !== words) {
    throw new Error(`compiled output size validation failed: ${output.target}`);
  }
  if (words > COMPILED_FALLBACK_MAX_WORDS) {
    throw new Error(
      `compiled fallback word budget exceeds ${COMPILED_FALLBACK_MAX_WORDS} words: ${output.target} has ${words}`
    );
  }
  return {
    size: Buffer.byteLength(output.text, "utf8"),
    sha256: createHash("sha256").update(output.text).digest("hex")
  };
}

function compiledSizeStatus(words) {
  if (words > COMPILED_FALLBACK_WARN_WORDS) {
    return `WARN word-budget>${COMPILED_FALLBACK_WARN_WORDS}`;
  }
  if (words > COMPILED_FALLBACK_TARGET_WORDS) {
    return `above-target>${COMPILED_FALLBACK_TARGET_WORDS}`;
  }
  return "target-size";
}

async function compileAgent(agent, registries, commit, inputDigest, compilerHash) {
  const sourceAgent = `agents/${agent.name}.md`;
  const agentText = await readText(sourceAgent);
  const generatedSourceKeys = generatedProvenanceKeysInSource(agentText);
  if (generatedSourceKeys.length > 0) {
    throw new Error(
      `canonical agent source ${sourceAgent} contains generated provenance keys: ${generatedSourceKeys.join(", ")}`
    );
  }
  const qualityIssues = agentQualityIssues(agentText);
  const approved = isApprovedAgent(agent);
  if (approved && qualityIssues.length > 0) {
    throw new Error(`approved agent ${agent.name} cannot compile as approved: ${qualityIssues.join("; ")}`);
  }
  const profileRefs = asArray(agent.profiles)
    .filter((profile) => registries.profiles.has(profile))
    .map((profile) => ({
      name: profile,
      sourcePath: resolveProfileSourcePath(registries.profiles.get(profile))
    }));
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
    profileSections.push(`### ${profile.name}\n\n${summarize(await readText(profile.sourcePath), 10) || "No profile body available."}`);
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
compiled_status: ${approved ? "approved" : "review"}
compiled_at: deterministic-not-recorded
source_commit: ${commit}
input_digest: ${inputDigest}
input_digest_scope: canonical-agent-inputs-v1
compiler_digest: ${compilerHash}
source_agent: ${sourceAgent}
compiler: scripts/compile-agents.mjs
registry_input: registries/agents.registry.json
source_profile_refs: ${blockList(profileRefs.map((profile) => profile.sourcePath))}
source_method_refs: ${blockList(methodRefs)}
compile_contract_version: ${COMPILE_CONTRACT_VERSION}
---

# ${extractTitle(agentText, agent.displayName || agent.name)}

This compiled fallback is generated from reviewed repo-owned inputs. It does not activate native custom agents, plugins, browser checks, MCP servers, global config, external installs, or product-repository writes.

## Source Agent

Source: \`${sourceAgent}\`

${stripFrontmatter(agentText) || "No source agent body available."}

## Profiles

${profileSections.length > 0 ? profileSections.join("\n\n") : "No profile references registered."}

## Methods

${methodSections.length > 0 ? methodSections.join("\n\n") : "No passive method references registered."}

## Provenance

- Source agent path: \`${sourceAgent}\`
- Canonical input digest: \`${inputDigest}\`
- Compiler digest: \`${compilerHash}\`
- Compiler: \`scripts/compile-agents.mjs\`
- Agent registry input: \`registries/agents.registry.json\`
- Profile paths: ${profileRefs.length > 0 ? profileRefs.map((profile) => `\`${profile.sourcePath}\``).join(", ") : "none"}
- Method IDs: ${methodRefs.length > 0 ? methodRefs.map((method) => `\`${method}\``).join(", ") : "none"}
- Inherited sourceRef IDs: ${inheritedSourceRefs.size > 0 ? [...inheritedSourceRefs].sort().map((ref) => `\`${ref}\``).join(", ") : "`unknown-review-required`"}
- Registry files: \`registries/agents.registry.json\`, \`registries/profiles.registry.json\`, \`registries/methods.registry.json\`

External source records are provenance only. They do not authorize raw copying, installs, activation, extraction, runtime configuration, or product-repository changes.
`;

  return {
    agent: agent.name,
    target: agent.compiledFallbackPath || `compiled-agents/${agent.name}.compiled.md`,
    text: normalizeMarkdownHeadingSpacing(output),
    words: output.trim().split(/\s+/).filter(Boolean).length
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  assertCanonicalRoots();
  if (args.confirmWrite) await assertCleanCanonicalInputs();

  const agentsRegistry = await readJson("registries/agents.registry.json");
  const profilesRegistry = await readJson("registries/profiles.registry.json");
  const methodsRegistry = await readJson("registries/methods.registry.json");
  const registries = {
    profiles: new Map(asArray(profilesRegistry.profiles).map((profile) => [profile.name, profile])),
    methods: new Map(asArray(methodsRegistry.methods).map((method) => [method.id, method]))
  };
  const commit = await sourceCommit();
  const inputDigest = await canonicalInputDigest();
  const compilerHash = await compilerDigest();
  const outputs = [];

  const selectedAgents = asArray(agentsRegistry.agents).filter((agent) => !args.only || agent?.name === args.only);
  if (args.only && selectedAgents.length === 0) {
    throw new Error(`--only did not match any registered agent: ${args.only}`);
  }
  if (selectedAgents.length === 0) {
    throw new Error("compilation produced zero outputs because the registry contains no registered agents");
  }

  for (const agent of selectedAgents) {
    if (!agent?.name || !agent?.compiledFallbackPath) continue;
    outputs.push(await compileAgent(agent, registries, commit, inputDigest, compilerHash));
  }
  if (outputs.length === 0) {
    throw new Error("compilation produced zero outputs because no registered agent had a valid name and compiled fallback path");
  }

  const mode = args.confirmWrite ? "confirm-write" : args.check ? "check" : "dry-run";
  console.log(`compile-agents mode: ${mode}`);
  console.log(`agents: ${outputs.length}`);
  console.log(`source commit: ${commit}`);
  console.log(`input digest: ${inputDigest}`);
  console.log(`compiler digest: ${compilerHash}`);
  const validatedOutputs = new Map();
  for (const output of outputs) {
    validatedOutputs.set(output.target, validateCompiledOutput(output));
    const sizeStatus = compiledSizeStatus(output.words);
    if (!args.confirmWrite && !args.check) {
      console.log(`- ${output.agent}: would-write ${output.target}; words=${output.words}; ${sizeStatus}`);
    }
  }

  if (args.check) {
    const outputFilesystem = canonicalFilesystem(GENERATED_ROOT, "compiled output check");
    outputFilesystem.assertDirectory(".", "compiled output root");
    for (const output of outputs) {
      const relativePath = path.relative(GENERATED_ROOT, output.target);
      let actual;
      try {
        outputFilesystem.assertRegularFile(relativePath, `compiled output ${output.target}`);
        actual = outputFilesystem.readFile(relativePath, "utf8", `compiled output ${output.target}`);
      } catch (error) {
        throw new Error(`compiled output missing or unsafe during check: ${output.target}: ${error.message}`);
      }
      if (actual !== output.text) {
        throw new Error(`compiled output drift detected during check: ${output.target}`);
      }
      console.log(`- ${output.agent}: up-to-date ${output.target}; words=${output.words}; ${compiledSizeStatus(output.words)}`);
    }
  }

  if (args.confirmWrite) {
    const recheckedInputDigest = await canonicalInputDigest();
    const recheckedCompilerHash = await compilerDigest();
    if (recheckedInputDigest !== inputDigest || recheckedCompilerHash !== compilerHash) {
      throw new Error("canonical compiler inputs changed after digest validation; refusing output promotion");
    }
    const outputRoot = rootPath(GENERATED_ROOT);
    runManagedDirectoryTransaction({
      repositoryRoot: ROOT,
      managedRoot: outputRoot,
      label: "compiled output",
      log: (message) => console.log(message),
      prepare: (filesystem) => {
        for (const output of outputs) {
          const relativePath = path.relative(GENERATED_ROOT, output.target);
          filesystem.writeFile(relativePath, output.text, "utf8", `compiled output ${output.target}`);
        }
      },
      beforePromote: createCompilerPromotionValidator({
        expectedInputDigest: inputDigest,
        expectedCompilerDigest: compilerHash,
        readCurrentDigests: () => ({
          inputDigest: canonicalInputDigest(),
          compilerDigest: compilerDigest()
        })
      }),
      validate: (filesystem) => {
        for (const output of outputs) {
          const relativePath = path.relative(GENERATED_ROOT, output.target);
          filesystem.assertRegularFile(relativePath, `compiled output ${output.target}`);
          const contents = filesystem.readFile(relativePath, null, `compiled output ${output.target}`);
          const expected = validatedOutputs.get(output.target);
          const actual = {
            size: contents.length,
            sha256: createHash("sha256").update(contents).digest("hex")
          };
          if (actual.size !== expected.size || actual.sha256 !== expected.sha256) {
            throw new Error(`compiled output digest or size validation failed: ${output.target}`);
          }
        }
      }
    });
    for (const output of outputs) {
      const sizeStatus = compiledSizeStatus(output.words);
      console.log(`- ${output.agent}: wrote ${output.target}; words=${output.words}; ${sizeStatus}`);
    }
  }
  console.log(args.confirmWrite ? "provenance: generated" : args.check ? "provenance: verified" : "provenance: preview-only");
}

await main().catch((error) => {
  console.error(`FAIL compile-agents: ${error.message}`);
  process.exitCode = 1;
});
