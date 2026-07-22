import path from "node:path";

import { assertPathContained } from "../../../install/safe-filesystem.mjs";

const CLASSIFICATIONS = new Set([
  "active-method",
  "active-skill-rule",
  "active-profile-route",
  "active-reference",
  "active-read-only",
  "planned-extraction",
  "reference-only-with-reason",
  "archive-candidate",
  "remove-candidate",
  "reject"
]);

const RECOMMENDATIONS = new Set([
  "Must do next",
  "Do later",
  "Needs owner decision",
  "Reject / not aligned"
]);

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

const REPOSITORY_PATH_ROOTS = "agents|checklists|compiled-agents|docs|evals|examples|install|methods|profiles|registries|scripts|skills|sources|templates";
const PATH_TOKEN = new RegExp(
  "(?:^|[\\s`(])((?:[A-Za-z]:[\\\\/]|[\\\\/]|\\.{1,2}[\\\\/]|(?:" + REPOSITORY_PATH_ROOTS + ")[\\\\/])[^\\s`|,;()]+)",
  "g"
);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function encodeMarkdownTableCell(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n");
}

function decodeMarkdownTableCell(value) {
  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    if (current !== "\\") {
      decoded += current;
      continue;
    }
    const escaped = value[index + 1];
    if (escaped === undefined) throw new Error("malformed escaped table cell");
    if (escaped === "n") decoded += "\n";
    else if (escaped === "\\" || escaped === "|") decoded += escaped;
    else throw new Error("malformed escaped table cell");
    index += 1;
  }
  return decoded.trim();
}

export function splitMarkdownTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) throw new Error("malformed markdown table row");
  const values = [];
  let current = "";
  let escaped = false;
  for (let index = 1; index < trimmed.length - 1; index += 1) {
    const character = trimmed[index];
    if (escaped) {
      current += `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "|") {
      values.push(decodeMarkdownTableCell(current));
      current = "";
      continue;
    }
    current += character;
  }
  if (escaped) throw new Error("malformed escaped table cell");
  values.push(decodeMarkdownTableCell(current));
  return values;
}

function sectionKindLabel(kind) {
  if (kind === "source") return "watched source";
  if (kind === "tool") return "registered tool";
  throw new Error(`unknown utilization row kind: ${kind}`);
}

function repositoryPathTokens(value) {
  return [...value.matchAll(PATH_TOKEN)]
    .map((match) => match[1].replace(/[\\/](?:\*)?$/, ""));
}

function validateRepositoryPathToken(token, repositoryRoot, label) {
  const portableToken = token.replace(/\\/g, "/");
  if (path.win32.isAbsolute(token) || path.posix.isAbsolute(portableToken)) {
    throw new Error(`unsafe absolute path: ${token}`);
  }

  try {
    assertPathContained(repositoryRoot, path.resolve(repositoryRoot, portableToken), `${label} repository-relative path`);
  } catch {
    throw new Error(`unsafe repository-relative path: ${token}`);
  }
}

export function parseMarkdownTableSection(markdown, heading, expectedHeaders) {
  const headingPattern = new RegExp(`^## ${escapeRegExp(heading)}\\s*$`, "gm");
  const headings = [...markdown.matchAll(headingPattern)];
  if (headings.length === 0) throw new Error(`missing governed section: ${heading}`);
  if (headings.length > 1) throw new Error(`duplicate governed section: ${heading}`);

  const remainder = markdown.slice(headings[0].index + headings[0][0].length);
  const nextHeading = remainder.search(/^## /m);
  const section = nextHeading >= 0 ? remainder.slice(0, nextHeading) : remainder;
  const tableLines = section.split(/\r?\n/).filter((line) => /^\|.*\|$/.test(line.trim()));
  if (tableLines.length < 2) throw new Error(`missing table in governed section: ${heading}`);

  const headers = splitMarkdownTableRow(tableLines[0]);
  if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
    throw new Error(`unexpected headers in governed section: ${heading}`);
  }

  const rows = tableLines.slice(2).map(splitMarkdownTableRow);
  if (rows.some((row) => row.length !== headers.length)) {
    throw new Error(`malformed row in governed section: ${heading}`);
  }

  const ids = new Set();
  for (const row of rows) {
    const id = row[0];
    if (!id || ids.has(id)) throw new Error(`duplicate ID in governed section: ${heading}: ${id}`);
    ids.add(id);
  }

  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

export function validateUtilizationRow(row, { kind, repositoryRoot }) {
  const label = sectionKindLabel(kind);
  const classification = row.Classification;
  const recommendation = row.Recommendation;
  if (!CLASSIFICATIONS.has(classification)) {
    throw new Error(`invalid ${label} classification: ${classification}`);
  }
  if (!RECOMMENDATIONS.has(recommendation)) {
    throw new Error(`invalid ${label} recommendation: ${recommendation}`);
  }

  for (const field of ["Current value path", "Next extraction", "Forbidden boundary"]) {
    const value = row[field];
    if (!value) throw new Error(`missing ${label} ${field.toLowerCase()}`);
    for (const token of repositoryPathTokens(value)) {
      validateRepositoryPathToken(token, repositoryRoot, label);
    }
  }
}

export function resolveUtilizationClassification({ id, kind, watchedById, toolsById }) {
  const label = sectionKindLabel(kind);
  const rows = kind === "source" ? watchedById : toolsById;
  const row = rows.get(id);
  if (!row) throw new Error(`missing ${label} row: ${id}`);
  return row.Classification;
}

export function validateSourceUtilizationReport({ markdown, sourceIds, toolIds, repositoryRoot }) {
  const watchedRows = parseMarkdownTableSection(markdown, "Watched Sources", SOURCE_HEADERS);
  const toolRows = parseMarkdownTableSection(markdown, "Registered Tools", TOOL_HEADERS);
  const watchedById = new Map(watchedRows.map((row) => [row.ID, row]));
  const toolsById = new Map(toolRows.map((row) => [row.ID, row]));

  for (const row of watchedRows) {
    validateUtilizationRow(row, { kind: "source", repositoryRoot });
  }
  for (const row of toolRows) {
    validateUtilizationRow(row, { kind: "tool", repositoryRoot });
  }

  for (const sourceId of sourceIds) {
    const row = watchedById.get(sourceId);
    if (!row) throw new Error(`missing watched source row: ${sourceId}`);
  }
  for (const toolId of toolIds) {
    const row = toolsById.get(toolId);
    if (!row) throw new Error(`missing registered tool row: ${toolId}`);
  }

  return { watchedRows, toolRows, watchedById, toolsById };
}
