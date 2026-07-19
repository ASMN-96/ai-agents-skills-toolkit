#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { selectResources } from "./ai-toolkit/kernel/resource-router.mjs";
import { assertDeliveryRequest } from "./ai-toolkit/kernel/contracts.mjs";
import { buildExpertTeam, buildExecutionWavePlan } from "./ai-toolkit/kernel/team-planner.mjs";
import { buildContextBundle, buildMemoryProposal } from "./ai-toolkit/kernel/context-memory.mjs";
import { buildEvidenceRecord } from "./ai-toolkit/kernel/evidence.mjs";
import { inspectRepositoryContextItem } from "./ai-toolkit/kernel/project-inspector.mjs";
import {
  loadDomainPacks,
  loadDomainRegistry,
  resolveDomainSelection
} from "./ai-toolkit/kernel/domain-packs.mjs";
import { buildCodexExecutionPlan } from "./ai-toolkit/kernel/codex-adapter.mjs";
import { buildResourceCatalog } from "./ai-toolkit/kernel/resource-catalog.mjs";
import { planDeliveryRun } from "./ai-toolkit/kernel/delivery-kernel.mjs";
import { evaluateFreshness, approvePromotion } from "./ai-toolkit/kernel/freshness-policy.mjs";
import { currentRepositoryCommit } from "./test-support/live-repository-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIGEST = "a".repeat(64);
const REPOSITORY_COMMIT = currentRepositoryCommit(ROOT);
const CURRENT_FRESHNESS = {
  state: "current",
  evidencePath: "sources/reviews/test.json",
  contentDigest: DIGEST
};

function writeFixtureFile(repositoryRoot, relativePath, contents) {
  const target = path.join(repositoryRoot, ...relativePath.split("/"));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
}

function projectFixture(t, packageScripts) {
  const repositoryRoot = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-command-routing-"));
  t.after(() => rmSync(repositoryRoot, { recursive: true, force: true }));
  writeFixtureFile(
    repositoryRoot,
    "package.json",
    `${JSON.stringify({ name: "command-routing-fixture", private: true, scripts: packageScripts }, null, 2)}\n`
  );
  writeFixtureFile(repositoryRoot, "src/index.mjs", "export const ready = true;\n");
  execFileSync("git", ["init", "--quiet"], { cwd: repositoryRoot, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], {
    cwd: repositoryRoot,
    stdio: "pipe"
  });
  execFileSync("git", ["config", "user.name", "Fixture"], {
    cwd: repositoryRoot,
    stdio: "pipe"
  });
  execFileSync("git", ["add", "--", "package.json", "src/index.mjs"], {
    cwd: repositoryRoot,
    stdio: "pipe"
  });
  execFileSync("git", ["commit", "--quiet", "-m", "baseline"], {
    cwd: repositoryRoot,
    stdio: "pipe"
  });
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  }).trim();
  return { repositoryRoot, commit };
}

function commandRoutingRequest({
  id,
  commit,
  scenario = "react-typescript-quality-change",
  risk = "medium",
  acceptanceGate = "enterprise-product-acceptance",
  contextMode = "detailed",
  authorizedActions = ["repository-read", "scoped-local-write", "project-validation"]
}) {
  return {
    schemaVersion: "1.0.0",
    task: {
      id,
      goal: "Exercise inspected project command routing",
      scenario,
      scope: ["src"],
      exclusions: [],
      constraints: ["Use only inspected project script references"],
      risk,
      targets: { platforms: ["web-saas"], frameworkOverlays: [] },
      authorizedActions,
      acceptanceCriteria: [{
        id: "AC-COMMAND-ROUTING",
        statement: "Required gates have an inspectable verification path.",
        requiredGateIds: [acceptanceGate]
      }]
    },
    repository: { root: ".", expectedCommit: commit },
    contextPolicy: {
      mode: contextMode,
      modelWindowTokens: 128000,
      maxInputFraction: 0.35
    }
  };
}

