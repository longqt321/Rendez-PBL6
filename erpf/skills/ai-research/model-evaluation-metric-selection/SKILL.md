---
name: model-evaluation-metric-selection
description: Select scientifically sound evaluation metrics, audit benchmark validity, detect shortcut learning and Clever Hans effects, calculate Bootstrap confidence intervals, and interpret metric trade-offs beyond aggregate scores. Use when evaluating ML/DL models, designing test harnesses, or auditing benchmark performance.
---

# Skill: Model Evaluation and Metric Selection
# ERPF-AI-SKILL-004 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill guides an AI research agent or researcher to select, compute, and critically interpret evaluation metrics in machine learning. It prevents false confidence derived from **aggregate metric illusions** (e.g., Simpson's Paradox, high accuracy on imbalanced data), detects **Shortcut Learning and Clever Hans effects** (`ERPF-AI-LESS-002`), quantifies statistical uncertainty via **Bootstrap 95% Confidence Intervals**, and tests models under distribution shifts and Out-Of-Distribution (OOD) stress benchmarks.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Designing the evaluation harness or test suite for a new ML/DL model.
- Evaluating model performance on imbalanced, multi-modal, or long-tailed data.
- Auditing models that achieve suspiciously high accuracy on benchmark test sets.
- Interpreting subtle trade-offs between precision, recall, latency, and calibration error.

---

## 3. Required Information & Context
Before conducting evaluation:
1. Model predictions (raw probabilities / logits / embeddings) and ground truth labels.
2. Dataset characteristics: Class distribution, demographic slices, task loss weights.
3. Target deployment constraints (cost of False Positives vs False Negatives, latency budget).

---

## 4. Prerequisites
- `ERPF-AI-DOM-021` (Model Evaluation and Benchmarks).
- Familiarity with Bootstrap resampling and statistical confidence estimation.
- Lessons: `ERPF-AI-LESS-002` (Shortcut Learning and Clever Hans Effect).

---

## 5. Structured Execution Instructions

### Phase 1: Metric Alignment with Task Distribution & Business Cost
1. **Ban Trivial Aggregate Accuracy on Imbalanced Data:**
   - If positive class $< 10\%$, Accuracy is strictly forbidden as primary metric.
   - Use **PR-AUC (Precision-Recall Area Under Curve)** instead of ROC-AUC when positive instances are rare.
   - For ranking / recommendation: Use **nDCG@K** or **MRR**, not Precision@K alone.
   - For generation: Augment BLEU/ROUGE with semantic embeddings or human-aligned LLM-as-a-judge protocols with win-rate matrices.
2. **Assign Asymmetric Error Costs:**
   - Define cost matrix: $\text{Cost} = C_{\text{FP}} \cdot \text{FP} + C_{\text{FN}} \cdot \text{FN}$.
   - Sweep decision thresholds $\tau \in [0.0, 1.0]$ to identify the cost-optimal operating point, rather than assuming default $\tau = 0.5$.

### Phase 2: Statistical Uncertainty Quantification (Bootstrap 95% CI)
1. **Compute Non-Parametric Bootstrap Intervals:**
   - For test set size $N$, perform $B = 1,000$ resamples with replacement.
   - Recompute metric $\theta^{(b)}$ for each resampled fold.
   - Extract empirical 2.5th and 97.5th percentiles to form the 95% Confidence Interval:
     $$\text{CI}_{95\%} = [\theta_{0.025}, \theta_{0.975}]$$
2. **Enforce Non-Overlapping CI Rule:**
   - Do not claim statistical superiority if the 95% CI of the proposed method overlaps substantially ($> 50\%$) with the baseline's CI.

### Phase 3: Slice-Based & Demographic Granular Evaluation
1. **Disaggregate Aggregate Scores:**
   - Break down metrics across sub-slices: Sample length, frequency tiers (head, torso, tail classes), spatial resolution, metadata groups.
   - Detect **Simpson's Paradox**: Check if the model performs worse on every individual sub-slice despite having a higher aggregate score due to shifted sub-population proportions.
2. **Audit Calibration Error (ECE):**
   - Check if predicted confidence probabilities reflect true empirical accuracy via Expected Calibration Error (ECE) and reliability diagrams.

### Phase 4: Shortcut Learning & Clever Hans Audit (`ERPF-AI-LESS-002`)
1. **Attribution & Saliency Inspection:**
   - Run Grad-CAM, Integrated Gradients, or SHAP on representative positive samples.
   - Check if high confidence is driven by spurious background artifacts (watermarks, scan borders, template text).
2. **Counterfactual & OOD Stress Testing:**
   - Evaluate model on an Out-Of-Distribution (OOD) benchmark collected from a completely independent source/hospital/environment.
   - Apply adversarial perturbations (e.g., masking the salient region). If the model still predicts the class when the target object is erased, flag immediate shortcut learning.

---

## 6. Technical Decision Criteria

| Evaluation Observation | Metric Action |
| :--- | :--- |
| Model achieves 98% accuracy on 98:2 imbalanced dataset | **Reject:** Mandate PR-AUC, Balanced Accuracy, and Confusion Matrix breakdown. |
| Baseline and proposed model 95% CIs overlap by $> 30\%$ | **Claim Inconclusive:** Propose increasing test sample size or downscale claim to "parity with lower compute". |
| Attribution maps highlight image borders/watermarks | **Reject Model:** Retrain with background augmentation or masked inputs (`ERPF-AI-LESS-002`). |

---

## 7. Expected Outputs
A **Model Evaluation Audit Report** containing:
1. Primary and secondary metric table with Bootstrap 95% Confidence Intervals.
2. Precision-Recall / ROC curve at varied operating thresholds.
3. Slice-based performance breakdown across data strata.
4. Attribution map visualizations and Clever Hans robustness audit.

---

## 8. Verification Criteria
- [ ] Primary metric is mathematically justified based on class balance and error cost.
- [ ] All reported benchmark scores report 95% CI or mean $\pm$ standard error.
- [ ] At least one slice-based or OOD evaluation was performed.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **The High Accuracy Illusion:** Reporting 95% accuracy when predicting the majority class yields 95%.
- **Neglecting Metric Asymmetry:** Treating False Positives and False Negatives as having equal cost in medical or fraud tasks.
- **Ignoring Calibration:** Deploying an overconfident neural network whose predicted $99\%$ probability only corresponds to $70\%$ real-world accuracy.
- **OOD Blindness:** Claiming general intelligence based purely on identical i.i.d. test splits.

---

## 10. Limitations
- Bootstrap resampling assumes the test set is an unbiased sample of the true target population.
- Saliency maps (Grad-CAM) can sometimes suffer from visual confirmation bias; should be paired with quantitative perturbation scores.

---

## 11. Supporting Knowledge References
- Foundation: `ERPF-CORE-PRIN-002` (Falsifiability), `ERPF-CORE-PRIN-004` (Evidence-Based Reasoning).
- Domains: `ERPF-AI-DOM-021` (Model Evaluation and Benchmarking), `ERPF-AI-DOM-023` (Failure Analysis).
- Workflows: `ERPF-AI-WORK-005` (Model Evaluation Workflow).
- Lessons: `ERPF-AI-LESS-002` (Shortcut Learning and the Clever Hans Effect).
