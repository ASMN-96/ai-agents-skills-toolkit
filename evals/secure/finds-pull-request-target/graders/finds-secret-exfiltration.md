---
type: regex
pattern: '(untrusted (PR|code|head|fork)|arbitrary code execution|exfiltrat|steal(s|ing)? (the )?secrets?|secrets? (exposed|leak|available to)|checks? ?out (the )?(PR|untrusted) (head|code)|fork.{0,30}(PR|pull request))'
flags: i
weight: 2
---
