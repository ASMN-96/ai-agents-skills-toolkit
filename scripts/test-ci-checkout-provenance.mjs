#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKFLOW = path.join(ROOT, ".github", "workflows", "validate-toolkit.yml");
const PR_HEAD_OR_EVENT_SHA = "${{ github.event.pull_request.head.sha || github.sha }}";

function checkoutSteps(workflow) {
  const checkouts = [...workflow.matchAll(/^\s*uses:\s*actions\/checkout@(?<actionRef>\S+).*$/gm)];
  return checkouts.map((checkout, index) => {
    const start = checkout.index;
    const next = checkouts[index + 1]?.index ?? workflow.length;
    const nextStep = workflow.indexOf("\n      - ", start + 1);
    return {
      actionRef: checkout.groups.actionRef,
      body: workflow.slice(start, nextStep === -1 ? next : Math.min(next, nextStep))
    };
  });
}

function checkoutStepsForJob(workflow, jobName) {
  const job = new RegExp(`^  ${jobName}:\\s*\\n([\\s\\S]*?)(?=^  [a-z][a-z-]+:|\\z)`, "m").exec(workflow);
  assert.ok(job, `validate-toolkit workflow must contain the ${jobName} job`);
  return checkoutSteps(job[1]);
}

test("every validate-toolkit checkout uses the exact PR-head-or-event SHA", () => {
  const workflow = readFileSync(WORKFLOW, "utf8");
  const steps = checkoutSteps(workflow);

  assert.ok(steps.length > 0, "validate-toolkit workflow must contain checkout steps");
  for (const step of steps) {
    assert.match(step.actionRef, /^[0-9a-f]{40}$/, "actions/checkout must remain SHA-pinned");
    assert.match(
      step.body,
      new RegExp(`\\bwith:\\s*\\n\\s*ref:\\s*${PR_HEAD_OR_EVENT_SHA.replace(/[|{}$]/g, "\\$&")}`),
      "checkout must validate the PR head SHA, falling back to github.sha for non-PR events"
    );
  }
});

test("Git-backed behavior and generated-integrity jobs fetch the full exact PR head", () => {
  const workflow = readFileSync(WORKFLOW, "utf8");

  for (const jobName of ["behavior-safety", "generated-integrity"]) {
    const steps = checkoutStepsForJob(workflow, jobName);
    assert.equal(steps.length, 1, `${jobName} must contain one reviewed checkout step`);
    assert.match(steps[0].actionRef, /^[0-9a-f]{40}$/, "actions/checkout must remain SHA-pinned");
    assert.match(
      steps[0].body,
      new RegExp(`\\bref:\\s*${PR_HEAD_OR_EVENT_SHA.replace(/[|{}$]/g, "\\$&")}`),
      `${jobName} checkout must validate the exact PR head`
    );
    assert.match(
      steps[0].body,
      /\bfetch-depth:\s*0\b/,
      `${jobName} must fetch full Git history for provenance verification`
    );
  }
});
