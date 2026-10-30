---
name: evidence-based-decision-making
description: Make traceable, evidence-based technical and architectural decisions, evaluate trade-offs with multi-criteria scoring, distinguish One-Way vs Two-Way doors, and formalize decisions into Architecture Decision Records (ADR). Use when choosing between competing technologies, architectural patterns, or resolving technical deadlocks.
---

# Skill: Evidence-Based Decision-Making
# ERPF-CORE-SKILL-003 (Version 1.0.0)

---

## 1. Purpose
This skill guides an agent or practitioner in evaluating multiple competing technical options through objective, weighted trade-off analysis, classifying decisions by reversibility (One-Way Door vs Two-Way Door), collecting empirical evidence, and formalizing the choice into an immutable **Architecture Decision Record (ADR)** to prevent recurring circular debates.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Choosing between 2 or more competing libraries, frameworks, or database engines.
- Resolving a contentious technical disagreement between team members or agents.
- Committing to a structural architectural pattern (e.g., synchronous REST vs async WebSockets, Monolith vs Microservices).
- Deprecating a legacy system or core data schema.

---

## 3. Required Context
Before making the decision:
1. Defined problem statement and non-goals (from `problem-formulation`).
2. Current architecture constraints, SLAs, and operational boundaries.
3. List of viable competing candidates (minimum 2, ideally 3 including "do nothing / status quo").

---

## 4. Step-by-Step Instructions

### Phase 1: Reversibility & Blast Radius Classification
Classify the decision using the Two-Doors Model:
1. **One-Way Door (Type 1 - High Irreversibility):**
   - *Characteristics:* High blast radius, destructive database schema migrations, breaking public API changes, multi-year vendor lock-in.
   - *Requirement:* Requires exhaustive spike prototyping, formal benchmark evidence, peer review consensus, and an explicit escape hatch.
2. **Two-Way Door (Type 2 - Reversible):**
   - *Characteristics:* Low blast radius, easily isolated behind an interface seam, can be rolled back in $< 1\text{ sprint}$.
   - *Requirement:* Bias for fast action, minimal deliberation; pick the simplest sufficient option and iterate.

### Phase 2: Multi-Criteria Trade-Off Scoring Matrix
Construct a decision matrix:
1. **Define Objective Criteria:**
   - Operational Complexity (deployment, monitoring, failure modes).
   - Maintenance Cost & Locality of Change.
   - Performance (P95 latency, memory footprint, throughput).
   - Alignment with Existing Stack and Team Competencies.
   - Reversibility / Migration Simplicity.
2. **Assign Normalized Weights ($w_i \in [0.1, 0.4]$, $\sum w_i = 1.0$).**
3. **Score Each Candidate (1-5 Scale) backed by evidence, not speculation.**
4. Calculate Weighted Score: $S = \sum (w_i \times s_i)$.

### Phase 3: Empirical Spike & Proof-of-Concept
For Type 1 decisions or top candidates separated by $< 10\%$:
1. Write a minimal, throwaway proof-of-concept (PoC) in a separate branch or test scratchpad.
2. Measure concrete metrics under identical test workloads (e.g., query execution time, memory usage, lines of code).
3. Do not rely on marketing claims from library documentation.

### Phase 4: Formalize the Architecture Decision Record (ADR)
Draft an ADR document following the standard 5-part structure:
- **Title & Status:** `ADR-[ID]: [Decision Title]` (Status: Proposed / Accepted / Superseded).
- **Context:** The technical problem, forces, and constraints.
- **Decision:** The chosen option and exact scope of adoption.
- **Consequences:** Positive gains, accepted technical debt, and explicit negative trade-offs.
- **Compliance & Reversibility:** How the decision will be verified in code reviews and how to roll it back if assumptions fail.

---

## 5. Decision Criteria

| Scenario | Decision Rule |
| :--- | :--- |
| Option A has highest theoretical performance, but Option B uses existing team stack with adequate performance | **Choose B:** Satisfice over maximize. Avoid introducing new infrastructure if existing tools meet criteria (`ERPF-CORE-PRIN-008`). |
| Top candidate is an external third-party service requiring proprietary billing | **Reject:** Strict violation of zero-cost, self-hosted open-source preference unless explicitly authorized. |
| Decision has high uncertainty and is reversible | **Timebox a Two-Way Experiment:** Run for 2 weeks with a feature flag; measure metrics before finalizing. |

---

## 6. Expected Outputs
1. **Trade-off Evaluation Matrix:** Tabular comparison of competing approaches.
2. **Empirical Spike Benchmark Results:** Concrete latency/memory/resource numbers.
3. **Formal ADR Document:** Ready for inclusion in `erpf/` or project documentation.

---

## 7. Verification Requirements
- [ ] At least 2 alternatives (plus Status Quo) were rigorously evaluated.
- [ ] Every score in the matrix has an empirical or architectural justification.
- [ ] Explicit negative consequences (trade-offs accepted) are documented in the ADR.

---

## 8. Failure Modes & Anti-Patterns
- **Resume-Driven Development (RDD):** Choosing technology because it is trending on social media rather than solving the concrete problem.
- **Analysis Paralysis:** Spending weeks debating a easily reversible Two-Way Door decision that could be proven in 2 hours with code.
- **Hidden Trade-offs:** Pretending the chosen option has zero downsides.

---

## 9. Safety & Scope Boundaries
- Making a decision document does not execute production cutover.
- Spikes and prototypes must be isolated and never deployed directly to production without testing.

---

## 10. References to Supporting Knowledge
- Foundation Principles: `ERPF-CORE-PRIN-004` (Evidence-Based Reasoning), `ERPF-CORE-PRIN-007` (Trade-off Analysis), `ERPF-CORE-PRIN-008` (Simplest Sufficient Solution).
- Core Competencies: `ERPF-CORE-COMP-005` (Technical Decision-Making).
- Workflows: `ERPF-CORE-WORK-002` (Technical Decision-Making Workflow).
- Case Studies: `ERPF-SE-CASE-001` (Intervention Level Selection).
