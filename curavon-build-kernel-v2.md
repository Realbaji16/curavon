# Curavon Build Kernel v2

Official single source of truth for Curavon product thesis, build order, architecture direction, safety guardrails, module factory, meta-system, automation discovery, team ownership, feature gates, and future backend/AI direction.

This document is a documentation and architecture-control layer only.

---

## 1. Product Identity

Curavon is **not** a generic AI chatbot.  
Curavon is a **structured health-action product**.

Core idea: **Next Best Health Action**.

Curavon helps users answer:

> "What is the safest, simplest, most useful next health action I should take right now?"

Controlling product loop:

User shares a health concern or goal  
-> Curavon asks guided narrowing questions  
-> Curavon checks red flags and safety boundaries  
-> Curavon gives the safest useful next action  
-> Curavon creates or recommends a health flow  
-> Curavon remembers context  
-> Curavon follows up, adapts, or escalates when needed  
-> Curavon can generate doctor-ready summaries when appropriate

Every system and feature must reinforce this loop.

---

## 2. Product Priorities

Curavon prioritizes:

- safety
- guided intake
- red-flag detection
- personalized next actions
- health-flow creation
- follow-up loops
- memory
- doctor-ready summaries
- automation discovery
- medically gated improvement over time

Curavon must avoid:

- giving diagnosis as certainty
- replacing clinicians
- suggesting medication changes without clinician direction
- delaying emergency care
- creating self-care flows when red flags are present
- building uncontrolled autonomous agents too early
- building random features that do not support the core health-action loop

---

## 3. Controlled Multi-Agent v1 Direction

Current build philosophy: **Controlled Multi-Agent v1**.

Early architecture direction:

User message  
-> Orchestrator  
-> Intake Agent  
-> Safety Agent  
-> Plan Agent  
-> Memory Agent  
-> Follow-Up Agent  
-> Final response

Rules:

- orchestrator is the boss
- agents do not freely call each other
- no infinite loops
- no uncontrolled background tasks
- every agent action is logged
- every agent action is bounded
- every agent action is testable
- every agent action follows safety guardrails

This is architecture direction and does not require immediate full runtime adoption in the current frontend repository.

---

## 4. Recommended AI Folder Structure (Future Direction)

```text
src/
  lib/
    ai/
      orchestrator.ts
      agents/
        intakeAgent.ts
        safetyAgent.ts
        planAgent.ts
        memoryAgent.ts
        followUpAgent.ts
      prompts/
        intakePrompt.ts
        safetyPrompt.ts
        planPrompt.ts
        memoryPrompt.ts
        followUpPrompt.ts
      guards/
        redFlagRules.ts
        medicalBoundaries.ts
        escalationRules.ts
      types/
        ai.types.ts
        health.types.ts
```

This is the future backend/AI integration direction. It is **not** a forced immediate refactor unless explicitly planned.

---

## 5. Agent Responsibilities

### 5.1 Orchestrator

Controls the flow and decides:

- current stage
- which agent runs
- whether enough intake exists
- whether safety blocks
- whether a plan is created
- whether memory is saved
- whether summary is generated
- whether escalation is needed

Hard limits:

- max AI calls per user request
- max retries
- max runtime
- max token budget
- no agent-to-agent free loops
- fallback response on failure

### 5.2 Intake Agent

Gathers only necessary info:

- user concern/goal
- duration
- severity
- relevant symptoms
- context
- constraints
- previous attempts
- blockers
- medications/allergies only when relevant
- pregnancy/chronic conditions/age only when relevant

Rules:

- ask minimum needed
- avoid irrelevant interrogation
- move toward next action quickly

### 5.3 Safety Agent

Most important agent. Checks:

- red flags
- urgent/emergency risk
- unsafe self-care
- medication/treatment risk
- mental health crisis signals
- when clinician review is needed
- when app must refuse or redirect

Safety classifications:

- low
- watch
- consult
- urgent
- emergency

Safety Agent authority overrides Plan Agent.

### 5.4 Plan Agent

Creates safe next actions only after intake + safety.
Produces:

- one immediate next action
- simple steps
- low-cost options
- blocker-aware suggestions
- what to monitor
- when to stop
- when to seek care
- follow-up timing

Avoid:

- diagnosis certainty
- complex medical claims
- medication changes
- supplement-heavy advice
- extreme diets
- unsafe exercise recommendations
- false confidence

### 5.5 Memory Agent

Stores useful context, not everything.
Remembers:

- health goals
- preferences
- recurring blockers
- previous plans
- what worked
- what failed
- relevant constraints
- follow-up schedule
- safety flags
- summaries

Avoid storing unnecessary sensitive details.
Memory should be structured and versioned.

