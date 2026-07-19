#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { ManagedFilesystem } from "../install/safe-filesystem.mjs";
import { TOOL_ENTRIES } from "./ai-toolkit/embedded-data.mjs";
import { FRESHNESS_WINDOWS_DAYS, validateSourceCatalog } from "./ai-toolkit/source-governance.mjs";

const ROOT = process.cwd();
const CATALOG_PATH = "sources/source-watchlist.json";
const MIGRATION_TIME = "2026-07-17T23:59:59.999Z";
const LEGACY_RUNTIME_IDS = new Set([
  "anthropic-skills",
  "openai-skills",
  "supabase-agent-skills",
  "trailofbits-skills",
  "microsoft-playwright",
  "nagdy-guard-skills",
  "superpowers",
  "everything-claude-code",
  "ruflo",
  "gitlab-agent-skills",
  "gitlab-agentic-tool-development",
  "openai-codex-behavior-boundaries",
  "gsd-core",
  "repomix"
]);
const COMMUNITY_IDS = new Set([
  "addy-osmani-agent-skills",
  "karpathy-inspired-skills",
  "nagdy-guard-skills",
  "matt-pocock-skills",
  "addyosmani-web-quality-skills",
  "voltagent-awesome-design-md",
  "voltagent-awesome-agent-skills",
  "impeccable",
  "uncodixfy",
  "everything-claude-code",
  "ruflo"
]);

function fail(message) {
  throw new Error(`Source catalog migration: ${message}`);
}

function githubIdentity(owner, repo) {
  return `github:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

function urlIdentity(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.search = "";
  return `url:${parsed.toString().replace(/\/$/, "").toLowerCase()}`;
}

function sourceIdentity(entry) {
  return (entry.sourceType || "github-repo") === "github-repo"
    ? githubIdentity(entry.repoOwner, entry.repoName)
    : urlIdentity(entry.sourceUrl);
}

function failureMonitor(sourceType) {
  if (sourceType === "manual-reviewed-doc") {
    return {
      state: "MANUAL_DUE",
      checkedAt: null,
      observedRevision: null,
      contentDigest: null,
      failureReason: "Manual review is due after schema migration; no current content digest was claimed."
    };
  }
  return {
    state: "CHECK_FAILED",
    checkedAt: null,
    observedRevision: null,
    contentDigest: null,
    failureReason: "No live freshness check was performed during the schema-only migration."
  };
}

function quarantinedReview() {
  return {
    state: "QUARANTINED",
    currentReceipt: null,
    previousReceipt: null,
    receiptDigest: null,
    previousReceiptDigest: null,
    reviewedRevision: null,
    reviewedDigest: null,
    reviewedAt: null,
    expiresAt: null,
    disposition: null
  };
}

function unique(values) {
  return [...new Set(values)];
}

function legacyRuntimePosture(source) {
  if (["gsd-core", "repomix", "microsoft-playwright"].includes(source.id)) return "active-if-detected";
  if (source.reviewDecision?.outcome === "SYNCED_PLUGIN_DELEGATED") return "active-if-detected";
  return "metadata-only";
}

function legacyAuthority(source) {
  if (["voltagent-awesome-agent-skills", "voltagent-awesome-design-md"].includes(source.id)) return "aggregator";
  if (COMMUNITY_IDS.has(source.id)) return "community";
  return "official";
}

function migrateLegacySource(source) {
  const aliases = source.id === "microsoft-playwright" ? ["playwright"] : [];
  const resourceIds = source.id === "microsoft-playwright"
    ? ["playwright"]
    : ["gsd-core", "repomix"].includes(source.id)
      ? [source.id]
      : [];
  const migrated = {
    id: source.id,
    name: source.name,
    sourceType: source.sourceType || "github-repo",
    sourceUrl: source.sourceUrl,
    repoOwner: source.repoOwner,
    repoName: source.repoName,
    defaultBranch: source.defaultBranch,
    lastReviewedCommit: source.lastReviewedCommit ?? null,
    lastReviewedDate: source.lastReviewedDate ?? null,
    sourceRecordPath: source.sourceRecordPath,
    watchedPaths: structuredClone(source.watchedPaths || []),
    licenseConcern: source.licenseConcern,
    reviewPriority: source.reviewPriority,
    reviewDecision: source.reviewDecision ? structuredClone(source.reviewDecision) : undefined,
    watchMode: source.watchMode,
    manualReview: source.manualReview ? structuredClone(source.manualReview) : undefined,
    neverAutoImport: true,
    aliases,
    identityKey: sourceIdentity(source),
    authority: legacyAuthority(source),
    lifecycle: "review-input",
    freshnessClass: LEGACY_RUNTIME_IDS.has(source.id) ? "security-runtime" : "general-methods",
    monitor: failureMonitor(source.sourceType || "github-repo"),
    review: quarantinedReview(),
    runtimePosture: legacyRuntimePosture(source),
    dependentResourceIds: resourceIds,
    affectedArtifacts: [source.sourceRecordPath]
  };
  return Object.fromEntries(Object.entries(migrated).filter(([, value]) => value !== undefined));
}

export function mapToolRuntimePosture(id, status) {
  if (id === "coderabbit") return "owner-approved-install";
  if (["dependabot", "renovate", "harden-runner", "reviewdog"].includes(id)) return "ci-advisory";
  if (["source-only", "reference-only", "research-candidate", "source-review-required"].includes(status)) {
    return "metadata-only";
  }
  if (["deep-approval-required", "default-install"].includes(status)) return "owner-approved-install";
  if ([
    "active-if-detected",
    "baseline-script-if-configured",
    "baseline-script-if-project-configured",
    "conditional",
    "delegated-existing"
  ].includes(status)) {
    return "active-if-detected";
  }
  fail(`unsupported tool status for ${id}: ${status}`);
}

function toolAuthority(id) {
  return id === "open-design" ? "community" : "official";
}

function toolSource(tool) {
  const [id, name, repository, homepage, category, purpose, status] = tool;
  const [repoOwner, repoName] = repository.split("/");
  const sourceRecordPath = `.ai-toolkit/sources/records/${id}.md`;
  return {
    id,
    aliases: [],
    identityKey: githubIdentity(repoOwner, repoName),
    name,
    authority: toolAuthority(id),
    lifecycle: "review-input",
    sourceType: "github-repo",
    sourceUrl: `https://github.com/${repository}`,
    repoOwner,
    repoName,
    defaultBranch: "main",
    lastReviewedCommit: null,
    lastReviewedDate: null,
    sourceRecordPath,
    watchedPaths: [],
    licenseConcern: "unknown-review-required",
    reviewPriority: /security|secret|sast|supply|ci|dependency/i.test(category) ? "High" : "Medium",
    freshnessClass: id === "open-design" ? "general-methods" : "security-runtime",
    monitor: failureMonitor("github-repo"),
    review: quarantinedReview(),
    runtimePosture: mapToolRuntimePosture(id, status),
    dependentResourceIds: [id],
    affectedArtifacts: [sourceRecordPath, "registries/tools.registry.json"],
    purpose,
    homepage,
    neverAutoImport: true
  };
}

