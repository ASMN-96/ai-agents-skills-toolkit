# Audit Findings Remediation Matrix

Date: 2026-06-07

Evidence label: manual/static audit plus observed local validator output. This matrix closes stale/incorrect audit counts and tracks remediation targets for valid and partially valid findings. It is not runtime activation proof, source freshness proof, tool execution proof, release publication, or owner approval.

Validation commands used as targets:

- `node scripts/validate-toolkit.mjs`
- `node scripts/ai-toolkit/validate-codex-runtime.mjs`
- `node scripts/ai-toolkit/run-toolkit-evals.mjs`
- `node scripts/test-compile-agents.mjs`
- `node scripts/test-sync-runtime.mjs`
- `node scripts/test-source-freshness-hardening.mjs`
- `node scripts/check-source-freshness.mjs --fail-on-change`
- `node scripts/check-source-freshness.mjs --mock`
- `node scripts/scan-public-private-leaks.mjs --check`
- `git diff --check`

## Matrix

| ID | Current status | Impact | Corrected current-state note | Remediation target | Validation | Owner approval |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | partial | security | 37 tools exist; before remediation 35/37 still had all 14 core risk fields unknown. | Explicit review states and validator rejection of all-unknown core risk templates. | `node scripts/validate-toolkit.mjs` | No |
| B2 | valid | runtime truth | Registry language let native-visible/active imply spawn. | Separate TOML presence, compiled fallback, recommendation, and actual spawn proof. | `node scripts/ai-toolkit/validate-codex-runtime.mjs` | No |
| B3 | valid | security | Vulnerability disclosure path exists only as public-safe placeholder/gap. | Surface owner-decision backlog in `SECURITY.md` and README/status docs. | `node scripts/validate-toolkit.mjs` | Owner needed for private channel |
| B4 | partial | security | No `currentPosture`/`postureValues`; "8 posture values" count was stale. | Controlled `activationLevels` vocabulary and enterprise risk doc. | `node scripts/validate-toolkit.mjs` | No |
| B5 | valid | release | Changelog history was one `Unreleased` bucket. | Add v0.2.0, v0.2.1, v0.2.2, v0.2.3 sections and keep new work under `Unreleased`. | `git diff --check` | No |
| B6 | valid | release | v0.2.2 and v0.2.3 notes lacked historical/current relation. | Historical banner in v0.2.2 and current superseding banner in v0.2.3. | `git diff --check` | No |
| B7 | valid | source freshness | Trail of Bits CC-BY-SA source is adopted through cleanroom method discipline. | Source provenance audit documents license boundary and method use. | `node scripts/validate-toolkit.mjs` | No |
| B8 | valid | source freshness | Vercel and Karpathy needed clearer cleanroom/reference boundaries. | Source provenance audit and Karpathy `toolkit-authored` sourceRefs. | `node scripts/validate-toolkit.mjs` | No |
| B9 | valid | source freshness | GitLab docs existed but were absent from the watchlist. | Add manual-reviewed-doc source type and GitLab watchlist entries. | `node scripts/test-source-freshness-hardening.mjs` | No |
| B10 | accepted-no-change | ergonomics | No root `package.json` is intentional. | Document direct `node scripts/...` model; do not package-manage this repo in this pass. | `git diff --check` | Owner needed for package conversion |
| B11/E9 | valid | eval quality | Top-level and embedded eval suites drifted. | Shared eval contract, mirror parity checks, synchronized relevant mirrors. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| B12 | partial | security | Credential ignores were missing; `.ai-toolkit/` and `compiled-agents/` are intentionally tracked. | Add key/env/scratch ignores and document tracked artifacts. | `git diff --check` | No |
| R1 | valid | runtime truth | TOML agents lacked compiled fallback/handoff/no-fake-validation instructions. | Update all TOML developer instructions. | `node scripts/ai-toolkit/validate-codex-runtime.mjs` | No |
| R2 | accepted-no-change | docs | Dual canonical and `.ai-toolkit` paths are mirror compatibility; not runtime activation. | Preserve but document storage/runtime boundary. | `node scripts/validate-toolkit.mjs` | No |
| R3 | accepted-no-change | runtime truth | `runtimeCopy: none` for compiled agents is intentional; compiled content is fallback documentation. | Document compiled fallback boundary. | `node scripts/ai-toolkit/validate-codex-runtime.mjs` | No |
| R4 | accepted-no-change | security | Only `frontend-agent.toml` is workspace-write; other 11 remain read-only. | Document as intentional state. | `node scripts/ai-toolkit/validate-codex-runtime.mjs` | Owner needed to widen sandbox |
| R5 | valid | runtime truth | TOML files did not reference static handoff ledger. | Add handoff ledger instruction to all TOML files. | `node scripts/ai-toolkit/validate-codex-runtime.mjs` | No |
| R6/S1 | partial | docs | Source specs were thin; line-count claim became stale after metadata frontmatter. | Add source-agent compile metadata; do not rewrite agent bodies broadly in this pass. | `node scripts/compile-agents.mjs --confirm-write` | No |
| R7 | valid | release | Compiled source commit was `deterministic-not-recorded`. | Record `git rev-parse HEAD`, compiler, source path, and registry input. | `node scripts/test-compile-agents.mjs` | No |
| S2 | valid | release | Source agents lacked compile pin metadata. | Add `toolkit_pin`, `last_compiled_against`, and `compiled_fallback`. | `node scripts/compile-agents.mjs --confirm-write` | No |
| S3 | incorrect | docs | Source classification enum was not a runtime defect as written. | Close in matrix; no code change. | `git diff --check` | No |
| S4 | valid | source freshness | RuFlo adopted boundary is static-only despite high-runtime upstream. | Source provenance audit documents forbidden runtime boundary. | `node scripts/validate-toolkit.mjs` | No |
| S5 | valid | security | Everything Claude rejected patterns were prose-only. | Add validator checks for rejected-pattern boundaries. | `node scripts/validate-toolkit.mjs` | No |
| E1 | valid | eval quality | Unsafe expected actions were unconstrained strings. | Eval runner controlled action vocabulary. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E2 | partial | eval quality | Token eval behavior coverage existed but not as benchmark/review behavior. | Add eval contract; create token discipline benchmark artifact. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E3 | partial | eval quality | UIUX behavior fields were inconsistent. | Eval contract requires review behaviors where applicable and adds responsive no-evidence case. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E4 | valid | eval quality | Generic naming eval existed but lacked explicit forbidden alias list. | Add `forbiddenAliases` and mirror parity check. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E5 | partial | eval quality | Source enterprise evals had forbidden claims; embedded toolkit-routing mirror was the weaker surface. | Add shared contract and mirror parity for governed mirrored suites. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E6 | accepted-no-change | eval quality | Some registry `evalStatus` values remain scaffolded metadata. | Eval runner coverage is the enforcement path in this pass. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E7 | valid | eval quality | No active-if-detected eval existed. | Add governance proof eval for active-if-detected not being install/run proof. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| E8 | partial | eval quality | Responsive no-viewport evidence had only one broad case. | Add explicit no-evidence responsive QA stop case. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| O1 | incorrect | docs | CI workflow exists. | Close in matrix; no code change. | `git diff --check` | No |
| O2 | accepted-no-change | ergonomics | No active pre-commit hook is intentional. | Add optional docs template only; no hook activation. | `git diff --check` | Owner needed to activate hooks |
| O3 | partial | eval quality | Script/test ratio was a weak metric; some core scripts lack dedicated tests. | Add targeted tests for new compiler/source freshness behavior. | `node scripts/test-source-freshness-hardening.mjs` | No |
| O4 | incorrect | docs | `sync-runtime.mjs` already has dry-run/default and `--confirm-write`; no product repo writes. | Close in matrix; no code change. | `node scripts/test-sync-runtime.mjs` | No |
| O5 | valid | ergonomics | Quality gate help omitted exit codes. | Document exit codes in help output. | `node scripts/ai-toolkit/run-quality-gate.mjs --help` | No |
| D1 | valid | docs | Code of Conduct enforcement was thin. | Expand reporting and enforcement guidance. | `git diff --check` | No |
| D2 | incorrect | docs | `docs/architecture.md` exists. | Close in matrix; no code change. | `git diff --check` | No |
| D3 | valid | docs | Impeccable `SYNCED_ADOPTED` could read as install approval. | Source provenance audit clarifies adopted concepts vs install prohibition. | `node scripts/validate-toolkit.mjs` | No |
| D4 | valid | runtime truth | Readiness gate conflated native visibility with compiled fallback. | Update readiness doc to require separate reporting. | `git diff --check` | No |
| D5 | partial | docs | Current report was not interleaved, but renderer could interleave future statuses. | Group source freshness report by status. | `node scripts/check-source-freshness.mjs --mock` | No |
| D6 | valid | docs | No root migration guide existed. | Add `MIGRATION.md`. | `git diff --check` | No |
| EN1 | partial | eval quality | No standalone token benchmark existed; token evals existed. | Add token discipline benchmark artifact and eval contract. | `node scripts/ai-toolkit/run-toolkit-evals.mjs` | No |
| EN2 | valid | docs | No root status file. | Add `STATUS.md`. | `git diff --check` | No |
| EN3 | valid | docs | No simple v0.2.2 to v0.2.3 diff. | Add migration notes and changelog sections. | `git diff --check` | No |
| EN4 | partial | docs | Usage guide listed agents but not compiled-fallback consumer reporting. | Add compiled agent consumer example. | `git diff --check` | No |
| EN5 | valid | docs | No Mermaid diagram. | Add runtime-boundary Mermaid diagram. | `git diff --check` | No |
| EN6 | accepted-no-change | ergonomics | Single agent registry is large but validator-backed. | Keep single registry in this pass; use `--only` compiler ergonomics. | `node scripts/validate-toolkit.mjs` | Owner needed for registry split |
| EN7 | valid | release | Release cadence not declared. | Add cadence statement in `CHANGELOG.md`. | `git diff --check` | No |
| EN8 | valid | docs | Contribution rubric was thin. | Add method-quality rubric. | `git diff --check` | No |
| EN9 | accepted-no-change | ergonomics | Embedded data has no incremental build. | Document accepted limitation; no hash cache added in this pass. | `git diff --check` | Owner needed for build-cache design |
| EN10 | valid | ergonomics | Compiler lacked `--only`. | Add `--only <agent-id>` and tests. | `node scripts/test-compile-agents.mjs` | No |
| AF1 | valid | runtime truth | Source-of-truth map and registry needed reconciliation. | Runtime truth schema and docs separate fallback and TOML presence. | `node scripts/ai-toolkit/validate-codex-runtime.mjs` | No |
| AF2 | accepted-no-change | docs | UIUX dual path references mirror R2. | Preserve mirror compatibility; no runtime claim. | `node scripts/validate-toolkit.mjs` | No |
| AF3 | valid | runtime truth | Registry prose acknowledged selected/recommended lens ambiguity. | Encode ambiguity as explicit fields instead of prose only. | `node scripts/validate-toolkit.mjs` | No |
| AF4 | valid | security | Tool registry had repeated enterprise-risk templates. | Explicit review states and validator checks. | `node scripts/validate-toolkit.mjs` | No |
| AF5 | valid | release | Changelog lacked v0.2.3 heading. | Add versioned changelog. | `git diff --check` | No |
| AF6 | valid | source freshness | Forbidden surfaces were scattered. | Source provenance audit plus validator checks for high-risk source boundaries. | `node scripts/validate-toolkit.mjs` | No |
| AF7 | valid | runtime truth | Readiness `or` allowed fallback-only interpretation. | Update readiness language to separate signals. | `git diff --check` | No |

## Notes

- Incorrect findings are closed here rather than implemented.
- Partially valid/stale findings are remediated against current repo state, not old line counts.
- `.ai-toolkit/` and `compiled-agents/` remain tracked canonical/distribution artifacts.
- GitLab documentation sources are tracked manually as reviewed docs, not as fake live GitHub sources.
- No dependency install, global runtime activation, product-repository write, MCP setup, CI permission expansion, release tag, or publication action is authorized by this matrix.
