#!/usr/bin/env node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  encodeMarkdownTableCell,
  parseMarkdownTableSection,
  splitMarkdownTableRow
} from "./ai-toolkit/kernel/source-utilization-contract.mjs";
import { validateCanonicalToolsRegistry } from "./ai-toolkit/kernel/tool-registry-contract.mjs";
import {
  buildSourceUtilizationModel,
  loadSourceUtilizationInputs,
  parseArchiveIndex,
  renderSourceUtilizationMatrix
} from "./ai-toolkit/generate-source-utilization.mjs";
import { generateSourceUtilization } from "./generate-source-utilization.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_HEADERS = ["ID", "Source", "Classification", "Recommendation", "Current value path", "Next extraction", "Forbidden boundary"];
const TOOL_HEADERS = ["ID", "Tool", "Classification", "Recommendation", "Current value path", "Next extraction", "Forbidden boundary"];
const ARCHIVE_HEADER = "| ID | Prior record path | Archived record path | Prior identity / URL | Last stored monitor revision / digest / state | Removal reason |";
const ARCHIVE_SEPARATOR = "| --- | --- | --- | --- | --- | --- |";

function fixtureModel() {
  return {
    sources: [
      {
        id: "source-a",
        name: "Source | \\ \n 東京",
        classification: "active-profile-route",
        recommendation: "Do later",
        currentValuePath: "Pending synthesis; canonical evidence: sources/source-a.md",
        nextExtraction: "Pending synthesis: gap: receipt required",
        forbiddenBoundary: "no installation"
      },
      {
        id: "source-b",
        name: "Source B",
        classification: "reference-only-with-reason",
        recommendation: "Do later",
        currentValuePath: "Pending synthesis; canonical evidence: sources/source-b.md",
        nextExtraction: "Pending synthesis: trigger: owner-review-requested",
        forbiddenBoundary: "no activation"
      }
    ],
    tools: [
      {
        id: "tool-a",
        name: "Tool A",
        classification: "active-profile-route",
        recommendation: "Do later",
        currentValuePath: "sources/tool-a.md",
        nextExtraction: "use only when detected",
        forbiddenBoundary: "Do not install."
      }
    ],
    archivedSources: [
      {
        id: "archived-source",
        source: "Archived Source",
        archiveReason: "Archive | \\ \n مرحبا",
        priorRecordPath: "sources/archived-source.md",
        archivedRecordPath: "sources/archive/archived-source.md",
        archiveProvenance: "sources/archive/INDEX.md",
        boundary: "No runtime use."
      }
    ]
  };
}

function canonicalTool({ id = "tool-a", projectInstallClass = "use-if-existing", status = "active-if-detected", profile = true } = {}) {
  const tool = {
    id,
    name: `Tool ${id}`,
    repository: "example/tool",
    homepage: "https://example.invalid/tool",
    purpose: "test canonical tool",
    category: "test",
    status,
    activationStatus: "metadata-only",
    runtimeSurface: "external-tool-metadata",
    defaultUse: "test use",
    approvalRequiredFor: ["install"],
    allowedUse: ["document"],
    forbiddenUse: ["Do not install."],
    sourceRecordPath: "sources/tool-a.md",
    integrationRecordPath: null,
    notes: "test fixture",
    enterpriseRisk: { reviewState: "metadata-only" },
    activationLevels: ["active-if-detected"]
  };
  if (profile) {
    Object.assign(tool, {
      projectInstallClass,
      lane: "test lane",
      projectTypes: ["test"],
      evidenceMode: "test evidence",
      installLocation: "target project",
      defaultInstall: false,
      requiresOwnerApproval: true,
      conflictGroup: "test",
      preferredRole: "test",
      forbiddenActions: ["Do not install."]
    });
  }
  return tool;
}

async function writeJson(root, relativePath, value) {
  const target = path.join(root, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createCanonicalFixtureRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "source-utilization-"));
  const archiveText = await readFile(path.join(ROOT, "sources", "archive", "INDEX.md"), "utf8");
  const archiveRecords = parseArchiveIndex(archiveText);
  const paths = [
    "sources/source-watchlist.json",
    "registries/tools.registry.json",
    "registries/source-capabilities.registry.json",
    "sources/archive/INDEX.md",
    ...archiveRecords.map((record) => record.archivedRecordPath)
  ];
  for (const relativePath of paths) {
    const target = path.join(root, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, await readFile(path.join(ROOT, relativePath)));
  }
  await mkdir(path.join(root, "docs"), { recursive: true });
  await writeFile(path.join(root, "docs", "SOURCE_UTILIZATION_MATRIX.md"), "stale fixture\n", "utf8");
  return root;
}