### 5.6 Follow-Up Agent

Handles progress loops:

- completed action
- blocked action
- adapted action
- symptoms worsened
- no response
- smart silence

Supports: Done / Blocked / Adjust / Worse.

---

## 6. Core Loop Enforcement

The first visible product must prove:

User shares concern  
-> guided questions  
-> safety/red-flag check  
-> one safe next action  
-> simple flow if safe  
-> saved summary  
-> follow-up  
-> adapts from Done / Blocked / Worse

Every feature must support this loop.

If a feature does not support this loop, it must be rejected, delayed, or moved later.

---

## 7. Important Data Models (Future Direction)

Recommended core models:

- User
- HealthProfile
- Conversation
- HealthConcern
- RiskAssessment
- ActionPlan
- FollowUpTask
- MemoryNote
- SafetyFlag
- AgentEvent
- Module
- GuardrailVersion

### User
- id
- email
- name
- createdAt

### HealthProfile
- userId
- ageRange
- sexOptional
- locationOptional
- conditionsOptional
- allergiesOptional
- medicationsOptional
- preferences
- emergencyDisclaimerAccepted

### Conversation
- id
- userId
- status
- createdAt
- updatedAt

### HealthConcern
- id
- userId
- conversationId
- topic
- symptoms
- duration
- severity
- context
- status

### RiskAssessment
- id
- concernId
- level
- redFlags
- reason
- escalationAdvice
- createdAt

### ActionPlan
- id
- concernId
- title
- nextAction
- steps
- watchFor
- stopIf
- followUpAt
- status

### FollowUpTask
- id
- userId
- actionPlanId
- dueAt
- status
- result
- blocker
- adjustment

### MemoryNote
- id
- userId
- type
- summary
- source
- createdAt

### SafetyFlag
- id
- userId
- concernId
- severity
- trigger
- responseShown
- createdAt

### AgentEvent
- id
- userId
- conversationId
- agentName
- inputSummary
- outputSummary
- promptVersion
- moduleVersion
- toolUsed
- createdAt

### Module
- id
- topic
- version
- intakeQuestions
- redFlags
- safeActions
- blockedActions
- escalationRules
- promptVersion
- reviewStatus

### GuardrailVersion
- id
- version
- redFlags
- restrictedAdvice
- escalationRules
- approvalStatus
- createdAt

---

## 8. Meta-System Direction

Curavon needs a meta-system, but it begins manually and becomes software later.

The meta-system should:

- collect real user patterns
- collect founder/team observations
- collect expert interview notes
- extract workflow gaps
- propose new health modules
- propose intake questions
- propose red flags
- propose safe actions
- propose unsafe advice patterns
- propose escalation rules
- track module versions
- track prompt versions
- track guardrail versions
- track review status
- log agent behavior
- support audit and safety review

Rule:
The meta-system may suggest, draft, test, and flag.  
It must not approve medical/safety-sensitive content by itself.

---

## 9. Automation Discovery System

Automation discovery is Curavon's growth and defensibility engine.

Sources:

- user conversations
- expert interviews
- clinic workflow interviews
- pharmacy workflow interviews
- doctor/nurse observations
- common user misconceptions
- repeated health questions
- repeated blockers
- repeated escalation points

Outputs:

- workflow maps
- intake questions
- red flags
- safe next actions
- unsafe advice examples
- escalation logic
- doctor-ready summary formats
- module candidates

Automation discovery feeds the module factory.

---

## 10. Module Factory

A Curavon module includes:

- topic
- user problem
- intake questions
- red flags
- safe actions
- blocked actions
- escalation rules
- doctor-ready summary template
- prompt version
- guardrail version
- tests
- review status

Example modules:

- Skin Breakout Reset
- Fatigue Check-In
- Hydration Reset
- Sleep Recovery
- Weight Goal Starter
- Blood Pressure Follow-Up
- Medication Question Redirect
- Doctor Visit Prep
- Lab Result Plain Summary
- Mental Wellness Check-In

Rules:

- Modules are versioned.
- No module goes live without safety boundaries.
- Medical/safety-sensitive modules require review before publishing.

---

## 11. Automation System Versions

Roadmap:

- V1: Manual spreadsheet or Notion-style tracker
- V2: Internal admin page
- V3: Module factory
- V4: Prompt and guardrail versioning
- V5: Agent event logging
- V6: Review workflow
- V7: Meta-system console

Do not wait to start the meta-system. Start manually now, software later.

---

## 12. Safety Guardrails

Hard guardrails:

