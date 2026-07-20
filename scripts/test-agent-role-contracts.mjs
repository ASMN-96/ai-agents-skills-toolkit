#!/usr/bin/env node
import assert from "node:assert/strict";
import { lstat, readFile } from "node:fs/promises";
import test from "node:test";

const ROOT = new URL("../", import.meta.url);
const EXPECTED_AGENTS = [
  "architect-agent",
  "backend-contract-agent",
  "backend-implementation-agent",
  "database-rls-agent",
  "desktop-platform-agent",
  "frontend-agent",
  "mobile-platform-agent",
  "product-agent",
  "qa-test-agent",
  "release-manager-agent",
  "reviewer-agent",
  "security-agent",
  "skill-scout-agent",
  "sre-performance-agent",
  "uiux-agent"
];
const EXPECTED_SANDBOX = new Map(EXPECTED_AGENTS.map((name) => [
  name,
  [
    "backend-implementation-agent",
    "desktop-platform-agent",
    "frontend-agent",
    "mobile-platform-agent"
  ].includes(name)
    ? "workspace-write"
    : "read-only"
]));

function words(value) {
  return value.trim().split(/\s+/u).filter(Boolean).length;
}

function canonicalLf(value) {
  return value.replace(/\r\n?/gu, "\n");
}

async function regularFile(relativePath) {
  const stats = await lstat(new URL(relativePath, ROOT));
  assert.equal(stats.isSymbolicLink(), false, `${relativePath} must not be a link`);
  assert.equal(stats.isFile(), true, `${relativePath} must be a regular file`);
  return readFile(new URL(relativePath, ROOT), "utf8");
}

