# Immutable Source Review Receipts

Store one SourceReviewReceipt v1 at `sources/reviews/<source-id>/<exact-revision>.json` only through `scripts/apply-source-review.mjs --confirm-write`.

For a `manual-reviewed-doc`, a reviewer may record a fresh local observation before a receipt exists with:

`node scripts/record-manual-source-observation.mjs --source-id <id> --content-file <temporary-downloaded-file> --observed-at <ISO> [--source-url <catalog-url>] [--etag <value>] [--last-modified <value>] [--dry-run|--confirm-write]`

The command defaults to dry-run and accepts only a regular, non-linked UTF-8 file in the local temporary directory. It normalizes line endings to LF, records only the SHA-256 monitor observation as `CHANGED`, and never stores downloaded content, creates a receipt, approves review, imports source material, or changes runtime posture. `--source-url` is optional; when supplied, it must exactly match the catalog's source URL. A separately approved immutable receipt is still required to move the source to `REVIEWED_CURRENT`.

- GitHub receipt filenames use the exact 40-character reviewed SHA.
- Mutable-documentation receipt filenames use the exact SHA-256 content digest without the `sha256:` prefix.
- Existing receipt content is immutable. A different review of the same revision must not overwrite it.
- Receipt bytes are SHA-256 bound into the catalog, and each replacement receipt binds the prior receipt path and digest.
- This is repository tamper evidence, not a cryptographic signature. Approver authenticity still depends on externally enforced protected-branch and required-code-owner controls.
- An approver must already be registered in the canonical catalog's `approverPolicy`. The toolkit does not treat a self-asserted receipt identity as approval.
- The rollback artifact must resolve to an available ancestor Git commit when a receipt is applied or validated.
- Mixed, non-permissive, or unknown licenses remain reference-only or blocked.
- Restricted security or prompt-injection reviews remain reference-only or blocked.
- A reference-only disposition can never make a dependent runtime resource eligible.
- A receipt never installs, imports, copies, activates, or executes upstream content.
- Legacy review notes are not receipts and do not satisfy current-review gates.

No receipt is created during schema migration. Each source remains quarantined until a separately reviewed receipt is applied. The production CLIs always use the host clock; deterministic clock injection exists only in the module-level test seam.
