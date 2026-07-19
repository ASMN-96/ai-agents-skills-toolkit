import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCanonicalJsonWithin } from "./canonical-json.mjs";
import {
  assertDomainGate,
  DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS,
  DELIVERY_REQUEST_PLATFORM_IDS
} from "./contracts.mjs";
import { assertSourceReferenceSnapshot } from "./source-policy.mjs";

const REGISTRY_SCHEMA_VERSION = "2.0.0";
const RESULT_SCHEMA_VERSION = "1.0.0";
const MATURITY = new Set(["supported", "preview", "unavailable"]);
const PACK_KINDS = new Set(["core", "platform", "framework-overlay"]);
const PLATFORM_IDS = new Set(DELIVERY_REQUEST_PLATFORM_IDS);
const OVERLAY_IDS = new Set(DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS);
const RISKS = new Set(["low", "medium", "high", "critical"]);
const RESULT_STATUSES = new Set(["planned", "blocked"]);
const BLOCKER_CODES = new Set([
  "pack-maturity-unavailable",
  "native-environment-unavailable",
  "required-environment-unavailable"
]);
const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}

function rejectUnknownFields(value, allowed, label, issues) {
  if (!isPlainRecord(value)) return;
  for (const field of Object.keys(value)) {
    if (!allowed.has(field)) issues.push(`${label}.${field} is not allowed`);
  }
}

function requireStableId(value, label, issues) {
  if (typeof value !== "string" || !STABLE_ID.test(value)) {
    issues.push(`${label} must be a stable lowercase kebab-case ID`);
  }
}

function requireUniqueStrings(value, label, issues, { allowEmpty = false } = {}) {
  if (!Array.isArray(value)) {
    issues.push(`${label} must be an array`);
    return [];
  }
  if (!allowEmpty && value.length === 0) issues.push(`${label} must not be empty`);
  const seen = new Set();
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" || item.trim() === "") {
      issues.push(`${label}[${index}] must be a non-empty string`);
      continue;
    }
    if (seen.has(item)) issues.push(`${label}[${index}] must be unique`);
    seen.add(item);
  }
  return value;
}

function strictUniqueStrings(value, label, options) {
  const issues = [];
  const values = requireUniqueStrings(value, label, issues, options);
  if (issues.length > 0) throw new Error(`invalid domain resolution input: ${issues.join("; ")}`);
  return values;
}

function validateAlias(alias, index, issues) {
  const label = `aliases[${index}]`;
  if (!isPlainRecord(alias)) {
    issues.push(`${label} must be a plain record`);
    return;
  }
  rejectUnknownFields(
    alias,
    new Set(["id", "lifecycle", "replacementIds", "requiresExplicitTarget"]),
    label,
    issues
  );
  if (alias.id !== "cross-platform-desktop") {
    issues.push(`${label}.id must be cross-platform-desktop`);
  }
  if (alias.lifecycle !== "deprecated") issues.push(`${label}.lifecycle must be deprecated`);
  const replacements = requireUniqueStrings(alias.replacementIds, `${label}.replacementIds`, issues);
  if (
    replacements.length !== 2
    || replacements[0] !== "windows-desktop"
    || replacements[1] !== "macos-desktop"
  ) {
    issues.push(`${label}.replacementIds must be windows-desktop then macos-desktop`);
  }
  if (alias.requiresExplicitTarget !== true) {
    issues.push(`${label}.requiresExplicitTarget must be true`);
  }
}

