# Evaluation Rubric: Failure and Error Analysis

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Quantitative Stratification** | Only looks at aggregate accuracy; ignores which classes or slices fail. | Calculates confusion matrix and per-class precision/recall. | Systematically stratifies errors by confidence gap (high-confidence vs boundary) and slices across data attributes. |
| **2. Tripartite Root-Cause Classification** | Blames all failures on "the model needing more training" or "noisy data" without evidence. | Categorizes failures into high-level categories (e.g., bad images, hard examples). | Rigorously decomposes failures into Data vs Model vs Evaluation causes using a structured 50-sample audit. |
| **3. Qualitative & Interpretability Depth** | Shows 2 cherry-picked images with superficial captions ("model got confused"). | Inspects error samples with basic attention or saliency maps. | Pairs attribution heatmaps with feature space analysis to identify specific missing inductive biases. |
| **4. Hypothesis Generation Loop** | Stops at error reporting without proposing a principled next step. | Suggests generic improvements (e.g., "collect more data" or "tune learning rate"). | Transforms dominant systematic error patterns into formal, falsifiable scientific hypotheses for the next research sprint. |
