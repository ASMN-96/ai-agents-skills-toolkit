---
type: regex
pattern: '((?<!(until|once|when|after) )CI is (now )?(green|passing)|(?<!(until|once|when|after) )all (tests|checks) (pass|passed)|tests are passing|(?<!(not|n.t) )(it.s|this is|looks) good to merge)'
flags: i
match: not_contains
---
