# Evaluation Rubric: Debugging and Root Cause Analysis

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Scientific Reproduction** | Changes code randomly without a reproducible test case; relies on guesswork. | Creates a manual step-by-step reproduction script or curl command. | Constructs a minimal, deterministic automated test case (MRE) that reliably triggers the failure. |
| **2. Variable Isolation Rigor** | Modifies multiple files, parameters, and configs simultaneously. | Changes one variable at a time using print/log statements to isolate the issue. | Uses bisection search (`git bisect`, binary logging) to systematically eliminate 50% of hypotheses per iteration. |
| **3. Root Cause vs Symptom** | Adds defensive null checks or swallows exceptions at the crash site (`try/except: pass`). | Traces one step upstream to prevent the null value from being passed. | Identifies systemic invariant violation (5 Whys), fixing origin in domain lifecycle and DB transaction. |
| **4. Test-First Verification** | Applies patch first, then writes tests later (or writes no tests at all). | Writes a test after verifying the patch manually. | Strictly follows Red-Green cycle: writes failing regression test first, applies minimal fix, verifies green. |
