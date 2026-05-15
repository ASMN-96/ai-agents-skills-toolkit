# Agents

Agents are the primary workers in this toolkit. They combine role, scope, operating rules, checklists, and approved methods.

This directory contains internal source agent specifications as file-backed markdown specs.
Project repositories should receive compiled agents from `compiled-agents/`, not raw upstream source files.

The first full internal agent is `skill-scout-agent.md`, which evaluates external sources before import, extraction, installation, activation, or sync.