function assertRoleSections(name, markdown) {
  assert.match(markdown, /^## Role$/mu, `${name} requires Role`);
  assert.match(markdown, /^## Required Inputs$/mu, `${name} requires Required Inputs`);
  assert.match(markdown, /^## Required Checks$/mu, `${name} requires Required Checks`);
  assert.match(markdown, /^## Stop Conditions$/mu, `${name} requires Stop Conditions`);
  assert.match(
    markdown,
    /^## (?:Output Contract|Review Output Contract|Validation Evidence Rules|Output Format)$/mu,
    `${name} requires an evidence/output contract`
  );
  assert.match(
    markdown,
    /^## (?:Operating Rules|Operating Mode|Non-Responsibilities|Boundaries|Hard Boundaries)$/mu,
    `${name} requires an authority boundary`
  );
  assert.match(markdown, /handoff|escalat/iu, `${name} requires a handoff or escalation rule`);
}

test("all registry-declared agent surfaces form one bounded role contract", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  assert.deepEqual(
    registry.agents.map((agent) => agent.name).sort(),
    EXPECTED_AGENTS
  );

  for (const agent of registry.agents) {
    const canonicalPath = `agents/${agent.name}.md`;
    const nativePath = `.codex/agents/${agent.name}.toml`;
    const [canonical, native] = await Promise.all([
      regularFile(canonicalPath),
      regularFile(nativePath)
    ]);

    assertRoleSections(agent.name, canonical);
    assert.ok(words(canonical) <= 1000, `${agent.name} canonical role exceeds 1000 words`);
    assert.ok(words(native) <= 800, `${agent.name} native instructions exceed 800 words`);

    const sandbox = native.match(/^sandbox_mode = "([^"]+)"$/mu)?.[1];
    assert.equal(sandbox, EXPECTED_SANDBOX.get(agent.name), `${agent.name} sandbox drift`);
    assert.match(native, new RegExp(`^name = "${agent.name}"$`, "mu"));
    assert.match(native, /static handoff ledger/iu);
    assert.match(native, /No-fake-validation reporting is required/iu);
    assert.doesNotMatch(native, /\b(?:while true|loop forever|unbounded (?:retry|loop))\b/iu);

    if (sandbox === "workspace-write") {
      assert.match(canonical, /scoped (?:local )?workspace-write/iu);
      assert.doesNotMatch(canonical, /read-only advisory project agent/iu);
    } else {
      assert.match(canonical, /read-only/iu, `${agent.name} must state its read-only authority`);
    }

    const expectedCost = Math.ceil(Buffer.byteLength(canonicalLf(canonical), "utf8") / 3);
    assert.equal(agent.deliveryKernel.measuredContextCost, expectedCost, `${agent.name} context cost drift`);
    assert.equal(
      agent.deliveryKernel.contextCostMeasurement,
      "ceil(UTF-8 LF-normalized source bytes/3)",
      `${agent.name} context measurement drift`
    );
    assert.equal(agent.nativeCodexAgentName, agent.name);
    const provenancePaths = new Set(agent.sourceProvenance.map((entry) => entry.path));
    for (const expectedPath of [canonicalPath, nativePath]) {
      assert.equal(provenancePaths.has(expectedPath), true, `${agent.name} missing ${expectedPath} provenance`);
    }
    const fallbackPath = `compiled-agents/${agent.name}.compiled.md`;
    assert.equal(agent.compiledFallbackPath, fallbackPath);
    await regularFile(fallbackPath);
    assert.equal(provenancePaths.has(fallbackPath), true, `${agent.name} missing ${fallbackPath} provenance`);
    assert.equal(agent.runtimeFiles.compiledFallbackPath, fallbackPath);
    assert.equal(agent.runtimeFiles.compiledFallbackPresent, true);
  }
});

test("native definitions and registry agree on compiled fallback availability", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  for (const agent of registry.agents) {
    const native = await regularFile(`.codex/agents/${agent.name}.toml`);
    const fallbackPath = `compiled-agents/${agent.name}.compiled.md`;
    assert.equal(agent.compiledFallbackPath, fallbackPath);
    assert.match(
      native,
      new RegExp(`Compiled fallback source: ${fallbackPath.replaceAll(".", "\\.")}\\.`, "u"),
      `${agent.name} native definition must match registry fallback availability`
    );
    assert.doesNotMatch(native, /No compiled fallback is published/iu);
    if (agent.status.includes("preview")) {
      assert.match(native, /inline guidance only/iu);
      assert.match(native, /does not prove native.*(?:runtime|platform).*execution/isu);
    }
  }
});

test("new compiled fallbacks retain preview writer boundaries without claiming native execution", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  const previewAgents = registry.agents.filter((agent) => agent.status.includes("preview"));
  assert.deepEqual(
    previewAgents.map((agent) => agent.name),
    ["backend-implementation-agent", "mobile-platform-agent", "desktop-platform-agent"]
  );

  for (const agent of previewAgents) {
    const native = await regularFile(`.codex/agents/${agent.name}.toml`);
    const compiled = await regularFile(agent.compiledFallbackPath);
    assert.match(native, /^sandbox_mode = "workspace-write"$/mu);
    assert.match(compiled, /scoped (?:local )?workspace-write/iu);
    assert.match(compiled, /does not activate native custom agents/iu);
    assert.match(compiled, /never claim.*(?:spawned|wrote|verified).*task-specific runtime evidence/isu);
  }

  const backend = await regularFile("compiled-agents/backend-implementation-agent.compiled.md");
  assert.match(backend, /kernel-assigned.*non-overlapping/iu);
  assert.match(backend, /independent evidence|independent verification/iu);
  assert.match(backend, /does not perform production changes|do not perform production changes/iu);

  for (const name of ["mobile-platform-agent", "desktop-platform-agent"]) {
    const compiled = await regularFile(`compiled-agents/${name}.compiled.md`);
    assert.match(compiled, /native build/iu);
    assert.match(compiled, /simulator|emulator|OS-runtime/iu);
    assert.match(compiled, /signing/iu);
    assert.match(compiled, /(?:store|installer|packaging)/iu);
    assert.match(compiled, /remain blocked when .*required environment is unavailable/isu);
  }
});

