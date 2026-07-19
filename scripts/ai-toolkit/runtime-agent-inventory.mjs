import path from "node:path";

const REQUIRED_RUNTIME_STATUSES = ["approved", "native-visible"];

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function deriveApprovedRuntimeAgents(registry) {
  if (!registry || !Array.isArray(registry.agents) || registry.agents.length === 0) {
    throw new Error("agents registry must contain at least one approved runtime agent");
  }

  const names = new Set();
  const tomlPaths = new Set();
  return registry.agents.map((agent) => {
    const name = requireString(agent?.name, "agent name");
    if (names.has(name)) {
      throw new Error(`agents registry contains duplicate agent name: ${name}`);
    }
    names.add(name);

    const statuses = Array.isArray(agent.status) ? agent.status : [];
    for (const required of REQUIRED_RUNTIME_STATUSES) {
      if (!statuses.includes(required)) {
        throw new Error(`approved runtime agent ${name} is missing status: ${required}`);
      }
    }
    if (agent.deliveryKernel?.lifecycle !== "active") {
      throw new Error(`approved runtime agent ${name} must have active lifecycle`);
    }
    if (agent.nativeCodexAgentName !== name) {
      throw new Error(`approved runtime agent ${name} has mismatched native Codex name`);
    }

    const tomlPath = requireString(agent.runtimeFiles?.tomlPath, `runtime TOML path for ${name}`)
      .replaceAll("\\", "/");
    const expectedTomlPath = `.codex/agents/${name}.toml`;
    if (tomlPath !== expectedTomlPath || agent.runtimeFiles?.tomlPresent !== true) {
      throw new Error(`approved runtime agent ${name} must declare ${expectedTomlPath}`);
    }
    if (tomlPaths.has(tomlPath)) {
      throw new Error(`agents registry contains duplicate runtime TOML path: ${tomlPath}`);
    }
    tomlPaths.add(tomlPath);

    return Object.freeze({
      name,
      tomlPath,
      fileName: path.posix.basename(tomlPath),
      preview: statuses.includes("preview")
    });
  });
}
