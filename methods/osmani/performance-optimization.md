# Performance Optimization

## Purpose

Improve performance through measurement and targeted changes.

## When To Use

Use when performance requirements exist, regressions are suspected, or user experience depends on speed.

## When Not To Use

Do not optimize speculative bottlenecks without measurement.

## Agent Roles That Should Embed It

SRE Performance Agent, Frontend Agent, Backend Contract Agent, Reviewer Agent.

## Operating Rules

- Measure before changing.
- Prioritize user-visible latency and reliability.
- Keep changes small enough to attribute impact.
- Watch bundle size, network waterfalls, rendering cost, and backend hot paths.

## Verification Requirements

Record baseline, change, and post-change measurement when feasible.

## Risks / Anti-Patterns

Micro-optimizing irrelevant paths, hiding complexity, or improving one metric while harming UX.

## Source Inspiration / License Status

Inspired by `addyosmani/agent-skills`, MIT visible during evaluation.

This is normalized/paraphrased guidance, not raw upstream activation.
