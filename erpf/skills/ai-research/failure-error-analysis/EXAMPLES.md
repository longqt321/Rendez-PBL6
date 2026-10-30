# Practical Examples: Failure and Error Analysis

## Example: Error Analysis on a Place Tagging / Food Classification Vision Model

### Context
A computer vision model classifies venue interior photos into categories: `cafe`, `restaurant`, `bar`, and `bakery`. The overall validation accuracy is 84.5%, but the model performs poorly on `bakery` ($F_1 = 58.2\%$).

---

### Phase 1: Slice Stratification & High-Confidence Error Mining
Extracting top 50 highest-confidence failure instances:
- 32 out of 50 errors involved misclassifying `bakery` as `cafe` with predicted confidence $> 90\%$.

---

### Phase 2: Tripartite Error Audit (50-Sample Audit)
Inspecting the 32 misclassified samples using Grad-CAM heatmaps and raw metadata:

1. **Data-Related Errors (18% - 9 samples):**
   - Ground truth ambiguity: 6 images depicted artisanal venues that are simultaneously coffee shops and bakeries. The single-label ground truth forced an artificial conflict.
   - 3 images had corrupt EXIF orientation (upside down).
2. **Model-Related Systematic Defect (68% - 34 samples):**
   - **Grad-CAM Discovery:** The model's attention focused almost exclusively on coffee cups and espresso machines on the front counter, completely ignoring the glass display cases filled with bread and pastries in the background.
   - **Inductive Bias Defect:** Standard global average pooling caused prominent high-contrast foreground objects (espresso machines) to dominate the representation, starving smaller background contextual features.
3. **Evaluation-Related Errors (14% - 7 samples):**
   - Threshold $\tau$ was set to 0.5 without accounting for the fact that `bakery` images represented only 4% of total validation data.

---

### Phase 3: Synthesizing the Next-Sprint Research Hypothesis

From the 68% Model Defect cluster, the team avoids blind hyperparameter tuning and formulates a rigorous new research hypothesis:

> **New Research Hypothesis (`ERPF-AI-SKILL-002`):**
> *"If multi-scale feature pyramids (FPN) combined with foreground-background object masking are incorporated into the visual backbone, then the model will improve recall on background contextual objects (display cases), increasing Bakery F1-score by at least $+8.0\%$ without degrading Cafe classification accuracy, because spatial pyramid pooling prevents dominant high-contrast foreground tokens from overpowering spatially diffuse contextual tokens during feature aggregation."*
