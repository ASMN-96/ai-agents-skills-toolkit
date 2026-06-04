---
sourceRef: unknown-review-required
lastExtracted: unknown-review-required
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

## Stop Conditions

- Cache keys may leak tenant/account/user/private data.
- Optimization would change behavior without tests or owner approval.
- Performance readiness is requested without any measurable baseline and the risk is material.
- Package, CI, deployment, infrastructure, or production-observability changes are needed without approval.
