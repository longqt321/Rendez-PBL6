# Evaluation Rubric: Ablation Study Design

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Component Granularity & Decomposition** | Combines 4 components into a single opaque bundle without individual testing. | Tests some components individually but leaves others arbitrarily grouped. | Decomposes every novel architectural block and loss term into clean, isolated variables. |
| **2. Protocol Rigor** | Arbitrary ad-hoc combinations without systematic structure. | Implements either Leave-One-Out or Add-One-In protocol. | Employs complementary Leave-One-Out and Add-One-In protocols to evaluate both necessity and sufficiency. |
| **3. Capacity & Compute Controls** | Proposed model has 2x parameters of baseline; claims structural superiority without control. | Acknowledges parameter differences in text discussion. | Explicitly includes parameter-matched and compute-matched capacity control rows in the table. |
| **4. Interaction & Synergy Analysis** | Treats all gains as strictly additive; ignores non-linear interference. | Notes when components perform poorly alone. | Mathematically calculates interaction terms ($\Delta_{\text{synergy}}$), identifying non-linear masking and catalytic dependencies. |