function routingResource({
  id,
  type = "skill",
  roles = ["support"],
  competencies,
  cost = 1,
  authority = "internal-reviewed",
  lifecycle = "active",
  available = true,
  supported = true,
  freshness = CURRENT_FRESHNESS,
  eligible = true,
  reasons = []
}) {
  return {
    schemaVersion: "1.0.0",
    id,
    type,
    canonicalCompetencies: competencies,
    eligibleRoles: roles,
    measuredContextCost: cost,
    contextCostUnit: "tokens",
    contextMeasurement: {
      method: "conservative-token-estimate",
      utf8Bytes: cost * 3,
      evidencePath: "scripts/test-delivery-kernel.mjs",
      contentDigest: DIGEST
    },
    authority,
    lifecycle,
    runtimePosture: {
      registryPresent: true,
      available,
      supported,
      executionProof: false,
      sandboxMode: type === "agent" ? "read-only" : "not-applicable",
      scopedLocalWrite: false
    },
    environmentRestrictions: {
      allowed: ["codex-project-runtime"],
      forbidden: []
    },
    detectionEvidence: {
      state: "observed",
      evidencePath: "scripts/test-delivery-kernel.mjs",
      contentDigest: DIGEST
    },
    freshness,
    nativeAdapter: {
      kind: type === "agent" ? "codex-agent" : "codex-skill",
      id
    },
    commandReference: null,
    eligibility: { eligible, reasons }
  };
}

test("resource routing evaluates every resource and selects the smallest complete non-dominated set", () => {
  const result = selectResources({
    task: {
      id: "task-1",
      risk: "medium",
      requiredCompetencies: ["implementation", "verification"]
    },
    resources: [
      routingResource({
        id: "delivery-lead",
        type: "agent",
        roles: ["lead"],
        competencies: ["implementation"],
        cost: 2
      }),
      routingResource({
        id: "reviewer",
        type: "agent",
        roles: ["specialist", "verifier"],
        competencies: ["verification"],
        authority: "official-standard",
        cost: 1
      }),
      routingResource({
        id: "duplicate-reviewer",
        type: "agent",
        roles: ["specialist", "verifier"],
        competencies: ["verification"],
        authority: "community-reviewed",
        cost: 5
      }),
      routingResource({
        id: "stale-security",
        competencies: ["security"],
        cost: 1,
        authority: "official-standard",
        lifecycle: "stale",
        available: false,
        supported: false,
        freshness: {
          state: "stale",
          evidencePath: "sources/reviews/test.json",
          contentDigest: DIGEST
        },
        eligible: false,
        reasons: ["freshness-stale"]
      })
    ]
  });

  assert.deepEqual(result.selected.map((resource) => resource.id), ["delivery-lead", "reviewer"]);
  assert.deepEqual(result.uncoveredCompetencies, []);
  assert.deepEqual(result.decisions.map(({ id, decision }) => [id, decision]), [
    ["delivery-lead", "selected"],
    ["reviewer", "selected"],
    ["duplicate-reviewer", "dominated"],
    ["stale-security", "stale"]
  ]);
});

test("high-risk routing selects an independent verification agent instead of satisfying verification with a skill alone", () => {
  const result = selectResources({
    task: { id: "task-high", risk: "high", requiredCompetencies: ["implementation", "verification"] },
    resources: [
      routingResource({
        id: "lead",
        type: "agent",
        roles: ["lead"],
        competencies: ["implementation"],
        cost: 2
      }),
      routingResource({
        id: "quality-skill",
        competencies: ["verification"],
        cost: 1
      }),
      routingResource({
        id: "reviewer",
        type: "agent",
        roles: ["specialist", "verifier"],
        competencies: ["verification"],
        cost: 4
      })
    ]
  });

  assert.deepEqual(result.selected.map((resource) => resource.id), ["lead", "reviewer"]);
  assert.equal(
    result.decisions.find((decision) => decision.id === "quality-skill")?.decision,
    "eligible-not-selected"
  );
});

