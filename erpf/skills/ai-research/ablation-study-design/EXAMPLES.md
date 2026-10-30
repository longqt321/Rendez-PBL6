# Practical Examples: Ablation Study Design

## Example: Ablation Study for a Multimodal Place Recommender

### Proposed Model Components
The paper proposes a multimodal model combining:
- $C_1$: Pre-trained ResNet image embeddings of place photos.
- $C_2$: Spatial GiST distance coordinates.
- $C_3$: Text reviews encoded via MiniLM.
- $C_4$: Novel Cross-Attention Fusion Gate (the claimed core contribution).

---

### Publication-Grade Ablation Table (IEEE/ACM Style)

| Variant | Image ($C_1$) | Spatial ($C_2$) | Text ($C_3$) | Fusion Gate ($C_4$) | Params (M) | Recall@10 ($\% \pm \text{std}$) | $\Delta$ vs Baseline |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 (Base Text) | $-$ | $-$ | $\checkmark$ | $-$ | 22.5M | $61.2 \pm 0.4$ | (Baseline) |
| 2 (Add Image) | $\checkmark$ | $-$ | $\checkmark$ | $-$ | 34.2M | $64.8 \pm 0.5$ | $+3.6\%$ |
| 3 (Add Spatial)| $-$ | $\checkmark$ | $\checkmark$ | $-$ | 22.6M | $66.1 \pm 0.3$ | $+4.9\%$ |
| 4 (Concat All)| $\checkmark$ | $\checkmark$ | $\checkmark$ | $-$ (Concat) | 34.3M | $68.4 \pm 0.6$ | $+7.2\%$ |
| **5 (Full Ours)**| $\checkmark$ | $\checkmark$ | $\checkmark$ | **$\checkmark$ (Gate)** | **36.1M** | **$\mathbf{72.8 \pm 0.4}$** | **$\mathbf{+11.6\%}$** |
| 6 (Capacity Ctrl)| $\checkmark$ | $\checkmark$ | $\checkmark$ | $-$ (Wide Concat) | 36.2M | $68.9 \pm 0.5$ | $+7.7\%$ |
| 7 (w/o Spatial)| $\checkmark$ | $-$ | $\checkmark$ | $\checkmark$ | 36.0M | $65.4 \pm 0.5$ | $+4.2\%$ |

---

### Rigorous Causal Attribution Insights
1. **Verifying Component $C_4$ (Novel Fusion Gate):**
   - Comparing Variant 5 (Full Model: 72.8%) against Variant 4 (Standard Concat: 68.4%) reveals that the Cross-Attention Gate provides a $+4.4\%$ absolute gain.
2. **Ruling Out Raw Parameter Capacity (Variant 6):**
   - Variant 6 widened the concatenation projection layer to match the exact 36.2M parameter count of the Gate.
   - It only achieved 68.9% ($+0.5\%$ over Variant 4).
   - **Conclusion:** The $+4.4\%$ gain of the Fusion Gate is driven by its *structural inductive bias*, NOT by parameter scaling.
3. **Leave-One-Out Sensitivity:**
   - Removing Spatial ($C_2$, Variant 7) causes the largest drop ($-7.4\%$), demonstrating that geography is the single most critical modality.
