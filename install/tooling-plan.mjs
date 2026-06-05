#!/usr/bin/env node
import process from "node:process";

const PROJECT_TYPES = [
  "react-typescript-saas",
  "backend-api",
  "infra-iac",
  "mobile-webview",
  "deep-release",
  "architecture-hardening"
];

const COMMON = {
  externalOnly: [
    "GSD",
    "Superpowers",
    "CodeRabbit as service",
    "GitHub CLI as operator tool"
  ],
  approvalRequired: [
    "Socket",
    "TruffleHog",
    "OWASP ZAP baseline",
    "Harden-Runner",
    "deep networked scans",
    "MCP/global config changes",
    "package-manager/workspace migrations"
  ],
  activeReference: [
    "UI UX Pro Max",
    "Impeccable normalized design guidance",
    "open-design read-only design reference",
    "shadcn/ui reference only",
    "Addy Osmani UI/web quality methods",
    "Anthropic UIUX normalized guidance",
    "Toolkit-owned commercial dashboard polish rubric",
    "Uncodixfy anti-generic AI UI guidance",
    "VoltAgent design references if already tracked"
  ],
  activeReadOnly: [
    "code-review-graph source intelligence with no install, indexing, MCP, global config, or product repo scanning"
  ],
  approvalRequiredInstallModes: [
    "Impeccable project-local install mode"
  ],
  useIfExisting: [
    "CodeQL",
    "Dependabot or Renovate, choose one per repo",
    "reviewdog",
    "CodeRabbit",
    "GitHub CLI",
    "Biome",
    "Knip only as cleanup candidate if already present"
  ],
  ownerApprovalChecklist: [
    "Owner must review before applying any template.",
    "New dependencies, package files, lockfiles, package-manager changes, CI wiring, MCP/global config, external service permissions, and deep scans require explicit approval.",
    "React Doctor GitHub Action, PR write permissions, and agent skill install require explicit approval.",
    "Impeccable project-local install mode requires explicit approval.",
    "Codex must not claim output unless the actual script or tool ran."
  ],
  stopConditions: [
    "Owner approval is missing for a new tool, package, CI, MCP/global, permission, or deep-scan change.",
    "A tool conflict is unresolved.",
    "The target project has no matching surface for the selected project type.",
    "Validation output is requested but the command did not run.",
    "A product repo, package file, lockfile, CI workflow, MCP config, deployment config, or global config would be changed without explicit approval."
  ],
  evidenceRequirements: [
    "Print recommended tools separately from actually executed tools.",
    "Report exact command output only for commands actually run.",
    "Label dry-run, skipped, unavailable, metadata-only, and planned checks honestly.",
    "Preserve WARN output.",
    "Record owner approvals and rollback notes."
  ]
};

