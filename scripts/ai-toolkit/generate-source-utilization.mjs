import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertRegularFileWithin } from "../../install/safe-filesystem.mjs";
import { validateSourceCapabilityRegistry, validateSourceCatalog } from "./source-governance.mjs";
import { encodeMarkdownTableCell, splitMarkdownTableRow } from "./kernel/source-utilization-contract.mjs";
import { validateCanonicalToolsRegistry } from "./kernel/tool-registry-contract.mjs";

const SOURCE_HEADERS = ["ID", "Source", "Classification", "Recommendation", "Current value path", "Next extraction", "Forbidden boundary"];
const TOOL_HEADERS = ["ID", "Tool", "Classification", "Recommendation", "Current value path", "Next extraction", "Forbidden boundary"];
const ARCHIVE_HEADERS = ["ID", "Source", "Archive reason", "Prior record provenance", "Archived record provenance", "Archive index", "Boundary"];

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function assertUniqueRecords(records, label, { name = false } = {}) {
  if (!Array.isArray(records) || records.length === 0) throw new Error(`${label} must be a non-empty array`);
  const ids = new Set();
  const names = new Set();
  for (const record of records) {
    const id = requireText(record?.id, `${label} ID`);
    if (ids.has(id)) throw new Error(`duplicate ${label} ID: ${id}`);
    ids.add(id);
    if (name) {
      const displayName = requireText(record?.name, `${label} ${id} name`);
      if (names.has(displayName)) throw new Error(`duplicate ${label} name: ${displayName}`);
      names.add(displayName);
    }
  }
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

function assertCanonicalInputSets({ catalog, tools, registry }) {
  const sources = assertUniqueRecords(catalog?.sources, "catalog source", { name: true });
  const toolRows = assertUniqueRecords(tools?.tools, "tool", { name: true });
  validateCanonicalToolsRegistry(tools);
  validateSourceCatalog(catalog, { now: new Date().toISOString() });
  const { archiveIndex, ...sourceCapabilityRegistry } = registry;
  validateSourceCapabilityRegistry(sourceCapabilityRegistry, { catalog });
  if (!Array.isArray(registry?.sourceAssessments)) throw new Error("source assessments must be an array");
  const assessmentIds = new Set();
  for (const assessment of registry.sourceAssessments) {
    const sourceId = requireText(assessment?.sourceId, "source assessment sourceId");
    if (assessmentIds.has(sourceId)) throw new Error(`duplicate source assessment: ${sourceId}`);
    assessmentIds.add(sourceId);
  }
  const sourceIds = new Set(sources.map((source) => source.id));
  if (assessmentIds.size !== sourceIds.size || [...sourceIds].some((id) => !assessmentIds.has(id))) {
    throw new Error("canonical source assessment set does not match catalog sources");
  }
  return { sources, tools: toolRows };
}

function sourceClassification(source) {
  if (source.scope === "core" || source.scope === "platform-preview" || source.sourceBehavior === "versioned-standard") return "reference-only-with-reason";
  if (source.reviewDecision?.outcome === "SYNCED_PLUGIN_DELEGATED") return "active-read-only";
  if (source.reviewDecision?.outcome === "SYNCED_ADOPTED") return "active-method";
  if (source.reviewDecision?.outcome === "SYNCED_REFERENCE") return "active-reference";
  if (source.sourceBehavior === "active-tool-or-skill") return "active-profile-route";
  return "reference-only-with-reason";
}

function sourceRecommendation(assessment) {
  return assessment.state === "blocked" ? "Needs owner decision" : "Do later";
}

function toolClassification(tool) {
  if (tool.status === "source-only") return "reference-only-with-reason";
  if (tool.projectInstallClass === "active-reference") return "active-reference";
  if (tool.projectInstallClass === "approval-required") return "reference-only-with-reason";
  return "active-profile-route";
}

function sourceEvidence(source, assessment) {
  const paths = uniqueSorted([source.sourceRecordPath, ...(source.affectedArtifacts || [])].filter(Boolean));
  if (paths.length === 0) throw new Error(`source ${source.id} has no canonical affected artifact evidence`);
  const status = assessment.state === "pending-review" ? "Pending synthesis" : `Synthesis assessment: ${assessment.state}`;
  return `${status}; canonical evidence: ${paths.join(", ")}`;
}

function sourceNextAction(assessment) {
  const gaps = Array.isArray(assessment.evidenceGaps) ? assessment.evidenceGaps : [];
  const triggers = Array.isArray(assessment.nextReviewTriggers) ? assessment.nextReviewTriggers : [];
  const detail = [...gaps.map((gap) => `gap: ${gap}`), ...triggers.map((trigger) => `trigger: ${trigger}`)];
  if (detail.length === 0) throw new Error(`source assessment ${assessment.sourceId} has no canonical next action`);
  return `${assessment.state === "pending-review" ? "Pending synthesis" : "Next assessment action"}: ${detail.join("; ")}`;
}

function sourceBoundary(source) {
  const boundaries = source.reviewDecision?.boundaries;
  return Array.isArray(boundaries) && boundaries.length > 0
    ? uniqueSorted(boundaries).join("; ")
    : "No automatic import, installation, activation, or runtime use.";
}

function archivePath(value, label, { repositoryRoot, requireExisting = false } = {}) {
  const raw = requireText(value, label);
  const candidate = raw.startsWith("`") && raw.endsWith("`") ? raw.slice(1, -1) : raw;
  if (candidate === "" || candidate.includes("\\") || path.win32.isAbsolute(candidate) || path.posix.isAbsolute(candidate)) {
    throw new Error(`archive ${label} must be a safe repository-relative path`);
  }
  const normalized = path.posix.normalize(candidate);
  if (normalized !== candidate || !candidate.startsWith("sources/")) {
    throw new Error(`archive ${label} must be a safe repository-relative path`);
  }
  if (requireExisting && repositoryRoot) {
    assertRegularFileWithin(repositoryRoot, path.resolve(repositoryRoot, candidate), `archive ${label}`);
  }
  return candidate;
}

export function parseArchiveIndex(markdown, { repositoryRoot } = {}) {
  const lines = markdown.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim() === "| ID | Prior record path | Archived record path | Prior identity / URL | Last stored monitor revision / digest / state | Removal reason |");
  if (headerIndex < 0 || lines[headerIndex + 1]?.trim() !== "| --- | --- | --- | --- | --- | --- |") {
    throw new Error("archive index is missing its canonical retirement table");
  }
  const archives = [];
  for (let index = headerIndex + 2; index < lines.length && lines[index].trim().startsWith("|"); index += 1) {
    const row = splitMarkdownTableRow(lines[index]);
    if (row.length !== 6) throw new Error("archive index contains a malformed retirement row");
    const [id, priorRecordPath, archivedRecordPath, identity, monitor, archiveReason] = row;
    for (const [value, label] of [[id, "ID"], [identity, "identity"], [monitor, "monitor"], [archiveReason, "removal reason"]]) requireText(value, `archive ${label}`);
    archives.push({
      id,
      source: id,
      archiveReason,
      priorRecordPath: archivePath(priorRecordPath, "prior record path", { repositoryRoot }),
      archivedRecordPath: archivePath(archivedRecordPath, "archived record path", { repositoryRoot, requireExisting: true }),
      archiveProvenance: "sources/archive/INDEX.md",
      boundary: "No active provenance, install, extraction, activation, or runtime use."
    });
  }
  return assertUniqueRecords(archives, "archived source", { name: false });
}

