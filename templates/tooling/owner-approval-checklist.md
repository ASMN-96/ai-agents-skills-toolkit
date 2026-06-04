# Owner Approval Checklist

Owner must review before applying. Codex must not claim output unless the actual script or tool ran and produced current output. Package-manager changes require separate approval.

## Approval Required Before

- adding dependencies or changing package files;
- changing package manager, workspace config, or lockfile strategy;
- wiring CI or deployment commands;
- configuring MCP or global/user config;
- granting GitHub app, PR write, or external service permissions;
- running approval-required tools;
- changing database, auth, RLS, secrets, deployment, or production config;
- copying external source, prompt, component, registry, or script content.

## Approval Record

- target project:
- owner:
- approved scope:
- files/surfaces allowed:
- tools allowed:
- commands allowed:
- stop conditions:
- rollback:
