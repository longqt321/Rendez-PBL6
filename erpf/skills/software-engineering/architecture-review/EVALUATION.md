# Evaluation Rubric: Software Architecture Review

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Module Depth Evaluation** | Confuses lines of code with architectural quality; praises wide, shallow pass-through classes. | Evaluates whether classes have too many public methods or too little internal logic. | Accurately calculates interface-to-implementation leverage; identifies information leakage and hides state complexity. |
| **2. Coupling & Cohesion** | Fails to detect circular dependencies or cross-domain database queries. | Detects obvious circular imports or missing service abstractions. | Maps complete dependency direction, enforces strict DDD bounded contexts, and eliminates boundary leaks. |
| **3. Seam & Testability** | Demands heavy end-to-end integration tests for every trivial edge case. | Checks if interfaces can be mocked or faked in tests. | Designs clean architectural seams allowing in-memory fakes with high fidelity and zero external IO. |
| **4. Blast Radius Containment** | Recommends breaking changes across all call sites without backward-compatibility. | Notes how many files will be impacted by the interface change. | Quantifies blast radius and defines an Expand-and-Contract migration plan to ensure zero downtime. |
