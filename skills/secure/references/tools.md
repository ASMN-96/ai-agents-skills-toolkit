# Security Scanners: Use If Present, Suggest Otherwise

This route is read-only: never install a tool, never run a networked scan, and never
invoke any of these without asking first. If the project already has one configured
(a package script, a CI job, a lockfile entry), you may suggest its existing script;
run it only after the user confirms (the secure agent cannot ask, so it only suggests).
Otherwise, name the gap and suggest the tool — don't set it up.

| Tool | Checks | Look for |
|---|---|---|
| [gitleaks](https://gitleaks.io) | Secrets committed to the repo or its history | An existing `gitleaks` config or CI step |
| [osv-scanner](https://google.github.io/osv-scanner) | Dependency vulnerabilities via OSV data | A `package.json` script or CI step |
| [semgrep](https://semgrep.dev) | Targeted static analysis (SAST) rules | An existing `.semgrep.yml` or CI step |
| [trivy](https://trivy.dev) | Containers, IaC, SBOM, secrets, licenses | A `Dockerfile`/IaC in the repo, plus a configured job |
| [zizmor](https://github.com/woodruffw/zizmor) | GitHub Actions workflow security | Workflow files under `.github/workflows/` |
| [actionlint](https://github.com/rhysd/actionlint) | GitHub Actions syntax and known-unsafe patterns | Same — workflow files present |
| [codeql](https://codeql.github.com) | Semantic SAST | GitHub code scanning already enabled |

## Rule

Registry presence never implies install, activation, or execution. If none of these
are wired into the project, say so as a finding ("no automated secret/dependency
scanning detected") rather than running one yourself. If asked to run one, confirm
with the user first — this route reports, it does not act.
