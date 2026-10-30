---
name: failure-error-analysis
description: Perform systematic failure and error analysis on ML/DL models, categorize systematic vs stochastic errors across data/model/evaluation dimensions, conduct qualitative and quantitative slice inspections, and translate failure patterns into next-generation research hypotheses.
---

# Skill: Failure and Error Analysis
# ERPF-AI-SKILL-006 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill guides an AI research agent or researcher to treat **model errors as scientific goldmines** rather than embarrassing flaws. It provides a structured methodology to dissect misclassifications, hallucinations, and outliers, classifying them into **Systematic Errors vs Stochastic Noise**, categorizing failures across the **Tripartite Ontology (Data, Model, Evaluation)**, and converting empirical failure modes into concrete, testable hypotheses for the next research cycle.

---

## 2. Activation Conditions
Invoke this skill whenever:
- A newly trained model achieves sub-optimal benchmark performance or plateaus early.
- Preparing the "Qualitative Analysis" or "Error Analysis" section of a paper.
- Auditing edge-case failure modes in safety-critical deployments (healthcare, vision, autonomous systems).
- Closing an experimental cycle to formulate the next research sprint.

---

## 3. Required Information & Context
Before analyzing failures:
1. Complete model predictions paired with ground truth labels on the validation or test split.
2. Confidence scores, predicted logits, and confusion matrix.
3. Access to raw input samples (images, text passages, tabular records) and feature metadata.

---

## 4. Prerequisites
- `ERPF-AI-DOM-023` (Failure Analysis and Error Categorization).
- Foundations: `ERPF-CORE-PRIN-006` (Root Cause Analysis).
- Familiarity with slicing techniques and interpretability tools.

---

## 5. Structured Execution Instructions

### Phase 1: Quantitative Slice-Based Error Stratification
1. **Sort Errors by Severity / Confidence Gap:**
   - **High-Confidence False Positives (The "Arrogant" Errors):** Model predicts $> 95\%$ confidence on the wrong class.
   - **High-Confidence False Negatives (The "Blind Spot" Errors):** Ground truth is positive, but model predicts near-zero probability.
   - **Boundary Ambiguities:** Model predicts near uniform probability ($\approx 0.5$).
2. **Cluster Failures Across Metadata Strata:**
   - Stratify error rates by input length, image brightness/contrast, token rarity, demographic tags, or tabular sparsity.
   - Identify whether failures concentrate disproportionately in specific slices ($> 3\times$ average error rate).

### Phase 2: The Tripartite Root-Cause Classification
Classify each representative cluster of failures into one of three fundamental failure domains:
1. **Data-Related Failures (Input Quality & Distribution):**
   - *Label Noise:* Ground truth in the benchmark dataset is objectively mislabeled or ambiguous.
   - *Distribution Shift:* Sample contains features never seen during training (OOD).
   - *Under-Representation:* The slice contains $< 0.1\%$ of training volume.
2. **Model-Related Failures (Representation & Capacity):**
   - *Capacity Saturation:* Model architecture lacks sufficient expressive power or receptive field.
   - *Inductive Bias Mismatch:* E.g., using standard convolutions on long-range non-local relationships.
   - *Shortcut Entanglement:* Model relied on a spurious correlation that was broken in this sample (`ERPF-AI-LESS-002`).
3. **Evaluation-Related Failures (Harness & Metric):**
   - Metric penalizes valid synonyms (e.g., in text generation).
   - Evaluation threshold $\tau$ is misaligned with class distribution.

### Phase 3: Qualitative In-Depth Sample Inspection (The 50-Sample Audit)
1. Randomly sample 50 distinct failure instances from the top error clusters.
2. Manually or programmatically inspect the raw inputs, attention heatmaps, and intermediate embeddings.
3. Quantify the distribution:
   $$\text{Distribution} = \frac{N_{\text{Data-error}}}{50} \text{ vs } \frac{N_{\text{Model-defect}}}{50} \text{ vs } \frac{N_{\text{Eval-flaw}}}{50}$$

### Phase 4: Transforming Failures into Next-Cycle Research Hypotheses
1. Identify the single largest *Systematic Model Defect* cluster (excluding noisy data).
2. Formulate a causal hypothesis explaining why the current architecture fails on this cluster.
3. Propose a targeted architectural modification, inductive bias, or objective term designed specifically to remediate this failure cluster.

---

## 6. Technical Decision Criteria

| Error Audit Finding | Scientific Action |
| :--- | :--- |
| $> 40\%$ of errors are caused by noisy ground truth labels | **Do Not Modify Model Architecture:** Fix benchmark annotations first, or report clean-subset performance. |
| Errors concentrate in a slice representing long-range dependencies | **Formulate Inductive Bias Hypothesis:** Propose self-attention or state-space module to expand receptive field. |
| Errors are uniformly distributed white noise | **Increase Capacity or Data Scale:** Model has reached Bayes error rate for current parameter scale. |

---

## 7. Expected Outputs
A **Systematic Failure Analysis Report** containing:
1. Quantitative Error Slice Matrix (identifying high-density failure regimes).
2. Tripartite Error Attribution Breakdown (Data vs Model vs Evaluation percentages).
3. Visual / Qualitative Case Studies (representative failure samples with attribution maps).
4. Concrete Next-Sprint Hypothesis derived directly from the failure cluster.

---

## 8. Verification Criteria
- [ ] At least 50 individual error cases were classified using the tripartite ontology.
- [ ] Systematic errors are clearly distinguished from random stochastic noise.
- [ ] At least one actionable research hypothesis is synthesized for the next iteration.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **Ignoring Failures:** Stating only aggregate benchmark numbers without inspecting a single misclassified sample.
- **Blaming the Data Exclusively:** Dismissing all model failures as "bad data" without checking if competitive baselines succeeded on those exact samples.
- **Subjective Storytelling:** Manually cherry-picking 2 intuitive failure examples that support the author's pet theory while ignoring the other 98% of errors.

---

## 10. Limitations
- Manual inspection of raw data can introduce human subjective confirmation bias. Must be paired with automated clustering and quantitative slice metrics.

---

## 11. Supporting Knowledge References
- Foundation: `ERPF-CORE-PRIN-006` (Root Cause Analysis), `ERPF-CORE-PRIN-001` (Intellectual Honesty).
- Domains: `ERPF-AI-DOM-023` (Failure Analysis and Error Categorization).
- Workflows: `ERPF-AI-WORK-006` (Ablation and Failure Analysis Workflow).
- Lessons: `ERPF-AI-LESS-002` (Shortcut Learning and Clever Hans Effect).
