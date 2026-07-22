#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  parseMarkdownTableSection,
  resolveUtilizationClassification,
  validateSourceUtilizationReport
} from "./ai-toolkit/kernel/source-utilization-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_UTILIZATION_REPORT = "docs/SOURCE_UTILIZATION_MATRIX.md";
const REQUIRED_CONTEXT_METHODS = [
  "orchestration.project-context-preflight",
  "orchestration.changed-file-neighborhood-selection",
  "orchestration.compact-agent-context-pack",
  "orchestration.project-map-staleness-check"
];
const REQUIRED_TOKEN_EVALS = [
  "large-task-compact-context-pack",
  "changed-file-neighborhood-no-whole-repo-dump",
  "private-overlay-exclusion-required",
  "project-map-staleness-check-required",
  "project-context-preflight-no-loop-agents"
];
const RETIRED_PORTFOLIO_SOURCE_IDS = [
  "agency-agents",
  "bencium-marketplace",
  "karpathy-inspired-skills",
  "voltagent-awesome-agent-skills",
  "skills-sh"
];
const TOOL_SHARED_SOURCE_IDS = [
  "typescript", "typescript-eslint", "eslint-plugin-react-hooks", "biome", "oxlint", "knip",
  "react-doctor", "vitest", "testing-library", "axe-playwright", "lighthouse-ci", "codeql",
  "semgrep", "gitleaks", "trufflehog", "osv-scanner", "dependabot", "renovate", "socket",
  "trivy", "checkov", "owasp-zap-baseline", "actionlint", "zizmor", "harden-runner",
  "reviewdog", "github-gh", "open-design", "openssf-scorecard", "dependency-cruiser",
  "eslint-plugin-boundaries", "madge", "jscpd", "eslint", "coderabbit"
];

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.resolve(ROOT, relativePath), "utf8"));
}

async function readText(relativePath) {
  return readFile(path.resolve(ROOT, relativePath), "utf8");
}

function tableHasId(text, id) {
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\|\\s*${escaped}\\s*\\|`, "m").test(text);
}

const UTILIZATION_HEADERS = [
  "ID",
  "Source",
  "Classification",
  "Recommendation",
  "Current value path",
  "Next extraction",
  "Forbidden boundary"
];

function utilizationReport({ watchedRows = [], toolRows = [] } = {}) {
  const table = (rows, label, headers) => [
    `## ${label}`,
    "",
    `| ${headers.join(" | ")} |`,
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows
  ].join("\n");

  return [
    "# Source Utilization Matrix",
    "",
    table(watchedRows, "Watched Sources", UTILIZATION_HEADERS),
    "",
    table(toolRows, "Registered Tools", [
      "ID",
      "Tool",
      ...UTILIZATION_HEADERS.slice(2)
    ])
  ].join("\n");
}

const validWatchedRow = (id) =>
  `| ${id} | Source | active-read-only | Do later | docs/SOURCE_UTILIZATION_MATRIX.md | Keep detected-only | No automatic install |`;
const validToolRow = (id) =>
  `| ${id} | Tool | active-read-only | Do later | registries/tools.registry.json | Keep detected-only | No automatic install |`;

test("watched source rows cannot be satisfied by Registered Tools rows", () => {
  const markdown = utilizationReport({ toolRows: [validToolRow("shared-id")] });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["shared-id"],
      toolIds: ["shared-id"],
      repositoryRoot: ROOT
    }),
    /missing watched source row: shared-id/
  );
});

test("registered tool rows cannot be satisfied by Watched Sources rows", () => {
  const markdown = utilizationReport({ watchedRows: [validWatchedRow("shared-id")] });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["shared-id"],
      toolIds: ["shared-id"],
      repositoryRoot: ROOT
    }),
    /missing registered tool row: shared-id/
  );
});

test("governed utilization sections reject duplicate IDs", () => {
  const markdown = utilizationReport({
    watchedRows: [validWatchedRow("duplicate-id"), validWatchedRow("duplicate-id")]
  });

  assert.throws(
    () => parseMarkdownTableSection(markdown, "Watched Sources", UTILIZATION_HEADERS),
    /duplicate ID in governed section: Watched Sources: duplicate-id/
  );
});