function validatePack(pack, index, gateIds, packIds, issues) {
  const label = `packs[${index}]`;
  if (!isPlainRecord(pack)) {
    issues.push(`${label} must be a plain record`);
    return;
  }
  rejectUnknownFields(
    pack,
    new Set(["id", "displayName", "kind", "lifecycle", "maturity", "competencies", "gates"]),
    label,
    issues
  );
  requireStableId(pack.id, `${label}.id`, issues);
  if (packIds.has(pack.id)) issues.push(`${label}.id is duplicated: ${pack.id}`);
  packIds.add(pack.id);
  if (typeof pack.displayName !== "string" || pack.displayName.trim() === "") {
    issues.push(`${label}.displayName must be a non-empty string`);
  }
  if (!PACK_KINDS.has(pack.kind)) issues.push(`${label}.kind is invalid: ${pack.kind}`);
  if (pack.lifecycle !== "active") issues.push(`${label}.lifecycle must be active`);
  if (!MATURITY.has(pack.maturity)) issues.push(`${label}.maturity is invalid: ${pack.maturity}`);

  if (pack.kind === "core" && pack.id !== "enterprise-core") {
    issues.push(`${label}.id must be enterprise-core for a core pack`);
  }
  if (pack.kind === "platform" && !PLATFORM_IDS.has(pack.id)) {
    issues.push(`${label}.id is not a canonical platform pack: ${pack.id}`);
  }
  if (pack.kind === "framework-overlay" && !OVERLAY_IDS.has(pack.id)) {
    issues.push(`${label}.id is not a canonical framework overlay: ${pack.id}`);
  }

  const competencies = requireUniqueStrings(pack.competencies, `${label}.competencies`, issues);
  competencies.forEach((competency, competencyIndex) => requireStableId(
    competency,
    `${label}.competencies[${competencyIndex}]`,
    issues
  ));

  if (!Array.isArray(pack.gates) || pack.gates.length === 0) {
    issues.push(`${label}.gates must be a non-empty array`);
    return;
  }
  for (const [gateIndex, rawGate] of pack.gates.entries()) {
    let gate;
    try {
      gate = assertDomainGate(rawGate);
    } catch (error) {
      issues.push(`${label}.gates[${gateIndex}] ${error.message}`);
      continue;
    }
    if (gateIds.has(gate.id)) issues.push(`${label}.gates[${gateIndex}].id is duplicated: ${gate.id}`);
    gateIds.add(gate.id);
    if (pack.kind === "platform" && !gate.applicability.platformIds.includes(pack.id)) {
      issues.push(`${label}.gates[${gateIndex}] must apply to platform ${pack.id}`);
    }
    if (
      pack.kind === "framework-overlay"
      && !gate.applicability.frameworkOverlayIds.includes(pack.id)
    ) {
      issues.push(`${label}.gates[${gateIndex}] must apply to framework overlay ${pack.id}`);
    }
  }
}

