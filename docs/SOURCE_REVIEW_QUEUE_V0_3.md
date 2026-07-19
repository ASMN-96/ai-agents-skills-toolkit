# v0.3 Source Review Queue

This is a technical review queue, not an approval receipt. It records the live observation taken at `2026-07-19T02:25:34.747Z` and preserves fail-closed routing while an actual registered owner approver and complete source reviews are absent.

## Current state

- Catalog: 85 sources, schema 2.0.
- Monitor: 15 `CURRENT`, 7 `CHANGED`, 34 `CHECK_FAILED`, 29 `MANUAL_DUE`.
- Review: all 85 are missing a current approved receipt and remain `QUARANTINED`; zero approved JSON receipts.
- Runtime posture was not changed by freshness sync. No source was installed, copied, activated, or executed.
- Release consequence: all 85 sources are actionable, so v0.3 source readiness is blocked.

## Priority 1: high-risk sources still missing review

| Source | Observed revision | Technical observation | Proposed disposition | Required before receipt |
| --- | --- | --- | --- | --- |
| `anthropic-skills` | `fa0fa64bdc967915dc8399e803be67759e1e62b8` | Monitor state is now `CURRENT`, but no approved receipt exists. Mixed per-artifact licensing and executable skill content remain copy and runtime boundaries. | `SYNCED_REFERENCE` | Full watched-artifact license, prompt-injection, script/network/secret, and artifact-digest review. |
| `openai-skills` | `49f948faa9258a0c61caceaf225e179651397431` | Monitor state is now `CURRENT`, but no approved receipt exists. Per-skill licensing remains a copy boundary. | `SYNCED_REFERENCE` | Exact watched-artifact and license review plus owner approval. |
| `trailofbits-skills` | `cfe5d7b1619e47fb5b38b7e2561dad7e5f1e89af` | Monitor state is now `CURRENT`, but non-permissive/share-alike terms and executable content still require reference-only treatment. | `SYNCED_REFERENCE` | Complete license, dangerous-operation, network, secret-access, prompt-injection, and artifact-digest review. Runtime adoption remains forbidden. |
| `supabase-agent-skills` | `1ad9aaeb49caafd9e95c0a91116f71890eebbc53` | Monitor state is now `CURRENT`. Existing posture is `active-if-detected`, but freshness does not activate it and no approved receipt exists. | `SYNCED_PLUGIN_DELEGATED` | Full current skill review, detected-runtime evidence, registered approver, and immutable receipt. |

These are recommendations only. The toolkit must not create a receipt until the exact revision, content digest, full governed artifact set, license, security, prompt-injection review, rollback target, and registered approver identity are present.

## Priority 2: changed delivery dependencies

Review next, in this order:

1. `gsd-core` at `873bdf51e5f44d4eaf2e115039e59c4e8ac59dbb` — `CHANGED_REVIEW_REQUIRED`; proposed `SYNCED_REFERENCE`. GSD remains a workflow lens, not an automatically active runtime.
2. `repomix` at `2418bd05ccfbd6c39594854ab12695513afafba9` — `CHANGED_REVIEW_REQUIRED`; proposed `SYNCED_REFERENCE`. Do not run or install it from source review.
3. `microsoft-playwright` at `449349caea6d1c81dc8b6a6f447cf9bfca6b1350` — `CHANGED_LOW_RISK`; proposed `SYNCED_PLUGIN_DELEGATED` only after current plugin/runtime review.
4. `addy-osmani-agent-skills` at `2fbfa004a0192529bc997d103fc12f19a3804aab` and `everything-claude-code` at `754b8dd76ca885b764ec22f476664377aa46b6cd` — `CHANGED_LOW_RISK`; default to `SYNCED_REFERENCE` unless a concrete missing gate and permissive clean-room adoption case is proven.
5. `impeccable` at `e4ab5e24bdf5321b72163d2fbcbe6fa985c848ba` and `ruflo` at `12ede21767a6dd669df1b79392a5d27d9154f237` — `CHANGED_LOW_RISK`; prior adopted concepts must be revalidated and mapped to toolkit-owned artifacts.
6. Current but still unreviewed community sources remain quarantined. `agency-agents` and `bencium-marketplace` retain `forbidden-runtime`; use `ARCHIVED_HARD_BLOCKER` or `REMOVED_REDUNDANT` if review cannot justify continued catalog value.

## Priority 3: generated tool-source metadata failures

The following 34 sources are `CHECK_FAILED` because governed review metadata is incomplete. This is missing evidence, not proof that the tools are unsafe and not permission to activate them:

`typescript`, `typescript-eslint`, `eslint-plugin-react-hooks`, `biome`, `oxlint`, `knip`, `react-doctor`, `vitest`, `testing-library`, `axe-playwright`, `lighthouse-ci`, `codeql`, `semgrep`, `gitleaks`, `trufflehog`, `osv-scanner`, `dependabot`, `renovate`, `socket`, `trivy`, `checkov`, `owasp-zap-baseline`, `actionlint`, `zizmor`, `harden-runner`, `reviewdog`, `github-gh`, `open-design`, `openssf-scorecard`, `dependency-cruiser`, `eslint-plugin-boundaries`, `madge`, `jscpd`, and `eslint`.

Each needs authoritative identity, exact version/revision evidence, license/security review, runtime posture confirmation, dependent-resource mapping, and a current receipt before it can influence new v0.3 routing.

## Priority 4: manual authoritative documentation

The 29 `MANUAL_DUE` documentation sources require a content digest and, when available, ETag or Last-Modified evidence. Review authoritative platform/security sources before community methods:

- OpenAI/Anthropic runtime guidance: `openai-codex-guidance`, `openai-codex-behavior-boundaries`, `openai-prompt-caching`, `anthropic-claude-code-subagents`.
- Standards/security: `w3c-wcag-22`, `owasp-asvs`, `owasp-masvs`, `nist-ssdf`, `nist-ssdf-ai`, `nist-ai-rmf-genai`, `owasp-llmsvs`, `owasp-agentic-applications`, `slsa-v1-2`, and `openssf-ai-code-assistant-instructions`.
- Apple/Android/Microsoft: `apple-human-interface-guidelines`, `apple-accessibility`, `apple-privacy-manifests`, `android-core-app-quality`, `android-accessibility`, `microsoft-windows-app-guidance`, `microsoft-windows-accessibility`.
- Cross-platform: `expo-documentation`, `electron-security-guidance`, `tauri-security-guidance`.
- Other governed references: `gitlab-agent-skills`, `gitlab-agentic-tool-development`, `aider-repo-map`, `skills-sh`, and `coderabbit`.

Mixed or non-permissive sources default to reference-only. Accepted concepts must be expressed as toolkit-owned gates, methods, tests, or documentation; upstream skills and scripts must not be copied or run.

## Approval boundary

The canonical approver allowlist is empty. The assistant cannot invent or self-assert an owner identity, and repository-local strings are tamper evidence only—not cryptographic identity proof. Final receipts therefore require an owner identity registered through the repository's protected review process; signed or runtime-owned approver attestation remains future hardening.
