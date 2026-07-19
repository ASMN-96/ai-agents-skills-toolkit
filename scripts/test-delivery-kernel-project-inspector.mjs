import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  inspectApplicableInstructions,
  inspectProjectCapabilities,
  inspectRepositoryContextItem,
  inspectScopedDiff,
  inspectScopedDiffChunks
} from "./ai-toolkit/kernel/project-inspector.mjs";

function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), "delivery-kernel-inspector-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, relativePath, contents) {
  const target = path.join(root, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents, "utf8");
  return target;
}

function initializeRepository(root, relativePath = "src/value.mjs", contents = "export const value = 1;\n") {
  execFileSync("git", ["init", "--quiet"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "fixture@example.invalid"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Fixture"], { cwd: root, stdio: "pipe" });
  write(root, relativePath, contents);
  execFileSync("git", ["add", "--", relativePath], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["commit", "--quiet", "-m", "baseline"], { cwd: root, stdio: "pipe" });
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
}

test("repository context inspection reads only a contained regular file and hashes its UTF-8 content", (t) => {
  const root = fixture(t);
  write(root, "docs/guide.md", "Safe guide \u2713\n");

  const item = inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "guide",
    source: "docs/guide.md",
    kind: "explicit-reference",
    relevance: 25,
    agentIds: ["architect-agent"]
  });

  assert.equal(item.source, "docs/guide.md");
  assert.equal(item.content, "Safe guide \u2713\n");
  assert.match(item.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(item.utf8Bytes, Buffer.byteLength(item.content, "utf8"));
  assert.equal(item.tokenEstimate, Math.ceil(item.utf8Bytes / 3));
  assert.equal(item.contentTrust, "untrusted-repository-data");
  assert.equal(item.originAttestation.status, "verified");
  assert.equal(item.instructionAuthority.classification, "none");
  assert.equal(item.instructionAuthority.mayOverrideSystemPolicy, false);
  assert.equal(Object.isFrozen(item), true);
});

test("repository context inspection rejects traversal, private overlays, secrets, personal data, and linked components", (t) => {
  const root = fixture(t);
  const outside = fixture(t);
  write(root, "safe/readme.md", "ordinary project context\n");
  write(root, ".env", "API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456\n");
  write(root, "docs/unsafe.md", "password=abcdefghijklmnopqrstuvwxyz1234567890\n");
  write(root, "docs/bearer.md", "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.real.payload\n");
  write(root, "docs/quoted-password.json", '{"password":"abcdefghijklmnopqrstuvwxyz1234567890"}\n');
  write(root, "docs/quoted-authorization.json", '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiJ9.real.payload"}\n');
  write(root, ".npmrc", "//registry.npmjs.org/:_authToken=abcdefghijklmnopqrstuvwxyz1234567890\n");
  write(root, "credentials.json", '{"access_token":"abcdefghijklmnopqrstuvwxyz1234567890"}\n');
  write(root, "docs/aws-secret.txt", "aws_secret_access_key=abcdefghijklmnopqrstuvwxyz1234567890\n");
  write(root, "docs/quoted-aws-secret.json", '{"aws_secret_access_key":"abcdefghijklmnopqrstuvwxyz1234567890"}\n');
  write(root, "client-secrets.json", '{"client_secret":"abcdefghijklmnopqrstuvwxyz1234567890"}\n');
  write(root, "docs/placeholders.json", '{"password":"${EXAMPLE_LONG_API_TOKEN}"}\n');
  write(root, "docs/not-placeholder.md", "token=real-example-credential-1234567890\n");
  write(root, "docs/person.md", "Customer email: person@company.example\n");
  write(outside, "external.md", "outside\n");
  symlinkSync(outside, path.join(root, "linked"), process.platform === "win32" ? "junction" : "dir");

  assert.throws(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "escape",
    source: "../external.md",
    kind: "explicit-reference"
  }), /canonical repository-relative path|traversal/i);

  assert.throws(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "private",
    source: ".env",
    kind: "explicit-reference"
  }), /private overlay/i);

  assert.throws(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "personal",
    source: "docs/person.md",
    kind: "explicit-reference"
  }), /personal data/i);

  assert.throws(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "secret-content",
    source: "docs/unsafe.md",
    kind: "explicit-reference"
  }), /secret|credential/i);

  for (const source of [
    "docs/bearer.md",
    "docs/not-placeholder.md",
    "docs/quoted-password.json",
    "docs/quoted-authorization.json",
    ".npmrc",
    "credentials.json",
    "docs/aws-secret.txt",
    "docs/quoted-aws-secret.json",
    "client-secrets.json"
  ]) {
    assert.throws(() => inspectRepositoryContextItem({
      repositoryRoot: root,
      id: source,
      source,
      kind: "explicit-reference"
    }), /secret|credential|private overlay/i);
  }

  assert.throws(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "linked",
    source: "linked/external.md",
    kind: "explicit-reference"
  }), /linked|junction|reparse/i);

  assert.doesNotThrow(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "placeholders",
    source: "docs/placeholders.json",
    kind: "explicit-reference"
  }));
});

