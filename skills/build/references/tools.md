# Build-route tools

Type-safety, lint, and test tools this route expects a JS/TS project to already have.
Use what the project already has; suggest an addition, never install one without asking.

| Tool | Purpose | Run it |
|---|---|---|
| TypeScript | type checking | `tsc --noEmit` (or the project's typecheck script), if configured |
| typescript-eslint | typed linting for TS/JS | the project's lint script, if configured |
| eslint-plugin-react-hooks | hook-rules and dependency-array enforcement | the project's lint script, on any hook/component change |
| ESLint | JS/TS lint baseline | the project's lint script |
| oxlint or biome | fast lint/format, only if the project already uses one | the project's lint script |
| Vitest (or the project's own runner: Jest, etc.) | unit and component tests | the project's test command, every RED/GREEN step |
| Testing Library | user-centric DOM/component tests | component tests, alongside Vitest/Jest |

Adapted from this toolkit's `registries/tools.registry.json` as of v0.2.5 (toolkit-authored summary, not vendored upstream).
