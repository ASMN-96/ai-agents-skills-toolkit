# Source Safety Scoring

## Purpose

Provide a consistent scoring lens for external source review.

## When To Use

Use during Phase 2 source evaluation and before any Phase 3 method extraction.

## When Not To Use

Do not use as approval to run a source; scoring informs review only.

## Agent Roles That Should Embed It

Skill Scout Agent, Security Agent, Reviewer Agent.

## Operating Rules

Score sources across license clarity, publisher trust, update activity, adoption signals, file structure, prompt-injection exposure, command behavior, network behavior, secret access, and conflicting instructions.

## Verification Requirements

Assign a 0-100 safety/usefulness score, then classify with rationale:

- 0-30: `Ignore`.
- 31-60: `Reference only`.
- 61-85: `Extract into methods`.
- 86-100: `Install later after approval`, only when installation is explicitly requested and all safety gates pass; otherwise keep as `Extract into methods`.

Every classification must include a short rationale and any override reason.

## Risks / Anti-Patterns

Letting high stars override safety findings, missing license uncertainty, or ignoring prompt-injection signals.

## Source Inspiration / License Status

Inspired by Skill Scout rules, Vercel find-skills quality checks, and VoltAgent security warnings.

This is normalized/paraphrased guidance, not raw upstream activation.