test("project capability inspection emits verified manifest references without exposing raw commands", (t) => {
  const root = fixture(t);
  write(root, "package.json", `${JSON.stringify({
    name: "fixture",
    private: true,
    scripts: {
      build: "node ./scripts/build.mjs --production",
      test: "node --test"
    }
  }, null, 2)}\n`);
  write(root, "package-lock.json", `${JSON.stringify({ lockfileVersion: 3, packages: {} })}\n`);
  write(root, "pyproject.toml", "[project]\nname = \"fixture\"\n");

  const result = inspectProjectCapabilities({ repositoryRoot: root });
  assert.deepEqual(result.commandReferences.map((entry) => entry.scriptName), ["build", "test"]);
  for (const reference of result.commandReferences) {
    assert.equal(reference.kind, "project-script");
    assert.equal(reference.manifestPath, "package.json");
    assert.match(reference.digest, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(reference).sort(), ["digest", "kind", "manifestPath", "scriptName"]);
    assert.equal(Object.hasOwn(reference, "command"), false);
    assert.equal(Object.hasOwn(reference, "script"), false);
    assert.equal(JSON.stringify(reference).includes("node --test"), false);
  }
  assert.equal(result.executableEvidence[0].id, "node");
  assert.equal(result.executableEvidence[0].version, process.version);
  assert.equal(result.hostCapabilities.some((entry) => entry.id === `platform:${process.platform}`), true);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.manifests.some((entry) => (
    entry.path === "pyproject.toml" && entry.kind === "project-manifest" && entry.scriptNames.length === 0
  )), true);

  assert.throws(() => inspectProjectCapabilities({
    repositoryRoot: root,
    projectCommands: ["npm test"]
  }), /projectCommands is not allowed/);
  assert.throws(() => inspectProjectCapabilities({
    repositoryRoot: root,
    manifestPaths: ["private/missing.json"]
  }), /private overlay/i);
});

test("project capability inspection fails closed for malformed manifests", (t) => {
  const root = fixture(t);
  write(root, "package.json", "{ not-json }\n");
  assert.throws(() => inspectProjectCapabilities({ repositoryRoot: root }), /package\.json.*valid JSON/i);

  write(root, "package.json", `${JSON.stringify({ scripts: { test: ["node", "--test"] } })}\n`);
  assert.throws(() => inspectProjectCapabilities({ repositoryRoot: root }), /scripts\.test must be a string/i);

  write(root, "package.json", `${JSON.stringify({ scripts: { "--help": "node --test" } })}\n`);
  assert.throws(() => inspectProjectCapabilities({ repositoryRoot: root }), /stable package-script name/i);
});

