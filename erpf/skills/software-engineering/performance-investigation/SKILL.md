---
name: performance-investigation
description: Investigate and optimize software performance, profile latency bottlenecks, identify N+1 queries and memory leaks, follow the Measure-First principle, and verify optimizations with Pareto analysis and load benchmarks. Use when diagnosing slow API endpoints, high CPU/memory utilization, or query regressions.
---

# Skill: Performance Investigation & Optimization
# ERPF-SE-SKILL-005 (Version 1.0.0)

---

## 1. Purpose
This skill equips an agent or engineer to diagnose and resolve software performance bottlenecks strictly adhering to the **Measure-First Principle**. It replaces premature speculation with rigorous profiling (flamegraphs, APM traces, `EXPLAIN ANALYZE`), focuses effort on the **Top 20% Pareto Bottlenecks**, and quantitatively verifies performance gains without compromising code clarity or correctness.

---

## 2. Activation Conditions
Invoke this skill whenever:
- An API endpoint exhibits high P95/P99 latency exceeding service-level objectives (e.g., P95 $> 200\text{ms}$).
- High CPU utilization, thread pool exhaustion, or memory bloat is reported.
- A database query causes high disk IO or table locks under concurrent load.
- Evaluating performance regressions after a major release.

---

## 3. Required Context
Before investigating:
1. Target latency budgets or throughput goals (e.g., P95 $< 100\text{ms}$ at 100 req/s).
2. Representative profiling data or access to profiling tools (`cProfile`, `py-spy`, `django-debug-toolbar`, PostgreSQL `EXPLAIN ANALYZE`, Chrome DevTools).
3. Representative test dataset reflecting realistic production scale.

---

## 4. Step-by-Step Instructions

### Phase 1: Baseline Measurement & Metric Definition
1. **Never optimize without a baseline measurement.**
2. Define the target metric:
   - *Throughput (RPS):* Requests processed per second.
   - *Latency:* P50, P95, and P99 response time in milliseconds.
   - *Resource Footprint:* Peak RAM (MB) and CPU cycles.
3. Record the current baseline under an isolated, repeatable load benchmark (e.g., using `wrk`, `locust`, or a benchmark script).

### Phase 2: Profiling & Bottleneck Localization (Pareto Analysis)
1. **Generate the Execution Profile:**
   - Run a profiler (`cProfile` or sampling profiler) to capture call stacks and time distribution.
   - Inspect flamegraphs: Locate the "widest plateau" where the CPU spends $> 60\%$ of total time.
2. **Audit the Database Layer (Common 80% Culprit):**
   - Check query count: Is there an **N+1 query loop**?
   - Run `EXPLAIN (ANALYZE, BUFFERS)` on slow queries:
     * Look for `Seq Scan` on tables $> 1,000$ rows (missing index).
     * Look for excessive disk spills during `Sort` or `Hash Join` operations.
3. **Audit Memory & Serialization:**
   - Look for unbounded queries (`Model.objects.all()` without pagination).
   - Check for heavy JSON serialization overhead on unneeded fields.

### Phase 3: Targeted Pareto Optimization
Apply the minimal surgical optimization to the single primary bottleneck:
1. **If Database N+1:** Add `select_related()` for foreign keys and `prefetch_related()` for reverse relations / many-to-many.
2. **If Missing Index:** Add a specialized index (B-Tree for equality/range, GiST for geospatial, GIN for full-text/JSONB).
3. **If Inefficient Serialization:** Use `only()` / `values()` or lightweight serializer schemas to avoid instantiating unneeded ORM model instances.
4. **If Algorithmic Inefficiency:** Replace $O(N^2)$ nested loops with $O(N)$ hash-map lookups.

### Phase 4: Comparative Verification & Regression Gate
1. Run the identical load benchmark against the optimized code.
2. Calculate the delta:
   $$\text{Improvement} = \frac{\text{Latency}_{\text{before}} - \text{Latency}_{\text{after}}}{\text{Latency}_{\text{before}}} \times 100\%$$
3. Verify that all existing functional tests pass (optimization did not break invariants).
4. Verify that code complexity did not skyrocket unnecessarily (`ERPF-CORE-PRIN-008`).

---

## 5. Decision Criteria

| Bottleneck Profile | Recommended Action |
| :--- | :--- |
| Bottleneck is database IO due to N+1 queries | **Fix ORM Queries First:** Do not add Redis cache to hide slow queries; fix `prefetch_related()`. |
| Query already uses index but takes 200ms on 10M rows | **Add Denormalization / Summary Table:** Precompute aggregates via database triggers or background tasks. |
| Latency is CPU-bound in Python serialization | **Stream / Paginate:** Restrict page size $\le 50$ items; stream responses or use C-accelerated parsers (`orjson`). |

---

## 6. Expected Outputs
A **Performance Investigation Report** containing:
1. Baseline vs Post-Optimization Latency Table (P50, P95, P99).
2. Profiler Trace / `EXPLAIN ANALYZE` before and after comparison.
3. Code Diff implementing the targeted optimization.
4. Verification that functional correctness is fully preserved.

---

## 7. Verification Requirements
- [ ] Profiling evidence (`EXPLAIN` plan, profiler trace) is provided before any code edit.
- [ ] Post-optimization benchmark shows quantitative improvement under identical conditions.
- [ ] 100% of functional tests in the modified subsystem remain green.

---

## 8. Failure Modes & Anti-Patterns
- **The Speculative Optimization Trap:** Refactoring algorithms or adding complex caching layers without measuring where the time is actually spent.
- **The Cache-as-a-Band-Aid Anti-Pattern:** Slapping a cache on an unindexed $O(N^2)$ query instead of adding an index or fixing the query.
- **Micro-Optimizations at the Expense of Clarity:** Replacing clean, readable Python code with obscure bitwise hacks for a 0.01ms gain.

---

## 9. Safety & Scope Boundaries
- Do not run aggressive load tests against production environments without maintenance window authorization.
- Do not create database indexes concurrently on production without `CONCURRENTLY` flag.

---

## 10. References to Supporting Knowledge
- Foundation: `ERPF-CORE-PRIN-004` (Evidence-Based Reasoning), `ERPF-CORE-PRIN-008` (Simplest Sufficient Solution).
- Domain Knowledge: `ERPF-SE-DOM-014` (Performance Engineering).
- Workflow: `ERPF-SE-WORK-006` (Performance Investigation Workflow).
- Case Studies: `ERPF-SE-CASE-001` (Intervention Level Selection).
