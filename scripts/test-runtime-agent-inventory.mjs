#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { deriveApprovedRuntimeAgents } from "./ai-toolkit/runtime-agent-inventory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(readFileSync(path.join(ROOT, "registries", "agents.registry.json"), "utf8"));

function run(relativePath) {
  return spawnSync(process.execPath, [path.join(ROOT, relativePath)], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true
  });
}

test("approved runtime inventory is derived from the canonical registry and retains preview agents", () => {
  const agents = deriveApprovedRuntimeAgents(registry);
  assert.equal(agents.length, registry.agents.length);
  assert.deepEqual(
    agents.filter((agent) => agent.preview).map((agent) => agent.name),
    ["backend-implementation-agent", "mobile-platform-agent", "desktop-platform-agent"]
  );
  assert.deepEqual(
    agents.map((agent) => agent.fileName),
    registry.agents.map((agent) => path.posix.basename(agent.runtimeFiles.tomlPath))
  );
});

test("runtime inventory rejects an unknown or unapproved agent declaration", () => {
  const unknown = structuredClone(registry);
  unknown.agents.push({
    name: "unknown-agent",
    nativeCodexAgentName: "unknown-agent",
    status: ["documented", "native-visible"],
    deliveryKernel: { lifecycle: "active" },
    runtimeFiles: {
      tomlPath: ".codex/agents/unknown-agent.toml",
      tomlPresent: true
    }
  });
  assert.throws(() => deriveApprovedRuntimeAgents(unknown), /approved.*unknown-agent/i);
});

test("runtime validator and toolkit eval use the same canonical inventory", () => {
  const runtime = run("scripts/ai-toolkit/validate-codex-runtime.mjs");
  assert.equal(runtime.status, 0, `${runtime.stdout}\n${runtime.stderr}`);
  assert.match(runtime.stdout, /active runtime: 5 skills, 15 project agents/);

  const evals = run("scripts/ai-toolkit/run-toolkit-evals.mjs");
  assert.equal(evals.status, 0, `${evals.stdout}\n${evals.stderr}`);
});
