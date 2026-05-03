# Source Discovery Workflow

## Purpose

Help Skill Scout find candidate skills and methods without installing or activating anything.

## When To Use

Use when searching for new sources, comparing candidate skills, or building a source evaluation backlog.

## When Not To Use

Do not use to install, activate, clone, or run a candidate source.

## Agent Roles That Should Embed It

Skill Scout Agent, Security Agent, Reviewer Agent.

## Operating Rules

- Start with official sources and maintained directories.
- Record source identity, URL, owner, license, trust signals, update activity, and visible adoption.
- Use directories such as skills.sh and VoltAgent only as discovery inputs.
- Promote a candidate to evaluation only after a source record exists.

## Verification Requirements

Every candidate must have a source record before extraction. No install, clone, activation, or script execution is part of discovery.

## Risks / Anti-Patterns

Blind installation, popularity-based trust, or treating discovery directories as audited dependencies.

## Source Inspiration / License Status

Inspired by skills.sh, Vercel find-skills, OpenAI skills, and VoltAgent directory patterns.

This is normalized/paraphrased guidance, not raw upstream activation.
