import { createHash } from "node:crypto";

export const COMPILER_DIGEST_PATHS = Object.freeze([
  "scripts/compile-agents.mjs",
  "scripts/ai-toolkit/compiler-provenance.mjs",
  "install/safe-filesystem.mjs"
]);

export function digestCanonicalCompilerInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new TypeError("canonical compiler digest inputs must be a non-empty array");
  }
  const seen = new Set();
  const hash = createHash("sha256");
  for (const input of inputs) {
    if (
      input === null ||
      typeof input !== "object" ||
      typeof input.relativePath !== "string" ||
      input.relativePath.length === 0 ||
      typeof input.text !== "string" ||
      seen.has(input.relativePath)
    ) {
      throw new TypeError("canonical compiler digest inputs must be unique and ordered path/text records");
    }
    seen.add(input.relativePath);
    hash.update(input.relativePath);
    hash.update("\0");
    hash.update(input.text.replace(/\r\n/g, "\n"));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function createCompilerPromotionValidator({
  expectedInputDigest,
  expectedCompilerDigest,
  readCurrentDigests
}) {
  if (typeof expectedInputDigest !== "string" || typeof expectedCompilerDigest !== "string") {
    throw new TypeError("expected compiler provenance digests must be strings");
  }
  if (typeof readCurrentDigests !== "function") {
    throw new TypeError("readCurrentDigests must be a function");
  }

  return function validateCompilerPromotionProvenance() {
    const current = readCurrentDigests();
    if (
      current?.inputDigest !== expectedInputDigest ||
      current?.compilerDigest !== expectedCompilerDigest
    ) {
      throw new Error(
        "canonical compiler inputs changed after digest validation; refusing stale provenance promotion"
      );
    }
    return current;
  };
}
