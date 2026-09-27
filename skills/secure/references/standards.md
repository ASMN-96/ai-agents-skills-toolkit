# Security Standards

Link-only index. Nothing below is copied standard text — open the URL for the actual
requirements. Pick the standard that matches what you're auditing, then cite specific
control IDs from it in findings instead of restating this file.

- **OWASP ASVS** — https://owasp.org/www-project-application-security-verification-standard/
  Use for: verifying a web app's auth, session, access-control, and input-handling
  controls against a leveled checklist (L1–L3).
- **OWASP MASVS** — https://mas.owasp.org/MASVS/
  Use for: auditing a mobile app (the `mobile` route's surface) — local storage,
  platform interaction, crypto, and resilience on iOS/Android.
- **OWASP LLMSVS** — https://owasp.org/www-project-llm-verification-standard/LLMSVS-v2.0-en.html
  Use for: verifying an LLM-backed feature's controls (prompt handling, output
  handling, training/RAG data) at a level deeper than the LLM Top 10 table.
- **OWASP Securing Agentic Applications Guide** — https://genai.owasp.org/resource/securing-agentic-applications-guide-1-0/
  Use for: threat-modeling an agent that has tools, memory, or autonomy — excessive
  agency, tool-permission scoping, and multi-agent trust boundaries.
- **OpenSSF Security-Focused Guide for AI Code Assistant Instructions** — https://best.openssf.org/Security-Focused-Guide-for-AI-Code-Assistant-Instructions
  Use for: reviewing what an AI coding assistant is instructed to do in a repo
  (CLAUDE.md/AGENTS.md-style files, agent permissions) for safe defaults.
- **SLSA v1.2** — https://slsa.dev/spec/v1.2/
  Use for: grading build/release provenance and supply-chain integrity — whether an
  artifact's build is reproducible, attested, and tamper-evident.
- **NIST SSDF (SP 800-218)** — https://csrc.nist.gov/pubs/sp/800/218/final
  Use for: mapping a team's SDLC practices (design, implementation, verification,
  response) against a government-baseline secure-development framework.
- **Electron Security Guidance** — https://www.electronjs.org/docs/latest/tutorial/security
  Use for: auditing an Electron app's process isolation, `nodeIntegration`/
  `contextIsolation` settings, and preload/renderer boundary.
- **Tauri Security Guidance** — https://v2.tauri.app/security/
  Use for: auditing a Tauri app's capability/permission model and IPC boundary
  between the WebView and the Rust core.

## Precedence

These are reference pointers, not requirements. `references/security-checklist.md`
and the vendored `upstream/security-and-hardening/UPSTREAM.md` are the working
checklists for this route; reach for a standard above only when a finding needs a
citation to an authoritative control ID, or when the surface (mobile, LLM, agentic,
Electron, Tauri, CI/build provenance) isn't covered by the checklist in enough depth.