const PLANS = {
  "react-typescript-saas": {
    defaultInstall: [
      "TypeScript / typecheck",
      "ESLint",
      "typescript-eslint",
      "eslint-plugin-react-hooks",
      "Vitest",
      "Testing Library",
      "Playwright for serious UI/browser apps",
      "Gitleaks",
      "OSV Scanner"
    ],
    activeInstallIfProjectType: [
      "React Doctor for React projects",
      "Oxlint for large JS/TS/React repos as acceleration/supplement",
      "Axe Playwright for UI/accessibility projects",
      "Lighthouse CI for public/mobile/performance-sensitive web apps",
      "Semgrep for security-sensitive projects",
      "dependency-cruiser for architecture hardening",
      "eslint-plugin-boundaries after architecture layers are stable and owner-approved",
      "Madge for circular dependency risk",
      "jscpd for duplication-hardening projects"
    ],
    recommendedScripts: ["typecheck", "lint", "test", "test:ui", "e2e", "security:secrets", "security:deps", "react:doctor"]
  },
  "backend-api": {
    defaultInstall: [
      "TypeScript / typecheck",
      "ESLint",
      "typescript-eslint",
      "Vitest",
      "Gitleaks",
      "OSV Scanner"
    ],
    activeInstallIfProjectType: [
      "Semgrep for security-sensitive projects",
      "dependency-cruiser for architecture hardening",
      "eslint-plugin-boundaries after architecture layers are stable and owner-approved",
      "actionlint for GitHub Actions projects",
      "zizmor for GitHub Actions security",
      "Trivy for Docker/container/IaC/SBOM projects",
      "Checkov for IaC/cloud projects",
      "Madge for circular dependency risk",
      "jscpd for duplication-hardening projects"
    ],
    recommendedScripts: ["typecheck", "lint", "test", "security:secrets", "security:deps", "security:sast", "arch"]
  },
  "infra-iac": {
    defaultInstall: [
      "TypeScript / typecheck where applicable",
      "ESLint where applicable",
      "Gitleaks",
      "OSV Scanner"
    ],
    activeInstallIfProjectType: [
      "actionlint for GitHub Actions projects",
      "zizmor for GitHub Actions security",
      "Trivy for Docker/container/IaC/SBOM projects",
      "Checkov for IaC/cloud projects",
      "Semgrep for security-sensitive projects",
      "dependency-cruiser for architecture hardening where code structure exists",
      "eslint-plugin-boundaries after architecture layers are stable and owner-approved"
    ],
    recommendedScripts: ["lint", "test", "security:secrets", "security:deps", "security:iac", "security:containers", "workflow:lint"]
  },
  "mobile-webview": {
    defaultInstall: [
      "TypeScript / typecheck where applicable",
      "ESLint where applicable",
      "Vitest where applicable",
      "Testing Library where applicable",
      "Playwright for serious web/browser surfaces",
      "Gitleaks",
      "OSV Scanner"
    ],
    activeInstallIfProjectType: [
      "React Doctor for React or React Native projects",
      "Oxlint for large JS/TS/React repos as acceleration/supplement",
      "Axe Playwright for UI/accessibility projects",
      "Lighthouse CI for public/mobile/performance-sensitive web apps",
      "Semgrep for security-sensitive projects",
      "dependency-cruiser for architecture hardening",
      "eslint-plugin-boundaries after architecture layers are stable and owner-approved",
      "Madge for circular dependency risk",
      "jscpd for duplication-hardening projects"
    ],
    recommendedScripts: ["typecheck", "lint", "test", "mobile:test", "e2e", "security:secrets", "security:deps", "react:doctor"]
  },
  "deep-release": {
    defaultInstall: [
      "TypeScript / typecheck where applicable",
      "ESLint where applicable",
      "typescript-eslint where applicable",
      "Vitest or project-owned tests",
      "Playwright for serious UI/browser apps",
      "Gitleaks",
      "OSV Scanner"
    ],
    activeInstallIfProjectType: [
      "React Doctor for React projects",
      "Axe Playwright for UI/accessibility projects",
      "Lighthouse CI for public/mobile/performance-sensitive web apps",
      "Semgrep for security-sensitive projects",
      "dependency-cruiser for architecture hardening",
      "eslint-plugin-boundaries after architecture layers are stable and owner-approved",
      "actionlint for GitHub Actions projects",
      "zizmor for GitHub Actions security",
      "Trivy for Docker/container/IaC/SBOM projects",
      "Checkov for IaC/cloud projects",
      "Madge for circular dependency risk",
      "jscpd for duplication-hardening projects"
    ],
    recommendedScripts: ["typecheck", "lint", "test", "build", "e2e", "security:secrets", "security:deps", "release:verify"]
  },
  "architecture-hardening": {
    defaultInstall: [
      "TypeScript / typecheck where applicable",
      "ESLint where applicable",
      "typescript-eslint where applicable",
      "Vitest or project-owned tests where applicable",
      "Gitleaks",
      "OSV Scanner"
    ],
    activeInstallIfProjectType: [
      "dependency-cruiser for architecture hardening",
      "eslint-plugin-boundaries after architecture layers are stable and owner-approved",
      "Madge for circular dependency risk",
      "jscpd for duplication-hardening projects",
      "Oxlint for large JS/TS/React repos as acceleration/supplement",
      "Semgrep for security-sensitive projects"
    ],
    recommendedScripts: ["typecheck", "lint", "test", "arch", "arch:cycles", "arch:dupes"]
  }
};

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function usage() {
  console.log("Usage: node install/tooling-plan.mjs --project-type <type>");
  console.log(`Supported project types: ${PROJECT_TYPES.join(", ")}`);
}

function printList(title, values) {
  console.log(`\n${title}`);
  for (const value of values) {
    console.log(`- ${value}`);
  }
}

const projectType = getArg("--project-type");

if (!projectType || !PROJECT_TYPES.includes(projectType)) {
  usage();
  process.exitCode = 1;
} else {
  const plan = PLANS[projectType];
  console.log(`Project tooling plan: ${projectType}`);
  console.log("Mode: dry-run/read-only. This command never writes files, installs packages, modifies CI, configures MCP, changes global config, or touches product repositories.");
  printList("default-install tools", plan.defaultInstall);
  printList("active-install-if-project-type tools", plan.activeInstallIfProjectType);
  printList("use-if-existing tools", COMMON.useIfExisting);
  printList("external-only resources", COMMON.externalOnly);
  printList("approval-required tools", projectType.includes("react") || projectType === "mobile-webview" || projectType === "deep-release"
    ? [...COMMON.approvalRequired, "React Doctor GitHub Action / PR write permissions / agent skill install", ...COMMON.approvalRequiredInstallModes]
    : [...COMMON.approvalRequired, ...COMMON.approvalRequiredInstallModes]);
  printList("active-reference resources", COMMON.activeReference);
  printList("active-read-only resources", COMMON.activeReadOnly);
  printList("recommended scripts", plan.recommendedScripts);
  printList("owner approval checklist", COMMON.ownerApprovalChecklist);
  printList("stop conditions", COMMON.stopConditions);
  printList("evidence requirements", COMMON.evidenceRequirements);
}
