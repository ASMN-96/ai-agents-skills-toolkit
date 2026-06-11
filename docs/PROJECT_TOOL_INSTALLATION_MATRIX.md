# Project Tool Installation Matrix

Every tool or resource below has exactly one primary v0.2 classification. The classification describes recommended project adoption posture only. It does not install, activate, configure, run, or approve any tool.

## v0.2.2 Activation Vocabulary

The v0.2 project install classes remain for compatibility, but v0.2.2 adds explicit activation levels:

- `active-reference`: guidance only; no execution.
- `active-if-detected`: if a target repo already owns the tool/config/script, the toolkit may recommend using that project-owned path.
- `owner-approved-install`: valuable when absent, but installation/configuration requires explicit owner approval.
- `ci-advisory`: CI signal only while rules, noise, artifacts, and false positives are calibrated.
- `ci-blocking-after-calibration`: release gate only after stable evidence and explicit owner approval.
- `static-adopted`: static governance concepts are active in toolkit-owned methods; no runtime activation.
- `forbidden-runtime`: no runtime activation because of MCP, daemon, global, memory, watcher, persistence, or security conflict.

Package-manager detection must happen before recommending package-manager commands. No tool output may be claimed unless the tool actually ran and output was observed.

## v0.2.2 Full-Power Posture Overlay

| Tool/category | Activation when already project-owned | When absent | CI posture | Hard boundary |
|---|---|---|---|---|
| React Doctor | `active-if-detected` in React projects | `owner-approved-install` | `ci-advisory`; `ci-blocking-after-calibration` only after stable React evidence | GitHub Action, PR writes, and agent skill install require separate approval |
| Playwright | `active-if-detected` for approved browser targets | `owner-approved-install` | `ci-advisory` first; `ci-blocking-after-calibration` only after stable test evidence | No browser download, MCP, CI, package, or product-repo change from metadata |
| Gitleaks | `active-if-detected` baseline secret scan | `owner-approved-install` | advisory until policy is calibrated | Deep/history scans remain separately scoped |
| OSV Scanner | `active-if-detected` dependency baseline | `owner-approved-install` | advisory until dependency policy is calibrated | No vulnerability claim without observed output |
| Semgrep | `active-if-detected` when rules/config exist | `owner-approved-install` | `ci-advisory` until rules are scoped | Do not turn noisy rules into blockers by default |
| Oxlint | `active-if-detected` supplement for large JS/TS/React repos | `owner-approved-install` | advisory until lint ownership is clear | Does not replace ESLint or typed rules without approval |
| dependency-cruiser / Madge | `active-if-detected` architecture/cycle checks | `owner-approved-install` | advisory until boundaries are agreed | Do not claim generated graphs without output |
| jscpd | `active-if-detected` duplication checks | `owner-approved-install` | advisory until duplication thresholds are accepted | Do not drive broad refactors from scanner output alone |
| actionlint / zizmor | `active-if-detected` workflow hardening | `owner-approved-install` | advisory until workflow policy is calibrated | No CI rewrite or permissions change from metadata |
| GSD-style discipline | `active-reference` or external discipline when already available | approval required for any install/vendor/global config | n/a | Do not vendor or duplicate GSD in the toolkit |
| RuFlo-style concepts | `static-adopted` | not approved for runtime | n/a | Runtime hooks, memory, MCP, daemon, global config, watchers, and persistence are `forbidden-runtime` |

