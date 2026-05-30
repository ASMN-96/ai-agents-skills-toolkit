# Enterprise Tool Ownership Matrix

## Purpose

This matrix assigns accountable review buckets for external tool metadata. It does not approve installation, execution, CI wiring, MCP setup, GitHub app permissions, or product-repository usage.

## Owner Buckets

| Owner bucket | Tool categories | Default status |
| --- | --- | --- |
| `quality-tool-owner-required` | type-safety, linting, React correctness, fast lint/format, cleanup, testing, browser/component testing, accessibility, web performance, React scanner | `metadata-only-owner-review-required` |
| `architecture-tool-owner-required` | architecture-boundary, duplication | `metadata-only-owner-review-required` |
| `security-tool-owner-required` | SAST, secrets, dependency security, supply chain, IaC/container security, DAST, source trust | `metadata-only-owner-review-required` |
| `platform-security-owner-required` | CI security, CI runtime security | `metadata-only-owner-review-required` |
| `dependency-automation-owner-required` | dependency bots | `metadata-only-owner-review-required` |
| `release-tool-owner-required` | PR feedback, PR review, repo operations | `metadata-only-delegated-service-review-required` or `metadata-only-repo-permission-review-required` |
| `source-intelligence-owner-required` | source intelligence tools | `metadata-only-source-review-required` |
| `product-design-tool-owner-required` | UI/UX reference tools | `metadata-only-reference-review-required` |

## Evidence Required Before Approval

Every tool stays metadata-only until its owner records evidence for license, SaaS/local behavior, telemetry behavior, network behavior, repository permissions, CI permissions, GitHub app permissions, secret access risk, authentication model, commercial dependency, and maintenance signal.

Unknown fields remain explicit as `unknown-review-required`. Owner assignment means there is now an accountable review bucket; it does not mean enterprise approval.

## Delegated Services

CodeRabbit remains a delegated external service. Any future approval must include data-sharing notes, GitHub app permission scope, repository access boundaries, configuration ownership, and a rule that CodeRabbit output is advisory review evidence rather than merge authority.
