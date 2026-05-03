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

## Verification Requirements

Record the command run, expected result, actual result, and any remaining test gap.

## Risks / Anti-Patterns

Passing tests without reading output, testing implementation details, or claiming completion from stale evidence.

## Source Inspiration / License Status

Inspired by Addy Osmani, Matt Pocock, and existing Superpowers verification discipline.

This is normalized/paraphrased guidance, not raw upstream activation or duplication.
