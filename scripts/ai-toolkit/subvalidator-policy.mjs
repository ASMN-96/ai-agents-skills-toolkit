const MEBIBYTE = 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60_000;
const FOCUSED_TEST_TIMEOUT_MS = 300_000;
const MAX_BUFFER_BYTES = 10 * MEBIBYTE;

const VALIDATORS = [
  "scripts/validate-project-tooling-profiles.mjs",
  "scripts/ai-toolkit/validate-ai-toolkit.mjs",
  "scripts/ai-toolkit/validate-reference-closure.mjs",
  "scripts/ai-toolkit/validate-codex-runtime.mjs",
  "scripts/ai-toolkit/validate-version-consistency.mjs",
  "scripts/ai-toolkit/run-toolkit-evals.mjs",
  "scripts/ai-toolkit/run-delivery-kernel-evals.mjs"
];

export const embeddedValidatorPolicies = Object.freeze(
  VALIDATORS.map((validatorPath) => Object.freeze({
    path: validatorPath,
    timeoutMs: validatorPath.endsWith("run-delivery-kernel-evals.mjs")
      ? FOCUSED_TEST_TIMEOUT_MS
      : DEFAULT_TIMEOUT_MS,
    maxBufferBytes: MAX_BUFFER_BYTES
  }))
);

const POLICIES_BY_PATH = new Map(
  embeddedValidatorPolicies.map((policy) => [policy.path, policy])
);

export function validatorPolicyFor(validatorPath) {
  const policy = POLICIES_BY_PATH.get(validatorPath);
  if (!policy) {
    throw new Error(`unknown embedded validator: ${validatorPath}`);
  }
  return policy;
}
