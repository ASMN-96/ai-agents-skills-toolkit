#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  cpSync,
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIRECTORIES = [
  ".agents",
  ".ai-toolkit",
  ".codex",
  "agents",
  "compiled-agents",
  "docs",
  "evals",
  "install",
  "methods",
  "profiles",
  "registries",
  "scripts",
  "skills",
  "sources",
  "templates"
];
const CANONICAL_RUNTIME_DIRECTORIES = [
  ".agents",
  ".codex",
  "agents",
  "compiled-agents",
  "docs",
  "evals",
  "install",
  "methods",
  "profiles",
  "registries",
  "scripts",
  "skills",
  "sources",
  "templates"
];

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function snapshotTree(root) {
  const entries = [];

  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(root, fullPath).split(path.sep).join("/");
      if (entry.isDirectory()) {
        entries.push({ path: relativePath, type: "directory" });
        visit(fullPath);
      } else if (entry.isFile()) {
        const content = readFileSync(fullPath);
        entries.push({ path: relativePath, type: "file", size: content.length, sha256: sha256(content) });
      } else {
        entries.push({ path: relativePath, type: "unsafe" });
      }
    }
  }

  visit(root);
  return entries.sort((left, right) => left.path.localeCompare(right.path));
}

function snapshotSelected(root, directories) {
  return directories.map((directory) => ({
    directory,
    snapshot: snapshotTree(path.join(root, directory))
  }));
}

function createFixture(name) {
  const parent = mkdtempSync(path.join(tmpdir(), `embedded-package-${name}-`));
  const fixture = path.join(parent, "repo");
  for (const directory of FIXTURE_DIRECTORIES) {
    cpSync(path.join(ROOT, directory), path.join(fixture, directory), { recursive: true });
  }
  return { parent, fixture };
}

