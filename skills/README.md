# Skills

This directory is reserved for reviewed skill metadata and toolkit-managed skill notes.

Raw external skills must not become active automatically. Treat all skills as supply-chain artifacts requiring source evaluation, approval, and intentional activation or compilation.

No external skills have been installed or activated by this toolkit.

## Toolkit-Owned Skills

- `riss-governance`: RISS-specific governance/router guidance for source-of-truth checks, narrow agent/tool routing, dependency-chain safety, PR/CI/CodeRabbit discipline, and validation-before-completion.

## External Governance Tools

- GSD is an external core governance tool for serious multi-step work, audits, migrations, backend work, security/SRE audits, and release programs. It tracks phase/state/roadmap/release gates and must not be vendored into this toolkit.
- Superpowers remains the external core execution-discipline plugin for systematic debugging, TDD, code review, and verification-before-completion.
- Use only the minimum required tools for a task. Do not activate every plugin, tool, agent, or profile by default.
