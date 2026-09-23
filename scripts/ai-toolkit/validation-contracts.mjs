import { createHash } from "node:crypto";

export const COPY_ONLY_MIRROR_MODES = Object.freeze([
  "byte-identical",
  "packaged-support-asset",
  "packaged-source-hash"
]);

const COPY_ONLY_MIRROR_MODE_SET = new Set(COPY_ONLY_MIRROR_MODES);

export const VALIDATION_TIERS = Object.freeze({
  RELEASE_READINESS: "release-readiness",
  INSPECTION: "inspection",
  HIGH_RISK_SECURITY: "high-risk-security",
  EXECUTABLE_BEHAVIOR: "executable-behavior",
  INSTRUCTION_RUNTIME: "instruction-runtime",
  DOCUMENTATION: "documentation"
});

const HIGH_RISK_SURFACES = new Set([
  "authentication",
  "authorization",
  "tenant-isolation",
  "rls",
  "migration",
  "payments",
  "security-controls",
  "production-deployment",
  "correctness-sensitive-concurrency",
  "security-assertions",
  "security-fixtures"
]);

const EXECUTABLE_BEHAVIOR_SURFACES = new Set([
  "application-code",
  "tests",
  "executable-configuration",
  "build-tooling",
  "generated-contract",
  "agent-routing-behavior"
]);

function normalizeLf(content) {
  return Buffer.from(content).toString("utf8").replace(/\r\n/g, "\n");
}

export function sha256NormalizedText(content) {
  return createHash("sha256").update(normalizeLf(content)).digest("hex");
}

export function collectMirrorRecordFailures({ mode, sourceContent, targetContent, manifestSha256 }) {
  const failures = [];
  if (!COPY_ONLY_MIRROR_MODE_SET.has(mode)) {
    return [`unsupported mirror mode: ${mode || "<missing>"}`];
  }

  const sourceBuffer = Buffer.from(sourceContent);
  const targetBuffer = Buffer.from(targetContent);
  const targetHash = sha256NormalizedText(targetBuffer);
  if (manifestSha256 !== targetHash) {
    failures.push("manifest target hash drift");
  }

  if (mode === "byte-identical") {
    if (!sourceBuffer.equals(targetBuffer)) {
      failures.push("byte-identical mirror source/target drift");
    }
  } else if (normalizeLf(sourceBuffer) !== normalizeLf(targetBuffer)) {
    failures.push(`${mode} mirror source/target content drift after LF normalization`);
  }

  return failures;
}

export function classifyValidationTier(signals = {}) {
  const affectedSurfaces = new Set(signals.affectedSurfaces || []);
  const hasChangeSignal = Boolean(
    signals.changeRequested
    || signals.documentationOnly
    || signals.documentationChangesExecutableContract
    || signals.instructionRuntimeOnly
    || signals.executableChange
  );

  if (signals.releaseReadinessRequested) {
    return VALIDATION_TIERS.RELEASE_READINESS;
  }
  if (signals.inspectionOnly && !hasChangeSignal) {
    return VALIDATION_TIERS.INSPECTION;
  }
  if ([...affectedSurfaces].some((surface) => HIGH_RISK_SURFACES.has(surface))) {
    return VALIDATION_TIERS.HIGH_RISK_SECURITY;
  }
  if (
    signals.documentationChangesExecutableContract
    || signals.executableChange
    || [...affectedSurfaces].some((surface) => EXECUTABLE_BEHAVIOR_SURFACES.has(surface))
  ) {
    return VALIDATION_TIERS.EXECUTABLE_BEHAVIOR;
  }
  if (signals.instructionRuntimeOnly) {
    return VALIDATION_TIERS.INSTRUCTION_RUNTIME;
  }
  if (signals.documentationOnly) {
    return VALIDATION_TIERS.DOCUMENTATION;
  }

  // A requested change that is not proven to be documentation-only or
  // instruction/runtime-only is conservatively treated as executable.
  if (signals.changeRequested || signals.executableChange === undefined) {
    return VALIDATION_TIERS.EXECUTABLE_BEHAVIOR;
  }
  return VALIDATION_TIERS.INSPECTION;
}
