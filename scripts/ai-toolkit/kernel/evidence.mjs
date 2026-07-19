const CHECK_STATUSES = new Set(["passed", "failed", "skipped", "unavailable", "simulated", "partial", "planned"]);

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean))];
}

export function buildEvidenceRecord({
  taskId,
  selectedResources,
  invokedResources,
  requiredChecks,
  checks,
  changedScope = [],
  warnings = []
}) {
  if (!taskId) throw new Error("evidence record requires taskId");
  const selected = unique(selectedResources);
  const invoked = unique(invokedResources);
  const required = unique(requiredChecks);
  const normalizedChecks = (Array.isArray(checks) ? checks : []).map((check) => {
    if (!check?.id || !CHECK_STATUSES.has(check.status)) {
      throw new Error(`invalid evidence check: ${check?.id ?? "unknown"}`);
    }
    if (check.status === "passed" && (!check.outputRef || (!check.command && !check.manualEvidence))) {
      throw new Error(`passed check ${check.id} requires observed command or manual evidence and outputRef`);
    }
    return { ...check };
  });
  const checksById = new Map(normalizedChecks.map((check) => [check.id, check]));
  const unverifiedRequiredChecks = required.filter((id) => checksById.get(id)?.status !== "passed");
  const selectedNotInvoked = selected.filter((id) => !invoked.includes(id));
  const failedChecks = normalizedChecks.filter((check) => check.status === "failed").map((check) => check.id);
  const verified = unverifiedRequiredChecks.length === 0
    && failedChecks.length === 0
    && selectedNotInvoked.length === 0;

  return {
    schemaVersion: "1.0.0",
    taskId,
    selectedResources: selected,
    invokedResources: invoked,
    selectedNotInvoked,
    checks: normalizedChecks,
    requiredChecks: required,
    unverifiedRequiredChecks,
    failedChecks,
    warnings: unique(warnings),
    changedScope: unique(changedScope),
    verified,
    disposition: verified ? "ready" : "blocked"
  };
}

export function buildExecutionEvidenceRecord({
  taskId,
  selectedResources,
  invokedResources,
  assignmentIds,
  receiptAssignmentIds,
  requiredChecks,
  checks,
  warnings = [],
  blockingReasons = []
}) {
  if (typeof taskId !== "string" || taskId === "" || taskId !== taskId.trim()) {
    throw new Error("execution evidence requires taskId");
  }
  const selected = unique(selectedResources);
  const invoked = unique(invokedResources);
  const assignments = unique(assignmentIds);
  const receipted = unique(receiptAssignmentIds);
  const required = unique(requiredChecks);
  const normalizedChecks = (Array.isArray(checks) ? checks : []).map((check, index) => {
    if (
      !check
      || typeof check.gateId !== "string"
      || check.gateId === ""
      || !new Set(["passed", "failed", "blocked"]).has(check.status)
    ) {
      throw new Error(`invalid execution evidence check at index ${index}`);
    }
    return {
      gateId: check.gateId,
      status: check.status,
      outputHash: check.outputHash ?? null
    };
  });
  const passedChecks = new Set(
    normalizedChecks.filter((check) => check.status === "passed").map((check) => check.gateId)
  );
  const selectedNotInvoked = selected.filter((id) => !invoked.includes(id));
  const assignmentsWithoutReceipts = assignments.filter((id) => !receipted.includes(id));
  const unverifiedRequiredChecks = required.filter((id) => !passedChecks.has(id));
  const reasons = unique(blockingReasons);
  const verified = selectedNotInvoked.length === 0
    && assignmentsWithoutReceipts.length === 0
    && unverifiedRequiredChecks.length === 0
    && reasons.length === 0;

  return Object.freeze({
    schemaVersion: "1.0.0",
    taskId,
    selectedResources: Object.freeze(selected),
    invokedResources: Object.freeze(invoked),
    selectedNotInvoked: Object.freeze(selectedNotInvoked),
    assignmentIds: Object.freeze(assignments),
    receiptAssignmentIds: Object.freeze(receipted),
    assignmentsWithoutReceipts: Object.freeze(assignmentsWithoutReceipts),
    requiredChecks: Object.freeze(required),
    checks: Object.freeze(normalizedChecks.map((check) => Object.freeze(check))),
    unverifiedRequiredChecks: Object.freeze(unverifiedRequiredChecks),
    warnings: Object.freeze(unique(warnings)),
    blockingReasons: Object.freeze(reasons),
    verified,
    disposition: verified ? "ready" : "blocked"
  });
}
