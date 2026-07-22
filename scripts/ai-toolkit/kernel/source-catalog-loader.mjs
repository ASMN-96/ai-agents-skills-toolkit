import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { assertRegularFileWithin } from "../../../install/safe-filesystem.mjs";
import { readCanonicalJsonDocumentWithin } from "./canonical-json.mjs";
import {
  SOURCE_CATALOG_SCHEMA_VERSION,
  validateSourceCatalogGraph,
  validateSourceReviewReceipt
} from "./source-catalog-contract.mjs";
import {
  deriveSourceCapabilityWarnings,
  validateSourceCapabilityRegistry,
  validateSourceCapabilityRepository
} from "./source-synthesis-contract.mjs";
import { buildResourceCatalog } from "./resource-catalog.mjs";

const CATALOG_PATH = "sources/source-watchlist.json";
const CAPABILITY_REGISTRY_PATH = "registries/source-capabilities.registry.json";

function parseMethodSourceRefs(text, methodPath) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1];
  const raw = /^sourceRef:\s*(.+)$/m.exec(frontmatter ?? "")?.[1]?.trim();
  if (!raw) return [];
  try {
    const parsed = raw.startsWith("[") ? JSON.parse(raw) : raw.split(",").map((entry) => entry.trim());
    if (!Array.isArray(parsed) || parsed.some((entry) => typeof entry !== "string" || entry.length === 0)) {
      throw new Error("must contain source IDs");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Source governance: method ${methodPath} has invalid sourceRef: ${error.message}`);
  }
}

async function methodCapabilityContext(repositoryRoot, methodsRegistry) {
  const methods = [];
  for (const method of methodsRegistry?.methods ?? []) {
    const candidate = path.resolve(repositoryRoot, ...method.methodPath.split("/"));
    const trustedPath = assertRegularFileWithin(repositoryRoot, candidate, `method provenance ${method.id}`);
    const text = await readFile(trustedPath, "utf8");
    assertRegularFileWithin(repositoryRoot, trustedPath, `method provenance ${method.id} recheck`);
    methods.push({ id: method.id, path: method.methodPath, sourceRef: parseMethodSourceRefs(text, method.methodPath) });
  }
  return methods;
}

function provenancePath(entry, preferredPrefix, fallbackPath) {
  const match = (entry?.sourceProvenance ?? []).find((record) => (
    typeof record?.path === "string" && record.path.startsWith(preferredPrefix)
  ));
  return match?.path ?? fallbackPath;
}

function domainGateCapabilityContext(domainPacksRegistry) {
  return (domainPacksRegistry?.packs ?? []).flatMap((pack) => (pack.gates ?? []).map((gate) => ({
    id: gate.id,
    path: "registries/domain-packs.registry.json"
  }))).sort((left, right) => left.id.localeCompare(right.id));
}

async function evaluationCapabilityContext(repositoryRoot) {
  const evaluations = [];
  async function visit(relativeDirectory) {
    const absoluteDirectory = path.resolve(repositoryRoot, ...relativeDirectory.split("/"));
    let entries = [];
    try {
      entries = await readdir(absoluteDirectory, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) {
        await visit(relativePath);
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        const trustedPath = assertRegularFileWithin(repositoryRoot, path.resolve(repositoryRoot, ...relativePath.split("/")), `evaluation provenance ${relativePath}`);
        const text = await readFile(trustedPath, "utf8");
        assertRegularFileWithin(repositoryRoot, trustedPath, `evaluation provenance ${relativePath} recheck`);
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          continue;
        }
        for (const evaluation of parsed?.cases ?? []) {
          if (typeof evaluation?.id === "string" && evaluation.id.length > 0) {
            evaluations.push({ id: evaluation.id, path: relativePath, caseIds: [evaluation.id] });
          }
        }
      }
    }
  }
  await visit("evals");
  return evaluations.sort((left, right) => left.id.localeCompare(right.id));
}

function policyCapabilityContext(registry) {
  return (registry?.syntheses ?? [])
    .flatMap((synthesis) => synthesis.artifactRefs ?? [])
    .filter((artifact) => artifact?.kind === "policy")
    .map((artifact) => ({ id: artifact.resourceId, path: artifact.path }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function sourceCapabilityContext({ methods, toolsRegistry, skillsRegistry, agentsRegistry, domainPacksRegistry, evals, policies }) {
  return {
    methods,
    tools: (toolsRegistry?.tools ?? []).map((tool) => ({
      id: tool.id,
      path: tool.sourceRecordPath ?? "registries/tools.registry.json"
    })),
    skills: (skillsRegistry?.skills ?? []).map((skill) => ({
      id: skill.name,
      path: skill.skillPath
    })),
    agents: (agentsRegistry?.agents ?? []).map((agent) => ({
      id: agent.name,
      path: provenancePath(agent, "agents/", agent.compiledFallbackPath)
    })),
    domainPacks: domainGateCapabilityContext(domainPacksRegistry),
    policies,
    evals
  };
}

function provenanceResourceCatalog(resourceCatalog, registry) {
  const resources = [...resourceCatalog];
  const known = new Set(resources.map((resource) => resource.id));
  for (const artifact of (registry?.syntheses ?? []).flatMap((synthesis) => synthesis.artifactRefs ?? [])) {
    if (typeof artifact?.resourceId !== "string" || known.has(artifact.resourceId)) continue;
    resources.push({
      id: artifact.resourceId,
      provenanceOnly: true,
      runtimePosture: { supported: false }
    });
    known.add(artifact.resourceId);
  }
  return resources.sort((left, right) => left.id.localeCompare(right.id));
}

function compilerInventory(agentsRegistry, embeddedManifest) {
  const mirrorsBySource = new Map();
  for (const mirror of embeddedManifest?.mirrors ?? []) {
    const targets = mirrorsBySource.get(mirror.source) ?? [];
    targets.push(mirror.target);
    mirrorsBySource.set(mirror.source, targets);
  }
  const compiledOutputs = (agentsRegistry?.agents ?? [])
    .filter((agent) => typeof agent.compiledFallbackPath === "string")
    .map((agent) => ({
      id: agent.compiledFallbackPath,
      consumerRefs: [{ kind: "agent", id: agent.name }],
      mirrorOutputRefs: [...new Set(mirrorsBySource.get(agent.compiledFallbackPath) ?? [])].sort()
    }));
  const mirrorOutputs = [...new Set((embeddedManifest?.mirrors ?? []).map((mirror) => mirror.target))]
    .sort()
    .map((id) => ({ id }));
  return { compiledOutputs, mirrorOutputs };
}

function sha256Text(value) {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function sha256Bytes(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function sameRevision(left, right) {
  if (left === null || right === null) return left === right;
  return Boolean(left && right && left.kind === right.kind && left.value === right.value);
}

function receiptRelativePath(receipt) {
  const revision = receipt.reviewedRevision.value.replace(/^sha256:/, "");
  return `sources/reviews/${receipt.sourceId}/${revision}.json`;
}

function historicalReceiptSource(source, receipt) {
  return {
    ...source,
    monitor: {
      state: "CURRENT",
      checkedAt: receipt.reviewedAt,
      observedRevision: receipt.reviewedRevision,
      contentDigest: receipt.contentDigest,
      failureReason: null
    },
    runtimePosture: receipt.adoption?.runtimePosture ?? source.runtimePosture,
    affectedArtifacts: Array.isArray(receipt.affectedArtifacts)
      ? receipt.affectedArtifacts
      : source.affectedArtifacts
  };
}

async function readDocument(repositoryRoot, relativePath, label) {
  return readCanonicalJsonDocumentWithin(
    repositoryRoot,
    path.resolve(repositoryRoot, ...relativePath.split("/")),
    label
  );
}

async function readRegularEvidence(repositoryRoot, relativePath, label) {
  const candidate = path.resolve(repositoryRoot, ...relativePath.split("/"));
  const trustedPath = assertRegularFileWithin(repositoryRoot, candidate, label);
  const bytes = await readFile(trustedPath);
  assertRegularFileWithin(repositoryRoot, trustedPath, `${label} recheck`);
  return {
    relativePath,
    digest: sha256Bytes(bytes)
  };
}

function recordEvidence(evidenceByPath, entry, label) {
  const previous = evidenceByPath.get(entry.relativePath);
  if (previous !== undefined && previous !== entry.digest) {
    throw new Error(`Source governance: ${label} has conflicting immutable digests at ${entry.relativePath}`);
  }
  evidenceByPath.set(entry.relativePath, entry.digest);
}

function assertCatalogHeadMatchesReceipt(source, receipt) {
  if (!sameRevision(source.review.reviewedRevision, receipt.reviewedRevision)) {
    throw new Error(`Source governance: catalog reviewedRevision does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.reviewedDigest !== receipt.contentDigest) {
    throw new Error(`Source governance: catalog reviewedDigest does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.reviewedAt !== receipt.reviewedAt) {
    throw new Error(`Source governance: catalog reviewedAt does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.expiresAt !== receipt.expiresAt) {
    throw new Error(`Source governance: catalog expiresAt does not match immutable head receipt for ${source.id}`);
  }
  if (source.review.disposition !== receipt.adoption.disposition) {
    throw new Error(`Source governance: catalog disposition does not match immutable head receipt for ${source.id}`);
  }
}

async function validateAdoptedArtifacts({ repositoryRoot, source, receipt, evidenceByPath }) {
  if (receipt.adoption.disposition !== "SYNCED_ADOPTED") return;
  for (const artifact of receipt.artifactEvidence.artifacts) {
    const evidence = await readRegularEvidence(
      repositoryRoot,
      artifact.path,
      `adopted artifact for ${source.id}`
    );
    if (evidence.digest !== artifact.contentDigest) {
      throw new Error(
        `Source governance: adopted artifact content digest for ${artifact.path} does not match immutable head receipt`
      );
    }
    recordEvidence(evidenceByPath, evidence, `adopted artifact for ${source.id}`);
  }
}

async function recheckEvidence(repositoryRoot, evidenceByPath) {
  for (const [relativePath, expectedDigest] of [...evidenceByPath.entries()]
    .sort(([left], [right]) => left.localeCompare(right))) {
    const observed = await readRegularEvidence(
      repositoryRoot,
      relativePath,
      `trusted source evidence ${relativePath}`
    );
    if (observed.digest !== expectedDigest) {
      throw new Error(`Source governance: trusted source evidence changed during runtime inspection: ${relativePath}`);
    }
  }
}

async function validateReceiptChain({
  repositoryRoot,
  source,
  authorizedApproverIdentities,
  now,
  evidenceByPath
}) {
  let receiptPath = source.review.currentReceipt;
  let expectedDigest = source.review.receiptDigest;
  if (receiptPath === null) return 0;

  const seen = new Set();
  let count = 0;
  let childReviewedAt = null;
  while (receiptPath !== null) {
    if (seen.has(receiptPath)) {
      throw new Error(`Source governance: receipt chain for ${source.id} contains a cycle at ${receiptPath}`);
    }
    seen.add(receiptPath);
    const document = await readDocument(
      repositoryRoot,
      receiptPath,
      `immutable receipt chain for ${source.id}`
    );
    const documentDigest = sha256Text(document.text);
    const receiptEvidence = await readRegularEvidence(
      repositoryRoot,
      receiptPath,
      `immutable receipt bytes for ${source.id}`
    );
    if (receiptEvidence.digest !== documentDigest) {
      throw new Error(`Source governance: receipt changed during runtime inspection at ${receiptPath}`);
    }
    if (documentDigest !== expectedDigest) {
      throw new Error(`Source governance: receipt chain digest for ${source.id} does not match at ${receiptPath}`);
    }
    recordEvidence(evidenceByPath, receiptEvidence, `receipt chain for ${source.id}`);
    const receipt = document.parsed;
    if (receipt.sourceId !== source.id) {
      throw new Error(`Source governance: receipt chain path ${receiptPath} belongs to a different source`);
    }
    if (receiptRelativePath(receipt) !== receiptPath) {
      throw new Error(`Source governance: receipt chain path for ${source.id} is not deterministic`);
    }

    const rollback = receipt.rollbackTarget ?? {};
    const isHead = count === 0;
    if (isHead && (
      rollback.previousReceipt !== source.review.previousReceipt
      || rollback.previousReceiptDigest !== source.review.previousReceiptDigest
    )) {
      throw new Error(`Source governance: receipt chain head for ${source.id} does not match the catalog prior receipt link`);
    }
    const isCurrentReview = Boolean(
      isHead
      && source.review.state === "REVIEWED_CURRENT"
      && sameRevision(receipt.reviewedRevision, source.monitor.observedRevision)
      && receipt.contentDigest === source.monitor.contentDigest
    );
    validateSourceReviewReceipt(receipt, {
      source: isCurrentReview ? source : historicalReceiptSource(source, receipt),
      now: isCurrentReview ? now : receipt.approver?.approvedAt ?? now,
      authorizedApproverIdentities,
      expectedPreviousReceipt: rollback.previousReceipt,
      expectedPreviousReceiptDigest: rollback.previousReceiptDigest
    });
    if (isHead) {
      assertCatalogHeadMatchesReceipt(source, receipt);
      await validateAdoptedArtifacts({ repositoryRoot, source, receipt, evidenceByPath });
    }
    if (childReviewedAt !== null && Date.parse(receipt.reviewedAt) >= Date.parse(childReviewedAt)) {
      throw new Error(`Source governance: receipt chain for ${source.id} is not strictly newest to oldest`);
    }
    childReviewedAt = receipt.reviewedAt;
    receiptPath = rollback.previousReceipt;
    expectedDigest = rollback.previousReceiptDigest;
    count += 1;
  }
  return count;
}

export async function loadValidatedSourceCatalog({
  repositoryRoot,
  now,
  includeCapabilityRegistry = false
} = {}) {
  const root = path.resolve(repositoryRoot);
  const before = await readDocument(root, CATALOG_PATH, "canonical SourceCatalog v2");
  const domainPacksRegistry = await readDocument(
    root,
    "registries/domain-packs.registry.json",
    "canonical domain-packs registry for source scope validation"
  );
  const toolsRegistry = await readDocument(
    root,
    "registries/tools.registry.json",
    "canonical tools registry for source scope validation"
  );
  const methodsRegistry = includeCapabilityRegistry
    ? await readDocument(root, "registries/methods.registry.json", "canonical methods registry for source capability validation")
    : null;
  const agentsRegistry = includeCapabilityRegistry
    ? await readDocument(root, "registries/agents.registry.json", "canonical agents registry for source capability validation")
    : null;
  const skillsRegistry = includeCapabilityRegistry
    ? await readDocument(root, "registries/skills.registry.json", "canonical skills registry for source capability validation")
    : null;
  const embeddedManifest = includeCapabilityRegistry
    ? await readDocument(root, ".ai-toolkit/manifest.json", "canonical embedded manifest for compiler impact inventory")
    : null;
  const catalog = validateSourceCatalogGraph(before.parsed, {
    now,
    domainPacksRegistry: domainPacksRegistry.parsed,
    toolsRegistry: toolsRegistry.parsed
  });
  let receiptCount = 0;
  const evidenceByPath = new Map();
  for (const source of catalog.sources) {
    receiptCount += await validateReceiptChain({
      repositoryRoot: root,
      source,
      authorizedApproverIdentities: catalog.approverPolicy.authorizedIdentities,
      now,
      evidenceByPath
    });
  }
  await recheckEvidence(root, evidenceByPath);
  const after = await readDocument(root, CATALOG_PATH, "canonical SourceCatalog v2 recheck");
  if (sha256Text(before.text) !== sha256Text(after.text)) {
    throw new Error("Source governance: SourceCatalog changed during trusted runtime inspection");
  }
  validateSourceCatalogGraph(after.parsed, {
    now,
    domainPacksRegistry: domainPacksRegistry.parsed,
    toolsRegistry: toolsRegistry.parsed
  });
  let capabilityRegistry = null;
  if (includeCapabilityRegistry) {
    const capabilityDocument = await readDocument(
      root,
      CAPABILITY_REGISTRY_PATH,
      "canonical SourceCapabilityRegistry v1"
    );
    const methods = await methodCapabilityContext(root, methodsRegistry.parsed);
    const evals = await evaluationCapabilityContext(root);
    const policies = policyCapabilityContext(capabilityDocument.parsed);
    const context = sourceCapabilityContext({
      methods,
      toolsRegistry: toolsRegistry.parsed,
      skillsRegistry: skillsRegistry.parsed,
      agentsRegistry: agentsRegistry.parsed,
      domainPacksRegistry: domainPacksRegistry.parsed,
      evals,
      policies
    });
    const registry = validateSourceCapabilityRegistry(capabilityDocument.parsed, { catalog, ...context });
    const repositoryValidation = await validateSourceCapabilityRepository({
      repositoryRoot: root,
      catalog,
      registry,
      context
    });
    capabilityRegistry = {
      registry,
      resourceCatalog: provenanceResourceCatalog(buildResourceCatalog({
        repositoryRoot: root,
        agentsRegistry: agentsRegistry.parsed,
        skillsRegistry: skillsRegistry.parsed,
        toolsRegistry: toolsRegistry.parsed
      }), registry),
      compilerInventory: compilerInventory(agentsRegistry.parsed, embeddedManifest.parsed),
      warnings: [
        ...deriveSourceCapabilityWarnings(registry, { catalog, ...context }),
        ...repositoryValidation.warnings
      ]
    };
  }
  return {
    catalog,
    capabilityRegistry,
    validation: {
      schemaVersion: SOURCE_CATALOG_SCHEMA_VERSION,
      sourceCount: catalog.sources.length,
      receiptCount,
      immutableReceiptChainsValidated: true
    }
  };
}
