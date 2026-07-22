import { createHash } from "node:crypto";

export const COMPILER_DIGEST_PATHS = Object.freeze([
  "scripts/compile-agents.mjs",
  "scripts/ai-toolkit/compiler-provenance.mjs",
  "install/safe-filesystem.mjs"
]);
const SYNTHESIS_STATES = new Set(["draft", "approved", "superseded"]);

export function resolveProfileSourcePath(profile) {
  const profileName = typeof profile?.name === "string" && profile.name.trim()
    ? profile.name.trim()
    : "<unknown>";
  const provenance = profile?.sourceProvenance;
  if (!Array.isArray(provenance) || provenance.length !== 1) {
    throw new Error(
      `profile ${profileName} sourceProvenance must contain exactly one canonical profile Markdown path`
    );
  }

  const sourcePath = provenance[0]?.path;
  if (
    typeof sourcePath !== "string"
    || sourcePath.length === 0
    || sourcePath.includes("\\")
    || !sourcePath.startsWith("profiles/")
    || !sourcePath.endsWith(".md")
    || sourcePath === "profiles/.md"
    || sourcePath.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(
      `profile ${profileName} sourceProvenance must contain one normalized path below profiles/ ending in .md`
    );
  }
  return sourcePath;
}

function requireStringArray(value, field) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
  const seen = new Set();
  const values = [];
  for (const entry of value) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new Error(`${field} must contain non-empty strings`);
    }
    if (seen.has(entry)) throw new Error(`${field} contains a duplicate value: ${entry}`);
    seen.add(entry);
    values.push(entry);
  }
  return values;
}

function selectedArtifactKeys(agent) {
  const methods = agent.compiledMethodRefs === undefined
    ? []
    : requireStringArray(agent.compiledMethodRefs, `agent ${agent.name} compiledMethodRefs`);
  const ownedSkills = agent.ownedSkills === undefined
    ? []
    : requireStringArray(agent.ownedSkills, `agent ${agent.name} ownedSkills`);
  const secondarySkills = agent.secondarySkills === undefined
    ? []
    : requireStringArray(agent.secondarySkills, `agent ${agent.name} secondarySkills`);
  return new Set([
    ...methods.map((resourceId) => `method:${resourceId}`),
    ...ownedSkills.map((resourceId) => `skill:${resourceId}`),
    ...secondarySkills.map((resourceId) => `skill:${resourceId}`)
  ]);
}

