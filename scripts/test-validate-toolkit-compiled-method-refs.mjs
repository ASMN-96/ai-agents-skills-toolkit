#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceMethodRefs(compiledText) {
  const match = /^source_method_refs: (\[[^\n]+\])$/mu.exec(compiledText);
  assert.ok(match, "compiled fallback must declare source_method_refs");
  return JSON.parse(match[1]);
}

function derivedMethodRefsBeforeExplicitOverride(agent, methods) {
  const refs = [];
  for (const method of methods.values()) {
    const passiveConsumers = Array.isArray(method.passiveConsumerAgents) ? method.passiveConsumerAgents.join(" ") : "";
    const relatedScenarios = Array.isArray(method.relatedRoutingScenarios) ? method.relatedRoutingScenarios.join(" ") : "";
    if (
      passiveConsumers.includes(agent.displayName || agent.name) ||
      passiveConsumers.includes(agent.name) ||
      relatedScenarios.includes(agent.name)
    ) {
      refs.push(method.id);
    }
  }
  if (refs.length === 0) {
    for (const method of methods.values()) {
      if ((Array.isArray(method.passiveConsumerAgents) ? method.passiveConsumerAgents : []).join(" ").includes("All internal agents")) {
        refs.push(method.id);
      }
    }
  }
  if (refs.length === 0) refs.push(...methods.keys());
  return refs;
}

async function expectedMethodRefsForAgent() {
  const validatorSource = await readFile(path.join(ROOT, "scripts", "validate-toolkit.mjs"), "utf8");
  const start = validatorSource.indexOf("function expectedMethodRefsForAgent");
  const end = validatorSource.indexOf("\nfunction arraysEqual", start);
  assert.notEqual(start, -1, "validator must define expected method reference parity");
  assert.notEqual(end, -1, "validator method reference parity must end before arraysEqual");
  const asArray = (value) => Array.isArray(value) ? value : [];
  return new Function("asArray", `${validatorSource.slice(start, end)}\nreturn expectedMethodRefsForAgent;`)(asArray);
}

test("validator accepts explicit compiled method refs and preserves derived refs", async () => {
  const agentsRegistry = JSON.parse(await readFile(path.join(ROOT, "registries", "agents.registry.json"), "utf8"));
  const methodsRegistry = JSON.parse(await readFile(path.join(ROOT, "registries", "methods.registry.json"), "utf8"));
  const reviewer = agentsRegistry.agents.find((agent) => agent.name === "reviewer-agent");
  const derivedAgent = agentsRegistry.agents.find((agent) => !Object.hasOwn(agent, "compiledMethodRefs") && agent.compiledFallbackPath);
  const methods = new Map(methodsRegistry.methods.map((method) => [method.id, method]));
  const expectedRefs = await expectedMethodRefsForAgent();

  assert.ok(reviewer?.compiledMethodRefs?.length, "reviewer-agent must explicitly select compiled method refs");
  assert.ok(derivedAgent, "fixture must include an agent using derived compiled method refs");
  const reviewerLegacyDerivedRefs = derivedMethodRefsBeforeExplicitOverride(reviewer, methods);
  assert.notDeepEqual(reviewerLegacyDerivedRefs, reviewer.compiledMethodRefs);
  assert.equal(reviewerLegacyDerivedRefs.length, 46);
  assert.equal(reviewer.compiledMethodRefs.length, 8);
  assert.deepEqual(
    expectedRefs(reviewer, methods),
    reviewer.compiledMethodRefs
  );
  assert.deepEqual(
    sourceMethodRefs(await readFile(path.join(ROOT, derivedAgent.compiledFallbackPath), "utf8")),
    expectedRefs(derivedAgent, methods)
  );
});
