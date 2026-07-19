#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(REPO_ROOT, ...relativePath.split("/")), "utf8");
}

test("canonical lifecycle and PR guidance expose three validation lanes and evidence boundaries", () => {
  const lifecycle = read("methods/internal/engineering-lifecycle-gates.md");
  const prTemplate = read("templates/pr-description-template.md");

  for (const lane of ["Documentation-only", "Behavior/code", "High-risk/release"]) {
    assert.match(lifecycle, new RegExp(lane.replace("/", "\\/"), "i"));
    assert.match(prTemplate, new RegExp(lane.replace("/", "\\/"), "i"));
  }
  for (const evidenceClass of [
    "Local/static",
    "Public linked/read-only",
    "Protected/credentialed remote"
  ]) {
    assert.match(lifecycle, new RegExp(evidenceClass.replaceAll("/", "\\/"), "i"));
    assert.match(prTemplate, new RegExp(evidenceClass.replaceAll("/", "\\/"), "i"));
  }
  assert.match(lifecycle, /unavailable remote evidence[^.]*must not be reported as passed/i);
  assert.match(
    lifecycle,
    /deterministic hashes[^.]*canonical paths[^.]*commands[^.]*manifests[^.]*reproducibility inputs[^.]*gates/is
  );
});

test("token policy uses progressive disclosure and treats 200 lines as an advisory heuristic", () => {
  const policy = read("docs/TOKEN_EFFICIENCY_POLICY.md");

  assert.match(policy, /progressive disclosure/i);
  assert.match(policy, /no universal file-length optimum/i);
  assert.match(policy, /80[–-]120[^.]*not[^.]*universal/i);
  assert.match(policy, /200 lines[^.]*advisory[^.]*not[^.]*gate/is);
  assert.match(policy, /cohesion|coupling|risk/i);
});

test("runtime documentation distinguishes package and consumer manifests", () => {
  const runtime = read("docs/RUNTIME_ACTIVATION_MODEL.md");

  assert.match(runtime, /package[^\n]*`\.ai-toolkit\/manifest\.json`/i);
  assert.match(runtime, /consumer[^\n]*`\.ai-toolkit\/\.ai-toolkit-manifest\.json`/i);
  assert.match(runtime, /neither[^\n]*runtime[^\n]*proof/i);
});

test("governance evals cover lane selection, evidence boundaries, advisory git head, and line heuristics", () => {
  const evals = JSON.parse(read("evals/skills/governance-proof-evals.json"));
  const cases = new Map(evals.cases.map((entry) => [entry.id, entry]));

  for (const id of [
    "validation-lane-documentation-only",
    "validation-lane-behavior-code",
    "validation-lane-high-risk-release",
    "git-head-provenance-not-equality-gate",
    "progressive-disclosure-line-count-advisory"
  ]) {
    assert.ok(cases.has(id), `missing governance proof eval ${id}`);
  }

  const highRisk = cases.get("validation-lane-high-risk-release");
  assert.ok(highRisk.expectedEvidenceClasses.includes("Local/static"));
  assert.ok(highRisk.expectedEvidenceClasses.includes("Remote/linked/credentialed"));

  const gitHead = cases.get("git-head-provenance-not-equality-gate");
  assert.ok(gitHead.forbiddenClaims.includes("git-head-equality-required"));
  assert.ok(gitHead.expectedReviewBehaviors.some((entry) => /deterministic/i.test(entry)));

  const lineCount = cases.get("progressive-disclosure-line-count-advisory");
  assert.equal(lineCount.advisoryReviewHeuristicLines, 200);
  assert.ok(lineCount.forbiddenClaims.includes("universal-80-120-line-optimum"));
});

test("UI quality gates cover applicable state and declared-localization matrices without universal locale policy", () => {
  const method = read("methods/internal/frontend-uiux-quality-gates.md");
  const evals = JSON.parse(read("evals/skills/uiux-evals.json"));
  const cases = new Map(evals.cases.map((entry) => [entry.id, entry]));

  for (const state of ["partial", "permission", "offline", "stale", "confirmation"]) {
    assert.match(method, new RegExp(state, "i"));
  }
  assert.match(method, /project-declared.*locales|locales.*project-declared/is);
  assert.match(method, /text direction/iu);
  assert.match(method, /content expansion/iu);
  assert.match(method, /date.*number.*currency/isu);
  assert.match(method, /only when applicable|when applicable/iu);
  assert.doesNotMatch(method, /all products.*(?:Arabic|RTL)|(?:Arabic|RTL).*all products/iu);

  assert.ok(cases.has("applicable-ui-state-matrix"));
  assert.ok(cases.has("project-declared-localization-matrix"));
});
