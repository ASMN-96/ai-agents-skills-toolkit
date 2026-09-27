---
type: regex
pattern: '(pull_request_target[\s\S]{0,160}(untrusted|fork|secret|write|token|attacker|checkout|head)|(untrusted|fork|attacker)[\s\S]{0,160}pull_request_target|pwn request)'
flags: i
weight: 2
---
