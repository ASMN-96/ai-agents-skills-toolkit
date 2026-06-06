---
sourceRef: ["addy-osmani-agent-skills"]
lastExtracted: unknown-review-required
status: approved
---

# Security Hardening

## Purpose

Make security review part of normal engineering work.

## When To Use

Use when handling auth, user input, storage, external integrations, secrets, deployment, or automation.

## When Not To Use

Do not block low-risk docs work with unrelated security review.

## Agent Roles That Should Embed It

Security Agent, Backend Contract Agent, Database RLS Agent, Reviewer Agent, Skill Scout Agent.

## Operating Rules

- Validate inputs at trust boundaries.
- Protect secrets and credentials.
- Review authorization and data access.
- Minimize dangerous automation.

## Verification Requirements

Run relevant security checks or document why no check exists.

## Risks / Anti-Patterns

Logging secrets, broad permissions, auth bypasses, unsafe defaults, or trusting generated code blindly.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
