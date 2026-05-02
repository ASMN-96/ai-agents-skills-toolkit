# Update Policy

Toolkit updates are versioned, reviewed, and intentional.

## Principles

- No automatic broad imports.
- No automatic skill activation.
- No unreviewed upstream sync.
- No product repo changes from this toolkit without project-level approval.
- Every project pins the toolkit version it uses.

## Update Flow

1. Scout a source.
2. Evaluate safety, trust, license, maintenance, and usefulness.
3. Approve or reject.
4. Extract reviewed methods as normalized/paraphrased toolkit files with source inspiration and license status.
5. Compile agents intentionally.
6. Sync into projects only with version pinning and approval.

## Compatibility

Compiled agents should document their source toolkit version and any project profile assumptions.

## Phase 3 Extraction Rules

- Do not copy full upstream skill files.
- Do not install or activate external skills.
- Do not clone external repositories into active toolkit folders.
- Do not run third-party scripts.
- Keep raw external sources inactive.
- Preserve source/license uncertainty in each method file.
