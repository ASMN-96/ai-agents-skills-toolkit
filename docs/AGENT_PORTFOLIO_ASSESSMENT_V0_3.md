# v0.3 Agent Portfolio Assessment

Status: static design assessment for the untagged v0.3 candidate. This is not production-performance evidence.

## Decision

Keep the agents bounded. Do not turn each role into an independently looping agent.

The delivery kernel owns bounded waves, handoffs, and stop conditions. Current v0.3 execution is single-attempt per assignment: it accepts one invocation identity and does not perform an in-plan retry or replan. A retry or replan requires a new plan digest and fresh context. Individual agents remain focused roles that receive a finite assignment and return an event or receipt. This preserves deterministic routing, context budgets, writer ownership, independent verification, and a reliable kill switch. A self-looping specialist would duplicate orchestration, increase token consumption, make ownership harder to prove, and create a higher risk of stale-context work or unauthorized mutation.

This matches current [Codex subagent guidance](https://learn.chatgpt.com/docs/agent-configuration/subagents), which recommends bounded parallelism for independent read-heavy work, warns about write-heavy conflicts, and cautions that deeper recursive delegation increases cost and predictability risk. [Claude Code subagent guidance](https://code.claude.com/docs/en/sub-agents) likewise exposes explicit tool, permission, and maximum-turn boundaries. The toolkit treats those runtime controls as host-owned policy, not as permission for an agent to keep itself alive.

The target operating model is:

1. The kernel derives mandatory competencies and gates from policy.
2. The router selects the smallest eligible team.
3. The kernel issues bounded assignments with at most two specialists per wave.
4. Agents perform one assignment within explicit scope and authorization.
5. A host-owned runtime bridge records observed events and receipts.
6. A failed or blocked assignment ends the current plan; any retry or replan starts from a newly digested plan with fresh context.
7. Independent verification and release policy decide readiness.

## What the ratings mean

All numeric scores are static engineering judgments based on the committed-style contracts, registries, native definitions, permissions, competencies, stop conditions, handoffs, context measurements, and fallback availability. They do not measure model intelligence or production accuracy.

- **Contract quality:** clarity, boundaries, deliverables, stop conditions, handoffs, and evidence discipline.
- **Agentic design:** ability to complete a bounded assignment and participate safely in a multi-agent wave. This is not permission for open-ended autonomy.
- **AI compatibility:** portability and structure across the kernel, native Codex definitions, and compiled fallback path. Native-only preview agents score lower until fallback and cross-runtime pilots exist.
- **Coding/delivery fit:** ability to contribute to software delivery in the role it owns. A lower score for a non-coding governance role is not a quality defect.
- **Observed accuracy:** requires repeated task execution against golden outcomes and verified host receipts. It is currently `not measured` for every role.

Agentic levels use this scale:

- **L1:** advisory prompt only.
- **L2:** bounded analyst or verifier with explicit deliverables and stops.
- **L3:** bounded specialist able to write within proven, non-overlapping ownership.
- **L4:** coordinated multi-agent execution with observed runtime orchestration.
- **L5:** open-ended autonomy. This is intentionally outside the toolkit's target.

## Portfolio ratings

| Agent | Runtime posture | Contract quality /10 | Agentic design /10 | Agentic level | AI compatibility /10 | Coding/delivery fit /10 | Observed accuracy |
|---|---|---:|---:|---|---:|---:|---|
| Architect | Native + fallback; read-only lead | 9.2 | 8.2 | L2 | 9.0 | 8.5 | Not measured |
| Product | Native + fallback; read-only specialist | 8.8 | 7.6 | L2 | 9.0 | 7.0 | Not measured |
| Frontend | Native + fallback; scoped writer | 9.1 | 8.4 | L3 | 9.2 | 9.0 | Not measured |
| UI/UX | Native + fallback; read-only specialist | 8.9 | 7.7 | L2 | 9.0 | 7.5 | Not measured |
| Backend Contract | Native + fallback; read-only specialist | 8.8 | 7.7 | L2 | 9.0 | 8.1 | Not measured |
| Backend Implementation | Native preview; scoped writer; no fallback | 8.7 | 8.2 | L3 | 7.6 | 8.8 | Not measured |
| Database/RLS | Native + fallback; read-only specialist | 8.9 | 7.7 | L2 | 9.0 | 8.1 | Not measured |
| Security | Native + fallback; read-only specialist | 9.1 | 7.9 | L2 | 9.0 | 8.2 | Not measured |
| QA/Test | Native + fallback; independent verifier | 9.1 | 8.3 | L2 | 9.1 | 8.5 | Not measured |
| Reviewer | Native + fallback; independent verifier | 9.1 | 8.1 | L2 | 9.0 | 7.7 | Not measured |
| Release Manager | Native + fallback; read-only specialist | 8.8 | 7.9 | L2 | 9.0 | 7.5 | Not measured |
| SRE/Performance | Native + fallback; read-only specialist | 8.8 | 7.8 | L2 | 9.0 | 8.0 | Not measured |
| Skill Scout | Native + fallback; read-only specialist | 8.9 | 7.6 | L2 | 9.0 | 6.8 | Not measured |
| Mobile Platform | Native preview; scoped writer; no fallback | 8.6 | 8.1 | L3 | 7.6 | 8.6 | Not measured |
| Desktop Platform | Native preview; scoped writer; no fallback | 8.6 | 8.1 | L3 | 7.6 | 8.6 | Not measured |

Portfolio averages, computed from the 15 displayed rows and rounded to one decimal, are descriptive only: contract quality **8.9/10**, agentic design **8.0/10**, AI compatibility **8.7/10**, and role-appropriate coding/delivery fit **8.1/10**. These figures must not be promoted as measured productivity, correctness, accuracy, or enterprise impact. The added AI-system gates and automatic risk classification improve static control coverage; they do not establish observed model or agent accuracy.

## What is strong now

- All 15 roles have explicit missions, selection boundaries, deliverables, stop conditions, handoffs, risk domains, competencies, and measured context costs.
- There is one lead, at most two specialists per wave, independent high-risk verification, and only four scoped writers: frontend, backend implementation, mobile platform, and desktop platform.
- Fixed workspace-write roles may self-review only inside their write-authorized assignment. They remain ineligible for pure read-only audit and independent-verifier ownership until a host can prove a real permission downgrade; the toolkit does not duplicate platform roles merely to simulate that control.
- The backend implementation writer closes the previous backend write-authority gap while preserving an independent read-only contract reviewer; the mobile and desktop specialists close the platform-competency gap without bloating every general-purpose agent.
- Verified canonical scope, scenario floors, authorized actions, and sensitive backend, data, security, deployment, credential, and AI-system surfaces now feed deterministic planning-time risk elevation. The assessment is immutable policy provenance, not runtime execution or correctness evidence.
- Material AI, prompt, retrieval, memory, model, and tool changes now route through explicit versioning, evaluation, authorization, human-control, security, reliability, and release gates instead of relying on generic coding guidance.
- Version-sensitive work now starts from hashed project evidence and distinguishes `observed-exact`, `declared-range`, and `unresolved`; research stops when one decision is supported instead of becoming open-ended browsing.
- High-risk decisions route an explicit adversarial-review competency, and verifier receipts require disconfirming checks plus the evidence that would reverse the conclusion.
- Stateful API, migration, integration, and AI-system scenarios now require only applicable partial-failure, duplicate/retry, timeout/cancellation, concurrency, stale-state, and recovery evidence.
- Tool calls are closed to selected inspected project scripts, authorized actions, and exact input digests; unselected, ambiguous, duplicate, spawn, and delegation calls fail closed.
- Native environment absence blocks native verification instead of being converted into a simulated pass.
- Registry presence and selection are not treated as execution proof.
- The 12-task deterministic benchmark covers maintenance, Web/SaaS, API/data/security, mobile, desktop, source governance, and release scenarios.

## What prevents a higher rating

- No host-owned execution bridge currently turns Codex or Claude invocations into trusted events and receipts.
- Retry/flaky attempt sequences are not yet modeled as trusted receipts. The current conservative contract allows one observation per selected executable tool and keeps host evidence untrusted.
- Database/RLS review is strong, but generic local migration-file authorship remains intentionally blocked until a separate scoped, non-live, independently reviewed writer contract is proven.
- No role has repeated observed outcomes, failure-recovery evidence, human usefulness scores, or production-repository pilot results.
- Backend implementation, mobile, and desktop are preview native-only agents with no compiled fallback. None has the role-specific native pilot evidence needed for a production-performance claim.
- Static routing proves selection behavior, not the quality of a model's implementation.
- The portfolio has not yet demonstrated sustained token, latency, defect-escape, and first-pass acceptance performance in real repositories.

## Promotion evidence required

Before any agent is called production-proven, collect at least:

- repeated golden-task results with exact model and policy versions;
- trusted invocation, tool-call, output-hash, commit, and repository-state receipts;
- wrong-commit, stale-context, interrupted-run, and ownership-overlap failure tests;
- human correctness, usefulness, and traceability scores;
- escaped-defect and false-readiness rates;
- token, latency, retry, and redundant-invocation measurements;
- platform-native evidence for each preview pack; and
- rollback and owner-acceptance evidence from opt-in product pilots.

Until those exist, the honest classification is **strong governed agent design, unproven production performance**.
