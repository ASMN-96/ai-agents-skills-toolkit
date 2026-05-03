# Security Profile

## Included Agents

- Security Agent
- Skill Scout Agent
- Database RLS Agent
- Backend Contract Agent
- Reviewer Agent

## Recommended Support Tools

- Superpowers as an external Codex execution-discipline plugin.
- Context7 when available/configured for current security, auth, platform, or API guidance.

## Default Mode

Review.

## Allowed Actions

- Review source intake, prompts, scripts, secrets, auth, authorization, data exposure, and supply-chain risk.
- Classify security findings and required mitigations.
- Recommend focused fixes and verification gates.

## Forbidden Actions

- Read or request secrets unless strictly required and approved.
- Install or activate external skills.
- Run unknown scripts.
- Modify global Codex config or product repos.

## Required Output Format

- Security findings ordered by severity.
- Evidence and affected surfaces.
- Required fixes or non-blocking hardening.
- Verification requirements.

## Required Verification Gates

- Confirm no secrets/env files or unsafe artifacts were added.
- Confirm external sources remain inactive unless explicitly approved.
- Confirm auth/data access risks have negative tests or review evidence.
- Confirm unresolved critical findings block merge or release.
