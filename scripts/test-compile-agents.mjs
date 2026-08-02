#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runManagedDirectoryTransaction } from "../install/safe-filesystem.mjs";
import { COMPILER_DIGEST_PATHS } from "./ai-toolkit/compiler-provenance.mjs";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "compile-agents.mjs");
const CANONICAL_SOURCE_PATHS = [
  "agents",
  "profiles",
  "methods",
  "registries/agents.registry.json",
  "registries/profiles.registry.json",
  "registries/methods.registry.json",
  ...COMPILER_DIGEST_PATHS
];

function gitCommitAll(cwd, message) {
  execFileSync("git", ["add", "."], { cwd, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", message], { cwd, stdio: "ignore" });
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
}

function compiledSourceCommit(cwd) {
  const text = readFileSync(path.join(cwd, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");
  const match = /^source_commit: ([0-9a-f]{40})$/m.exec(text);
  assert.ok(match, "compiled output must contain an exact lowercase 40-hex source_commit");
  return match[1];
}

function latestCanonicalSourceCommit(cwd) {
  return execFileSync("git", ["log", "-1", "--format=%H", "--", ...CANONICAL_SOURCE_PATHS], {
    cwd,
    encoding: "utf8"
  }).trim();
}

function createDirectoryLinkOrSkip(t, target, linkPath) {
  try {
    symlinkSync(target, linkPath, process.platform === "win32" ? "junction" : "dir");
    return true;
  } catch (error) {
    if (["EACCES", "EPERM", "UNKNOWN"].includes(error?.code)) {
      t.skip(`directory links are not supported by this host: ${error.code}`);
      return false;
    }
    throw error;
  }
}

function createFileLinkOrSkip(t, target, linkPath) {
  try {
    if (process.platform === "win32") linkSync(target, linkPath);
    else symlinkSync(target, linkPath, "file");
    return true;
  } catch (error) {
    if (["EACCES", "EPERM", "UNKNOWN"].includes(error?.code)) {
      t.skip(`final-file links are not supported by this host: ${error.code}`);
      return false;
    }
    throw error;
  }
}

async function runCompiler(cwd, args = [], options = {}) {
  try {
    const fixtureScript = path.join(cwd, "scripts", "compile-agents.mjs");
    const result = await execFileAsync(process.execPath, [fixtureScript, ...args], { cwd, ...options });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error)
    };
  }
}

async function withCompilerFixture(callback) {
  const fixture = mkdtempSync(path.join(os.tmpdir(), "compile-agents-"));
  try {
    mkdirSync(path.join(fixture, "agents"), { recursive: true });
    mkdirSync(path.join(fixture, "compiled-agents"), { recursive: true });
    mkdirSync(path.join(fixture, "profiles"), { recursive: true });
    mkdirSync(path.join(fixture, "methods", "internal"), { recursive: true });
    mkdirSync(path.join(fixture, "registries"), { recursive: true });
    mkdirSync(path.join(fixture, "docs"), { recursive: true });
    mkdirSync(path.join(fixture, "scripts", "ai-toolkit"), { recursive: true });
    mkdirSync(path.join(fixture, "install"), { recursive: true });

    for (const relativePath of [
      "scripts/compile-agents.mjs",
      "scripts/ai-toolkit/compiler-provenance.mjs",
      "install/safe-filesystem.mjs"
    ]) {
      copyFileSync(path.join(ROOT, relativePath), path.join(fixture, relativePath));
    }

    writeFileSync(path.join(fixture, "agents", "reviewer-agent.md"), `# Reviewer Agent

## Role

Reviews diffs, plans, registry changes, generated artifacts, validation evidence, and release-readiness claims.

## Status

Active as a reviewed compiled-fallback source when registry metadata marks it approved.

## Responsibility

- Lead with correctness, regression, security, public/private boundary, and validation findings.
- Ground findings in changed files, commands, registries, generated artifacts, or observed output.
- Separate selected, dry-run, unavailable, metadata-only, and fallback evidence from real execution.
- Report skipped checks and WARN output before completion or release claims.

## Required Checks

- Confirm the branch, intended scope, source files, generated files, and validation evidence are coherent.
- Check that registry metadata does not imply runtime activation or tool execution.
- Check that generated fallback files still match source-agent, profile, and method inputs.

## Output Contract

Return findings first, then assumptions, verification status, residual risk, and release posture when relevant.
`, "utf8");
    writeFileSync(path.join(fixture, "profiles", "audit-profile.md"), "# Audit Profile\n\nUse concise review.\n", "utf8");
    writeFileSync(path.join(fixture, "methods", "internal", "review.md"), "---\nsourceRef: [\"unknown-review-required\"]\nlastExtracted: unknown-review-required\nstatus: approved\n---\n\n# Review Method\n\nCheck correctness.\n", "utf8");
    writeFileSync(path.join(fixture, "registries", "agents.registry.json"), `${JSON.stringify({
      agents: [{
        name: "reviewer-agent",
        displayName: "Reviewer Agent",
        compiledFallbackPath: "compiled-agents/reviewer-agent.compiled.md",
        profiles: ["audit-profile"],
        status: ["approved"],
        activationStatus: ["approved"]
      }]
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(fixture, "registries", "profiles.registry.json"), `${JSON.stringify({
      profiles: [{
        name: "audit-profile",
        sourceProvenance: [{ path: "profiles/audit-profile.md", category: "internal-artifact" }]
      }]
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(fixture, "registries", "methods.registry.json"), `${JSON.stringify({
      methods: [{
        id: "internal.review",
        displayName: "Review Method",
        methodPath: "methods/internal/review.md"
      }]
    }, null, 2)}\n`, "utf8");
    writeFileSync(path.join(fixture, "registries", "source-capabilities.registry.json"), "{\"syntheses\":[]}\n", "utf8");

    execFileSync("git", ["init"], { cwd: fixture, stdio: "ignore" });
    execFileSync("git", ["config", "user.email", "toolkit-test@example.invalid"], { cwd: fixture });
    execFileSync("git", ["config", "user.name", "Toolkit Test"], { cwd: fixture });
    gitCommitAll(fixture, "fixture");

    return await callback(fixture);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

test("dry-run reports compiled output without writing generated artifacts", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /compile-agents mode: dry-run/);
    assert.match(result.stdout, /reviewer-agent/);
    assert.match(result.stdout, /would-write/);
    assert.equal(existsSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md")), false);
  });
});

test("confirm-write generates metadata-rich compiled agent and reports provenance", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /compile-agents mode: confirm-write/);
    assert.match(result.stdout, /wrote/);
    const compiled = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");
    assert.match(compiled, /toolkit_version: 0\.3\.0/);
    assert.match(compiled, /compiled_status: approved/);
    assert.match(compiled, /source_commit: [0-9a-f]{40}/);
    assert.match(compiled, /input_digest: sha256:[0-9a-f]{64}/);
    assert.match(compiled, /input_digest_scope: canonical-agent-inputs-v1/);
    assert.match(compiled, /compiler_digest: sha256:[0-9a-f]{64}/);
    assert.match(compiled, /source_agent: agents\/reviewer-agent\.md/);
    assert.match(compiled, /compiler: scripts\/compile-agents\.mjs/);
    assert.match(compiled, /registry_input: registries\/agents\.registry\.json/);
    assert.match(compiled, /source_profile_refs:/);
    assert.match(compiled, /source_method_refs:/);
    assert.match(compiled, /compile_contract_version: 1\.0\.0/);
    assert.match(compiled, /## Provenance/);
    assert.match(compiled, /internal\.review/);
    assert.equal(compiledSourceCommit(fixture), latestCanonicalSourceCommit(fixture));
  });
});

test("CRLF and LF compiler inputs render identically without extra blank headings", async () => {
  await withCompilerFixture(async (fixture) => {
    const lfResult = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(lfResult.code, 0, lfResult.stderr);
    const lfOutput = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");

    for (const relativePath of [
      "agents/reviewer-agent.md",
      "profiles/audit-profile.md",
      "methods/internal/review.md"
    ]) {
      const sourcePath = path.join(fixture, ...relativePath.split("/"));
      writeFileSync(sourcePath, readFileSync(sourcePath, "utf8").replaceAll("\n", "\r\n"), "utf8");
    }
    gitCommitAll(fixture, "use CRLF compiler fixture inputs");

    const crlfResult = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(crlfResult.code, 0, crlfResult.stderr);
    const crlfOutput = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");

    const withoutSourceCommit = (text) => text.replace(/^source_commit: [0-9a-f]{40}$/m, "source_commit: <commit>");
    assert.equal(withoutSourceCommit(crlfOutput), withoutSourceCommit(lfOutput));
    assert.doesNotMatch(crlfOutput, /\r/u);
    assert.doesNotMatch(crlfOutput, /# Reviewer Agent\n\n\n+## Role/u);
  });
});

test("unrelated approved synthesis changes do not perturb an unaffected compiled agent", async () => {
  await withCompilerFixture(async (fixture) => {
    const agentsPath = path.join(fixture, "registries", "agents.registry.json");
    const agents = JSON.parse(readFileSync(agentsPath, "utf8"));
    agents.agents[0].compiledMethodRefs = ["internal.review"];
    writeFileSync(agentsPath, `${JSON.stringify(agents, null, 2)}\n`, "utf8");
    const sourceCapabilitiesPath = path.join(fixture, "registries", "source-capabilities.registry.json");
    const sourceCapabilities = {
      syntheses: [
        {
          id: "security.supply-chain@1",
          capabilityId: "security.supply-chain",
          state: "approved",
          artifactRefs: [{
            id: "method:security.supply-chain",
            kind: "method",
            resourceId: "security.supply-chain",
            decisionRefs: ["security-decision"]
          }],
          decisions: [{ id: "security-decision", artifactRefs: ["method:security.supply-chain"] }]
        },
        {
          id: "uiux.visual-direction@1",
          capabilityId: "uiux.visual-direction",
          state: "approved",
          artifactRefs: [{
            id: "method:internal.review",
            kind: "method",
            resourceId: "internal.review",
            decisionRefs: ["uiux-decision"]
          }],
          decisions: [{ id: "uiux-decision", artifactRefs: ["method:internal.review"] }]
        }
      ]
    };
    writeFileSync(sourceCapabilitiesPath, `${JSON.stringify(sourceCapabilities, null, 2)}\n`, "utf8");
    gitCommitAll(fixture, "add isolated synthesis provenance");

    const generated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(generated.code, 0, generated.stderr);
    const outputPath = path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md");
    const before = readFileSync(outputPath, "utf8");
    assert.match(before, /capabilityIds: \["uiux\.visual-direction"\]/u);
    assert.match(before, /synthesisIds: \["uiux\.visual-direction@1"\]/u);
    assert.match(before, /decisionRefs: \["uiux-decision"\]/u);
    assert.doesNotMatch(before, /security\.supply-chain/u);

    sourceCapabilities.syntheses[0].decisions[0].id = "security-decision-v2";
    sourceCapabilities.syntheses[0].artifactRefs[0].decisionRefs = ["security-decision-v2"];
    sourceCapabilities.syntheses[0].decisions[0].artifactRefs = ["method:security.supply-chain"];
    writeFileSync(sourceCapabilitiesPath, `${JSON.stringify(sourceCapabilities, null, 2)}\n`, "utf8");
    gitCommitAll(fixture, "change unrelated security synthesis");

    const checked = await runCompiler(fixture, ["--check"]);
    assert.equal(checked.code, 0, checked.stderr);
    assert.equal(readFileSync(outputPath, "utf8"), before);
  });
});

test("explicit compiled method references preserve registry order and provenance", async () => {
  await withCompilerFixture(async (fixture) => {
    for (const [id, file, body] of [
      ["internal.first", "first.md", "First explicit method."],
      ["internal.last", "last.md", "Last explicit method."]
    ]) {
      writeFileSync(path.join(fixture, "methods", "internal", file), `---\nsourceRef: ["${id}"]\n---\n\n# ${id}\n\n${body}\n`, "utf8");
    }
    const agentsPath = path.join(fixture, "registries", "agents.registry.json");
    const agents = JSON.parse(readFileSync(agentsPath, "utf8"));
    agents.agents[0].compiledMethodRefs = ["internal.last", "internal.review", "internal.first"];
    writeFileSync(agentsPath, `${JSON.stringify(agents, null, 2)}\n`, "utf8");
    const methodsPath = path.join(fixture, "registries", "methods.registry.json");
    const methods = JSON.parse(readFileSync(methodsPath, "utf8"));
    methods.methods.push(
      { id: "internal.first", methodPath: "methods/internal/first.md" },
      { id: "internal.last", methodPath: "methods/internal/last.md" }
    );
    writeFileSync(methodsPath, `${JSON.stringify(methods, null, 2)}\n`, "utf8");
    gitCommitAll(fixture, "explicit compiled method refs");

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.equal(result.code, 0, result.stderr);
    const compiled = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");
    assert.match(compiled, /source_method_refs: \["internal\.last", "internal\.review", "internal\.first"\]/u);
    assert.ok(compiled.indexOf("### internal.last") < compiled.indexOf("### internal.review"));
    assert.ok(compiled.indexOf("### internal.review") < compiled.indexOf("### internal.first"));
    assert.match(compiled, /Inherited sourceRef IDs: `internal\.first`, `internal\.last`, `unknown-review-required`/u);
  });
});

test("explicit compiled method references reject unknown, duplicate, and empty values", async () => {
  for (const [references, expected] of [
    [[], /empty compiledMethodRefs method list/i],
    [["internal.unknown"], /unknown compiledMethodRefs method/i],
    [["internal.review", "internal.review"], /duplicate compiledMethodRefs method/i],
    [[""], /empty compiledMethodRefs method/i]
  ]) {
    await withCompilerFixture(async (fixture) => {
      const agentsPath = path.join(fixture, "registries", "agents.registry.json");
      const agents = JSON.parse(readFileSync(agentsPath, "utf8"));
      agents.agents[0].compiledMethodRefs = references;
      writeFileSync(agentsPath, `${JSON.stringify(agents, null, 2)}\n`, "utf8");

      const result = await runCompiler(fixture, ["--dry-run"]);

      assert.notEqual(result.code, 0);
      assert.match(result.stderr, expected);
    });
  }
});

test("profile source paths come from registry provenance and support contained nested files", async () => {
  await withCompilerFixture(async (fixture) => {
    const nestedProfile = "profiles/project-tooling/mobile-webview.md";
    mkdirSync(path.join(fixture, "profiles", "project-tooling"), { recursive: true });
    writeFileSync(path.join(fixture, nestedProfile), "# Mobile WebView Profile\n\nUse bounded mobile tooling.\n", "utf8");

    const agentsPath = path.join(fixture, "registries", "agents.registry.json");
    const agents = JSON.parse(readFileSync(agentsPath, "utf8"));
    agents.agents[0].profiles = ["project-tooling-mobile-webview"];
    writeFileSync(agentsPath, `${JSON.stringify(agents, null, 2)}\n`, "utf8");

    const profilesPath = path.join(fixture, "registries", "profiles.registry.json");
    writeFileSync(profilesPath, `${JSON.stringify({
      profiles: [{
        name: "project-tooling-mobile-webview",
        sourceProvenance: [{ path: nestedProfile, category: "toolkit-authored" }]
      }]
    }, null, 2)}\n`, "utf8");
    gitCommitAll(fixture, "nested profile fixture");

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.equal(result.code, 0, result.stderr);
    const compiled = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");
    assert.match(compiled, /source_profile_refs: \["profiles\/project-tooling\/mobile-webview\.md"\]/u);
    assert.match(compiled, /Profile paths: `profiles\/project-tooling\/mobile-webview\.md`/u);
    assert.match(compiled, /Use bounded mobile tooling\./u);
  });
});

test("profile source provenance fails closed when missing, ambiguous, or outside profiles", async () => {
  for (const sourceProvenance of [
    [],
    [
      { path: "profiles/audit-profile.md", category: "internal-artifact" },
      { path: "profiles/second.md", category: "internal-artifact" }
    ],
    [{ path: "agents/reviewer-agent.md", category: "internal-artifact" }]
  ]) {
    await withCompilerFixture(async (fixture) => {
      const profilesPath = path.join(fixture, "registries", "profiles.registry.json");
      const registry = JSON.parse(readFileSync(profilesPath, "utf8"));
      registry.profiles[0].sourceProvenance = sourceProvenance;
      writeFileSync(profilesPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

      const result = await runCompiler(fixture, ["--dry-run"]);

      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /profile.*sourceProvenance|canonical profile.*path/i);
    });
  }
});

test("canonical agent sources reject generated compile provenance metadata", async () => {
  await withCompilerFixture(async (fixture) => {
    const agentPath = path.join(fixture, "agents", "reviewer-agent.md");
    const body = readFileSync(agentPath, "utf8");
    writeFileSync(agentPath, `---
toolkit_pin: ai-agents-skills-toolkit@0.2.5
last_compiled_against: ${"a".repeat(40)}
---

${body}`, "utf8");

    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.notEqual(result.code, 0);
    assert.match(
      result.stderr,
      /canonical agent source agents\/reviewer-agent\.md contains generated provenance keys: last_compiled_against, toolkit_pin/
    );
  });
});

test("generated-output commits preserve the prior canonical source commit and remain checkable", async () => {
  await withCompilerFixture(async (fixture) => {
    const generated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(generated.code, 0, generated.stderr);
    const canonicalCommit = compiledSourceCommit(fixture);
    const outputBeforeCommit = readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8");

    const generatedCommit = gitCommitAll(fixture, "commit generated output");
    assert.notEqual(generatedCommit, canonicalCommit);
    assert.equal(latestCanonicalSourceCommit(fixture), canonicalCommit);

    const checked = await runCompiler(fixture, ["--check"]);
    assert.equal(checked.code, 0, checked.stderr);
    assert.equal(compiledSourceCommit(fixture), canonicalCommit);
    assert.equal(readFileSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"), "utf8"), outputBeforeCommit);
  });
});

test("noncanonical commits leave source provenance stable", async () => {
  await withCompilerFixture(async (fixture) => {
    const generated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(generated.code, 0, generated.stderr);
    const canonicalCommit = compiledSourceCommit(fixture);

    writeFileSync(path.join(fixture, "docs", "unrelated.md"), "# Unrelated documentation\n", "utf8");
    const unrelatedCommit = gitCommitAll(fixture, "unrelated documentation");
    assert.notEqual(unrelatedCommit, canonicalCommit);
    assert.equal(latestCanonicalSourceCommit(fixture), canonicalCommit);

    const checked = await runCompiler(fixture, ["--check"]);
    assert.equal(checked.code, 0, checked.stderr);
    assert.equal(compiledSourceCommit(fixture), canonicalCommit);
  });
});

test("committed canonical changes drift until deterministic regeneration", async () => {
  await withCompilerFixture(async (fixture) => {
    const generated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(generated.code, 0, generated.stderr);
    const priorCanonicalCommit = compiledSourceCommit(fixture);

    const agentPath = path.join(fixture, "agents", "reviewer-agent.md");
    writeFileSync(agentPath, `${readFileSync(agentPath, "utf8")}\nCanonical behavior clarification.\n`, "utf8");
    const changedCanonicalCommit = gitCommitAll(fixture, "change canonical agent");
    assert.notEqual(changedCanonicalCommit, priorCanonicalCommit);

    const drifted = await runCompiler(fixture, ["--check"]);
    assert.notEqual(drifted.code, 0);
    assert.match(drifted.stderr, /compiled output.*drift/i);

    const regenerated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(regenerated.code, 0, regenerated.stderr);
    assert.equal(compiledSourceCommit(fixture), changedCanonicalCommit);
    const checked = await runCompiler(fixture, ["--check"]);
    assert.equal(checked.code, 0, checked.stderr);
  });
});

test("source_commit tampering is rejected by check mode", async () => {
  await withCompilerFixture(async (fixture) => {
    const generated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(generated.code, 0, generated.stderr);
    const outputPath = path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md");
    const compiled = readFileSync(outputPath, "utf8");
    writeFileSync(outputPath, compiled.replace(/^source_commit: [0-9a-f]{40}$/m, `source_commit: ${"f".repeat(40)}`), "utf8");

    const checked = await runCompiler(fixture, ["--check"]);
    assert.notEqual(checked.code, 0);
    assert.match(checked.stderr, /compiled output.*drift/i);
  });
});

test("approved registry agents with placeholder source text fail instead of compiling as approved", async () => {
  await withCompilerFixture(async (fixture) => {
    writeFileSync(path.join(fixture, "agents", "reviewer-agent.md"), "# Reviewer Agent\n\n## Role\n\nReview diffs.\n\n## Status\n\nStub. This agent will be compiled later.\n", "utf8");
    execFileSync("git", ["add", "agents/reviewer-agent.md"], { cwd: fixture, stdio: "ignore" });
    execFileSync("git", ["commit", "-m", "placeholder fixture"], { cwd: fixture, stdio: "ignore" });

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /approved agent reviewer-agent cannot compile as approved/);
    assert.match(result.stderr, /stub\/placeholder language/);
  });
});

test("--only fails clearly when no registered agent matches", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--only", "missing-agent", "--dry-run"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /--only did not match any registered agent: missing-agent/);
  });
});

