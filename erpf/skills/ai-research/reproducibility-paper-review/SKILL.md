---
name: reproducibility-paper-review
description: Audit research reproducibility against NeurIPS/ICLR checklists, package reproducible artifact sandboxes, conduct rigorous 4-axis scientific paper reviews, verify evidence-to-claim alignment, and formulate evidence-based rebuttals without speculation or hype. Use when preparing submissions, auditing artifacts, or reviewing AI/ML manuscripts.
---

# Skill: Reproducibility Assessment and Scientific Paper Review
# ERPF-AI-SKILL-007 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill equips an AI research agent or reviewer to audit **research reproducibility** and conduct **objective, critical peer review** of scientific papers in machine learning. It operationalizes the **NeurIPS / ICLR Machine Learning Reproducibility Checklist**, verifies **Claims-to-Evidence 1:1 alignment** (eliminating hype and overclaiming), evaluates papers across 4 core axes (Soundness, Empirical Rigor, Novelty, Clarity), identifies **Fatal Flaws vs Minor Concerns**, and structures professional, evidence-driven author response (rebuttal) documents.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Auditing a machine learning code repository and paper manuscript prior to conference submission.
- Reviewing an AI/ML research paper as an academic reviewer or internal mock reviewer.
- Formulating an Author Response / Rebuttal to address critical reviewer comments.
- Verifying whether a published paper's reported numbers can be independently reproduced.

---

## 3. Required Information & Context
Before initiating the review/audit:
1. The paper manuscript (PDF / LaTeX source) with all figures, tables, and appendix.
2. The companion code repository, dependency manifests (`requirements.txt`, `environment.yml`, `Dockerfile`), and pre-trained model weights.
3. Conference review criteria and guidelines (e.g., NeurIPS Paper Checklist, ICLR Reviewer Guidelines).

---

## 4. Prerequisites
- `ERPF-AI-DOM-024` (Reproducibility and Provenance).
- `ERPF-AI-DOM-025` (Scientific Writing and Peer Review).
- Workflow: `ERPF-AI-WORK-007` (Research Reproducibility) & `ERPF-AI-WORK-008` (Paper Review and Writing).
- Template: `ERPF-TOOL-TMP-003` (Peer Review Rubric Template).

---

## 5. Structured Execution Instructions

### Phase 1: The Reproducibility Audit (Artifact Verification Protocol)
1. **Differentiate Reproducibility from Replicability:**
   - *Reproducibility (Same Code + Same Data = Same Numbers):* Can an independent user obtain the exact reported numbers using the author's code and data?
   - *Replicability (New Lab + New Data = Same Finding):* Does the core scientific conclusion hold when evaluated by an independent team on new datasets?
2. **Execute the NeurIPS Reproducibility Checklist Audit:**
   - *Model & Code:* Are all code dependencies, random seeds, and exact training commands documented?
   - *Data:* Are datasets publicly available with licenses? If private, are synthetic/toy equivalents provided?
   - *Compute Footprint:* Is total GPU time, hardware type, and CO2 footprint disclosed?
   - *Evaluation Harness:* Are test metrics computed using public official scripts rather than custom implementations?
3. **Verify Sandbox Execution:**
   - Check if a single command (e.g., `bash run_reproducibility.sh`) reproduces Table 1 in an isolated environment.

### Phase 2: Claims-to-Evidence Alignment & Overclaiming Audit
1. **Construct the Claims Matrix:**
   - Extract every primary claim made in the Abstract and Introduction.
   - Map each claim 1:1 to a specific Table, Figure, or Theorem in the manuscript.
2. **Flag Disconnected Claims (Overclaiming):**
   - Flag claims using absolute language (*"solves"*, *"unprecedented"*, *"optimal"*, *"superior in all regimes"*).
   - Require appropriate scientific **Hedging** (`ERPF-AI-DOM-025`): E.g., replace *"Our method eliminates forgetting"* with *"Our results suggest substantial mitigation of forgetting under the evaluated benchmarks"*.
3. **Check Negative Results & Limitations Disclosure:**
   - Verify that the paper has an honest, dedicated Limitations section detailing where the method fails or requires prohibitive compute.

### Phase 3: The 4-Axis Peer Review Protocol
Evaluate the paper objectively using the standard rubric (`ERPF-TOOL-TMP-003`):
1. **Axis 1: Soundness (Weight 40%):**
   - Are the mathematical derivations and proofs logically correct?
   - Is the conceptual framing theoretically sound, or does it contain fundamental logical fallacies?
