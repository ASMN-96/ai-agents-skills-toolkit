#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  collectReferenceClosureFailures,
  collectReferencedSupportAssets
} from "./ai-toolkit/reference-closure.mjs";

function withFixture(callback) {
  const root = mkdtempSync(path.join(tmpdir(), "reference-closure-test-"));
  try {
    return callback(root);
  } finally {
    if (root.startsWith(tmpdir())) rmSync(root, { recursive: true, force: true });
  }
}

function write(root, relativePath, text) {
  const fullPath = path.join(root, ...relativePath.split("/"));
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text, "utf8");
}

function manifestAsset(type, name, assetPath) {
  return {
    type,
    name,
    path: assetPath,
    sha256: "0".repeat(64)
  };
}

test("packaged skill references fail when required method is missing", () => {
  withFixture((root) => {
    write(root, ".ai-toolkit/skills/governance/SKILL.md", [
      "---",
      "name: governance",
      "description: fixture",
      "---",
      "Use `.ai-toolkit/methods/governance/task-intake-routing-gate.md`."
    ].join("\n"));

    const failures = collectReferenceClosureFailures({
      root,
      scanFiles: [".ai-toolkit/skills/governance/SKILL.md"]
    });

    assert.match(
      failures.map((failure) => failure.message).join("\n"),
      /missing reference '.ai-toolkit\/methods\/governance\/task-intake-routing-gate.md'/
    );
  });
});

test("packaged root-style method references resolve inside target .ai-toolkit", () => {
  withFixture((root) => {
    write(root, ".ai-toolkit/skills/governance/SKILL.md", [
      "---",
      "name: governance",
      "description: fixture",
      "---",
      "Use `methods/governance/task-intake-routing-gate.md`."
    ].join("\n"));
    write(root, ".ai-toolkit/methods/governance/task-intake-routing-gate.md", "# Task Intake\n");
    write(root, ".ai-toolkit/.ai-toolkit-manifest.json", `${JSON.stringify({
      schemaVersion: "1.0.0",
      assets: [
        manifestAsset("skill", "governance", "skills/governance/SKILL.md"),
        manifestAsset("method", "methods/governance/task-intake-routing-gate.md", "methods/governance/task-intake-routing-gate.md")
      ]
    }, null, 2)}\n`);

    const failures = collectReferenceClosureFailures({
      root,
      scanFiles: [".ai-toolkit/skills/governance/SKILL.md"]
    });

    assert.deepEqual(failures, []);
  });
});

test("target install manifest must record referenced support assets", () => {
  withFixture((root) => {
    write(root, ".ai-toolkit/skills/governance/SKILL.md", [
      "---",
      "name: governance",
      "description: fixture",
      "---",
      "Use `methods/governance/task-intake-routing-gate.md`."
    ].join("\n"));
    write(root, ".ai-toolkit/methods/governance/task-intake-routing-gate.md", "# Task Intake\n");
    write(root, ".ai-toolkit/.ai-toolkit-manifest.json", `${JSON.stringify({
      schemaVersion: "1.0.0",
      assets: [
        manifestAsset("skill", "governance", "skills/governance/SKILL.md")
      ]
    }, null, 2)}\n`);

    const failures = collectReferenceClosureFailures({
      root,
      scanFiles: [".ai-toolkit/skills/governance/SKILL.md"]
    });

    assert.match(
      failures.map((failure) => failure.message).join("\n"),
      /manifest is missing method asset: methods\/governance\/task-intake-routing-gate.md/
    );
  });
});

test("stale RISS aliases fail on active instruction surfaces", () => {
  withFixture((root) => {
    write(root, "AGENTS.md", "Use `.ai-toolkit/skills/riss-governance/SKILL.md` for serious work.\n");

    const failures = collectReferenceClosureFailures({
      root,
      scanFiles: ["AGENTS.md"]
    });

    assert.match(
      failures.map((failure) => failure.message).join("\n"),
      /active reference to removed skill alias 'riss-governance'/
    );
  });
});

test("stale aliases are allowed in explicitly historical docs", () => {
  withFixture((root) => {
    write(root, "docs/MIGRATION_TO_CANONICAL_SKILLS.md", "Historical removed alias: `riss-governance` is not active.\n");

    const failures = collectReferenceClosureFailures({
      root,
      scanFiles: ["docs/MIGRATION_TO_CANONICAL_SKILLS.md"]
    });

    assert.deepEqual(failures, []);
  });
});

test("project-local context placeholders are allowed in sync documentation", () => {
  withFixture((root) => {
    write(root, "docs/PROJECT_SYNC_WORKFLOW.md", "Project-local files must not be overwritten: `docs/ai/STATE.md`.\n");

    const failures = collectReferenceClosureFailures({
      root,
      scanFiles: ["docs/PROJECT_SYNC_WORKFLOW.md"]
    });

    assert.deepEqual(failures, []);
  });
});

test("support asset collection follows skill references transitively", () => {
  withFixture((root) => {
    write(root, "skills/governance/SKILL.md", "Use `methods/governance/task-intake-routing-gate.md`.\n");
    write(root, "methods/governance/task-intake-routing-gate.md", "See `docs/PROJECT_TOOLING_OPERATING_MODEL.md`.\n");
    write(root, "docs/PROJECT_TOOLING_OPERATING_MODEL.md", "# Operating Model\n");

    const assets = collectReferencedSupportAssets({
      root,
      seedFiles: ["skills/governance/SKILL.md"]
    });

    assert.deepEqual(assets.map((asset) => [asset.type, asset.sourcePath]), [
      ["support-doc", "docs/PROJECT_TOOLING_OPERATING_MODEL.md"],
      ["method", "methods/governance/task-intake-routing-gate.md"]
    ]);
  });
});
