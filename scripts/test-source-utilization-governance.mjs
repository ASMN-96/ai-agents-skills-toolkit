#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_UTILIZATION_REPORT = "docs/SOURCE_UTILIZATION_MATRIX.md";
const REQUIRED_CONTEXT_METHODS = [
  "orchestration.context-graph-token-budget",
  "orchestration.changed-file-neighborhood-selection",
  "orchestration.compact-agent-context-pack",
  "orchestration.stale-context-graph-detection"
];
const REQUIRED_TOKEN_EVALS = [
  "large-task-compact-context-pack",
  "changed-file-neighborhood-no-whole-repo-dump",
  "private-overlay-exclusion-required",
  "stale-context-graph-detection-required"
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(ROOT, relativePath), "utf8"));
}

async function readText(relativePath) {
  return readFile(path.resolve(ROOT, relativePath), "utf8");
}

function tableHasId(text, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\|\\s*${escaped}\\s*\\|`, "m").test(text);
}

test("source utilization report classifies every watched source and registered tool", async () => {
  const report = await readText(SOURCE_UTILIZATION_REPORT);
  const watchlist = await readJson("sources/source-watchlist.json");
  const tools = await readJson("registries/tools.registry.json");

  assert.match(report, /# Source Utilization Matrix/);
  assert.match(report, /active-method/);
  assert.match(report, /planned-extraction/);
  assert.match(report, /reference-only-with-reason/);
  assert.match(report, /Reject \/ not aligned/);

  for (const source of watchlist.sources) {
    assert.equal(tableHasId(report, source.id), true, `missing watched source classification: ${source.id}`);
  }

  for (const tool of tools.tools) {
    assert.equal(tableHasId(report, tool.id), true, `missing tool classification: ${tool.id}`);
  }

  assert.equal(
    tableHasId(report, "ui-ux-pro-max-audit"),
    true,
    "missing UI UX Pro Max internal audit artifact classification"
  );
  assert.match(report, /docs\/UI_UX_PRO_MAX_AUDIT\.md/);
  assert.match(report, /\|\s*matt-pocock-skills\s*\|\s*Matt Pocock Skills\s*\|\s*active-method\s*\|\s*Do later\s*\|/);
  assert.doesNotMatch(report, /\|\s*matt-pocock-skills\s*\|[^\n]*Refresh reviewed commit/);
});

test("context graph token governance methods are registered and backed by method files", async () => {
  const registry = await readJson("registries/methods.registry.json");
  const ids = new Set(registry.methods.map((method) => method.id));

  for (const methodId of REQUIRED_CONTEXT_METHODS) {
    assert.equal(ids.has(methodId), true, `missing method registry entry: ${methodId}`);
    const method = registry.methods.find((entry) => entry.id === methodId);
    assert.ok(method.methodPath, `missing methodPath for ${methodId}`);
    const text = await readText(method.methodPath);
    assert.match(text, /^---\r?\n/);
    assert.match(text, /sourceRef:/);
    assert.match(text, /sourceRef:\s*\["code-review-graph"\]/);
    assert.match(text, /secret|private-overlay|whole-repo|MCP|global config/i);
    assert.match(text, /Passive Visibility/);
    assert.match(text, /passive governance guidance only/);
    assert.match(text, /does not authorize tool activation/);
  }
});

test("compact agent context pack defines token modes and graph evidence labels", async () => {
  const text = await readText("methods/orchestration/compact-agent-context-pack.md");

  for (const required of [
    "omitted context and reason",
    "`concise`",
    "`standard`",
    "`detailed`",
    "`manual/static`",
    "`tool-generated`"
  ]) {
    assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("token efficiency evals cover compact context governance", async () => {
  const evals = await readJson("evals/token-efficiency/low-risk-concise-routing-evals.json");
  const ids = new Set((evals.cases || []).map((entry) => entry.id));

  for (const evalId of REQUIRED_TOKEN_EVALS) {
    assert.equal(ids.has(evalId), true, `missing token governance eval: ${evalId}`);
  }
});
