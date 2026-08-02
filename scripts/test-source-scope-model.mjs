import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contractUrl = pathToFileURL(
  path.join(ROOT, "scripts", "ai-toolkit", "kernel", "source-catalog-contract.mjs")
).href;
const migrationUrl = pathToFileURL(path.join(ROOT, "scripts", "migrate-source-catalog-v2.mjs")).href;
const catalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
const domainPacks = JSON.parse(readFileSync(path.join(ROOT, "registries", "domain-packs.registry.json"), "utf8"));
const tools = JSON.parse(readFileSync(path.join(ROOT, "registries", "tools.registry.json"), "utf8"));
const NOW = "2026-07-20T00:00:00.000Z";
const CORE_SOURCE_IDS = [
  "nist-ai-rmf-genai",
  "nist-ssdf",
  "nist-ssdf-ai",
  "openssf-ai-code-assistant-instructions",
  "owasp-agentic-applications",
  "owasp-asvs",
  "owasp-llmsvs",
  "slsa-v1-2"
];

function migratedCatalog() {
  return structuredClone(catalog);
}

test("canonical dependency graph deterministically classifies all retained sources", async () => {
  const { deriveSourceScopes, SOURCE_CATALOG_SCHEMA_VERSION, SOURCE_SCOPES } = await import(contractUrl);
  const upgraded = migratedCatalog();
  upgraded.schemaVersion = SOURCE_CATALOG_SCHEMA_VERSION;
  for (const source of upgraded.sources) source.scope = "community-reference";

  const scopes = deriveSourceScopes({
    catalog: upgraded,
    domainPacksRegistry: domainPacks,
    toolsRegistry: tools,
    methodSourceIds: []
  });

  assert.equal(upgraded.sources.length, 80);
  assert.equal(scopes.size, 80);
  assert.equal([...scopes.values()].every((scope) => SOURCE_SCOPES.includes(scope)), true);
  assert.deepEqual(
    CORE_SOURCE_IDS.map((id) => scopes.get(id)),
    Array(CORE_SOURCE_IDS.length).fill("core")
  );
  assert.equal(scopes.get("apple-accessibility"), "platform-preview");
  assert.equal(scopes.get("actionlint"), "optional-tool");
  assert.equal(scopes.get("addyosmani-web-quality-skills"), "community-reference");
});

test("scope precedence prefers historical then supported gates then preview gates before tool edges", async () => {
  const { deriveSourceScopes, SOURCE_CATALOG_SCHEMA_VERSION } = await import(contractUrl);
  const upgraded = migratedCatalog();
  upgraded.schemaVersion = SOURCE_CATALOG_SCHEMA_VERSION;
  for (const source of upgraded.sources) source.scope = "community-reference";
  const nist = upgraded.sources.find((source) => source.id === "nist-ssdf");
  nist.dependentResourceIds = ["eslint"];
  const historical = upgraded.sources.find((source) => source.id === "addyosmani-web-quality-skills");
  historical.lifecycle = "historical-reference";
  historical.authority = "historical";
  historical.runtimePosture = "forbidden-runtime";
  historical.dependentResourceIds = [];

  const scopes = deriveSourceScopes({
    catalog: upgraded,
    domainPacksRegistry: domainPacks,
    toolsRegistry: tools,
    methodSourceIds: []
  });

  assert.equal(scopes.get("owasp-asvs"), "core", "supported use must win preview use");
  assert.equal(scopes.get("nist-ssdf"), "core", "gate use must win a tool edge");
  assert.equal(scopes.get(historical.id), "historical");
});

