# Skill Anatomy

## Purpose

Define what makes a reusable skill or method easy for agents to discover, load, and apply.

## When To Use

Use when creating toolkit methods, future skills, profiles, or compiled agent inputs.

## When Not To Use

Do not use to activate raw external skills or bypass source evaluation.

## Agent Roles That Should Embed It

Skill Scout Agent, Architect Agent, Release Manager Agent.

## Operating Rules

- Keep identity and trigger description clear.
- Put operational instructions in the body.
- Move long references into separate files.
- Load deeper detail only when needed.
- Keep scripts non-default, explicitly opt-in, reviewed, and never auto-executed during discovery or extraction without human approval.

## Verification Requirements

Check that every method has a clear purpose, trigger, boundaries, verification, and source/license note.

## Risks / Anti-Patterns

Oversized instructions, hidden scripts, vague triggers, or missing source/license provenance.

## Source Inspiration / License Status

Inspired by Anthropic skill specification and OpenAI skills catalog patterns.

This is normalized/paraphrased guidance, not raw upstream activation.
