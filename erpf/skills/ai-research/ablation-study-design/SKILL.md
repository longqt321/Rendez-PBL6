---
name: ablation-study-design
description: Design rigorous ablation studies in AI/ML, isolate independent contributions of architectural components and loss terms, detect non-linear interactions, and prevent false causal attributions. Use when validating novelty claims, preparing ablation tables for papers, or proving component necessity.
---

# Skill: Ablation Study Design
# ERPF-AI-SKILL-005 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill guides an AI research agent or researcher to formulate and execute **controlled ablation studies** in machine learning. It isolates the causal contribution of each architectural block, objective function term, data augmentation, and training trick, preventing false attribution of gains, uncovering non-linear synergy or cancellation effects, and producing publication-grade ablation tables adhering to IEEE/ACM standards.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Proposing a new multi-component neural architecture or composite loss function.
- Preparing the Ablation Study section of an AI/ML scientific paper.
- Verifying whether a claimed improvement is genuinely caused by the proposed novel mechanism or merely by unacknowledged training hyperparameter shifts.
- Reviewing a submission where components appear arbitrarily stacked together.

---

## 3. Required Information & Context
Before designing ablations:
1. Complete model specification with all distinct modular components identified:
   - Architectural blocks (e.g., Cross-Attention, Gated MLP, Skip Connection).
   - Loss function terms (e.g., $\mathcal{L}_{\text{task}} + \lambda_1 \mathcal{L}_{\text{contrast}} + \lambda_2 \mathcal{L}_{\text{reg}}$).
   - Data augmentations or preprocessing transforms.
2. Verified benchmark evaluation harness (`ERPF-AI-SKILL-004`).
3. Dedicated compute budget for running $K$ ablation variants across $\ge 3$ seeds.

---

## 4. Prerequisites
- `ERPF-AI-DOM-022` (Ablation Studies and Attribution).
- `ERPF-CORE-PRIN-006` (Root Cause Analysis and Causal Isolation).
- Workflow: `ERPF-AI-WORK-006` (Ablation and Failure Analysis Workflow).

---

## 5. Structured Execution Instructions

### Phase 1: Component Decomposition & Protocol Selection
1. **Catalog Every Non-Standard Moving Part ($C_1, C_2, \dots, C_M$):**
   - Separate novel conceptual proposals from standard baseline foundations.
2. **Select the Ablation Protocol:**
   - **Protocol A: Leave-One-Out (Testing Necessity):**
     * Start from the Full Proposed System ($S_{\text{full}}$).
     * Remove component $C_i$ one at a time ($S_{\text{full}} \setminus \{C_i\}$), replacing it with the baseline equivalent or identity mapping.
     * *Measures:* Is component $C_i$ **strictly necessary** for peak performance?
   - **Protocol B: Add-One-In / Cumulative Stacking (Testing Sufficiency):**
     * Start from the bare Baseline ($S_{\text{base}}$).
     * Add components incrementally ($S_{\text{base}} \cup \{C_1\}$, then $\cup \{C_1, C_2\}$, etc.).
     * *Measures:* Can component $C_i$ **independently deliver value** without requiring the full stack?

### Phase 2: Controlled Isolation & Confounding Control Invariants
1. **The Single-Variable Invariant:**
   - Modify exactly **one component per ablation row**.
   - Do NOT change learning rate, batch size, or epoch budget between ablation rows unless the component fundamentally alters the parameter scale.
2. **Isolate Parameter Count (Capacity Control):**
   - If adding component $C_1$ increases parameter count by 20%, run a control ablation where the baseline's hidden dimension is increased to match identical parameter count.
   - Prove that the gain comes from the *inductive bias*, not from raw parameter capacity.

### Phase 3: Interaction & Non-Linear Synergy Analysis
1. Calculate the interaction term between components $C_1$ and $C_2$:
   $$\Delta_{\text{synergy}} = \text{Gain}(C_1 \cup C_2) - [\text{Gain}(C_1) + \text{Gain}(C_2)]$$
2. **Interpret Interaction Regimes:**
   - $\Delta_{\text{synergy}} > 0$: **Positive Synergy** (Components multiply each other's efficacy).
   - $\Delta_{\text{synergy}} \approx 0$: **Additive Independence** (Orthogonal contributions).
   - $\Delta_{\text{synergy}} < 0$: **Interference / Masking** (One component cancels out or renders the other redundant).

### Phase 4: Constructing the Publication-Grade Ablation Table
Structure the table strictly:
- Column 1: Row Identifier (Variant index).
- Columns 2 to $M+1$: Component flags (Checkmark $\checkmark$ or dash $-$).
- Column $M+2$: Parameter count / FLOPs.
- Final Columns: Primary evaluation metric $\pm \text{std}$ (over $\ge 3$ seeds) and relative delta ($\Delta$).

---

## 6. Technical Decision Criteria

| Ablation Observation | Scientific Conclusion |
| :--- | :--- |
| Removing Component $C_1$ results in zero drop in metric | **Component is Dead Weight:** Prune $C_1$ from the proposed architecture (`ERPF-CORE-PRIN-008`). |
| Baseline scaled to matched parameter count achieves same score | **Attribution False:** The gain was caused by raw capacity, not novel architecture. Retract novelty claim. |
| Removing $C_1$ causes collapse, but adding $C_1$ alone to baseline does nothing | **Synergistic Dependency:** Document that $C_1$ requires $C_2$ as a structural precondition. |

---

## 7. Expected Outputs
1. **Ablation Matrix Specification** defining all $K$ model configurations.
2. **Standard Ablation Results Table** with parameter counts and multi-seed variances.
3. **Causal Attribution Analysis Narrative** explicitly stating which component accounts for what percentage of total gain.

---

## 8. Verification Criteria
- [ ] Every non-standard component in the proposed model is evaluated in at least one isolated ablation row.
- [ ] At least one parameter-matched capacity control is included.
- [ ] All ablation scores are computed across identical seeds and validation splits.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **The "Kitchen Sink" Flaw:** Stacking 5 different tricks together without showing whether all 5 are actually doing anything useful.
- **Tuning Only the Full Model:** Tuning hyperparameters intensely for the full model while running ablation rows with untuned defaults.
- **Ignoring Dead Weight:** Retaining a complex loss term that only contributes $+0.05\%$ within noise margins.

---

## 10. Limitations
- Combinatorial explosion: Fully testing all combinations of $M$ components requires $2^M$ runs. When $M > 5$, practitioners must judiciously select Leave-One-Out and primary pairs.

---

## 11. Supporting Knowledge References
- Foundations: `ERPF-CORE-PRIN-006` (Root Cause Analysis), `ERPF-CORE-PRIN-008` (Simplest Sufficient Solution).
- Domains: `ERPF-AI-DOM-022` (Ablation Studies and Attribution).
- Workflows: `ERPF-AI-WORK-006` (Ablation and Failure Analysis Workflow).
- Templates: `ERPF-TOOL-TMP-003` (Peer Review Rubric).
