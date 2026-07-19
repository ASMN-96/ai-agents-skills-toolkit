#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { TOOLKIT_VERSION } from "../scripts/ai-toolkit/embedded-data.mjs";
import {
  collectReferencedSupportAssets,
  collectReferenceClosureFailures,
  supportDestinationForSourcePath,
  supportAssetTypeForSourcePath
} from "../scripts/ai-toolkit/reference-closure.mjs";
import {
  PROJECT_MAP_ASSET_NAME,
  PROJECT_MAP_MANIFEST_PATH,
  buildProjectMap,
  validateProjectMap
} from "./project-context-preflight.mjs";
import {
  ManagedFilesystem,
  assertPathContained,
  recoverManagedDirectoryTransaction,
  runManagedDirectoryTransaction,
  snapshotManagedTree
} from "./safe-filesystem.mjs";

const TOOLKIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_MANIFEST_SCHEMA_VERSION = "2.0.0";
const LEGACY_PROJECT_MANIFEST_SCHEMA_VERSION = "1.0.0";
const PROJECT_MANIFEST_KIND = "ai-toolkit-project-install";

function usage(command) {
  const commands = {
    install: `AI Agent Skills Toolkit project installer

Usage:
  bash install/install-project.sh --target <repo> --agents reviewer-agent --profiles audit-profile --skills governance
  bash install/install-project.sh --target <repo> --config templates/.ai-toolkit.config.example.json

Default behavior is dry-run. Add --confirm-write to copy selected files under the target .ai-toolkit/ directory.`,
    update: `AI Agent Skills Toolkit project updater

Usage:
  bash install/update-project.sh --target <repo>
  bash install/update-project.sh --target <repo> --config <config.json>

Default behavior is dry-run. Add --confirm-write to update selected files under the target .ai-toolkit/ directory.`,
    validate: `AI Agent Skills Toolkit project install validator

Usage:
  bash install/validate-project-install.sh --target <repo>`
  };

  return commands[command] ?? `Usage: node install/project-sync-core.mjs <install|update|validate> [options]`;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function appendValues(target, value) {
  target.push(...parseList(value));
}

function parseArgs(argv) {
  const options = {
    agents: [],
    profiles: [],
    skills: [],
    confirmWrite: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const readValue = (name) => {
      index += 1;
      if (index >= argv.length) fail(`${name} requires a value.`);
      return argv[index];
    };

    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--confirm-write") options.confirmWrite = true;
    else if (arg === "--target" || arg === "--target-path") options.targetPath = readValue(arg);
    else if (arg === "--config" || arg === "--config-path") options.configPath = readValue(arg);
    else if (arg === "--agents") appendValues(options.agents, readValue(arg));
    else if (arg === "--profiles") appendValues(options.profiles, readValue(arg));
    else if (arg === "--skills") appendValues(options.skills, readValue(arg));
    else if (arg.startsWith("--target=")) options.targetPath = arg.slice("--target=".length);
    else if (arg.startsWith("--target-path=")) options.targetPath = arg.slice("--target-path=".length);
    else if (arg.startsWith("--config=")) options.configPath = arg.slice("--config=".length);
    else if (arg.startsWith("--config-path=")) options.configPath = arg.slice("--config-path=".length);
    else if (arg.startsWith("--agents=")) appendValues(options.agents, arg.slice("--agents=".length));
    else if (arg.startsWith("--profiles=")) appendValues(options.profiles, arg.slice("--profiles=".length));
    else if (arg.startsWith("--skills=")) appendValues(options.skills, arg.slice("--skills=".length));
    else fail(`Unknown option: ${arg}`);
  }

  return options;
}

function resolveExisting(inputPath, label) {
  if (!inputPath || !String(inputPath).trim()) fail(`${label} is required.`);
  const resolved = path.resolve(inputPath);
  if (!existsSync(resolved)) fail(`${label} does not exist: ${resolved}`);
  return resolved;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeManagedJson(filesystem, relativePath, value) {
  filesystem.writeFile(relativePath, `${JSON.stringify(value, null, 2)}\n`, "utf8", `managed JSON ${relativePath}`);
}

function toSlash(filePath) {
  return filePath.split(path.sep).join("/");
}

function normalizeRelative(filePath) {
  return filePath.replace(/\\/g, "/").replace(/^\/+/, "");
}

function sha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function gitOutput(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function getToolkitCommit() {
  try {
    return gitOutput(TOOLKIT_ROOT, ["rev-parse", "HEAD"]);
  } catch {
    return null;
  }
}

function getJsonProperty(object, name, fallback) {
  if (!object || !Object.prototype.hasOwnProperty.call(object, name)) return fallback;
  return object[name];
}

function toStringArray(value) {
  if (value === null || value === undefined) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [String(value)];
  return value.map((entry) => String(entry).trim()).filter(Boolean);
}

function normalizeAgentName(name) {
  return path.basename(String(name).trim()).replace(/\.compiled\.md$/, "").replace(/\.md$/, "");
}

function normalizeProfileName(name) {
  let normalized = path.basename(String(name).trim()).replace(/\.md$/, "");
  const suffixed = path.join(TOOLKIT_ROOT, "profiles", `${normalized}-profile.md`);
  if (!normalized.endsWith("-profile") && existsSync(suffixed)) normalized = `${normalized}-profile`;
  return normalized;
}

function normalizeSkillName(name) {
  const trimmed = String(name).trim();
  if (/[\\/]/.test(trimmed)) fail(`Invalid skill name '${name}'. Use skill folder names only.`);
  const normalized = trimmed.replace(/\.md$/, "");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(normalized)) {
    fail(`Invalid skill name '${name}'. Use lowercase hyphen-case folder names only.`);
  }
  return normalized;
}

function walkEntries(root) {
  if (!existsSync(root)) return [];
  const entries = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    entries.push(fullPath);
    if (entry.isDirectory()) entries.push(...walkEntries(fullPath));
  }
  return entries;
}

function assertSingleFileSkill(skillRoot, skillName) {
  const skillFile = path.join(skillRoot, "SKILL.md");
  if (!existsSync(skillFile)) fail(`Skill not found: ${skillName}`);
  const extraItems = walkEntries(skillRoot).filter((entry) => path.resolve(entry) !== path.resolve(skillFile));
  if (extraItems.length > 0) {
    fail(`Skill '${skillName}' includes bundled resources. Phase 6 v1 syncs single-file skills only.`);
  }
}

function fileAction(sourcePath, destinationPath, missingLabel) {
  if (!existsSync(destinationPath)) return missingLabel;
  return sha256(sourcePath) === sha256(destinationPath) ? "Unchanged" : "Update";
}

function targetGitSafety(targetRoot, branchPolicy, refreshRemote = false) {
  try {
    if (branchPolicy !== "no-direct-main") {
      return { safe: false, message: `Unsupported branchPolicy '${branchPolicy}'. Confirm mode requires no-direct-main.` };
    }

    if (gitOutput(targetRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
      return { safe: false, message: "Target is not a Git work tree." };
    }

    const branch = gitOutput(targetRoot, ["rev-parse", "--abbrev-ref", "HEAD"]);
    if (branch === "HEAD") return { safe: false, message: "Target repository is in detached HEAD state." };
    if (branch === "main" || branch === "master") {
      return { safe: false, message: `Refusing confirm mode on target branch '${branch}' because branchPolicy is no-direct-main.` };
    }

    if (gitOutput(targetRoot, ["status", "--porcelain"])) {
      return { safe: false, message: "Target repository has dirty or uncommitted changes." };
    }

    const upstream = gitOutput(targetRoot, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
    if (!upstream) return { safe: false, message: `Target branch '${branch}' is missing an upstream.` };
    if (refreshRemote) gitOutput(targetRoot, ["fetch"]);

    const [aheadRaw, behindRaw] = gitOutput(targetRoot, ["rev-list", "--left-right", "--count", "HEAD...@{u}"]).split(/\s+/);
    const ahead = Number.parseInt(aheadRaw, 10);
    const behind = Number.parseInt(behindRaw, 10);
    if (!Number.isInteger(ahead) || !Number.isInteger(behind)) {
      return { safe: false, message: "Unable to compare target branch with upstream." };
    }
    if (ahead !== 0 || behind !== 0) {
      return {
        safe: false,
        message: `Target branch '${branch}' is not aligned with upstream '${upstream}' (ahead ${ahead}, behind ${behind}).`
      };
    }

    return { safe: true, message: `Target branch '${branch}' is clean and aligned with upstream '${upstream}'.` };
  } catch (error) {
    return { safe: false, message: `Target Git safety check failed: ${error.message}` };
  }
}

function assertTargetGitSafety(targetRoot, branchPolicy) {
  const status = targetGitSafety(targetRoot, branchPolicy, true);
  if (!status.safe) fail(status.message);
}

function resolveConfig(configPath) {
  if (!configPath) return null;
  return readJson(resolveExisting(configPath, "ConfigPath"));
}

function selectedFrom(options, config, key) {
  if (options[key].length > 0) return options[key];
  return toStringArray(getJsonProperty(config, `selected${key[0].toUpperCase()}${key.slice(1)}`, []));
}

function buildCopyPlan({ targetRoot, selectedAgents, selectedProfiles, selectedSkills, updateMode }) {
  const aiRoot = path.join(targetRoot, ".ai-toolkit");
  assertPathContained(targetRoot, aiRoot, ".ai-toolkit root");
  const destinationFor = (...segments) => assertPathContained(
    targetRoot,
    path.join(aiRoot, ...segments),
    `.ai-toolkit destination ${segments.join("/")}`
  );
  const plan = [];
  const missingLabel = updateMode ? "MissingTarget" : "Add";

  for (const agent of selectedAgents) {
    const name = normalizeAgentName(agent);
    const source = path.join(TOOLKIT_ROOT, "compiled-agents", `${name}.compiled.md`);
    if (!existsSync(source)) fail(`Compiled agent not found: ${name}`);
    const destination = destinationFor("compiled-agents", `${name}.compiled.md`);
    plan.push({
      type: "compiled-agent",
      name,
      action: fileAction(source, destination, missingLabel),
      source,
      destination,
      relativePath: `compiled-agents/${name}.compiled.md`
    });
  }

  for (const profile of selectedProfiles) {
    const name = normalizeProfileName(profile);
    const source = path.join(TOOLKIT_ROOT, "profiles", `${name}.md`);
    if (!existsSync(source)) fail(`Profile not found: ${name}`);
    const destination = destinationFor("profiles", `${name}.md`);
    plan.push({
      type: "profile",
      name,
      action: fileAction(source, destination, missingLabel),
      source,
      destination,
      relativePath: `profiles/${name}.md`
    });
  }

  for (const skill of selectedSkills) {
    const name = normalizeSkillName(skill);
    const skillRoot = path.join(TOOLKIT_ROOT, "skills", name);
    assertSingleFileSkill(skillRoot, name);
    const source = path.join(skillRoot, "SKILL.md");
    const destination = destinationFor("skills", name, "SKILL.md");
    plan.push({
      type: "skill",
      name,
      action: fileAction(source, destination, missingLabel),
      source,
      destination,
      relativePath: `skills/${name}/SKILL.md`
    });
  }

  const supportSeeds = plan
    .filter((item) => ["compiled-agent", "profile", "skill"].includes(item.type))
    .map((item) => normalizeRelative(path.relative(TOOLKIT_ROOT, item.source)));
  for (const asset of collectReferencedSupportAssets({
    root: TOOLKIT_ROOT,
    seedFiles: supportSeeds,
    includeTransitive: true
  })) {
    const relativePath = supportDestinationForSourcePath(asset.sourcePath).replace(/^\.ai-toolkit\//, "");
    const type = supportAssetTypeForSourcePath(asset.sourcePath);
    const source = path.join(TOOLKIT_ROOT, ...asset.sourcePath.split("/"));
    const destination = destinationFor(...relativePath.split("/"));
    plan.push({
      type,
      name: asset.sourcePath,
      action: fileAction(source, destination, missingLabel),
      source,
      destination,
      relativePath
    });
  }

  return plan;
}

function printCopyPlan(plan) {
  const sections = [
    ["compiled-agent", "Planned copied agents"],
    ["profile", "Planned copied profiles"],
    ["skill", "Planned copied skills"],
    ["method", "Planned copied methods"],
    ["template", "Planned copied templates"],
    ["support-doc", "Planned copied support docs"]
  ];

  for (const [type, label] of sections) {
    console.log(`${label}:`);
    const items = plan.filter((item) => item.type === type);
    if (items.length === 0) {
      console.log("  (none)");
      continue;
    }
    for (const item of items) {
      console.log(`  ${item.action.padEnd(13)} ${item.type.padEnd(15)} ${item.name} -> ${item.destination}`);
    }
  }
}

function printProjectMapPlan(projectMap, projectMapIssues) {
  console.log("Project context preflight map:");
  console.log(`  Write path:     .ai-toolkit/${PROJECT_MAP_MANIFEST_PATH}`);
  console.log(`  Target HEAD:    ${projectMap.target.gitHead ?? "unknown"}`);
  console.log(`  Package manager:${projectMap.packageManager.manager}`);
  console.log(`  Repo roots:     ${projectMap.repoRoots.map((entry) => entry.path).join(", ") || "(none)"}`);
  console.log(`  Key files:      ${projectMap.keyFiles.length}`);
  console.log(`  Validation cmds:${projectMap.validationCommands.length}`);
  console.log(`  Repomix:        ${projectMap.repomix.detected ? "detected" : "not detected"} (${projectMap.repomix.posture})`);
  if (projectMapIssues.length > 0) {
    console.log("  Safety:         blocked");
    for (const issue of projectMapIssues) console.log(`    - ${issue}`);
  } else {
    console.log("  Safety:         pass");
  }
}

function copyPlanFiles(plan, filesystem) {
  for (const item of plan) {
    if (item.action === "Unchanged") continue;
    filesystem.copyFileFrom(
      TOOLKIT_ROOT,
      item.source,
      normalizeRelative(item.relativePath),
      `.ai-toolkit destination ${item.relativePath}`
    );
  }
}

function toolkitManifest(plan, toolkitCommit, assetRoot, extraAssets = [], migration = null) {
  const assets = [
    ...plan.map((item) => ({
      type: item.type,
      name: item.name,
      path: normalizeRelative(item.relativePath),
      sha256: sha256(path.join(assetRoot, ...normalizeRelative(item.relativePath).split("/")))
    })),
    ...extraAssets.map((asset) => ({
      type: asset.type,
      name: asset.name,
      path: normalizeRelative(asset.path),
      sha256: sha256(asset.fullPath)
    }))
  ];

  return {
    schemaVersion: PROJECT_MANIFEST_SCHEMA_VERSION,
    manifestKind: PROJECT_MANIFEST_KIND,
    toolkitVersion: TOOLKIT_VERSION,
    toolkitCommit,
    generatedAtUtc: new Date().toISOString(),
    ...(migration ? { migration } : {}),
    assets: assets
      .slice()
      .sort((left, right) => left.path.localeCompare(right.path))
  };
}

function validateManagedManifest(filesystem) {
  const manifest = JSON.parse(filesystem.readFile(".ai-toolkit-manifest.json", "utf8", "managed toolkit manifest"));
  if (manifest.schemaVersion !== PROJECT_MANIFEST_SCHEMA_VERSION) {
    throw new Error(`managed toolkit manifest schemaVersion must be ${PROJECT_MANIFEST_SCHEMA_VERSION}`);
  }
  if (manifest.manifestKind !== PROJECT_MANIFEST_KIND) {
    throw new Error(`managed toolkit manifest manifestKind must be ${PROJECT_MANIFEST_KIND}`);
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    throw new Error("managed toolkit manifest must contain at least one asset");
  }
  for (const asset of manifest.assets) {
    const relativePath = normalizeRelative(String(asset?.path ?? ""));
    if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`managed toolkit manifest contains an invalid asset path: ${asset?.path ?? ""}`);
    }
    const assetPath = filesystem.assertRegularFile(relativePath, `managed manifest asset ${relativePath}`);
    if (sha256(assetPath) !== asset.sha256) {
      throw new Error(`managed toolkit manifest digest mismatch: ${relativePath}`);
    }
  }
}

function writeInstallRecords({ filesystem, config, selectedAgents, selectedProfiles, selectedSkills, toolkitCommit, updated }) {
  const writtenConfig = {
    toolkitVersion: TOOLKIT_VERSION,
    toolkitCommit,
    selectedAgents: selectedAgents.map(normalizeAgentName),
    selectedProfiles: selectedProfiles.map(normalizeProfileName),
    selectedSkills: selectedSkills.map(normalizeSkillName),
    projectContextPath: String(getJsonProperty(config, "projectContextPath", "docs/ai/PROJECT_CONTEXT.md")),
    approvalMode: String(getJsonProperty(config, "approvalMode", "manual")),
    branchPolicy: String(getJsonProperty(config, "branchPolicy", "no-direct-main")),
    allowOverwriteProjectContext: false
  };

  const versionRecord = {
    toolkitVersion: TOOLKIT_VERSION,
    toolkitCommit,
    [updated ? "updatedAtUtc" : "installedAtUtc"]: new Date().toISOString(),
    selectedAgents: writtenConfig.selectedAgents,
    selectedProfiles: writtenConfig.selectedProfiles,
    selectedSkills: writtenConfig.selectedSkills
  };

  writeManagedJson(filesystem, ".ai-toolkit-version", versionRecord);
  writeManagedJson(filesystem, ".ai-toolkit.config.json", writtenConfig);
}

function reportGitSafety(targetRoot, branchPolicy, label = "Target Git safety") {
  const status = targetGitSafety(targetRoot, branchPolicy, false);
  console.log(`${label}: ${status.safe ? "pass" : "not ready"} - ${status.message}`);
}

function runInstall(options) {
  const targetRoot = resolveExisting(options.targetPath, "TargetPath");
  const aiRoot = path.join(targetRoot, ".ai-toolkit");
  if (options.confirmWrite) {
    recoverManagedDirectoryTransaction({
      repositoryRoot: targetRoot,
      managedRoot: aiRoot,
      log: (message) => console.log(message)
    });
  }
  const config = resolveConfig(options.configPath);
  const selectedAgents = selectedFrom(options, config, "agents");
  const selectedProfiles = selectedFrom(options, config, "profiles");
  const selectedSkills = selectedFrom(options, config, "skills");

  if (selectedAgents.length === 0 && selectedProfiles.length === 0 && selectedSkills.length === 0) {
    fail("Select at least one compiled agent, profile, or skill through parameters or config. Broad installs are not allowed.");
  }
  if (Boolean(getJsonProperty(config, "allowOverwriteProjectContext", false))) {
    fail("allowOverwriteProjectContext:true is rejected in Phase 6 v1.");
  }

  const branchPolicy = String(getJsonProperty(config, "branchPolicy", "no-direct-main"));
  const toolkitCommit = getToolkitCommit();
  if (options.confirmWrite && !toolkitCommit) {
    fail("Unable to determine toolkit Git commit. Confirm mode requires a Git checkout of the toolkit repository.");
  }
  const plan = buildCopyPlan({ targetRoot, selectedAgents, selectedProfiles, selectedSkills, updateMode: false });
  const projectMap = buildProjectMap({
    targetRoot,
    selectedAgents,
    selectedProfiles,
    selectedSkills,
    toolkitCommit,
    toolkitVersion: TOOLKIT_VERSION
  });
  const projectMapIssues = validateProjectMap(projectMap, { targetRoot });

  console.log(`Toolkit version: ${TOOLKIT_VERSION}`);
  console.log(`Toolkit commit:  ${toolkitCommit ?? ""}`);
  console.log(`Target path:     ${targetRoot}`);
  console.log(`Mode:            ${options.confirmWrite ? "confirm-write" : "dry-run"}`);
  reportGitSafety(targetRoot, branchPolicy);
  console.log("");
  printCopyPlan(plan);
  console.log("");
  printProjectMapPlan(projectMap, projectMapIssues);

  if (!options.confirmWrite) {
    console.log("Dry-run only. No files were written.");
    return;
  }

  assertTargetGitSafety(targetRoot, branchPolicy);
  if (projectMapIssues.length > 0) fail("Project context preflight map has safety issues. Refusing confirm-write.");
  runManagedDirectoryTransaction({
    repositoryRoot: targetRoot,
    managedRoot: aiRoot,
    label: "project toolkit sync",
    log: (message) => console.log(message),
    prepare: (filesystem) => {
      copyPlanFiles(plan, filesystem);
      writeManagedJson(filesystem, PROJECT_MAP_MANIFEST_PATH, projectMap);
      const projectMapPath = filesystem.assertRegularFile(PROJECT_MAP_MANIFEST_PATH, "project context map");
      writeInstallRecords({ filesystem, config, selectedAgents, selectedProfiles, selectedSkills, toolkitCommit, updated: false });
      writeManagedJson(filesystem, ".ai-toolkit-manifest.json", toolkitManifest(plan, toolkitCommit, filesystem.root, [{
        type: "context-map",
        name: PROJECT_MAP_ASSET_NAME,
        path: PROJECT_MAP_MANIFEST_PATH,
        fullPath: projectMapPath
      }]));
    },
    validate: (filesystem) => validateManagedManifest(filesystem)
  });
  console.log("Install complete. Managed files were written only under .ai-toolkit/.");
}

function managedRelativePath(aiRoot, filePath) {
  return toSlash(path.relative(aiRoot, filePath));
}

function collectFiles(root) {
  if (!existsSync(root)) return [];
  const entries = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) entries.push(...collectFiles(fullPath));
    else entries.push(fullPath);
  }
  return entries;
}

