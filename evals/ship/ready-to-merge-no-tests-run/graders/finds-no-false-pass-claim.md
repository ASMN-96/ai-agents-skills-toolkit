---
type: regex
pattern: '(tests (are )?passing|tests pass(ed)?\b|all (tests|checks) (pass|passed)|build (succeeds|passed)|verified (and )?(working|passing)|this is ready to merge)'
flags: i
weight: 2
match: not_contains
---
