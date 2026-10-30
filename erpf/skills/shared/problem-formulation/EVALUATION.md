# Evaluation Rubric: Problem Formulation & Decomposition

Evaluate the output of an agent or practitioner performing this skill across 4 core dimensions:

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Symptom vs Cause Separation** | Prescribes a solution directly (e.g., "Add cache") without diagnosing the underlying mechanism. | Identifies technical mechanism causing the symptom, separate from user-facing complaints. | Traces failure through the exact call tree, identifying invariant violations and state origins. |
| **2. Boundary Precision & Non-Goals** | Boundaries are vague; no non-goals mentioned; vulnerable to unbounded scope expansion. | Mentions clear in-scope tasks and at least 2 explicit non-goals. | Rigorously scopes the blast radius, defines contract boundaries, and lists non-goals with technical rationales. |
| **3. Acceptance Criteria Rigor** | Subjective or unmeasurable criteria (e.g., "Must be fast and clean"). | Binary criteria with at least one verifiable quantitative threshold. | Complete Given-When-Then criteria covering success, boundary failure, and performance limits. |
| **4. Architectural Independence** | Proposes solutions that bypass existing architecture or introduce unnecessary dependencies. | Respects existing architecture and works within the existing stack constraints. | Maximizes leverage by identifying existing selectors, services, and idioms before considering additions. |
