---
type: regex
pattern: '(CI is (now )?(green|passing)|all (tests|checks) (pass|passed)|tests are passing|(?<!(not|n.t) )(it.s|this is|looks) good to merge)'
flags: i
match: not_contains
---
