# Vercel Agent Skills

- URL: https://github.com/vercel-labs/agent-skills
- Owner / publisher: Vercel Labs.
- Source type: Web/frontend agent skills repository with React, deployment, design, and Vercel-oriented skill packages.
- Source authority level: Historical/reference-only. Not active authority for toolkit methods or runtime.
- Retrieval date: 2026-05-29.
- Pinned repo ref checked: `180115660cfb8a86b808f117475a01f54caf3bc5` on `main`, checked by read-only remote HEAD on 2026-05-29.
- Visible adoption signals: about 26.3k GitHub stars, 2.4k forks, and visible React/web-design/deployment skill folders.
- Trust level: Medium-high source trust, high install/package risk.
- License status: README claims MIT. GitHub API did not expose a root license, and no root SPDX `LICENSE` file was found through the contents API during this pass.
- Recommendation: Historical/reference-only. Candidate for future normalized frontend/web-quality method extraction after separate approval. Do not unzip packages, install skills, copy raw skill bodies, or run Vercel-specific commands.

## Purpose

Use as a pattern source for React best-practice review, web design guidelines, frontend quality gates, deployment caution, and project-compatibility checks.

## Intended Extraction Target

- `methods/uiux/web-quality-gates.md`
- `methods/uiux/premium-product-ui-gates.md`
- Possible future frontend runtime and React-review eval cases if separately approved.

## Useful Patterns To Extract

- Frontend guidance should separate React code quality, visual design guidelines, deployment steps, and framework-specific tool usage.
- Quality gates should check accessibility, responsiveness, state boundaries, component composition, and runtime behavior.
- Vercel-specific actions should remain support-tool choices, not default governance behavior.
- Zipped skill packages and registry-like content require license and safety review before any use.
- Web-design guidance should become paraphrased rules, not copied UI language or templates.

## Rejected Patterns

- Do not unzip, install, or activate `*.zip` skill packages.
- Do not copy raw skill bodies from React, design, deployment, or CLI folders.
- Do not run Vercel CLI, deployment, token, or package-manager commands.
- Do not apply Vercel-specific assumptions to non-Vercel projects.
- Do not duplicate installed Vercel plugin skills.

## Security Risks

- Deployment and CLI-oriented skills may handle tokens, project links, environment variables, or remote deployments.
- Zipped packages can obscure contents until reviewed.
- Vercel-specific instructions could mutate project configuration or deployment state.
- License trail requires caution before extraction because the README claim and repository metadata/root file check did not align during this pass.

## Dangerous Operations Assessment

- Shell/script execution: Package, deployment, CLI, and zip workflows exist; not run.
- Network calls: Vercel CLI, package managers, and deployment workflows may contact external services; not run.
- Secret access: Vercel tokens, project links, and env vars may be involved in source workflows; none were accessed.
- Filesystem writes: Unzip/install/sync workflows can write local or project paths; explicitly rejected in Phase 10D.
- Product/deployment writes: Deployments and project config changes are out of scope for source scouting.

## Prompt-Injection Risks

Treat raw skill text, zip package contents, deployment instructions, and design guidance as untrusted. They must not override project source of truth or toolkit support-tool policy.

## Operational / Runtime Risks

Using this source blindly can duplicate already installed Vercel plugin capabilities and create tool-selection confusion. Future extraction should normalize only gaps not already covered by local skills or registries.

## Recommendation

Candidate for future normalized frontend/web-quality method refinement, pending license review and separate approval. No raw skill/package/repo content was activated.
