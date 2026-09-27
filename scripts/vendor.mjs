#!/usr/bin/env node
// Vendors upstream files byte-for-byte at the commit pinned in sources/lock.json,
// records their sha256, and regenerates NOTICE.md.
//
//   node scripts/vendor.mjs                    fetch new or changed files at their pinned commit
//   node scripts/vendor.mjs --all              refetch every file and re-verify it against upstream
//   node scripts/vendor.mjs --bump owner/repo  move that source to upstream HEAD (or --to <sha>) and refetch it
//   node scripts/vendor.mjs --notice           only regenerate NOTICE.md
//
// Upstream content is data: this script never executes anything it downloads.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const LOCK_PATH = join(ROOT, "sources", "lock.json");

// Hash with LF line endings so Windows and Linux checkouts agree.
export function sha256(buf) {
  const text = buf.toString("utf8");
  const normalized = text.includes("\r\n") ? Buffer.from(text.replace(/\r\n/g, "\n"), "utf8") : buf;
  return createHash("sha256").update(normalized).digest("hex");
}

export function readLock() {
  return JSON.parse(readFileSync(LOCK_PATH, "utf8"));
}

function writeLock(lock) {
  writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + "\n");
}

function gh(args, { raw = false } = {}) {
  return execFileSync("gh", ["api", ...(raw ? ["-H", "Accept: application/vnd.github.raw"] : []), ...args], {
    maxBuffer: 64 * 1024 * 1024,
    encoding: raw ? "buffer" : "utf8",
  });
}

function fetchFile(repo, commit, path) {
  return gh([`repos/${repo}/contents/${path}?ref=${commit}`], { raw: true });
}

export function renderNotice(lock) {
  const out = [
    "# Notice",
    "",
    "This repository vendors files from the projects below, unmodified, at the pinned commits.",
    "Each project's license applies to its files; a copy sits next to them as `LICENSE`.",
    "Everything else in this repository is MIT (see `LICENSE`).",
    "",
  ];
  for (const [repo, src] of Object.entries(lock.sources)) {
    out.push(`## ${repo}`, "", `- Source: https://github.com/${repo} @ \`${src.commit}\``, `- License: ${src.license}`);
    for (const f of lock.files.filter((x) => x.source === repo)) out.push(`- \`${f.to}\` ← \`${f.from}\``);
    out.push("");
  }
  return out.join("\n");
}

function writeNotice(lock) {
  writeFileSync(join(ROOT, "NOTICE.md"), renderNotice(lock));
}

function vendor(lock, onlyRepo, all) {
  let changed = 0;
  for (const f of lock.files) {
    if (onlyRepo && f.source !== onlyRepo) continue;
    const src = lock.sources[f.source];
    if (!src) throw new Error(`lock.files entry for ${f.to} names unknown source ${f.source}`);
    // Without --all or --bump, skip files already present with their locked hash.
    const local = join(ROOT, f.to);
    if (!all && !onlyRepo && f.sha256 && existsSync(local) && sha256(readFileSync(local)) === f.sha256) continue;
    const body = fetchFile(f.source, src.commit, f.from);
    const hash = sha256(body);
    if (hash !== f.sha256) {
      changed++;
      console.log(`${f.sha256 ? "changed" : "added  "} ${f.to}`);
    }
    mkdirSync(dirname(join(ROOT, f.to)), { recursive: true });
    writeFileSync(join(ROOT, f.to), body);
    f.sha256 = hash;
  }
  return changed;
}

function main(argv) {
  const lock = readLock();
  if (argv.includes("--notice")) {
    writeNotice(lock);
    return;
  }
  const bumpAt = argv.indexOf("--bump");
  let onlyRepo;
  if (bumpAt !== -1) {
    onlyRepo = argv[bumpAt + 1];
    if (!lock.sources[onlyRepo]) throw new Error(`unknown source ${onlyRepo}`);
    const toAt = argv.indexOf("--to");
    const target = toAt !== -1 ? argv[toAt + 1] : JSON.parse(gh([`repos/${onlyRepo}/commits/HEAD`])).sha;
    console.log(`${onlyRepo}: ${lock.sources[onlyRepo].commit} -> ${target}`);
    lock.sources[onlyRepo].commit = target;
  }
  const changed = vendor(lock, onlyRepo, argv.includes("--all"));
  writeLock(lock);
  writeNotice(lock);
  console.log(`${changed} file(s) changed; lock and NOTICE.md updated.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`vendor: ${err.message}`);
    process.exit(1);
  }
}
