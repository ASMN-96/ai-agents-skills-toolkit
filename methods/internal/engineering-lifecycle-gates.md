---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Engineering Lifecycle Gates

## Purpose

Define the toolkit's internal lifecycle from idea to release.

## When To Use

Use when compiling agents or reviewing whether a project workflow has enough gates.

## When Not To Use

Do not require every gate for tiny documentation changes with no behavior or release impact.

## Agent Roles That Should Embed It

Product Agent, Architect Agent, QA Test Agent, Reviewer Agent, Release Manager Agent.

## Operating Rules

Apply these gates: define, plan, build, verify, review, release. Each gate must produce evidence before moving forward.

## Verification Requirements

- Define: problem statement and acceptance criteria.
- Plan: implementation plan and risk assessment.
- Build: branch or commit reference and scoped implementation notes.
- Verify: test results, check output, or documented manual validation.
- Review: review summary and action items.
- Release: release notes and rollback or recovery notes.

## Risks / Anti-Patterns

Skipping evidence, treating release as only a push, or applying heavy gates to trivial changes.

## Source Inspiration / License Status

Inspired by Addy Osmani engineering workflow patterns.

This is normalized/paraphrased guidance, not raw upstream activation.
