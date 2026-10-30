# Evaluation Rubric: Codebase Exploration and Understanding

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Non-Destructive Rigor** | Modifies files, runs migrations, or clobbers user work while trying to "understand" the code. | Keeps all changes strictly read-only; checks `git status` before and after. | Perfectly respects workspace state; documents existing capabilities without creating ephemeral clutter. |
| **2. Architectural Depth** | Only reads the top-level README; misses backend routing and database models. | Identifies key entry points and top-level directory responsibilities. | Traces full vertical slices from HTTP ingress down to DB schemas, foreign keys, and indexes. |
| **3. Reusable Capability Discovery** | Fails to search existing codebase; immediately attempts to write redundant helper functions. | Searches for existing utilities and avoids duplicating common helpers. | Discovers existing selectors, idioms, and transaction conventions; adheres completely to project paradigms. |
| **4. Domain Invariant Grasp** | Ignores business constraints (e.g., status flags, unique constraints, trust boundaries). | Notes core models and field types. | Maps explicit domain invariants, lifecycle state machines, and soft-delete/audit requirements. |
