---
name: critical-technical-reasoning
description: Systematically stress-test technical proposals, examine implicit assumptions, conduct pre-mortem analysis, and verify falsifiability before commitment. Use during design reviews, architectural proposals, or when evaluating high-risk technical claims.
---

# Skill: Critical Technical Reasoning
# ERPF-CORE-SKILL-002 (Version 1.0.0)

---

## 1. Purpose
This skill empowers an agent or practitioner to critically examine technical proposals, uncover unstated assumptions, subject hypotheses to rigorous falsification tests, and perform **Pre-Mortem Failure Analysis** to preemptively identify blind spots before irreversible technical commitments are made.

---

## 2. Activation Conditions
Invoke this skill whenever:
- A technical design document (RFC, ADR, PR plan) is presented for review.
- A proposed solution claims dramatic improvements without trade-offs (e.g., *"This will solve all our scaling issues with zero downsides"*).
- An agent or human is about to execute a high-risk, irreversible architectural change (One-Way Door).
- Evaluating vendor claims, novel frameworks, or third-party libraries.

---

## 3. Required Context
Before conducting the critical review:
1. The technical proposal or hypothesis under scrutiny.
2. The current architecture and operational constraints (`docs/`, `backend/`, `frontend/`).
3. Historical incidents, bug post-mortems, or technical debt notes.

---

## 4. Step-by-Step Instructions

### Phase 1: Implicit Assumption Extraction
1. **Catalog Claims:** List every primary claim made in the proposal (e.g., *"Eventual consistency will not cause UX issues"*).
2. **Surface Hidden Dependencies:** Identify dependencies on unverified external factors:
   - Network reliability and latencies.
   - Caller behavior (e.g., assuming callers will never send malformed inputs).
   - Clock synchronization or order of execution.
   - Resource availability under peak concurrent load.
3. **Formulate the Counter-Proposition:** For each assumption, ask: *"What if this assumption is 100% false? How does the system fail?"*

### Phase 2: Pre-Mortem Simulation (Forward Failure Walkthrough)
1. **Assume Total Failure:** Adopt the mental stance: *"It is 6 months from now. This proposal was implemented and deployed. It caused a catastrophic production outage. Why did it fail?"*
2. **Trace the Failure Chain:**
   - What was the trigger event? (e.g., network partition, schema migration timeout, sudden traffic spike).
   - What component failed first?
   - How did the failure cascade across system boundaries?
   - What observability gaps prevented immediate detection?
3. **Categorize the Vulnerabilities:** Classify risks into Fatal Flaws (blockers) vs Manageable Friction.

### Phase 3: Falsifiability & Popperian Stress-Testing
1. **Identify Unfalsifiable Claims:** Flag assertions that cannot be proven wrong (e.g., *"The system will feel more modern"*).
2. **Design Falsification Probes:** For every key technical hypothesis, design a specific stress-test experiment or counter-example that would decisively disprove it.
3. **Check for Confirmation Bias:** Actively search for evidence *against* the proposal rather than just supporting data.

### Phase 4: Constructive Synthesis & Risk Containment
1. Formulate concrete mitigating controls (e.g., circuit breakers, fallback degradation, idempotent retries).
2. Define a **Rollback & Escape Hatch Plan**: Exactly how to revert to the previous state if the failure occurs.

---

## 5. Decision Criteria

| Stress-Test Finding | Required Action |
| :--- | :--- |
| Proposed system lacks a transactional rollback path | **Veto:** Block proposal until an atomic rollback or parallel-run strategy is defined. |
| Core benefit depends on 100% network/hardware availability | **Reject:** Mandate asynchronous decoupling or local-first resilience. |
| Proposal has minor failure modes with clear blast radius | **Approve with Guardrails:** Mandate rate-limiting, metrics alarms, and feature flags. |

---

## 6. Expected Outputs
A **Critical Technical Evaluation Report** containing:
1. **Table of Extracted Assumptions & Vulnerabilities.**
2. **Pre-Mortem Failure Scenario & Cascade Map.**
3. **Falsification Tests:** Specific conditions under which the proposal should be abandoned.
4. **Mandatory Guardrails & Rollback Plan.**

---

## 7. Verification Requirements
- [ ] At least 3 implicit assumptions have been uncovered and analyzed.
- [ ] A complete pre-mortem scenario has been traced with trigger, cascade, and blast radius.
- [ ] The feedback provides constructive alternatives rather than mere negation.

---

## 8. Failure Modes & Anti-Patterns
- **Cynicism without Evidence:** Rejecting proposals based on gut feeling or dogmatic prejudice rather than structural evidence.
- **Rubber-Stamping:** Approving complex changes without questioning assumptions because the author is senior or the document looks polished.
- **Nitpicking Minor Syntax:** Focusing on code formatting or naming while ignoring deep architectural race conditions.

---

## 9. Safety & Scope Boundaries
- This skill produces analytical critiques, threat models, and risk assessments.
- It does not modify system configuration or delete files.

---

## 10. References to Supporting Knowledge
- Foundation Principles: `ERPF-CORE-PRIN-002` (Critical Thinking & Falsifiability), `ERPF-CORE-PRIN-007` (Trade-off Analysis).
- Core Competencies: `ERPF-CORE-COMP-003` (Critical Evaluation).
- Workflows: `ERPF-CORE-WORK-003` (Critical Review and Self-Assessment Workflow).
- Templates: `ERPF-TOOL-TMP-003` (Peer Review Rubric).
