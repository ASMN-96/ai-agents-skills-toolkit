#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULE_URL = pathToFileURL(path.join(ROOT, "scripts", "ai-toolkit", "source-governance.mjs")).href;
const NOW = "2026-07-17T23:59:59.999Z";
const canonicalCatalog = JSON.parse(readFileSync(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
const latestCanonicalCheck = Math.max(...canonicalCatalog.sources.map((source) => Date.parse(source.monitor.checkedAt)));
const CANONICAL_NOW = new Date(latestCanonicalCheck + 1_000).toISOString();
const SHA = "a".repeat(40);
const DIGEST = `sha256:${"b".repeat(64)}`;
const AUTHORIZED_APPROVERS = ["repository-owner:abdal"];
const RETIRED_PORTFOLIO_SOURCE_IDS = [
  "agency-agents",
  "bencium-marketplace",
  "karpathy-inspired-skills",
  "voltagent-awesome-agent-skills",
  "skills-sh"
];
const AUTHORITATIVE_MANUAL_SOURCES = {
  "android-accessibility": ["https://developer.android.com/guide/topics/ui/accessibility/testing", "platform-standards"],
  "android-core-app-quality": ["https://developer.android.com/develop/adaptive-apps/quality-guidelines/core-app-quality", "platform-standards"],
  "apple-accessibility": ["https://developer.apple.com/design/human-interface-guidelines/accessibility", "platform-standards"],
  "apple-human-interface-guidelines": ["https://developer.apple.com/design/human-interface-guidelines/", "platform-standards"],
  "apple-privacy-manifests": ["https://developer.apple.com/documentation/bundleresources/privacy-manifest-files", "security-runtime"],
  "electron-security-guidance": ["https://www.electronjs.org/docs/latest/tutorial/security", "security-runtime"],
  "expo-documentation": ["https://docs.expo.dev/", "platform-standards"],
  "microsoft-windows-accessibility": ["https://learn.microsoft.com/en-us/windows/apps/design/accessibility/", "platform-standards"],
  "microsoft-windows-app-guidance": ["https://learn.microsoft.com/en-us/windows/apps/get-started/best-practices", "platform-standards"],
  "nist-ssdf-ai": ["https://csrc.nist.gov/pubs/sp/800/218/a/final", "security-runtime"],
  "nist-ai-rmf-genai": ["https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence", "security-runtime"],
  "owasp-llmsvs": ["https://owasp.org/www-project-llm-verification-standard/LLMSVS-v2.0-en.html", "security-runtime"],
  "owasp-agentic-applications": ["https://genai.owasp.org/resource/securing-agentic-applications-guide-1-0/", "security-runtime"],
  "slsa-v1-2": ["https://slsa.dev/spec/v1.2/", "security-runtime"],
  "openssf-ai-code-assistant-instructions": ["https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions", "security-runtime"],
  "nist-ssdf": ["https://csrc.nist.gov/pubs/sp/800/218/final", "security-runtime"],
  "owasp-asvs": ["https://owasp.org/www-project-application-security-verification-standard/", "security-runtime"],
  "owasp-masvs": ["https://mas.owasp.org/MASVS/", "security-runtime"],
  "tauri-security-guidance": ["https://v2.tauri.app/security/", "security-runtime"],
  "w3c-wcag-22": ["https://www.w3.org/TR/WCAG22/", "platform-standards"],
  "openai-codex-guidance": ["https://learn.chatgpt.com/docs/agent-configuration/agents-md", "security-runtime"],
  "anthropic-claude-code-subagents": ["https://code.claude.com/docs/en/sub-agents", "security-runtime"]
};
const execFileAsync = promisify(execFile);

async function governance() {
  return import(MODULE_URL);
}

function contentDigest(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function source(overrides = {}) {
  return {
    id: "example-source",
    aliases: [],
    identityKey: "github:example/source",
    name: "Example Source",
    scope: "optional-tool",
    authority: "official",
    lifecycle: "review-input",
    sourceType: "github-repo",
    sourceUrl: "https://github.com/example/source",
    repoOwner: "example",
    repoName: "source",
    defaultBranch: "main",
    sourceRecordPath: "sources/example-source.md",
    watchedPaths: [],
    licenseConcern: "clear",
    reviewPriority: "High",
    freshnessClass: "security-runtime",
    monitor: {
      state: "CURRENT",
      checkedAt: "2026-07-17T07:00:00.000Z",
      observedRevision: { kind: "git-sha", value: SHA },
      contentDigest: DIGEST,
      failureReason: null
    },
    review: {
      state: "REVIEWED_CURRENT",
      currentReceipt: `sources/reviews/example-source/${SHA}.json`,
      previousReceipt: null,
      receiptDigest: `sha256:${"d".repeat(64)}`,
      previousReceiptDigest: null,
      reviewedRevision: { kind: "git-sha", value: SHA },
      reviewedDigest: DIGEST,
      reviewedAt: "2026-07-17T07:15:00.000Z",
      expiresAt: "2026-07-31T07:15:00.000Z",
      disposition: "SYNCED_ADOPTED"
    },
    runtimePosture: "active-if-detected",
    dependentResourceIds: ["example-tool"],
    affectedArtifacts: ["sources/example-source.md"],
    neverAutoImport: true,
    ...overrides
  };
}

function catalog(sources = [source()]) {
  return {
    schemaVersion: "2.1.0",
    catalogId: "enterprise-source-catalog",
    policy: {
      readOnlySupplyChainInputs: true,
      neverAutoImport: true,
      freshnessNeverActivatesRuntime: true
    },
    approverPolicy: {
      authorizedIdentities: AUTHORIZED_APPROVERS,
      requiresExplicitOwnerRegistration: true
    },
    freshnessClasses: {
      "security-runtime": { maxAgeDays: 14 },
      "platform-standards": { maxAgeDays: 30 },
      "general-methods": { maxAgeDays: 90 }
    },
    sources
  };
}

function receipt(overrides = {}) {
  return {
    schemaVersion: "1.0.0",
    receiptId: `example-source:${SHA}`,
    sourceId: "example-source",
    reviewedRevision: { kind: "git-sha", value: SHA },
    contentDigest: DIGEST,
    reviewedAt: "2026-07-17T07:15:00.000Z",
    expiresAt: "2026-07-31T07:15:00.000Z",
    licenseReview: {
      classification: "permissive",
      evidence: ["https://github.com/example/source/blob/main/LICENSE"],
      notes: "License evidence reviewed at the pinned revision."
    },
    securityReview: {
      status: "passed",
      evidence: ["Pinned source inspected without executing upstream code."],
      dangerousOperations: [],
      networkBehavior: ["No upstream code executed."],
      secretAccess: ["No credential access observed or permitted."]
    },
    promptInjectionReview: {
      status: "passed",
      evidence: ["Instructions treated as untrusted source material."],
      rejectedInstructions: []
    },
    adoption: {
      disposition: "SYNCED_REFERENCE",
      summary: "Retained as reviewed reference-only evidence.",
      cleanRoomOnly: true,
      runtimePosture: "active-if-detected"
    },
    affectedArtifacts: ["sources/example-source.md"],
    artifactEvidence: {
      mode: "reference-only-no-copy",
      noCopy: true,
      reason: "No upstream source content was copied or adopted."
    },
    approver: {
      identity: "repository-owner:abdal",
      approvedAt: "2026-07-17T07:30:00.000Z"
    },
    rollbackTarget: {
      previousReceipt: null,
      previousReceiptDigest: null,
      artifactRevision: "4654861f6a1887826e6a888b894869e1ec52bb01"
    },
    ...overrides
  };
}

async function writeRepository(root, sourceEntry = source({
  monitor: {
    state: "CHANGED",
    checkedAt: "2026-07-17T07:00:00.000Z",
    observedRevision: { kind: "git-sha", value: SHA },
    contentDigest: DIGEST,
    failureReason: null
  },
  review: {
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
  }
})) {
  await mkdir(path.join(root, "sources", "pending"), { recursive: true });
  await mkdir(path.join(root, ".ai-toolkit", "sources"), { recursive: true });
  await mkdir(path.join(root, "registries"), { recursive: true });
  await writeFile(path.join(root, "sources", "example-source.md"), "# Example Source\n", "utf8");
  await writeFile(
    path.join(root, "sources", "source-watchlist.json"),
    `${JSON.stringify(catalog([sourceEntry]), null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(root, "registries", "tools.registry.json"),
    `${JSON.stringify({ schemaVersion: "1.0.0", registryType: "tools", tools: [{ id: "example-tool" }] }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(root, "registries", "domain-packs.registry.json"),
    `${JSON.stringify({ schemaVersion: "1.0.0", registryType: "domain-packs", packs: [] }, null, 2)}\n`,
    "utf8"
  );
  await execFileAsync("git", ["init", "--quiet"], { cwd: root });
  await execFileAsync("git", [
    "add",
    "--",
    "sources/source-watchlist.json",
    "sources/example-source.md",
    "registries/tools.registry.json",
    "registries/domain-packs.registry.json"
  ], { cwd: root });
  await execFileAsync("git", [
    "-c",
    "user.name=Source Governance Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture baseline"
  ], { cwd: root });
  const artifactRevision = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
  await writeFile(
    path.join(root, "sources", "pending", "receipt.json"),
    `${JSON.stringify(receipt({
      rollbackTarget: {
        previousReceipt: null,
        previousReceiptDigest: null,
        artifactRevision
      }
    }), null, 2)}\n`,
    "utf8"
  );
  return { artifactRevision };
}

async function writePendingReceipt(root, value) {
  await writeFile(
    path.join(root, "sources", "pending", "receipt.json"),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8"
  );
}

async function advanceCatalogObservation(root, { revision, digest, checkedAt }) {
  const catalogPath = path.join(root, "sources", "source-watchlist.json");
  const next = JSON.parse(await readFile(catalogPath, "utf8"));
  next.sources[0].monitor = {
    state: "CHANGED",
    checkedAt,
    observedRevision: { kind: "git-sha", value: revision },
    contentDigest: digest,
    failureReason: null
  };
  next.sources[0].review.state = "QUARANTINED";
  await writeFile(catalogPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

function chainedReceipt({
  revision,
  digest,
  reviewedAt,
  expiresAt,
  previousReceipt,
  previousReceiptDigest,
  artifactRevision
}) {
  return receipt({
    receiptId: `example-source:${revision}`,
    reviewedRevision: { kind: "git-sha", value: revision },
    contentDigest: digest,
    reviewedAt,
    expiresAt,
    approver: {
      identity: "repository-owner:abdal",
      approvedAt: new Date(Date.parse(reviewedAt) + 15 * 60 * 1000).toISOString()
    },
    rollbackTarget: { previousReceipt, previousReceiptDigest, artifactRevision }
  });
}

test("canonical SourceCatalog v2 retains only active source identities", async () => {
  const { validateSourceCatalog } = await governance();
  const canonicalText = await readFile(path.join(ROOT, "sources", "source-watchlist.json"), "utf8");
  const parsed = JSON.parse(canonicalText);
  const validated = validateSourceCatalog(parsed, { now: CANONICAL_NOW });

  assert.equal(validated.sources.length, 80);
  assert.deepEqual(validated.legacyCompatibility, {
    migratedFromSchema: "1.0.0",
    retainedFields: ["lastReviewedCommit", "lastReviewedDate", "licenseConcern", "reviewDecision"],
    authoritativeForCurrentReview: false
  });
  assert.equal(validated.sources.some((entry) => "legacySnapshot" in entry.review), false);
  assert.ok(Buffer.byteLength(canonicalText, "utf8") < 175_000, "canonical source catalog is needlessly context-heavy");
  const playwright = validated.sources.find((entry) => entry.id === "microsoft-playwright");
  assert.ok(playwright);
  assert.deepEqual(playwright.aliases, ["playwright"]);
  assert.equal(validated.sources.some((entry) => entry.id === "playwright"), false);
  for (const retiredId of RETIRED_PORTFOLIO_SOURCE_IDS) {
    assert.equal(validated.sources.some((entry) => entry.id === retiredId), false, `retired source remains active: ${retiredId}`);
  }
  assert.ok(validated.sources.some((entry) => entry.id === "coderabbit"), "missing active CodeRabbit source");
  assert.equal(new Set(validated.sources.map((entry) => entry.identityKey)).size, 80);
  for (const entry of validated.sources) {
    assert.match(entry.identityKey, /^(?:github|url):/);
    assert.match(entry.authority, /^(?:official|community|aggregator|historical|vendor-service)$/);
    assert.match(entry.lifecycle, /^(?:review-input|historical-reference|service-integration)$/);
  }
  for (const [sourceId, [sourceUrl, freshnessClass]] of Object.entries(AUTHORITATIVE_MANUAL_SOURCES)) {
    const entry = validated.sources.find((source) => source.id === sourceId);
    assert.ok(entry, `missing authoritative source ${sourceId}`);
    assert.equal(entry.sourceUrl, sourceUrl);
    assert.equal(entry.authority, "official");
    assert.equal(entry.sourceType, "manual-reviewed-doc");
    assert.equal(entry.freshnessClass, freshnessClass);
    assert.equal(entry.runtimePosture, "metadata-only");
    assert.equal(entry.monitor.state, "CHECK_FAILED");
    assert.equal(entry.review.state, "QUARANTINED");
    assert.equal(entry.review.currentReceipt, null);
  }

  for (const entry of validated.sources) {
    assert.equal(entry.sourceRecordPath.startsWith("sources/archive/"), false, `archived record is active: ${entry.id}`);
  }
});

test("release accounting keeps portfolio actionability visible while plan accounting binds selected dependencies", async () => {
  const { derivePlanSourceDependencyAccounting, deriveSourceReleaseAccounting } = await governance();
  assert.equal(typeof deriveSourceReleaseAccounting, "function");
  assert.equal(typeof derivePlanSourceDependencyAccounting, "function");
  const blocked = (id, scope, dependentResourceIds = []) => ({
    id,
    scope,
    lifecycle: "review-input",
    monitor: { state: "CURRENT" },
    review: { state: "QUARANTINED" },
    dependentResourceIds
  });
  const releaseCatalog = {
    sources: [
      blocked("core-source", "core"),
      blocked("core-inapplicable-source", "core"),
      blocked("secondary-supported-source", "core"),
      blocked("preview-source", "platform-preview"),
      blocked("optional-source", "optional-tool", ["optional-tool"]),
      blocked("community-source", "community-reference"),
      blocked("historical-source", "historical")
    ]
  };
  const domainPacksRegistry = {
    registryType: "domain-packs",
    packs: [
      {
        id: "enterprise-core",
        lifecycle: "active",
        maturity: "supported",
        gates: [
          { id: "core-gate", authoritativeSourceRefs: [{ sourceId: "core-source" }] },
          {
            id: "core-inapplicable-gate",
            authoritativeSourceRefs: [{ sourceId: "core-inapplicable-source" }]
          }
        ]
      },
      {
        id: "data-ai",
        lifecycle: "active",
        maturity: "supported",
        gates: [{
          id: "secondary-supported-gate",
          authoritativeSourceRefs: [{ sourceId: "secondary-supported-source" }]
        }]
      },
      {
        id: "web-saas",
        lifecycle: "active",
        maturity: "preview",
        gates: [{ id: "preview-gate", authoritativeSourceRefs: [{ sourceId: "preview-source" }] }]
      }
    ]
  };

  const portfolio = deriveSourceReleaseAccounting({
    catalog: releaseCatalog,
    domainPacksRegistry
  });
  assert.equal(portfolio.actionableCount, 7);
  assert.deepEqual(portfolio.actionableCountsByScope, {
    core: 3,
    "platform-preview": 1,
    "optional-tool": 1,
    "community-reference": 1,
    historical: 1
  });
  assert.deepEqual(portfolio.supportedPackIds, ["data-ai", "enterprise-core"]);
  assert.deepEqual(portfolio.releaseBlockingSourceIds, [
    "core-inapplicable-source",
    "core-source",
    "secondary-supported-source"
  ]);
  assert.equal(portfolio.releaseNonblockingActionableCount, 4);
  assert.deepEqual(portfolio.previewDependencyBlockers, [{
    packId: "web-saas",
    gateId: "preview-gate",
    sourceId: "preview-source",
    reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
  }]);
  assert.deepEqual(portfolio.resourceDependencyBlockers, [{
    resourceId: "optional-tool",
    sourceId: "optional-source",
    reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
  }]);

  const unselected = derivePlanSourceDependencyAccounting({
    sourceAccounting: portfolio,
    selectedPackIds: ["enterprise-core"],
    selectedPackMaturities: [{
      packId: "enterprise-core",
      declaredMaturity: "supported",
      effectiveMaturity: "supported"
    }],
    selectedGateIds: ["core-gate"],
    selectedResourceIds: []
  });
  assert.deepEqual(unselected.blockingSourceIds, ["core-source"]);
  assert.deepEqual(unselected.selectedSupportedDependencyBlockers, [{
    packId: "enterprise-core",
    gateId: "core-gate",
    sourceId: "core-source",
    reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
  }]);
  assert.deepEqual(unselected.diagnosticSupportedDependencyBlockers, [
    {
      packId: "data-ai",
      gateId: "secondary-supported-gate",
      sourceId: "secondary-supported-source",
      reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
    },
    {
      packId: "enterprise-core",
      gateId: "core-inapplicable-gate",
      sourceId: "core-inapplicable-source",
      reasonCode: "SOURCE_NOT_REVIEWED_CURRENT"
    }
  ]);
  assert.deepEqual(unselected.selectedPreviewDependencyBlockers, []);
  assert.deepEqual(unselected.selectedResourceDependencyBlockers, []);
  assert.deepEqual(unselected.diagnosticPreviewDependencyBlockers, portfolio.previewDependencyBlockers);
  assert.deepEqual(unselected.diagnosticResourceDependencyBlockers, portfolio.resourceDependencyBlockers);

  const selected = derivePlanSourceDependencyAccounting({
    sourceAccounting: portfolio,
    selectedPackIds: ["enterprise-core", "web-saas"],
    selectedPackMaturities: [
      {
        packId: "enterprise-core",
        declaredMaturity: "supported",
        effectiveMaturity: "supported"
      },
      {
        packId: "web-saas",
        declaredMaturity: "preview",
        effectiveMaturity: "preview"
      }
    ],
    selectedGateIds: ["core-gate", "preview-gate"],
    selectedResourceIds: ["optional-tool"]
  });
  assert.equal(selected.status, "blocked");
  assert.deepEqual(selected.blockingSourceIds, ["core-source", "optional-source", "preview-source"]);
  assert.deepEqual(selected.selectedPreviewDependencyBlockers, portfolio.previewDependencyBlockers);
  assert.deepEqual(selected.selectedResourceDependencyBlockers, portfolio.resourceDependencyBlockers);
  assert.deepEqual(selected.diagnosticPreviewDependencyBlockers, []);
  assert.deepEqual(selected.diagnosticResourceDependencyBlockers, []);
});

test("retired portfolio records are read-only historical evidence, not governed decisions", async () => {
  const archiveIndex = await readFile(path.join(ROOT, "sources", "archive", "INDEX.md"), "utf8");
  assert.match(archiveIndex, /not a SourceReviewReceipt, approval, freshness proof, or runtime authority/i);
  assert.doesNotMatch(archiveIndex, /ARCHIVED_HARD_BLOCKER|REMOVED_REDUNDANT|approver|approvedAt|review receipt/i);

  for (const sourceId of RETIRED_PORTFOLIO_SOURCE_IDS) {
    assert.match(archiveIndex, new RegExp(`\\|\\s*${sourceId}\\s*\\|`));
    assert.match(archiveIndex, new RegExp(`sources/archive/${sourceId}\\.md`));
    assert.match(archiveIndex, /new active catalog record plus normal current review\/approval/i);
    await stat(path.join(ROOT, "sources", "archive", `${sourceId}.md`));
    await assert.rejects(stat(path.join(ROOT, "sources", `${sourceId}.md`)), /ENOENT/);
  }
});

test("every DomainGate authoritative source resolves to one canonical catalog entry", async () => {
  const catalog = JSON.parse(await readFile(path.join(ROOT, "sources", "source-watchlist.json"), "utf8"));
  const domainRegistry = JSON.parse(await readFile(path.join(ROOT, "registries", "domain-packs.registry.json"), "utf8"));
  const catalogIds = new Set(catalog.sources.map((entry) => entry.id));
  const referencedIds = new Set();
  for (const pack of domainRegistry.packs) {
    for (const gate of pack.gates) {
      for (const reference of gate.authoritativeSourceRefs) {
        referencedIds.add(reference.sourceId);
        assert.equal(catalogIds.has(reference.sourceId), true, `unresolved DomainGate source ${reference.sourceId}`);
      }
    }
  }
  for (const sourceId of Object.keys(AUTHORITATIVE_MANUAL_SOURCES).filter((id) => ![
    "openai-codex-guidance",
    "anthropic-claude-code-subagents"
  ].includes(id))) {
    assert.equal(referencedIds.has(sourceId), true, `authoritative source is not used by any DomainGate: ${sourceId}`);
  }
});

test("source discovery method removes the retired directory from provenance", async () => {
  const method = await readFile(path.join(ROOT, "methods", "internal", "source-discovery-workflow.md"), "utf8");
  const sourceRefLine = method.split(/\r?\n/).find((line) => line.startsWith("sourceRef:"));
  assert.ok(sourceRefLine);
  for (const sourceRef of ["toolkit-authored", "anthropic-skills"]) {
    assert.match(sourceRefLine, new RegExp(`["']${sourceRef}["']`));
  }
  assert.doesNotMatch(sourceRefLine, /skills-sh/);

  const registry = JSON.parse(await readFile(path.join(ROOT, "registries", "methods.registry.json"), "utf8"));
  const discovery = registry.methods.find((entry) => entry.id === "internal.source-discovery-workflow");
  assert.ok(discovery, "missing source discovery method registry entry");
  assert.equal(
    discovery.sourceProvenance.some((provenance) => provenance.path === "sources/skills-sh.md"),
    false,
    "retired directory remains active method provenance"
  );
});

test("catalog validation fails closed for unknown states, non-ISO timestamps, and unquarantined changed sources", async () => {
  const { validateSourceCatalog } = await governance();

  assert.throws(
    () => validateSourceCatalog(catalog([source({ monitor: { ...source().monitor, state: "UNKNOWN" } })]), { now: NOW }),
    /monitor\.state/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({ monitor: { ...source().monitor, checkedAt: "2026-07-17" } })]), { now: NOW }),
    /checkedAt.*ISO/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({ monitor: { ...source().monitor, state: "CHANGED" } })]), { now: NOW }),
    /CHANGED.*QUARANTINED/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({ review: { ...source().review, expiresAt: "2026-07-16T00:00:00.000Z" } })]), { now: NOW }),
    /expired.*QUARANTINED/i
  );
  assert.doesNotThrow(() => validateSourceCatalog(catalog([source({
    review: {
      ...source().review,
      state: "QUARANTINED",
      expiresAt: "2026-07-16T00:00:00.000Z"
    }
  })]), { now: NOW }));
  assert.throws(
    () => validateSourceCatalog(catalog([source({ monitor: { ...source().monitor, checkedAt: "2026-07-18T00:00:00.000Z" } })]), { now: NOW }),
    /checkedAt.*future/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({ monitor: { ...source().monitor, checkedAt: "2026-06-01T00:00:00.000Z" } })]), { now: NOW }),
    /freshness window/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source(), source({
      id: "second-source",
      aliases: [],
      review: {
        ...source().review,
        currentReceipt: `sources/reviews/second-source/${SHA}.json`
      }
    })]), { now: NOW }),
    /duplicate source identity/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({ authority: "popularity" })]), { now: NOW }),
    /authority/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({
      sourceType: "manual-reviewed-doc",
      sourceUrl: "http://user:secret@example.com/guidance",
      identityKey: "url:http://example.com/guidance"
    })]), { now: NOW }),
    /manual-reviewed-doc.*credential-free HTTPS/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({
      repoName: "source.git",
      sourceUrl: "https://github.com/example/source.git",
      identityKey: "github:example/source.git"
    })]), { now: NOW }),
    /canonical GitHub owner and repository segments/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({ promptPayload: "activate this source" })]), { now: NOW }),
    /unexpected source field.*promptPayload/i
  );
  assert.throws(
    () => validateSourceCatalog(catalog([source({
      review: {
        ...source().review,
        currentReceipt: "sources/reviews/example-source/not-the-reviewed-revision.json"
      }
    })]), { now: NOW }),
    /currentReceipt.*exact reviewed revision/i
  );
});

