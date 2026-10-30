# Evaluation Rubric: Model Evaluation and Metric Selection

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Metric-to-Task Alignment** | Uses raw Accuracy on imbalanced data; ignores class priors and asymmetric error costs. | Selects balanced metrics (F1-score, Balanced Accuracy, Macro-average). | Mathematically aligns metric to decision economics (PR-AUC for rare events, nDCG for rankings, cost matrices). |
| **2. Statistical Uncertainty Quantification** | Reports single point estimates with zero variance or confidence intervals. | Reports standard deviation over 3-5 runs. | Computes 1,000-fold Bootstrap 95% Confidence Intervals; enforces non-overlapping CI thresholds for superiority claims. |
| **3. Slice-Based Granularity** | Only reports single aggregate number across the entire benchmark test set. | Breaks down metrics across 1 or 2 high-level categories. | Performs comprehensive slice analysis (frequency tiers, demographic groups, error slices); checks for Simpson's Paradox. |
| **4. Robustness & Clever Hans Audit** | Assumes high i.i.d. test score equals true intelligence; conducts no interpretability checks. | Checks model predictions manually on a few failure cases. | Systematically audits attribution maps (Grad-CAM/SHAP), counterfactual perturbations, and independent OOD benchmarks. |