- Do not diagnose as certainty.
- Do not replace doctors.
- Do not delay emergency care.
- Do not create self-care plans when red flags are present.
- Do not recommend medication changes without clinician direction.
- Do not give risky treatment instructions.
- Do not overclaim medical accuracy.
- Do not pretend the AI is a clinician.
- Do not store unnecessary sensitive health data.
- Do not run uncontrolled autonomous health decisions.
- Do not spam users with follow-ups.
- Do not hide uncertainty.

If red flags are present:

- stop normal self-care flow
- escalate clearly
- recommend urgent/emergency care when appropriate
- generate doctor-ready summary if useful

---

## 13. MVP Product Flow

1. Sign up / login
2. Basic health profile
3. Start health concern session
4. Guided intake
5. Red-flag safety check
6. Safe next action
7. Simple action plan
8. Save summary
9. Follow-up check-in
10. Adapt plan based on Done / Blocked / Worse
11. Doctor-ready summary when needed

---

## 14. Repo Direction (Future Target)

```text
src/
  app/
  components/
    ui/
    layout/
    health/
    chat/
  lib/
    ai/
    auth/
    memory/
    safety/
    modules/
    automation/
    meta-system/
  pages/
    Login.tsx
    Signup.tsx
    Dashboard.tsx
    Chat.tsx
    Intake.tsx
    ActionPlan.tsx
    FollowUp.tsx
```

This is a target direction, not a forced immediate refactor unless planned.

---

## 15. Team Ownership

### Paul / UI side

- landing page
- dashboard
- chat screen
- health intake UI
- action plan UI
- follow-up cards
- doctor-ready summary UI
- module display UI

### Baji / Auth-backend side

- authentication
- protected routes
- user profile persistence
- database models
- session storage
- backend API routes
- agent orchestration integration
- logging and persistence

### Shared

- AI orchestrator
- safety agent
- intake agent
- plan agent
- memory agent
- follow-up agent
- module factory
- automation/meta-system design

---

## 16. Canonical Build Order

### Current frontend/prototype order

1. Curavon design system
2. Onboarding
3. Auth shell
4. Profile
5. Today
6. Guides
7. Ask
8. Doctor Summary
9. Personalization
10. Safety hardening
11. Memory snapshot
12. Feature expansion

### Future backend/AI build order

1. Auth and protected app shell
2. Health profile
3. Chat/intake UI
4. Core orchestrator skeleton
5. Safety Agent
6. Intake Agent
7. Plan Agent
8. Memory Agent
9. Follow-Up Agent
10. AgentEvent logging
11. SafetyFlag model
12. Module model
13. Manual module factory data
14. Doctor-ready summary
15. Automation discovery tracker
16. Meta-system console later

---

## 17. Feature Gate Rules

No new feature can be accepted unless it answers:

1. Does it support Next Best Health Action?
2. Does it use the safety engine?
3. Does it respect Sensitive Mode?
4. Does it write useful structured memory?
5. Does it contribute to Doctor Summary when appropriate?
6. Does it avoid diagnosis/treatment claims?
7. Does it have clear user value inside the core loop?
8. Does it have a testable input/output path?
9. Does it have fallback behavior?
10. Does it avoid uncontrolled autonomy?

If no, delay or reject.

---

## 18. Main Warning

Do not reduce Curavon to a basic chatbot.

Do not overbuild uncontrolled multi-agent autonomy too early.

Correct path: Controlled multi-agent architecture with:

- safe next-action health loop
- memory
- follow-up automation
- module factory
- meta-system
- automation discovery system

Target user experience:

> "I told Curavon what was going on. It asked the right questions, checked if it was serious, gave me one useful next step, remembered my context, and followed up."

---

## Appendix A: System Overview and Layering

Curavon is defined as a strict 3-layer architecture:

1. **Product Layer (UI)**  
   Screens, components, visual systems, interaction polish.

2. **Engine Layer**  
   Safety, Memory, Personalization, Flow Engine.

3. **Build Layer**  
   This specification, sequencing rules, invariants, freeze boundaries, and feature-gate governance.

---

## Appendix B: Current Completion Status

- **Today:** complete
- **Ask:** complete
- **Guides:** mostly complete
- **Doctor Summary:** complete
- **Auth:** complete (frontend only)
- **Safety:** complete
- **Memory:** partial (needs snapshot layer)

---

## Appendix C: Freeze Rules (Critical)

Frozen unless explicitly approved:

- safety engine
- red-flag detection system
- doctor summary structure
- localStorage schema
- flow runner structure

No implicit refactors are allowed in frozen systems.

---

## Appendix D: Active Work Phase

Current Phase = **SYSTEM HARDENING (Phase 5)**.

Allowed work:

- consistency fixes only
- storage hardening only
- cross-module alignment only

Not allowed:

- new features
- new flows
- new tabs
- new UI systems