test("delivery request contracts require the governed v1 envelope", () => {
  const request = {
    schemaVersion: "1.0.0",
    task: {
      id: "task-2",
      goal: "Build the feature",
      scenario: "large-governed-implementation",
      scope: ["src"],
      exclusions: ["deployment"],
      constraints: ["preserve compatibility"],
      risk: "medium",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] },
      authorizedActions: ["repository-read", "scoped-local-write", "project-validation"],
      acceptanceCriteria: [{
        id: "AC-1",
        statement: "Observable behavior is tested.",
        requiredGateIds: ["tests"]
      }],
      competencies: ["implementation", "verification"],
      gates: ["tests"]
    },
    repository: { root: ".", expectedCommit: "a".repeat(40) },
    contextPolicy: { mode: "standard", modelWindowTokens: 1000, maxInputFraction: 0.35 }
  };

  const valid = assertDeliveryRequest(request, {
    registeredScenarios: ["large-governed-implementation"]
  });
  assert.equal(valid.task.id, "task-2");
  assert.throws(() => assertDeliveryRequest({
    ...request,
    task: { ...request.task, acceptanceCriteria: [] }
  }, { registeredScenarios: ["large-governed-implementation"] }), /acceptanceCriteria/);
});

test("high-risk teams keep one accountable lead, at most two specialists, and an independent verifier", () => {
  const team = buildExpertTeam({
    task: {
      id: "task-3",
      risk: "high",
      requiredCompetencies: ["implementation", "security", "verification"]
    },
    selectedResources: [
      { id: "delivery-lead", type: "agent", eligibleRoles: ["lead"], canonicalCompetencies: ["implementation"] },
      { id: "security-authority", type: "agent", eligibleRoles: ["specialist"], canonicalCompetencies: ["security"] },
      { id: "independent-reviewer", type: "agent", eligibleRoles: ["specialist", "verifier"], canonicalCompetencies: ["verification"] }
    ]
  });

  assert.equal(team.lead, "delivery-lead");
  assert.deepEqual(team.specialists, ["security-authority", "independent-reviewer"]);
  assert.equal(team.verifier, "independent-reviewer");
  assert.notEqual(team.lead, team.verifier);
  assert.equal(new Set(team.assignments.map((assignment) => assignment.taskSlice)).size, team.assignments.length);
});

test("context bundles enforce the 35 percent ceiling and accept only inspected repository context", () => {
  const inspected = inspectRepositoryContextItem({
    repositoryRoot: ROOT,
    id: "constraints",
    source: "AGENTS.md",
    kind: "instruction",
    relevance: 100,
    agentIds: ["architect-agent"]
  });
  const bundle = buildContextBundle({
    taskId: "task-4",
    taskDigest: DIGEST,
    repositoryCommit: REPOSITORY_COMMIT,
    policyVersion: "delivery-kernel-policy-v0.3",
    modelContextTokens: 128000,
    mode: "detailed",
    maxInputFraction: 0.35,
    ttlPolicy: { id: "test-context", ttlSeconds: 3600 },
    agentIds: ["architect-agent"],
    items: [inspected]
  });

  assert.deepEqual(bundle.items.map((item) => item.id), ["constraints"]);
  assert.equal(bundle.tokenBudget, Math.floor(128000 * 0.35));
  assert.ok(bundle.tokensUsed <= bundle.tokenBudget);
  assert.throws(() => buildContextBundle({
    taskId: "task-4",
    taskDigest: DIGEST,
    repositoryCommit: REPOSITORY_COMMIT,
    policyVersion: "delivery-kernel-policy-v0.3",
    modelContextTokens: 128000,
    mode: "detailed",
    ttlPolicy: { id: "test-context", ttlSeconds: 3600 },
    agentIds: ["architect-agent"],
    items: [{ id: "forged", source: ".env", content: "caller supplied" }]
  }), /trusted repository inspection/);
});

