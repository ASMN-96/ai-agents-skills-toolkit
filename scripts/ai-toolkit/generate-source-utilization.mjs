import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertRegularFileWithin } from "../../install/safe-filesystem.mjs";

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

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ").trim();
}

function joined(values, fallback) {
  return Array.isArray(values) && values.length > 0 ? values.join("; ") : fallback;
}

function sourceClassification(source) {
  if (source.scope === "core" || source.scope === "platform-preview" || source.sourceBehavior === "versioned-standard") {
    return "reference-only-with-reason";
  }
  if (source.sourceBehavior === "active-tool-or-skill") {
    return source.reviewDecision?.outcome === "SYNCED_REFERENCE" ? "active-reference" : "active-profile-route";
  }
  if (source.reviewDecision?.outcome === "SYNCED_PLUGIN_DELEGATED") return "active-read-only";
  if (/ui-quality source intelligence/i.test(source.reviewDecision?.summary || "")) return "active-skill-rule";
  if (/design-source-map/i.test(source.reviewDecision?.summary || "")) return "planned-extraction";
  if (/design-system|context packing|governed metadata/i.test(source.reviewDecision?.summary || "")) return "active-reference";
  if (source.reviewDecision?.outcome === "SYNCED_ADOPTED") return "active-method";
  if (/restricted reference-only|official reference-only/i.test(source.reviewDecision?.summary || "")) {
    return "reference-only-with-reason";
  }
  return source.sourceBehavior === "living-official-guidance" ? "reference-only-with-reason" : "active-method";
}

function sourceRecommendation(source, assessment) {
  if (assessment?.state === "blocked" || source.runtimePosture === "owner-approved-install") return "Needs owner decision";
  return "Do later";
}

function toolClassification(tool) {
  if (tool.projectInstallClass === "approval-required") return "reference-only-with-reason";
  if (tool.activationLevels?.includes("active-reference") || /active-reference/i.test(tool.defaultUse || "")) return "active-reference";
  return "active-profile-route";
}

function toolRecommendation(tool) {
  return tool.projectInstallClass === "approval-required" ? "Needs owner decision" : "Do later";
}

function assertUniqueSorted(records, label) {
  const ids = new Set();
  for (const record of records) {
    if (!record?.id) throw new Error(`${label} record is missing an ID`);
    if (ids.has(record.id)) throw new Error(`duplicate ${label} ID: ${record.id}`);
    ids.add(record.id);
  }
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

export function parseArchiveIndex(markdown) {
  const section = markdown.match(/\| ID \| Prior record path \| Archived record path \| Prior identity \/ URL \| Last stored monitor revision \/ digest \/ state \| Removal reason \|\r?\n\| --- \| --- \| --- \| --- \| --- \| --- \|\r?\n([\s\S]*?)(?:\r?\n\r?\n|$)/);
  if (!section) throw new Error("archive index is missing its canonical retirement table");
  return section[1].split(/\r?\n/).filter(Boolean).map((line) => {
    const cells = line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
    if (cells.length !== 6 || !cells[0] || !cells[5]) throw new Error("archive index contains a malformed retirement row");
    return {
      id: cells[0],
      source: cells[0],
      archiveReason: cells[5],
      boundary: "No active provenance, install, extraction, activation, or runtime use."
    };
  });
}

export function buildSourceUtilizationModel({ catalog, tools, registry } = {}) {
  const assessments = new Map((registry?.sourceAssessments || []).map((assessment) => [assessment.sourceId, assessment]));
  const sources = assertUniqueSorted(catalog?.sources || [], "source").map((source) => {
    const assessment = assessments.get(source.id);
    if (!assessment) throw new Error(`source assessment is missing for ${source.id}`);
    return {
      id: source.id,
      name: source.name,
      classification: sourceClassification(source),
      recommendation: sourceRecommendation(source, assessment),
      currentValuePath: source.sourceRecordPath || "sources/source-watchlist.json",
      nextExtraction: joined(assessment.nextReviewTriggers, "owner review required"),
      forbiddenBoundary: joined(source.reviewDecision?.boundaries, "No automatic import, installation, activation, or runtime use.")
    };
  });
  const toolRows = assertUniqueSorted(tools?.tools || [], "tool").map((tool) => ({
    id: tool.id,
    name: tool.name,
    classification: toolClassification(tool),
    recommendation: toolRecommendation(tool),
    currentValuePath: tool.sourceRecordPath || "registries/tools.registry.json",
    nextExtraction: tool.defaultUse || "Owner-approved review required.",
    forbiddenBoundary: joined(tool.forbiddenUse, "No installation, activation, or runtime use from metadata.")
  }));
  const archivedSources = assertUniqueSorted(registry?.archiveIndex || [], "archived source").map((source) => ({
    id: source.id,
    source: source.source || source.id,
    archiveReason: source.archiveReason,
    boundary: source.boundary
  }));
  return { sources, tools: toolRows, archivedSources, sourceAssessments: [...assessments.values()] };
}

function table(heading, headers, rows) {
  return [
    `## ${heading}`,
    "",
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

export function renderSourceUtilizationMatrix(model) {
  const watchedRows = model.sources.map((source) => [
    source.id,
    source.name,
    source.classification,
    source.recommendation,
    source.currentValuePath,
    source.nextExtraction,
    source.forbiddenBoundary
  ]);
  const toolRows = model.tools.map((tool) => [
    tool.id,
    tool.name,
    tool.classification,
    tool.recommendation,
    tool.currentValuePath,
    tool.nextExtraction,
    tool.forbiddenBoundary
  ]);
  const archiveRows = model.archivedSources.map((source) => [source.id, source.source, source.archiveReason, source.boundary]);
  return [
    "# Source Utilization Matrix",
    "",
    "This report is generated from the canonical SourceCatalog, source-capability registry, tools registry, and retired-source archive index. It does not approve source activation, installation, extraction, or runtime use.",
    "Recommendations include Must do next, Do later, Needs owner decision, and Reject / not aligned when canonical governance state requires them.",
    "",
    table("Watched Sources", SOURCE_HEADERS, watchedRows),
    "",
    table("Archived portfolio", ["ID", "Source", "Archive reason", "Boundary"], archiveRows),
    "",
    table("Registered Tools", TOOL_HEADERS, toolRows),
    ""
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
  return { catalog, tools, registry: { ...registry, archiveIndex: parseArchiveIndex(archiveText) } };
}