function retainFixtureFiles(fixture, directory, relativeFiles) {
  const directoryPath = path.join(fixture, directory);
  const contents = new Map(relativeFiles.map((relativePath) => [
    relativePath,
    readFileSync(path.join(directoryPath, ...relativePath.split("/")))
  ]));
  rmSync(directoryPath, { recursive: true, force: true });
  mkdirSync(directoryPath, { recursive: true });
  for (const [relativePath, content] of contents) {
    const target = path.join(directoryPath, ...relativePath.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}

function minimizeBuilderFixture(fixture) {
  const embeddedDataPath = path.join(fixture, "scripts", "ai-toolkit", "embedded-data.mjs");
  const embeddedData = readFileSync(embeddedDataPath, "utf8")
    .replace(
      /export const ACTIVE_SKILLS = \[[\s\S]*?\r?\n\];\r?\n\r?\nexport const INTERNAL_HELPER_SKILLS/,
      "export const ACTIVE_SKILLS = [];\n\nexport const INTERNAL_HELPER_SKILLS"
    )
    .replace(
      /export const TOOL_ENTRIES = \[[\s\S]*?\r?\n\];\r?\n\r?\nexport const UNSAFE_COMMAND_PATTERNS/,
      "export const TOOL_ENTRIES = [];\n\nexport const UNSAFE_COMMAND_PATTERNS"
    );
  writeFileSync(embeddedDataPath, embeddedData, "utf8");

  const agentsRegistryPath = path.join(fixture, "registries", "agents.registry.json");
  const agentsRegistry = JSON.parse(readFileSync(agentsRegistryPath, "utf8"));
  agentsRegistry.agents = agentsRegistry.agents.filter((agent) => agent.name === "reviewer-agent");
  writeFileSync(agentsRegistryPath, `${JSON.stringify(agentsRegistry, null, 2)}\n`, "utf8");

  retainFixtureFiles(fixture, ".codex", ["agents/reviewer-agent.toml"]);
  retainFixtureFiles(fixture, "agents", ["reviewer-agent.md"]);
  retainFixtureFiles(fixture, "compiled-agents", ["reviewer-agent.compiled.md"]);
  retainFixtureFiles(fixture, "registries", [
    "agents.registry.json",
    "domain-packs.registry.json",
    "routing-matrix.json",
    "skills.registry.json",
    "tools.registry.json"
  ]);
  retainFixtureFiles(fixture, "templates", ["delivery-kernel.request.example.json"]);
  retainFixtureFiles(fixture, "evals", [
    "routing/enterprise-governance-routing-evals.json",
    "skills/generic-naming-compatibility-evals.json",
    "skills/governance-proof-evals.json",
    "skills/uiux-evals.json"
  ]);
  retainFixtureFiles(fixture, "sources", ["source-watchlist.json"]);
  for (const directory of [".agents", "docs", "methods", "profiles", "skills"]) {
    retainFixtureFiles(fixture, directory, []);
  }

  const embeddedRoot = path.join(fixture, ".ai-toolkit");
  rmSync(embeddedRoot, { recursive: true, force: true });
  mkdirSync(embeddedRoot, { recursive: true });
  writeFileSync(path.join(embeddedRoot, "README.md"), "# Previous valid package\n", "utf8");
}

function runBuilder(fixture, args = [], environment = {}) {
  return spawnSync(process.execPath, [
    path.join(fixture, "scripts", "ai-toolkit", "build-embedded-package.mjs"),
    ...args
  ], {
    cwd: fixture,
    encoding: "utf8",
    env: { ...process.env, ...environment },
    timeout: 900_000,
    windowsHide: true
  });
}

function runValidator(fixture) {
  return spawnSync(process.execPath, [
    path.join(fixture, "scripts", "ai-toolkit", "validate-ai-toolkit.mjs")
  ], {
    cwd: fixture,
    encoding: "utf8",
    timeout: 300_000,
    windowsHide: true
  });
}

function combinedOutput(result) {
  return [
    result.stdout ?? "",
    result.stderr ?? "",
    result.error ? `\nprocess error: ${result.error.message}` : "",
    result.signal ? `\nprocess signal: ${result.signal}` : ""
  ].join("");
}

function immediateProductionScripts(repositoryRoot) {
  return ["scripts", "scripts/ai-toolkit"]
    .flatMap((directory) => readdirSync(path.join(repositoryRoot, directory), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".mjs") && !entry.name.startsWith("test-"))
      .map((entry) => `${directory}/${entry.name}`))
    .sort((left, right) => left.localeCompare(right));
}

test("generated source records expose current SourceCatalog v2 state", () => {
  const catalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
  const gsd = catalog.sources.find((source) => source.id === "gsd-core");
  assert.ok(gsd, "canonical SourceCatalog v2 must contain gsd-core");
  const record = readFileSync(
    path.join(ROOT, ".ai-toolkit", "sources", "records", "gsd-core.md"),
    "utf8"
  );

  assert.match(record, /Catalog source ID: gsd-core/u);
  assert.match(record, new RegExp(`Monitor state: ${gsd.monitor.state}`, "u"));
  assert.match(record, new RegExp(`Review state: ${gsd.review.state}`, "u"));
  assert.match(record, new RegExp(`Runtime posture: ${gsd.runtimePosture}`, "u"));
  assert.match(
    record,
    new RegExp(`Observed revision: ${gsd.monitor.observedRevision.kind}:${gsd.monitor.observedRevision.value}`, "u")
  );
  assert.match(record, /Reviewed revision: none/u);
  assert.match(record, /Current receipt: none/u);
  assert.match(record, /Reference eligibility: BLOCKED/u);
  assert.match(record, /Dependent-resource source state: BLOCKED/u);
  assert.match(record, /Runtime eligibility: false/u);
  assert.match(record, /Eligibility reason: monitor-changed/u);
  assert.doesNotMatch(record, /7195c2a90b1264e15a43ccc7b62a5a4ce0ac9034/u);
  assert.doesNotMatch(record, /GSD Core relocation and v0\.2\.5 CODEOWNERS-only drift reviewed/iu);

  const playwrightRecord = readFileSync(
    path.join(ROOT, ".ai-toolkit", "sources", "records", "playwright.md"),
    "utf8"
  );
  assert.match(playwrightRecord, /Catalog source ID: microsoft-playwright/u);
  assert.match(playwrightRecord, /Dependent resource ID: playwright/u);
});

test("source mirror generation requires exact dependency and affected-artifact bindings", () => {
  for (const missingBinding of ["dependency", "affected-artifact"]) {
    const { parent, fixture } = createFixture(`source-binding-${missingBinding}`);
    try {
      minimizeBuilderFixture(fixture);
      const catalogPath = path.join(fixture, "sources", "source-watchlist.json");
      const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
      const source = catalog.sources.find((entry) => entry.id === "gsd-core");
      assert.ok(source, "fixture SourceCatalog v2 must contain gsd-core");
      if (missingBinding === "dependency") {
        source.dependentResourceIds = source.dependentResourceIds.filter((id) => id !== "gsd-core");
      } else {
        source.affectedArtifacts = source.affectedArtifacts.filter(
          (artifact) => artifact !== ".ai-toolkit/sources/records/gsd-core.md"
        );
      }
      writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

      const result = runBuilder(fixture, ["--confirm-write"]);

      assert.notEqual(result.status, 0, `${missingBinding} binding unexpectedly passed\n${combinedOutput(result)}`);
      assert.match(
        combinedOutput(result),
        /SourceCatalog v2 mapping is missing for tool gsd-core/u,
        `${missingBinding} binding did not fail at the source mirror contract`
      );
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }
});

test("source mirror generation rejects orphan catalog record targets", () => {
  const { parent, fixture } = createFixture("source-binding-orphan-target");
  try {
    minimizeBuilderFixture(fixture);
    const catalogPath = path.join(fixture, "sources", "source-watchlist.json");
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    const source = catalog.sources.find((entry) => entry.id === "gsd-core");
    assert.ok(source, "fixture SourceCatalog v2 must contain gsd-core");
    source.dependentResourceIds.push("orphan-tool");
    source.affectedArtifacts.push(".ai-toolkit/sources/records/orphan-tool.md");
    source.dependentResourceIds.sort();
    source.affectedArtifacts.sort();
    writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

    const result = runBuilder(fixture, ["--confirm-write"]);

    assert.notEqual(result.status, 0, combinedOutput(result));
    assert.match(
      combinedOutput(result),
      /SourceCatalog v2 source record .*orphan-tool\.md is missing from tools registry/u
    );
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("bare invocation defaults to a non-mutating package check and fails on drift", () => {
  const { parent, fixture } = createFixture("check-drift");
  try {
    minimizeBuilderFixture(fixture);
    appendFileSync(path.join(fixture, ".ai-toolkit", "README.md"), "\nintentional drift\n", "utf8");
    const before = snapshotTree(fixture);

    const result = runBuilder(fixture);

    assert.notEqual(result.status, 0, combinedOutput(result));
    assert.match(combinedOutput(result), /embedded package check failed.*generated output differs/i);
    assert.deepEqual(snapshotTree(fixture), before, "bare package validation must not change any repository file");
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("script provenance rejects a listed path that is not a verified regular file", () => {
  const { parent, fixture } = createFixture("script-provenance-boundary");
  try {
    minimizeBuilderFixture(fixture);
    const scriptPath = path.join(fixture, "scripts", "ai-toolkit", "run-quality-gate.mjs");
    rmSync(scriptPath);
    mkdirSync(scriptPath);
    const before = snapshotTree(path.join(fixture, ".ai-toolkit"));

    const result = runBuilder(fixture, ["--confirm-write"]);

    assert.notEqual(result.status, 0, combinedOutput(result));
    assert.match(combinedOutput(result), /script provenance.*regular file|canonical script.*regular file/i);
    assert.deepEqual(snapshotTree(path.join(fixture, ".ai-toolkit")), before);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("bootstrap rejects hard-linked and reparse-point managed filesystem modules before import", () => {
  for (const kind of ["hard-link", "reparse-point"]) {
    const { parent, fixture } = createFixture(`bootstrap-${kind}`);
    try {
      minimizeBuilderFixture(fixture);
      const installPath = path.join(fixture, "install");
      const safeFilesystemPath = path.join(installPath, "safe-filesystem.mjs");
      const importMarker = path.join(parent, `${kind}-module-imported.txt`);
      const hostileModule = [
        'import { writeFileSync } from "node:fs";',
        `writeFileSync(${JSON.stringify(importMarker)}, "imported", "utf8");`,
        "export const bootstrapProbe = true;",
        ""
      ].join("\n");
      if (kind === "hard-link") {
        const hardLinkSource = path.join(fixture, "safe-filesystem-hard-link-source.mjs");
        writeFileSync(hardLinkSource, hostileModule, "utf8");
        rmSync(safeFilesystemPath);
        linkSync(hardLinkSource, safeFilesystemPath);
      } else {
        const externalInstall = path.join(parent, "external-install");
        cpSync(installPath, externalInstall, { recursive: true });
        writeFileSync(path.join(externalInstall, "safe-filesystem.mjs"), hostileModule, "utf8");
        rmSync(installPath, { recursive: true, force: true });
        symlinkSync(
          externalInstall,
          installPath,
          process.platform === "win32" ? "junction" : "dir"
        );
      }
      const before = snapshotTree(path.join(fixture, ".ai-toolkit"));

      const result = runBuilder(fixture, ["--confirm-write"]);

      assert.notEqual(result.status, 0, combinedOutput(result));
      assert.equal(
        existsSync(importMarker),
        false,
        `${kind} managed filesystem module must be rejected before executable import`
      );
      assert.match(
        combinedOutput(result),
        kind === "hard-link"
          ? /hard[- ]link|link count|nlink/i
          : /symbolic link|junction|reparse|realpath|alias/i
      );
      assert.deepEqual(snapshotTree(path.join(fixture, ".ai-toolkit")), before);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }
});

test("build promotes a schema-v2 package without rewriting canonical registries or runtime files", () => {
  const { parent, fixture } = createFixture("build");
  try {
    const starterPath = path.join(fixture, "templates", "delivery-kernel.request.example.json");
    writeFileSync(starterPath, readFileSync(starterPath, "utf8").replace(/\r?\n/g, "\r\n"), "utf8");
    const canonicalBefore = snapshotSelected(fixture, CANONICAL_RUNTIME_DIRECTORIES);
    rmSync(path.join(fixture, ".ai-toolkit"), { recursive: true, force: true });
    const result = runBuilder(fixture, ["--confirm-write"]);

    assert.equal(result.status, 0, combinedOutput(result));
    assert.match(result.stdout, /Built \.ai-toolkit package for 0\.3\.0/);
    assert.deepEqual(
      readdirSync(fixture).filter((entry) => entry.startsWith(".ai-toolkit.")),
      [],
      "first generation must not leave transaction artifacts"
    );
    assert.deepEqual(
      snapshotSelected(fixture, CANONICAL_RUNTIME_DIRECTORIES),
      canonicalBefore,
      "embedded-package generation must not rewrite canonical registries or runtime files"
    );

    const embeddedRoot = path.join(fixture, ".ai-toolkit");
    const manifest = JSON.parse(readFileSync(path.join(embeddedRoot, "manifest.json"), "utf8"));
    const scriptsManifest = JSON.parse(readFileSync(path.join(embeddedRoot, "scripts-manifest.json"), "utf8"));
    assert.equal(manifest.schemaVersion, "2.0.0");
    assert.equal(scriptsManifest.schemaVersion, "2.0.0");
    assert.equal(manifest.generationMode, "clean-staging-transactional-promotion");
    const expectedScripts = immediateProductionScripts(fixture);
    assert.deepEqual(
      scriptsManifest.scripts.map((entry) => entry.path),
      expectedScripts,
      "scripts manifest must exactly inventory every immediate non-test toolkit script"
    );
    for (const entry of scriptsManifest.scripts) {
      assert.equal(
        entry.sha256,
        sha256(readFileSync(path.join(fixture, ...entry.path.split("/")))),
        `scripts manifest digest drift for ${entry.path}`
      );
    }

    const canonicalAgents = JSON.parse(
      readFileSync(path.join(fixture, "registries", "agents.registry.json"), "utf8")
    ).agents;
    assert.deepEqual(
      manifest.activeProjectAgents,
      canonicalAgents.map((agent) => agent.name),
      "embedded agent inventory must be derived from the canonical registry"
    );
    const runtimeEval = JSON.parse(
      readFileSync(path.join(embeddedRoot, "evals", "runtime-activation", "runtime-boundary-evals.json"), "utf8")
    ).cases.find((entry) => entry.id === "active-project-agent-count-registry");
    assert.equal(runtimeEval?.expectedActiveProjectAgents, canonicalAgents.length);
    assert.equal(
      JSON.parse(readFileSync(path.join(embeddedRoot, "evals", "runtime-activation", "runtime-boundary-evals.json"), "utf8"))
        .cases.some((entry) => entry.id === "active-project-agent-count-12"),
      false,
      "generated eval IDs must not encode a stale agent count"
    );

    const mirrorOrder = manifest.mirrors.map((entry) => `${entry.target}\0${entry.source}`);
    assert.deepEqual(mirrorOrder, [...mirrorOrder].sort((left, right) => left.localeCompare(right)));
    assert.equal(
      new Set(manifest.mirrors.map((entry) => entry.target)).size,
      manifest.mirrors.length,
      "every generated mirror target must have exactly one provenance record"
    );
    const starterMirror = manifest.mirrors.find((entry) => (
      entry.source === "templates/delivery-kernel.request.example.json"
      && entry.target === ".ai-toolkit/templates/delivery-kernel.request.example.json"
    ));
    assert.ok(starterMirror, "starter template mirror must be attested");
    assert.equal(
      starterMirror.sha256,
      sha256(readFileSync(path.join(embeddedRoot, "templates", "delivery-kernel.request.example.json"))),
      "schema-v2 sha256 must attest exact bytes without newline normalization"
    );

    const packageRoot = path.join(embeddedRoot, "runtime", "delivery-kernel");
    const packageManifestPath = path.join(packageRoot, "package-manifest.json");
    const packageManifest = JSON.parse(readFileSync(packageManifestPath, "utf8"));
    assert.equal(packageManifest.schemaVersion, "2.0.0");
    assert.equal(packageManifest.offlineCapable, true);
    assert.equal(packageManifest.entrypoint, "scripts/ai-toolkit/run-delivery-kernel.mjs");
    assert.equal(packageManifest.starter, "templates/delivery-kernel.request.example.json");
    assert.match(
      readFileSync(path.join(packageRoot, "README.md"), "utf8"),
      /From the target repository root/i
    );
    assert.match(
      readFileSync(path.join(packageRoot, "README.md"), "utf8"),
      /replace.*expectedCommit.*full 40-character Git SHA/is,
      "embedded instructions must require an explicit target-commit pin"
    );

    const requiredFiles = [
      "install/safe-filesystem.mjs",
      "registries/agents.registry.json",
      "registries/domain-packs.registry.json",
      "registries/routing-matrix.json",
      "registries/skills.registry.json",
      "registries/tools.registry.json",
      "scripts/ai-toolkit/kernel/contracts.mjs",
      "scripts/ai-toolkit/kernel/delivery-kernel.mjs",
      "scripts/ai-toolkit/kernel/source-catalog-contract.mjs",
      "scripts/ai-toolkit/kernel/source-catalog-loader.mjs",
      "scripts/ai-toolkit/run-delivery-kernel.mjs",
      "sources/source-watchlist.json",
      "templates/delivery-kernel.request.example.json"
    ];
    const attestedFiles = new Map(packageManifest.files.map((entry) => [entry.path, entry.sha256]));
    for (const relativePath of requiredFiles) {
      const fullPath = path.join(packageRoot, ...relativePath.split("/"));
      assert.equal(existsSync(fullPath), true, `missing self-contained package file ${relativePath}`);
      assert.equal(attestedFiles.get(relativePath), sha256(readFileSync(fullPath)), `digest drift for ${relativePath}`);
    }
    for (const forbiddenPath of [
      "scripts/ai-toolkit/source-governance.mjs",
      "scripts/apply-source-freshness.mjs",
      "scripts/apply-source-review.mjs"
    ]) {
      assert.equal(
        existsSync(path.join(packageRoot, ...forbiddenPath.split("/"))),
        false,
        `self-contained runtime must not package mutation surface ${forbiddenPath}`
      );
      assert.equal(attestedFiles.has(forbiddenPath), false);
    }
    for (const agent of canonicalAgents) {
      const tomlPath = agent.runtimeFiles.tomlPath;
      const packagedToml = path.join(packageRoot, ...tomlPath.split("/"));
      assert.equal(existsSync(packagedToml), true, `missing registry agent TOML ${tomlPath}`);
      assert.equal(attestedFiles.get(tomlPath), sha256(readFileSync(packagedToml)), `digest drift for ${tomlPath}`);

      const runtimeMirror = path.join(embeddedRoot, "runtime-agents", path.basename(tomlPath));
      assert.equal(existsSync(runtimeMirror), true, `missing embedded runtime agent ${agent.name}`);
      const sourceMirror = path.join(embeddedRoot, "agents", `${agent.name}.md`);
      assert.equal(existsSync(sourceMirror), true, `missing embedded agent source ${agent.name}`);

      const fallbackPath = agent.runtimeFiles.compiledFallbackPath;
      if (fallbackPath) {
        assert.equal(
          existsSync(path.join(embeddedRoot, ...fallbackPath.split("/"))),
          true,
          `missing declared compiled fallback ${fallbackPath}`
        );
      } else {
        assert.equal(
          agent.runtimeFiles.compiledFallbackPresent,
          false,
          `${agent.name} cannot claim a compiled fallback without a path`
        );
      }
    }

    const packageArtifact = manifest.generatedArtifacts.find((entry) => (
      entry.path === ".ai-toolkit/runtime/delivery-kernel/package-manifest.json"
    ));
    assert.ok(packageArtifact, "top-level manifest must attest the delivery-kernel package manifest");

    const cleanSnapshot = snapshotTree(fixture);
    const check = runBuilder(fixture, ["--check"]);
    assert.equal(check.status, 0, combinedOutput(check));
    assert.match(check.stdout, /PASS build-embedded-package --check/);
    assert.deepEqual(snapshotTree(fixture), cleanSnapshot, "successful --check must remain non-mutating");

    const packagedStarterPath = path.join(packageRoot, "templates", "delivery-kernel.request.example.json");
    const pinnedStarter = JSON.parse(readFileSync(packagedStarterPath, "utf8"));
    assert.equal(
      pinnedStarter.repository.expectedCommit,
      "0".repeat(40),
      "the committed starter must use the documented non-runnable commit placeholder"
    );
    const observedHead = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 30_000,
      windowsHide: true
    });
    assert.equal(observedHead.status, 0, combinedOutput(observedHead));
    pinnedStarter.repository.expectedCommit = observedHead.stdout.trim().toLowerCase();
    const pinnedStarterPath = path.join(parent, "delivery-kernel.request.pinned.json");
    writeFileSync(pinnedStarterPath, `${JSON.stringify(pinnedStarter, null, 2)}\n`, "utf8");

    const offlineRun = spawnSync(process.execPath, [
      path.join(packageRoot, "scripts", "ai-toolkit", "run-delivery-kernel.mjs"),
      "plan",
      "--input",
      pinnedStarterPath
    ], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120_000,
      windowsHide: true
    });
    assert.equal(offlineRun.status, 0, combinedOutput(offlineRun));
    const planned = JSON.parse(offlineRun.stdout);
    assert.equal(planned.task.id, "TASK-001");
    assert.equal(planned.request.schemaVersion, "1.0.0");

    const validation = runValidator(fixture);
    assert.equal(validation.status, 0, combinedOutput(validation));

    const manifestPath = path.join(embeddedRoot, "manifest.json");
    const manifestText = readFileSync(manifestPath, "utf8");
    const incompleteManifest = JSON.parse(manifestText);
    incompleteManifest.activeProjectAgents = incompleteManifest.activeProjectAgents.slice(0, -1);
    writeFileSync(manifestPath, `${JSON.stringify(incompleteManifest, null, 2)}\n`, "utf8");
    const incompleteAgentValidation = runValidator(fixture);
    assert.notEqual(incompleteAgentValidation.status, 0, combinedOutput(incompleteAgentValidation));
    assert.match(combinedOutput(incompleteAgentValidation), /active project agents.*canonical registry/i);
    writeFileSync(manifestPath, manifestText, "utf8");

    const duplicateMirrorManifest = JSON.parse(manifestText);
    duplicateMirrorManifest.mirrors.push({ ...duplicateMirrorManifest.mirrors[0] });
    writeFileSync(manifestPath, `${JSON.stringify(duplicateMirrorManifest, null, 2)}\n`, "utf8");
    const duplicateMirrorValidation = runValidator(fixture);
    assert.notEqual(duplicateMirrorValidation.status, 0, combinedOutput(duplicateMirrorValidation));
    assert.match(combinedOutput(duplicateMirrorValidation), /embedded mirror targets must be unique/i);
    writeFileSync(manifestPath, manifestText, "utf8");

    const scriptsManifestPath = path.join(embeddedRoot, "scripts-manifest.json");
    const scriptsManifestText = readFileSync(scriptsManifestPath, "utf8");
    const downgradedScriptsManifest = JSON.parse(scriptsManifestText);
    downgradedScriptsManifest.schemaVersion = "1.0.0";
    writeFileSync(scriptsManifestPath, `${JSON.stringify(downgradedScriptsManifest, null, 2)}\n`, "utf8");
    const schemaValidation = runValidator(fixture);
    assert.notEqual(schemaValidation.status, 0, combinedOutput(schemaValidation));
    assert.match(combinedOutput(schemaValidation), /scripts manifest schemaVersion must be 2\.0\.0/i);
    writeFileSync(scriptsManifestPath, scriptsManifestText, "utf8");

    const incompleteScriptsManifest = JSON.parse(scriptsManifestText);
    incompleteScriptsManifest.scripts = incompleteScriptsManifest.scripts.slice(0, -1);
    writeFileSync(scriptsManifestPath, `${JSON.stringify(incompleteScriptsManifest, null, 2)}\n`, "utf8");
    const scriptClosureValidation = runValidator(fixture);
    assert.notEqual(scriptClosureValidation.status, 0, combinedOutput(scriptClosureValidation));
    assert.match(combinedOutput(scriptClosureValidation), /scripts manifest.*closure mismatch/i);
    writeFileSync(scriptsManifestPath, scriptsManifestText, "utf8");

    const packageModulePath = path.join(
      packageRoot,
      "scripts",
      "ai-toolkit",
      "kernel",
      "canonical-digest.mjs"
    );
    const packageModuleText = readFileSync(packageModulePath, "utf8");
    appendFileSync(
      packageModulePath,
      "\n// intentional package drift\n",
      "utf8"
    );
    const packageDriftValidation = runValidator(fixture);
    assert.notEqual(packageDriftValidation.status, 0, combinedOutput(packageDriftValidation));
    assert.match(combinedOutput(packageDriftValidation), /delivery kernel package byte digest mismatch/i);

    const packageKernelPath = path.dirname(packageModulePath);
    const externalKernelPath = path.join(fixture, "external-linked-kernel");
    cpSync(packageKernelPath, externalKernelPath, { recursive: true });
    writeFileSync(path.join(externalKernelPath, "canonical-digest.mjs"), packageModuleText, "utf8");
    rmSync(packageKernelPath, { recursive: true, force: true });
    symlinkSync(
      externalKernelPath,
      packageKernelPath,
      process.platform === "win32" ? "junction" : "dir"
    );
    const linkedPackageValidation = runValidator(fixture);
    assert.notEqual(linkedPackageValidation.status, 0, combinedOutput(linkedPackageValidation));
    assert.match(combinedOutput(linkedPackageValidation), /symbolic link|junction|reparse|regular file/i);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test("interrupted backup and promotion phases recover the previous package before new generation", () => {
  for (const failpoint of ["after-backup-rename", "after-promotion"]) {
    const { parent, fixture } = createFixture(`recovery-${failpoint}`);
    try {
      minimizeBuilderFixture(fixture);
      appendFileSync(path.join(fixture, ".ai-toolkit", "README.md"), `\nkeep previous package ${failpoint}\n`, "utf8");
      const before = snapshotTree(path.join(fixture, ".ai-toolkit"));

      const interrupted = runBuilder(
        fixture,
        ["--confirm-write"],
        { AI_TOOLKIT_FAILPOINT: failpoint }
      );
      assert.notEqual(interrupted.status, 0, combinedOutput(interrupted));
      assert.match(combinedOutput(interrupted), new RegExp(`managed filesystem failpoint: ${failpoint}`));
      assert.equal(existsSync(path.join(fixture, ".ai-toolkit.transaction.json")), true);

      rmSync(path.join(fixture, "compiled-agents", "reviewer-agent.compiled.md"));
      const recovery = runBuilder(fixture, ["--confirm-write"]);
      assert.notEqual(recovery.status, 0, combinedOutput(recovery));
      assert.deepEqual(
        snapshotTree(path.join(fixture, ".ai-toolkit")),
        before,
        `${failpoint} must recover the prior package before a later generation failure`
      );
      assert.deepEqual(
        readdirSync(fixture).filter((entry) => entry.startsWith(".ai-toolkit.")),
        [],
        `${failpoint} recovery must clean its journal, staging, and backup artifacts`
      );
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  }
});

test("package validation rejects a missing transitive runner import before promotion", () => {
  const { parent, fixture } = createFixture("module-closure");
  try {
    minimizeBuilderFixture(fixture);
    const before = snapshotTree(path.join(fixture, ".ai-toolkit"));
    rmSync(path.join(fixture, "scripts", "ai-toolkit", "kernel", "canonical-digest.mjs"));

    const result = runBuilder(fixture, ["--confirm-write"]);

    assert.notEqual(result.status, 0, combinedOutput(result));
    assert.match(combinedOutput(result), /delivery kernel import closure is missing/i);
    assert.deepEqual(snapshotTree(path.join(fixture, ".ai-toolkit")), before);
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
