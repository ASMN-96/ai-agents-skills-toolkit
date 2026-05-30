export const TOOLKIT_VERSION = "0.6.0-draft";

export const ACTIVE_SKILLS = [
  "riss-governance",
  "vd-premium-uiux",
  "riss-code-quality",
  "riss-security-review",
  "riss-release-gate"
];

export const INTERNAL_HELPER_SKILLS = [
  "riss-agent-governance",
  "riss-skill-governance"
];

export const ACTIVE_PROJECT_AGENTS = [
  "reviewer-agent",
  "frontend-agent",
  "security-agent",
  "qa-test-agent",
  "release-manager-agent"
];

export const SOURCE_OF_TRUTH_MAP = [
  {
    domain: "skills",
    canonicalSource: "skills/<skill>/SKILL.md",
    runtimeCopy: ".agents/skills/<skill>/SKILL.md for the five active runtime skills only",
    distributionCopy: ".ai-toolkit/skills/<skill>/SKILL.md for packaged active skills",
    historicalArchive: "None in this pass unless a file is explicitly marked historical",
    driftControl: "byte identity between canonical, runtime, and distribution copies"
  },
  {
    domain: "agents",
    canonicalSource: "agents/*.md",
    runtimeCopy: ".codex/agents/*.toml for the five active project custom agents only",
    distributionCopy: ".ai-toolkit/agents/*.md for packaged agent source material",
    historicalArchive: "Existing non-active agent specs remain top-level documented assets",
    driftControl: "manifest hashes plus TOML field validation for active agents"
  },
  {
    domain: "compiled-agents",
    canonicalSource: "compiled-agents/*.compiled.md",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/compiled-agents/*.compiled.md when packaged",
    historicalArchive: "Older compiled-agent versions remain explicit drift until provenance is updated",
    driftControl: "manifest hashes; no broad version restamp in this pass"
  },
  {
    domain: "registries",
    canonicalSource: "registries/*.json",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/registries/*.json",
    historicalArchive: "none",
    driftControl: "byte identity for mirrored registry files"
  },
  {
    domain: "methods",
    canonicalSource: "methods/**",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/methods/**",
    historicalArchive: "restricted or historical sources remain marked in provenance",
    driftControl: "manifest hashes and source-provenance validation"
  },
  {
    domain: "sources",
    canonicalSource: "sources/*.md and sources/source-watchlist.json",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/sources/**",
    historicalArchive: "restricted/reference-only source records stay explicitly marked",
    driftControl: "neverAutoImport plus source-record and watchlist validation"
  },
  {
    domain: "profiles",
    canonicalSource: "profiles/*.md",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/profiles/*.md",
    historicalArchive: "older profile notes only if marked",
    driftControl: "manifest hashes and registry reference validation"
  },
  {
    domain: "evals",
    canonicalSource: "evals/**",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/evals/**",
    historicalArchive: "none",
    driftControl: "JSON parse and expected routing-case validation"
  },
  {
    domain: "scripts",
    canonicalSource: "scripts/*.mjs and scripts/ai-toolkit/*.mjs",
    runtimeCopy: "none",
    distributionCopy: ".ai-toolkit/scripts-manifest.json metadata only",
    historicalArchive: "old scripts remain top-level until a later cleanup PR",
    driftControl: "command allowlist, unsafe-command scan, and manifest hashes"
  }
];

export const ACTIVE_AGENT_FILES = [
  "reviewer-agent.toml",
  "frontend-agent.toml",
  "security-agent.toml",
  "qa-test-agent.toml",
  "release-manager-agent.toml"
];

export const TOOL_ENTRIES = [
  ["typescript", "TypeScript", "microsoft/TypeScript", "https://www.typescriptlang.org", "type-safety", "type system and source-code type checking", "baseline-script-if-project-configured", "baseline if project script exists"],
  ["typescript-eslint", "typescript-eslint", "typescript-eslint/typescript-eslint", "https://typescript-eslint.io", "linting", "typed linting for TypeScript and JavaScript", "baseline-script-if-configured", "baseline if configured"],
  ["eslint-plugin-react-hooks", "eslint-plugin-react-hooks", "facebook/react", "https://react.dev", "react-correctness", "React hooks and compiler rule enforcement", "baseline-script-if-configured", "baseline if configured"],
  ["biome", "Biome", "biomejs/biome", "https://biomejs.dev", "fast-lint-format", "fast JavaScript and TypeScript formatter/linter", "conditional", "conditional; do not require if ESLint already covers the project"],
  ["oxlint", "Oxlint", "oxc-project/oxc", "https://oxc.rs", "fast-lint", "fast JavaScript and TypeScript linting", "conditional", "conditional; do not require with Biome by default"],
  ["knip", "Knip", "webpro-nl/knip", "https://knip.dev", "cleanup", "unused files, dependencies, and exports detection", "conditional", "conditional after stabilization"],
  ["react-doctor", "React Doctor", "millionco/react-doctor", "https://react.doctor", "react-scanner", "React codebase scanning for correctness, performance, architecture, accessibility, and AI-generated React risks", "source-review-required", "conditional, non-blocking first if project-local script exists"],
  ["vitest", "Vitest", "vitest-dev/vitest", "https://vitest.dev", "testing", "JavaScript and TypeScript unit and component testing", "baseline-script-if-configured", "baseline if configured"],
  ["testing-library", "Testing Library", "testing-library/react-testing-library", "https://testing-library.com", "component-testing", "user-centric DOM and component testing", "baseline-script-if-configured", "baseline if configured"],
  ["playwright", "Playwright", "microsoft/playwright", "https://playwright.dev", "browser-testing", "end-to-end and browser automation", "delegated-existing", "delegate to existing Playwright/browser support when available"],
  ["axe-playwright", "axe with Playwright", "dequelabs/axe-core-npm", "https://www.deque.com/axe", "accessibility", "rendered accessibility checks with Playwright", "conditional", "conditional frontend UI gate"],
  ["lighthouse-ci", "Lighthouse CI", "GoogleChrome/lighthouse-ci", "https://github.com/GoogleChrome/lighthouse-ci", "web-performance", "performance, accessibility, SEO, and regression budgets", "conditional", "conditional for public and mobile buyer routes"],
  ["codeql", "CodeQL", "github/codeql", "https://codeql.github.com", "sast", "semantic code security analysis", "conditional", "conditional if GitHub code scanning is configured"],
  ["semgrep", "Semgrep", "semgrep/semgrep", "https://semgrep.dev", "sast", "targeted static security and quality rules", "conditional", "conditional"],
  ["gitleaks", "Gitleaks", "gitleaks/gitleaks", "https://gitleaks.io", "secrets", "fast secret scanning", "baseline-script-if-configured", "baseline if project script exists"],
  ["trufflehog", "TruffleHog", "trufflesecurity/trufflehog", "https://trufflesecurity.com", "secrets-deep", "deep secret and credential validation scanning", "deep-approval-required", "deep approval-required"],
  ["osv-scanner", "OSV-Scanner", "google/osv-scanner", "https://google.github.io/osv-scanner", "dependency-security", "dependency vulnerability scanning using OSV data", "baseline-script-if-configured", "baseline if project script exists"],
  ["dependabot", "Dependabot", "dependabot/dependabot-core", "https://docs.github.com/code-security/dependabot", "dependency-bot", "dependency update PR automation", "conditional", "choose one dependency bot only"],
  ["renovate", "Renovate", "renovatebot/renovate", "https://docs.renovatebot.com", "dependency-bot", "dependency update PR automation", "conditional", "choose one dependency bot only"],
  ["socket", "Socket", "SocketDev/socket-cli", "https://socket.dev", "supply-chain", "npm malware and supply-chain risk analysis", "deep-approval-required", "approval-required"],
  ["trivy", "Trivy", "aquasecurity/trivy", "https://trivy.dev", "container-iac-security", "container, filesystem, IaC, SBOM, vulnerability, secrets, and license scanning", "conditional", "only if Docker, IaC, or container assets exist"],
  ["checkov", "Checkov", "bridgecrewio/checkov", "https://www.checkov.io", "iac-security", "IaC and cloud misconfiguration scanning", "conditional", "only if IaC or cloud config exists"],
  ["owasp-zap-baseline", "OWASP ZAP baseline", "zaproxy/action-baseline", "https://www.zaproxy.org", "dast", "DAST baseline scan against approved URL", "deep-approval-required", "approval-required against approved staging or preview URL"],
  ["actionlint", "actionlint", "rhysd/actionlint", "https://github.com/rhysd/actionlint", "ci-security", "GitHub Actions syntax and security linting", "conditional", "when workflow files change and tool is configured"],
  ["zizmor", "zizmor", "woodruffw/zizmor", "https://github.com/woodruffw/zizmor", "ci-security", "GitHub Actions security analysis", "conditional", "when workflow files change and tool is configured"],
  ["harden-runner", "Harden-Runner", "step-security/harden-runner", "https://www.stepsecurity.io/harden-runner", "ci-runtime-security", "GitHub Actions runner hardening and egress monitoring", "deep-approval-required", "approval-required"],
  ["reviewdog", "reviewdog", "reviewdog/reviewdog", "https://reviewdog.github.io", "pr-feedback", "deterministic scanner-output PR reporter", "conditional", "deterministic scanner-output reporting only; do not duplicate CodeRabbit AI review"],
  ["coderabbit", "CodeRabbit", null, "https://docs.coderabbit.ai", "pr-review", "external connected CodeRabbit service/plugin for contextual AI PR review", "delegated-existing", "PR review, CodeRabbit comment triage, merge-readiness support"],
  ["github-gh", "GitHub/gh", "cli/cli", "https://cli.github.com", "repo-ops", "PR status, checks, review, and merge verification", "delegated-existing", "existing or delegated"],
  ["code-review-graph", "code-review-graph", "tirth8205/code-review-graph", null, "source-intelligence", "local-first code intelligence graph for MCP/CLI and large-repo context mapping", "source-only", "source-only until approved"],
  ["open-design", "open-design", "nexu-io/open-design", null, "uiux-reference", "UI/UX reference and design-source scouting", "reference-only", "reference-only until approved"],
  ["openssf-scorecard", "OpenSSF Scorecard", "ossf/scorecard", "https://scorecard.dev", "source-trust", "third-party repo security posture and source trust signal", "source-only", "source-safety review only"],
  ["dependency-cruiser", "dependency-cruiser", "sverweij/dependency-cruiser", "https://github.com/sverweij/dependency-cruiser", "architecture-boundary", "dependency and architecture boundary checks", "research-candidate", "research candidate"],
  ["eslint-plugin-boundaries", "eslint-plugin-boundaries", "javierbrea/eslint-plugin-boundaries", "https://github.com/javierbrea/eslint-plugin-boundaries", "architecture-boundary", "module import and layer boundary enforcement", "research-candidate", "research candidate"],
  ["madge", "Madge", "pahen/madge", "https://github.com/pahen/madge", "architecture-boundary", "dependency graph and circular dependency detection", "research-candidate", "research candidate"],
  ["jscpd", "jscpd", "kucherenko/jscpd", "https://github.com/kucherenko/jscpd", "duplication", "duplicate code detection", "research-candidate", "future hardening"]
];

export const APPROVAL_REQUIRED_STATUSES = new Set([
  "deep-approval-required",
  "source-only",
  "reference-only",
  "research-candidate",
  "source-review-required"
]);

export const UNSAFE_COMMAND_PATTERNS = [
  /\bnpm\s+(?:install|i)\b/i,
  /\bpnpm\s+(?:add|install)\b/i,
  /\byarn\s+(?:add|install)\b/i,
  /\bbun\s+add\b/i,
  /\bpip3?\s+install\b/i,
  /\bbrew\s+install\b/i,
  /\bwinget\s+install\b/i,
  /\bcurl\b[^\n|]*\|\s*(?:sh|bash)\b/i,
  /\bwget\b[^\n|]*\|\s*(?:sh|bash)\b/i,
  /\bnpx\s+@latest\b/i,
  /\bnpx\s+shadcn\b/i,
  /\bgit\s+clone\b/i,
  /\bcodex\s+mcp\s+add\b/i
];
