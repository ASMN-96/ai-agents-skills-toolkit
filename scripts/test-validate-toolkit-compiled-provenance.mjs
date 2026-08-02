#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { assertCompiledFallbackInputDigest } from "./validate-toolkit.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function compiledInputDigest(compiledText) {
  const match = /^input_digest: (sha256:[0-9a-f]{64})$/mu.exec(compiledText);
  assert.ok(match, "compiled fallback must declare a SHA-256 input digest");
  return match[1];
}

async function fixture() {
  const [agentsRegistry, provenanceRegistry] = await Promise.all([
    readFile(path.join(ROOT, "registries", "agents.registry.json"), "utf8"),
    readFile(path.join(ROOT, "registries", "source-capabilities.registry.json"), "utf8")
  ]);
  const agents = JSON.parse(agentsRegistry).agents;
  return {
    sourceCapabilityRegistry: JSON.parse(provenanceRegistry),
    product: agents.find((agent) => agent.name === "product-agent"),
    uiux: agents.find((agent) => agent.name === "uiux-agent")
  };
}

test("validator accepts distinct canonical per-agent digests and rejects a mismatched digest", async () => {
  const { sourceCapabilityRegistry, product, uiux } = await fixture();
  assert.ok(product?.compiledFallbackPath, "product-agent fixture must declare a compiled fallback");
  assert.ok(uiux?.compiledFallbackPath, "uiux-agent fixture must declare a compiled fallback");

  const [productCompiled, uiuxCompiled] = await Promise.all([
    readFile(path.join(ROOT, product.compiledFallbackPath), "utf8"),
    readFile(path.join(ROOT, uiux.compiledFallbackPath), "utf8")
  ]);
  const productDigest = compiledInputDigest(productCompiled);
  const uiuxDigest = compiledInputDigest(uiuxCompiled);
  assert.notEqual(productDigest, uiuxDigest, "per-agent provenance must produce distinct valid digests");

  await assert.doesNotReject(() => assertCompiledFallbackInputDigest({
    agent: product,
    sourceCapabilityRegistry,
    inputDigest: productDigest
  }));
  await assert.doesNotReject(() => assertCompiledFallbackInputDigest({
    agent: uiux,
    sourceCapabilityRegistry,
    inputDigest: uiuxDigest
  }));
  await assert.rejects(
    () => assertCompiledFallbackInputDigest({
      agent: product,
      sourceCapabilityRegistry,
      inputDigest: `sha256:${"0".repeat(64)}`
    }),
    /input_digest drift/u
  );
});