export function assertDomainRegistry(registry) {
  if (!isPlainRecord(registry)) {
    throw new Error("invalid domain-pack registry v2: registry must be a plain record");
  }
  const issues = [];
  rejectUnknownFields(
    registry,
    new Set(["schemaVersion", "registryType", "supportPolicy", "aliases", "packs"]),
    "registry",
    issues
  );
  if (registry.schemaVersion !== REGISTRY_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be exactly ${REGISTRY_SCHEMA_VERSION}`);
  }
  if (registry.registryType !== "domain-packs") issues.push("registryType must be domain-packs");
  if (typeof registry.supportPolicy !== "string" || registry.supportPolicy.trim() === "") {
    issues.push("supportPolicy must be a non-empty string");
  }
  if (!Array.isArray(registry.aliases) || registry.aliases.length !== 1) {
    issues.push("aliases must contain exactly the deprecated cross-platform-desktop alias");
  } else {
    validateAlias(registry.aliases[0], 0, issues);
  }
  const gateIds = new Set();
  const packIds = new Set();
  if (!Array.isArray(registry.packs) || registry.packs.length === 0) {
    issues.push("packs must be a non-empty array");
  } else {
    registry.packs.forEach((pack, index) => validatePack(pack, index, gateIds, packIds, issues));
  }
  const expectedPackIds = [
    "enterprise-core",
    ...DELIVERY_REQUEST_PLATFORM_IDS,
    ...DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS
  ];
  if (
    packIds.size !== expectedPackIds.length
    || expectedPackIds.some((id) => !packIds.has(id))
  ) {
    issues.push(`packs must contain exactly: ${expectedPackIds.join(", ")}`);
  }
  if (issues.length > 0) {
    throw new Error(`invalid domain-pack registry v2: ${issues.join("; ")}`);
  }
  return deepFreeze(structuredClone(registry));
}

export function assertDomainSelectionResult(result) {
  if (!isPlainRecord(result)) {
    throw new Error("invalid DomainSelectionResult v1: result must be a plain record");
  }
  const issues = [];
  rejectUnknownFields(
    result,
    new Set([
      "schemaVersion",
      "status",
      "readinessCeiling",
      "selectedPackIds",
      "packMaturities",
      "effectiveMaturity",
      "resolvedGateIds",
      "gates",
      "requiredCompetencies",
      "missingEnvironmentCapabilities",
      "blockedGateIds",
      "blockers",
      "platformVerification",
      "releaseReadiness",
      "warnings",
      "sourceGovernance"
    ]),
    "result",
    issues
  );
  if (result.schemaVersion !== RESULT_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be exactly ${RESULT_SCHEMA_VERSION}`);
  }
  if (!RESULT_STATUSES.has(result.status)) issues.push(`status is invalid: ${result.status}`);
  if (result.readinessCeiling !== "planned") {
    issues.push("readinessCeiling must remain planned until observed evidence is ingested");
  }

  const selectedPackIds = requireUniqueStrings(result.selectedPackIds, "selectedPackIds", issues);
  const allowedPacks = new Set([
    "enterprise-core",
    ...DELIVERY_REQUEST_PLATFORM_IDS,
    ...DELIVERY_REQUEST_FRAMEWORK_OVERLAY_IDS
  ]);
  selectedPackIds.forEach((id, index) => {
    requireStableId(id, `selectedPackIds[${index}]`, issues);
    if (!allowedPacks.has(id)) issues.push(`selectedPackIds[${index}] is not a canonical pack: ${id}`);
  });
  if (!selectedPackIds.includes("enterprise-core")) {
    issues.push("selectedPackIds must include enterprise-core");
  }

  const packMaturities = [];
  if (!Array.isArray(result.packMaturities)) {
    issues.push("packMaturities must be an array");
  } else {
    result.packMaturities.forEach((entry, index) => {
      const label = `packMaturities[${index}]`;
      if (!isPlainRecord(entry)) {
        issues.push(`${label} must be a plain record`);
        return;
      }
      rejectUnknownFields(
        entry,
        new Set(["packId", "declaredMaturity", "effectiveMaturity"]),
        label,
        issues
      );
      if (entry.packId !== selectedPackIds[index]) {
        issues.push(`${label}.packId must match selectedPackIds in deterministic order`);
      }
      if (!MATURITY.has(entry.declaredMaturity)) {
        issues.push(`${label}.declaredMaturity is invalid: ${entry.declaredMaturity}`);
      }
      if (!MATURITY.has(entry.effectiveMaturity)) {
        issues.push(`${label}.effectiveMaturity is invalid: ${entry.effectiveMaturity}`);
      }
      if (
        entry.declaredMaturity === "unavailable"
        && entry.effectiveMaturity !== "unavailable"
      ) {
        issues.push(`${label}.effectiveMaturity cannot exceed an unavailable declaration`);
      }
      packMaturities.push(entry);
    });
  }
  if (packMaturities.length !== selectedPackIds.length) {
    issues.push("packMaturities must exactly cover selectedPackIds");
  }
  const derivedMaturity = packMaturities.some((entry) => entry.effectiveMaturity === "unavailable")
    ? "unavailable"
    : packMaturities.some((entry) => entry.effectiveMaturity === "preview")
      ? "preview"
      : "supported";
  if (result.effectiveMaturity !== derivedMaturity) {
    issues.push(`effectiveMaturity must equal the selected-pack aggregate: ${derivedMaturity}`);
  }

  const resolvedGateIds = requireUniqueStrings(result.resolvedGateIds, "resolvedGateIds", issues);
  resolvedGateIds.forEach((id, index) => requireStableId(id, `resolvedGateIds[${index}]`, issues));
  const gateIds = [];
  if (!Array.isArray(result.gates) || result.gates.length === 0) {
    issues.push("gates must be a non-empty array");
  } else {
    result.gates.forEach((rawGate, index) => {
      try {
        gateIds.push(assertDomainGate(rawGate).id);
      } catch (error) {
        issues.push(`gates[${index}] ${error.message}`);
      }
    });
  }
  if (JSON.stringify(gateIds) !== JSON.stringify(resolvedGateIds)) {
    issues.push("gates must exactly match resolvedGateIds in deterministic order");
  }

  const competencies = requireUniqueStrings(
    result.requiredCompetencies,
    "requiredCompetencies",
    issues
  );
  competencies.forEach((id, index) => requireStableId(id, `requiredCompetencies[${index}]`, issues));
  requireUniqueStrings(
    result.missingEnvironmentCapabilities,
    "missingEnvironmentCapabilities",
    issues,
    { allowEmpty: true }
  );
  const blockedGateIds = requireUniqueStrings(
    result.blockedGateIds,
    "blockedGateIds",
    issues,
    { allowEmpty: true }
  );
  const resolvedGateSet = new Set(resolvedGateIds);
  blockedGateIds.forEach((id, index) => {
    if (!resolvedGateSet.has(id)) issues.push(`blockedGateIds[${index}] is not a resolved gate: ${id}`);
  });

  if (!Array.isArray(result.blockers)) {
    issues.push("blockers must be an array");
  } else {
    const blockerPacks = new Set();
    result.blockers.forEach((blocker, index) => {
      const label = `blockers[${index}]`;
      if (!isPlainRecord(blocker)) {
        issues.push(`${label} must be a plain record`);
        return;
      }
      rejectUnknownFields(
        blocker,
        new Set(["code", "packId", "missingCapabilities", "gateIds"]),
        label,
        issues
      );
      if (!BLOCKER_CODES.has(blocker.code)) issues.push(`${label}.code is invalid: ${blocker.code}`);
      if (!selectedPackIds.includes(blocker.packId)) {
        issues.push(`${label}.packId is not selected: ${blocker.packId}`);
      }
      if (blockerPacks.has(blocker.packId)) issues.push(`${label}.packId must be unique`);
      blockerPacks.add(blocker.packId);
      requireUniqueStrings(
        blocker.missingCapabilities,
        `${label}.missingCapabilities`,
        issues,
        { allowEmpty: true }
      );
      const blockerGateIds = requireUniqueStrings(
        blocker.gateIds,
        `${label}.gateIds`,
        issues,
        { allowEmpty: blocker.code === "pack-maturity-unavailable" }
      );
      blockerGateIds.forEach((id, gateIndex) => {
        if (!blockedGateIds.includes(id)) {
          issues.push(`${label}.gateIds[${gateIndex}] is not blocked: ${id}`);
        }
      });
    });
  }

  if (result.platformVerification !== false) {
    issues.push("platformVerification must remain false during planning");
  }
  if (result.releaseReadiness !== false) {
    issues.push("releaseReadiness must remain false during planning");
  }
  if (!Array.isArray(result.warnings)) {
    issues.push("warnings must be an array");
  } else {
    result.warnings.forEach((warning, index) => {
      const label = `warnings[${index}]`;
      if (!isPlainRecord(warning)) {
        issues.push(`${label} must be a plain record`);
        return;
      }
      rejectUnknownFields(warning, new Set(["code", "target"]), label, issues);
      if (warning.code !== "deprecated-target-alias" || warning.target !== "cross-platform-desktop") {
        issues.push(`${label} must describe only the deprecated cross-platform-desktop alias`);
      }
    });
  }

  if (result.sourceGovernance !== undefined) {
    try {
      const sourceGovernance = assertSourceReferenceSnapshot(result.sourceGovernance);
      for (const gateId of sourceGovernance.blockedGateIds) {
        if (!resolvedGateSet.has(gateId)) {
          issues.push(`sourceGovernance.blockedGateIds contains an unresolved gate: ${gateId}`);
        }
        if (!blockedGateIds.includes(gateId)) {
          issues.push(`sourceGovernance blocked gate is missing from blockedGateIds: ${gateId}`);
        }
      }
      if (sourceGovernance.status === "blocked" && result.status !== "blocked") {
        issues.push("blocked sourceGovernance requires blocked status");
      }
    } catch (error) {
      issues.push(`sourceGovernance ${error.message}`);
    }
  }

  const hasBlocks = blockedGateIds.length > 0 || (Array.isArray(result.blockers) && result.blockers.length > 0);
  if (result.status === "blocked" && !hasBlocks) issues.push("blocked status requires blockers");
  if (result.status === "planned" && hasBlocks) issues.push("planned status cannot contain blockers");
  if (result.effectiveMaturity === "unavailable" && result.status !== "blocked") {
    issues.push("unavailable effectiveMaturity requires blocked status");
  }
  if (issues.length > 0) {
    throw new Error(`invalid DomainSelectionResult v1: ${issues.join("; ")}`);
  }
  return deepFreeze(structuredClone(result));
}

