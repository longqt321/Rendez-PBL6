---
name: research-problem-hypothesis
description: Formulate and evaluate scientific AI/ML research problems and testable hypotheses, establish operational definitions, ensure Popperian falsifiability, and define boundary conditions. Use when starting an AI research project or defining experiment scopes.
---

# Skill: Research Problem Formulation & Hypothesis Evaluation
# ERPF-AI-SKILL-002 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill guides an AI research agent or researcher to transform vague scientific curiosities into **falsifiable research questions** and **testable hypotheses**. It enforces the **Popperian Criterion of Demarcation**, separates scientific research from software engineering implementation, defines operational metrics, and establishes explicit boundary conditions under which the hypothesis is predicted to hold or fail.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Designing a new scientific inquiry, grant proposal, or research roadmap.
- Converting an observed empirical anomaly or literature gap into a formal research question.
- Auditing a research proposal to verify whether its core thesis can actually be disproven.
- Distinguishing a scientific hypothesis from an engineering implementation ticket.

---

## 3. Required Information & Context
Before formulating the problem:
1. Literature review findings and identified research gap (`ERPF-AI-SKILL-001`).
2. Target modalities, task formulations, and baseline architectures.
3. Available computational constraints (GPU memory, training budget, sample size limits).

---

## 4. Prerequisites
- `ERPF-AI-DOM-001` (Research Problem Formulation and Research Questions).
- `ERPF-AI-DOM-003` (Hypothesis Development and Scientific Methodology).
- Understanding of Popperian falsifiability (`ERPF-CORE-PRIN-002`).

---

## 5. Structured Execution Instructions

### Phase 1: Problem Demarcation (Science vs Engineering)
1. **Apply the Demarcation Test:**
   - *Engineering Question:* "How do we build a system that achieves $X$?" (Optimizes for construction, throughput, delivery).
   - *Scientific Research Question:* "Why does phenomenon $Y$ occur under condition $Z$, and what underlying mechanism governs it?" (Optimizes for understanding, causality, generalizable truth).
2. **Formulate the Primary Research Question (RQ):**
   - Must be precise, non-tautological, and open to empirical disproof.
   - Example: *"Does explicit feature orthogonalization mitigate gradient starvation in multi-task diffusion architectures under imbalanced task losses?"*

### Phase 2: Operational Definition of Variables
Transform abstract concepts into quantifiable variables:
1. **Independent Variable ($X$ - What is manipulated):**
   - The specific inductive bias, loss term, architectural component, or data constraint.
2. **Dependent Variable ($Y$ - What is measured):**
   - The concrete metric (e.g., Pareto frontier area, downstream zero-shot transfer accuracy, gradient cosine similarity).
3. **Control Variables ($Z$ - What is strictly held constant):**
   - Model capacity (parameter count), compute budget (FLOPs), random seed, optimizer hyperparameters, training iterations.

### Phase 3: Hypothesis Construction & Falsifiability Audit
Construct the hypothesis using the standard 3-part causal structure:
$$\text{If } [Mechanism / Intervention X], \text{ then } [Observable Effect Y], \text{ because } [Theoretical Grounding / Invariant Z].$$

Subject the hypothesis to the **Popperian Falsification Gate**:
1. *What specific quantitative observation would conclusively prove this hypothesis WRONG?*
2. If no possible experiment could disprove the claim (e.g., *"Transformers are generally good"*), the hypothesis is rejected as **unscientific**.

### Phase 4: Boundary Scoping & Anticipated Failure Regimes
1. Define the **Applicability Perimeter**: For what data distributions, noise levels, and dimensionalities is the hypothesis expected to hold?
2. Predict the **Failure Regime**: Under what explicit conditions is the proposed mechanism predicted to break down? (e.g., *"When task loss ratios exceed $100:1$, orthogonalization will degrade into gradient cancellation"*).

---

## 6. Technical Decision Criteria

| Hypothesis Formulation Finding | Scientific Directive |
| :--- | :--- |
| Hypothesis is phrased as a truism (e.g., "Adding more data improves accuracy") | **Reject:** Formulate around scaling exponents, saturation knee-points, or data quality trade-offs. |
| Dependent variable cannot be decoupled from confounding factors | **Restructure:** Design an intermediate micro-metric (e.g., representation singular value spectrum). |
| Core claim cannot be falsified within available GPU compute | **Downscale Scope:** Formulate hypothesis on smaller benchmark with identical theoretical dynamics. |

---

## 7. Expected Outputs
A **Research Formulation Specification** containing:
1. **Primary Research Question (RQ)** and 2-3 Sub-questions.
2. **Operational Definitions Table** (Independent, Dependent, and Controlled variables).
3. **Formal Falsifiable Hypothesis Statement.**
4. **Falsification Criteria:** Explicit numerical thresholds that disprove the hypothesis.
5. **Boundary Regime:** Predicted failure conditions.

---

## 8. Verification Criteria
- [ ] Hypothesis contains an explicit causal mechanism ("because of Z"), not just a correlation prediction.
- [ ] At least one concrete falsification threshold is defined (e.g., *"If $\Delta \text{Metric} < +1.5\%$ over baseline across 5 seeds, hypothesis is falsified"*).
- [ ] Operational metrics can be computed directly from model artifacts without subjective human grading.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **Vague Hypotheses:** *"Attention mechanisms will help tabular models."* (Unfalsifiable, no operational definition).
- **Hypothesizing After Results are Known (HARKing):** Modifying the hypothesis post-hoc to match whatever serendipitous number appeared in logs.
- **Confusing Novelty with Utility:** Assuming that because an algorithm is mathematically complicated, it constitutes a valid scientific contribution.

---

## 10. Limitations
- Does not design the code harness or execute GPU training (delegated to `controlled-experiment-design`).
- Cannot guarantee that high-level theoretical assumptions hold in non-convex neural network loss landscapes.

---

## 11. Supporting Knowledge References
- Foundations: `ERPF-CORE-PRIN-002` (Critical Thinking & Falsifiability), `ERPF-CORE-PRIN-005` (Evidence-Based Reasoning).
- Competencies: `ERPF-CORE-COMP-001` (Problem Formulation), `ERPF-CORE-COMP-002` (Analytical Reasoning).
- Domains: `ERPF-AI-DOM-001` (Research Problem Formulation), `ERPF-AI-DOM-003` (Hypothesis Development).
- Workflows: `ERPF-AI-WORK-003` (Research Problem and Hypothesis Formulation Workflow).