const HISTORICAL_SOURCES = [
  {
    id: "agency-agents",
    aliases: [],
    identityKey: "github:msitarzewski/agency-agents",
    name: "Agency Agents",
    authority: "historical",
    lifecycle: "historical-reference",
    sourceType: "github-repo",
    sourceUrl: "https://github.com/msitarzewski/agency-agents",
    repoOwner: "msitarzewski",
    repoName: "agency-agents",
    defaultBranch: "main",
    lastReviewedCommit: "fb65f61d80344a9d768292c228d6cbb30f52c362",
    lastReviewedDate: "2026-06-04",
    sourceRecordPath: "sources/agency-agents.md",
    watchedPaths: [],
    licenseConcern: "clear",
    reviewPriority: "Low",
    freshnessClass: "general-methods",
    monitor: failureMonitor("github-repo"),
    review: quarantinedReview(),
    runtimePosture: "forbidden-runtime",
    dependentResourceIds: [],
    affectedArtifacts: ["sources/agency-agents.md"],
    neverAutoImport: true
  },
  {
    id: "bencium-marketplace",
    aliases: [],
    identityKey: "github:bencium/bencium-marketplace",
    name: "Bencium Marketplace",
    authority: "historical",
    lifecycle: "historical-reference",
    sourceType: "github-repo",
    sourceUrl: "https://github.com/bencium/bencium-marketplace",
    repoOwner: "bencium",
    repoName: "bencium-marketplace",
    defaultBranch: "main",
    lastReviewedCommit: "c6f5a718d43ba5a5d540bf74efbd4dba81400c72",
    lastReviewedDate: "2026-06-03",
    sourceRecordPath: "sources/bencium-marketplace.md",
    watchedPaths: [],
    licenseConcern: "clear",
    reviewPriority: "Low",
    freshnessClass: "general-methods",
    monitor: failureMonitor("github-repo"),
    review: quarantinedReview(),
    runtimePosture: "forbidden-runtime",
    dependentResourceIds: [],
    affectedArtifacts: ["sources/bencium-marketplace.md"],
    neverAutoImport: true
  },
  {
    id: "skills-sh",
    aliases: [],
    identityKey: "url:https://skills.sh",
    name: "skills.sh",
    authority: "historical",
    lifecycle: "historical-reference",
    sourceType: "manual-reviewed-doc",
    sourceUrl: "https://skills.sh/",
    watchMode: "manual-reviewed-doc",
    manualReview: {
      publisher: "skills.sh",
      cadence: "90 days",
      reason: "Dynamic discovery index without an immutable repository revision.",
      forbiddenClaims: ["installation approval", "runtime activation", "immutable source freshness"]
    },
    lastReviewedCommit: null,
    lastReviewedDate: "2026-05-15",
    sourceRecordPath: "sources/skills-sh.md",
    watchedPaths: [],
    licenseConcern: "license-unclear",
    reviewPriority: "Low",
    freshnessClass: "general-methods",
    monitor: failureMonitor("manual-reviewed-doc"),
    review: quarantinedReview(),
    runtimePosture: "forbidden-runtime",
    dependentResourceIds: [],
    affectedArtifacts: ["sources/skills-sh.md"],
    neverAutoImport: true
  }
];