export async function loadDomainRegistry(
  registryPath = path.join(ROOT, "registries", "domain-packs.registry.json"),
  repositoryRoot = ROOT
) {
  let parsed;
  try {
    parsed = await readCanonicalJsonWithin(repositoryRoot, registryPath, "domain-pack registry");
  } catch (error) {
    throw new Error(`could not load domain-pack registry: ${error.message}`);
  }
  return assertDomainRegistry(parsed);
}

export async function loadDomainPacks(registryPath, repositoryRoot) {
  return (await loadDomainRegistry(registryPath, repositoryRoot)).packs;
}

function normalizedTargets(task) {
  if (!isPlainRecord(task?.targets)) throw new Error("domain resolution requires task.targets");
  const platforms = strictUniqueStrings(
    task.targets.platforms,
    "task.targets.platforms",
    { allowEmpty: true }
  );
  const overlays = strictUniqueStrings(
    task.targets.frameworkOverlays ?? [],
    "task.targets.frameworkOverlays",
    { allowEmpty: true }
  );
  for (const platform of platforms) {
    if (!PLATFORM_IDS.has(platform) && platform !== "cross-platform-desktop") {
      throw new Error(`domain resolution received unknown platform: ${platform}`);
    }
  }
  for (const overlay of overlays) {
    if (!OVERLAY_IDS.has(overlay)) throw new Error(`domain resolution received unknown framework overlay: ${overlay}`);
  }

  const explicitDesktop = platforms.some(
    (platform) => platform === "windows-desktop" || platform === "macos-desktop"
  );
  const hasAlias = platforms.includes("cross-platform-desktop");
  if (hasAlias && !explicitDesktop) {
    throw new Error(
      "cross-platform-desktop is deprecated and requires at least one explicit OS target: windows-desktop or macos-desktop"
    );
  }
  return {
    platforms: platforms.filter((platform) => platform !== "cross-platform-desktop"),
    overlays,
    warnings: hasAlias
      ? [{ code: "deprecated-target-alias", target: "cross-platform-desktop" }]
      : []
  };
}