test("project capability inspection reports exact npm versions only from matching package-lock evidence", (t) => {
  const root = fixture(t);
  write(root, "package.json", `${JSON.stringify({
    dependencies: {
      alpha: "^1.2.0",
      "@scope/beta": "workspace:*"
    }
  }, null, 2)}\n`);
  write(root, "package-lock.json", `${JSON.stringify({
    name: "fixture",
    lockfileVersion: 3,
    packages: {
      "": {
        dependencies: {
          alpha: "^1.2.0",
          "@scope/beta": "workspace:*"
        }
      },
      "node_modules/alpha": { version: "1.2.7" },
      "node_modules/@scope/beta": { version: "4.5.6" }
    }
  }, null, 2)}\n`);

  const result = inspectProjectCapabilities({
    repositoryRoot: root,
    includeHostCapabilities: false
  });

  assert.deepEqual(result.versionObservations.map((entry) => ({
    dependencyId: entry.dependencyId,
    state: entry.state,
    observedVersion: entry.observedVersion
  })), [
    { dependencyId: "@scope/beta", state: "observed-exact", observedVersion: "4.5.6" },
    { dependencyId: "alpha", state: "observed-exact", observedVersion: "1.2.7" }
  ]);
  for (const observation of result.versionObservations) {
    assert.equal(observation.ecosystem, "npm");
    assert.equal(observation.reason, "verified-package-lock-entry");
    assert.equal(observation.provenance.manifestPath, "package.json");
    assert.equal(observation.provenance.lockfilePath, "package-lock.json");
    assert.match(observation.provenance.manifestSha256, /^[0-9a-f]{64}$/);
    assert.match(observation.provenance.lockfileSha256, /^[0-9a-f]{64}$/);
    assert.equal(Object.isFrozen(observation), true);
    assert.equal(Object.isFrozen(observation.provenance), true);
  }
  assert.equal(JSON.stringify(result.versionObservations).includes("node --"), false);
});