export function deriveCompilerProvenance(agent, registry) {
  if (agent === null || typeof agent !== "object" || Array.isArray(agent) || typeof agent.name !== "string" || agent.name.length === 0) {
    throw new Error("compiler provenance requires a named agent record");
  }
  if (registry === null || typeof registry !== "object" || !Array.isArray(registry.syntheses)) {
    throw new Error("compiler provenance registry must contain a syntheses array");
  }

  const consumedArtifactKeys = selectedArtifactKeys(agent);
  const selected = {
    capabilityIds: new Set(),
    synthesisIds: new Set(),
    decisionRefs: new Set()
  };
  const synthesisIds = new Set();
  const decisionIds = new Set();
  const artifactIds = new Set();
  const consumedArtifacts = new Map();

  for (const synthesis of registry.syntheses) {
    if (synthesis === null || typeof synthesis !== "object" || Array.isArray(synthesis)) {
      throw new Error("compiler provenance synthesis must be an object");
    }
    if (typeof synthesis.id !== "string" || synthesis.id.length === 0) {
      throw new Error("compiler provenance synthesis id must be a non-empty string");
    }
    if (synthesisIds.has(synthesis.id)) throw new Error(`duplicate synthesis id: ${synthesis.id}`);
    synthesisIds.add(synthesis.id);
    if (typeof synthesis.capabilityId !== "string" || synthesis.capabilityId.length === 0) {
      throw new Error(`compiler provenance synthesis ${synthesis.id} has no capabilityId`);
    }
    if (!SYNTHESIS_STATES.has(synthesis.state)) {
      if (typeof synthesis.state !== "string" || synthesis.state.length === 0) {
        throw new Error(`compiler provenance synthesis ${synthesis.id} has no synthesis state`);
      }
      throw new Error(`compiler provenance synthesis ${synthesis.id} has unsupported synthesis state: ${synthesis.state}`);
    }
    if (!Array.isArray(synthesis.artifactRefs) || !Array.isArray(synthesis.decisions)) {
      throw new Error(`compiler provenance synthesis ${synthesis.id} is missing artifact or decision provenance`);
    }

    const decisions = new Map();
    for (const decision of synthesis.decisions) {
      if (decision === null || typeof decision !== "object" || Array.isArray(decision) || typeof decision.id !== "string" || decision.id.length === 0) {
        throw new Error(`compiler provenance synthesis ${synthesis.id} has an invalid decision`);
      }
      if (decisions.has(decision.id)) throw new Error(`duplicate decision id in synthesis ${synthesis.id}: ${decision.id}`);
      if (decisionIds.has(decision.id)) throw new Error(`duplicate decision id: ${decision.id}`);
      decisionIds.add(decision.id);
      decisions.set(decision.id, new Set(requireStringArray(decision.artifactRefs, `decision ${decision.id} artifactRefs`)));
    }

    const synthesisArtifactIds = new Set();
    const artifactDecisionRefs = new Map();
    for (const artifact of synthesis.artifactRefs) {
      if (artifact === null || typeof artifact !== "object" || Array.isArray(artifact)
        || typeof artifact.id !== "string" || artifact.id.length === 0
        || typeof artifact.kind !== "string" || typeof artifact.resourceId !== "string") {
        throw new Error(`compiler provenance synthesis ${synthesis.id} has an invalid artifact`);
      }
      const key = `${artifact.kind}:${artifact.resourceId}`;
      if (artifact.id !== key) throw new Error(`compiler provenance artifact id does not bind kind and resourceId: ${artifact.id}`);
      if (synthesisArtifactIds.has(artifact.id)) throw new Error(`duplicate artifact id in synthesis ${synthesis.id}: ${artifact.id}`);
      if (artifactIds.has(artifact.id)) throw new Error(`duplicate artifact id: ${artifact.id}`);
      synthesisArtifactIds.add(artifact.id);
      artifactIds.add(artifact.id);
      const decisionRefs = requireStringArray(artifact.decisionRefs, `artifact ${artifact.id} decisionRefs`);
      artifactDecisionRefs.set(artifact.id, new Set(decisionRefs));
      for (const decisionRef of decisionRefs) {
        const decisionArtifacts = decisions.get(decisionRef);
        if (!decisionArtifacts) throw new Error(`dangling decision provenance ${decisionRef} for artifact ${artifact.id}`);
        if (!decisionArtifacts.has(artifact.id)) {
          throw new Error(`unreciprocated decision provenance ${decisionRef} for artifact ${artifact.id}`);
        }
      }
      if (consumedArtifactKeys.has(key)) {
        const matches = consumedArtifacts.get(key) ?? [];
        matches.push({ synthesis, decisionRefs });
        consumedArtifacts.set(key, matches);
      }
    }

    for (const [decisionId, decisionArtifactIds] of decisions) {
      for (const artifactId of decisionArtifactIds) {
        if (!synthesisArtifactIds.has(artifactId)) {
          throw new Error(`dangling decision artifact ${artifactId} for decision ${decisionId}`);
        }
        if (!artifactDecisionRefs.get(artifactId).has(decisionId)) {
          throw new Error(`unreciprocated decision artifact ${artifactId} for decision ${decisionId}`);
        }
      }
    }
  }

  for (const key of consumedArtifactKeys) {
    const matches = consumedArtifacts.get(key) ?? [];
    if (matches.length === 0 && synthesisIds.size > 0) {
      const [kind] = key.split(":", 1);
      throw new Error(`dangling consumed ${kind} provenance: ${key}`);
    }
    const approved = matches.filter(({ synthesis }) => synthesis.state === "approved");
    if (matches.length > 0 && approved.length === 0) {
      throw new Error(`unapproved consumed provenance: ${key}`);
    }
    for (const { synthesis, decisionRefs } of approved) {
      selected.capabilityIds.add(synthesis.capabilityId);
      selected.synthesisIds.add(synthesis.id);
      for (const decisionRef of decisionRefs) selected.decisionRefs.add(decisionRef);
    }
  }

  return Object.freeze({
    capabilityIds: Object.freeze([...selected.capabilityIds].sort()),
    synthesisIds: Object.freeze([...selected.synthesisIds].sort()),
    decisionRefs: Object.freeze([...selected.decisionRefs].sort())
  });
}

export function digestCanonicalCompilerInputs(inputs) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new TypeError("canonical compiler digest inputs must be a non-empty array");
  }
  const seen = new Set();
  const hash = createHash("sha256");
  for (const input of inputs) {
    if (
      input === null ||
      typeof input !== "object" ||
      typeof input.relativePath !== "string" ||
      input.relativePath.length === 0 ||
      typeof input.text !== "string" ||
      seen.has(input.relativePath)
    ) {
      throw new TypeError("canonical compiler digest inputs must be unique and ordered path/text records");
    }
    seen.add(input.relativePath);
    hash.update(input.relativePath);
    hash.update("\0");
    hash.update(input.text.replace(/\r\n/g, "\n"));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

export function createCompilerPromotionValidator({
  expectedInputDigest,
  expectedCompilerDigest,
  readCurrentDigests
}) {
  if (typeof expectedInputDigest !== "string" || typeof expectedCompilerDigest !== "string") {
    throw new TypeError("expected compiler provenance digests must be strings");
  }
  if (typeof readCurrentDigests !== "function") {
    throw new TypeError("readCurrentDigests must be a function");
  }

  return function validateCompilerPromotionProvenance() {
    const current = readCurrentDigests();
    if (
      current?.inputDigest !== expectedInputDigest ||
      current?.compilerDigest !== expectedCompilerDigest
    ) {
      throw new Error(
        "canonical compiler inputs changed after digest validation; refusing stale provenance promotion"
      );
    }
    return current;
  };
}