function assertOverlayCompatibility(platforms, overlays) {
  const selectedPlatforms = new Set(platforms);
  for (const overlay of overlays) {
    let compatible = true;
    if (overlay === "expo-react-native") {
      const supported = new Set(["web-saas", "ios", "android"]);
      compatible = platforms.length > 0 && platforms.every((platform) => supported.has(platform));
    } else if (overlay === "electron" || overlay === "tauri") {
      const supported = new Set(["windows-desktop", "macos-desktop"]);
      compatible = platforms.length > 0
        && platforms.every((platform) => supported.has(platform))
        && [...supported].some((platform) => selectedPlatforms.has(platform));
    }
    if (!compatible) {
      throw new Error(`framework overlay ${overlay} is incompatible with the selected platforms`);
    }
  }
}

function gateApplies(gate, selectedPlatforms, selectedOverlays, scenario, risk) {
  const applicability = gate.applicability;
  const platformMatch = applicability.platformIds.length === 0
    || applicability.platformIds.some((id) => selectedPlatforms.has(id));
  const overlayMatch = applicability.frameworkOverlayIds.length === 0
    || applicability.frameworkOverlayIds.some((id) => selectedOverlays.has(id));
  const scenarioMatch = applicability.scenarioIds.length === 0
    || applicability.scenarioIds.includes(scenario);
  const riskMatch = applicability.riskLevels.length === 0
    || applicability.riskLevels.includes(risk);
  return platformMatch && overlayMatch && scenarioMatch && riskMatch;
}

