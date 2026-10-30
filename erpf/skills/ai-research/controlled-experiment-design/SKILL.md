---
name: controlled-experiment-design
description: Design controlled AI/ML experiments, enforce fair baseline comparisons, isolate confounding variables, manage compute budgets, prevent data leakage, and register experiment plans before execution. Use when planning empirical runs, benchmarks, or model training sweeps.
---

# Skill: Controlled Experiment Design
# ERPF-AI-SKILL-003 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill guides an AI research agent or researcher to formulate **rigorous, controlled empirical experiments** in machine learning. It guarantees **fair baseline comparisons**, enforces the **Train-Test Firewall** to eliminate data leakage, controls for confounding factors (compute budget, parameter count, tuning intensity), pre-registers hypotheses using immutable configuration specifications, and accounts for random seed variance.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Designing a benchmark or empirical validation for a new AI model or algorithm.
- Configuring a hyperparameter sweep or ablation experiment matrix.
- Pre-registering an experiment plan (`ERPF-TOOL-TMP-002`) prior to allocating GPU clusters.
- Reviewing an empirical study suspected of unfair baseline comparisons or data leakage.

---

## 3. Required Information & Context
Before designing the experiment:
1. Formulated hypothesis and operational variables (`ERPF-AI-SKILL-002`).
2. Target benchmark datasets, splits, and evaluation harnesses.
3. Computational constraints: Available GPU hours, memory limits (VRAM), maximum training steps.

---

## 4. Prerequisites
- `ERPF-AI-DOM-011` (Dataset Analysis and Leakage Prevention).
- `ERPF-AI-DOM-012` (Experimental Design and Baselines).
- `ERPF-AI-DOM-014` (Experiment Management and Immutable Configurations).
- Template: `ERPF-TOOL-TMP-002` (Experiment Plan Template).

---

## 5. Structured Execution Instructions

### Phase 1: Baseline Selection & The Fair Comparison Contract
1. **Select True Competitive Baselines:**
   - Include the current acknowledged State-of-the-Art (SOTA) on the benchmark.
   - Include standard canonical baselines (e.g., standard ResNet/ViT, BERT/Llama, MLP/XGBoost).
   - Never use "strawman" baselines (outdated models from 5 years ago, or untuned defaults).
2. **Enforce the Fairness Invariant:**
   - *Compute Parity:* Baselines and proposed methods must be evaluated under matched compute budgets (FLOPs, epochs, or hyperparameter search trials).
   - *Capacity Parity:* Match total parameter count within $\pm 5\%$.
   - *Tuning Parity:* If the proposed method is tuned for 50 sweep trials, baselines must also receive 50 tuning trials under identical search spaces.

### Phase 2: Data Split Integrity & Leakage Prevention Audit
1. **Audit Partitioning:**
   - Check that Train, Validation, and Test splits are strictly isolated.
   - Ensure Group Isolation: Samples from the same patient, session, or document must not appear across multiple splits.
2. **Apply the Pre-Split Normalization Rule (`ERPF-AI-LESS-001`):**
   - All feature transformations (scaling, tokenization, vocabulary building, imputation) must fit *exclusively* on the Train split.
   - For time-series data, enforce strict temporal ordering (no random future-to-past shuffling).

### Phase 3: Multi-Seed Protocol & Statistical Power
1. **Ban Single-Run Claims:**
   - Every experimental condition must run over a minimum of **3 to 5 random seeds** (e.g., seeds `42, 43, 44, 45, 46`).
2. **Track Randomness Sources:**
   - Record PyTorch, CUDA, NumPy, and Python random seeds.
   - Enforce deterministic algorithms where available (`torch.use_deterministic_algorithms(True)`).
3. **Plan for Statistical Significance:**
   - Pre-define the statistical test (e.g., Paired t-test, Wilcoxon signed-rank test, or Bootstrap 95% CI).

### Phase 4: Pre-Registration & Immutable Configuration Artifact
1. Formalize the experiment plan into a pre-registered document (`ERPF-TOOL-TMP-002`).
2. Export all execution parameters into an immutable YAML/JSON configuration file:
   - Git commit hash of the codebase.
   - Exact dataset version and checksum.
   - Complete hyperparameter grid and seed list.
3. Pre-commit the configuration file prior to launching GPU training runs.

---

## 6. Technical Decision Criteria

| Scenario Observed | Design Directive |
| :--- | :--- |
| Proposed method has 2x parameters compared to baseline | **Isolate Capacity:** Create a scaled-up baseline with matched parameters, or downscale proposed model. |
| Test set has severe class imbalance ($< 2\%$ positive class) | **Reject Accuracy:** Mandate PR-AUC, Macro-F1, or Cost-sensitive loss benchmarks. |
| GPU budget permits only 3 runs total | **Prune Hyperparameter Grid:** Fix secondary hyperparameters based on literature; prioritize 3 seeds on core configurations over single-run sweeps. |

---

## 7. Expected Outputs
1. **Pre-Registered Experiment Plan Document** (`experiment-plan.md` using `ERPF-TOOL-TMP-002`).
2. **Immutable YAML Configuration File** (`config.yaml`).
3. **Fairness & Confounding Variable Isolation Matrix.**
4. **Data Split Audit Verification Log.**

---

## 8. Verification Criteria
- [ ] At least 3 independent random seeds are specified for all comparative runs.
- [ ] Data preprocessing parameters ($\mu, \sigma$) are proven to fit solely on the training split.
- [ ] Baseline models are tuned with comparable search budget and capacity.
- [ ] Primary evaluation metric matches task distribution characteristics.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **The Strawman Baseline Trap:** Comparing against poorly tuned default baselines to artificially claim +15% gains.
- **Silent Data Leakage:** Fitting scalers on the full dataset before `train_test_split()`.
- **Lucky Seed Cherry-Picking:** Running 20 seeds and reporting only the highest outlier run without variance.
- **Compute Asymmetry:** Comparing a model trained for 500 epochs against a baseline trained for 50 epochs.

---

## 10. Limitations
- Does not guarantee training convergence if the underlying optimization algorithm encounters gradient explosion/vanishing (handled in `model-development-and-training-stability`).
- Determinism on GPUs may incur a 10-15% throughput penalty when strict deterministic kernels are enforced.

---

## 11. Supporting Knowledge References
- Foundations: `ERPF-CORE-PRIN-004` (Evidence-Based Reasoning), `ERPF-CORE-PRIN-001` (Intellectual Honesty).
- Domains: `ERPF-AI-DOM-011` (Dataset Analysis), `ERPF-AI-DOM-012` (Experimental Design), `ERPF-AI-DOM-014` (Experiment Management).
- Workflows: `ERPF-AI-WORK-004` (Experiment Planning and Execution Workflow).
- Templates: `ERPF-TOOL-TMP-002` (Experiment Plan Template).
- Lessons: `ERPF-AI-LESS-001` (Data Leakage via Pre-Split Normalization).