test("package declarations remain declared-range without supported exact lock evidence", (t) => {
  const root = fixture(t);
  write(root, "package.json", `${JSON.stringify({
    dependencies: {
      exactDeclarationOnly: "1.2.3",
      ranged: ">=2.0.0 <3",
      tagged: "latest",
      workspaceDependency: "workspace:^"
    }
  }, null, 2)}\n`);
  write(root, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n");

  const result = inspectProjectCapabilities({
    repositoryRoot: root,
    includeHostCapabilities: false
  });
  const byId = Object.fromEntries(result.versionObservations.map((entry) => [entry.dependencyId, entry]));

  assert.equal(byId.ranged.state, "declared-range");
  assert.equal(byId.tagged.state, "declared-range");
  assert.equal(byId.workspaceDependency.state, "declared-range");
  assert.equal(byId.exactDeclarationOnly.state, "unresolved");
  assert.equal(byId.ranged.observedVersion, null);
  assert.equal(byId.ranged.reason, "no-supported-package-lock-evidence");
  assert.equal(byId.ranged.provenance.lockfilePath, null);
  assert.equal(byId.ranged.provenance.lockfileSha256, null);
});

test("stale or incomplete package-lock evidence resolves dependencies to unresolved", (t) => {
  const root = fixture(t);
  write(root, "package.json", `${JSON.stringify({
    dependencies: {
      missingEntry: "^1.0.0",
      staleDeclaration: "^2.0.0",
      unknownLockedVersion: "^3.0.0"
    }
  }, null, 2)}\n`);
  write(root, "package-lock.json", `${JSON.stringify({
    lockfileVersion: 3,
    packages: {
      "": {
        dependencies: {
          missingEntry: "^1.0.0",
          staleDeclaration: "^1.0.0",
          unknownLockedVersion: "^3.0.0"
        }
      },
      "node_modules/staleDeclaration": { version: "1.9.9" },
      "node_modules/unknownLockedVersion": { version: "git+https://example.invalid/repo.git" }
    }
  }, null, 2)}\n`);

  const result = inspectProjectCapabilities({
    repositoryRoot: root,
    includeHostCapabilities: false
  });
  const byId = Object.fromEntries(result.versionObservations.map((entry) => [entry.dependencyId, entry]));

  assert.deepEqual({ state: byId.missingEntry.state, reason: byId.missingEntry.reason }, {
    state: "unresolved",
    reason: "lock-entry-missing"
  });
  assert.deepEqual({ state: byId.staleDeclaration.state, reason: byId.staleDeclaration.reason }, {
    state: "unresolved",
    reason: "lock-declaration-mismatch"
  });
  assert.deepEqual({ state: byId.unknownLockedVersion.state, reason: byId.unknownLockedVersion.reason }, {
    state: "unresolved",
    reason: "lock-version-not-exact"
  });
  assert.equal(result.versionObservations.every((entry) => entry.observedVersion === null), true);
});

test("supported package-lock evidence is parsed fail-closed", (t) => {
  const root = fixture(t);
  write(root, "package.json", `${JSON.stringify({ dependencies: { alpha: "^1.0.0" } })}\n`);
  write(root, "package-lock.json", "{ not-json }\n");
  assert.throws(
    () => inspectProjectCapabilities({ repositoryRoot: root, includeHostCapabilities: false }),
    /package-lock\.json.*valid JSON/i
  );

  write(root, "package-lock.json", `${JSON.stringify({ lockfileVersion: 3, packages: [] })}\n`);
  assert.throws(
    () => inspectProjectCapabilities({ repositoryRoot: root, includeHostCapabilities: false }),
    /package-lock\.json packages must be an object/i
  );
});

test("applicable instruction discovery includes root and nested AGENTS files in deterministic order", (t) => {
  const root = fixture(t);
  write(root, "AGENTS.md", "root instructions\n");
  write(root, "src/AGENTS.md", "source instructions\n");
  write(root, "src/feature/file.mjs", "export const value = 1;\n");

  const items = inspectApplicableInstructions({
    repositoryRoot: root,
    targetPaths: ["src/feature/file.mjs"]
  });
  assert.deepEqual(items.map((item) => item.source), ["AGENTS.md", "src/AGENTS.md"]);
  assert.deepEqual(items.map((item) => item.kind), ["instruction", "instruction"]);
  assert.equal(items.every((item) => (
    item.contentTrust === "untrusted-repository-data"
    && item.instructionAuthority.classification === "candidate-repository-instruction"
    && item.instructionAuthority.mayOverrideSystemPolicy === false
  )), true);

  const directoryItems = inspectApplicableInstructions({
    repositoryRoot: root,
    targetPaths: ["src"]
  });
  assert.deepEqual(
    directoryItems.map((item) => item.source),
    ["AGENTS.md", "src/AGENTS.md"],
    "a scoped directory must include its own nested AGENTS.md"
  );
});

test("scoped diff inspection uses a fixed read-only git invocation and returns a hashed context item", (t) => {
  const root = fixture(t);
  const commit = initializeRepository(root);
  write(root, "src/value.mjs", "export const value = 2;\n");

  const item = inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"]
  });
  assert.equal(item.kind, "scoped-diff");
  assert.match(item.content, /value = 2/);
  assert.match(item.contentHash, /^[0-9a-f]{64}$/);
  assert.equal(item.source.startsWith(`git-diff:${commit}:`), true);

  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["../outside"]
  }), /canonical repository-relative path/i);

  for (const magicScope of [":(glob)**", "src/**", "src/[ab]"]) {
    assert.throws(() => inspectScopedDiff({
      repositoryRoot: root,
      expectedCommit: commit,
      scope: [magicScope]
    }), /literal|canonical repository-relative path/i);
  }

  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: "f".repeat(40),
    scope: ["src"]
  }), /does not match expectedCommit/);

  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"],
    relevance: Number.NaN
  }), /relevance must be a finite number/);
});

test("scoped diff includes safe untracked files and rejects unsafe untracked content", (t) => {
  const root = fixture(t);
  const commit = initializeRepository(root);
  write(root, "src/new-feature.mjs", "export const newlyAdded = true;\n");

  const item = inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"]
  });
  assert.match(item.content, /Untracked repository file: src\/new-feature\.mjs/);
  assert.match(item.content, /newlyAdded = true/);
  assert.deepEqual(item.provenance.changedPaths, ["src/new-feature.mjs"]);

  write(root, "src/private-token.txt", "Authorization: Bearer real-private-token-1234567890\n");
  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"]
  }), /secret|credential/i);
});

