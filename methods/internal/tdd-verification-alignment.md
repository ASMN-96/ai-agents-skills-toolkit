# TDD Verification Alignment

## Purpose

Align test-first development and proof-before-completion behavior across agents.

## When To Use

Use when an agent changes behavior, fixes bugs, or claims a task is complete.

## Method

Prefer red-green-refactor for risky behavior changes. Claims must be backed by fresh verification evidence. Tests should prove user-visible behavior rather than implementation trivia.

## Verification

Record the command run, expected result, actual result, and any remaining test gap.

## Source Inspiration / License Status

Inspired by Addy Osmani, Matt Pocock, and existing Superpowers verification discipline. Normalized/paraphrased only; no raw upstream activation or duplication.
