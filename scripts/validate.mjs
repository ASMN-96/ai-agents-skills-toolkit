#!/usr/bin/env node
// Machine-checkable rules only: frontmatter, sizes, budget, lock hashes, licenses, link closure.
// It never greps prose for required phrases. Run: node scripts/validate.mjs
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { ROOT, readLock, renderNotice, sha256 } from "./vendor.mjs";

const LIMITS = { skills: 12, descChars: 250, budgetChars: 4000, skillLines: 120, authoredLines: 1500, vendoredWarnLines: 500, scripts: 3, scriptLines: 200 };
const LISTING_OVERHEAD = 109; // per-skill characters Claude adds around each description in its skill list
const MODELS = new Set(["opus", "sonnet", "haiku", "inherit"]);
const EFFORTS = new Set(["low", "medium", "high", "xhigh", "max"]);
const failures = [];
const warnings = [];
const fail = (rule, msg) => failures.push(`[${rule}] ${msg}`);
const warn = (rule, msg) => warnings.push(`[${rule}] ${msg}`);
const rel = (p) => relative(ROOT, p).split(sep).join("/");
const read = (p) => readFileSync(p, "utf8");
const lines = (p) => read(p).split("\n").length;

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === "results") continue;
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

// Minimal YAML frontmatter: scalars, folded/literal blocks, and simple lists.
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const data = {};
  let key = null;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (kv) {
      key = kv[1];
      const v = kv[2].trim();
      data[key] = v === "" ? [] : /^[>|]-?$/.test(v) ? "" : v.replace(/^["']|["']$/g, "");
    } else if (key && /^\s+-\s+/.test(line) && Array.isArray(data[key])) {
      data[key].push(line.replace(/^\s+-\s+/, "").trim());
    } else if (key && /^\s+\S/.test(line) && typeof data[key] === "string") {
      data[key] = (data[key] + " " + line.trim()).trim();
    }
  }
  return data;
}

const lock = readLock();
const lockedPaths = new Set(lock.files.map((f) => f.to));
const skillDirs = existsSync(join(ROOT, "skills")) ? readdirSync(join(ROOT, "skills")).filter((d) => statSync(join(ROOT, "skills", d)).isDirectory()) : [];

// R1-R4: route skills are the only model-visible skills; frontmatter, size, and listing budget.
let budget = 0;
for (const dir of skillDirs) {
  const file = join(ROOT, "skills", dir, "SKILL.md");
  if (!existsSync(file)) { fail("R1", `skills/${dir} has no SKILL.md`); continue; }
  const fm = frontmatter(read(file));
  if (!fm || !fm.name || !fm.description) { fail("R1", `${rel(file)} needs name and description frontmatter`); continue; }
  if (fm.name !== dir || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name) || fm.name.length > 64) fail("R1", `${rel(file)} name must be kebab-case and equal the folder name`);
  if (fm.description.length > LIMITS.descChars) fail("R2", `${rel(file)} description is ${fm.description.length} chars (max ${LIMITS.descChars})`);
  if (fm["disable-model-invocation"] !== "true") budget += fm.description.length + LISTING_OVERHEAD;
  if (lines(file) > LIMITS.skillLines) fail("R3", `${rel(file)} is ${lines(file)} lines (max ${LIMITS.skillLines})`);
}
if (skillDirs.length > LIMITS.skills) fail("R4", `${skillDirs.length} skills (max ${LIMITS.skills})`);
if (budget > LIMITS.budgetChars) fail("R4", `listing budget ${budget} chars (max ${LIMITS.budgetChars})`);

// R5: nothing else may register as a skill (only skills/<route>/SKILL.md is allowed).
for (const p of walk(join(ROOT, "skills"))) {
  if (p.endsWith(`${sep}SKILL.md`) && dirname(dirname(p)) !== join(ROOT, "skills")) fail("R5", `${rel(p)} would register as an extra skill; vendor it as UPSTREAM.md`);
}

// R6-R7: every vendored file is locked, present, unmodified, and licensed.
for (const f of lock.files) {
  const p = join(ROOT, f.to);
  if (!lock.sources[f.source]) fail("R6", `${f.to} names unknown source ${f.source}`);
  if (!existsSync(p)) { fail("R6", `${f.to} is in the lock but missing`); continue; }
  if (sha256(readFileSync(p)) !== f.sha256) fail("R6", `${f.to} differs from its locked sha256 (edit upstream, not the copy)`);
  if (lines(p) > LIMITS.vendoredWarnLines) warn("R6", `${f.to} is ${lines(p)} lines`);
}
for (const p of walk(join(ROOT, "skills"))) {
  if (rel(p).includes("/upstream/") && !lockedPaths.has(rel(p))) fail("R6", `${rel(p)} is under upstream/ but not in sources/lock.json`);
}
for (const [repo, src] of Object.entries(lock.sources)) {
  if (!src.license || !/^[0-9a-f]{40}$/.test(src.commit || "")) fail("R7", `${repo} needs a license and a full 40-char commit`);
}
for (const d of new Set(lock.files.filter((f) => f.to.includes("/upstream/")).map((f) => f.to.split("/").slice(0, 4).join("/")))) {
  if (!existsSync(join(ROOT, d, "LICENSE"))) fail("R7", `${d} has no LICENSE next to the vendored file`);
}

