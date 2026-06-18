# Curavon Build Kernel v1

## 1. System Overview

Curavon is defined as a strict 3-layer architecture:

1. **Product Layer (UI)**
   - Screens, components, visual systems, interaction polish.
   - Responsible only for presentation and guided user interaction.

2. **Engine Layer**
   - Safety engine
   - Memory engine
   - Personalization engine
   - Flow engine
   - Responsible for logic, consistency, and behavioral rules.

3. **Build Layer (this document)**
   - Defines sequencing, freeze boundaries, invariants, and change control.
   - Prevents feature drift and enforces system order for all future work.

---

## 2. Current Completion Status

- **Today:** complete  
- **Ask:** complete  
- **Guides:** mostly complete  
- **Doctor Summary:** complete  
- **Auth:** complete (frontend only)  
- **Safety:** complete  
- **Memory:** partial (needs snapshot layer)

---

## 3. Freeze Rules (Critical)

The following systems are **frozen** unless explicitly approved for change:

- safety engine
- red-flag detection system
- doctor summary structure
- localStorage schema
- flow runner structure

No implicit refactors are allowed in frozen systems.

---

## 4. Active Work Phase

**Current Phase = SYSTEM HARDENING (Phase 5)**

### Allowed work
- consistency fixes only
- storage hardening only
- cross-module alignment only

### Not allowed
- new features
- new flows
- new tabs
- new UI systems

---

## 5. Build Order (Canonical)

1. **Phase 1: UX modules** (DONE)  
2. **Phase 2: Data layer** (DONE)  
3. **Phase 3: Safety kernel** (DONE)  
4. **Phase 4: Flow engine** (DONE)  
5. **Phase 5: System hardening** (CURRENT)  
6. **Phase 6: Memory intelligence** (FUTURE)  
7. **Phase 7: adaptive learning** (FUTURE)

Build work must follow this order. No phase skipping.

---

## 6. Module Dependencies

### Ask depends on
- Safety engine
- Memory engine
- Doctor Summary

### Today depends on
- Check-ins
- Personalization engine
- Safety engine

### Guides depends on
- Flow engine
- Safety engine
- Doctor Summary

### Doctor Summary depends on
- all data sources

---

## 7. Change Control Rule

Every new feature proposal must declare:

1. which engine it uses
2. what it writes to
3. how it appears in doctor summary
4. how it respects sensitive mode
5. how it uses safety engine

If any declaration is missing, ambiguous, or non-compliant: **reject implementation**.

---

## 8. System Invariants

The following invariants are mandatory and non-negotiable:

1. Safety must be consistent everywhere.
2. No feature bypasses Doctor Summary pipeline.
3. No direct user output without safety check.
4. Sensitive Mode must be canonical from health profile.
5. localStorage must never crash app.

Any change that violates an invariant must be rolled back or blocked.

---

## 9. Summary

Curavon is:

**"A next-best-action health system with safety-first architecture."**