function runUpdate(options) {
  const targetRoot = resolveExisting(options.targetPath, "TargetPath");
  const aiRoot = path.join(targetRoot, ".ai-toolkit");
  if (options.confirmWrite) {
    recoverManagedDirectoryTransaction({
      repositoryRoot: targetRoot,
      managedRoot: aiRoot,
      log: (message) => console.log(message)
    });
  }
  const versionPath = path.join(aiRoot, ".ai-toolkit-version");
  if (!existsSync(aiRoot)) fail("Target does not contain .ai-toolkit/. Run install-project.sh first.");
  if (!existsSync(versionPath)) fail("Missing .ai-toolkit/.ai-toolkit-version.");
  const installedFilesystem = new ManagedFilesystem({
    repositoryRoot: targetRoot,
    managedRoot: aiRoot,
    label: "installed project toolkit"
  });
  installedFilesystem.assertRegularFile(".ai-toolkit-version", "installed toolkit version");

  const defaultConfigPath = path.join(aiRoot, ".ai-toolkit.config.json");
  const configPath = options.configPath ? resolveExisting(options.configPath, "ConfigPath") : defaultConfigPath;
  if (!existsSync(configPath)) fail(`Missing config file: ${configPath}`);
  const installedVersion = readJson(versionPath);
  if (!options.configPath) installedFilesystem.assertRegularFile(configPath, "installed toolkit config");
  const config = readJson(configPath);
  installedFilesystem.assertRegularFile(".ai-toolkit-manifest.json", "installed toolkit manifest");
  const installedManifest = readManagedJson(
    installedFilesystem,
    ".ai-toolkit-manifest.json",
    "installed toolkit manifest"
  );
  const installedManifestSchema = String(getJsonProperty(installedManifest, "schemaVersion", ""));
  if (![LEGACY_PROJECT_MANIFEST_SCHEMA_VERSION, PROJECT_MANIFEST_SCHEMA_VERSION].includes(installedManifestSchema)) {
    fail(`Unsupported installed toolkit manifest schemaVersion: ${installedManifestSchema || "<missing>"}.`);
  }
  const migration = installedManifestSchema === LEGACY_PROJECT_MANIFEST_SCHEMA_VERSION
    ? {
        fromSchemaVersion: LEGACY_PROJECT_MANIFEST_SCHEMA_VERSION,
        previousToolkitVersion: String(getJsonProperty(installedVersion, "toolkitVersion", "unknown")),
        previousToolkitCommit: String(getJsonProperty(installedVersion, "toolkitCommit", "unknown")),
        previousToolkitPin: `${String(getJsonProperty(installedVersion, "toolkitVersion", "unknown"))}@${String(getJsonProperty(installedVersion, "toolkitCommit", "unknown"))}`
      }
    : getJsonProperty(installedManifest, "migration", null);

  if (Boolean(getJsonProperty(config, "allowOverwriteProjectContext", false))) {
    fail("allowOverwriteProjectContext:true is rejected in Phase 6 v1.");
  }

  const selectedAgents = toStringArray(getJsonProperty(config, "selectedAgents", []));
  const selectedProfiles = toStringArray(getJsonProperty(config, "selectedProfiles", []));
  const selectedSkills = toStringArray(getJsonProperty(config, "selectedSkills", []));
  if (selectedAgents.length === 0 && selectedProfiles.length === 0 && selectedSkills.length === 0) {
    fail("Config must select at least one compiled agent, profile, or skill.");
  }

  const branchPolicy = String(getJsonProperty(config, "branchPolicy", "no-direct-main"));
  const toolkitCommit = getToolkitCommit();
  if (options.confirmWrite && !toolkitCommit) {
    fail("Unable to determine toolkit Git commit. Confirm mode requires a Git checkout of the toolkit repository.");
  }

  const plan = buildCopyPlan({ targetRoot, selectedAgents, selectedProfiles, selectedSkills, updateMode: true });
  const managedPaths = new Set(plan.map((item) => normalizeRelative(item.relativePath)));
  managedPaths.add(PROJECT_MAP_MANIFEST_PATH);
  const projectMap = buildProjectMap({
    targetRoot,
    selectedAgents,
    selectedProfiles,
    selectedSkills,
    toolkitCommit,
    toolkitVersion: TOOLKIT_VERSION
  });
  const projectMapIssues = validateProjectMap(projectMap, { targetRoot });
  const unmanaged = [];
  for (const folder of ["compiled-agents", "profiles", "skills", "methods", "templates", "docs", "context"]) {
    for (const filePath of collectFiles(path.join(aiRoot, folder))) {
      const relative = managedRelativePath(aiRoot, filePath);
      if (!managedPaths.has(relative)) unmanaged.push(filePath);
    }
  }

  console.log(`Installed toolkit version: ${getJsonProperty(installedVersion, "toolkitVersion", "unknown")}`);
  console.log(`Installed toolkit commit:  ${getJsonProperty(installedVersion, "toolkitCommit", "unknown")}`);
  console.log(`Current toolkit version:   ${TOOLKIT_VERSION}`);
  console.log(`Current toolkit commit:    ${toolkitCommit ?? ""}`);
  console.log(`Mode:                      ${options.confirmWrite ? "confirm-write" : "dry-run"}`);
  reportGitSafety(targetRoot, branchPolicy, "Target Git safety");
  console.log("");
  printCopyPlan(plan);
  console.log("");
  printProjectMapPlan(projectMap, projectMapIssues);

  if (unmanaged.length > 0) {
    console.log("Unmanaged files reported only; Phase 6 v1 does not delete stale files:");
    for (const filePath of unmanaged) console.log(`  ${filePath}`);
  }

  if (!options.confirmWrite) {
    console.log("Dry-run only. No files were written.");
    return;
  }

  assertTargetGitSafety(targetRoot, branchPolicy);
  if (projectMapIssues.length > 0) fail("Project context preflight map has safety issues. Refusing confirm-write.");
  runManagedDirectoryTransaction({
    repositoryRoot: targetRoot,
    managedRoot: aiRoot,
    label: "project toolkit sync",
    log: (message) => console.log(message),
    prepare: (filesystem) => {
      copyPlanFiles(plan, filesystem);
      writeManagedJson(filesystem, PROJECT_MAP_MANIFEST_PATH, projectMap);
      const projectMapPath = filesystem.assertRegularFile(PROJECT_MAP_MANIFEST_PATH, "project context map");
      writeInstallRecords({ filesystem, config, selectedAgents, selectedProfiles, selectedSkills, toolkitCommit, updated: true });
      writeManagedJson(filesystem, ".ai-toolkit-manifest.json", toolkitManifest(plan, toolkitCommit, filesystem.root, [{
        type: "context-map",
        name: PROJECT_MAP_ASSET_NAME,
        path: PROJECT_MAP_MANIFEST_PATH,
        fullPath: projectMapPath
      }], migration));
    },
    validate: (filesystem) => validateManagedManifest(filesystem)
  });
  console.log("Update complete. Managed files were written only under .ai-toolkit/.");
}

