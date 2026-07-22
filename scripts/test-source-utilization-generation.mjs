#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  encodeMarkdownTableCell,
  parseMarkdownTableSection,
  splitMarkdownTableRow
} from "./ai-toolkit/kernel/source-utilization-contract.mjs";
import {
  buildSourceUtilizationModel,
  parseArchiveIndex,
  renderSourceUtilizationMatrix
} from "./ai-toolkit/generate-source-utilization.mjs";
import { generateSourceUtilization } from "./generate-source-utilization.mjs";

const SOURCE_HEADERS = [
  "ID",
  "Source",
  "Classification",
  "Recommendation",
  "Current value path",
  "Next extraction",
  "Forbidden boundary"
];
const TOOL_HEADERS = [
  "ID",
  "Tool",
  "Classification",
  "Recommendation",
  "Current value path",
  "Next extraction",
  "Forbidden boundary"
];

function fixtureInputs() {
  return {
    catalog: {
      sources: [
        {
          id: "source-b",
          name: "Source B",
          sourceRecordPath: "sources/source-b.md",
          sourceBehavior: "living-official-guidance",
          scope: "community-reference",
          runtimePosture: "metadata-only",
          review: { state: "QUARANTINED" },
          reviewDecision: { boundaries: ["no activation"] }
        },
        {
          id: "source-a",
          name: "Source A",
          sourceRecordPath: "sources/source-a.md",
          sourceBehavior: "active-tool-or-skill",
          scope: "optional-tool",
          runtimePosture: "active-if-detected",
          dependentResourceIds: ["tool-a"],
          review: { state: "QUARANTINED" },
          reviewDecision: { boundaries: ["no installation"] }
        }
      ]
    },
    tools: {
      tools: [
        {
          id: "tool-a",
          name: "Tool A",
          defaultUse: "use only when detected",
          sourceRecordPath: "sources/tool-a.md",
          projectInstallClass: "use-if-existing",
          activationStatus: "metadata-only",
          forbiddenUse: ["Do not install."]
        }
      ]
    },
    registry: {
      sourceAssessments: [
        {
          sourceId: "source-a",
          state: "pending-review",
          evidenceGaps: ["receipt required"],
          plannedNicheIds: [],
          nextReviewTriggers: ["owner-review-requested"]
        },
        {
          sourceId: "source-b",
          state: "pending-review",
          evidenceGaps: ["receipt required"],
          plannedNicheIds: [],
          nextReviewTriggers: ["owner-review-requested"]
        }
      ],
      archiveIndex: [
        {
          id: "archived-source",
          source: "Archived Source",
          archiveReason: "Historical evidence only.",
          boundary: "No runtime use."
        }
      ]
    }
  };
}

function buildFixtureModel() {
  return buildSourceUtilizationModel({ ...fixtureInputs(), validateCanonical: false });
}

async function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "source-utilization-"));
  await Promise.all([
    mkdir(path.join(root, "registries"), { recursive: true }),
    mkdir(path.join(root, "docs"), { recursive: true }),
    mkdir(path.join(root, "sources", "archive"), { recursive: true })
  ]);
  const { catalog, tools, registry } = fixtureInputs();
  await Promise.all([
    writeJson(root, "sources/source-watchlist.json", catalog),
    writeJson(root, "registries/tools.registry.json", tools),
    writeJson(root, "registries/source-capabilities.registry.json", { sourceAssessments: registry.sourceAssessments }),
    writeFile(path.join(root, "sources", "archive", "INDEX.md"), [
      "# Retired source portfolio archive",
      "",
      "| ID | Prior record path | Archived record path | Prior identity / URL | Last stored monitor revision / digest / state | Removal reason |",
      "| --- | --- | --- | --- | --- | --- |",
      "| archived-source | `sources/archived-source.md` | `sources/archive/archived-source.md` | archived | none | Historical evidence only. |"
    ].join("\n"), "utf8"),
    writeFile(path.join(root, "docs", "SOURCE_UTILIZATION_MATRIX.md"), "stale fixture\n", "utf8")
  ]);
  return root;
}

async function runGenerator(args, cwd) {
  const mode = args.length === 0 ? "dry-run" : args[0] === "--check" ? "check" : args[0] === "--confirm-write" ? "confirm-write" : "dry-run";
  const result = await generateSourceUtilization({ repositoryRoot: cwd, mode, validateCanonical: false });
  return { exitCode: result.exitCode ?? 0 };
}

test("generated matrix contains every source and tool exactly once in its own section", () => {
  const markdown = renderSourceUtilizationMatrix(buildFixtureModel());
  const sources = parseMarkdownTableSection(markdown, "Watched Sources", SOURCE_HEADERS);
  const tools = parseMarkdownTableSection(markdown, "Registered Tools", TOOL_HEADERS);
  assert.deepEqual(sources.map((row) => row.ID), ["source-a", "source-b"]);
  assert.deepEqual(tools.map((row) => row.ID), ["tool-a"]);
});

test("check mode fails on byte drift without writing", async (t) => {
  const fixtureRoot = await createFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");
  const before = await readFile(reportPath);

  const result = await runGenerator(["--check"], fixtureRoot);

  assert.equal(result.exitCode, 1);
  assert.deepEqual(await readFile(reportPath), before);
});

