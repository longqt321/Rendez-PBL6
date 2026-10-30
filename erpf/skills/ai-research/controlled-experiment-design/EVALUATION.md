# Evaluation Rubric: Controlled Experiment Design

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Baseline Selection & Fairness** | Uses outdated, untuned strawman baselines; compares models with unequal parameter counts. | Includes standard baselines and tunes key hyperparameters approximately equally. | Rigorous capacity parity ($\pm 5\%$ parameters), matched search spaces, and identical training FLOPs budget. |
| **2. Data Hygiene & Leakage Prevention** | Fits scalers/tokenizers on full dataset; allows samples from same group across train/test splits. | Splits train/val/test cleanly before modeling; avoids obvious target leaks. | Strict Train-Test Firewall; group-level partitioning audit; temporal ordering preserved for sequential data. |
| **3. Randomness & Statistical Power** | Reports a single run with no seed, or cherry-picks a single lucky outlier seed. | Runs at least 3 random seeds and reports mean and standard deviation. | Runs $\ge 5$ seeds, records PyTorch/CUDA deterministic flags, and specifies non-parametric significance tests. |
| **4. Pre-Registration & Reproducibility** | Ad-hoc training runs without tracking configs; hyperparameters scattered across code. | Saves basic configuration in a text file or README. | Fully immutable YAML configuration tracking git commit, dataset checksum, full grid, and atomic artifacts. |
