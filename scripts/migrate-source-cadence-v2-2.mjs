#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { runManagedDirectoryTransaction } from "../install/safe-filesystem.mjs";
import {
  SOURCE_BEHAVIOR_CADENCE,
  validateSourceCatalog
} from "./ai-toolkit/kernel/source-catalog-contract.mjs";

const ROOT = process.cwd();
const CATALOG_PATH = "sources/source-watchlist.json";
const VERSIONED_STANDARD_IDS = new Set([
  "nist-ssdf",
  "nist-ssdf-ai",
  "nist-ai-rmf-genai",
  "owasp-asvs",
  "owasp-llmsvs",
  "owasp-masvs",
  "slsa-v1-2",
  "w3c-wcag-22"
]);

const EVENT_TRIGGERS_BY_BEHAVIOR = Object.freeze({
  "versioned-standard": ["new-edition", "errata", "withdrawal"],
  "living-official-guidance": ["platform-release", "deprecation", "withdrawal"],
  "security-runtime-source": ["security-advisory", "deprecation", "withdrawal"],
  "active-tool-or-skill": [
    "major-release",
    "installer-change",
    "license-change",
    "maintainer-change",
    "dependent-gate-change",
    "dependent-eval-failed",
    "deprecation"
  ],
  "general-method-reference": ["major-release", "license-change", "maintainer-change", "withdrawal"],
  historical: ["withdrawal"]
});

function fail(message) {
  throw new Error(`Source cadence migration: ${message}`);
}

function deriveSourceBehavior(source) {
  if (source.lifecycle === "historical-reference") return "historical";
  if (VERSIONED_STANDARD_IDS.has(source.id)) return "versioned-standard";
  if (source.sourceType === "manual-reviewed-doc") return "living-official-guidance";
  if (source.dependentResourceIds.length > 0) return "active-tool-or-skill";
  if (source.freshnessClass === "security-runtime") return "security-runtime-source";
  return "general-method-reference";
}

function withCadence(source) {
  const sourceBehavior = deriveSourceBehavior(source);
  const cadence = SOURCE_BEHAVIOR_CADENCE[sourceBehavior];
  return {
    ...source,
    sourceBehavior,
    monitorIntervalDays: cadence.monitor,
    deepReviewIntervalDays: cadence.deep,
    eventTriggers: EVENT_TRIGGERS_BY_BEHAVIOR[sourceBehavior]
  };
}

function migrateCatalog(catalog) {
  if (!Array.isArray(catalog.sources)) fail("canonical watchlist sources must be an array");
  const sources = catalog.sources.map(withCadence);
  if (sources.length !== 80) fail(`expected 80 canonical sources, received ${sources.length}`);
  if (new Set(sources.map((source) => source.id)).size !== sources.length) {
    fail("canonical watchlist contains duplicate source IDs");
  }
  return {
    ...catalog,
    schemaVersion: "2.2.0",
    sources
  };
}

function parseArgs(argv) {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === "--check")) return { mode: "check" };
  if (argv.length === 1 && argv[0] === "--confirm-write") return { mode: "confirm-write" };
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return { mode: "help" };
  fail("usage: node scripts/migrate-source-cadence-v2-2.mjs [--check|--confirm-write]");
}

function statusFor(catalog, changed) {
  if (!changed && catalog.schemaVersion === "2.2.0") return "already-v2.2";
  return "migrated-v2.2";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "help") {
    console.log("Usage: node scripts/migrate-source-cadence-v2-2.mjs [--check|--confirm-write]");
    console.log("Default is --check; the migration reads only the canonical watchlist and never changes runtime posture.");
    return;
  }

  const catalogPath = path.join(ROOT, CATALOG_PATH);
  const originalText = await readFile(catalogPath, "utf8");
  const catalog = JSON.parse(originalText);
  const migrated = migrateCatalog(catalog);
  const migratedText = `${JSON.stringify(migrated, null, 2)}\n`;
  const changed = originalText !== migratedText;
  validateSourceCatalog(migrated, { now: new Date().toISOString() });

  if (args.mode === "confirm-write" && changed) {
    runManagedDirectoryTransaction({
      repositoryRoot: ROOT,
      managedRoot: path.join(ROOT, "sources"),
      label: "source cadence migration",
      prepare(staging) {
        if (staging.readFile("source-watchlist.json", "utf8") !== originalText) {
          fail("canonical watchlist changed before transaction staging; retry the migration");
        }
        staging.writeFile("source-watchlist.json", migratedText, "utf8", "canonical source cadence migration");
      },
      beforeBackup() {
        if (readFileSync(catalogPath, "utf8") !== originalText) {
          fail("canonical watchlist changed before atomic backup; retry the migration");
        }
      },
      validate(staging) {
        validateSourceCatalog(JSON.parse(staging.readFile("source-watchlist.json", "utf8")), {
          now: new Date().toISOString()
        });
      }
    });
  }

  console.log(JSON.stringify({
    mode: args.mode,
    status: statusFor(catalog, changed),
    changed,
    sourceCount: migrated.sources.length,
    schemaVersion: migrated.schemaVersion,
    classifications: migrated.sources.map((source) => ({
      id: source.id,
      sourceBehavior: source.sourceBehavior
    }))
  }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main().catch((error) => {
    console.error(`FAIL migrate-source-cadence-v2-2: ${error.message}`);
    process.exitCode = 1;
  });
}