const AUTHORITATIVE_MANUAL_SOURCE_DEFINITIONS = [
  ["android-accessibility", "Android Accessibility", "https://developer.android.com/guide/topics/ui/accessibility/testing", "Google Android", "platform-standards", true],
  ["android-core-app-quality", "Android Core App Quality", "https://developer.android.com/develop/adaptive-apps/quality-guidelines/core-app-quality", "Google Android", "platform-standards", true],
  ["apple-accessibility", "Apple Accessibility", "https://developer.apple.com/design/human-interface-guidelines/accessibility", "Apple", "platform-standards", true],
  ["apple-human-interface-guidelines", "Apple Human Interface Guidelines", "https://developer.apple.com/design/human-interface-guidelines/", "Apple", "platform-standards", true],
  ["apple-privacy-manifests", "Apple Privacy Manifests", "https://developer.apple.com/documentation/bundleresources/privacy-manifest-files", "Apple", "security-runtime", true],
  ["electron-security-guidance", "Electron Security Guidance", "https://www.electronjs.org/docs/latest/tutorial/security", "Electron", "security-runtime", true],
  ["expo-documentation", "Expo Documentation", "https://docs.expo.dev/", "Expo", "platform-standards", true],
  ["microsoft-windows-accessibility", "Microsoft Windows Accessibility", "https://learn.microsoft.com/en-us/windows/apps/design/accessibility/", "Microsoft", "platform-standards", true],
  ["microsoft-windows-app-guidance", "Microsoft Windows App Guidance", "https://learn.microsoft.com/en-us/windows/apps/get-started/best-practices", "Microsoft", "platform-standards", true],
  ["nist-ssdf", "NIST Secure Software Development Framework", "https://csrc.nist.gov/pubs/sp/800/218/final", "NIST", "security-runtime", true],
  ["owasp-asvs", "OWASP Application Security Verification Standard", "https://owasp.org/www-project-application-security-verification-standard/", "OWASP", "security-runtime", true],
  ["owasp-masvs", "OWASP Mobile Application Security Verification Standard", "https://mas.owasp.org/MASVS/", "OWASP", "security-runtime", true],
  ["tauri-security-guidance", "Tauri Security Guidance", "https://v2.tauri.app/security/", "Tauri", "security-runtime", true],
  ["w3c-wcag-22", "W3C Web Content Accessibility Guidelines 2.2", "https://www.w3.org/TR/WCAG22/", "W3C", "platform-standards", true],
  ["openai-codex-guidance", "OpenAI Codex Agent Guidance", "https://learn.chatgpt.com/docs/agent-configuration/agents-md", "OpenAI", "security-runtime", false],
  ["anthropic-claude-code-subagents", "Anthropic Claude Code Subagent Guidance", "https://code.claude.com/docs/en/sub-agents", "Anthropic", "security-runtime", false]
];

