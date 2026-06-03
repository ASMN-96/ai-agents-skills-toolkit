# Architecture Overview

The toolkit is intentionally thin: governance metadata, compiled artifacts, and validator gates.

## Layers

### 1) Source layer

- External sources are represented through reviewed records.
- Raw external skills are not activated directly.
- Source records track freshness, trust, license, and maintenance signals.

### 2) Knowledge layer

- Methods are normalized into reusable assets.
- Registries store metadata for agents, prompts, routing rules, tools, and profiles.
- Passive metadata is not runtime evidence.

### 3) Runtime artifact layer

- Canonical runtime surface is kept to **5 skills + 12 agents**.
- Compiled artifacts are the only intended artifacts synced to projects.
- Compiled outputs are tracked by versioned scripts and validator checks.

### 4) Governance layer

- Policies: no-fake validation, owner gate behavior, public/private release policy.
- Evidence: public/private leak scans, stale/unverified classification, operator logs, closeout reports.
- Gates: controlled-pilot checks and release checklists.

### 5) Release readiness layer

- Validation scripts provide explicit status and warnings.
- Public package checks are allowlist-based and do not certify full-repo publication by themselves.
- Owner decisions remain required for public naming, blocker resolution, and release channel approval.

## Boundaries

- This repository does not change global Codex config.
- It does not modify product repositories.
- It does not duplicate external execution plugins.
- It does not claim enterprise or public readiness without dedicated evidence.

## Why this split exists

Separating metadata/routing/provenance from runtime avoids silent behavior drift and makes review outcomes portable across projects while preserving auditable evidence for future publication.
