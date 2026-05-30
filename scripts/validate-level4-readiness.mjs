#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const EVIDENCE_PATH = "docs/LEVEL_4_PROMOTION_EVIDENCE.json";
const TOOLS_REGISTRY_PATH = "registries/tools.registry.json";
const REQUIRED_PROJECT_STATUS = "passed";
const REQUIRED_WARNING_STATUS = "owner-approved";
const REQUIRED_ROLLBACK_STATUS = "passed";
const REQUIRED_ENTERPRISE_REVIEW_STATUS = "owner-reviewed";

const allowedEvidenceStatuses = new Set(["blocked", "deferred", "ready-for-owner-decision", "approved"]);
const allowedPilotStatuses = new Set(["planned", "held", "failed", "passed"]);

function usage() {
  return `Usage:
  node scripts/validate-level4-readiness.mjs
  node scripts/validate-level4-readiness.mjs --require-ready

Audits Level 4 promotion evidence. The default mode reports BLOCKED/deferred while
exiting successfully when the evidence shape is valid. --require-ready exits
non-zero until the Level 4 gate is fully satisfied.
`;
}

function parseArgs(argv) {
  const args = { help: false, requireReady: false };
  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      args.help = true;
    } else if (arg === "--require-ready") {
      args.requireReady = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function rootPath(relativePath) {
  return path.resolve(ROOT, relativePath);
}

function isSafeRelativePath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.split(/[\\/]+/).includes("..")
  );
}