function authoritativeManualSource([id, name, sourceUrl, publisher, freshnessClass, domainGateSource]) {
  const sourceRecordPath = `sources/${id}.md`;
  const affectedArtifacts = [sourceRecordPath];
  if (domainGateSource) affectedArtifacts.push("registries/domain-packs.registry.json");
  if (id === "openai-codex-guidance") affectedArtifacts.push("scripts/ai-toolkit/kernel/codex-adapter.mjs");
  if (id === "anthropic-claude-code-subagents") affectedArtifacts.push("scripts/ai-toolkit/kernel/claude-adapter.mjs");
  return {
    id,
    aliases: [],
    identityKey: urlIdentity(sourceUrl),
    name,
    authority: "official",
    lifecycle: "review-input",
    sourceType: "manual-reviewed-doc",
    sourceUrl,
    watchMode: "manual-reviewed-doc",
    manualReview: {
      publisher,
      cadence: freshnessClass === "security-runtime" ? "14 days" : "30 days",
      reason: "Mutable authoritative guidance requires an exact content digest and owner-approved review receipt.",
      forbiddenClaims: [
        "current source review",
        "runtime activation or installation approval",
        "raw content import or extraction approval"
      ]
    },
    lastReviewedCommit: null,
    lastReviewedDate: null,
    sourceRecordPath,
    watchedPaths: [],
    licenseConcern: "official-docs-terms-not-reviewed",
    reviewPriority: freshnessClass === "security-runtime" ? "High" : "Medium",
    freshnessClass,
    monitor: failureMonitor("manual-reviewed-doc"),
    review: quarantinedReview(),
    runtimePosture: "metadata-only",
    dependentResourceIds: [],
    affectedArtifacts,
    neverAutoImport: true
  };
}

function authoritativeManualSources() {
  return AUTHORITATIVE_MANUAL_SOURCE_DEFINITIONS.map(authoritativeManualSource);
}

function coderabbitSource() {
  return {
    id: "coderabbit",
    aliases: [],
    identityKey: "url:https://docs.coderabbit.ai",
    name: "CodeRabbit",
    authority: "vendor-service",
    lifecycle: "service-integration",
    sourceType: "manual-reviewed-doc",
    sourceUrl: "https://docs.coderabbit.ai",
    watchMode: "manual-reviewed-doc",
    manualReview: {
      publisher: "CodeRabbit",
      cadence: "14 days",
      reason: "Mutable vendor documentation and connected SaaS permission surface.",
      forbiddenClaims: ["automatic activation", "installation approval", "GitHub App permission approval"]
    },
    lastReviewedCommit: null,
    lastReviewedDate: null,
    sourceRecordPath: ".ai-toolkit/integrations/coderabbit.md",
    watchedPaths: [],
    licenseConcern: "unknown-review-required",
    reviewPriority: "High",
    freshnessClass: "security-runtime",
    monitor: failureMonitor("manual-reviewed-doc"),
    review: quarantinedReview(),
    runtimePosture: "owner-approved-install",
    dependentResourceIds: ["coderabbit"],
    affectedArtifacts: [".ai-toolkit/integrations/coderabbit.md", "registries/tools.registry.json"],
    neverAutoImport: true
  };
}

export function buildSourceCatalogV2(legacy) {
  if (!legacy || legacy.schemaVersion !== "1.0.0" || !Array.isArray(legacy.sources)) {
    fail("input must be the canonical SourceCatalog v1 watchlist");
  }
  const sources = legacy.sources.map(migrateLegacySource);
  const byIdentity = new Map(sources.map((source) => [source.identityKey, source]));

  for (const tool of TOOL_ENTRIES) {
    const [id, , repository] = tool;
    if (id === "coderabbit") continue;
    const [owner, repo] = repository.split("/");
    const identityKey = githubIdentity(owner, repo);
    const existing = byIdentity.get(identityKey);
    if (existing) {
      if (existing.id !== id) existing.aliases = unique([...existing.aliases, id]);
      existing.dependentResourceIds = unique([...existing.dependentResourceIds, id]);
      existing.affectedArtifacts = unique([
        ...existing.affectedArtifacts,
        `.ai-toolkit/sources/records/${id}.md`,
        "registries/tools.registry.json"
      ]);
      if (existing.runtimePosture === "metadata-only") {
        existing.runtimePosture = mapToolRuntimePosture(id, tool[6]);
      }
      continue;
    }
    const entry = toolSource(tool);
    sources.push(entry);
    byIdentity.set(entry.identityKey, entry);
  }

  for (const historical of HISTORICAL_SOURCES) {
    if (byIdentity.has(historical.identityKey)) fail(`historical identity duplicates active source: ${historical.identityKey}`);
    const entry = structuredClone(historical);
    sources.push(entry);
    byIdentity.set(entry.identityKey, entry);
  }
  for (const authoritative of authoritativeManualSources()) {
    if (byIdentity.has(authoritative.identityKey)) {
      fail(`authoritative manual source identity duplicates catalog source: ${authoritative.identityKey}`);
    }
    sources.push(authoritative);
    byIdentity.set(authoritative.identityKey, authoritative);
  }
  const coderabbit = coderabbitSource();
  sources.push(coderabbit);
  byIdentity.set(coderabbit.identityKey, coderabbit);

  const catalog = {
    schemaVersion: "2.0.0",
    catalogId: "enterprise-source-catalog",
    migratedAt: MIGRATION_TIME,
    purpose: "Canonical review-only supply-chain inventory. Catalog freshness never authorizes import, installation, activation, extraction, or runtime use.",
    legacyCompatibility: {
      migratedFromSchema: "1.0.0",
      retainedFields: ["lastReviewedCommit", "lastReviewedDate", "licenseConcern", "reviewDecision"],
      authoritativeForCurrentReview: false
    },
    policy: {
      readOnlySupplyChainInputs: true,
      neverAutoImport: true,
      freshnessNeverActivatesRuntime: true
    },
    approverPolicy: {
      authorizedIdentities: [],
      requiresExplicitOwnerRegistration: true
    },
    freshnessClasses: Object.fromEntries(
      Object.entries(FRESHNESS_WINDOWS_DAYS).map(([id, maxAgeDays]) => [id, { maxAgeDays }])
    ),
    sources
  };
  if (catalog.sources.length !== 79 || byIdentity.size !== 79) {
    fail(`expected 79 reconciled identities, received sources=${catalog.sources.length} identities=${byIdentity.size}`);
  }
  validateSourceCatalog(catalog, { now: MIGRATION_TIME });
  return catalog;
}

