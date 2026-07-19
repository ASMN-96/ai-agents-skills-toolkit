#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ACTIVE_SKILLS, INTERNAL_HELPER_SKILLS } from "./ai-toolkit/embedded-data.mjs";
import {
  CANONICAL_TEXT_DIGEST_MODE,
  canonicalTextSha256
} from "./ai-toolkit/kernel/canonical-digest.mjs";

const ROOT = process.cwd();
const MANIFEST_PATH = ".ai-toolkit/manifest.json";
const TARGET_ROOTS = [".agents/skills", ".ai-toolkit/skills"];
const SKILL_WARN_WORDS = 800;
const SKILL_MAX_WORDS = 1200;

function usage() {
  return `Usage:
  node scripts/sync-runtime.mjs [--dry-run]
  node scripts/sync-runtime.mjs --check
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
    check: false,
    help: false,
    skills: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--dry-run") {
      args.confirmWrite = false;
      args.check = false;
    } else if (arg === "--confirm-write") {
      args.confirmWrite = true;
      args.check = false;
    } else if (arg === "--check") {
      args.confirmWrite = false;
      args.check = true;
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

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function skillBudgetStatus(words) {
  return words > SKILL_WARN_WORDS ? `WARN word-budget>${SKILL_WARN_WORDS}` : "size-ok";
}

async function readBytesIfPresent(relativePath) {
  try {
    return await readFile(rootPath(relativePath));
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function writeBytes(relativePath, bytes) {
  assertInside(relativePath, TARGET_ROOTS);
  await mkdir(path.dirname(rootPath(relativePath)), { recursive: true });
  await writeFile(rootPath(relativePath), bytes);
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
  const withoutCrLf = manifestRaw.replaceAll("\r\n", "");
  const hasCrLf = manifestRaw.includes("\r\n");
  const hasBareLf = withoutCrLf.includes("\n");
  const hasLoneCr = withoutCrLf.includes("\r");
  if ((hasCrLf && hasBareLf) || hasLoneCr) {
    throw new Error("Mixed or lone-CR manifest line endings are not supported");
  }
  const eol = hasCrLf ? "\r\n" : "\n";
  return {
    manifest: JSON.parse(manifestRaw),
    eol,
    hasTerminalEol: manifestRaw.endsWith("\n") || manifestRaw.endsWith("\r")
  };
}

function validateManifestDigestMode(manifest) {
  if (!manifest || !Object.hasOwn(manifest, "digestMode")) {
    throw new Error(`Manifest digestMode is required; expected ${CANONICAL_TEXT_DIGEST_MODE}`);
  }
  if (manifest.digestMode !== CANONICAL_TEXT_DIGEST_MODE) {
    throw new Error(
      `Unsupported manifest digestMode ${JSON.stringify(manifest.digestMode)}; expected ${CANONICAL_TEXT_DIGEST_MODE}`
    );
  }
}

function validateManifestCoverage(manifest, actions) {
  const mirrors = manifest.mirrors || [];
  const mirrorByTarget = new Map(mirrors.map((mirror) => [mirror.target, mirror]));
  const missing = actions
    .filter((action) => action.target.startsWith(".ai-toolkit/") && !mirrorByTarget.has(action.target))
    .map((action) => action.target);

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

async function updateManifestHashes(manifestState, mirrorByTarget, actions) {
  const { manifest, eol, hasTerminalEol } = manifestState;
  for (const action of actions) {
    const mirror = mirrorByTarget.get(action.target);
    if (mirror) {
      mirror.sha256 = action.expectedHash;
    }
  }
  const serialized = JSON.stringify(manifest, null, 2).replaceAll("\n", eol);
  await writeFile(rootPath(MANIFEST_PATH), `${serialized}${hasTerminalEol ? eol : ""}`, "utf8");
}

async function planSkill(skill) {
  const source = `skills/${skill}/SKILL.md`;
  const sourceBytes = await readFile(rootPath(source));
  const sourceText = sourceBytes.toString("utf8");
  const words = countWords(sourceText);
  if (words > SKILL_MAX_WORDS) {
    throw new Error(`runtime skill ${skill} word budget exceeds ${SKILL_MAX_WORDS} words: ${words}`);
  }
  const expectedHash = canonicalTextSha256(sourceBytes, `runtime skill ${skill}`);
  const actions = [];

  for (const target of mirrorTargetsFor(skill)) {
    assertInside(target, TARGET_ROOTS);
    const targetBytes = await readBytesIfPresent(target);
    actions.push({
      skill,
      target,
      sourceBytes,
      expectedHash,
      targetExists: targetBytes !== null,
      needsWrite: targetBytes === null || !sourceBytes.equals(targetBytes)
    });
  }

  return { skill, words, budgetStatus: skillBudgetStatus(words), actions };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const dryRun = !args.confirmWrite && !args.check;
  const skills = selectSkills(args.skills);
  const mode = args.confirmWrite ? "confirm-write" : args.check ? "check" : "dry-run";
  const plans = [];
  const allActions = [];
  for (const skill of skills) {
    const plan = await planSkill(skill);
    plans.push(plan);
    allActions.push(...plan.actions);
  }
  const manifestState = await readManifest();
  validateManifestDigestMode(manifestState.manifest);
  const mirrorByTarget = validateManifestCoverage(manifestState.manifest, allActions);

  if (args.check) {
    const contentDrift = allActions.filter((action) => action.needsWrite).map((action) => action.target);
    if (contentDrift.length > 0) {
      throw new Error(`runtime mirror check drift detected: ${contentDrift.join(", ")}`);
    }
    const hashDrift = allActions
      .filter((action) => {
        const mirror = mirrorByTarget.get(action.target);
        return mirror && mirror.sha256 !== action.expectedHash;
      })
      .map((action) => action.target);
    if (hashDrift.length > 0) {
      throw new Error(`manifest hash drift detected during runtime mirror check: ${hashDrift.join(", ")}`);
    }
  }

  console.log(`sync-runtime mode: ${mode}`);
  console.log(`skills: ${skills.join(", ")}`);
  for (const plan of plans) {
    console.log(`- ${plan.skill}: words=${plan.words}; ${plan.budgetStatus}`);
  }

  if (args.confirmWrite) {
    for (const action of allActions) {
      if (action.needsWrite) {
        await writeBytes(action.target, action.sourceBytes);
      }
    }
    await updateManifestHashes(manifestState, mirrorByTarget, allActions);
  }

  for (const action of allActions) {
    console.log(`- ${action.skill}: ${action.target}: ${args.check ? "up-to-date" : actionStatus(action, dryRun)}`);
  }

  console.log(
    args.confirmWrite
      ? "manifest: hashes updated"
      : args.check
        ? "manifest: content and hashes verified"
        : "manifest: checked; hashes not written"
  );
}

await main().catch((error) => {
  console.error(`FAIL sync-runtime: ${error.message}`);
  process.exitCode = 1;
});
