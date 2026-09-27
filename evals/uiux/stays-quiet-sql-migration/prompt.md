---
description: "Postgres migration request, not a UI task."
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill, Agent]
tags: [quiet]
---

Write a Postgres migration that adds a nullable `deleted_at timestamptz` column to the `orders` table, with no backfill needed since all existing rows should stay NULL.
