#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { ACTIVE_SKILLS, INTERNAL_HELPER_SKILLS } from "./ai-toolkit/embedded-data.mjs";

const ROOT = process.cwd();
const MANIFEST_PATH = ".ai-toolkit/manifest.json";
const TARGET_ROOTS = [".agents/skills", ".ai-toolkit/skills"];

function usage() {
  return `Usage:
  node scripts/sync-runtime.mjs [--dry-run]
  node scripts/sync-runtime.mjs --confirm-write
  node scripts/sync-runtime.mjs --skill <active-skill> [--confirm-write]

Dry-run is the default. This script only syncs active allowlisted skills from
skills/<skill>/SKILL.md into .agents/skills/<skill>/SKILL.md and
.ai-toolkit/skills/<skill>/SKILL.md, then updates .ai-toolkit/manifest.json
hashes when --confirm-write is supplied.
`;
}

function parseArgs(argv) {
  const args = {
    confirmWrite: false,
    help: false,
    skills: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.confirmWrite = false;
    } else if (arg === "--confirm-write") {
      args.confirmWrite = true;
    } else if (arg === "--skill") {
      const skill = argv[index + 1];
      if (!skill) {
        throw new Error("--skill requires a skill name");
      }
      args.skills.push(skill);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function assertInside(relativePath, allowedRoots) {
  const resolved = rootPath(relativePath);
  const allowed = allowedRoots.some((allowedRoot) => {
    const allowedResolved = rootPath(allowedRoot);
    return resolved === allowedResolved || resolved.startsWith(`${allowedResolved}${path.sep}`);
  });
  if (!allowed) {
    throw new Error(`Refusing path outside allowed runtime sync roots: ${relativePath}`);
  }
}

function sha256Text(text) {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

async function readTextIfPresent(relativePath) {
  try {
    return await readFile(rootPath(relativePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeText(relativePath, text) {
  assertInside(relativePath, TARGET_ROOTS);
  await mkdir(path.dirname(rootPath(relativePath)), { recursive: true });
  await writeFile(rootPath(relativePath), text, "utf8");
}

function selectSkills(requestedSkills) {
  const selected = requestedSkills.length > 0 ? requestedSkills : ACTIVE_SKILLS;
  const unique = [...new Set(selected)];
  for (const skill of unique) {
    if (INTERNAL_HELPER_SKILLS.includes(skill)) {
      throw new Error(`Refusing internal helper skill ${skill}; helpers are not active runtime skills`);
    }
    if (!ACTIVE_SKILLS.includes(skill)) {
      throw new Error(`Refusing non-allowlisted skill ${skill}; active runtime allowlist is ${ACTIVE_SKILLS.join(", ")}`);
    }
  }
  return unique;
}

function mirrorTargetsFor(skill) {
  return [
    `.agents/skills/${skill}/SKILL.md`,
    `.ai-toolkit/skills/${skill}/SKILL.md`
  ];
}

async function readManifest() {
  const manifestRaw = await readFile(rootPath(MANIFEST_PATH), "utf8");
  return JSON.parse(manifestRaw);
}

function validateManifestCoverage(manifest, actions) {
  const mirrors = manifest.mirrors || [];
  const mirrorByTarget = new Map(mirrors.map((mirror) => [mirror.target, mirror]));
  const missing = actions.filter((action) => !mirrorByTarget.has(action.target)).map((action) => action.target);

  if (missing.length > 0) {
    throw new Error(`Manifest missing mirror entries for: ${missing.join(", ")}`);
  }

  return mirrorByTarget;
}

function actionStatus(action, dryRun) {
  if (!action.needsWrite) {
    return "up-to-date";
  }
  if (dryRun) {
    return action.targetExists ? "would-update" : "would-create";
  }
  return action.targetExists ? "updated" : "created";
}

async function updateManifestHashes(manifest, mirrorByTarget, actions) {
  for (const action of actions) {
    mirrorByTarget.get(action.target).sha256 = action.expectedHash;
  }
  await writeFile(rootPath(MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function planSkill(skill) {
  const source = `skills/${skill}/SKILL.md`;
  const sourceText = await readFile(rootPath(source), "utf8");
  const expectedHash = sha256Text(sourceText);
  const actions = [];

  for (const target of mirrorTargetsFor(skill)) {
    assertInside(target, TARGET_ROOTS);
    const targetText = await readTextIfPresent(target);
    actions.push({
      skill,
      target,
      sourceText,
      expectedHash,
      targetExists: targetText !== null,
      needsWrite: targetText !== sourceText
    });
  }

  return actions;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const dryRun = !args.confirmWrite;
  const skills = selectSkills(args.skills);
  const mode = dryRun ? "dry-run" : "confirm-write";
  const allActions = [];
  for (const skill of skills) {
    allActions.push(...await planSkill(skill));
  }
  const manifest = await readManifest();
  const mirrorByTarget = validateManifestCoverage(manifest, allActions);

  console.log(`sync-runtime mode: ${mode}`);
  console.log(`skills: ${skills.join(", ")}`);

  if (!dryRun) {
    for (const action of allActions) {
      if (action.needsWrite) {
        await writeText(action.target, action.sourceText);
      }
    }
    await updateManifestHashes(manifest, mirrorByTarget, allActions);
  }

  for (const action of allActions) {
    console.log(`- ${action.skill}: ${action.target}: ${actionStatus(action, dryRun)}`);
  }

  console.log(dryRun ? "manifest: checked; hashes not written" : "manifest: hashes updated");
}

await main().catch((error) => {
  console.error(`FAIL sync-runtime: ${error.message}`);
  process.exitCode = 1;
});
