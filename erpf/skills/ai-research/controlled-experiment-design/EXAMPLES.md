# Practical Examples: Controlled Experiment Design

## Example: Designing a Fair Benchmark for a Novel Regularizer in Graph Neural Networks

### Scenario
A researcher proposes a new regularizer $\mathcal{L}_{\text{ortho}}$ for Graph Convolutional Networks (GCN) claiming a +4.2% node classification accuracy improvement on Cora and CiteSeer.

---

### Uncontrolled / Flawed Benchmark Design (Anti-Pattern)
- **Flaws:**
  - *Capacity Disparity:* Proposed model uses 4 layers with 128 hidden units; baseline GCN is evaluated with default 2 layers and 16 hidden units.
  - *Tuning Asymmetry:* Proposed method underwent 100 trials of Bayesian optimization for learning rate and weight decay; baseline was run with default PyTorch Geometric hyperparameters.
  - *Data Leakage:* Transductive node features were normalized globally using all graph nodes (including validation and test nodes).
  - *Single Seed:* Only 1 random split and seed reported.

---

### Controlled & Fair Benchmark Design Applying `controlled-experiment-design`

#### 1. Baseline Fair Comparison Contract
- **Architecture Parity:** All models (Baseline GCN, GAT, GraphSAGE, and GCN + $\mathcal{L}_{\text{ortho}}$) are standardized to 2 layers, 64 hidden units, and LayerNorm ($\approx 18.4\text{K}$ parameters across all models).
- **Compute Parity:** Each model is allocated 50 iterations of Optuna Random Search over identical hyperparameter ranges ($\text{lr} \in [10^{-4}, 10^{-2}]$, $\text{weight\_decay} \in [10^{-6}, 10^{-3}]$, $\text{dropout} \in [0.1, 0.7]$).
- **Epoch Budget:** 200 epochs with Early Stopping (patience = 20 on validation accuracy).

#### 2. Data Split Integrity Audit
- Random 60/20/20 node splits repeated over **10 standard benchmark seeds**.
- Preprocessing: Feature normalization matrices computed exclusively on the 60% training mask. Test masks strictly masked out during `fit()`.

#### 3. Immutable Pre-Registration YAML Excerpt (`experiment_config.yaml`)
```yaml
experiment_id: "GNN-ORTHO-2026-10-30"
git_commit: "9f82bc4e7d1a293"
dataset:
  name: "Cora"
  split_ratios: [0.60, 0.20, 0.20]
  seeds: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
harness:
  max_epochs: 200
  patience: 20
  deterministic: true
models:
  - name: "GCN-Baseline"
    hidden_dim: 64
    layers: 2
    use_ortho: false
  - name: "GCN-Ortho"
    hidden_dim: 64
    layers: 2
    use_ortho: true
metrics:
  primary: "macro_f1"
  statistical_test: "wilcoxon_signed_rank"
  alpha: 0.05
```

- **Result:** After controlling for capacity and tuning, the true delta is revealed as $+0.9\% \pm 0.3\%$ (statistically significant at $p = 0.018$, but deflates the original exaggerated $+4.2\%$ claim).