test("check mode is non-mutating and fails closed on missing or drifted compiled output", async () => {
  await withCompilerFixture(async (fixture) => {
    const missing = await runCompiler(fixture, ["--check"]);
    assert.notEqual(missing.code, 0);
    assert.match(missing.stderr, /compiled output.*missing|check.*drift/i);

    const generated = await runCompiler(fixture, ["--confirm-write"]);
    assert.equal(generated.code, 0, generated.stderr);
    const outputPath = path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md");
    const generatedText = readFileSync(outputPath, "utf8");

    const current = await runCompiler(fixture, ["--check"]);
    assert.equal(current.code, 0, current.stderr);
    assert.match(current.stdout, /compile-agents mode: check/);
    assert.match(current.stdout, /up-to-date/);
    assert.equal(readFileSync(outputPath, "utf8"), generatedText);

    writeFileSync(outputPath, `${generatedText}\nmanual drift\n`, "utf8");
    const drifted = await runCompiler(fixture, ["--check"]);
    assert.notEqual(drifted.code, 0);
    assert.match(drifted.stderr, /compiled output.*drift/i);
  });
});

test("compiled fallback word budgets warn above 4500 and fail above 6000 words", async () => {
  await withCompilerFixture(async (fixture) => {
    const agentPath = path.join(fixture, "agents", "reviewer-agent.md");
    const base = readFileSync(agentPath, "utf8");
    writeFileSync(agentPath, `${base}\n\n${Array(4400).fill("bounded").join(" ")}\n`, "utf8");

    const warning = await runCompiler(fixture, ["--dry-run"]);
    assert.equal(warning.code, 0, warning.stderr);
    assert.match(warning.stdout, /WARN.*word-budget|word-budget.*WARN/i);

    writeFileSync(agentPath, `${base}\n\n${Array(6100).fill("excessive").join(" ")}\n`, "utf8");
    const failure = await runCompiler(fixture, ["--dry-run"]);
    assert.notEqual(failure.code, 0);
    assert.match(failure.stderr, /compiled fallback.*6000|word budget.*6000/i);
  });
});