test("scoped diff rejects secret-like scope metadata even when the diff is empty", (t) => {
  const root = fixture(t);
  const commit = initializeRepository(root);
  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src/password=abcdefghijklmnopqrstuvwxyz1234567890"]
  }), /secret|credential/i);
});

test("large scoped diffs are split into bounded trusted UTF-8 chunks", (t) => {
  const root = fixture(t);
  const commit = initializeRepository(root);
  write(root, "src/value.mjs", `export const value = \`${"safe-value-".repeat(10000)}\`;\n`);
  const complete = inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"]
  });
  const chunks = inspectScopedDiffChunks({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"]
  });
  assert.ok(chunks.length > 1);
  assert.equal(chunks.map((entry) => entry.content).join(""), complete.content);
  assert.equal(chunks.every((entry) => entry.utf8Bytes <= 18 * 1024), true);
  assert.equal(chunks.every((entry) => entry.contentTrust === "untrusted-repository-data"), true);
});

test("scoped diff ignores inherited Git redirection and verifies the exact repository top level", (t) => {
  const root = fixture(t);
  const redirected = fixture(t);
  const commit = initializeRepository(root);
  initializeRepository(redirected, "other.mjs", "export const other = true;\n");
  write(root, "src/value.mjs", "export const value = 3;\n");

  const previousGitDir = process.env.GIT_DIR;
  const previousGitWorkTree = process.env.GIT_WORK_TREE;
  process.env.GIT_DIR = path.join(redirected, ".git");
  process.env.GIT_WORK_TREE = redirected;
  try {
    const item = inspectScopedDiff({
      repositoryRoot: root,
      expectedCommit: commit,
      scope: ["src"]
    });
    assert.match(item.content, /value = 3/);
    assert.equal(item.content.includes("other = true"), false);
  } finally {
    if (previousGitDir === undefined) delete process.env.GIT_DIR;
    else process.env.GIT_DIR = previousGitDir;
    if (previousGitWorkTree === undefined) delete process.env.GIT_WORK_TREE;
    else process.env.GIT_WORK_TREE = previousGitWorkTree;
  }

  assert.throws(() => inspectScopedDiff({
    repositoryRoot: path.join(root, "src"),
    expectedCommit: commit,
    scope: ["value.mjs"]
  }), /top level/i);
});

test("scoped diff rejects changed private overlays before returning their content", (t) => {
  const root = fixture(t);
  const commit = initializeRepository(root, ".env", "TOKEN=${TOKEN}\n");
  write(root, ".env", "TOKEN=${OTHER_TOKEN}\n");
  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: [".env"]
  }), /private overlay/i);
});

test("scoped diff rejects a changed file reached through a junction or symlink component", { skip: process.platform !== "win32" }, (t) => {
  const root = fixture(t);
  const external = fixture(t);
  const commit = initializeRepository(root);
  rmSync(path.join(root, "src"), { recursive: true, force: true });
  write(external, "value.mjs", "export const value = 9;\n");
  symlinkSync(external, path.join(root, "src"), "junction");

  assert.throws(() => inspectScopedDiff({
    repositoryRoot: root,
    expectedCommit: commit,
    scope: ["src"]
  }), /linked|junction|reparse/i);
});

test("context file size is rejected through bounded descriptor reads", (t) => {
  const root = fixture(t);
  const oversized = Buffer.alloc((2 * 1024 * 1024) + 1, 0x61);
  writeFileSync(path.join(root, "oversized.txt"), oversized);
  assert.throws(() => inspectRepositoryContextItem({
    repositoryRoot: root,
    id: "oversized",
    source: "oversized.txt",
    kind: "explicit-reference"
  }), /inspection limit/i);
  assert.equal(readFileSync(path.join(root, "oversized.txt")).byteLength, oversized.byteLength);
});