test("memory proposals accept durable provenanced knowledge and reject transcripts or secret-like content", () => {
  const proposal = buildMemoryProposal({
    taskId: "task-5",
    records: [
      {
        id: "decision-1",
        category: "decision",
        statement: "Use the canonical delivery contract.",
        provenance: "docs/decision.md",
        confidence: "approved"
      },
      {
        id: "chat-1",
        category: "transcript",
        statement: "Complete conversation text.",
        provenance: "chat",
        confidence: "unverified"
      },
      {
        id: "secret-1",
        category: "repository-fact",
        statement: "api_key=sk-proj-1234567890abcdef1234567890abcdef",
        provenance: ".env",
        confidence: "verified"
      }
    ]
  });

  assert.equal(proposal.requiresUserReview, true);
  assert.deepEqual(proposal.accepted.map((record) => record.id), ["decision-1"]);
  assert.deepEqual(proposal.rejected.map(({ id, reason }) => [id, reason]), [
    ["chat-1", "unsupported-category"],
    ["secret-1", "secret-like-content"]
  ]);
});

test("evidence records block verification when required checks are simulated, skipped, or unavailable", () => {
  const evidence = buildEvidenceRecord({
    taskId: "task-6",
    selectedResources: ["delivery-lead", "security-authority"],
    invokedResources: ["delivery-lead"],
    requiredChecks: ["tests", "security-review"],
    checks: [
      { id: "tests", status: "passed", command: "node --test", outputRef: "local:test-output" },
      { id: "security-review", status: "simulated", outputRef: "eval:metadata-only" }
    ],
    changedScope: ["scripts"]
  });

  assert.equal(evidence.disposition, "blocked");
  assert.deepEqual(evidence.selectedNotInvoked, ["security-authority"]);
  assert.deepEqual(evidence.unverifiedRequiredChecks, ["security-review"]);
  assert.equal(evidence.verified, false);
});

test("canonical native domain gates remain blocked without their required environment", async () => {
  const registry = await loadDomainRegistry();
  const task = {
    scenario: "large-governed-implementation",
    risk: "medium",
    targets: { platforms: ["ios"], frameworkOverlays: [] }
  };
  const unavailable = resolveDomainSelection({ registry, task, environmentCapabilities: ["windows"] });
  assert.equal(unavailable.status, "blocked");
  assert.ok(unavailable.missingEnvironmentCapabilities.includes("macos"));
  assert.ok(unavailable.missingEnvironmentCapabilities.includes("xcode"));

  const satisfied = resolveDomainSelection({
    registry,
    task,
    environmentCapabilities: ["macos", "xcode", "simulator-or-device"]
  });
  assert.equal(satisfied.status, "planned");
  assert.deepEqual(satisfied.missingEnvironmentCapabilities, []);
});

test("the canonical domain-pack registry covers enterprise core, web/SaaS, mobile, and desktop without false support claims", async () => {
  const packs = await loadDomainPacks();
  assert.deepEqual(packs.map((pack) => pack.id), [
    "enterprise-core",
    "web-saas",
    "ios",
    "android",
    "windows-desktop",
    "macos-desktop",
    "expo-react-native",
    "electron",
    "tauri"
  ]);
  assert.equal(packs.find((pack) => pack.id === "enterprise-core")?.maturity, "supported");
  assert.ok(packs.filter((pack) => pack.id !== "enterprise-core").every((pack) => pack.maturity === "preview"));
  assert.ok(packs.every((pack) => Array.isArray(pack.gates) && pack.gates.length > 0));
  assert.ok(packs.flatMap((pack) => pack.gates).every((gate) => gate.schemaVersion === "1.0.0"));
});