test("confirm-write rejects dirty canonical inputs before generating provenance", async () => {
  await withCompilerFixture(async (fixture) => {
    writeFileSync(path.join(fixture, "agents", "reviewer-agent.md"), `${readFileSync(path.join(fixture, "agents", "reviewer-agent.md"), "utf8")}\nUncommitted input.\n`, "utf8");

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /dirty canonical inputs|uncommitted/i);
    assert.equal(existsSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md")), false);
  });
});

test("confirm-write rejects a dirty transitive compiler dependency", async () => {
  await withCompilerFixture(async (fixture) => {
    const dependencyPath = path.join(fixture, "install", "safe-filesystem.mjs");
    writeFileSync(dependencyPath, `${readFileSync(dependencyPath, "utf8")}\n// uncommitted compiler dependency\n`, "utf8");

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /dirty canonical inputs|safe-filesystem\.mjs|uncommitted/i);
    assert.equal(existsSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md")), false);
  });
});

test("caller-supplied source commit overrides are rejected", async () => {
  await withCompilerFixture(async (fixture) => {
    const result = await runCompiler(fixture, ["--source-commit", "a".repeat(40), "--dry-run"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Unknown argument: --source-commit/);
  });
});

test("malformed canonical registries fail instead of compiling zero outputs", async () => {
  await withCompilerFixture(async (fixture) => {
    writeFileSync(path.join(fixture, "registries", "agents.registry.json"), "{not-json\n", "utf8");

    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /invalid JSON.*registries\/agents\.registry\.json/i);
  });
});

