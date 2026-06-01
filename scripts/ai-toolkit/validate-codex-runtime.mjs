#!/usr/bin/env node
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { ACTIVE_AGENT_FILES, ACTIVE_SKILLS, INTERNAL_HELPER_SKILLS, UNSAFE_COMMAND_PATTERNS } from "./embedded-data.mjs";

const ROOT = process.cwd();
const failures = [];

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function fail(location, message) {
  failures.push({ location, message });
}

async function exists(relativePath) {
  try {
    await stat(rootPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function listSkillNames(relativeDir) {
  try {
    return (await readdir(rootPath(relativeDir), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  return match ? match[1] : null;
}

function yamlValue(block, key) {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
}

function tomlValue(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, "m"));
  return match ? match[1].trim() : "";
}

function hasDeveloperInstructions(text) {
  return /^developer_instructions\s*=\s*"""/m.test(text) || /^developer_instructions\s*=\s*"[^"]+"/m.test(text);
}

function scanUnsafe(relativePath, text) {
  for (const pattern of UNSAFE_COMMAND_PATTERNS) {
    if (pattern.test(text)) {
      fail(relativePath, "contains an unsafe install, activation, clone, MCP, or global-config command pattern");
    }
  }
}

async function validateActiveSkills() {
  const runtimeSkills = await listSkillNames(".agents/skills");
  for (const required of ACTIVE_SKILLS) {
    if (!runtimeSkills.includes(required)) {
      fail(".agents/skills", `missing active skill ${required}`);
    }
  }
  for (const helper of INTERNAL_HELPER_SKILLS) {
    if (runtimeSkills.includes(helper)) {
      fail(`.agents/skills/${helper}`, "internal helper skill must not be user-facing runtime");
    }
  }
  for (const skill of runtimeSkills) {
    if (!ACTIVE_SKILLS.includes(skill)) {
      fail(`.agents/skills/${skill}`, "unexpected active runtime skill; active runtime must stay small");
    }
  }

  for (const skill of ACTIVE_SKILLS) {
    const canonicalPath = `skills/${skill}/SKILL.md`;
    const runtimePath = `.agents/skills/${skill}/SKILL.md`;
    if (!(await exists(canonicalPath))) {
      fail(canonicalPath, "missing canonical skill");
      continue;
    }
    if (!(await exists(runtimePath))) {
      fail(runtimePath, "missing runtime skill");
      continue;
    }
    const canonical = await readFile(rootPath(canonicalPath), "utf8");
    const runtime = await readFile(rootPath(runtimePath), "utf8");
    if (canonical !== runtime) {
      fail(runtimePath, `runtime skill drifts from canonical ${canonicalPath}`);
    }
    const fm = frontmatter(runtime);
    if (!fm) {
      fail(runtimePath, "missing YAML frontmatter");
      continue;
    }
    const name = yamlValue(fm, "name");
    const description = yamlValue(fm, "description");
    if (name !== skill) {
      fail(runtimePath, `frontmatter name must be ${skill}`);
    }
    if (!description) {
      fail(runtimePath, "missing frontmatter description");
    }
    if (!/do not|unless|without|only/i.test(description)) {
      fail(runtimePath, "description must include negative boundaries");
    }
    scanUnsafe(runtimePath, runtime);
  }
}

async function validateProjectAgents() {
  const files = await readdir(rootPath(".codex/agents")).catch(() => []);
  const tomlFiles = files.filter((file) => file.endsWith(".toml")).sort();
  for (const required of ACTIVE_AGENT_FILES) {
    if (!tomlFiles.includes(required)) {
      fail(".codex/agents", `missing active project agent ${required}`);
    }
  }
  for (const file of tomlFiles) {
    if (!ACTIVE_AGENT_FILES.includes(file)) {
      fail(`.codex/agents/${file}`, "unexpected active project agent; active project agents must match the approved runtime list");
    }
    const relativePath = `.codex/agents/${file}`;
    const text = await readFile(rootPath(relativePath), "utf8");
    const name = tomlValue(text, "name");
    const description = tomlValue(text, "description");
    if (!name) {
      fail(relativePath, "missing TOML name");
    }
    if (!description) {
      fail(relativePath, "missing TOML description");
    }
    if (!hasDeveloperInstructions(text)) {
      fail(relativePath, "missing developer_instructions");
    }
    if (/\[mcp_servers\b/.test(text) || /^mcp_servers\s*=/m.test(text)) {
      fail(relativePath, "MCP server config is not allowed in this pass");
    }
    scanUnsafe(relativePath, text);
  }
}

async function main() {
  await validateActiveSkills();
  await validateProjectAgents();

  if (failures.length === 0) {
    console.log("PASS validate-codex-runtime");
    return;
  }

  console.log("FAIL validate-codex-runtime");
  for (const failure of failures) {
    console.log(`- ${failure.location}: ${failure.message}`);
  }
  process.exitCode = 1;
}

await main().catch((error) => {
  console.error("FAIL validate-codex-runtime");
  console.error(`fatal: ${error.message}`);
  process.exitCode = 1;
});