async function runGenerator(args, cwd) {
  const mode = args.length === 0 ? "dry-run" : args[0] === "--check" ? "check" : args[0] === "--confirm-write" ? "confirm-write" : "dry-run";
  const result = await generateSourceUtilization({ repositoryRoot: cwd, mode });
  return { exitCode: result.exitCode ?? 0 };
}

function archiveIndexRow({ priorRecordPath = "sources/archived-source.md", archivedRecordPath = "sources/archive/archived-source.md", reason = "Historical evidence only." } = {}) {
  return [ARCHIVE_HEADER, ARCHIVE_SEPARATOR, `| archived-source | ${encodeMarkdownTableCell(priorRecordPath)} | ${encodeMarkdownTableCell(archivedRecordPath)} | identity | monitor | ${encodeMarkdownTableCell(reason)} |`].join("\n");
}

test("generated matrix contains every source and tool exactly once in its own section", () => {
  const markdown = renderSourceUtilizationMatrix(fixtureModel());
  const sources = parseMarkdownTableSection(markdown, "Watched Sources", SOURCE_HEADERS);
  const tools = parseMarkdownTableSection(markdown, "Registered Tools", TOOL_HEADERS);
  assert.deepEqual(sources.map((row) => row.ID), ["source-a", "source-b"]);
  assert.deepEqual(tools.map((row) => row.ID), ["tool-a"]);
});

test("canonical tool contract permits the documented source-only shape and rejects unsafe profile classes", () => {
  const sourceOnly = canonicalTool({ id: "source-only", status: "source-only", profile: false });
  assert.doesNotThrow(() => validateCanonicalToolsRegistry({ registryType: "tools", tools: [sourceOnly] }));

  const unsafeClass = canonicalTool({ projectInstallClass: "invented-unsafe-class" });
  assert.throws(() => validateCanonicalToolsRegistry({ registryType: "tools", tools: [unsafeClass] }), /unknown projectInstallClass/);

  const missingProfileField = canonicalTool();
  delete missingProfileField.lane;
  assert.throws(() => validateCanonicalToolsRegistry({ registryType: "tools", tools: [missingProfileField] }), /missing required field: lane/);

  const missingClass = canonicalTool({ profile: false });
  assert.throws(() => validateCanonicalToolsRegistry({ registryType: "tools", tools: [missingClass] }), /must declare projectInstallClass unless status is source-only/);
});

test("check mode fails on byte drift without writing", async (t) => {
  const fixtureRoot = await createCanonicalFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");
  const before = await readFile(reportPath);

  const result = await runGenerator(["--check"], fixtureRoot);

  assert.equal(result.exitCode, 1);
  assert.deepEqual(await readFile(reportPath), before);
});

test("confirm-write is required to repair report drift", async (t) => {
  const fixtureRoot = await createCanonicalFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");

  assert.equal((await runGenerator([], fixtureRoot)).exitCode, 0);
  assert.equal(await readFile(reportPath, "utf8"), "stale fixture\n");
  assert.equal((await runGenerator(["--confirm-write"], fixtureRoot)).exitCode, 0);
  assert.match(await readFile(reportPath, "utf8"), /^# Source Utilization Matrix/m);
  assert.equal((await runGenerator(["--check"], fixtureRoot)).exitCode, 0);
});

test("confirm-write preserves a concurrent sibling document", async (t) => {
  const fixtureRoot = await createCanonicalFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const siblingPath = path.join(fixtureRoot, "docs", "sibling.md");

  await generateSourceUtilization({
    repositoryRoot: fixtureRoot,
    mode: "confirm-write",
    beforeReplace: () => writeFile(siblingPath, "concurrent sibling\n", "utf8")
  });

  assert.equal(await readFile(siblingPath, "utf8"), "concurrent sibling\n");
});

test("confirm-write aborts on target CAS conflict without overwriting the concurrent target", async (t) => {
  const fixtureRoot = await createCanonicalFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");

  await assert.rejects(
    generateSourceUtilization({
      repositoryRoot: fixtureRoot,
      mode: "confirm-write",
      beforeReplace: () => writeFile(reportPath, "concurrent target\n", "utf8")
    }),
    /changed before atomic replacement/
  );
  assert.equal(await readFile(reportPath, "utf8"), "concurrent target\n");
});

test("confirm-write cleans its temporary sibling after an injected failure", async (t) => {
  const fixtureRoot = await createCanonicalFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));

  await assert.rejects(
    generateSourceUtilization({
      repositoryRoot: fixtureRoot,
      mode: "confirm-write",
      beforeReplace: () => { throw new Error("injected replacement failure"); }
    }),
    /injected replacement failure/
  );
  assert.equal((await readdir(path.join(fixtureRoot, "docs"))).some((name) => name.startsWith(".SOURCE_UTILIZATION_MATRIX.")), false);
});