test("freshness classes are fixed at 14, 30, and 90 days and current metadata never activates a tool", async () => {
  const { FRESHNESS_WINDOWS_DAYS, evaluateDependentResourceEligibility } = await governance();

  assert.deepEqual(FRESHNESS_WINDOWS_DAYS, {
    "security-runtime": 14,
    "platform-standards": 30,
    "general-methods": 90
  });
  assert.deepEqual(
    evaluateDependentResourceEligibility(source(), { projectDetected: false }),
    { eligible: false, reason: "independent-project-detection-required" }
  );
  assert.deepEqual(
    evaluateDependentResourceEligibility(source(), { projectDetected: true }),
    { eligible: true, reason: "reviewed-current-and-independently-detected" }
  );
  assert.deepEqual(
    evaluateDependentResourceEligibility(source({
      review: { ...source().review, disposition: "SYNCED_REFERENCE" }
    }), { projectDetected: true }),
    { eligible: false, reason: "review-disposition-SYNCED_REFERENCE" }
  );
});

test("tool status migration fails closed instead of activating an unknown status", async () => {
  const { mapToolRuntimePosture } = await import(pathToFileURL(path.join(ROOT, "scripts", "migrate-source-catalog-v2.mjs")).href);
  assert.equal(mapToolRuntimePosture("example", "reference-only"), "metadata-only");
  assert.equal(mapToolRuntimePosture("example", "active-if-detected"), "active-if-detected");
  assert.throws(
    () => mapToolRuntimePosture("example", "new-upstream-status"),
    /unsupported tool status/i
  );
});

