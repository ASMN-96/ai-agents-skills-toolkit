# Sources

`sources/source-watchlist.json` is the sole canonical SourceCatalog v2 inventory. It reconciles reviewed references, generated tool-source identities, historical records, and service integrations. `.ai-toolkit/sources/**` is generated output and must never be edited as source of truth.

Source state is intentionally split into three independent dimensions:

- Monitor: `CURRENT`, `CHANGED`, `CHECK_FAILED`, or `MANUAL_DUE`.
- Review: `UNREVIEWED_BLOCKED`, `REVIEWED_CURRENT`, or `QUARANTINED`.
- Runtime posture: `metadata-only`, `active-if-detected`, `owner-approved-install`, `ci-advisory`, or `forbidden-runtime`.

Freshness never activates a tool. `active-if-detected` still requires independent, read-only project capability evidence. A changed, failed, due, expired, or unreceipted source remains ineligible for dependent-resource routing.

Immutable SourceReviewReceipt v1 evidence belongs at `sources/reviews/<source-id>/<exact-revision>.json`. Legacy review notes retained during migration are non-authoritative until replaced by a valid receipt with exact revision and digest, license/security/prompt-injection evidence, final disposition, complete affected-artifact coverage, a catalog-registered approver identity, expiry, and a locally verified rollback commit.

Receipt digests and prior-receipt chaining provide tamper evidence inside Git; they do not prove cryptographic identity. Approval authenticity depends on protected-branch and required-code-owner controls enforced outside this repository. Those external controls remain the approval trust boundary until a signed attestation or runtime-owned identity mechanism is implemented and verified. The migrated catalog intentionally starts with an empty approver allowlist, so no receipt can be applied until the owner registers a real accountable identity through normal review.

```text
node scripts/check-source-freshness.mjs --fail-on-change --output docs/SOURCE_FRESHNESS_REPORT.md --json-output docs/SOURCE_FRESHNESS_REPORT.json
node scripts/validate-source-governance.mjs --freshness-report docs/SOURCE_FRESHNESS_REPORT.json
node scripts/apply-source-review.mjs --receipt <receipt.json> --dry-run
node scripts/apply-source-review.mjs --receipt <receipt.json> --confirm-write
```

Mock freshness output is deterministic and offline but cannot satisfy governance validation or release evidence. Live JSON evidence must be no older than 24 hours, must match the canonical monitor revision and digest, and never authorizes source import or runtime activation.

Confirmed review application uses an exclusive lock, compare-and-swap check, staged validation, and recoverable transactional promotion. Review application changes only canonical state. Regenerate `.ai-toolkit` mirrors afterward through the governed embedded-package build; the embedded manifest attests the canonical and generated watchlist digests.

This directory is for reviewed references to external sources such as skills, GitHub repositories, official documentation, marketplaces, and community material.

External sources must not be cloned, installed, activated, or synced directly from here without review and approval.

Each source record should capture:

- Source name and URL.
- License.
- Trust level.
- Maintenance and update activity.
- Popularity signals when visible.
- Relevant files or sections.
- Safety concerns.
- Classification decision.

Existing source records in this directory were created during prior evaluation phases. Phase 10A/10B does not bulk-create new source records; future Phase 10C+ batches should use `docs/EXTERNAL_SOURCE_BACKLOG.md` and create or update records before method extraction.

## Source Record Quality Rules

Each new or updated source record should include:

- URL and source owner.
- Retrieval date and pinned commit/ref when available.
- Purpose and intended extraction target.
- Trust level and maintenance signal.
- License status or uncertainty.
- Useful normalized patterns to extract.
- Rejected patterns that must not be copied.
- Prompt-injection risk.
- Dangerous commands, scripts, network calls, secret access, and filesystem-write risks.
- Operational/runtime risks.
- Recommendation: extract into methods, reference only, ignore, quarantine, or install later after approval.
- Confirmation that no raw skill/plugin/repo content was activated.
