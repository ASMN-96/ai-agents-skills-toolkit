#!/usr/bin/env node
import assert from "node:assert/strict";
import test from "node:test";

import {
  embeddedValidatorPolicies,
  validatorPolicyFor
} from "./ai-toolkit/subvalidator-policy.mjs";

test("embedded validator policy gives the delivery-kernel suite a focused-test budget", () => {
  const kernelPolicy = validatorPolicyFor("scripts/ai-toolkit/run-delivery-kernel-evals.mjs");

  assert.equal(kernelPolicy.timeoutMs, 300_000);
  assert.equal(kernelPolicy.maxBufferBytes, 10 * 1024 * 1024);
});

test("embedded validator policy keeps lightweight checks bounded and rejects unknown validators", () => {
  assert.equal(embeddedValidatorPolicies.length, 7);
  assert.equal(new Set(embeddedValidatorPolicies.map((policy) => policy.path)).size, 7);

  for (const policy of embeddedValidatorPolicies) {
    assert.equal(Number.isSafeInteger(policy.timeoutMs), true);
    assert.equal(policy.timeoutMs >= 60_000 && policy.timeoutMs <= 300_000, true);
    assert.equal(policy.maxBufferBytes, 10 * 1024 * 1024);
    assert.equal(Object.isFrozen(policy), true);
  }

  assert.equal(
    validatorPolicyFor("scripts/ai-toolkit/validate-ai-toolkit.mjs").timeoutMs,
    60_000
  );
  assert.throws(
    () => validatorPolicyFor("scripts/ai-toolkit/not-governed.mjs"),
    /unknown embedded validator/u
  );
});