function buildManifestAssetMap(manifest) {
  const map = new Map();
  for (const asset of Array.isArray(manifest?.assets) ? manifest.assets : []) {
    const assetPath = normalizeRelative(String(getJsonProperty(asset, "path", "")));
    if (assetPath) map.set(assetPath, asset);
  }
  return map;
}

function readManagedJson(filesystem, relativePath, label) {
  return JSON.parse(filesystem.readFile(relativePath, "utf8", label));
}

function testSkillFrontmatter(filesystem, relativePath, expectedName) {
  const issues = [];
  let text;
  try {
    text = filesystem.readFile(relativePath, "utf8", `installed skill ${expectedName}`);
  } catch (error) {
    return [`Skill ${expectedName} could not be read safely: ${error.message}`];
  }
  const lines = text.split(/\r?\n/);
  if (lines.length < 4 || lines[0] !== "---") return [`Skill ${expectedName} has invalid YAML frontmatter.`];
  const closingIndex = lines.findIndex((line, index) => index > 0 && line === "---");
  if (closingIndex < 0) return [`Skill ${expectedName} is missing closing YAML frontmatter marker.`];
  if (closingIndex <= 1) return [`Skill ${expectedName} frontmatter is empty.`];

  const values = new Map();
  for (const line of lines.slice(1, closingIndex)) {
    const match = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (match) values.set(match[1], match[2].trim());
  }

  if (!values.has("name")) issues.push(`Skill ${expectedName} frontmatter is missing name.`);
  if (!values.has("description")) issues.push(`Skill ${expectedName} frontmatter is missing description.`);
  if (values.has("name") && values.get("name") !== expectedName) {
    issues.push(`Skill ${expectedName} frontmatter name does not match selected skill.`);
  }
  return issues;
}