test("governed utilization sections reject malformed rows", () => {
  const markdown = utilizationReport({
    watchedRows: ["| malformed | Source | active-read-only | Do later | docs/SOURCE_UTILIZATION_MATRIX.md | Keep detected-only |"]
  });

  assert.throws(
    () => parseMarkdownTableSection(markdown, "Watched Sources", UTILIZATION_HEADERS),
    /malformed row in governed section: Watched Sources/
  );
});

test("source utilization rows reject invalid classifications", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | ungoverned | Do later | docs/SOURCE_UTILIZATION_MATRIX.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /invalid watched source classification: ungoverned/
  );
});

test("source utilization validates every governed row", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| unregistered-source | Source | ungoverned | Do later | docs/SOURCE_UTILIZATION_MATRIX.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: [],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /invalid watched source classification: ungoverned/
  );
});

test("source utilization rows reject unsafe repository-relative paths", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | active-read-only | Do later | ../../outside.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /unsafe repository-relative path: \.\.\/\.\.\/outside\.md/
  );
});

test("source utilization rows reject Windows absolute paths", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | active-read-only | Do later | C:\\secrets\\outside.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /unsafe absolute path: C:\\secrets\\outside\.md/
  );
});

test("source utilization rows reject POSIX absolute paths", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | active-read-only | Do later | /secrets/outside.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /unsafe absolute path: \/secrets\/outside\.md/
  );
});

test("source utilization rows reject Windows backslash traversal", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | active-read-only | Do later | ..\\..\\outside.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /unsafe repository-relative path/
  );
});

test("source utilization rows reject Windows rooted absolute paths", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | active-read-only | Do later | \\secrets\\outside.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /unsafe absolute path/
  );
});

test("source utilization rows reject UNC paths", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| source-id | Source | active-read-only | Do later | \\\\server\\share\\outside.md | Keep detected-only | No automatic install |"
    ]
  });

  assert.throws(
    () => validateSourceUtilizationReport({
      markdown,
      sourceIds: ["source-id"],
      toolIds: [],
      repositoryRoot: ROOT
    }),
    /unsafe absolute path/
  );
});

test("required tool classifications resolve from Registered Tools for shared IDs", () => {
  const markdown = utilizationReport({
    watchedRows: [
      "| gsd-core | GSD Core | active-reference | Do later | docs/SOURCE_UTILIZATION_MATRIX.md | Keep detected-only | No automatic install |"
    ],
    toolRows: [
      "| gsd-core | GSD Core | active-profile-route | Do later | registries/tools.registry.json | Keep detected-only | No automatic install |"
    ]
  });
  const utilization = validateSourceUtilizationReport({
    markdown,
    sourceIds: ["gsd-core"],
    toolIds: ["gsd-core"],
    repositoryRoot: ROOT
  });

  assert.equal(
    resolveUtilizationClassification({
      id: "gsd-core",
      kind: "tool",
      watchedById: utilization.watchedById,
      toolsById: utilization.toolsById
    }),
    "active-profile-route"
  );
});

test("tool-shared sources retain distinct pending review rows", async () => {
  const report = await readText(SOURCE_UTILIZATION_REPORT);
  const watchedRows = parseMarkdownTableSection(report, "Watched Sources", UTILIZATION_HEADERS);
  const watchedById = new Map(watchedRows.map((row) => [row.ID, row]));

  for (const sourceId of TOOL_SHARED_SOURCE_IDS) {
    const row = watchedById.get(sourceId);
    assert.ok(row, `missing watched source row: ${sourceId}`);
    assert.match(row["Next extraction"], /pending.*(?:review|extract)|(?:review|extract).*pending/i);
  }
});

test("exact watched source inventory rejects a well-formed extra row", () => {
  const markdown = utilizationReport({
    watchedRows: [validWatchedRow("catalog-source"), validWatchedRow("extra-source")]
  });
  const watchedRows = parseMarkdownTableSection(markdown, "Watched Sources", UTILIZATION_HEADERS);

  assert.throws(
    () => assert.deepEqual(watchedRows.map((row) => row.ID).sort(), ["catalog-source"]),
    assert.AssertionError
  );
});

