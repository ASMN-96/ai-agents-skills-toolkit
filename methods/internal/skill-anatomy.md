---
sourceRef: ["anthropic-skills","gitlab-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

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
- Write trigger descriptions for the agent's decision point, not for human marketing. A good trigger says what task, input shape, risk, or artifact should load the skill.
- Include negative triggers when a nearby skill or plain code review is enough.
- Put operational instructions in the body.
- Move long references into separate files.
- Load deeper detail only when needed; the first screen should tell the agent whether the skill applies and what to do next.
- Separate references, scripts, assets, examples, and evals from the main instruction body so the skill can be used with progressive disclosure.
- Treat evals as part of the skill contract: include positive cases, negative cases, and at least one example where the skill should stay unloaded.
- Keep scripts non-default, explicitly opt-in, reviewed, and never auto-executed during discovery or extraction without human approval.

## Verification Requirements

Check that every method or future skill has a clear purpose, trigger, negative trigger, operating boundary, verification requirement, and source/license note. Confirm references and scripts are optional support material rather than hidden execution requirements.

## Risks / Anti-Patterns

Oversized instructions, hidden scripts, vague triggers, trigger overlap, missing negative cases, missing evals, or missing source/license provenance.

## Source Inspiration / License Status

Inspired by the reviewed Anthropic Skills source record and GitLab Agent Skills docs source record. Anthropic source scouting found mixed license posture across the repository; GitLab docs terms were not separately reviewed, so GitLab remains a caveated reference source only. Use only normalized structure and decision rules; do not copy docs examples, templates, or wording.

This is normalized/paraphrased guidance, not raw upstream activation.