test("confirm-write is required to repair report drift", async (t) => {
  const fixtureRoot = await createFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");

  assert.equal((await runGenerator([], fixtureRoot)).exitCode, 0);
  assert.equal(await readFile(reportPath, "utf8"), "stale fixture\n");
  assert.equal((await runGenerator(["--confirm-write"], fixtureRoot)).exitCode, 0);
  assert.match(await readFile(reportPath, "utf8"), /^# Source Utilization Matrix/m);
  assert.equal((await runGenerator(["--check"], fixtureRoot)).exitCode, 0);
});

test("confirm-write preserves a concurrent sibling document", async (t) => {
  const fixtureRoot = await createFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const siblingPath = path.join(fixtureRoot, "docs", "sibling.md");

  await generateSourceUtilization({
    repositoryRoot: fixtureRoot,
    mode: "confirm-write",
    validateCanonical: false,
    beforeReplace: () => writeFile(siblingPath, "concurrent sibling\n", "utf8")
  });

  assert.equal(await readFile(siblingPath, "utf8"), "concurrent sibling\n");
});

test("confirm-write aborts on target CAS conflict without overwriting the concurrent target", async (t) => {
  const fixtureRoot = await createFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");

  await assert.rejects(
    generateSourceUtilization({
      repositoryRoot: fixtureRoot,
      mode: "confirm-write",
      validateCanonical: false,
      beforeReplace: () => writeFile(reportPath, "concurrent target\n", "utf8")
    }),
    /changed before atomic replacement/
  );
  assert.equal(await readFile(reportPath, "utf8"), "concurrent target\n");
});

test("confirm-write cleans its temporary sibling after an injected failure", async (t) => {
  const fixtureRoot = await createFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await assert.rejects(
    generateSourceUtilization({
      repositoryRoot: fixtureRoot,
      mode: "confirm-write",
      validateCanonical: false,
      beforeReplace: () => { throw new Error("injected replacement failure"); }
    }),
    /injected replacement failure/
  );
  assert.equal((await readdir(path.join(fixtureRoot, "docs"))).some((name) => name.startsWith(".SOURCE_UTILIZATION_MATRIX.")), false);
});

test("canonical model rejects source assessment set drift and archive overlap", () => {
  const missingAssessment = fixtureInputs();
  missingAssessment.registry.sourceAssessments.pop();
  assert.throws(() => buildSourceUtilizationModel({ ...missingAssessment, validateCanonical: false }), /canonical source assessment set does not match catalog sources/);

  const archiveOverlap = fixtureInputs();
  archiveOverlap.registry.archiveIndex[0].id = "source-a";
  assert.throws(() => buildSourceUtilizationModel({ ...archiveOverlap, validateCanonical: false }), /archived source overlaps active catalog source: source-a/);
});

test("canonical model rejects extra assessments, duplicate names, and missing rendered tool fields", () => {
  const extraAssessment = fixtureInputs();
  extraAssessment.registry.sourceAssessments.push({
    sourceId: "extra-source",
    state: "pending-review",
    evidenceGaps: ["receipt required"],
    plannedNicheIds: [],
    nextReviewTriggers: ["owner-review-requested"]
  });
  assert.throws(() => buildSourceUtilizationModel({ ...extraAssessment, validateCanonical: false }), /canonical source assessment set does not match catalog sources/);

  const duplicateName = fixtureInputs();
  duplicateName.catalog.sources[1].name = duplicateName.catalog.sources[0].name;
  assert.throws(() => buildSourceUtilizationModel({ ...duplicateName, validateCanonical: false }), /duplicate catalog source name/);

  const missingToolField = fixtureInputs();
  missingToolField.tools.tools[0].defaultUse = "";
  assert.throws(() => buildSourceUtilizationModel({ ...missingToolField, validateCanonical: false }), /tool tool-a default use must be a non-empty string/);
});

test("shared table codec round-trips pipes, backslashes, newlines, and Unicode", () => {
  const inputs = fixtureInputs();
  inputs.catalog.sources[0].name = "Source | \\ \n 東京";
  inputs.registry.archiveIndex[0].archiveReason = "Archive | \\ \n مرحبا";
  const markdown = renderSourceUtilizationMatrix(buildSourceUtilizationModel({ ...inputs, validateCanonical: false }));
  const row = splitMarkdownTableRow(markdown.split("\n").find((line) => line.startsWith("| source-b ")));
  assert.equal(row[1], "Source | \\ \n 東京");
  assert.match(markdown, /Archive \\|/);
});

test("archive index uses the shared codec and rejects duplicate rows", () => {
  const reason = "Archive | \\ \n 東京";
  const header = "| ID | Prior record path | Archived record path | Prior identity / URL | Last stored monitor revision / digest / state | Removal reason |";
  const separator = "| --- | --- | --- | --- | --- | --- |";
  const row = `| archived-source | sources/archived-source.md | sources/archive/archived-source.md | identity | monitor | ${encodeMarkdownTableCell(reason)} |`;
  assert.equal(parseArchiveIndex([header, separator, row].join("\n"))[0].archiveReason, reason);
  assert.throws(() => parseArchiveIndex([header, separator, row, row].join("\n")), /duplicate archived source ID/);
});
