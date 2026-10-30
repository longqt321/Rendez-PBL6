# Practical Examples: Research Problem Formulation & Hypothesis Evaluation

## Example: Transforming an Engineering Aspiration into a Falsifiable Scientific Hypothesis

### Vague Engineering Aspiration
> *"We want to build a better Vision Transformer for medical imaging because standard ViTs struggle with small lesions."*

- **Defects:**
  - Vague: "Better" is not an operational definition.
  - No mechanism: Why do standard ViTs struggle? What inductive bias is missing?
  - Unfalsifiable: Any cherry-picked metric on one dataset can claim to be "better".

---

### Rigorous Scientific Formulation Applying `research-problem-hypothesis`

#### 1. Primary Research Question (RQ)
Does introducing a local window-based inductive bias into early self-attention layers reduce spatial high-frequency representation decay in Vision Transformers when trained on low-data regimes ($N < 5,000$ images)?

#### 2. Operational Definitions Table
- **Independent Variable ($X$):** The self-attention receptive field configuration in Stage 1-2 blocks: Global Full Attention vs Fixed $7\times 7$ Windowed Attention vs Depthwise Convolutional Projection.
- **Dependent Variable ($Y$):**
  1. Primary: Mean Average Precision (mAP@0.5) on small lesion bounding boxes ($\text{area} < 32^2\text{ px}$).
  2. Diagnostic: Log-decay slope of the Fourier power spectrum in early layer attention maps.
- **Control Variables ($Z$):**
  - Identical total parameter count ($28.5\text{M} \pm 0.5\text{M}$).
  - Identical pre-training data and augmentations.
  - Identical AdamW optimizer, cosine schedule, and training iterations ($100\text{ epochs}$).
  - Evaluated over 5 distinct random seeds ($42, 43, 44, 45, 46$).

#### 3. Formal Scientific Hypothesis
> *"If early attention layers are constrained to local receptive windows, then the network will preserve spatial high-frequency features under low-data regimes ($N < 5,000$), resulting in statistically significant mAP gains on small lesion detection compared to isotropic ViTs, because unconstrained global self-attention suffers from uniform attention collapse when training samples are insufficient to learn localized positional priors."*

#### 4. Falsification Criteria (Decisive Disproof)
The hypothesis shall be considered **FALSIFIED** if:
1. The mean mAP improvement over the baseline is $< 1.0\%$ or if the 95% Bootstrap Confidence Intervals overlap with the baseline.
2. OR: The Fourier power spectrum shows no measurable retention of high-frequency components compared to standard isotropic ViT (proving that any observed score delta was caused by a confounding factor rather than the hypothesized mechanism).