test("SourceReviewReceipt v1 binds exact revision and digest and restricts non-permissive adoption", async () => {
  const { validateSourceReviewReceipt } = await governance();
  const entry = source();
  const reviewOptions = {
    source: entry,
    now: NOW,
    authorizedApproverIdentities: AUTHORIZED_APPROVERS,
    expectedPreviousReceipt: null,
    expectedPreviousReceiptDigest: null
  };

  assert.equal(validateSourceReviewReceipt(receipt(), reviewOptions).sourceId, entry.id);
  assert.throws(
    () => validateSourceReviewReceipt(receipt({ reviewedRevision: { kind: "git-sha", value: "c".repeat(40) } }), reviewOptions),
    /observed revision/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({ contentDigest: `sha256:${"c".repeat(64)}` }), reviewOptions),
    /observed digest/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({ approver: { identity: "owner-decision-required", approvedAt: NOW } }), reviewOptions),
    /actual approver identity/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      approver: { identity: "repository-owner:mallory", approvedAt: "2026-07-17T07:30:00.000Z" }
    }), reviewOptions),
    /not registered in catalog approver policy/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      licenseReview: { ...receipt().licenseReview, classification: "mixed" },
      adoption: { ...receipt().adoption, disposition: "SYNCED_ADOPTED" }
    }), reviewOptions),
    /mixed.*reference-only/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      securityReview: { ...receipt().securityReview, status: "restricted" },
      adoption: { ...receipt().adoption, disposition: "SYNCED_ADOPTED" }
    }), reviewOptions),
    /restricted.*non-runtime disposition/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({ affectedArtifacts: ["sources/another-file.md"] }), reviewOptions),
    /affectedArtifacts.*exactly match/i
  );
  const adopted = receipt({
    adoption: {
      ...receipt().adoption,
      disposition: "SYNCED_ADOPTED",
      summary: "Adopted a clean-room normalized artifact."
    },
    artifactEvidence: {
      mode: "exact-content-digests",
      artifacts: [{
        path: "sources/example-source.md",
        contentDigest: contentDigest("# Example Source\n")
      }]
    }
  });
  assert.equal(validateSourceReviewReceipt(adopted, reviewOptions).adoption.disposition, "SYNCED_ADOPTED");
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      adoption: { ...receipt().adoption, disposition: "SYNCED_ADOPTED" }
    }), reviewOptions),
    /adopted.*exact content digest/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      adoption: { ...receipt().adoption, disposition: "SYNCED_ADOPTED" },
      artifactEvidence: {
        mode: "exact-content-digests",
        artifacts: [{
          path: "methods/security/omitted.md",
          contentDigest: contentDigest("omitted")
        }]
      }
    }), reviewOptions),
    /artifact evidence.*exactly match/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      artifactEvidence: {
        mode: "exact-content-digests",
        artifacts: [{
          path: "sources/example-source.md",
          contentDigest: contentDigest("# Example Source\n")
        }]
      }
    }), reviewOptions),
    /reference-only.*no-copy/i
  );
  assert.throws(
    () => validateSourceReviewReceipt({ ...receipt(), callerLifecycleOverride: "active" }, reviewOptions),
    /unexpected receipt field/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      reviewedAt: "2026-07-18T07:15:00.000Z",
      expiresAt: "2026-08-01T07:15:00.000Z",
      approver: { identity: "repository-owner:abdal", approvedAt: "2026-07-18T07:30:00.000Z" }
    }), reviewOptions),
    /reviewedAt.*future/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      reviewedAt: "2026-07-17T06:45:00.000Z",
      expiresAt: "2026-07-31T06:45:00.000Z",
      approver: { identity: "repository-owner:abdal", approvedAt: "2026-07-17T06:50:00.000Z" }
    }), reviewOptions),
    /reviewedAt.*predate the monitor observation/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({ expiresAt: "2026-08-02T07:15:00.000Z" }), reviewOptions),
    /freshness class/i
  );
  assert.throws(
    () => validateSourceReviewReceipt(receipt({
      rollbackTarget: {
        previousReceipt: `sources/reviews/example-source/${SHA}.json`,
        previousReceiptDigest: `sha256:${"d".repeat(64)}`,
        artifactRevision: "4654861f6a1887826e6a888b894869e1ec52bb01"
      }
    }), reviewOptions),
    /rollbackTarget.*previousReceipt.*expected prior receipt/i
  );
});