test("agent portfolio has one accountable lead, independent verifiers, and bounded scoped writers", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  const leads = registry.agents.filter((agent) => agent.deliveryKernel.eligibleRoles.includes("lead"));
  const verifiers = registry.agents.filter((agent) => agent.deliveryKernel.eligibleRoles.includes("verifier"));
  assert.deepEqual(leads.map((agent) => agent.name), ["architect-agent"]);
  assert.deepEqual(verifiers.map((agent) => agent.name).sort(), ["qa-test-agent", "reviewer-agent"]);

  const writers = [];
  for (const agent of registry.agents) {
    const native = await regularFile(`.codex/agents/${agent.name}.toml`);
    if (/^sandbox_mode = "workspace-write"$/mu.test(native)) writers.push(agent.name);
  }
  assert.deepEqual(writers.sort(), [
    "backend-implementation-agent",
    "desktop-platform-agent",
    "frontend-agent",
    "mobile-platform-agent"
  ]);
});

test("implementation competency belongs only to bounded writer-capable delivery roles", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  const byName = new Map(registry.agents.map((agent) => [agent.name, agent]));

  assert.deepEqual(
    registry.agents
      .filter((agent) => agent.deliveryKernel.canonicalCompetencies.includes("implementation"))
      .map((agent) => agent.name)
      .sort(),
    [
      "backend-implementation-agent",
      "desktop-platform-agent",
      "frontend-agent",
      "mobile-platform-agent"
    ],
    "read-only roles must not satisfy implementation routing"
  );

  assert.equal(
    byName.get("backend-contract-agent").deliveryKernel.canonicalCompetencies.includes("implementation"),
    false,
    "the read-only backend contract reviewer must not advertise implementation authority"
  );
  assert.equal(
    byName.get("backend-contract-agent").deliveryKernel.canonicalCompetencies.includes("contract-review"),
    true,
    "the backend contract reviewer must own a competency that implementation writers cannot substitute"
  );
  assert.equal(
    byName.get("backend-implementation-agent").deliveryKernel.canonicalCompetencies.includes("contract-review"),
    false,
    "the backend implementation writer must not self-certify independent contract review"
  );
  for (const name of [
    "backend-implementation-agent",
    "desktop-platform-agent",
    "frontend-agent",
    "mobile-platform-agent"
  ]) {
    assert.equal(
      byName.get(name).deliveryKernel.canonicalCompetencies.includes("implementation"),
      true,
      `${name} must advertise implementation competency`
    );
  }

  const canonical = await regularFile("agents/backend-implementation-agent.md");
  const native = await regularFile(".codex/agents/backend-implementation-agent.toml");
  assert.match(canonical, /kernel-assigned.*non-overlapping/iu);
  assert.match(canonical, /does not.*(?:production|deploy)/iu);
  assert.match(canonical, /does not.*(?:dependenc|package)/iu);
  assert.match(canonical, /does not.*CI/iu);
  assert.match(native, /Do not .*production/iu);
  assert.match(native, /Do not .*dependenc/iu);
  assert.match(native, /Do not .*CI/iu);
  assert.doesNotMatch(`${canonical}\n${native}`, /\b(?:while true|loop forever|unbounded (?:retry|loop))\b/iu);
});

