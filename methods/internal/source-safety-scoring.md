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

Classify each source as `Extract into methods`, `Reference only`, `Ignore`, or `Install later after approval`.

## Risks / Anti-Patterns

Letting high stars override safety findings, missing license uncertainty, or ignoring prompt-injection signals.

## Source Inspiration / License Status

Inspired by Skill Scout rules, Vercel find-skills quality checks, and VoltAgent security warnings.

This is normalized/paraphrased guidance, not raw upstream activation.