test("an empty agent registry fails instead of reporting a successful zero-output compilation", async () => {
  await withCompilerFixture(async (fixture) => {
    writeFileSync(path.join(fixture, "registries", "agents.registry.json"), "{\"agents\":[]}\n", "utf8");

    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /zero outputs|no registered agents/i);
  });
});

test("canonical registry parents must be repository-contained non-link directories", async (t) => {
  await withCompilerFixture(async (fixture) => {
    const linkedRegistries = path.join(fixture, "linked-registries");
    mkdirSync(linkedRegistries, { recursive: true });
    for (const file of ["agents.registry.json", "profiles.registry.json", "methods.registry.json", "source-capabilities.registry.json"]) {
      copyFileSync(path.join(fixture, "registries", file), path.join(linkedRegistries, file));
    }
    rmSync(path.join(fixture, "registries"), { recursive: true, force: true });
    if (!createDirectoryLinkOrSkip(t, linkedRegistries, path.join(fixture, "registries"))) return;

    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.notEqual(result.code, 0, result.stderr);
    assert.match(result.stderr, /canonical.*(?:linked path|symlink|junction|reparse)|registry.*(?:linked path|symlink|junction|reparse)/i);
  });
});

test("canonical registry files must be regular non-link inputs", async (t) => {
  await withCompilerFixture(async (fixture) => {
    const registryPath = path.join(fixture, "registries", "agents.registry.json");
    const linkedRegistryTarget = path.join(fixture, "linked-agents.registry.json");
    copyFileSync(registryPath, linkedRegistryTarget);
    rmSync(registryPath, { force: true });
    if (!createFileLinkOrSkip(t, linkedRegistryTarget, registryPath)) return;

    const result = await runCompiler(fixture, ["--dry-run"]);

    assert.notEqual(result.code, 0, result.stderr);
    assert.match(result.stderr, /canonical.*(?:regular|linked path|symlink|hard[- ]link(?:ed)?|reparse)/i);
  });
});

