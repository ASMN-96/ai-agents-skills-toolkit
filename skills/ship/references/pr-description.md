# PR description template

Fill every section. Leave a section explicitly "N/A" rather than deleting it — an empty gap
reads as forgotten, not skipped on purpose.

```markdown
## What

What changed, in one or two sentences.

## Why

The problem or request this addresses.

## How verified

- Commands run and their actual output (paste it or summarize the pass/fail counts).
- Manual checks performed, if any.
- WARN output or anything unusual, even if the overall result was green.
- What was **not** checked (skipped tests, untested edge cases, no staging run, etc.).

## Risk

- Blast radius: what breaks if this is wrong?
- Data/migration risk, if any.
- Rollback: revert, flag flip, or manual fix — name it.
```

## Notes

- "How verified" is the honesty section: never write a check passed unless its output is in
  front of you in this session. "Should be fine" is not verification.
- Security-sensitive changes (auth, secrets, dependencies) get a note pointing reviewers to the
  `secure` route rather than trying to self-certify here.
- Keep it short. A reviewer should read this in under a minute before opening the diff.