export function buildSourceUtilizationModel({ catalog, tools, registry } = {}) {
  const validated = assertCanonicalInputSets({ catalog, tools, registry });
  const assessments = new Map(registry.sourceAssessments.map((assessment) => [assessment.sourceId, assessment]));
  const activeIds = new Set(validated.sources.map((source) => source.id));
  const archivedSources = assertUniqueRecords(registry?.archiveIndex || [], "archived source").map((archive) => {
    const id = requireText(archive.id, "archived source ID");
    if (activeIds.has(id)) throw new Error(`archived source overlaps active catalog source: ${id}`);
    return {
      id,
      source: requireText(archive.source, `archived source ${id} source`),
      archiveReason: requireText(archive.archiveReason, `archived source ${id} reason`),
      priorRecordPath: archivePath(archive.priorRecordPath, `source ${id} prior record path`),
      archivedRecordPath: archivePath(archive.archivedRecordPath, `source ${id} archived record path`),
      archiveProvenance: requireText(archive.archiveProvenance, `archived source ${id} provenance`),
      boundary: requireText(archive.boundary, `archived source ${id} boundary`)
    };
  });
  const sources = validated.sources.map((source) => {
    const assessment = assessments.get(source.id);
    return {
      id: source.id,
      name: source.name,
      classification: sourceClassification(source),
      recommendation: sourceRecommendation(assessment),
      currentValuePath: sourceEvidence(source, assessment),
      nextExtraction: sourceNextAction(assessment),
      forbiddenBoundary: sourceBoundary(source)
    };
  });
  const toolRows = validated.tools.map((tool) => ({
    id: tool.id,
    name: tool.name,
    classification: toolClassification(tool),
    recommendation: tool.projectInstallClass === "approval-required" ? "Needs owner decision" : "Do later",
    currentValuePath: requireText(tool.sourceRecordPath || "registries/tools.registry.json", `tool ${tool.id} current value path`),
    nextExtraction: requireText(tool.defaultUse, `tool ${tool.id} default use`),
    forbiddenBoundary: Array.isArray(tool.forbiddenUse) && tool.forbiddenUse.length > 0 ? uniqueSorted(tool.forbiddenUse).join("; ") : "No installation, activation, or runtime use from metadata."
  }));
  return { sources, tools: toolRows, archivedSources, sourceAssessments: [...assessments.values()] };
}

