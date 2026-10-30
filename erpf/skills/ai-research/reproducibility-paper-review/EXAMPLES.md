# Practical Examples: Reproducibility Assessment and Scientific Paper Review

## Example: Peer Review Report for a Manuscript Claiming "Revolutionary Zero-Shot Performance"

### Paper Title
*"Unprecedented Generalization: Solving Cross-Domain Image Retrieval with Dual Graph Attention"*

---

### Uncritical / Toxic Review (Anti-Pattern)
> *"This paper is terrible and completely wrong. The authors don't know the literature and their method is just a hack. Reject."*
- **Defects:** Insulting, provides zero technical justification, gives authors no path to improve.

---

### Professional 4-Axis Peer Review Applying `reproducibility-paper-review`

#### 1. Paper Summary
The paper proposes a Dual Graph Attention Network (DGAN) for cross-domain image retrieval between sketches and natural images. The authors introduce an edge-weighting contrastive loss and evaluate on Sketchy and TU-Berlin benchmarks, reporting a +5.2% mAP gain over standard ResNet baselines.

#### 2. Strengths
- **S1 (Clarity):** The paper is clearly written; mathematical notations for the graph affinity matrix are consistent throughout Section 3.
- **S2 (Empirical Evaluation):** The authors evaluate on two established public benchmarks and provide qualitative t-SNE visualizations of the learned embedding space.

#### 3. Weaknesses (Categorized by Criticality)

##### Fatal Flaws (Blockers)
- **W1 (Severe Data Leakage in Code Repository):**
  Upon auditing the companion anonymous GitHub repository (`train_graph.py`, line 84), the node degree normalization matrix $D^{-1/2} A D^{-1/2}$ is computed over the entire unified graph containing both training and test sketch-image pairs. This creates transductive test-set feature leakage into the training phase (`ERPF-AI-LESS-001`). When the evaluation script is modified to enforce strict inductive evaluation (test nodes masked during training graph construction), the claimed $+5.2\%$ gain completely disappears, performing on par with baseline GCN ($58.1\%$ vs $58.0\%$).
- **W2 (Strawman Baselines):**
  The baseline comparisons in Table 1 only include methods from 2017-2019 (e.g., standard DSH and Siamese-ResNet). The authors fail to compare against dominant contemporary baselines (e.g., CLIP-based zero-shot retrieval or ViT-based sketch transformers from 2023-2025), which achieve $> 75\%$ mAP on Sketchy.

##### Minor Concerns (Can be addressed in Rebuttal)
- **W3 (Overclaiming in Abstract):** The abstract claims the method *"solves cross-domain retrieval across all visual modalities"*, but experiments are strictly restricted to sketch-to-photo matching.
- **W4 (Missing Multi-Seed Variance):** Table 1 reports single point estimates without standard deviations over random seeds.

#### 4. Questions for Authors (Rebuttal Prompts)
1. *Could the authors provide results under a strictly inductive test setup where test queries and gallery nodes are completely isolated from the training graph?*
2. *Could the authors benchmark against at least one modern foundation model baseline (e.g., zero-shot CLIP)?*

#### 5. Recommendation & Confidence
- **Score:** **3: Reject (Empirically Flawed / Data Leakage).**
- **Confidence:** **5: Very High (Inspected source code and verified leakage in test scripts).**