function testManifestAsset({ filesystem, manifestAssets, relativePath, type, name }) {
  const issues = [];
  const normalizedPath = normalizeRelative(relativePath);
  let contents;
  try {
    filesystem.assertRegularFile(normalizedPath, `installed ${type} ${name}`);
    contents = filesystem.readFile(normalizedPath, null, `installed ${type} ${name}`);
  } catch (error) {
    return [`Missing or unsafe ${type}: ${name}: ${error.message}`];
  }
  if (!manifestAssets.has(normalizedPath)) return [`Manifest is missing ${type} asset: ${normalizedPath}`];

  const asset = manifestAssets.get(normalizedPath);
  const expectedHash = String(getJsonProperty(asset, "sha256", ""));
  if (!/^[0-9a-fA-F]{64}$/.test(expectedHash)) {
    issues.push(`Manifest asset ${normalizedPath} has invalid sha256.`);
  } else {
    const actualHash = createHash("sha256").update(contents).digest("hex").toLowerCase();
    if (actualHash !== expectedHash.toLowerCase()) issues.push(`Manifest hash mismatch for ${normalizedPath}.`);
  }

  const assetType = String(getJsonProperty(asset, "type", ""));
  const assetName = String(getJsonProperty(asset, "name", ""));
  if (assetType !== type) issues.push(`Manifest asset ${normalizedPath} has type '${assetType}', expected '${type}'.`);
  if (assetName !== name) issues.push(`Manifest asset ${normalizedPath} has name '${assetName}', expected '${name}'.`);
  return issues;
}