test("apply review is dry-run by default, writes immutable evidence only with confirmation, and updates canonical state", async () => {
  const { applySourceReview, mirrorSourceCatalog, validateSourceGovernanceRepository } = await governance();
  const root = await mkdtemp(path.join(os.tmpdir(), "source-governance-"));
  const { artifactRevision } = await writeRepository(root);

  const dryRun = await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "dry-run",
    now: NOW
  });
  assert.equal(dryRun.mode, "dry-run");
  await assert.rejects(stat(path.join(root, "sources", "reviews", "example-source", `${SHA}.json`)), /ENOENT/);

  const applied = await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "confirm-write",
    now: NOW
  });
  assert.equal(applied.receiptPath, `sources/reviews/example-source/${SHA}.json`);
  const updated = JSON.parse(await readFile(path.join(root, "sources", "source-watchlist.json"), "utf8"));
  assert.equal(updated.sources[0].monitor.state, "CURRENT");
  assert.equal(updated.sources[0].review.state, "REVIEWED_CURRENT");
  assert.equal(updated.sources[0].review.currentReceipt, applied.receiptPath);
  assert.equal(updated.sources[0].review.previousReceipt, null);
  assert.equal(updated.sources[0].review.disposition, "SYNCED_REFERENCE");
  assert.match(updated.sources[0].review.receiptDigest, /^sha256:[0-9a-f]{64}$/);

  await mirrorSourceCatalog({ repositoryRoot: root });
  const repositoryState = await validateSourceGovernanceRepository({ repositoryRoot: root, now: NOW });
  assert.equal(repositoryState.releaseEligible, true);
  assert.equal(repositoryState.receiptCount, 1);

  const changed = receipt({
    adoption: { ...receipt().adoption, summary: "Different evidence at the same revision." },
    rollbackTarget: {
      previousReceipt: applied.receiptPath,
      previousReceiptDigest: updated.sources[0].review.receiptDigest,
      artifactRevision
    }
  });
  await writeFile(path.join(root, "sources", "pending", "receipt.json"), `${JSON.stringify(changed, null, 2)}\n`, "utf8");
  await assert.rejects(
    applySourceReview({ repositoryRoot: root, receiptPath: "sources/pending/receipt.json", mode: "confirm-write", now: NOW }),
    /immutable receipt already exists with different content/i
  );

  await writeFile(
    path.join(root, applied.receiptPath),
    `${JSON.stringify(receipt({ affectedArtifacts: ["sources/example-source.md"] }), null, 2)} \n`,
    "utf8"
  );
  await assert.rejects(
    validateSourceGovernanceRepository({ repositoryRoot: root, now: NOW }),
    /receipt chain digest.*example-source/i
  );
});

