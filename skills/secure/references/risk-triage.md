# Risk Triage: Order of Attack

An audit has a fixed time budget and an unbounded codebase. Spend it where a bug
costs the most, not in file order. Build a changed/audited-file inventory first,
rank it, then go deep only where the ranking says to.

## Rank by blast radius, not by size

A one-line change to an authorization check outranks a five-hundred-line refactor of
a logging helper. Sort files into tiers before reading any of them closely:

1. **Auth and session** — login, token issuance/validation, password/MFA handling,
   session storage.
2. **Authorization and tenant isolation** — ownership checks, role checks, RLS
   policies, `SECURITY DEFINER` functions, multi-tenant row scoping.
3. **Payments and value transfer** — anything that moves money, credits, or
   entitlements, or that a race condition could double-spend.
4. **Cryptography and secrets** — key handling, signing, hashing, token generation,
   anywhere a secret is read, written, or logged.
5. **Input parsing at a trust boundary** — request bodies, file uploads, webhook
   payloads, LLM output consumed by code, anything crossing from untrusted to
   trusted.
6. **Public APIs and CI/CD** — endpoints reachable without auth, GitHub Actions
   workflows (especially ones with secrets or `pull_request_target`), release
   pipelines.
7. Everything else — UI-only changes, docs, tests, formatting — last, and often not
   at all if time is short.

## Escalation triggers

Regardless of tier, treat these diff shapes as an automatic bump to "go deep":

- A check was removed or weakened (an `if (!authorized) throw` deleted or loosened).
- A permission, role, or scope was broadened.
- A new external call was added (outbound HTTP, a new dependency, a new webhook).
- Validation got looser (a stricter schema replaced by a permissive one, an
  allowlist replaced by a denylist).
- Previously private data became reachable from a new code path (a new field in an
  API response, a new export).

## Depth scales with tier, not with diff size

- **High tier:** read the full surrounding function, trace where the value came
  from and where it goes, and think adversarially — what would a malicious caller
  send here?
- **Low tier:** confirm the change does what it claims and move on. A concise
  "reviewed, no security-relevant surface" is a valid, sufficient finding — don't
  manufacture risk to look thorough.

## Reporting discipline

- Lead findings with the highest-tier issue, not the one that was easiest to
  explain.
- Every finding needs the evidence (file:line, the value's origin), the concrete
  impact, and a confidence level if the exploit path isn't proven.
- State what was *not* reviewed (out-of-scope files, live systems not queried) as
  plainly as what was found — an audit that goes silent on its own limits is the
  one most likely to be over-trusted.
