---
name: architecture-review
description: Review software architecture, module depth, coupling and cohesion, interface seams, and blast radius. Use when evaluating major structural PRs, assessing architectural technical debt, or validating module boundaries against Clean Monolith principles.
---

# Skill: Software Architecture Review
# ERPF-SE-SKILL-002 (Version 1.0.0)

---

## 1. Purpose
This skill guides an agent or technical architect in conducting a thorough, evidence-based review of software system design. It evaluates **module depth** (high leverage behind small interfaces), checks **coupling and cohesion**, verifies **DDD bounded contexts**, and estimates **blast radius** to prevent architecture erosion and runaway technical debt.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Reviewing a major pull request that alters module interfaces or introduces cross-package dependencies.
- Evaluating a Design Document, RFC, or planned system restructuring.
- Performing an architecture debt audit on a monolithic or distributed system.
- Designing new seams for testability and AI navigability.

---

## 3. Required Context
Before conducting the review:
1. The architectural proposal, diagram, or code diff under evaluation.
2. Existing codebase topology and package relationships (`architecture-design/`).
3. Domain glossary and ubiquitous language definitions (`GLOSSARY.md`).

---

## 4. Step-by-Step Instructions

### Phase 1: Module Depth & Interface Surface Analysis
1. **Calculate the Interface-to-Implementation Ratio:**
   - How many public functions, classes, or types are exposed?
   - How much complex behavior, state management, and edge-case handling is encapsulated behind them?
2. **Flag Shallow Modules:** Look for pass-through classes or wrappers that simply delegate to another object without hiding complexity.
3. **Verify Information Hiding:** Ensure callers do not need to know internal database schemas, caching keys, or lock mechanisms to use the module correctly.

### Phase 2: Coupling & Cohesion Audit
1. **Analyze Dependency Direction:**
   - Do dependencies flow strictly downward toward more stable abstractions?
   - Are there circular dependencies (Module A imports B, B imports A)?
2. **Check Domain Boundary Violations:**
   - Does a domain module directly query private database tables of another module without going through its public selector or service interface?
3. **Assess Functional Cohesion:** Does every class or module have a single, coherent responsibility that changes for one unified reason?

### Phase 3: Seam & Testability Inspection
1. **Identify the Seams:** Locate where module behavior can be altered or faked without editing calling code.
2. **Evaluate In-Memory Testability:** Can callers test their integration against this module using lightweight fakes, or are they forced to spin up heavy external infrastructure?
3. **Check for Leaky Abstractions:** Do exception types from underlying drivers (e.g., `psycopg2.OperationalError`) leak through the interface instead of being translated into domain exceptions?

### Phase 4: Blast Radius & Reversibility Assessment
1. **Map Call Sites:** Grep for all callers of the modified interfaces.
2. **Estimate Blast Radius:** If this module fails or throws an unhandled exception, how far does the failure propagate?
3. **Verify Migration Invariants:** For schema or API changes, verify that the change is backward-compatible and supports phased deployment (Expand-and-Contract pattern).

---

## 5. Decision Criteria

| Architecture Finding | Review Decision |
| :--- | :--- |
| Module exposes internal database model directly across boundary | **Reject / Refactor:** Introduce a clean DTO or public Selector function. |
| Circular dependency between two domain modules | **Split Seam:** Extract shared types into a foundational contract package. |
| Module is deep, encapsulates transactions, and has small interface | **Approve:** Commend locality of change and leverage. |

---

## 6. Expected Outputs
An **Architecture Review Assessment** containing:
1. Module Depth Analysis (Deep vs Shallow evaluation).
2. Coupling & Cohesion Map (dependency direction and circularity check).
3. Seam and Testability Review.
4. Blast Radius Analysis and concrete refactoring recommendations.

---

## 7. Verification Requirements
- [ ] Every dependency between modules is verified against actual import statements or calls.
- [ ] Blast radius is quantified by number of impacted call sites or user flows.
- [ ] At least one concrete deepening opportunity or seam improvement is identified.

---

## 8. Failure Modes & Anti-Patterns
- **The "Everything is a Service" Anti-Pattern:** Creating dozens of micro-classes with 1 method each (Shallow Modules).
- **The God Object Anti-Pattern:** Dumping unrelated utility functions into a single 3,000-line `common/` or `utils/` file.
- **Accidental Distributed Monolith:** Splitting services without separating data ownership, resulting in cross-service database queries.

---

## 9. Safety & Scope Boundaries
- This skill produces architectural critiques and design guidance.
- It does not refactor code or modify repository structure directly.

---

## 10. References to Supporting Knowledge
- Foundation: `ERPF-CORE-PRIN-003` (Systems Thinking), `ERPF-CORE-PRIN-008` (Simplest Sufficient Solution).
- Domain Knowledge: `ERPF-SE-DOM-003` (Software Architecture), `ERPF-SE-DOM-004` (Software Design).
- Workflow: `ERPF-SE-WORK-003` (Architecture and Design Review Workflow).
- Skills: `codebase-design` (`.agents/skills/codebase-design/SKILL.md`).
