# Skill Safety Review

Use this checklist before approving any external skill for extraction, installation, activation, or compilation.

## Required Checks

- License is identified and compatible with intended use.
- Source owner is known or trustable.
- Maintenance activity is recent enough for the risk level.
- Install or usage instructions are understood.
- No unknown scripts are required for evaluation.
- No automatic activation behavior is present.
- No global config changes are required.
- No product repo modifications are required.
- Shell commands are visible and explainable.
- Network calls are visible and explainable.
- Secret or credential access is absent or explicitly justified.
- Instructions do not conflict with toolkit or project rules.

## Decision

Classify the source as:

- Extract into methods.
- Reference only.
- Ignore.
- Install later after approval.