function basenameMatchesPattern(filePath, pattern) {
  const name = path.basename(filePath);
  if (pattern === ".env.*") return name.startsWith(".env.");
  if (pattern.startsWith("*.")) return name.endsWith(pattern.slice(1));
  return name === pattern;
}

function runValidate(options) {
  const targetRoot = resolveExisting(options.targetPath, "TargetPath");
  const aiRoot = path.join(targetRoot, ".ai-toolkit");
  const failures = [];
  let upgradeRequired = false;
  let installedFilesystem = null;
  let managedSnapshot = [];

  if (!existsSync(aiRoot)) {
    failures.push("Missing .ai-toolkit/ directory.");
  } else {
    try {
      installedFilesystem = new ManagedFilesystem({
        repositoryRoot: targetRoot,
        managedRoot: aiRoot,
        label: "installed project toolkit"
      });
      managedSnapshot = snapshotManagedTree(targetRoot, aiRoot, "installed project toolkit validation");
      for (const [relativePath, missingMessage] of [
        [".ai-toolkit-version", "Missing .ai-toolkit/.ai-toolkit-version."],
        [".ai-toolkit.config.json", "Missing .ai-toolkit/.ai-toolkit.config.json."],
        [
          ".ai-toolkit-manifest.json",
          "Missing .ai-toolkit/.ai-toolkit-manifest.json. Rerun update-project.sh --confirm-write from a clean aligned feature branch."
        ]
      ]) {
        try {
          installedFilesystem.assertRegularFile(relativePath, `required installed toolkit record ${relativePath}`);
        } catch {
          failures.push(missingMessage);
        }
      }
    } catch (error) {
      failures.push(`Installed toolkit filesystem is unsafe: ${error.message}`);
    }
  }

  if (failures.length === 0 && installedFilesystem) {
    try {
    const versionRecord = readManagedJson(
      installedFilesystem,
      ".ai-toolkit-version",
      "installed toolkit version"
    );
    const config = readManagedJson(
      installedFilesystem,
      ".ai-toolkit.config.json",
      "installed toolkit config"
    );
    const manifest = readManagedJson(
      installedFilesystem,
      ".ai-toolkit-manifest.json",
      "installed toolkit manifest"
    );
    const recordedToolkitVersion = String(getJsonProperty(versionRecord, "toolkitVersion", ""));
    const recordedToolkitCommit = String(getJsonProperty(versionRecord, "toolkitCommit", ""));
    const selectedAgents = toStringArray(getJsonProperty(config, "selectedAgents", []));
    const selectedProfiles = toStringArray(getJsonProperty(config, "selectedProfiles", []));
    const selectedSkills = toStringArray(getJsonProperty(config, "selectedSkills", []));
    const manifestAssets = buildManifestAssetMap(manifest);

    const manifestSchemaVersion = String(getJsonProperty(manifest, "schemaVersion", ""));
    if (manifestSchemaVersion === LEGACY_PROJECT_MANIFEST_SCHEMA_VERSION) {
      upgradeRequired = true;
    } else if (manifestSchemaVersion !== PROJECT_MANIFEST_SCHEMA_VERSION) {
      failures.push(`Manifest schemaVersion must be ${PROJECT_MANIFEST_SCHEMA_VERSION}.`);
    }
    if (!upgradeRequired && String(getJsonProperty(manifest, "manifestKind", "")) !== PROJECT_MANIFEST_KIND) {
      failures.push(`Manifest manifestKind must be ${PROJECT_MANIFEST_KIND}.`);
    }
    if (String(getJsonProperty(manifest, "toolkitCommit", "")) !== recordedToolkitCommit) {
      failures.push("Manifest toolkitCommit must match .ai-toolkit-version.");
    }
    if (String(getJsonProperty(manifest, "toolkitVersion", "")) !== recordedToolkitVersion) {
      failures.push("Manifest toolkitVersion must match .ai-toolkit-version.");
    }
    if (!recordedToolkitVersion) failures.push("Missing toolkitVersion in .ai-toolkit/.ai-toolkit-version.");
    if (!recordedToolkitCommit || recordedToolkitCommit === "unknown") {
      failures.push("Missing resolved toolkitCommit in .ai-toolkit/.ai-toolkit-version.");
    }
    if (Boolean(getJsonProperty(config, "allowOverwriteProjectContext", false))) {
      failures.push("Config has allowOverwriteProjectContext:true, which is rejected in Phase 6 v1.");
    }

    for (const agent of selectedAgents) {
      const name = normalizeAgentName(agent);
      failures.push(...testManifestAsset({
        filesystem: installedFilesystem,
        manifestAssets,
        relativePath: `compiled-agents/${name}.compiled.md`,
        type: "compiled-agent",
        name
      }));
    }

    for (const profile of selectedProfiles) {
      const name = normalizeProfileName(profile);
      failures.push(...testManifestAsset({
        filesystem: installedFilesystem,
        manifestAssets,
        relativePath: `profiles/${name}.md`,
        type: "profile",
        name
      }));
    }

    for (const skill of selectedSkills) {
      const name = normalizeSkillName(skill);
      const relativePath = `skills/${name}/SKILL.md`;
      failures.push(...testManifestAsset({
        filesystem: installedFilesystem,
        manifestAssets,
        relativePath,
        type: "skill",
        name
      }));
      failures.push(...testSkillFrontmatter(installedFilesystem, relativePath, name));
    }

    failures.push(...testManifestAsset({
      filesystem: installedFilesystem,
      manifestAssets,
      relativePath: PROJECT_MAP_MANIFEST_PATH,
      type: "context-map",
      name: PROJECT_MAP_ASSET_NAME
    }));
    try {
      const projectMap = readManagedJson(
        installedFilesystem,
        PROJECT_MAP_MANIFEST_PATH,
        "installed project context preflight map"
      );
      for (const issue of validateProjectMap(projectMap, { targetRoot })) {
        failures.push(`Project context preflight map invalid: ${issue}`);
      }
    } catch (error) {
      failures.push(`Project context preflight map is not valid or safely readable JSON: ${error.message}`);
    }

    for (const failure of collectReferenceClosureFailures({ root: targetRoot })) {
      failures.push(`[${failure.check}] ${failure.location}: ${failure.message}`);
    }

    const contextNames = new Set(["AGENTS.md", "STATE.md", "DECISIONS.md", "PROJECT_CONTEXT.md", "RELEASE_GATES.md"]);
    for (const entry of managedSnapshot.filter((item) => item.type === "file")) {
      if (contextNames.has(path.posix.basename(entry.path))) {
        failures.push("Project-local context files were found inside .ai-toolkit managed files.");
      }
    }

    const unsafeFilePatterns = [".env", ".env.*", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "npm-shrinkwrap.json", "*.log"];
    for (const entry of managedSnapshot.filter((item) => item.type === "file")) {
      if (unsafeFilePatterns.some((pattern) => basenameMatchesPattern(entry.path, pattern))) {
        failures.push(`Unsafe artifact found: ${path.join(aiRoot, ...entry.path.split("/"))}`);
      }
    }

    const unsafeDirectories = new Set(["node_modules", ".cache", "dist", "build", "temp", "scratch"]);
    for (const entry of managedSnapshot.filter((item) => item.type === "directory")) {
      if (unsafeDirectories.has(path.posix.basename(entry.path))) {
        failures.push(`Unsafe directory found: ${path.join(aiRoot, ...entry.path.split("/"))}`);
      }
    }
    } catch (error) {
      failures.push(`Installed toolkit records could not be read safely: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.log("Validation failed:");
    for (const failure of failures) console.log(`- ${failure}`);
    process.exit(1);
  }

  if (upgradeRequired) {
    console.log(
      `Validation status: upgradeRequired. Installed manifest schemaVersion ${LEGACY_PROJECT_MANIFEST_SCHEMA_VERSION} must be migrated with update-project --confirm-write.`
    );
    process.exitCode = 2;
    return;
  }

  console.log("Validation passed. Installed toolkit files are present and no unsafe .ai-toolkit artifacts were found.");
}

const [command, ...rest] = process.argv.slice(2);
if (!command || !["install", "update", "validate"].includes(command)) {
  console.log(usage(command));
  process.exit(command ? 1 : 0);
}

const options = parseArgs(rest);
if (options.help) {
  console.log(usage(command));
  process.exit(0);
}

if (command === "install") runInstall(options);
else if (command === "update") runUpdate(options);
else runValidate(options);
