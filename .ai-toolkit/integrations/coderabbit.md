# CodeRabbit Integration Record

- Integration name: CodeRabbit
- Integration type: external connected service/plugin
- Runtime surface: Codex plugin / GitHub app integration
- Official docs: https://docs.coderabbit.ai
- Toolkit role: route PR-review and merge-readiness workflows to CodeRabbit when already available, then interpret its feedback alongside repo policy and validator evidence.
- Toolkit boundaries: the toolkit does not install, authenticate, configure, vendor, copy, or activate CodeRabbit.
- GitHub source status: GitHub repositories such as `coderabbitai/coderabbit-docs` must be treated as archived or historical if applicable, not as current authoritative runtime source.
- Reference-only material: `coderabbitai/awesome-coderabbit` may be useful as reference-only ecosystem metadata, but it is not authoritative docs.
- Reviewdog boundary: reviewdog remains deterministic scanner-output reporting only and must not duplicate CodeRabbit as a noisy AI reviewer.

## Approval Required For

- Installing the plugin.
- Changing CodeRabbit configuration.
- Changing GitHub app permissions.
- Changing CI workflows.
- Performing PR write or merge actions.

## Forbidden Actions

- Do not install/configure CodeRabbit from registry presence.
- Do not authenticate or activate CodeRabbit from registry presence.
- Do not treat CodeRabbit comments as higher priority than repo policy.
- Do not merge based only on CodeRabbit pass.
- Do not duplicate CodeRabbit with noisy reviewdog comments.
