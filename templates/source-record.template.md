# Source Record Template

Template for reviewed external source evidence files under `sources/`.

- URL:
- Related URL:
- Owner / publisher:
- Source type:
- Source status:
- Retrieval date:
- Last checked date:
- Last reviewed date:
- Last reviewed commit:
- Last extracted date:
- Last extracted commit:
- Trust level:
- License status:
- Tool enterprise-risk record, if applicable:

## Purpose

Describe why this source is relevant to this toolkit.

## Intended extraction target

- `methods/...`
- `docs/...`
- `skills/...` (only when approved)

## Useful Patterns To Extract

- ...

## Rejected Patterns

- ...

## Security Risks

- ...

## Dangerous Operations

- Shell/script execution: ...
- Network calls: ...
- Secret access: ...
- Filesystem writes: ...
- Product/data mutation: ...

## Prompt-Injection Risks

- ...

## Operational / Runtime Risks

- ...

## Recommendation

- ...

## Source Provenance (Stable)

- Watchlist path:
- Reviewed by:
- Review decision:
- Last review evidence:

## Enterprise Tool Boundary

If this source backs an external tool entry, enterprise-risk metadata belongs in
`registries/tools.registry.json` under `enterpriseRisk`. A source record alone
does not approve installation, activation, CI usage, GitHub permissions,
credential access, or product-repository use.
