# No-Fake-Validation Checklist

- Commands claimed as passed were actually run and their output was observed.
- WARN output is reported even when aggregate validation passes.
- Dry-runs, mocks, planned checks, skipped checks, partial checks, and unavailable tools are labeled clearly.
- Selected agents are separated from agents that actually spawned.
- Registry entries, source records, package manifests, and `.ai-toolkit` files are not described as runtime activation.
- CodeRabbit status is reported only when checked or available from current PR evidence.
- reviewdog is reported only as deterministic scanner-output evidence when scanner output exists.
- Browser, screenshot, visual QA, and accessibility claims are backed by actual observed evidence.
- Compiled-agent drift remains labeled as drift until a provenance-safe regeneration flow updates it.
- Remaining unverified work and manual QA are stated before release or completion claims.
