# Sources

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
