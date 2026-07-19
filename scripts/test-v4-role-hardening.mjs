#!/usr/bin/env node
import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);

async function regularFile(relativePath) {
  const url = new URL(relativePath, ROOT);
  const stats = await lstat(url);
  assert.equal(stats.isSymbolicLink(), false, `${relativePath} must not be a link`);
  assert.equal(stats.isFile(), true, `${relativePath} must be a regular file`);
  return readFile(url, "utf8");
}

test("runtime documentation states the single-attempt bounded-wave contract honestly", async () => {
  for (const path of [
    "docs/AGENT_PORTFOLIO_ASSESSMENT_V0_3.md",
    "docs/REAL_PROJECT_READINESS.md",
    "docs/ENTERPRISE_DELIVERY_KERNEL.md"
  ]) {
    const contents = await regularFile(path);
    assert.match(contents, /single-attempt/iu, `${path} must state single-attempt behavior`);
    assert.match(
      contents,
      /(?:retry|replan).*(?:new|fresh).*(?:plan|digest)/iu,
      `${path} must bind retry or replan to a new plan`
    );
    assert.match(contents, /at most two specialists per wave/iu);
    assert.doesNotMatch(contents, /kernel alone owns.*retry\/replan decisions/iu);
  }
});

test("host bridge contract binds effective permissions, actions, delegation, and fresh verifier context", async () => {
  const contents = await regularFile("docs/HOST_EXECUTION_BRIDGE.md");
  assert.match(contents, /effective sandbox mode/iu);
  assert.match(contents, /(?:authorized action|action).*hash/iu);
  assert.match(contents, /input.*hash/iu);
  assert.match(contents, /fresh.*receipt-bound.*verifier context/iu);
  assert.match(contents, /(?:no recursive delegation|recursive delegation.*(?:blocked|forbidden))/iu);
});

test("v4 standards review records provenance and selective clean-room disposition", async () => {
  const contents = await regularFile("docs/UNIFIED_AGENT_ENGINEERING_STANDARD_V4_REVIEW.md");
  assert.match(
    contents,
    /FA3A01EB6EE97AB15C0FCCA6FD4BF96A21EA727BDCE3AF2FA6507B79CC0BDD55/u
  );
  assert.match(contents, /Visual Twin \/ RISS/iu);
  assert.match(contents, /untrusted.*advisory|advisory.*untrusted/iu);
  assert.match(contents, /## Adopted/iu);
  assert.match(contents, /## Rejected/iu);
  assert.match(contents, /## Deferred/iu);
  assert.match(contents, /no wholesale cop/iu);
  assert.match(contents, /license.*(?:unknown|not supplied|not established)/iu);
  assert.match(contents, /not.*(?:certification|compliance claim)/iu);
});

test("v4 modes map to bounded capabilities instead of redundant or looping agents", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  const methods = JSON.parse(await regularFile("registries/methods.registry.json"));
  const names = new Set(registry.agents.map((agent) => agent.name));
  assert.equal(names.size, 15);
  for (const redundant of ["researcher-agent", "red-team-agent", "looping-agent"]) {
    assert.equal(names.has(redundant), false, `${redundant} must remain a capability, not a permanent agent`);
  }

  const byName = new Map(registry.agents.map((agent) => [agent.name, agent]));
  assert.ok(byName.get("architect-agent").deliveryKernel.canonicalCompetencies.includes("technical-research"));
  assert.ok(byName.get("skill-scout-agent").deliveryKernel.canonicalCompetencies.includes("technical-research"));
  assert.ok(byName.get("reviewer-agent").deliveryKernel.canonicalCompetencies.includes("adversarial-review"));
  assert.ok(byName.get("security-agent").deliveryKernel.canonicalCompetencies.includes("adversarial-review"));
  assert.ok(methods.methods.some((method) => (
    method.id === "internal.decision-driven-stack-intelligence"
    && method.methodPath === "methods/internal/decision-driven-stack-intelligence.md"
  )));
});