2. **Axis 2: Empirical Rigor (Weight 25%):**
   - Are baselines competitive and properly tuned?
   - Are multi-seed variances and confidence intervals reported?
   - Is an ablation study present that isolates component necessity?
3. **Axis 3: Novelty & Significance (Weight 20%):**
   - Does the paper offer conceptual insight, or is it an incremental parameter tweak?
   - Will the community build upon this work?
4. **Axis 4: Clarity & Reproducibility (Weight 15%):**
   - Is the paper well-structured (Hourglass model)?
   - Are code, data, and hyperparameters fully specified?
5. **Classify Concerns:**
   - **Fatal Flaws (Reject / Desk Reject):** Flawed proofs, severe data leakage, unfair baselines that invalidate conclusions.
   - **Minor Concerns (Resolvable in Rebuttal):** Missing baseline citation, typo in equation, request for an extra ablation slice.

### Phase 4: Constructive Review & Rebuttal Formulation
1. **Drafting a Peer Review Report:**
   - State a fair 1-paragraph summary of the paper's core idea and findings.
   - Highlight Strengths (genuine contributions) before Weaknesses.
   - Frame Weaknesses as actionable questions (e.g., *"Could the authors clarify how baseline X was tuned?"*).
2. **Formulating an Author Response (Rebuttal):**
   - Adopt a polite, evidence-driven tone; never argue emotionally or insult reviewers.
   - Structure point-by-point responses using `[Question] -> [Direct Answer] -> [New Empirical Data / Table Reference]`.

---

## 6. Technical Decision Criteria

| Audit Finding | Review Decision |
| :--- | :--- |
| Paper claims SOTA but test code has data leakage (`ERPF-AI-LESS-001`) | **Score: Strong Reject (Fatal Flaw):** Empirical conclusions are invalid. |
| Code is missing but all mathematical derivations and proofs are self-contained | **Score: Weak Accept / Borderline:** Solid theoretical contribution; request open-source code in camera-ready. |
| Reviewer misunderstands a clear section of the paper | **Rebuttal Strategy:** Politely take responsibility for the lack of clarity; quote the exact lines in the paper and provide clarifying diagram. |

---

## 7. Expected Outputs
1. **Reproducibility Audit Checklist Report** (NeurIPS compliance checklist).
2. **Claims-to-Evidence Verification Table**.
3. **Formal Peer Review Document** (Summary, Strengths, Weaknesses, Questions, Decision Recommendation 1-10).
4. **Structured Rebuttal Response Letter** (if in author response phase).

---

## 8. Verification Criteria
- [ ] 100% of major claims in Abstract/Intro are traced to empirical or theoretical evidence.
- [ ] Review report separates Fatal Flaws from minor aesthetic concerns.
- [ ] Review is constructive, professional, and free of unsupported subjective bias.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **The Toxic Reviewer Trap:** Writing scathing, sarcastic, or dismissive reviews without technical justification.
- **The Emotional Rebuttal:** Arguing with the reviewer's intelligence instead of providing empirical data.
- **Hiding Code Defects:** Claiming reproducibility while providing broken code with missing dependencies or hardcoded paths.
- **Overclaiming Novelty:** Claiming to be "the first to combine X and Y" without thoroughly checking prior literature.

---

## 10. Limitations
- An automated reviewer cannot execute complex proprietary code that requires multi-node GPU supercomputers beyond available sandbox capabilities.
- Reviewer scores are advisory recommendations; meta-reviewers and program chairs retain ultimate decision authority.

---

## 11. Supporting Knowledge References
- Foundation: `ERPF-CORE-PRIN-001` (Intellectual Honesty), `ERPF-CORE-PRIN-002` (Falsifiability & Skepticism).
- Competencies: `ERPF-CORE-COMP-003` (Critical Evaluation), `ERPF-CORE-COMP-009` (Collaboration & Peer Review).
- Domains: `ERPF-AI-DOM-024` (Reproducibility), `ERPF-AI-DOM-025` (Scientific Writing and Peer Review).
- Workflows: `ERPF-AI-WORK-007` (Research Reproducibility), `ERPF-AI-WORK-008` (Paper Review and Writing).
- Templates: `ERPF-TOOL-TMP-003` (Peer Review Rubric Template).
