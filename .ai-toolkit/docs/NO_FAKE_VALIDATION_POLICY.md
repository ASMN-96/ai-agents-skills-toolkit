# No-Fake-Validation Policy

## Purpose

The toolkit must never present planned, skipped, unavailable, fallback, mock, dry-run, metadata-only, partial, or unverified activity as real execution.

This policy applies to agent routing, runtime visibility, validators, source freshness, release gates, browser evidence, CodeRabbit/reviewdog status, external tools, registries, compiled-agent fallbacks, and project sync reports.

## Required Reporting

- Report selected agents separately from agents that actually spawned.
- Report metadata-only registry entries as metadata only; registry presence does not mean installation, activation, approval, runtime visibility, or execution.
- Report dry-run quality gates as dry-run capability checks unless project scripts actually ran and their output was observed.
- Report mock source freshness as mock data; it is not live freshness evidence.
- Report skipped, unavailable, or unconfigured tools as skipped, unavailable, or unconfigured.
- Report CodeRabbit status as unavailable when it cannot be checked; do not infer it from repository metadata.
- Report reviewdog only when deterministic scanner output exists; do not describe reviewdog as an AI reviewer.
- Report browser, screenshot, visual QA, or accessibility evidence only when captured or observed.
- Report compiled-agent version drift as drift until a provenance-safe regeneration flow updates it.
- Report validator WARN output even when aggregate validation passes.

## Forbidden Claims

- Do not claim a check passed unless its command or workflow actually ran and returned passing output.
- Do not claim a fallback path ran unless the fallback was actually invoked.
- Do not claim runtime activation from files under `.ai-toolkit/`, registry entries, source records, or packaged copies.
- Do not claim an external source is trusted, approved, installed, or active from watchlist metadata alone.
- Do not claim enterprise readiness, public release readiness, or merge readiness from CodeRabbit or validator status alone.
- Do not convert a skipped CI job, unavailable tool, partial scan, or dry-run into release evidence without explicit labeling.

## Completion Standard

Every completion report must distinguish:

- real commands run and observed results,
- warnings emitted,
- skipped checks and why they were skipped,
- unavailable tools or agents,
- fallback paths selected versus actually executed,
- manual QA still required,
- residual risk and next verification step.

If validation is partial, the report must say what remains unverified.
