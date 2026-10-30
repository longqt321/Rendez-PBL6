# Evaluation Rubric: Research Problem Formulation & Hypothesis Evaluation

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Demarcation (Science vs Engineering)** | Formulates an implementation task (e.g., "Implement feature X in PyTorch") as a research question. | Distinguishes between engineering building blocks and scientific inquiry. | Frames inquiry around underlying causal mechanisms, representation properties, or learning dynamics. |
| **2. Operational Precision of Variables** | Uses vague concepts without measurable proxies (e.g., "model robustness", "quality"). | Defines independent and dependent variables with concrete numerical metrics. | Formulates operational variables, specifies diagnostic micro-metrics, and explicitly isolates confounding variables. |
| **3. Popperian Falsifiability** | Formulates unfalsifiable tautologies; no conceivable experiment could disprove the claim. | Specifies at least one condition under which the hypothesis would fail. | Establishes rigorous statistical falsification thresholds (e.g., non-overlapping CI margins, mechanistic ablation failures). |
| **4. Boundary Condition Rigor** | Assumes the hypothesis holds universally across all domains, tasks, and data regimes. | Mentions general limitations (e.g., "tested only on images"). | Explicitly models the anticipated failure regime (e.g., theoretical breakdown points under noise, sparsity, or scale). |
