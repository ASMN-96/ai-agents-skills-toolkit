#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { TOOLKIT_VERSION } from "./embedded-data.mjs";

const ROOT = process.cwd();
const failures = [];
const warnings = [];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(location, message) {
  failures.push({ location, message });
}

function warn(location, message) {
  warnings.push({ location, message });
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
  } catch (error) {
    fail(relativePath, `JSON parse failed: ${error.message}`);
    return null;
  }
}

async function checkJsonVersion(relativePath, required = true) {
  const json = await readJson(relativePath);
  if (!json) {
    return;
  }
  if (!("toolkitVersion" in json)) {
    if (required) {
      fail(relativePath, "missing toolkitVersion");
    }
    return;
  }
  if (json.toolkitVersion !== TOOLKIT_VERSION) {
    fail(relativePath, `toolkitVersion must be ${TOOLKIT_VERSION}`);
  }
}

async function main() {
  const version = (await readFile(rootPath(".ai-toolkit/VERSION"), "utf8")).trim();
  if (version !== TOOLKIT_VERSION) {
    fail(".ai-toolkit/VERSION", `expected ${TOOLKIT_VERSION}`);
  }

  for (const file of [
    ".ai-toolkit/manifest.json",
    ".ai-toolkit/source-of-truth-map.json",
    ".ai-toolkit/sources/watchlist.json",
    ".ai-toolkit/tool-packs/webapp-quality-security.json",
    ".ai-toolkit/tool-packs/riss-v2-quality-security.json",
    ".ai-toolkit/evals/runtime-activation/runtime-boundary-evals.json",
    ".ai-toolkit/evals/routing/toolkit-routing-evals.json"
  ]) {
    await checkJsonVersion(file);
  }

  for (const file of [
    ".ai-toolkit/registries/agents.registry.json",
    ".ai-toolkit/registries/skills.registry.json",
    ".ai-toolkit/registries/tools.registry.json",
    ".ai-toolkit/registries/routing-matrix.json",
    ".ai-toolkit/registries/profiles.registry.json",
    ".ai-toolkit/registries/methods.registry.json"
  ]) {
    await checkJsonVersion(file, false);
  }

  const compiledManifest = await readJson(".ai-toolkit/manifest.json");
  const compiledMirrors = (compiledManifest?.mirrors || []).filter((mirror) => mirror.target.includes("/compiled-agents/"));
  for (const mirror of compiledMirrors) {
    const text = await readFile(rootPath(mirror.target), "utf8");
    if (!text.includes(`toolkit_version: ${TOOLKIT_VERSION}`)) {
      warn(mirror.target, `compiled-agent metadata does not use ${TOOLKIT_VERSION}; left as explicit drift pending provenance-safe regeneration`);
    }
  }

  for (const warning of warnings) {
    console.log(`WARN ${warning.location}: ${warning.message}`);
  }

  if (failures.length === 0) {
    console.log("PASS validate-version-consistency");
    return;
  }

  console.log("FAIL validate-version-consistency");
  for (const failure of failures) {
    console.log(`- ${failure.location}: ${failure.message}`);
  }
  process.exitCode = 1;
}

await main().catch((error) => {
  console.error("FAIL validate-version-consistency");
  console.error(`fatal: ${error.message}`);
  process.exitCode = 1;
});