test("review application promotes a long source identifier without an overlong Windows staging path", { skip: process.platform !== "win32" }, async () => {
  const { applySourceReview } = await governance();
  const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "source-governance-long-staging-"));
  const sourceId = "openssf-ai-code-assistant-instructions";
  const finalSuffix = path.join("sources", "reviews", sourceId, `${SHA}.json`);
  const root = path.join(fixtureRoot, "r".repeat(Math.max(1, 120 - fixtureRoot.length - 1)));
  await mkdir(root);
  const longSource = source({
    id: sourceId,
    monitor: {
      state: "CHANGED",
      checkedAt: "2026-07-17T07:00:00.000Z",
      observedRevision: { kind: "git-sha", value: SHA },
      contentDigest: DIGEST,
      failureReason: null
    },
    review: {
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
    }
  });
  const { artifactRevision } = await writeRepository(root, longSource);
  await writePendingReceipt(root, receipt({
    receiptId: `${sourceId}:${SHA}`,
    sourceId,
    rollbackTarget: {
      previousReceipt: null,
      previousReceiptDigest: null,
      artifactRevision
    }
  }));

  assert.ok(path.join(root, finalSuffix).length < 260);
  assert.ok(path.join(root, `.sources.staging-${"0".repeat(36)}`, "reviews", sourceId, `${SHA}.json`).length > 260);

  const applied = await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "confirm-write",
    now: NOW
  });

  assert.equal(applied.receiptPath, finalSuffix.replaceAll(path.sep, "/"));
  await stat(path.join(root, finalSuffix));
});

test("a later receipt-backed manual freshness observation preserves its immutable matching receipt", async () => {
  const { applySourceFreshness, applySourceReview, deriveSourceReleaseAccounting, mirrorSourceCatalog, validateSourceGovernanceRepository } = await governance();
  const root = await mkdtemp(path.join(os.tmpdir(), "manual-receipt-freshness-order-"));
  const observedAt = "2026-07-17T07:00:00.000Z";
  const reviewedAt = "2026-07-17T07:15:00.000Z";
  const refreshedAt = "2026-07-17T08:00:00.000Z";
  const revision = { kind: "content-digest", value: DIGEST };
  const manualSource = source({
    identityKey: "url:https://docs.example.com/example-source",
    sourceType: "manual-reviewed-doc",
    sourceUrl: "https://docs.example.com/example-source",
    runtimePosture: "metadata-only",
    dependentResourceIds: [],
    watchMode: "manual-reviewed-doc",
    manualReview: {
      publisher: "Example",
      cadence: "manual",
      reason: "Manual source review evidence.",
      forbiddenClaims: ["live freshness"]
    },
    monitor: {
      state: "CHANGED",
      checkedAt: observedAt,
      observedRevision: revision,
      contentDigest: DIGEST,
      failureReason: null
    },
    review: {
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
    }
  });
  try {
    const { artifactRevision } = await writeRepository(root, manualSource);
    await writePendingReceipt(root, receipt({
      receiptId: `example-source:${DIGEST}`,
      reviewedRevision: revision,
      contentDigest: DIGEST,
      reviewedAt,
      expiresAt: "2026-07-31T07:15:00.000Z",
      adoption: {
        ...receipt().adoption,
        runtimePosture: "metadata-only"
      },
      approver: {
        identity: "repository-owner:abdal",
        approvedAt: "2026-07-17T07:30:00.000Z"
      },
      rollbackTarget: {
        previousReceipt: null,
        previousReceiptDigest: null,
        artifactRevision
      }
    }));
    await applySourceReview({
      repositoryRoot: root,
      receiptPath: "sources/pending/receipt.json",
      mode: "confirm-write",
      now: NOW
    });

    const catalog = JSON.parse(await readFile(path.join(root, "sources", "source-watchlist.json"), "utf8"));
    const report = {
      schemaVersion: "2.1.0",
      catalogIdentity: {
        schemaVersion: catalog.schemaVersion,
        catalogId: catalog.catalogId,
        sourceCount: catalog.sources.length
      },
      checkedAt: refreshedAt,
      mode: "live",
      readOnly: true,
      disclaimer: "Receipt evidence only; no import or activation is authorized.",
      sources: [{
        sourceId: manualSource.id,
        identityKey: manualSource.identityKey,
        scope: manualSource.scope,
        monitorState: "CURRENT",
        observedRevision: revision,
        contentDigest: DIGEST,
        comparisonRevision: DIGEST,
        comparisonBasis: "MANUAL_REVIEW_RECEIPT",
        reasonCode: "MANUAL_CURRENT",
        checkedAt: refreshedAt,
        missingCurrentReview: false,
        evidence: {
          observationMode: "manual-receipt-only",
          legacyStatus: "MANUAL_REVIEW_TRACKED",
          sourceType: "manual-reviewed-doc",
          sourceUrl: manualSource.sourceUrl,
          digestBasis: "manual-review-receipt",
          latestCommitDate: null,
          releaseSignal: "manual receipt",
          licenseSignal: "not reviewed",
          notes: "Receipt-backed manual evidence.",
          watchedPathSignals: []
        }
      }]
    };
    const accounting = deriveSourceReleaseAccounting({ catalog, domainPacksRegistry: { registryType: "domain-packs", packs: [] }, freshnessReport: report });
    Object.assign(report, {
      sourceCount: accounting.sourceCount,
      monitorCounts: accounting.monitorCounts,
      actionableCount: accounting.actionableCount,
      actionableCountsByScope: accounting.actionableCountsByScope,
      releaseScope: {
        supportedPackIds: accounting.supportedPackIds,
        releaseBlockingSourceCount: accounting.releaseBlockingSourceCount,
        releaseBlockingSourceIds: accounting.releaseBlockingSourceIds,
        releaseNonblockingActionableCount: accounting.releaseNonblockingActionableCount
      }
    });
    await writeFile(path.join(root, "freshness.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");

    await applySourceFreshness({
      repositoryRoot: root,
      freshnessReport: "freshness.json",
      mode: "confirm-write",
      now: NOW
    });
    await mirrorSourceCatalog({ repositoryRoot: root });
    await validateSourceGovernanceRepository({ repositoryRoot: root, now: NOW });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("review apply and repository validation verify the full immutable A to B to C receipt chain", async () => {
  const { applySourceReview, mirrorSourceCatalog, validateSourceGovernanceRepository } = await governance();
  const root = await mkdtemp(path.join(os.tmpdir(), "source-receipt-chain-"));
  const { artifactRevision } = await writeRepository(root);

  const appliedA = await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "confirm-write",
    now: NOW
  });
  let current = JSON.parse(await readFile(path.join(root, "sources", "source-watchlist.json"), "utf8"));

  const revisionB = "c".repeat(40);
  const digestB = `sha256:${"d".repeat(64)}`;
  await advanceCatalogObservation(root, {
    revision: revisionB,
    digest: digestB,
    checkedAt: "2026-07-17T08:00:00.000Z"
  });
  await writePendingReceipt(root, chainedReceipt({
    revision: revisionB,
    digest: digestB,
    reviewedAt: "2026-07-17T08:15:00.000Z",
    expiresAt: "2026-07-31T08:15:00.000Z",
    previousReceipt: appliedA.receiptPath,
    previousReceiptDigest: current.sources[0].review.receiptDigest,
    artifactRevision
  }));
  const appliedB = await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "confirm-write",
    now: NOW
  });
  assert.equal(appliedB.receiptPath, `sources/reviews/example-source/${revisionB}.json`);
  current = JSON.parse(await readFile(path.join(root, "sources", "source-watchlist.json"), "utf8"));

  const revisionC = "e".repeat(40);
  const digestC = `sha256:${"f".repeat(64)}`;
  await advanceCatalogObservation(root, {
    revision: revisionC,
    digest: digestC,
    checkedAt: "2026-07-17T09:00:00.000Z"
  });
  await writePendingReceipt(root, chainedReceipt({
    revision: revisionC,
    digest: digestC,
    reviewedAt: "2026-07-17T09:15:00.000Z",
    expiresAt: "2026-07-31T09:15:00.000Z",
    previousReceipt: appliedB.receiptPath,
    previousReceiptDigest: current.sources[0].review.receiptDigest,
    artifactRevision
  }));
  await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "confirm-write",
    now: NOW
  });
  await mirrorSourceCatalog({ repositoryRoot: root });
  const valid = await validateSourceGovernanceRepository({ repositoryRoot: root, now: NOW });
  assert.equal(valid.receiptCount, 3);

  await writeFile(path.join(root, appliedA.receiptPath), `${await readFile(path.join(root, appliedA.receiptPath), "utf8")} `, "utf8");
  await assert.rejects(
    validateSourceGovernanceRepository({ repositoryRoot: root, now: NOW }),
    /receipt chain digest.*example-source/i
  );
});

