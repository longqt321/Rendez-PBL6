# Practical Examples: Model Evaluation and Metric Selection

## Example: Diagnosing ROC-AUC vs PR-AUC on Rare Fraud / Defect Detection

### Context
A model is trained to detect rare counterfeit coffee reviews or fraudulent venue photos. The test set contains 100,000 samples:
- **Negative class (Legitimate):** 99,500 samples (99.5%).
- **Positive class (Fraudulent):** 500 samples (0.5%).

---

### Misleading Evaluation (The ROC-AUC Optical Illusion)
- An engineer evaluates Model A and Model B using standard ROC-AUC:
  - **Model A:** ROC-AUC = **0.985**.
  - **Model B:** ROC-AUC = **0.981**.
- *Conclusion drawn by inexperienced team:* "Model A is superior and ready for deployment!"

---

### Rigorous Evaluation Applying `model-evaluation-metric-selection`

#### 1. Why ROC-AUC Failed Here
- False Positive Rate is defined as $\text{FPR} = \frac{\text{FP}}{\text{FP} + \text{TN}}$.
- Because True Negatives ($\text{TN} = 99,500$) is astronomically large, a massive surge of 1,000 False Positives only produces an FPR of:
  $$\text{FPR} = \frac{1,000}{1,000 + 98,500} \approx 0.010 \quad (1\%)$$
- To ROC-AUC, a 1% FPR looks nearly flawless, hiding the disaster that for every 1 true fraud caught, the system falsely accuses 2 legitimate users!

#### 2. PR-AUC and Precision-Recall Breakdown
Switching to **Precision-Recall AUC (PR-AUC)** where denominator depends on False Positives directly:

| Metric | Model A | Model B | Interpretation |
| :--- | :---: | :---: | :--- |
| **ROC-AUC** | 0.985 [0.980, 0.990] | 0.981 [0.976, 0.986] | Seemingly identical. |
| **PR-AUC** | **0.342 [0.310, 0.375]** | **0.685 [0.650, 0.720]** | **Model B is 2x superior!** |
| **Precision @ 80% Recall** | 22.4% | **61.8%** | Model A floods moderators with 4x spam. |
| **Expected Calibration Error (ECE)** | 0.28 (Overconfident) | **0.06 (Well-calibrated)** | Model B probabilities can be trusted. |

- **Conclusion:** Model B is vastly superior in real-world operational economics despite having a slightly lower ROC-AUC. PR-AUC correctly exposed Model A's catastrophic false alarm rate.