function missingRequirements(gate, available) {
  const missing = gate.environmentRequirements.allOf.filter((capability) => !available.has(capability));
  const alternatives = gate.environmentRequirements.anyOf;
  if (alternatives.length > 0 && !alternatives.some((capability) => available.has(capability))) {
    missing.push(`any-of:${alternatives.join("|")}`);
  }
  return missing;
}

function addUnique(target, seen, values) {
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    target.push(value);
  }
}

export function resolveDomainSelection({ registry, task, environmentCapabilities = [] }) {
  const validatedRegistry = assertDomainRegistry(registry);
  if (!isPlainRecord(task)) throw new Error("domain resolution requires a task record");
  if (typeof task.scenario !== "string" || !STABLE_ID.test(task.scenario)) {
    throw new Error("domain resolution requires a stable scenario ID");
  }
  if (!RISKS.has(task.risk)) throw new Error(`domain resolution received invalid risk: ${task.risk}`);
  const targets = normalizedTargets(task);
  assertOverlayCompatibility(targets.platforms, targets.overlays);

  const requestedPackIds = new Set([
    "enterprise-core",
    ...targets.platforms,
    ...targets.overlays
  ]);
  const selectedPacks = validatedRegistry.packs.filter((pack) => requestedPackIds.has(pack.id));
  if (selectedPacks.length !== requestedPackIds.size) {
    const found = new Set(selectedPacks.map((pack) => pack.id));
    const missing = [...requestedPackIds].filter((id) => !found.has(id));
    throw new Error(`domain packs are not registered: ${missing.join(", ")}`);
  }

  const selectedPlatforms = new Set(targets.platforms);
  const selectedOverlays = new Set(targets.overlays);
  const available = new Set(strictUniqueStrings(
    environmentCapabilities,
    "environmentCapabilities",
    { allowEmpty: true }
  ));
  const gates = [];
  const resolvedGateIds = [];
  const gateIds = new Set();
  const requiredCompetencies = [];
  const competencyIds = new Set();
  const blockedGateIds = [];
  const blockedGateSet = new Set();
  const missingEnvironmentCapabilities = [];
  const missingCapabilitySet = new Set();
  const blockersByPack = new Map();
  const effectiveMaturityByPack = new Map();

  for (const pack of selectedPacks) {
    effectiveMaturityByPack.set(pack.id, pack.maturity);
    for (const gate of pack.gates) {
      if (!gateApplies(gate, selectedPlatforms, selectedOverlays, task.scenario, task.risk)) continue;
      if (!gateIds.has(gate.id)) {
        gateIds.add(gate.id);
        gates.push(structuredClone(gate));
        resolvedGateIds.push(gate.id);
      }
      addUnique(requiredCompetencies, competencyIds, gate.requiredCompetencies);
      const missing = missingRequirements(gate, available);
      const maturityUnavailable = pack.maturity === "unavailable";
      if (missing.length === 0 && !maturityUnavailable) continue;
      effectiveMaturityByPack.set(pack.id, "unavailable");
      addUnique(missingEnvironmentCapabilities, missingCapabilitySet, missing);
      addUnique(blockedGateIds, blockedGateSet, [gate.id]);
      const blocker = blockersByPack.get(pack.id) ?? {
        code: maturityUnavailable
          ? "pack-maturity-unavailable"
          : pack.kind === "platform" && pack.id !== "web-saas"
            ? "native-environment-unavailable"
            : "required-environment-unavailable",
        packId: pack.id,
        missingCapabilities: [],
        gateIds: []
      };
      const packMissing = new Set(blocker.missingCapabilities);
      const packGates = new Set(blocker.gateIds);
      addUnique(blocker.missingCapabilities, packMissing, missing);
      addUnique(blocker.gateIds, packGates, [gate.id]);
      blockersByPack.set(pack.id, blocker);
    }
    if (pack.maturity === "unavailable" && !blockersByPack.has(pack.id)) {
      effectiveMaturityByPack.set(pack.id, "unavailable");
      blockersByPack.set(pack.id, {
        code: "pack-maturity-unavailable",
        packId: pack.id,
        missingCapabilities: [],
        gateIds: []
      });
    }
  }

  const packMaturities = selectedPacks.map((pack) => ({
    packId: pack.id,
    declaredMaturity: pack.maturity,
    effectiveMaturity: effectiveMaturityByPack.get(pack.id)
  }));
  const effectiveMaturity = packMaturities.some((entry) => entry.effectiveMaturity === "unavailable")
    ? "unavailable"
    : packMaturities.some((entry) => entry.effectiveMaturity === "preview")
      ? "preview"
      : "supported";

  return assertDomainSelectionResult({
    schemaVersion: RESULT_SCHEMA_VERSION,
    status: blockedGateIds.length > 0 ? "blocked" : "planned",
    readinessCeiling: "planned",
    selectedPackIds: selectedPacks.map((pack) => pack.id),
    packMaturities,
    effectiveMaturity,
    resolvedGateIds,
    gates,
    requiredCompetencies,
    missingEnvironmentCapabilities,
    blockedGateIds,
    blockers: [...blockersByPack.values()],
    platformVerification: false,
    releaseReadiness: false,
    warnings: targets.warnings
  });
}

export function resolveDomainPack({ pack, environmentCapabilities = [] }) {
  if (!pack?.id) throw new Error("domain pack requires id");
  if (Array.isArray(pack.gates)) {
    throw new Error("DomainGate v2 migration required: use resolveDomainSelection with the complete registry and task targets");
  }
  if (!MATURITY.has(pack.maturity)) throw new Error(`domain pack ${pack.id} has invalid maturity`);
  const available = new Set(environmentCapabilities.map(String));
  const required = Array.isArray(pack.requiredEnvironment) ? pack.requiredEnvironment.map(String) : [];
  const missingEnvironment = required.filter((capability) => !available.has(capability));
  let effectiveMaturity = pack.maturity;
  if (pack.lifecycle !== "active" || missingEnvironment.length > 0) effectiveMaturity = "unavailable";
  return {
    id: pack.id,
    declaredMaturity: pack.maturity,
    effectiveMaturity,
    missingEnvironment,
    competencies: Array.isArray(pack.competencies) ? [...pack.competencies] : [],
    qualityGates: Array.isArray(pack.qualityGates) ? [...pack.qualityGates] : []
  };
}
