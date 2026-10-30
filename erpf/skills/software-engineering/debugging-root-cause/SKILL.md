---
name: debugging-root-cause
description: Investigate software bugs, isolate variables scientifically, reproduce failures with a Minimal Reproducible Example (MRE), locate the root cause, and verify fixes using regression tests before patching. Use when dealing with test failures, crashes, production incidents, or unexpected behavior.
---

# Skill: Debugging and Root Cause Analysis
# ERPF-SE-SKILL-003 (Version 1.0.0)

---

## 1. Purpose
This skill equips an agent or engineer to debug complex software failures using the scientific method: reproducing failures reliably, isolating variables through binary search, reading stack traces and logs objectively, identifying the fundamental root cause (not merely masking symptoms), and writing a **failing regression test** before applying the minimal surgical fix.

---

## 2. Activation Conditions
Invoke this skill whenever:
- A unit, integration, or E2E test fails unexpectedly.
- A production incident, crash report, or 500 error is reported.
- An application exhibits silent data corruption or race condition symptoms.
- Performance regressions or unexpected memory growth occurs.

---

## 3. Required Context
Before debugging:
1. Exact error message, stack trace, and relevant logs.
2. The environment details (Python/Node version, DB state, OS).
3. Recent git commit history (`git log -n 5`) to identify what changed.

---

## 4. Step-by-Step Instructions

### Phase 1: Reliable Reproduction & Minimal Example (MRE)
1. **Never guess or edit code blindly.**
2. **Construct the Minimal Reproducible Example (MRE):**
   - Strip away unrelated modules, UI components, and background workers.
   - Isolate the input payload and state that triggers the exact failure.
3. **Verify Determinism:** Run the reproduction script 3 times to confirm it fails consistently. If intermittent, note race condition or concurrency variables.

### Phase 2: Hypothesis Formulation & Binary Variable Isolation
1. **Analyze the Stack Trace from Bottom to Top:**
   - Differentiate the *crash site* (where the exception exploded) from the *origin site* (where the corrupt state was created).
2. **Formulate Competing Hypotheses:** List at least 2 plausible explanations for why the state was corrupted.
3. **Isolate Variables via Bisection:**
   - Use `git bisect` if the bug is a regression across commits.
   - Use binary logging or debugger breakpoints to divide the search space in half at each step.
   - Test one hypothesis at a time; never change multiple variables simultaneously.

### Phase 3: Root Cause Confirmation (5 Whys Analysis)
1. Ask *Why* until reaching a design flaw, missing invariant, or race condition.
2. Confirm the root cause by predicting what happens when the variable is inverted:
   - If changing variable $X$ makes the error disappear *and* re-introducing $X$ reproduces the exact error, the mechanism is proven.

### Phase 4: Test-First Surgical Resolution & Prevention
1. **Write the Failing Regression Test (Red):**
   - Add a test case capturing the exact MRE into the test suite.
   - Run the test suite: Verify that this new test **FAILS** for the exact right reason.
2. **Apply the Minimal Surgical Fix (Green):**
   - Fix the root cause at the upstream origin, not by masking downstream with null-checks.
   - Run the test suite: Verify that the regression test now **PASSES**.
3. **Verify Whole Suite Integrity:**
   - Run the entire test suite to ensure zero unintended side-effects.

---

## 5. Decision Criteria

| Debugging Scenario | Engineering Action |
| :--- | :--- |
| Stack trace points to null pointer in rendering template | **Trace Upstream:** Do not add `if obj != null` in template; find why database returned corrupted record. |
| Bug only occurs intermittently under multi-threaded load | **Audit Locks & Transactions:** Look for shared mutable state or missing `select_for_update()`. |
| Bug caused by external library upgrade | **Pin & File Issue:** Pin working version, create isolated upstream repro, and file bug report. |

---

## 6. Expected Outputs
1. **Minimal Reproducible Test Case (`test_regression_*.py`).**
2. **Root Cause Analysis Summary (5 Whys chain).**
3. **Minimal Surgical Diff Fixing the Root Cause.**
4. **Verification Log proving all tests pass.**

---

## 7. Verification Requirements
- [ ] A regression test was executed and shown to FAIL prior to applying the fix.
- [ ] The fix makes the regression test pass without breaking any existing test.
- [ ] No symptom-masking defensive checks (`try...except: pass` or unprincipled null checks) were introduced.

---

## 8. Failure Modes & Anti-Patterns
- **The "Shotgun Debugging" Trap:** Changing random lines of code hoping the error goes away.
- **Symptom Masking:** Catching generic exceptions or silencing logs without understanding the cause.
- **Fixing Without a Test:** Applying a patch without a regression test, guaranteeing the bug will return in 3 months.

---

## 9. Safety & Scope Boundaries
- Do not run `git reset --hard` or delete untracked files while reproducing.
- Do not alter database schemas without verifying backward compatibility.

---

## 10. References to Supporting Knowledge
- Foundation: `ERPF-CORE-PRIN-006` (Root Cause Analysis), `ERPF-CORE-PRIN-004` (Evidence-Based Reasoning).
- Domain Knowledge: `ERPF-SE-DOM-011` (Debugging and Root Cause Analysis).
- Workflow: `ERPF-SE-WORK-004` (Debugging and Root Cause Investigation Workflow).
- Lessons: `ERPF-SE-LESS-001` (Symptom Masking vs Root Cause Resolution).
