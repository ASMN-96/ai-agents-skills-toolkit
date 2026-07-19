import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const TEST_REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const SHA1_PATTERN = /^[0-9a-f]{40}$/u;
export const DELIVERY_REQUEST_COMMIT_PLACEHOLDER = "0".repeat(40);

export function currentRepositoryCommit(repositoryRoot = TEST_REPOSITORY_ROOT) {
  const resolvedRoot = path.resolve(repositoryRoot);
  const commit = execFileSync("git", ["rev-parse", "--verify", "HEAD^{commit}"], {
    cwd: resolvedRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  }).trim().toLowerCase();

  if (!SHA1_PATTERN.test(commit)) {
    throw new Error(`test repository HEAD must be an exact 40-character lowercase Git SHA: ${commit}`);
  }
  return commit;
}

export function pinRequestToCurrentRepositoryCommit(
  request,
  repositoryRoot = TEST_REPOSITORY_ROOT
) {
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new TypeError("delivery request fixture must be an object");
  }
  if (!request.repository || typeof request.repository !== "object" || Array.isArray(request.repository)) {
    throw new TypeError("delivery request fixture must include repository");
  }
  if (!SHA1_PATTERN.test(request.repository.expectedCommit)) {
    throw new TypeError("delivery request fixture repository.expectedCommit must be an exact lowercase SHA");
  }

  return {
    ...request,
    repository: {
      ...request.repository,
      expectedCommit: currentRepositoryCommit(repositoryRoot)
    }
  };
}

export async function readPinnedDeliveryRequest(
  requestPath,
  repositoryRoot = TEST_REPOSITORY_ROOT
) {
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  if (request?.repository?.expectedCommit !== DELIVERY_REQUEST_COMMIT_PLACEHOLDER) {
    throw new Error("committed delivery request fixture must use the all-zero expectedCommit placeholder");
  }
  return pinRequestToCurrentRepositoryCommit(request, repositoryRoot);
}

export function readPinnedDeliveryRequestSync(
  requestPath,
  repositoryRoot = TEST_REPOSITORY_ROOT
) {
  const request = JSON.parse(readFileSync(requestPath, "utf8"));
  if (request?.repository?.expectedCommit !== DELIVERY_REQUEST_COMMIT_PLACEHOLDER) {
    throw new Error("committed delivery request fixture must use the all-zero expectedCommit placeholder");
  }
  return pinRequestToCurrentRepositoryCommit(request, repositoryRoot);
}