test("source utilization report classifies every watched source and registered tool", async () => {
  const report = await readText(SOURCE_UTILIZATION_REPORT);
  const watchlist = await readJson("sources/source-watchlist.json");
  const tools = await readJson("registries/tools.registry.json");

  assert.match(report, /# Source Utilization Matrix/);
  assert.match(report, /active-method/);
  assert.match(report, /active-read-only/);
  assert.match(report, /active-reference/);
  assert.match(report, /planned-extraction/);
  assert.match(report, /reference-only-with-reason/);
  assert.match(report, /Reject \/ not aligned/);

  const utilization = validateSourceUtilizationReport({
    markdown: report,
    sourceIds: watchlist.sources.map((source) => source.id),
    toolIds: tools.tools.map((tool) => tool.id),
    repositoryRoot: ROOT
  });
  assert.deepEqual(
    [...utilization.watchedById.keys()].sort(),
    watchlist.sources.map((source) => source.id).sort()
  );

  assert.equal(
    utilization.watchedById.has("ui-ux-pro-max-audit"),
    false,
    "internal audit artifact must not be misclassified as a watched source"
  );
  assert.match(report, /^## Internal Audit Artifacts$/m);
  assert.match(report, /^\| ui-ux-pro-max-audit \|/m);
  assert.match(report, /docs\/UI_UX_PRO_MAX_AUDIT\.md/);
  assert.equal(utilization.watchedById.get("matt-pocock-skills")?.Classification, "active-method");
  assert.equal(utilization.watchedById.get("matt-pocock-skills")?.Recommendation, "Do later");
  assert.doesNotMatch(report, /\|\s*matt-pocock-skills\s*\|[^\n]*Refresh reviewed commit/);
});

test("retired portfolio sources appear only in the archived portfolio section", async () => {
  const report = await readText(SOURCE_UTILIZATION_REPORT);
  const archivedPortfolio = report.split(/^## Archived portfolio$/m)[1];
  assert.ok(archivedPortfolio, "missing archived portfolio section");
  const activePortfolio = report.split(/^## Archived portfolio$/m)[0];

  for (const sourceId of RETIRED_PORTFOLIO_SOURCE_IDS) {
    assert.equal(tableHasId(activePortfolio, sourceId), false, `retired source remains watched: ${sourceId}`);
    assert.equal(tableHasId(archivedPortfolio, sourceId), true, `missing archived source: ${sourceId}`);
  }
  assert.match(archivedPortfolio, /not review receipts, approvals, freshness proof, or runtime authority/i);
});

test("project context preflight methods are registered and backed by method files", async () => {
  const registry = await readJson("registries/methods.registry.json");
  const ids = new Set(registry.methods.map((method) => method.id));

  for (const methodId of REQUIRED_CONTEXT_METHODS) {
    assert.equal(ids.has(methodId), true, `missing method registry entry: ${methodId}`);
    const method = registry.methods.find((entry) => entry.id === methodId);
    assert.ok(method.methodPath, `missing methodPath for ${methodId}`);
    const text = await readText(method.methodPath);
    assert.match(text, /^---\r?\n/);
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || "";
    const sourceRefLine = frontmatter.match(/^\s*sourceRef:\s*(.+)$/m)?.[1] || "";
    assert.ok(sourceRefLine.length > 0, `missing sourceRef value for ${methodId}`);
    assert.match(sourceRefLine, /\b(aider-repo-map|openai-prompt-caching|toolkit-authored)\b/);
    assert.match(text, /secret|private-overlay|whole-repo|MCP|global config/i);
    assert.match(text, /Passive Visibility/);
    assert.match(text, /passive governance guidance only/);
    assert.match(text, /does not authorize tool activation/);
  }
});

test("compact agent context pack defines token modes and context evidence labels", async () => {
  const text = await readText("methods/orchestration/compact-agent-context-pack.md");

  for (const required of [
    "omitted context and reason",
    "`concise`",
    "`standard`",
    "`detailed`",
    "`project-map`",
    "`manual/static`",
    "`tool-generated`"
  ]) {
    assert.match(text, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("token efficiency evals cover compact context governance", async () => {
  const evals = await readJson("evals/token-efficiency/low-risk-concise-routing-evals.json");
  const ids = new Set((evals.cases || []).map((entry) => entry.id));

  for (const evalId of REQUIRED_TOKEN_EVALS) {
    assert.equal(ids.has(evalId), true, `missing token governance eval: ${evalId}`);
  }
});
