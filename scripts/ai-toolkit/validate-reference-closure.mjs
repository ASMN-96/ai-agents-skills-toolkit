#!/usr/bin/env node
import process from "node:process";

import { collectReferenceClosureFailures } from "./reference-closure.mjs";

const failures = collectReferenceClosureFailures({ root: process.cwd() });

if (failures.length === 0) {
  console.log("PASS validate-reference-closure");
} else {
  console.log("FAIL validate-reference-closure");
  for (const failure of failures) {
    console.log(`- [${failure.check}] ${failure.location}: ${failure.message}`);
  }
  process.exitCode = 1;
}
