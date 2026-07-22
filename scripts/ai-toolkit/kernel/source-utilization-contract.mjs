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

const REPOSITORY_PATH_TOKEN = /(?:^|[\s`(])((?:\.\.?\/|(?:agents|checklists|compiled-agents|docs|evals|examples|install|methods|profiles|registries|scripts|skills|sources|templates)\/)[A-Za-z0-9_./*-]+)/g;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cells(line) {
  return line.trim().slice(1, -1).split("|").map((cell) => cell.trim());
}

function sectionKindLabel(kind) {
  if (kind === "source") return "watched source";
  if (kind === "tool") return "registered tool";
  throw new Error(`unknown utilization row kind: ${kind}`);
}

function repositoryPathTokens(value) {
  return [...value.matchAll(REPOSITORY_PATH_TOKEN)]
    .map((match) => match[1].replace(/\/(?:\*)?$/, ""));
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

  const headers = cells(tableLines[0]);
  if (JSON.stringify(headers) !== JSON.stringify(expectedHeaders)) {
    throw new Error(`unexpected headers in governed section: ${heading}`);
  }

  const rows = tableLines.slice(2).map(cells);
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
      try {
        assertPathContained(repositoryRoot, path.resolve(repositoryRoot, token), `${label} repository-relative path`);
      } catch {
        throw new Error(`unsafe repository-relative path: ${token}`);
      }
    }
  }
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