test("generic and graph-aware validation fail closed for scope and dependency drift", async () => {
  const {
    SOURCE_CATALOG_SCHEMA_VERSION,
    validateSourceCatalog,
    validateSourceCatalogGraph
  } = await import(contractUrl);
  const upgraded = migratedCatalog();
  upgraded.schemaVersion = SOURCE_CATALOG_SCHEMA_VERSION;
  for (const source of upgraded.sources) source.scope = "community-reference";

  const invalidScope = structuredClone(upgraded);
  invalidScope.sources[0].scope = "priority";
  assert.throws(() => validateSourceCatalog(invalidScope, { now: NOW }), /scope/i);

  const wrongCoreScope = structuredClone(upgraded);
  assert.throws(
    () => validateSourceCatalogGraph(wrongCoreScope, {
      domainPacksRegistry: domainPacks,
      toolsRegistry: tools,
      methodSourceIds: []
    }),
    /scope.*drift/i
  );

  const danglingResource = structuredClone(upgraded);
  danglingResource.sources.find((source) => source.id === "actionlint").dependentResourceIds = ["missing-tool"];
  assert.throws(
    () => validateSourceCatalogGraph(danglingResource, {
      domainPacksRegistry: domainPacks,
      toolsRegistry: tools,
      methodSourceIds: []
    }),
    /unknown.*resource|resource.*unknown/i
  );

  const danglingGateSource = structuredClone(domainPacks);
  danglingGateSource.packs.find((pack) => pack.id === "enterprise-core").gates[0].authoritativeSourceRefs[0].sourceId = "missing-source";
  assert.throws(
    () => validateSourceCatalogGraph(upgraded, {
      domainPacksRegistry: danglingGateSource,
      toolsRegistry: tools,
      methodSourceIds: []
    }),
    /unknown.*source|source.*unknown/i
  );
});

test("v2.0 migration upgrades state to the current schema without restoring retired source identities", async () => {
  const { upgradeSourceCatalogToV21 } = await import(migrationUrl);
  const legacy = migratedCatalog();
  legacy.schemaVersion = "2.0.0";
  for (const source of legacy.sources) delete source.scope;
  const retained = legacy.sources.find((source) => source.id === "actionlint");
  const review = structuredClone(retained.review);
  const monitor = structuredClone(retained.monitor);

  const upgraded = upgradeSourceCatalogToV21(legacy, {
    domainPacksRegistry: domainPacks,
    toolsRegistry: tools,
    methodSourceIds: []
  });

  assert.equal(upgraded instanceof Promise, false);
  assert.equal(upgraded.schemaVersion, "2.2.0");
  assert.deepEqual(upgraded.sources.find((source) => source.id === "actionlint").review, review);
  assert.deepEqual(upgraded.sources.find((source) => source.id === "actionlint").monitor, monitor);
  assert.equal(upgraded.sources.some((source) => source.id === "skills-sh"), false);
  assert.equal(new Set(upgraded.sources.map((source) => source.scope)).size > 1, true);
});

test("v2.1 migration synchronously upgrades to the current schema without changing governed source state", async () => {
  const { upgradeSourceCatalogV21ToV22 } = await import(migrationUrl);
  const { validateSourceCatalogGraph } = await import(contractUrl);
  const predecessor = migratedCatalog();
  predecessor.schemaVersion = "2.1.0";
  const retained = predecessor.sources.find((source) => source.id === "actionlint");
  const review = structuredClone(retained.review);
  const monitor = structuredClone(retained.monitor);
  const identityKey = retained.identityKey;
  const runtimePosture = retained.runtimePosture;
  const currentNow = new Date(Math.max(...predecessor.sources.map((source) => Date.parse(source.monitor.checkedAt))) + 1_000).toISOString();

  const upgraded = upgradeSourceCatalogV21ToV22(predecessor, {
    domainPacksRegistry: domainPacks,
    toolsRegistry: tools,
    methodSourceIds: [],
    now: currentNow
  });

  assert.equal(upgraded instanceof Promise, false);
  assert.equal(upgraded.schemaVersion, "2.2.0");
  const upgradedRetained = upgraded.sources.find((source) => source.id === "actionlint");
  assert.deepEqual(upgradedRetained.review, review);
  assert.deepEqual(upgradedRetained.monitor, monitor);
  assert.equal(upgradedRetained.identityKey, identityKey);
  assert.equal(upgradedRetained.runtimePosture, runtimePosture);
  assert.doesNotThrow(() => validateSourceCatalogGraph(upgraded, {
    domainPacksRegistry: domainPacks,
    toolsRegistry: tools,
    methodSourceIds: [],
    now: currentNow
  }));
});
