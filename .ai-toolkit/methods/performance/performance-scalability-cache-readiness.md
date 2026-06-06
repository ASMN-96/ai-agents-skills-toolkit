---
sourceRef: ["toolkit-authored"]
lastExtracted: 2026-06-06
status: approved
---

# Performance Scalability Cache Readiness

## Purpose

Review performance, scalability, and cache risk during coding before broad optimization or release claims.

## Required Checks

- Identify the smallest user workflow, route, query, component, job, or cache path affected.
- Separate observed bottlenecks from assumptions.
- Check request count, query shape, indexes, cache keys, invalidation, stale data, tenant/user isolation, bundle/runtime cost, rendering cost, memory, and concurrency risk.
- Prefer existing profiler, benchmark, test, browser, query, build, and log evidence when available.
- Avoid premature rewrites unless measured risk or clear complexity justifies it.

## Evidence Requirements

Report baseline or reproduction evidence when collected, commands actually run, measurement limits, skipped checks, and whether the fix is verified or only risk-reduced.

## Compact Example

Good pattern:

- Identify the exact slow workflow, collect a baseline when feasible, reduce request/query/render/cache cost, and report what improved versus what remains unmeasured.

Bad pattern:

- Rewriting broad architecture because something feels slow without reproduction, measurement, or a scoped hypothesis.

Evidence required:

- Baseline or reproduction evidence when available, commands run, measurement limits, and verified or risk-reduced status.

Stop condition:

- Pause when optimization changes behavior, cache isolation, infrastructure, packages, CI, deployment, or production settings without approval.

## Stop Conditions

- Cache keys may leak tenant/account/user/private data.
- Optimization would change behavior without tests or owner approval.
- Performance readiness is requested without any measurable baseline and the risk is material.
- Package, CI, deployment, infrastructure, or production-observability changes are needed without approval.