test("compiler refuses an existing linked final output file without mutating its target", async (t) => {
  await withCompilerFixture(async (fixture) => {
    const linkedTarget = path.join(fixture, "linked-compiled-output.md");
    const outputPath = path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md");
    writeFileSync(linkedTarget, "preserve linked compiler target\n", "utf8");
    if (!createFileLinkOrSkip(t, linkedTarget, outputPath)) return;

    const result = await runCompiler(fixture, ["--confirm-write"]);

    assert.notEqual(result.code, 0, result.stderr);
    assert.match(result.stderr, /compiled output.*(?:linked path|symlink|hard[- ]link(?:ed)?|reparse)|(?:linked path|symlink|hard[- ]link(?:ed)?|reparse).*compiled output/i);
    assert.equal(readFileSync(linkedTarget, "utf8"), "preserve linked compiler target\n");
  });
});

test("production compiler has no environment-triggered canonical mutation hook", () => {
  assert.doesNotMatch(
    readFileSync(SCRIPT, "utf8"),
    /AI_TOOLKIT_TEST_MUTATE_CANONICAL_BEFORE_PROMOTION|compiler pre-promotion mutation test hook/
  );
});

test("compiler digest path list covers the static local production import closure", () => {
  const visited = new Set();
  const pending = ["scripts/compile-agents.mjs"];
  const localImportPattern = /from\s+["'](\.{1,2}\/[^"']+)["']/g;

  while (pending.length > 0) {
    const relativePath = pending.pop();
    if (visited.has(relativePath)) continue;
    visited.add(relativePath);
    const source = readFileSync(path.join(ROOT, relativePath), "utf8");
    for (const match of source.matchAll(localImportPattern)) {
      const importedPath = path.relative(
        ROOT,
        path.resolve(ROOT, path.dirname(relativePath), match[1])
      ).replaceAll("\\", "/");
      if (!visited.has(importedPath)) pending.push(importedPath);
    }
  }

  assert.deepEqual([...COMPILER_DIGEST_PATHS].sort(), [...visited].sort());
  assert.ok(COMPILER_DIGEST_PATHS.includes("install/safe-filesystem.mjs"));
});

