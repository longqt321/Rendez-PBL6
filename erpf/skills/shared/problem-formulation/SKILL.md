---
name: problem-formulation
description: Formulate and decompose ambiguous technical or research problems into structured, verifiable specifications with explicit boundaries and acceptance criteria. Use when presented with open-ended requirements, ambiguous bug reports, or unverified feature requests.
---

# Skill: Problem Formulation & Decomposition
# ERPF-CORE-SKILL-001 (Version 1.0.0)

---

## 1. Purpose
This skill equips an agent or practitioner to take an ambiguous, ill-defined, or high-level request, peel away deceptive surface symptoms, and transform it into a rigorous, well-bounded **Problem Specification Document** with clear 5W2H parameters, explicit non-goals, and falsifiable acceptance criteria before any code is written or experiments are run.

---

## 2. Activation Conditions
Invoke this skill whenever:
- The user provides a vague or high-level request (e.g., *"Make the search faster"*, *"Add recommendation support"*, *"Fix the place photo issue"*).
- A reported problem conflates symptoms with the underlying cause.
- Multiple stakeholders express contradictory requirements.
- The boundary between what is in-scope and what is out-of-scope is unclear.

---

## 3. Required Context
Before formulating the problem, inspect:
1. Relevant requirements documents, architecture docs, or issue tickets (`docs/`, issue descriptions).
2. Existing domain models and ubiquitous language (`GLOSSARY.md`, `erpf/foundation/competencies.md`).
3. Current system constraints: SLAs, data volumes, latency budgets, hardware availability.

---

## 4. Step-by-Step Instructions

### Phase 1: Symptom-Cause Decoupling
1. **Catalog Surface Statements:** Extract all user statements and observations.
2. **Apply the 5-Whys Probe:** For each reported issue, ask *why* until reaching an architectural constraint, invariant violation, or business model boundary.
3. **Separate Observable Symptoms from Invariants:**
   - *Symptom:* "The map page freezes for 3 seconds."
   - *Technical Mechanism:* "The client requests 5,000 unindexed GeoJSON polygons synchronously on the main UI thread."

### Phase 2: 5W2H Scoping & Boundary Framing
Draft a concise formulation table:
- **Who:** Impacted personas, callers, or consumers (e.g., mobile users on 3G, automated crawlers).
- **What:** The precise functional behavior that fails or is missing.
- **Where:** Exact architectural subsystem, seam, or module boundaries.
- **When:** Trigger conditions, load spikes, temporal sequences, lifecycle stages.
- **Why:** The concrete engineering cost or business failure caused by the problem.
- **How:** The observable manifestation (HTTP 504, memory leak, UI lockup).
- **How Much:** Quantitative impact (failure rate %, latency delta ms, throughput limit).

### Phase 3: Explicit Non-Goals & Boundary Defense
1. Identify adjacent problems that seem tempting to solve simultaneously.
2. Define them explicitly as **Non-Goals (Out of Scope)** to prevent scope creep.
3. Establish the **Blast Radius Boundary**: What parts of the codebase must remain untouched.

### Phase 4: Falsifiable Acceptance Criteria Definition
Write acceptance criteria using the **Given-When-Then** format:
- Criteria must be binary and verifiable (No vague terms like "must be reasonably fast" or "must look clean").
- Specify quantitative thresholds (e.g., "P95 latency $\le 120\text{ms}$ under 500 concurrent requests").

---

## 5. Decision Criteria

| Observed Situation | Heuristic / Action |
| :--- | :--- |
| Problem scope spans more than 2 distinct domain contexts | **Split:** Reject single-ticket solution; decompose into 2 independent sub-problems. |
| Root cause cannot be isolated without live telemetry | **Spike:** Formulate a measurement task first before formulating the fix. |
| Requirements contradict existing domain invariants | **Escalate:** Stop; surface invariant conflict explicitly before implementation. |

---

## 6. Expected Outputs
A structured Markdown specification containing:
1. **Core Problem Statement:** Single-paragraph root problem formulation.
2. **5W2H Parameters:** Quantitative and qualitative breakdown.
3. **In-Scope vs Out-of-Scope (Non-Goals):** Strict perimeter boundaries.
4. **Verifiable Acceptance Criteria:** Given-When-Then checklist with metrics.

---

## 7. Verification Requirements
- [ ] Every acceptance criterion can be tested automatically or verified via a concrete command.
- [ ] Non-goals list has at least 2 explicit exclusions.
- [ ] No technical solution is prescribed in the problem statement itself.

---

## 8. Failure Modes & Anti-Patterns
- **The Solution-in-Disguise Trap:** Formulating the problem as *"We need Redis caching"* instead of *"The database read query for hot venue data takes 800ms under peak load"*.
- **The Scope Creep Sinkhole:** Expanding the problem to rewrite legacy systems because *"while we're here, we might as well clean this up"*.
- **Vague Acceptance Criteria:** Writing *"Make it robust"* without specifying timeout limits or retry policies.

---

## 9. Safety & Scope Boundaries
- **READ-ONLY EXPLORATION:** This skill is strictly exploratory and analytical. It produces documents and specifications. It must **NEVER** edit production code, run database migrations, or install packages.

---

## 10. References to Supporting Knowledge
- Foundation Principles: `ERPF-CORE-PRIN-001` (Problem-First Thinking), `ERPF-CORE-PRIN-006` (Root Cause Analysis).
- Core Competencies: `ERPF-CORE-COMP-001` (Problem Formulation and Decomposition).
- Workflow: `ERPF-CORE-WORK-001` (Problem Understanding and Formulation Workflow).
- Template: `ERPF-TOOL-TMP-004` (Lesson Learned) & RFC Templates.