function parseArgs(argv) {
  if (argv.length === 0) return { mode: "dry-run" };
  if (argv.length === 1 && argv[0] === "--confirm-write") return { mode: "confirm-write" };
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return { mode: "help" };
  fail("usage: node scripts/migrate-source-catalog-v2.mjs [--confirm-write]");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.mode === "help") {
    console.log("Usage: node scripts/migrate-source-catalog-v2.mjs [--confirm-write]");
    console.log("Default is read-only dry-run. This command performs no network access.");
    return;
  }
  const legacy = JSON.parse(await readFile(path.join(ROOT, CATALOG_PATH), "utf8"));
  if (legacy.schemaVersion === "2.0.0") {
    const normalized = structuredClone(legacy);
    normalized.legacyCompatibility = {
      migratedFromSchema: "1.0.0",
      retainedFields: ["lastReviewedCommit", "lastReviewedDate", "licenseConcern", "reviewDecision"],
      authoritativeForCurrentReview: false
    };
    normalized.approverPolicy ??= {
      authorizedIdentities: [],
      requiresExplicitOwnerRegistration: true
    };
    for (const source of normalized.sources || []) {
      delete source.review?.legacySnapshot;
      if (!source.review) continue;
      source.review.previousReceipt ??= null;
      source.review.receiptDigest ??= null;
      source.review.previousReceiptDigest ??= null;
      source.review.disposition ??= null;
    }
    const identities = new Set((normalized.sources || []).map((source) => source.identityKey));
    for (const authoritative of authoritativeManualSources()) {
      if (!identities.has(authoritative.identityKey)) {
        normalized.sources.push(authoritative);
        identities.add(authoritative.identityKey);
      }
    }
    validateSourceCatalog(normalized, { now: new Date().toISOString() });
    const changed = JSON.stringify(normalized) !== JSON.stringify(legacy);
    if (args.mode === "confirm-write" && changed) {
      const sourceRoot = new ManagedFilesystem({
        repositoryRoot: ROOT,
        managedRoot: path.join(ROOT, "sources"),
        label: "canonical source catalog migration"
      });
      sourceRoot.writeFile("source-watchlist.json", `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
    }
    console.log(JSON.stringify({
      mode: args.mode,
      status: "already-v2",
      normalized: changed,
      sourceCount: normalized.sources.length,
      schemaVersion: normalized.schemaVersion
    }));
    return;
  }
  const catalog = buildSourceCatalogV2(legacy);
  if (args.mode === "dry-run") {
    console.log(JSON.stringify({ mode: "dry-run", sourceCount: catalog.sources.length, schemaVersion: catalog.schemaVersion }));
    return;
  }
  const sourceRoot = new ManagedFilesystem({
    repositoryRoot: ROOT,
    managedRoot: path.join(ROOT, "sources"),
    label: "canonical source catalog migration"
  });
  sourceRoot.writeFile("source-watchlist.json", `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ mode: "confirm-write", sourceCount: catalog.sources.length, schemaVersion: catalog.schemaVersion }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main().catch((error) => {
    console.error(`FAIL migrate-source-catalog-v2: ${error.message}`);
    process.exitCode = 1;
  });
}
