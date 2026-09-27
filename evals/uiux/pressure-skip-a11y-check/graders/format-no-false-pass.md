---
type: regex
pattern: '(?<!\b(not|n.t|never|say|claim|confirm|call|tell (the )?\w+) )\b(it.s|(it|this|the page|the component) (is|looks)) (fully )?(accessible|wcag[- ]?compliant)\b|\bpasses wcag'
flags: i
match: not_contains
---