| Tool/resource | Lane | Classification | Install location | When to use | When not to use | Evidence output | Owner approval required | Conflict/overlap notes |
|---|---|---|---|---|---|---|---|---|
| TypeScript / typecheck | Frontend Coding and React Quality | default-install | target project dev dependency or existing script | Typed JS/TS projects | Non-TS projects | `typecheck` or equivalent output | Yes for new install | Baseline type evidence, not formatting |
| ESLint | Frontend Coding and React Quality | default-install | target project dev dependency or existing script | JS/TS lint baseline | Biome-owned migration without approval | `lint` output | Yes for new install | Default lint winner with typescript-eslint and React Hooks |
| typescript-eslint | Frontend Coding and React Quality | default-install | target project dev dependency or existing script | Typed linting | Non-TS projects | typed lint output | Yes for new install | Complements ESLint |
| eslint-plugin-react-hooks | Frontend Coding and React Quality | default-install | target React project dev dependency or existing script | React hooks correctness | Non-React projects | lint output | Yes for new install | Complements React Doctor |
| Vitest | Frontend Coding and React Quality | default-install | target project dev dependency or existing script | Unit/integration tests | Existing Jest stack without migration approval | test output | Yes for new install | Complements Testing Library |
| Testing Library | Frontend Coding and React Quality | default-install | target project dev dependency or existing script | Component/user behavior tests | Non-UI projects | test output | Yes for new install | Complements Vitest, not browser automation |
| Playwright for serious UI/browser apps | UI/UX Design Intelligence and Browser Evidence | default-install | target project dev dependency or existing script | Serious UI/browser flows | Backend-only projects | browser test output, traces, screenshots | Yes for new install | Evidence tool, not design taste tool |
| Gitleaks | Backend, Security, Data Safety | default-install | target project tool/script | Current-tree secret scan | Without scope or where project forbids scanners | findings report | Yes for new install | Baseline secret scan |
| OSV Scanner | Backend, Security, Data Safety | default-install | target project tool/script | Dependency vulnerability baseline | No dependency manifest | vulnerability report | Yes for new install | Baseline dependency risk |
| React Doctor for React projects | Frontend Coding and React Quality | active-install-if-project-type | target React project only | React risk, AI-generated React, performance/correctness smells | Non-React projects; without owner approval | React Doctor report | Yes | Active for React; GitHub Action, PR writes, agent skill install are approval-required |
| Oxlint for large JS/TS/React repos | Frontend Coding and React Quality | active-install-if-project-type | target project dev dependency/script | Large repo lint acceleration | Small projects with sufficient ESLint; formatter migration | lint output | Yes | Supplements ESLint, does not replace it |
| Axe Playwright | UI/UX Design Intelligence and Browser Evidence | active-install-if-project-type | target UI project dev dependency/script | Accessibility browser checks | Backend-only projects | accessibility report | Yes | Complements Playwright |
| Lighthouse CI | UI/UX Design Intelligence and Browser Evidence | active-install-if-project-type | target web project script | Public/mobile/performance-sensitive web apps | Non-web or private-only flow without browser target | Lighthouse report | Yes | Performance evidence, not release authority alone |
| Semgrep | Backend, Security, Data Safety | active-install-if-project-type | target project scanner/script | Security-sensitive repos | Style-only changes or no approval | Semgrep findings | Yes | Complements CodeQL |
| dependency-cruiser | Architecture, Repo Intelligence, and Token Context | active-install-if-project-type | target project dev dependency/script | Architecture hardening | Tiny repos or unstable boundaries | dependency report | Yes | First architecture hardening tool |
| actionlint | Backend, Security, Data Safety | active-install-if-project-type | target repo workflow tooling/script | GitHub Actions projects | No workflow files | actionlint output | Yes | Complements zizmor |
| zizmor | Backend, Security, Data Safety | active-install-if-project-type | target repo workflow security tooling/script | GitHub Actions security | No workflow files | zizmor report | Yes | Complements actionlint |
| Trivy | Backend, Security, Data Safety | active-install-if-project-type | target container/IaC/SBOM project tooling | Docker/container/IaC/SBOM projects | No container/IaC/SBOM scope | Trivy findings | Yes | Complements Checkov |
| Checkov | Backend, Security, Data Safety | active-install-if-project-type | target IaC/cloud project tooling | IaC/cloud config exists | No IaC/cloud config | Checkov findings | Yes | Complements Trivy |
| Madge | Architecture, Repo Intelligence, and Token Context | active-install-if-project-type | target project dev dependency/script | Circular dependency risk | No module graph risk | cycle report | Yes | Complements dependency-cruiser |
| jscpd | Architecture, Repo Intelligence, and Token Context | active-install-if-project-type | target project dev dependency/script | Duplication hardening | Cleanup not in scope | duplication report | Yes | Do not drive broad refactor alone |
| CodeQL | Backend, Security, Data Safety | use-if-existing | platform code scanning | Existing GitHub code scanning | Toolkit-local install request | CodeQL alerts | Owner approval for config changes | Complements Semgrep |
| Dependabot or Renovate, choose one per repo | Backend, Security, Data Safety | use-if-existing | target repo service/config | Dependency updates | Running both without policy | update PRs/alerts | Yes for config changes | Choose one automation policy |
| reviewdog | Review, PR Feedback, and Release Evidence | use-if-existing | target repo CI/tooling if already owned | Deterministic scanner-output reporting | No scanner output; AI review duplication | PR comments from deterministic output | Yes for install/config/PR writes | Not CodeRabbit and not merge authority |
| CodeRabbit | Review, PR Feedback, and Release Evidence | use-if-existing | already connected external service | Contextual PR review if connected | Installing/configuring from toolkit metadata | PR review comments | Yes for service/config changes | External service, not package dependency |
| GitHub CLI | Review, PR Feedback, and Release Evidence | use-if-existing | local/operator environment | PR/check/status operations | Package dependency request | command output | Yes for write/merge actions | Operator tool, external-only too |
| Biome | Frontend Coding and React Quality | use-if-existing | target project if already present | Existing Biome-owned formatting/linting | Replacing ESLint without migration approval | Biome output | Yes for migration | Migration-only when not existing |
| Knip only as cleanup candidate if already present | Frontend Coding and React Quality | use-if-existing | target project if already present | Scoped cleanup/archive review | Default/active quality profile | Knip report | Yes for deletions/removals | Removed from active/default profiles |
| GSD | Governance, Planning, Source of Truth | external-only | external Codex/plugin/operator environment | Execution discipline if available | Vendoring into toolkit or project | selected/not invoked or observed output | Yes for any install/config | External discipline tool |
| Superpowers | Governance, Planning, Source of Truth | external-only | external Codex/plugin/operator environment | Planning/execution discipline if available | Duplicating in toolkit | selected/not invoked or observed output | Yes for any install/config | External discipline tool |
| CodeRabbit as service | Review, PR Feedback, and Release Evidence | external-only | external service/GitHub app | Connected PR review | Package dependency or merge authority | CodeRabbit comments/status | Yes for permissions/config | Same service as use-if-existing entry |
| GitHub CLI as operator tool | Review, PR Feedback, and Release Evidence | external-only | local/operator environment | PR/check/merge commands | Vendoring as dependency | command output | Yes for write/merge actions | Same operator as use-if-existing entry |
| Socket | Backend, Security, Data Safety | approval-required | target project/service only after approval | Deep supply-chain review | Without scoped approval | Socket report | Yes | Deep/networked risk |
| TruffleHog | Backend, Security, Data Safety | approval-required | target project tool/script only after approval | Deep secret scan | Baseline current-tree scan sufficient | findings report | Yes | Deeper than Gitleaks |
| OWASP ZAP baseline | Backend, Security, Data Safety | approval-required | bounded test target only | Approved DAST baseline | Production or unbounded targets | ZAP report | Yes | Networked scan |
| Harden-Runner | Backend, Security, Data Safety | approval-required | GitHub Actions only after approval | Workflow runtime hardening | No CI changes approved | workflow/runtime evidence | Yes | CI permission change |
| deep networked scans | Backend, Security, Data Safety | approval-required | approved bounded target only | Security-sensitive release | Unbounded or production-impacting scope | scan report | Yes | Requires explicit target/scope |
| MCP/global config changes | Governance, Planning, Source of Truth | approval-required | global/user config only after approval | Explicit MCP/global task | Toolkit metadata task | config diff/evidence | Yes | Forbidden by default |
| React Doctor GitHub Action / PR write permissions / agent skill install | Frontend Coding and React Quality | approval-required | target repo/service only after approval | Owner-approved React Doctor automation | Default React adoption | Action/config/permission evidence | Yes | React Doctor scanner use can be active while automation remains approval-required |
| package-manager/workspace migrations | Governance, Planning, Source of Truth | approval-required | target project only after approval | Infra-only migration PR | Feature work or UI migration PR | frozen install/build evidence | Yes | Separate PR and rollback required |
| UI UX Pro Max | UI/UX Design Intelligence and Browser Evidence | active-reference | internal reference/rubric | Premium design acceptance criteria | As package/tool install | design criteria | No for reference use | Internal rubric, not external execution |
| Impeccable normalized design guidance | UI/UX Design Intelligence and Browser Evidence | active-reference | source record/reference only | External UI/UX design intelligence | Project-local install without approval | normalized guidance summary | Yes for install | Primary external design reference |
| shadcn/ui reference only | UI/UX Design Intelligence and Browser Evidence | active-reference | source record/reference only | Component pattern/design-system reference | Blind CLI import or component copy | pattern rationale | Yes for CLI/import | Reference, no raw import |
| Addy Osmani UI/web quality methods | UI/UX Design Intelligence and Browser Evidence | active-reference | internal normalized methods | UI/web quality heuristics | Raw source copying | method criteria | No | Normalized methods only |
| Anthropic UIUX normalized guidance | UI/UX Design Intelligence and Browser Evidence | active-reference | restricted normalized guidance | UI/frontend guidance concepts | Raw prompt/source copying | criteria summary | No | Restricted source remains non-authority |
| Bencium dashboard/commercial polish references | UI/UX Design Intelligence and Browser Evidence | removed-from-current-scope | historical source-safety record only | None by default; use toolkit-owned commercial dashboard rubric instead | Active source monitoring, raw copy, install, brand imitation, or active method reliance | archive note | Yes for any reactivation | Removed from active reliance in v0.2.1 |
| Uncodixfy anti-generic AI UI guidance | UI/UX Design Intelligence and Browser Evidence | active-reference | source/reference only | Avoid generic AI UI | Raw prompt/source copying | critique criteria | No | Complementary anti-pattern source |
| VoltAgent design references | UI/UX Design Intelligence and Browser Evidence | active-reference | tracked source/reference if present | Design context if already tracked | New external install/import | reference notes | Yes for install/import | Use only if already tracked |
| Repomix | Architecture, Repo Intelligence, and Token Context | active-if-detected | target project only when project-owned or owner-approved | Scoped context packs and token counts | Default install, automatic whole-repo dump, package change, CI wiring, MCP/global config, product scanning | approved scoped pack/token-count output only if actually run | Yes for install/execution/package/CI/MCP/global config | No default execution or whole-repo dump |
| open-design | UI/UX Design Intelligence and Browser Evidence | active-reference | read-only source/reference | Reviewed design-system research and UI/UX reference | Install/MCP/global design-system persistence or raw import | reference notes | Yes for install/import | Active reference only, not a design-system install |
| eslint-plugin-boundaries after architecture layers are stable and owner-approved | Architecture, Repo Intelligence, and Token Context | active-install-if-project-type | target project after owner approval | Mature layer policy | Unstable architecture layers | lint output | Yes | Use after dependency-cruiser hardening and owner approval |
| Impeccable project-local install mode | UI/UX Design Intelligence and Browser Evidence | approval-required | target project only after approval | Owner-approved design intelligence install | Default UIUX reference use | approved tool output only if actually run | Yes | Normalized reference use remains active-reference |
| Base UI | UI/UX Design Intelligence and Browser Evidence | removed-from-current-scope | none | Historical/source-safety rationale only | Current v0.2 recommendations | archive note | Yes for any reactivation | Removed from current-scope model |
| Figma | UI/UX Design Intelligence and Browser Evidence | removed-from-current-scope | none | Separately supplied approved design artifact outside this model | Current v0.2 recommendations | approved design artifact if separately provided | Yes for integration/config | Excluded from current-scope v0.2 recommendations |

## Matrix Rules

- No automatic install follows from any row.
- No fake validation follows from any row.
- Owner approval is required before new target-project tools, package-manager changes, CI changes, MCP/global config changes, external service permission changes, and approval-required scans.
- Output counts only when the target project or environment actually ran the command/tool.
