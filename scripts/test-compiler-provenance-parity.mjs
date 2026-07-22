#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import {
  COMPILER_DIGEST_PATHS,
  deriveCompilerProvenance,
  digestCanonicalCompilerInputs
} from "./ai-toolkit/compiler-provenance.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixtureAgent(name = "uiux-agent") {
  return {
    name,
    compiledMethodRefs: ["uiux.visual-direction"],
    ownedSkills: ["uiux"]
  };
}

function fixtureRegistry() {
  return {
    syntheses: [
      {
        id: "security.supply-chain@1",
        capabilityId: "security.supply-chain",
        state: "approved",
        artifactRefs: [
          { id: "method:security.supply-chain", kind: "method", resourceId: "security.supply-chain", decisionRefs: ["security-decision"] }
        ],
        decisions: [{ id: "security-decision", artifactRefs: ["method:security.supply-chain"] }]
      },
      {
        id: "uiux.visual-direction@1",
        capabilityId: "uiux.visual-direction",
        state: "approved",
        artifactRefs: [
          { id: "domain-gate:enterprise-low-risk-scope-review", kind: "domain-gate", resourceId: "enterprise-low-risk-scope-review", decisionRefs: ["uiux-gate-decision"] },
          { id: "method:uiux.visual-direction", kind: "method", resourceId: "uiux.visual-direction", decisionRefs: ["uiux-method-decision"] },
          { id: "skill:uiux", kind: "skill", resourceId: "uiux", decisionRefs: ["uiux-skill-decision"] },
          { id: "tool:playwright", kind: "tool", resourceId: "playwright", decisionRefs: ["uiux-tool-decision"] }
        ],
        decisions: [
          { id: "uiux-gate-decision", artifactRefs: ["domain-gate:enterprise-low-risk-scope-review"] },
          { id: "uiux-method-decision", artifactRefs: ["method:uiux.visual-direction"] },
          { id: "uiux-skill-decision", artifactRefs: ["skill:uiux"] },
          { id: "uiux-tool-decision", artifactRefs: ["tool:playwright"] }
        ]
      }
    ]
  };
}

test("compiled agent receives only synthesis provenance for consumed artifacts", () => {
  const metadata = deriveCompilerProvenance(fixtureAgent(), fixtureRegistry());

  assert.deepEqual(metadata.capabilityIds, ["uiux.visual-direction"]);
  assert.deepEqual(metadata.synthesisIds, ["uiux.visual-direction@1"]);
  assert.deepEqual(metadata.decisionRefs, ["uiux-method-decision", "uiux-skill-decision"]);
  assert.equal(metadata.capabilityIds.includes("security.supply-chain"), false);
  assert.equal(metadata.decisionRefs.includes("uiux-gate-decision"), false);
  assert.equal(metadata.decisionRefs.includes("uiux-tool-decision"), false);
});

test("compiler provenance fails closed for duplicate and dangling consumed artifacts", () => {
  const duplicate = fixtureRegistry();
  duplicate.syntheses.push(structuredClone(duplicate.syntheses[1]));
  assert.throws(
    () => deriveCompilerProvenance(fixtureAgent(), duplicate),
    /duplicate synthesis id/i
  );
  assert.throws(
    () => deriveCompilerProvenance({ ...fixtureAgent(), compiledMethodRefs: ["missing-method"] }, fixtureRegistry()),
    /dangling consumed method/i
  );

  const forgedSelectors = deriveCompilerProvenance({
    ...fixtureAgent(),
    toolRefs: ["playwright"],
    gateRefs: ["enterprise-low-risk-scope-review"]
  }, fixtureRegistry());
  assert.deepEqual(forgedSelectors.decisionRefs, ["uiux-method-decision", "uiux-skill-decision"]);
});

test("compiler provenance rejects a synthesis with missing state", () => {
  const registry = fixtureRegistry();
  delete registry.syntheses[0].state;
  assert.throws(
    () => deriveCompilerProvenance(fixtureAgent(), registry),
    /synthesis state/i
  );
});

test("compiler preview and shared provenance policy produce the same compiler digest", async () => {
  const inputs = await Promise.all(COMPILER_DIGEST_PATHS.map(async (relativePath) => ({
    relativePath,
    text: await readFile(path.join(ROOT, relativePath), "utf8")
  })));
  const expected = digestCanonicalCompilerInputs(inputs);
  const result = await execFileAsync(
    process.execPath,
    ["scripts/compile-agents.mjs", "--only", "product-agent", "--dry-run"],
    { cwd: ROOT, timeout: 30_000 }
  );
  const match = result.stdout.match(/^compiler digest: (sha256:[a-f0-9]{64})$/mu);

  assert.ok(match, result.stdout);
  assert.equal(match[1], expected);
});

test("compiler digest policy is closed, ordered, and normalizes line endings", () => {
  assert.deepEqual(COMPILER_DIGEST_PATHS, [
    "scripts/compile-agents.mjs",
    "scripts/ai-toolkit/compiler-provenance.mjs",
    "install/safe-filesystem.mjs"
  ]);
  assert.equal(Object.isFrozen(COMPILER_DIGEST_PATHS), true);
  assert.equal(
    digestCanonicalCompilerInputs([
      { relativePath: "a", text: "one\r\ntwo\r\n" }
    ]),
    digestCanonicalCompilerInputs([
      { relativePath: "a", text: "one\ntwo\n" }
    ])
  );
  assert.throws(
    () => digestCanonicalCompilerInputs([{ relativePath: "a", text: "x" }, { relativePath: "a", text: "x" }]),
    /unique and ordered/u
  );
});
