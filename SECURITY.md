# Security

## Reporting
Report vulnerabilities privately through GitHub: **Security → Report a vulnerability** on this repository. Please do not open a public issue for a security problem.

## What this toolkit ships
- Markdown instructions only: route skills, vendored upstream skill files, references, and two Claude subagent definitions.
- No hooks, MCP servers, background processes, or install scripts. Nothing runs when the plugin is installed.
- Upstream files are copied unmodified at pinned commits and verified by sha256 (`sources/lock.json`, checked by `node scripts/validate.mjs`).

## What to watch for
Skills are instructions that an agent follows, so treat them as supply-chain input. If a vendored file contains instructions that try to exfiltrate data, disable safeguards, or run unexpected commands, report it; the source will be removed or pinned back.