test("the Codex adapter emits bounded recommendations without claiming agents spawned", async () => {
  const commandReference = {
    kind: "project-script",
    manifestPath: "package.json",
    scriptName: "test",
    digest: DIGEST
  };
  const registry = await loadDomainRegistry();
  const domainPack = resolveDomainSelection({
    registry,
    task: {
      scenario: "large-governed-implementation",
      risk: "high",
      targets: { platforms: ["web-saas"], frameworkOverlays: [] }
    },
    environmentCapabilities: ["node", "browser"]
  });
  const task = {
    id: "task-7",
    goal: "Build a bounded Codex recommendation",
    scenario: "large-governed-implementation",
    risk: "high",
    scope: ["src"],
    exclusions: ["deployment"],
    constraints: ["preserve compatibility"],
    targets: { platforms: ["web-saas"], frameworkOverlays: [] },
    authorizedActions: ["repository-read", "project-validation"],
    acceptanceCriteria: [{
      id: "AC-CODEX",
      statement: "Focused tests are planned",
      requiredGateIds: ["focused-tests"]
    }],
    gates: ["focused-tests"]
  };
  const selectedResources = [
    {
      ...routingResource({
        id: "delivery-lead",
        type: "agent",
        roles: ["lead"],
        competencies: ["architecture"]
      }),
      nativeAdapter: { kind: "codex-agent", id: "architect-agent" }
    },
    {
      ...routingResource({
        id: "quality",
        type: "skill",
        competencies: ["verification"]
      }),
      nativeAdapter: { kind: "codex-skill", id: "code-quality" }
    },
    {
      ...routingResource({
        id: "quality-verifier",
        type: "agent",
        roles: ["verifier"],
        competencies: ["verification"]
      }),
      nativeAdapter: { kind: "codex-agent", id: "qa-test-agent" }
    },
    {
      ...routingResource({
        id: "project-tests",
        type: "tool",
        competencies: ["testing"]
      }),
      nativeAdapter: { kind: "project-script", id: "project-tests" },
      commandReference
    }
  ];
  assert.ok(domainPack.resolvedGateIds.includes("focused-tests"));
  const team = buildExecutionWavePlan({
    task,
    resolvedGateIds: domainPack.resolvedGateIds,
    selectedResources,
    domainSelection: domainPack,
    trustedAssignmentIntents: [
      {
        id: "assignment-delivery-lead",
        agentId: "delivery-lead",
        role: "lead",
        wave: 1,
        responsibility: "accountable integration and evidence",
        ownership: { mode: "read-only", ownedPaths: [] },
        dependencies: [],
        stopConditionRefs: ["stop:scope-change"],
        evidenceRefs: ["evidence:resolved-gates"],
        contextRefs: ["context:bounded-task-bundle"]
      },
      {
        id: "assignment-quality-verifier",
        agentId: "quality-verifier",
        role: "verifier",
        wave: 2,
        responsibility: "independent verification",
        ownership: { mode: "read-only", ownedPaths: [] },
        dependencies: ["assignment-delivery-lead"],
        stopConditionRefs: ["stop:scope-change"],
        evidenceRefs: ["evidence:resolved-gates"],
        contextRefs: ["context:bounded-task-bundle"]
      }
    ]
  });
  const plan = buildCodexExecutionPlan({
    task,
    selectedResources,
    team,
    context: {
      items: [{
        id: "constraints",
        kind: "instruction",
        source: "AGENTS.md",
        provenance: { type: "repository-regular-file", path: "AGENTS.md" },
        originAttestation: { status: "verified", type: "repository-regular-file" },
        contentTrust: "untrusted-repository-data",
        instructionAuthority: {
          classification: "candidate-repository-instruction",
          mayOverrideSystemPolicy: false
        },
        sensitivity: "repository-internal",
        contentHash: DIGEST,
        utf8Bytes: 3,
        tokenEstimate: 1,
        agentIds: []
      }]
    },
    domainPack
  });

  assert.deepEqual(plan.recommendedAgents, ["architect-agent", "qa-test-agent"]);
  assert.deepEqual(plan.requiredSkills, ["code-quality"]);
  assert.deepEqual(plan.projectOwnedCommandReferences, [commandReference]);
  assert.equal(plan.actualSpawnProof, null);
  assert.equal(plan.executionStatus, "recommendations-only");
});