async function exists(relativePath) {
  try {
    await access(rootPath(relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(rootPath(relativePath), "utf8"));
}

function stringField(object, field, failures, location) {
  if (typeof object?.[field] !== "string" || object[field].trim() === "") {
    failures.push(`${location} missing non-empty string field: ${field}`);
    return "";
  }
  return object[field];
}

function optionalEvidencePath(value, failures, location) {
  if (value === null) {
    return;
  }
  if (!isSafeRelativePath(value)) {
    failures.push(`${location} has an unsafe evidence path`);
  }
}

function enterpriseApproved(tool) {
  const risk = tool.enterpriseRisk || {};
  const status = `${risk.defaultEnterpriseStatus || ""} ${risk.securityReviewStatus || ""}`.toLowerCase();
  return status.includes("enterprise-approved") || status.includes("approved-for-enterprise");
}

function unknownRiskFields(tool) {
  const risk = tool.enterpriseRisk || {};
  return Object.entries(risk)
    .filter(([, value]) => {
      if (Array.isArray(value)) {
        return value.some((entry) => String(entry).includes("unknown-review-required"));
      }
      return String(value).includes("unknown-review-required");
    })
    .map(([field]) => field);
}

async function inspectEnterpriseTools(failures, blockers) {
  const registry = await readJson(TOOLS_REGISTRY_PATH);
  const tools = Array.isArray(registry.tools) ? registry.tools : [];
  const approvedWithUnknowns = [];

  for (const tool of tools) {
    if (!tool || typeof tool !== "object") {
      failures.push("tools registry contains a non-object tool entry");
      continue;
    }
    if (enterpriseApproved(tool)) {
      const unknowns = unknownRiskFields(tool);
      if (unknowns.length > 0) {
        approvedWithUnknowns.push(`${tool.id || "<unknown>"} (${unknowns.join(", ")})`);
      }
    }
  }

  if (approvedWithUnknowns.length > 0) {
    blockers.push(
      `enterprise-approved tools still have unknown evidence fields: ${approvedWithUnknowns.join("; ")}`
    );
  }

  return {
    totalTools: tools.length,
    approvedWithUnknowns: approvedWithUnknowns.length
  };
}

async function evaluateEvidence(evidence) {
  const failures = [];
  const blockers = [];

  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    failures.push("evidence root must be a JSON object");
    return { failures, blockers, summary: {} };
  }

  stringField(evidence, "schemaVersion", failures, EVIDENCE_PATH);
  stringField(evidence, "lastUpdated", failures, EVIDENCE_PATH);
  const currentLevel = stringField(evidence, "currentLevel", failures, EVIDENCE_PATH);
  const targetLevel = stringField(evidence, "targetLevel", failures, EVIDENCE_PATH);
  const status = stringField(evidence, "status", failures, EVIDENCE_PATH);

  if (currentLevel !== "Level 3") {
    failures.push("currentLevel must remain Level 3 until Level 4 is approved");
  }
  if (targetLevel !== "Level 4") {
    failures.push("targetLevel must be Level 4");
  }
  if (!allowedEvidenceStatuses.has(status)) {
    failures.push(`status must be one of: ${[...allowedEvidenceStatuses].join(", ")}`);
  }

  if (status === "deferred") {
    const closeout = evidence.level3Closeout;
    if (!closeout || typeof closeout !== "object" || Array.isArray(closeout)) {
      failures.push("level3Closeout must be present when status is deferred");
    } else {
      const closeoutStatus = stringField(closeout, "status", failures, "level3Closeout");
      stringField(closeout, "decisionDate", failures, "level3Closeout");
      const closeoutReport = closeout.report;
      if (closeoutStatus !== "closed") {
        failures.push("level3Closeout.status must be closed when Level 4 is deferred");
      }
      if (!isSafeRelativePath(closeoutReport)) {
        failures.push("level3Closeout report must be a safe relative path");
      } else if (!(await exists(closeoutReport))) {
        failures.push(`level3Closeout report does not exist: ${closeoutReport}`);
      }
    }
  }

  const minimumPassedProjectPilots = Number(evidence.minimumPassedProjectPilots);
  const minimumProjectTypes = Number(evidence.minimumProjectTypes);
  if (!Number.isInteger(minimumPassedProjectPilots) || minimumPassedProjectPilots < 2) {
    failures.push("minimumPassedProjectPilots must be an integer >= 2");
  }
  if (!Number.isInteger(minimumProjectTypes) || minimumProjectTypes < 2) {
    failures.push("minimumProjectTypes must be an integer >= 2");
  }

  const projectPilots = Array.isArray(evidence.projectPilots) ? evidence.projectPilots : [];
  if (!Array.isArray(evidence.projectPilots)) {
    failures.push("projectPilots must be an array");
  }

  let passedPilots = 0;
  const passedProjectTypes = new Set();
  for (const [index, pilot] of projectPilots.entries()) {
    const location = `projectPilots[${index}]`;
    const id = stringField(pilot, "id", failures, location);
    const projectType = stringField(pilot, "projectType", failures, location);
    const pilotStatus = stringField(pilot, "status", failures, location);
    const report = pilot?.report;
    if (!allowedPilotStatuses.has(pilotStatus)) {
      failures.push(`${location} status must be one of: ${[...allowedPilotStatuses].join(", ")}`);
    }
    if (typeof pilot?.countsTowardLevel4 !== "boolean") {
      failures.push(`${location} countsTowardLevel4 must be boolean`);
    }
    if (!isSafeRelativePath(report)) {
      failures.push(`${location} report must be a safe relative path`);
    } else if (!(await exists(report))) {
      failures.push(`${location} report does not exist: ${report}`);
    }
    if (pilot?.countsTowardLevel4 === true) {
      if (pilotStatus !== REQUIRED_PROJECT_STATUS) {
        failures.push(`${location} cannot count toward Level 4 unless status is passed`);
      } else {
        passedPilots += 1;
        passedProjectTypes.add(projectType);
      }
    }
    if (id.toLowerCase().includes("todo")) {
      failures.push(`${location} id must not be a placeholder`);
    }
  }

  if (passedPilots < minimumPassedProjectPilots) {
    blockers.push(`passed project pilots ${passedPilots}/${minimumPassedProjectPilots}`);
  }
  if (passedProjectTypes.size < minimumProjectTypes) {
    blockers.push(`representative project types ${passedProjectTypes.size}/${minimumProjectTypes}`);
  }

  const warningStatus = evidence.warningThresholds?.status;
  optionalEvidencePath(evidence.warningThresholds?.ownerDecisionDocument ?? null, failures, "warningThresholds");
  if (warningStatus !== REQUIRED_WARNING_STATUS) {
    blockers.push(`warning thresholds are ${warningStatus || "missing"}, not ${REQUIRED_WARNING_STATUS}`);
  }

  const rollbackStatus = evidence.rollbackRehearsal?.status;
  const rollbackReport = evidence.rollbackRehearsal?.report ?? null;
  optionalEvidencePath(rollbackReport, failures, "rollbackRehearsal");
  if (rollbackStatus !== REQUIRED_ROLLBACK_STATUS) {
    blockers.push(`rollback rehearsal is ${rollbackStatus || "missing"}, not ${REQUIRED_ROLLBACK_STATUS}`);
  } else if (rollbackReport === null || !(await exists(rollbackReport))) {
    blockers.push("rollback rehearsal is marked passed but report evidence is missing");
  }

  const enterpriseStatus = evidence.enterpriseToolMetadataReview?.status;
  const enterpriseReviewDocument = evidence.enterpriseToolMetadataReview?.reviewDocument;
  optionalEvidencePath(enterpriseReviewDocument ?? null, failures, "enterpriseToolMetadataReview");
  if (enterpriseReviewDocument && !(await exists(enterpriseReviewDocument))) {
    failures.push(`enterpriseToolMetadataReview document does not exist: ${enterpriseReviewDocument}`);
  }
  if (enterpriseStatus !== REQUIRED_ENTERPRISE_REVIEW_STATUS) {
    blockers.push(`enterprise tool metadata review is ${enterpriseStatus || "missing"}, not ${REQUIRED_ENTERPRISE_REVIEW_STATUS}`);
  }

  const toolsSummary = await inspectEnterpriseTools(failures, blockers);

  if (evidence.promotionDecision?.approved !== true) {
    blockers.push("promotion decision is not owner-approved");
  }
  if (evidence.status === "approved" && evidence.promotionDecision?.approved !== true) {
    failures.push("status cannot be approved without promotionDecision.approved=true");
  }

  return {
    failures,
    blockers,
    summary: {
      status,
      currentLevel,
      targetLevel,
      passedPilots,
      minimumPassedProjectPilots,
      passedProjectTypes: passedProjectTypes.size,
      minimumProjectTypes,
      totalTools: toolsSummary.totalTools,
      approvedToolsWithUnknowns: toolsSummary.approvedWithUnknowns
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }

  const evidence = await readJson(EVIDENCE_PATH);
  const result = await evaluateEvidence(evidence);
  const ready = result.failures.length === 0 && result.blockers.length === 0;
  const label = result.failures.length > 0 ? "FAIL" : ready ? "PASS" : "BLOCKED";

  console.log(`${label} validate-level4-readiness`);
  console.log(`current level: ${result.summary.currentLevel || "unknown"}`);
  console.log(`target level: ${result.summary.targetLevel || "unknown"}`);
  console.log(`evidence status: ${result.summary.status || "unknown"}`);
  console.log(
    `passed project pilots: ${result.summary.passedPilots || 0}/${result.summary.minimumPassedProjectPilots || 0}`
  );
  console.log(
    `project types: ${result.summary.passedProjectTypes || 0}/${result.summary.minimumProjectTypes || 0}`
  );
  console.log(`tools metadata entries: ${result.summary.totalTools || 0}`);
  console.log(`enterprise-approved tools with unknown evidence: ${result.summary.approvedToolsWithUnknowns || 0}`);

  if (result.blockers.length > 0) {
    console.log("blockers:");
    for (const blocker of result.blockers) {
      console.log(`- ${blocker}`);
    }
  }

  if (result.failures.length > 0) {
    console.log("failures:");
    for (const failure of result.failures) {
      console.log(`- ${failure}`);
    }
  }

  if (result.failures.length > 0 || (args.requireReady && !ready)) {
    process.exitCode = 1;
  }
}

await main().catch((error) => {
  console.error(`FAIL validate-level4-readiness: ${error.message}`);
  process.exitCode = 1;
});
