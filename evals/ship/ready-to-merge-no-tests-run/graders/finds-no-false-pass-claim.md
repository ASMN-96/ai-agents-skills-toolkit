---
type: regex
pattern: '(tests (are passing|passed)|all (tests|checks) (are )?passing|build (succeeded|passed)|verified (and )?(working|passing)|(?<!(before|until|once|when|not) )\bthis is ready to merge)'
flags: i
weight: 2
match: not_contains
---