test("invalid canonical inputs cannot reach confirm-write", async (t) => {
  const fixtureRoot = await createCanonicalFixtureRoot();
  t.after(() => rm(fixtureRoot, { recursive: true, force: true }));
  const registryPath = path.join(fixtureRoot, "registries", "tools.registry.json");
  const tools = JSON.parse(await readFile(registryPath, "utf8"));
  const profileTool = tools.tools.find((tool) => tool.projectInstallClass);
  assert.ok(profileTool, "canonical fixture needs a profile tool");
  profileTool.projectInstallClass = "invented-unsafe-class";
  await writeJson(fixtureRoot, "registries/tools.registry.json", tools);
  const reportPath = path.join(fixtureRoot, "docs", "SOURCE_UTILIZATION_MATRIX.md");

  await assert.rejects(generateSourceUtilization({ repositoryRoot: fixtureRoot, mode: "confirm-write" }), /unknown projectInstallClass/);
  assert.equal(await readFile(reportPath, "utf8"), "stale fixture\n");
  assert.equal((await readdir(path.join(fixtureRoot, "docs"))).some((name) => name.startsWith(".SOURCE_UTILIZATION_MATRIX.")), false);
});

test("canonical model rejects source-assessment drift, archive overlap, and unsafe tool class", async () => {
  const inputs = await loadSourceUtilizationInputs(ROOT);
  const missingAssessment = structuredClone(inputs);
  missingAssessment.registry.sourceAssessments.pop();
  assert.throws(() => buildSourceUtilizationModel(missingAssessment), /(canonical source assessment set does not match catalog sources|active catalog source requires exactly one assessment)/);

  const archiveOverlap = structuredClone(inputs);
  archiveOverlap.registry.archiveIndex[0].id = archiveOverlap.catalog.sources[0].id;
  assert.throws(() => buildSourceUtilizationModel(archiveOverlap), /archived source overlaps active catalog source/);

  const unsafeClass = structuredClone(inputs);
  const profileTool = unsafeClass.tools.tools.find((tool) => tool.projectInstallClass);
  assert.ok(profileTool, "canonical inputs need a profile tool");
  profileTool.projectInstallClass = "invented-unsafe-class";
  assert.throws(() => buildSourceUtilizationModel(unsafeClass), /unknown projectInstallClass/);
});

test("shared table codec round-trips pipes, backslashes, newlines, and Unicode", () => {
  const markdown = renderSourceUtilizationMatrix(fixtureModel());
  const row = splitMarkdownTableRow(markdown.split("\n").find((line) => line.startsWith("| source-a ")));
  assert.equal(row[1], "Source | \\ \n 東京");
  assert.match(markdown, /Archive \\|/);
});

test("archive index validates path safety, archived-record presence, and exact provenance round-trip", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "source-utilization-archive-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "sources", "archive"), { recursive: true });
  await writeFile(path.join(root, "sources", "archive", "archived-source.md"), "archive evidence\n", "utf8");
  const markdown = archiveIndexRow();
  const parsed = parseArchiveIndex(markdown, { repositoryRoot: root });
  assert.equal(parsed[0].priorRecordPath, "sources/archived-source.md");
  assert.equal(parsed[0].archivedRecordPath, "sources/archive/archived-source.md");
  const rendered = renderSourceUtilizationMatrix({ ...fixtureModel(), archivedSources: parsed });
  assert.match(rendered, /\| archived-source \| archived-source \| Historical evidence only\. \| sources\/archived-source\.md \| sources\/archive\/archived-source\.md \| sources\/archive\/INDEX\.md \|/);
  assert.throws(() => parseArchiveIndex(archiveIndexRow({ priorRecordPath: "../escape.md" })), /safe repository-relative path/);
  assert.throws(() => parseArchiveIndex(archiveIndexRow({ archivedRecordPath: "C:\\escape.md" })), /safe repository-relative path/);
  await rm(path.join(root, "sources", "archive", "archived-source.md"));
  assert.throws(() => parseArchiveIndex(markdown, { repositoryRoot: root }), /does not exist/);
});

test("pending-synthesis rows state that historical classification is not upstream approval", async () => {
  const markdown = renderSourceUtilizationMatrix(buildSourceUtilizationModel(await loadSourceUtilizationInputs(ROOT)));
  assert.match(markdown, /classification records the pinned historical\/current toolkit disposition only; it is not current upstream approval, activation, or authorization/);
  const rows = parseMarkdownTableSection(markdown, "Watched Sources", SOURCE_HEADERS);
  for (const id of ["impeccable", "ruflo"]) {
    const row = rows.find((candidate) => candidate.ID === id);
    assert.ok(row, `missing ${id} watched-source row`);
    assert.match(row["Current value path"], /^Pending synthesis;/);
    assert.match(row["Next extraction"], /^Pending synthesis:/);
  }
});