function table(heading, headers, rows) {
  return [`## ${heading}`, "", `| ${headers.map(encodeMarkdownTableCell).join(" | ")} |`, `| ${headers.map(() => "---").join(" | ")} |`, ...rows.map((row) => `| ${row.map(encodeMarkdownTableCell).join(" | ")} |`)].join("\n");
}

export function renderSourceUtilizationMatrix(model) {
  const watchedRows = model.sources.map((source) => [source.id, source.name, source.classification, source.recommendation, source.currentValuePath, source.nextExtraction, source.forbiddenBoundary]);
  const toolRows = model.tools.map((tool) => [tool.id, tool.name, tool.classification, tool.recommendation, tool.currentValuePath, tool.nextExtraction, tool.forbiddenBoundary]);
  const archiveRows = model.archivedSources.map((source) => [source.id, source.source, source.archiveReason, source.priorRecordPath, source.archivedRecordPath, source.archiveProvenance, source.boundary]);
  return [
    "# Source Utilization Matrix", "",
    "This generated report is canonical synthesis of the SourceCatalog, SourceCapabilityRegistry, tools registry, and retired-source archive index. It does not approve source activation, installation, extraction, or runtime use.", "",
    "## Classification Contract", "",
    "Classifications are generated from canonical source scope, behavior, review disposition, and registered-tool install class: `active-method`, `active-profile-route`, `active-reference`, `active-read-only`, and `reference-only-with-reason`. For a `pending-review` synthesis assessment, classification records the pinned historical/current toolkit disposition only; it is not current upstream approval, activation, or authorization. The row's current value and next extraction remain `Pending synthesis` until that new assessment is recorded. Recommendations remain `Must do next`, `Do later`, `Needs owner decision`, or `Reject / not aligned`.", "",
    table("Watched Sources", SOURCE_HEADERS, watchedRows), "",
    table("Archived portfolio", ARCHIVE_HEADERS, archiveRows), "",
    "## Internal Audit Artifacts", "", "Toolkit-owned audit artifacts remain governed by their canonical documents and owner workflows; they are not watched-source authority.", "", "- UI/UX audit ownership: `docs/UI_UX_PRO_MAX_AUDIT.md`.", "",
    "## Tooling posture and activation", "", "Registered-tool posture, owner approval, and activation levels are authoritative in `registries/tools.registry.json`. Registry presence never authorizes installation, CI wiring, MCP setup, global configuration, or runtime execution.", "",
    table("Registered Tools", TOOL_HEADERS, toolRows), "",
    "## Rejected Operations", "", "No source or tool record authorizes raw copying, automatic install or activation, external runtime execution, global configuration, CI wiring, product-repository mutation, or publication. Follow the forbidden boundary in each generated row.", ""
  ].join("\n");
}

async function readJson(root, relativePath, label) {
  const target = assertRegularFileWithin(root, path.resolve(root, relativePath), label);
  return JSON.parse(await readFile(target, "utf8"));
}

export async function loadSourceUtilizationInputs(repositoryRoot) {
  const root = path.resolve(repositoryRoot);
  const [catalog, tools, registry, archiveText] = await Promise.all([
    readJson(root, "sources/source-watchlist.json", "canonical source catalog"),
    readJson(root, "registries/tools.registry.json", "canonical tools registry"),
    readJson(root, "registries/source-capabilities.registry.json", "canonical source-capability registry"),
    readFile(assertRegularFileWithin(root, path.resolve(root, "sources/archive/INDEX.md"), "canonical archive index"), "utf8")
  ]);
  const inputs = { catalog, tools, registry: { ...registry, archiveIndex: parseArchiveIndex(archiveText, { repositoryRoot: root }) } };
  buildSourceUtilizationModel(inputs);
  return inputs;
}