test("resource catalog normalization inventories agents, skills, and tools without metadata-only activation", () => {
  const catalog = buildResourceCatalog({
    repositoryRoot: ROOT,
    agentsRegistry: {
      schemaVersion: "1.0.0",
      agents: [{
        name: "architect-agent",
        status: ["approved"],
        nativeCodexAgentName: "architect-agent",
        runtimeFiles: {
          tomlPath: ".codex/agents/architect-agent.toml",
          tomlPresent: true
        },
        deliveryKernel: {
          canonicalCompetencies: ["architecture", "implementation"],
          eligibleRoles: ["lead"],
          measuredContextCost: 414,
          contextCostMeasurement: "ceil(source-character-count/4)",
          authority: "internal-reviewed",
          lifecycle: "active",
          environmentRestrictions: { allowed: ["codex-project-runtime"], forbidden: [] }
        }
      }]
    },
    skillsRegistry: {
      schemaVersion: "1.0.0",
      skills: [{
        name: "code-quality",
        status: ["active"],
        skillPath: "skills/code-quality/SKILL.md",
        deliveryKernel: {
          canonicalCompetencies: ["implementation", "testing", "verification"],
          eligibleRoles: ["support"],
          measuredContextCost: 1023,
          contextCostMeasurement: "ceil(source-character-count/4)",
          authority: "internal-reviewed",
          lifecycle: "active",
          environmentRestrictions: { allowed: ["codex-project-runtime"], forbidden: [] }
        }
      }]
    },
    toolsRegistry: {
      schemaVersion: "1.0.0",
      tools: [{
        id: "typescript",
        name: "TypeScript",
        repository: "microsoft/TypeScript",
        category: "type-safety",
        lane: "verification",
        activationStatus: "metadata-only",
        enterpriseRisk: {
          reviewState: "metadata-only-owner-review-required",
          lastReviewedDate: "2026-06-19",
          allowedEnvironments: ["metadata-only"],
          forbiddenEnvironments: ["codex-project-runtime"]
        }
      }]
    }
  });

  assert.deepEqual(catalog.map(({ id, type, lifecycle, runtimePosture }) => [
    id,
    type,
    lifecycle,
    runtimePosture.available
  ]), [
    ["architect-agent", "agent", "active", true],
    ["code-quality", "skill", "active", true],
    ["typescript", "tool", "quarantined", false]
  ]);
});

test("delivery planning routes the globally minimal inspected scripts for final command-bound atomic gates", async (t) => {
  const fixture = projectFixture(t, {
    lint: "node --check src/index.mjs",
    test: "node --test",
    "test:e2e": "node --test",
    "test:integration": "node --test",
    "test:unit": "node --test",
    docs: "node --version"
  });
  const plan = await planDeliveryRun({
    request: commandRoutingRequest({
      id: "COMMAND-ROUTING-MINIMAL",
      commit: fixture.commit,
      scenario: "large-governed-implementation",
      risk: "high"
    })
  }, { invocationRoot: fixture.repositoryRoot });

  assert.deepEqual(
    plan.routing.requiredCompetencies.filter((competency) => competency.startsWith("command-")).sort(),
    ["command-browser-runtime", "command-integration-test", "command-static-analysis", "command-unit-test"]
  );
  assert.deepEqual(
    plan.routing.selected
      .filter((resource) => resource.nativeAdapter.kind === "project-script")
      .map((resource) => resource.commandReference.scriptName)
      .sort(),
    ["lint", "test:e2e", "test:integration", "test:unit"]
  );
  assert.equal(plan.routing.uncoveredCompetencies.length, 0);
});

test("delivery planning blocks missing required commands and excludes scripts from review-only gates", async (t) => {
  const fixture = projectFixture(t, {
    lint: "node --check src/index.mjs"
  });
  const missing = await planDeliveryRun({
    request: commandRoutingRequest({
      id: "COMMAND-ROUTING-MISSING",
      commit: fixture.commit,
      scenario: "large-governed-implementation",
      risk: "high"
    })
  }, { invocationRoot: fixture.repositoryRoot });

  assert.ok(missing.routing.uncoveredCompetencies.includes("command-browser-runtime"));
  assert.ok(missing.routing.uncoveredCompetencies.includes("command-integration-test"));
  assert.ok(missing.routing.uncoveredCompetencies.includes("command-unit-test"));
  assert.ok(missing.routing.blockedReasons.includes("competency-uncovered:command-browser-runtime"));
  assert.ok(missing.routing.blockedReasons.includes("competency-uncovered:command-integration-test"));
  assert.ok(missing.routing.blockedReasons.includes("competency-uncovered:command-unit-test"));
  assert.deepEqual(
    missing.routing.selected.filter((resource) => resource.nativeAdapter.kind === "project-script"),
    []
  );
  assert.equal(missing.readinessState, "blocked");
  assert.equal(missing.team.executionStatus, "blocked");

  const reviewOnly = await planDeliveryRun({
    request: commandRoutingRequest({
      id: "COMMAND-ROUTING-REVIEW-ONLY",
      commit: fixture.commit,
      scenario: "small-low-risk-typo-doc-change",
      risk: "low",
      acceptanceGate: "enterprise-low-risk-scope-review",
      contextMode: "concise",
      authorizedActions: ["repository-read", "project-validation"]
    })
  }, { invocationRoot: fixture.repositoryRoot });
  assert.deepEqual(
    reviewOnly.routing.requiredCompetencies.filter((competency) => competency.startsWith("command-")),
    []
  );
  assert.deepEqual(
    reviewOnly.routing.selected.filter((resource) => resource.nativeAdapter.kind === "project-script"),
    []
  );
});

