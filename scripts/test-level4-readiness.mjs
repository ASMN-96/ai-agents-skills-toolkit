#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCRIPT = path.join(ROOT, "scripts", "validate-level4-readiness.mjs");

async function runValidator(cwd, args = []) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      code: error.code ?? 1,
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? String(error)
    };
  }
}

function toolRegistry() {
  return {
    tools: [
      {
        id: "metadata-only-tool",
        enterpriseRisk: {
          defaultEnterpriseStatus: "metadata-only; blocked from enterprise approval until owner review records evidence",
          securityReviewStatus: "metadata-only-owner-review-required",
          license: "unknown-review-required"
        }
      }
    ]
  };
}

function blockedEvidence() {
  return {
    schemaVersion: "1.0.0",
    lastUpdated: "2026-05-30",
    currentLevel: "Level 3",
    targetLevel: "Level 4",
    status: "blocked",
    minimumPassedProjectPilots: 3,
    minimumProjectTypes: 2,
    projectPilots: [
      {
        id: "pilot-1",
        projectType: "webapp",
        status: "passed",
        countsTowardLevel4: true,
        report: "docs/pilot-1.md"
      }
    ],
    warningThresholds: { status: "owner-approval-required", ownerDecisionDocument: null },
    rollbackRehearsal: { status: "not-recorded", report: null },
    enterpriseToolMetadataReview: { status: "blocked", reviewDocument: "docs/tools.md" },
    promotionDecision: { approved: false, approvedBy: null, decisionDate: null }
  };
}

function readyEvidence() {
  return {
    ...blockedEvidence(),
    status: "approved",
    minimumPassedProjectPilots: 3,
    minimumProjectTypes: 2,
    projectPilots: [
      { id: "pilot-1", projectType: "webapp", status: "passed", countsTowardLevel4: true, report: "docs/pilot-1.md" },
      { id: "pilot-2", projectType: "mobile", status: "passed", countsTowardLevel4: true, report: "docs/pilot-2.md" },
      { id: "pilot-3", projectType: "webapp", status: "passed", countsTowardLevel4: true, report: "docs/pilot-3.md" }
    ],
    warningThresholds: { status: "owner-approved", ownerDecisionDocument: "docs/warnings.md" },
    rollbackRehearsal: { status: "passed", report: "docs/rollback.md" },
    enterpriseToolMetadataReview: { status: "owner-reviewed", reviewDocument: "docs/tools.md" },
    promotionDecision: { approved: true, approvedBy: "owner", decisionDate: "2026-05-30" }
  };
}

async function withFixture(evidence, callback) {
  const fixture = await mkdtemp(path.join(os.tmpdir(), "level4-readiness-"));
  try {
    await mkdir(path.join(fixture, "docs"), { recursive: true });
    await mkdir(path.join(fixture, "registries"), { recursive: true });
    await writeFile(path.join(fixture, "docs", "LEVEL_4_PROMOTION_EVIDENCE.json"), JSON.stringify(evidence, null, 2), "utf8");
    await writeFile(path.join(fixture, "docs", "pilot-1.md"), "# Pilot 1\n", "utf8");
    await writeFile(path.join(fixture, "docs", "pilot-2.md"), "# Pilot 2\n", "utf8");
    await writeFile(path.join(fixture, "docs", "pilot-3.md"), "# Pilot 3\n", "utf8");
    await writeFile(path.join(fixture, "docs", "warnings.md"), "# Warning Thresholds\n", "utf8");
    await writeFile(path.join(fixture, "docs", "rollback.md"), "# Rollback\n", "utf8");
    await writeFile(path.join(fixture, "docs", "tools.md"), "# Tool Review\n", "utf8");
    await writeFile(path.join(fixture, "registries", "tools.registry.json"), JSON.stringify(toolRegistry(), null, 2), "utf8");
    return await callback(fixture);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}

test("reports blocked evidence without failing default audit mode", async () => {
  await withFixture(blockedEvidence(), async (fixture) => {
    const result = await runValidator(fixture);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /BLOCKED validate-level4-readiness/);
    assert.match(result.stdout, /passed project pilots: 1\/3/);
    assert.match(result.stdout, /promotion decision is not owner-approved/);
  });
});

test("fails blocked evidence in require-ready mode", async () => {
  await withFixture(blockedEvidence(), async (fixture) => {
    const result = await runValidator(fixture, ["--require-ready"]);

    assert.notEqual(result.code, 0);
    assert.match(result.stdout, /BLOCKED validate-level4-readiness/);
  });
});

test("passes fully satisfied evidence in require-ready mode", async () => {
  await withFixture(readyEvidence(), async (fixture) => {
    const result = await runValidator(fixture, ["--require-ready"]);

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /PASS validate-level4-readiness/);
    assert.match(result.stdout, /passed project pilots: 3\/3/);
  });
});
