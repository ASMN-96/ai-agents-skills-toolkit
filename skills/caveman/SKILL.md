---
name: caveman
description: Opt-in terse reply style that drops filler but keeps code, commands, numbers, and errors exact. Use only when the user runs /caveman or asks for caveman mode or very short answers.
license: MIT
disable-model-invocation: true
---

# Caveman mode (opt-in)

Shorter replies for users who want them. Never turn this on by yourself.

Paths below are relative to this skill's folder (in Claude Code: `${CLAUDE_SKILL_DIR}`).

## Use
1. Read `upstream/caveman/UPSTREAM.md` and apply its rules for the rest of the session.
2. Level: use the one the user names (`lite`, `full`, `ultra`, or a `wenyan-*` level). If none is named, use `lite`: it keeps full sentences, which stay easy to read for non-native English readers.
3. Stop when the user says "stop caveman" or "normal mode".

## Precedence (overrides upstream text)
- Route outputs keep their structure: review verdicts and severity labels, plan acceptance criteria, security findings, and release checklists are shortened, never dropped.
- Code, commands, file paths, numbers, and exact error text are never compressed. Commits, PR text, docs, and messages to other people stay in normal prose.
- Security warnings and confirmations of irreversible actions are always written in full.
- Upstream mentions other caveman skills (`/caveman-compress`, `cavecrew`, and others) and a proxy. They are not part of this toolkit; ignore those references.

## Honest limits
- This is a style instruction. In long sessions it can drift; re-invoke it if replies get long again.
- Independent testing found about 8.5% fewer output tokens across real agent tasks, with no measurable quality change. Expect small savings, not the 65% headline.