test("delivery kernel composes task, routing, context, team, adapter, evidence, and memory contracts", async () => {
  const result = await planDeliveryRun({
    request: {
      schemaVersion: "1.0.0",
      task: {
        id: "task-8",
        goal: "Implement a tested web change",
        scenario: "large-governed-implementation",
        scope: ["src"],
        exclusions: ["deployment"],
        constraints: ["preserve compatibility"],
        risk: "high",
        targets: { platforms: ["web-saas"], frameworkOverlays: [] },
        authorizedActions: ["repository-read", "scoped-local-write", "project-validation"],
        acceptanceCriteria: [{
          id: "AC-1",
          statement: "Tests cover observable behavior.",
          requiredGateIds: ["tests"]
        }],
        competencies: ["implementation", "verification"],
        gates: ["tests"]
      },
      repository: { root: ".", expectedCommit: REPOSITORY_COMMIT },
      contextPolicy: { mode: "detailed", modelWindowTokens: 200, maxInputFraction: 0.35 }
    }
  }, { invocationRoot: ROOT });

  assert.equal(result.task.id, "task-8");
  assert.ok(result.routing.uncoveredCompetencies.includes("command-integration-test"));
  assert.ok(result.routing.uncoveredCompetencies.includes("command-browser-runtime"));
  assert.ok(result.routing.uncoveredCompetencies.includes("command-unit-test"));
  assert.equal(result.team.lead, null);
  assert.deepEqual(result.team.assignments, []);
  assert.equal(result.codex.executionStatus, "blocked");
  assert.equal(result.evidence.disposition, "blocked");
  assert.equal(result.memory.requiresUserReview, true);
  assert.equal(result.domain.status, "blocked");
  assert.equal(result.domain.readinessCeiling, "planned");
  assert.deepEqual(result.domain.selectedPackIds, ["enterprise-core", "web-saas"]);
  assert.ok(result.domain.resolvedGateIds.includes("enterprise-product-acceptance"));
  assert.ok(result.domain.resolvedGateIds.includes("web-wcag-22-aa"));
  assert.equal(result.domain.platformVerification, false);
  assert.equal(result.domain.releaseReadiness, false);
});

test("freshness detects stale or changed sources and promotion requires reviewed compatibility and rollback", () => {
  const stale = evaluateFreshness({
    source: { id: "runtime-source", tier: "security-runtime", lastSuccessfulCheck: "2026-06-01", changedUpstream: false },
    now: "2026-07-15"
  });
  assert.equal(stale.state, "stale");

  const changed = evaluateFreshness({
    source: { id: "platform-source", tier: "platform-standard", lastSuccessfulCheck: "2026-07-10", changedUpstream: true },
    now: "2026-07-15"
  });
  assert.equal(changed.state, "quarantined");

  assert.throws(() => approvePromotion({
    candidate: changed,
    reviews: { license: "passed", security: "passed", compatibility: "passed" },
    approvedBy: "owner"
  }), /rollback/);

  const promoted = approvePromotion({
    candidate: changed,
    reviews: { license: "passed", security: "passed", compatibility: "passed" },
    approvedBy: "owner",
    rollbackTarget: "previous-pinned-version"
  });
  assert.equal(promoted.state, "active");
});
