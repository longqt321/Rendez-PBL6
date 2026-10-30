# Practical Examples: Literature Review and Evidence Synthesis

## Example: Thematic Literature Clustering vs "Laundry List" Syndrome

### Research Topic
Mitigating Catastrophic Forgetting in Continual Learning for Visual Recognition.

---

### The "Laundry List" Anti-Pattern (Shallow / Disconnected)
> *"Kirkpatrick et al. (2017) [1] proposed EWC which uses the Fisher Information Matrix. Rebuffi et al. (2017) [2] created iCaRL which stores exemplar images. Li & Hoiem (2018) [3] introduced LwF using distillation. Aljundi et al. (2018) [4] developed MAS using gradients. Our method is better than all of them because it achieves higher accuracy on Split-CIFAR100."*

- **Methodological Flaws:**
  - Zero comparative synthesis; reads like a bibliography printout.
  - No analysis of underlying mechanism or trade-offs.
  - Unverifiable superiority claim based on a single dataset.

---

### Exemplary Thematic Synthesis Applying `literature-review-synthesis`

> *"Existing continual learning strategies predominantly partition into three methodological paradigms, each exhibiting distinct structural trade-offs:*
>
> *1. **Parameter Regularization (Prior-focused):** Approaches such as EWC (Kirkpatrick et al., 2017) and MAS (Aljundi et al., 2018) penalize updates to weights deemed critical for earlier tasks via quadratic surrogate penalties. While computationally lean ($O(1)$ memory relative to buffer size), they fundamentally suffer from capacity saturation: as task count $T > 10$, the intersection of unconstrained parameter spaces shrinks to the null set, triggering inevitable performance collapse.*
>
> *2. **Experience Replay (Data-focused):** Methods like iCaRL (Rebuffi et al., 2017) and DER++ (Buzzega et al., 2020) retain a coreset of exemplars. Although highly effective at preserving decision boundaries, their efficacy scales linearly with memory buffer size, violating strict privacy regulations (e.g., GDPR data retention limits) in edge clinical deployments.*
>
> *3. **Dynamic Architecture Expansion:** Techniques like Progressive Neural Networks allocate new sub-networks per task, perfectly preventing forgetting at the cost of unbounded parameter growth.*
>
> * **Verified Research Gap:** Prior art enforces an unaddressed trade-off between bounded memory footprint and representation plasticity under severe distribution shift. None of the surveyed methods address the setting where memory buffers are strictly prohibited ($M = 0$) while task boundaries are continuous and unannounced."*

- **Methodological Merits:**
  - Organized by mechanism (Regularization vs Replay vs Expansion).
  - Explicit trade-offs: Memory overhead vs privacy vs parameter growth.
  - Crystal-clear operational definition of the verified research gap.