test("review apply rejects broken or tampered prior receipt chains before writing a successor", async () => {
  const { applySourceReview } = await governance();
  for (const failureMode of ["tampered", "missing"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), `source-prior-${failureMode}-`));
    const { artifactRevision } = await writeRepository(root);
    const appliedA = await applySourceReview({
      repositoryRoot: root,
      receiptPath: "sources/pending/receipt.json",
      mode: "confirm-write",
      now: NOW
    });
    const current = JSON.parse(await readFile(path.join(root, "sources", "source-watchlist.json"), "utf8"));
    const revisionB = "c".repeat(40);
    const digestB = `sha256:${"d".repeat(64)}`;
    await advanceCatalogObservation(root, {
      revision: revisionB,
      digest: digestB,
      checkedAt: "2026-07-17T08:00:00.000Z"
    });
    await writePendingReceipt(root, chainedReceipt({
      revision: revisionB,
      digest: digestB,
      reviewedAt: "2026-07-17T08:15:00.000Z",
      expiresAt: "2026-07-31T08:15:00.000Z",
      previousReceipt: appliedA.receiptPath,
      previousReceiptDigest: current.sources[0].review.receiptDigest,
      artifactRevision
    }));
    if (failureMode === "tampered") {
      await writeFile(path.join(root, appliedA.receiptPath), `${await readFile(path.join(root, appliedA.receiptPath), "utf8")} `, "utf8");
    } else {
      await rm(path.join(root, appliedA.receiptPath));
    }
    await assert.rejects(
      applySourceReview({
        repositoryRoot: root,
        receiptPath: "sources/pending/receipt.json",
        mode: "dry-run",
        now: NOW
      }),
      failureMode === "tampered" ? /receipt chain digest.*example-source/i : /prior receipt chain.*does not exist/i
    );
  }
});

test("adopted receipts attest every cataloged artifact digest and cannot omit source-referenced methods", async () => {
  const { applySourceReview } = await governance();
  const root = await mkdtemp(path.join(os.tmpdir(), "source-artifact-coverage-"));
  const { artifactRevision } = await writeRepository(root);
  const methodPath = "methods/security/example-method.md";
  const methodText = "---\nsourceRef: [\"example-source\"]\nlastExtracted: 2026-07-17\nstatus: approved\n---\n\n# Example Method\n";
  await mkdir(path.join(root, "methods", "security"), { recursive: true });
  await writeFile(path.join(root, methodPath), methodText, "utf8");

  const adoptedReceipt = receipt({
    adoption: {
      ...receipt().adoption,
      disposition: "SYNCED_ADOPTED",
      summary: "Adopted one clean-room normalized method."
    },
    artifactEvidence: {
      mode: "exact-content-digests",
      artifacts: [{
        path: "sources/example-source.md",
        contentDigest: contentDigest("# Example Source\n")
      }]
    },
    rollbackTarget: {
      previousReceipt: null,
      previousReceiptDigest: null,
      artifactRevision
    }
  });
  await writePendingReceipt(root, adoptedReceipt);
  await assert.rejects(
    applySourceReview({
      repositoryRoot: root,
      receiptPath: "sources/pending/receipt.json",
      mode: "dry-run",
      now: NOW
    }),
    /adopted method artifact.*missing from catalog coverage/i
  );

  const catalogPath = path.join(root, "sources", "source-watchlist.json");
  const updatedCatalog = JSON.parse(await readFile(catalogPath, "utf8"));
  updatedCatalog.sources[0].affectedArtifacts.push(methodPath, "registries/tools.registry.json");
  await writeFile(catalogPath, `${JSON.stringify(updatedCatalog, null, 2)}\n`, "utf8");
  adoptedReceipt.affectedArtifacts.push(methodPath, "registries/tools.registry.json");
  adoptedReceipt.artifactEvidence.artifacts.push({
    path: methodPath,
    contentDigest: `sha256:${"0".repeat(64)}`
  }, {
    path: "registries/tools.registry.json",
    contentDigest: contentDigest(await readFile(path.join(root, "registries", "tools.registry.json")))
  });
  await writePendingReceipt(root, adoptedReceipt);
  await assert.rejects(
    applySourceReview({
      repositoryRoot: root,
      receiptPath: "sources/pending/receipt.json",
      mode: "dry-run",
      now: NOW
    }),
    /artifact content digest.*example-method/i
  );

  adoptedReceipt.artifactEvidence.artifacts[1].contentDigest = contentDigest(methodText);
  await writePendingReceipt(root, adoptedReceipt);
  const complete = await applySourceReview({
    repositoryRoot: root,
    receiptPath: "sources/pending/receipt.json",
    mode: "dry-run",
    now: NOW
  });
  assert.equal(complete.disposition, "SYNCED_ADOPTED");
});

test("review application never promotes failed or manual monitor evidence", async () => {
  const { applySourceReview } = await governance();
  const root = await mkdtemp(path.join(os.tmpdir(), "source-monitor-failed-"));
  await writeRepository(root, source({
    monitor: {
      state: "CHECK_FAILED",
      checkedAt: "2026-07-17T07:00:00.000Z",
      observedRevision: { kind: "git-sha", value: SHA },
      contentDigest: DIGEST,
      failureReason: "The live source check failed after partial observation."
    },
    review: {
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
    }
  }));

  await assert.rejects(
    applySourceReview({
      repositoryRoot: root,
      receiptPath: "sources/pending/receipt.json",
      mode: "dry-run",
      now: NOW
    }),
    /monitor state.*CURRENT or CHANGED/i
  );
});