test("compile contract and metadata template expose current integrity fields and word budgets", () => {
  const contract = readFileSync(path.join(ROOT, "docs", "COMPILED_AGENT_COMPILE_CONTRACT.md"), "utf8");
  const template = readFileSync(path.join(ROOT, "templates", "compiled-agent-metadata.template.md"), "utf8");
  const embeddedBuilder = readFileSync(path.join(ROOT, "scripts", "ai-toolkit", "build-embedded-package.mjs"), "utf8");

  for (const field of ["source_commit", "input_digest", "input_digest_scope", "compiler_digest"]) {
    assert.match(contract, new RegExp(`\\b${field}\\b`));
    assert.match(template, new RegExp(`^${field}:`, "m"));
    assert.match(embeddedBuilder, new RegExp(`\\\\n${field}:`));
  }
  assert.match(contract, /target:\s*(?:at most|under)\s*3,?500 words/i);
  assert.match(contract, /warn(?:ing)?:?\s*(?:above|over)\s*4,?500 words/i);
  assert.match(contract, /fail(?:ure)?:?\s*(?:above|over)\s*6,?000 words/i);
  assert.doesNotMatch(contract, /target:\s*under\s*20,?000 words/i);
  assert.match(embeddedBuilder, /3,500-word target/);
  assert.match(embeddedBuilder, /warning above 4,500/);
  assert.match(embeddedBuilder, /failure above 6,000/);
});

test("injected compiler provenance validator rejects stale digests before transaction promotion", async () => {
  const { createCompilerPromotionValidator } = await import("./ai-toolkit/compiler-provenance.mjs");
  const fixture = mkdtempSync(path.join(os.tmpdir(), "compile-provenance-validator-"));
  const managedRoot = path.join(fixture, "compiled-agents");
  try {
    const beforePromote = createCompilerPromotionValidator({
      expectedInputDigest: "sha256:canonical",
      expectedCompilerDigest: "sha256:compiler",
      readCurrentDigests: () => ({
        inputDigest: "sha256:changed",
        compilerDigest: "sha256:compiler"
      })
    });

    assert.throws(() => runManagedDirectoryTransaction({
      repositoryRoot: fixture,
      managedRoot,
      label: "compiler provenance harness",
      prepare: (filesystem) => filesystem.writeFile("reviewer-agent.compiled.md", "staged output\n", "utf8"),
      beforePromote
    }), /canonical compiler inputs changed|stale provenance/i);
    assert.equal(existsSync(managedRoot), false);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