test("existing roles carry the net-new falsification, resilience, and agent-safety controls", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  const byName = new Map(registry.agents.map((agent) => [agent.name, agent]));
  const reviewer = await regularFile("agents/reviewer-agent.md");
  const reviewerNative = await regularFile(".codex/agents/reviewer-agent.toml");
  assert.match(`${reviewer}\n${reviewerNative}`, /disconfirm|falsif/iu);
  assert.match(`${reviewer}\n${reviewerNative}`, /majority|confidence.*proof/iu);
  assert.match(`${reviewer}\n${reviewerNative}`, /adversarial/iu);
  assert.ok(byName.get("reviewer-agent").deliveryKernel.canonicalCompetencies.includes("adversarial-review"));

  const qa = await regularFile("agents/qa-test-agent.md");
  const qaNative = await regularFile(".codex/agents/qa-test-agent.toml");
  assert.match(`${qa}\n${qaNative}`, /flaky|rerun/iu);
  assert.match(`${qa}\n${qaNative}`, /not (?:a )?(?:pass|success)/iu);
  assert.match(`${qa}\n${qaNative}`, /partial-failure.*duplicate\/retry.*timeout\/cancellation.*concurrency.*stale-state.*recovery/isu);

  const backend = await regularFile("agents/backend-implementation-agent.md");
  const backendNative = await regularFile(".codex/agents/backend-implementation-agent.toml");
  assert.match(`${backend}\n${backendNative}`, /finite timeout/iu);
  assert.match(`${backend}\n${backendNative}`, /backoff|jitter/iu);

  const security = await regularFile("agents/security-agent.md");
  const securityNative = await regularFile(".codex/agents/security-agent.toml");
  assert.match(`${security}\n${securityNative}`, /tool choice|tool parameters/iu);
  assert.match(`${security}\n${securityNative}`, /re-authoriz/iu);
  assert.match(`${security}\n${securityNative}`, /adversarial/iu);
  assert.ok(byName.get("security-agent").deliveryKernel.canonicalCompetencies.includes("adversarial-review"));

  assert.deepEqual(
    registry.agents
      .filter((agent) => agent.deliveryKernel.canonicalCompetencies.includes("failure-semantics"))
      .map((agent) => agent.name)
      .sort(),
    [
      "backend-contract-agent",
      "backend-implementation-agent",
      "database-rls-agent",
      "qa-test-agent",
      "sre-performance-agent"
    ]
  );

  assert.deepEqual(
    registry.agents
      .filter((agent) => agent.deliveryKernel.canonicalCompetencies.includes("technical-research"))
      .map((agent) => agent.name)
      .sort(),
    ["architect-agent", "skill-scout-agent"]
  );
  const architect = await regularFile("agents/architect-agent.md");
  const scout = await regularFile("agents/skill-scout-agent.md");
  assert.match(`${architect}\n${scout}`, /observed-exact/iu);
  assert.match(`${architect}\n${scout}`, /declared-range/iu);
  assert.match(`${architect}\n${scout}`, /stop.*(?:research|decision)|(?:research|decision).*stop/iu);
});

test("compiled fallbacks preserve adopted falsification and agent-safety controls", async () => {
  const reviewer = await regularFile("compiled-agents/reviewer-agent.compiled.md");
  const qa = await regularFile("compiled-agents/qa-test-agent.compiled.md");
  const security = await regularFile("compiled-agents/security-agent.compiled.md");

  assert.match(reviewer, /disconfirm|falsif/iu);
  assert.match(reviewer, /adversarial/iu);
  assert.match(qa, /flaky|rerun/iu);
  assert.match(qa, /not (?:a )?(?:pass|success)/iu);
  assert.match(security, /tool choice|tool parameters/iu);
  assert.match(security, /re-authoriz/iu);
});

test("compiled fallbacks stay below the unwaived warning budget", async () => {
  const registry = JSON.parse(await regularFile("registries/agents.registry.json"));
  const fallbackAgents = registry.agents.filter(
    (agent) => typeof agent.compiledFallbackPath === "string"
  );
  for (const agent of fallbackAgents) {
    const compiled = await regularFile(agent.compiledFallbackPath);
    const words = compiled.trim().split(/\s+/u).filter(Boolean).length;
    assert.ok(words <= 4500, `${agent.name} compiled fallback has ${words} words`);
  }
});

test("release coordination derives portfolio counts instead of freezing magic numbers", async () => {
  for (const path of [
    "agents/release-manager-agent.md",
    ".codex/agents/release-manager-agent.toml"
  ]) {
    const contents = await regularFile(path);
    assert.doesNotMatch(contents, /exactly\s+5\s+canonical\s+skills\s+and\s+12\s+project\s+agents/iu);
    assert.match(contents, /registry-declared/iu);
  }
});

test("general runtime guidance references the registry instead of duplicating portfolio counts", async () => {
  for (const path of [
    "docs/GENERIC_NAMING_COMPATIBILITY.md",
    "docs/RUNTIME_VERIFICATION.md",
    "docs/TOOLKIT_ARCHITECTURE.md",
    "docs/architecture.md"
  ]) {
    const contents = await regularFile(path);
    assert.match(contents, /registry-declared/iu, `${path} must point to the canonical registry`);
    assert.doesNotMatch(
      contents,
      /\b(?:14|15|fourteen|fifteen)\b[^\n]*(?:agent|definition)/iu,
      `${path} must not duplicate a release-specific agent count`
    );
  }
});