// R8: closure. Relative links and backticked file paths in skills must resolve.
const pathRef = /\]\((\.{1,2}\/[^)#\s]+)|`((?:\.{1,2}\/|upstream\/|references\/)[^`\s]+\.md)`/g;
for (const p of walk(join(ROOT, "skills")).filter((x) => x.endsWith(".md"))) {
  for (const m of read(p).matchAll(pathRef)) {
    const target = m[1] || m[2];
    if (!existsSync(join(dirname(p), target))) {
      const base = join(ROOT, "skills", rel(p).split("/")[1]);
      if (!existsSync(join(base, target))) fail("R8", `${rel(p)} references ${target}, which does not exist`);
    }
  }
}

// R9: agents use aliases, valid effort, and preload only skills that exist here.
for (const p of walk(join(ROOT, "agents")).filter((x) => x.endsWith(".md"))) {
  const fm = frontmatter(read(p)) || {};
  if (!fm.name || !fm.description) fail("R9", `${rel(p)} needs name and description`);
  if (fm.model && !MODELS.has(fm.model)) fail("R9", `${rel(p)} model must be an alias (opus, sonnet, haiku, inherit)`);
  if (fm.effort && !EFFORTS.has(fm.effort)) fail("R9", `${rel(p)} effort must be one of ${[...EFFORTS].join(", ")}`);
  for (const s of Array.isArray(fm.skills) ? fm.skills : []) if (!skillDirs.includes(s.replace(/^[\w-]+:/, ""))) fail("R9", `${rel(p)} preloads missing skill ${s}`);
}

// R10: Claude and Codex manifests agree.
const claude = JSON.parse(read(join(ROOT, ".claude-plugin", "plugin.json")));
const codex = JSON.parse(read(join(ROOT, ".codex-plugin", "plugin.json")));
if (claude.name !== codex.name || claude.version !== codex.version) fail("R10", "Claude and Codex plugin.json must share name and version");

// R11: every route has at least one eval case.
for (const dir of skillDirs) if (!existsSync(join(ROOT, "evals", dir))) warn("R11", `skills/${dir} has no evals/${dir}/ cases`);

// R12: toolkit-authored markdown stays small (vendored files and eval prompts excluded).
const authored = walk(ROOT).filter((p) => p.endsWith(".md") && !lockedPaths.has(rel(p)) && !rel(p).startsWith("evals/"));
const authoredTotal = authored.reduce((n, p) => n + lines(p), 0);
if (authoredTotal > LIMITS.authoredLines) fail("R12", `${authoredTotal} lines of toolkit-authored markdown (max ${LIMITS.authoredLines})`);

// R13: NOTICE.md matches the lock.
if (!existsSync(join(ROOT, "NOTICE.md")) || read(join(ROOT, "NOTICE.md")) !== renderNotice(lock)) fail("R13", "NOTICE.md is stale; run node scripts/vendor.mjs --notice");

// R14: the maintenance code itself stays small.
const scripts = walk(join(ROOT, "scripts")).filter((p) => p.endsWith(".mjs"));
if (scripts.length > LIMITS.scripts) fail("R14", `${scripts.length} scripts (max ${LIMITS.scripts})`);
for (const p of scripts) if (lines(p) > LIMITS.scriptLines) fail("R14", `${rel(p)} is ${lines(p)} lines (max ${LIMITS.scriptLines})`);

console.log(`skills: ${skillDirs.length}/${LIMITS.skills} · listing budget: ${budget}/${LIMITS.budgetChars} chars · authored markdown: ${authoredTotal}/${LIMITS.authoredLines} lines · vendored files: ${lock.files.length}`);
for (const w of warnings) console.log(`WARN ${w}`);
for (const f of failures) console.log(`FAIL ${f}`);
console.log(failures.length ? `FAIL (${failures.length})` : `PASS${warnings.length ? ` with ${warnings.length} warning(s)` : ""}`);
process.exit(failures.length ? 1 : 0);
