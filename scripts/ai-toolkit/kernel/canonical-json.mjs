import { readFile } from "node:fs/promises";
import path from "node:path";

import { assertRegularFileWithin } from "../../../install/safe-filesystem.mjs";

export async function readCanonicalJsonDocumentWithin(repositoryRoot, candidate, label = "canonical JSON") {
  const root = path.resolve(repositoryRoot);
  const filePath = path.resolve(candidate);
  assertRegularFileWithin(root, filePath, label);
  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`could not load ${label} from ${filePath}: ${error.message}`);
  }
  assertRegularFileWithin(root, filePath, label);
  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    throw new Error(`could not parse ${label} from ${filePath}: ${error.message}`);
  }
  return { parsed, text: contents, filePath };
}

export async function readCanonicalJsonWithin(repositoryRoot, candidate, label = "canonical JSON") {
  return (await readCanonicalJsonDocumentWithin(repositoryRoot, candidate, label)).parsed;
}
