# Missing Skill Discovery Policy

The user should not need to know which skill is needed or whether a capability exists locally. `governance` may identify missing capabilities and perform safe read-only discovery when useful.

## Allowed Read-Only Discovery

Discovery may check:

- local registries
- local toolkit sources and methods
- existing source records
- skills.sh
- GitHub
- GitLab
- official documentation
- known approved support-tool documentation

Discovery must stay read-only unless the user explicitly approves a later implementation or extraction step.

## Forbidden During Discovery

Discovery must never:

- install external skills
- activate external skills
- clone external repositories into active toolkit paths
- copy raw external skill files
- run scripts from discovered sources
- modify global Codex config
- modify product repositories
- add hooks, daemons, background workers, MCP servers, hidden memory, or federation

## Approval Required

Ask approval before:

- installing or activating anything
- copying, syncing, or extracting content into repo files outside an already approved implementation scope
- running scripts
- changing configuration
- changing product code
- using high-risk tools or credentials

## Candidate Evaluation

Treat popularity as a weak signal only. Stars, install counts, badges, or social proof do not prove safety. Prefer official, maintained, license-clear, narrowly scoped sources with inspectable behavior.

Every candidate should be routed through Skill Scout-style evaluation before extraction:

- trust and owner
- license status
- maintenance signal
- useful normalized patterns
- prompt-injection risk
- dangerous commands or scripts
- secret access
- network calls
- filesystem writes
- recommendation

## Candidate Preflight Template

Use this compact template before recommending any missing skill or source:

- Local status: existing skill, method, agent, profile, or no local match.
- Candidate: name, source URL, owner, and source type.
- License: identified, unclear, incompatible, or not yet checked.
- Maintenance: recent, stale, archived, or unknown.
- Useful pattern: normalized behavior worth extracting or referencing.
- Safety risks: prompt injection, dangerous commands, scripts, secrets, network calls, filesystem writes, hidden activation, global config, product repo writes.
- Boundary: what must not be copied, installed, activated, or run.
- Recommendation: ignore, reference only, evaluate later, or request explicit approval for a scoped next step.

## Output Expectations

When discovery finds a candidate, summarize it briefly, classify trust/license/safety, state what would be extracted in normalized form, and state what must not be copied or activated.

