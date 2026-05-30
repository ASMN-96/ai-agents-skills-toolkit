#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const failures = [];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(id, message) {
  failures.push({ id, message });
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
}

function findScenario(matrix, scenario) {
  return matrix.scenarios.find((entry) => entry.scenario === scenario);
}

function includesAll(actual, expected) {
  return expected.every((item) => actual.includes(item));
}

async function main() {
  const skills = await readJson("registries/skills.registry.json");
  const matrix = await readJson("registries/routing-matrix.json");
  const runtimeEvals = await readJson(".ai-toolkit/evals/runtime-activation/runtime-boundary-evals.json");
  const routingEvals = await readJson(".ai-toolkit/evals/routing/toolkit-routing-evals.json");

  for (const name of ["riss-governance", "vd-premium-uiux", "riss-code-quality", "riss-security-review", "riss-release-gate"]) {
    if (!skills.skills.some((skill) => skill.name === name)) {
      fail(`skill-${name}`, "expected skill missing from registry");
    }
  }

  const helper = skills.skills.find((skill) => skill.name === "riss-skill-governance");
  if (!helper || helper.registrySurface !== "internal-helper") {
    fail("helper-boundary", "riss-skill-governance must remain internal-helper");
  }

  const quality = findScenario(matrix, "react-typescript-quality-change");
  if (!quality || !includesAll(quality.skills || [], ["riss-governance", "riss-code-quality"])) {
    fail("quality-route", "React/TypeScript route must select riss-governance and riss-code-quality");
  }

  const security = findScenario(matrix, "tenant-security-public-payload-review");
  if (!security || !includesAll(security.skills || [], ["riss-governance", "riss-security-review"])) {
    fail("security-route", "Security route must select riss-governance and riss-security-review");
  }

  const release = findScenario(matrix, "pr-release-coderabbit-gate");
  if (!release || !includesAll(release.skills || [], ["riss-governance", "riss-release-gate"])) {
    fail("release-route", "Release route must select riss-governance and riss-release-gate");
  }

  for (const evalCase of runtimeEvals.cases || []) {
    if (evalCase.id === "ai-toolkit-not-runtime" && evalCase.expected !== "reject-runtime-activation-confusion") {
      fail(evalCase.id, ".ai-toolkit must never evaluate as runtime activation");
    }
  }

  for (const evalCase of routingEvals.cases || []) {
    if (evalCase.forbiddenActions?.includes("install") && !evalCase.forbiddenActions.includes("activate")) {
      fail(evalCase.id, "external source eval must forbid install and activation");
    }
  }

  if (failures.length === 0) {
    console.log("PASS run-toolkit-evals");
    return;
  }

  console.log("FAIL run-toolkit-evals");
  for (const failure of failures) {
    console.log(`- ${failure.id}: ${failure.message}`);
  }
  process.exitCode = 1;
}

await main().catch((error) => {
  console.error("FAIL run-toolkit-evals");
  console.error(`fatal: ${error.message}`);
  process.exitCode = 1;
});
