const PROJECT_INSTALL_CLASSES = new Set([
  "active-if-detected",
  "active-install-if-project-type",
  "active-reference",
  "approval-required",
  "default-install",
  "use-if-existing"
]);

const REQUIRED_TOOL_FIELDS = [
  "id",
  "name",
  "repository",
  "homepage",
  "purpose",
  "category",
  "status",
  "activationStatus",
  "runtimeSurface",
  "defaultUse",
  "approvalRequiredFor",
  "allowedUse",
  "forbiddenUse",
  "sourceRecordPath",
  "integrationRecordPath",
  "enterpriseRisk",
  "notes",
  "activationLevels"
];

const PROFILE_TOOL_FIELDS = [
  "lane",
  "projectTypes",
  "evidenceMode",
  "installLocation",
  "defaultInstall",
  "requiresOwnerApproval",
  "conflictGroup",
  "preferredRole",
  "forbiddenActions"
];

function requireText(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
  return value.trim();
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new Error(`${label} must be an array of non-empty strings`);
  }
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be a boolean`);
}

function requireRecord(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
}

export function validateCanonicalToolsRegistry(toolsRegistry) {
  requireRecord(toolsRegistry, "canonical tools registry");
  if (toolsRegistry.registryType !== "tools") throw new Error("canonical tools registryType must be tools");
  if (!Array.isArray(toolsRegistry.tools) || toolsRegistry.tools.length === 0) {
    throw new Error("canonical tools registry tools must be a non-empty array");
  }

  const ids = new Set();
  const names = new Set();
  for (const tool of toolsRegistry.tools) {
    requireRecord(tool, "canonical tool record");
    const id = requireText(tool.id, "canonical tool id");
    const name = requireText(tool.name, `canonical tool ${id} name`);
    if (ids.has(id)) throw new Error(`duplicate canonical tool ID: ${id}`);
    if (names.has(name)) throw new Error(`duplicate canonical tool name: ${name}`);
    ids.add(id);
    names.add(name);

    for (const field of REQUIRED_TOOL_FIELDS) {
      if (!(field in tool)) throw new Error(`canonical tool ${id} is missing required field: ${field}`);
    }
    for (const field of ["purpose", "category", "status", "activationStatus", "runtimeSurface", "defaultUse", "notes"]) {
      requireText(tool[field], `canonical tool ${id} ${field}`);
    }
    if (tool.homepage !== null && typeof tool.homepage !== "string") {
      throw new Error(`canonical tool ${id} homepage must be a string or null`);
    }
    for (const field of ["approvalRequiredFor", "allowedUse", "forbiddenUse", "activationLevels"]) {
      requireStringArray(tool[field], `canonical tool ${id} ${field}`);
    }
    if (tool.repository !== null && typeof tool.repository !== "string") {
      throw new Error(`canonical tool ${id} repository must be a string or null`);
    }
    if (tool.sourceRecordPath !== null && typeof tool.sourceRecordPath !== "string") {
      throw new Error(`canonical tool ${id} sourceRecordPath must be a string or null`);
    }
    if (tool.integrationRecordPath !== null && typeof tool.integrationRecordPath !== "string") {
      throw new Error(`canonical tool ${id} integrationRecordPath must be a string or null`);
    }
    if (tool.repository === null && tool.integrationRecordPath === null) {
      throw new Error(`canonical tool ${id} without a repository must reference an integration record`);
    }
    if (tool.sourceRecordPath === null && tool.integrationRecordPath === null) {
      throw new Error(`canonical tool ${id} must reference a source or integration record`);
    }
    requireRecord(tool.enterpriseRisk, `canonical tool ${id} enterpriseRisk`);

    if (tool.projectInstallClass === undefined) {
      if (tool.status !== "source-only") {
        throw new Error(`canonical tool ${id} must declare projectInstallClass unless status is source-only`);
      }
      continue;
    }
    if (!PROJECT_INSTALL_CLASSES.has(tool.projectInstallClass)) {
      throw new Error(`canonical tool ${id} has unknown projectInstallClass: ${tool.projectInstallClass}`);
    }
    for (const field of PROFILE_TOOL_FIELDS) {
      if (!(field in tool)) throw new Error(`canonical profile tool ${id} is missing required field: ${field}`);
    }
    for (const field of ["lane", "evidenceMode", "installLocation", "conflictGroup", "preferredRole"]) {
      requireText(tool[field], `canonical profile tool ${id} ${field}`);
    }
    for (const field of ["projectTypes", "forbiddenActions"]) {
      requireStringArray(tool[field], `canonical profile tool ${id} ${field}`);
    }
    requireBoolean(tool.defaultInstall, `canonical profile tool ${id} defaultInstall`);
    requireBoolean(tool.requiresOwnerApproval, `canonical profile tool ${id} requiresOwnerApproval`);
  }
  return toolsRegistry;
}
