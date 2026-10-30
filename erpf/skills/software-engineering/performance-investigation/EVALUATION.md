# Evaluation Rubric: Performance Investigation & Optimization

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Measure-First Discipline** | Speculates on bottlenecks without profiling; adds caching or rewrites code blindly. | Runs a profiler or query logger before making changes. | Establishes precise baseline metrics (P50, P95, P99, query counts) using repeatable benchmarks. |
| **2. Pareto Bottleneck Identification** | Spends hours micro-optimizing a function that accounts for 0.5% of total runtime. | Identifies the primary slow query or heavy function. | Uses flamegraphs or `EXPLAIN ANALYZE` to isolate the exact 80/20 bottleneck (e.g., N+1 query, sequential scan). |
| **3. Surgical Resolution** | Introduces complex distributed caching layers to hide poorly written database queries. | Adds a database index or basic query optimization. | Minimal surgical fix: eliminates N+1 via `select_related`/`prefetch_related`, fixes algorithm complexity without bloat. |
| **4. Quantitative Verification** | Claims "it feels faster" without providing comparative numbers. | Compares simple before/after request times. | Reports exact delta percentages across latency percentiles, query counts, and verifies 100% test suite pass rate. |