test("review application requires an available rollback commit and the shared governance mutation lock", async () => {
  const { applySourceReview } = await governance();
  const invalidRoot = await mkdtemp(path.join(os.tmpdir(), "source-invalid-rollback-"));
  await writeRepository(invalidRoot);
  await writeFile(
    path.join(invalidRoot, "sources", "pending", "receipt.json"),
    `${JSON.stringify(receipt({
      rollbackTarget: {
        previousReceipt: null,
        previousReceiptDigest: null,
        artifactRevision: "c".repeat(40)
      }
    }), null, 2)}\n`,
    "utf8"
  );
  await assert.rejects(
    applySourceReview({
      repositoryRoot: invalidRoot,
      receiptPath: "sources/pending/receipt.json",
      mode: "dry-run",
      now: NOW
    }),
    /not an available ancestor commit/i
  );

  const lockedRoot = await mkdtemp(path.join(os.tmpdir(), "source-exclusive-lock-"));
  await writeRepository(lockedRoot);
  const catalogBefore = await readFile(path.join(lockedRoot, "sources", "source-watchlist.json"), "utf8");
  await writeFile(
    path.join(lockedRoot, ".source-governance-mutation.lock"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      operation: "source-freshness",
      ownerPid: process.pid,
      token: "freshness-operation-holds-shared-lock",
      createdAt: NOW
    })}\n`,
    "utf8"
  );
  await assert.rejects(
    applySourceReview({
      repositoryRoot: lockedRoot,
      receiptPath: "sources/pending/receipt.json",
      mode: "confirm-write",
      now: NOW
    }),
    /source governance mutation lock.*source-freshness|already exists|exclusive|overwrite/i
  );
  assert.equal(
    await readFile(path.join(lockedRoot, "sources", "source-watchlist.json"), "utf8"),
    catalogBefore
  );
  await assert.rejects(
    stat(path.join(lockedRoot, "sources", "reviews", "example-source", `${SHA}.json`)),
    /ENOENT/
  );

  const staleRoot = await mkdtemp(path.join(os.tmpdir(), "source-stale-lock-"));
  await writeRepository(staleRoot);
  await writeFile(
    path.join(staleRoot, ".source-governance-mutation.lock"),
    `${JSON.stringify({
      schemaVersion: "1.0.0",
      operation: "source-freshness",
      ownerPid: 2_147_483_647,
      token: "crashed-freshness-operation",
      createdAt: "2026-07-16T00:00:00.000Z"
    })}\n`,
    "utf8"
  );
  const recovered = await applySourceReview({
    repositoryRoot: staleRoot,
    receiptPath: "sources/pending/receipt.json",
    mode: "confirm-write",
    now: NOW
  });
  assert.equal(recovered.mode, "confirm-write");
  await assert.rejects(stat(path.join(staleRoot, ".source-governance-mutation.lock")), /ENOENT/);
});

test("generated source catalog mirror is byte-identical and never becomes canonical input", async () => {
  const { mirrorSourceCatalog, validateSourceGovernanceRepository } = await governance();
  const root = await mkdtemp(path.join(os.tmpdir(), "source-mirror-"));
  await mkdir(path.join(root, "sources"), { recursive: true });
  const text = `${JSON.stringify(catalog([source({
    monitor: {
      state: "CHECK_FAILED",
      checkedAt: null,
      observedRevision: null,
      contentDigest: null,
      failureReason: "Test source was not checked."
    },
    review: {
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
    }
  })]), null, 2)}\n`;
  await writeFile(path.join(root, "sources", "source-watchlist.json"), text, "utf8");

  await mirrorSourceCatalog({ repositoryRoot: root });
  const mirror = await readFile(path.join(root, ".ai-toolkit", "sources", "watchlist.json"), "utf8");
  assert.equal(mirror, text);

  await writeFile(path.join(root, ".ai-toolkit", "sources", "watchlist.json"), `${text} `, "utf8");
  await assert.rejects(
    validateSourceGovernanceRepository({ repositoryRoot: root, now: NOW }),
    /generated source catalog mirror drift/i
  );
});

test("embedded manifest attests the canonical and generated source catalog digests", async () => {
  const manifest = JSON.parse(await readFile(path.join(ROOT, ".ai-toolkit", "manifest.json"), "utf8"));
  const mirror = manifest.mirrors.find((entry) => entry.source === "sources/source-watchlist.json");
  assert.ok(mirror, "embedded manifest is missing the source catalog mirror");
  assert.equal(mirror.target, ".ai-toolkit/sources/watchlist.json");
  assert.match(mirror.sourceSha256, /^[0-9a-f]{64}$/);
  assert.equal(mirror.sourceSha256, mirror.targetSha256);
  assert.equal(mirror.sha256, mirror.targetSha256);
  assert.ok(
    manifest.generatedArtifacts.some((entry) => entry.path === ".ai-toolkit/sources/watchlist.json"),
    "generated source catalog is missing from generatedArtifacts"
  );
});

test("freshness report and catalog must agree on exact observed revision, digest, and monitor state", async () => {
  const { validateFreshnessReport: validateRawFreshnessReport } = await governance();
  const domainPacksRegistry = { registryType: "domain-packs", packs: [] };
  const validateFreshnessReport = (candidateCatalog, candidateReport, options = {}) => (
    validateRawFreshnessReport(candidateCatalog, candidateReport, {
      domainPacksRegistry,
      ...options
    })
  );
  const sourceEntry = source();
  const report = {
    schemaVersion: "2.1.0",
    catalogIdentity: {
      schemaVersion: "2.1.0",
      catalogId: "enterprise-source-catalog",
      sourceCount: 1
    },
    checkedAt: sourceEntry.monitor.checkedAt,
    mode: "live",
    readOnly: true,
    disclaimer: "Read-only freshness evidence; no import or activation is authorized.",
    sourceCount: 1,
    monitorCounts: { CURRENT: 1, CHANGED: 0, CHECK_FAILED: 0, MANUAL_DUE: 0 },
    actionableCount: 0,
    actionableCountsByScope: {
      core: 0,
      "platform-preview": 0,
      "optional-tool": 0,
      "community-reference": 0,
      historical: 0
    },
    releaseScope: {
      supportedPackIds: [],
      releaseBlockingSourceCount: 0,
      releaseBlockingSourceIds: [],
      releaseNonblockingActionableCount: 0
    },
    sources: [{
      sourceId: sourceEntry.id,
      identityKey: sourceEntry.identityKey,
      scope: sourceEntry.scope,
      monitorState: sourceEntry.monitor.state,
      observedRevision: sourceEntry.monitor.observedRevision,
      contentDigest: sourceEntry.monitor.contentDigest,
      comparisonRevision: SHA,
      comparisonBasis: "PRIOR_MONITOR_OBSERVATION",
      reasonCode: "COMPARISON_MATCH",
      checkedAt: sourceEntry.monitor.checkedAt,
      missingCurrentReview: false,
      evidence: {
        observationMode: "live-read-only",
        legacyStatus: "UNCHANGED",
        sourceType: "github-repo",
        sourceUrl: sourceEntry.sourceUrl,
        digestBasis: "git-revision-identity",
        latestCommitDate: "2026-07-17T06:59:00.000Z",
        releaseSignal: "none",
        licenseSignal: "not copied",
        notes: "Read-only exact revision observation.",
        watchedPathSignals: []
      }
    }]
  };

  assert.throws(
    () => validateRawFreshnessReport(catalog(), report, { now: NOW }),
    /requires the canonical domain-packs registry/
  );
  assert.equal(validateFreshnessReport(catalog(), report, { now: NOW }).sources.length, 1);
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      sources: [{ ...report.sources[0], contentDigest: `sha256:${"c".repeat(64)}` }]
    }, { now: NOW }),
    /digest.*does not match/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), { ...report, mode: "mock" }, { now: NOW }),
    /mock.*not valid governance evidence/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      sources: [{ ...report.sources[0], comparisonBasis: "UNRECOGNIZED" }]
    }, { now: NOW }),
    /comparisonBasis.*unsupported/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      sources: [{ ...report.sources[0], reasonCode: "UNRECOGNIZED" }]
    }, { now: NOW }),
    /reasonCode.*unsupported/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      sources: [{ ...report.sources[0], comparisonRevision: "f".repeat(40) }]
    }, { now: NOW }),
    /CURRENT.*matching.*comparison/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      actionableCount: 1,
      sources: [{
        ...report.sources[0],
        monitorState: "CHANGED",
        missingCurrentReview: true,
        reasonCode: "UPSTREAM_CHANGED"
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /CHANGED.*different.*comparison/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      actionableCount: 1,
      sources: [{
        ...report.sources[0],
        monitorState: "CHECK_FAILED",
        observedRevision: null,
        contentDigest: null,
        comparisonRevision: SHA,
        comparisonBasis: "MISSING",
        reasonCode: "BASELINE_MISSING",
        missingCurrentReview: true
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /BASELINE_MISSING.*comparison revision/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      actionableCount: 1,
      sources: [{
        ...report.sources[0],
        monitorState: "CHECK_FAILED",
        comparisonRevision: null,
        comparisonBasis: "MISSING",
        reasonCode: "REMOTE_CHECK_FAILED",
        missingCurrentReview: true
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /REMOTE_CHECK_FAILED/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      actionableCount: 1,
      sources: [{
        ...report.sources[0],
        monitorState: "CHECK_FAILED",
        observedRevision: null,
        contentDigest: null,
        comparisonRevision: SHA,
        comparisonBasis: "PRIOR_MONITOR_OBSERVATION",
        reasonCode: "COMPARISON_MATCH",
        missingCurrentReview: true
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /GitHub CHECK_FAILED requires/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      actionableCount: 1,
      sources: [{
        ...report.sources[0],
        monitorState: "CHECK_FAILED",
        observedRevision: null,
        contentDigest: null,
        comparisonRevision: null,
        comparisonBasis: "MISSING",
        reasonCode: "MANUAL_EVIDENCE_REQUIRED",
        missingCurrentReview: true
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /manual freshness reason or basis.*GitHub/i
  );
  const manualSource = {
    ...sourceEntry,
    sourceType: "manual-reviewed-doc",
    sourceUrl: "https://docs.example.com/manual",
    identityKey: "url:https://docs.example.com/manual",
    lastReviewedCommit: null,
    manualReview: {
      publisher: "Example",
      cadence: "manual",
      reason: "Manual source.",
      forbiddenClaims: ["live freshness"]
    }
  };
  assert.throws(
    () => validateFreshnessReport({ ...catalog(), sources: [manualSource] }, {
      ...report,
      sources: [{
        ...report.sources[0],
        sourceId: manualSource.id,
        identityKey: manualSource.identityKey,
        evidence: {
          ...report.sources[0].evidence,
          sourceType: "manual-reviewed-doc",
          sourceUrl: manualSource.sourceUrl
        }
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /Git comparison reason or basis.*manual/i
  );
  assert.throws(
    () => validateFreshnessReport({ ...catalog(), sources: [manualSource] }, {
      ...report,
      sources: [{
        ...report.sources[0],
        identityKey: manualSource.identityKey,
        comparisonBasis: "MANUAL_REVIEW_RECEIPT",
        reasonCode: "IDENTITY_DRIFT_DETECTED",
        evidence: {
          ...report.sources[0].evidence,
          observationMode: "manual-receipt-only",
          sourceType: "manual-reviewed-doc",
          sourceUrl: manualSource.sourceUrl,
          digestBasis: "manual-review-receipt"
        }
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /Git comparison reason or basis.*manual/i
  );
  assert.throws(
    () => validateFreshnessReport(catalog(), {
      ...report,
      checkedAt: "2026-07-15T07:00:00.000Z",
      sources: [{ ...report.sources[0], checkedAt: "2026-07-15T07:00:00.000Z" }]
    }, { now: NOW }),
    /older than 24 hours/i
  );
});

test("manual receipt-backed freshness is validated against the catalog receipt and expiry", async () => {
  const { validateFreshnessReport: validateRawFreshnessReport } = await governance();
  const domainPacksRegistry = { registryType: "domain-packs", packs: [] };
  const validateFreshnessReport = (candidateCatalog, candidateReport, options = {}) => (
    validateRawFreshnessReport(candidateCatalog, candidateReport, {
      domainPacksRegistry,
      ...options
    })
  );
  const manualDigest = `sha256:${"f".repeat(64)}`;
  const manualRevision = { kind: "content-digest", value: manualDigest };
  const manualSource = source({
    sourceType: "manual-reviewed-doc",
    sourceUrl: "https://docs.example.com/manual",
    identityKey: "url:https://docs.example.com/manual",
    lastReviewedCommit: null,
    runtimePosture: "metadata-only",
    dependentResourceIds: [],
    manualReview: {
      publisher: "Example",
      cadence: "manual",
      reason: "Manual source.",
      forbiddenClaims: ["live freshness"]
    },
    monitor: {
      state: "CURRENT",
      checkedAt: "2026-07-17T07:00:00.000Z",
      observedRevision: manualRevision,
      contentDigest: manualDigest,
      failureReason: null
    },
    review: {
      state: "REVIEWED_CURRENT",
      currentReceipt: `sources/reviews/example-source/${manualDigest.slice("sha256:".length)}.json`,
      previousReceipt: null,
      receiptDigest: `sha256:${"e".repeat(64)}`,
      previousReceiptDigest: null,
      reviewedRevision: manualRevision,
      reviewedDigest: manualDigest,
      reviewedAt: "2026-07-17T07:15:00.000Z",
      expiresAt: "2026-07-18T07:15:00.000Z",
      disposition: "SYNCED_REFERENCE"
    }
  });
  const manualReport = {
    schemaVersion: "2.1.0",
    catalogIdentity: {
      schemaVersion: "2.1.0",
      catalogId: "enterprise-source-catalog",
      sourceCount: 1
    },
    checkedAt: "2026-07-17T07:00:00.000Z",
    mode: "live",
    readOnly: true,
    disclaimer: "Receipt evidence only; no import or activation is authorized.",
    sourceCount: 1,
    monitorCounts: { CURRENT: 1, CHANGED: 0, CHECK_FAILED: 0, MANUAL_DUE: 0 },
    actionableCount: 0,
    actionableCountsByScope: {
      core: 0,
      "platform-preview": 0,
      "optional-tool": 0,
      "community-reference": 0,
      historical: 0
    },
    releaseScope: {
      supportedPackIds: [],
      releaseBlockingSourceCount: 0,
      releaseBlockingSourceIds: [],
      releaseNonblockingActionableCount: 0
    },
    sources: [{
      sourceId: manualSource.id,
      identityKey: manualSource.identityKey,
      scope: manualSource.scope,
      monitorState: "CURRENT",
      observedRevision: manualRevision,
      contentDigest: manualDigest,
      comparisonRevision: manualDigest,
      comparisonBasis: "MANUAL_REVIEW_RECEIPT",
      reasonCode: "MANUAL_CURRENT",
      checkedAt: "2026-07-17T07:00:00.000Z",
      missingCurrentReview: false,
      evidence: {
        observationMode: "manual-receipt-only",
        legacyStatus: "MANUAL_REVIEW_TRACKED",
        sourceType: "manual-reviewed-doc",
        sourceUrl: manualSource.sourceUrl,
        digestBasis: "manual-review-receipt",
        latestCommitDate: null,
        releaseSignal: "manual receipt",
        licenseSignal: "not reviewed",
        notes: "Receipt-backed manual evidence.",
        watchedPathSignals: []
      }
    }]
  };

  assert.equal(validateFreshnessReport(catalog([manualSource]), manualReport, { now: NOW }).sources.length, 1);
  assert.throws(
    () => validateFreshnessReport(catalog([manualSource]), {
      ...manualReport,
      actionableCount: 1,
      sources: [{
        ...manualReport.sources[0],
        monitorState: "MANUAL_DUE",
        observedRevision: null,
        contentDigest: null,
        reasonCode: "MANUAL_DUE",
        missingCurrentReview: true
      }]
    }, { now: NOW, requireCatalogAgreement: false }),
    /MANUAL_DUE.*expired/i
  );
  const expiredManualSource = structuredClone(manualSource);
  expiredManualSource.review.expiresAt = "2026-07-16T07:15:00.000Z";
  expiredManualSource.review.state = "QUARANTINED";
  assert.throws(
    () => validateFreshnessReport(catalog([expiredManualSource]), manualReport, { now: NOW, requireCatalogAgreement: false }),
    /MANUAL_CURRENT.*expired/i
  );
});

test("source governance validates a regenerated mirror and keeps review application dry-run unless confirmed", async () => {
  const validateScript = path.join(ROOT, "scripts", "validate-source-governance.mjs");
  const applyScript = path.join(ROOT, "scripts", "apply-source-review.mjs");
  const migrationScript = path.join(ROOT, "scripts", "migrate-source-catalog-v2.mjs");
  const validation = await execFileAsync(process.execPath, [validateScript], { cwd: ROOT });
  assert.match(validation.stdout, /PASS validate-source-governance/);
  assert.match(validation.stdout, /"schemaVersion":"2\.1\.0"/);
  assert.match(validation.stdout, /"releaseEligible":false/);
  const migration = await execFileAsync(process.execPath, [migrationScript], { cwd: ROOT });
  assert.match(migration.stdout, /"status":"already-v2\.1"/);
  assert.match(migration.stdout, /"sourceCount":80/);
  const migrationSource = await readFile(migrationScript, "utf8");
  assert.match(
    migrationSource,
    /filter\(\(source\) => !RETIRED_PORTFOLIO_SOURCE_IDS\.has\(source\.id\)\)/,
    "legacy migration must exclude the retired portfolio before catalog construction"
  );
  for (const retiredId of RETIRED_PORTFOLIO_SOURCE_IDS) {
    assert.doesNotMatch(migrationSource, new RegExp(`id: "${retiredId}"`), `migration can restore retired source: ${retiredId}`);
  }

  const root = await mkdtemp(path.join(os.tmpdir(), "source-governance-cli-"));
  await writeRepository(root);
  const dryRun = await execFileAsync(process.execPath, [
    applyScript,
    "--receipt",
    "sources/pending/receipt.json",
    "--dry-run"
  ], { cwd: root });
  assert.match(dryRun.stdout, /"mode":"dry-run"/);
  await assert.rejects(stat(path.join(root, "sources", "reviews", "example-source", `${SHA}.json`)), /ENOENT/);
  await assert.rejects(
    execFileAsync(process.execPath, [validateScript, "--now", CANONICAL_NOW], { cwd: ROOT }),
    /unknown argument: --now/i
  );
});
