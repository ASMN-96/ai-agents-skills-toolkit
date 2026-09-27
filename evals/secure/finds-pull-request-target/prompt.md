---
description: "GitHub Actions workflow using pull_request_target with checkout of the untrusted PR head, then running its code with secrets available."
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [trigger]
---

Can you check this workflow over? We added it so PR previews build automatically.

```yaml
name: PR Preview
on:
  pull_request_target:
    types: [opened, synchronize]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: npm ci && npm run build
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          DEPLOY_KEY: ${{ secrets.PREVIEW_DEPLOY_KEY }}
```
