---
sourceRef: ["matt-pocock-skills","addy-osmani-agent-skills","superpowers","nagdy-guard-skills"]
lastExtracted: 2026-06-07
status: approved
---

# TDD Verification Alignment

## Purpose

Align test-first development and proof-before-completion behavior across agents.

## When To Use

Use when an agent changes behavior, fixes bugs, or claims a task is complete.

## When Not To Use

Do not force executable tests for pure reference documents with no behavior.

## Agent Roles That Should Embed It

QA Test Agent, Reviewer Agent, Backend Contract Agent, Frontend Agent.

## Operating Rules

Prefer red-green-refactor for risky behavior changes. Claims must be backed by fresh verification evidence. Tests should prove user-visible behavior rather than implementation trivia.

When reviewing generated or changed tests, run a focused test-quality guard pass:

- assert behavior and observable effects, not private helper calls;
- mock only real system boundaries such as network, database, filesystem, clock, randomness, third-party SDKs, and LLM APIs;
- use real state/value objects instead of mocks when construction is practical;
- collapse near-duplicate variants into data-driven tests when setup and assertions are the same;
- keep production-regression tests even when they look narrow;
- remove tests that only verify framework guarantees, constants, constructor pass-throughs, or type-system-impossible inputs.

## Verification Requirements

Record the command run, expected result, actual result, run timestamp, commit or PR reference, and any remaining test gap. If only a guard review was performed, label it as review judgment and do not report it as test execution.

## Risks / Anti-Patterns

Passing tests without reading output, testing implementation details, or claiming completion from stale evidence.

## Source Inspiration / License Status

Inspired by Addy Osmani, Matt Pocock, existing Superpowers verification discipline, and Nagdy Guard Skills test-review concepts.

This is normalized/paraphrased guidance, not raw upstream activation, raw skill copying, or duplication.
