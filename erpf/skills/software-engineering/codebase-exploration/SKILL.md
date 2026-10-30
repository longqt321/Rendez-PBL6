---
name: codebase-exploration
description: Systematically map and explore an unfamiliar or complex codebase in strictly read-only mode, discovering entry points, data flows, architectural seams, and existing capabilities before any code changes are planned.
---

# Skill: Codebase Exploration and Understanding
# ERPF-SE-SKILL-001 (Version 1.0.0)

---

## 1. Purpose
This skill guides an agent or engineer to thoroughly inspect, map, and understand an unfamiliar repository in **strictly read-only mode**, tracing data flows, identifying entry points, domain models, and existing internal mechanisms before attempting any code modification, refactoring, or feature development.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Starting work on an unfamiliar repository, submodule, or external dependency.
- Planning a non-trivial architectural change, bug fix, or feature addition.
- Checking whether a capability or utility already exists before writing new code.
- Conducting a cold-start onboarding audit of project state.

---

## 3. Required Context
The agent requires access to the workspace root and basic workspace exploration tools (`read_file`, `run_command` with search/grep, `git status`).

---

## 4. Step-by-Step Instructions

### Phase 1: Top-Level Repository Orientation & Boundary Check
1. **Check Git Status & Workspace Hygiene:** Run `git status` to verify current branch, untracked files, and unstaged modifications. Never clobber existing user work.
2. **Inspect Manifests & Configuration:**
   - Package managers: `pyproject.toml`, `requirements.txt`, `package.json`, `Cargo.toml`.
   - Build & run configs: `Makefile`, `docker-compose.yml`, environment templates (`.env.example`).
   - Project documentation: `README.md`, `docs/`, `AGENTS.md`, `GLOSSARY.md`.
3. **Map the Top-Level Layout:** Identify frontend, backend, data, migration, and test roots.

### Phase 2: Architectural Entry Points & Routing Discovery
1. **Locate Server Entry Points:**
   - Web router / URLs: `urls.py`, `routes.ts`, `main.go`.
   - App initialization: `settings.py`, `wsgi.py`, `main.tsx`.
2. **Catalog Domain Boundaries:**
   - Identify domain apps/modules (e.g., `apps/places`, `apps/photos`, `apps/favorites`).
   - Note data ownership: Which module owns which models and database tables?

### Phase 3: Data Flow & Seam Tracing
Trace a representative vertical slice from entry point down to storage:
1. **Request Ingestion (Boundary):** URL route $\rightarrow$ View / Controller $\rightarrow$ Input Serializer / Validator.
2. **Business Execution (Core):** Service function / Domain Model $\rightarrow$ State transitions and business invariants.
3. **Data Access (Persistence):** Query selectors / ORM queries / Raw SQL $\rightarrow$ Database tables.
4. **Response Serialization:** Output DTO / Serializer $\rightarrow$ HTTP JSON response.

### Phase 4: Existing Capability Audit (Search Before Implement)
Before writing any new utility:
1. Search the existing codebase for similar functions (e.g., geocoding helpers, image processors, auth validators).
2. Look for established patterns (e.g., does the repo use class-based views or functional views? Does it use `selectors.py` or manager methods?).
3. Adhere to repo conventions rather than importing external paradigms.

---

## 5. Decision Criteria

| Discovery Observation | Architectural Heuristic |
| :--- | :--- |
| Existing selectors/services handle 80% of desired query | **Reuse & Extend:** Call existing function with optional filter rather than writing new SQL query. |
| Two modules cross-import each other circularity | **Flag Seam Leak:** Identify shared entity that belongs in a lower foundational module. |
| Incomplete documentation contradicts active code | **Code Wins:** The running source code and passing tests are the definitive source of truth. |

---

## 6. Expected Outputs
A **Codebase Architecture Map** or mental model containing:
1. Directory topology and domain boundary breakdown.
2. Entry points and routing table.
3. Critical data flows and database invariants.
4. Catalog of existing reusable services and utilities.

---

## 7. Verification Requirements
- [ ] No file in the repository was created, modified, or deleted during exploration.
- [ ] Core data model relationships are verified directly against schema/migration files.
- [ ] At least one vertical request flow has been traced end-to-end.

---

## 8. Failure Modes & Anti-Patterns
- **The "Code First, Read Never" Trap:** Starting to edit files based on assumptions before reading existing selectors or views.
- **The Re-Inventing Wheel Anti-Pattern:** Writing a new date parser or authentication check when the repo already has one in `utils/`.
- **Breaking Established Idioms:** Writing object-oriented class hierarchies in a codebase that consistently uses functional pipelines.

---

## 9. Safety & Scope Boundaries
- **STRICTLY READ-ONLY:** Never run destructive commands (`git reset --hard`, `git clean -fd`, database migrations, file deletions).
- Use non-destructive commands (`git status`, `grep`, `find`, read operations).

---

## 10. References to Supporting Knowledge
- Foundation: `ERPF-CORE-PRIN-001` (Problem-First Thinking), `ERPF-CORE-PRIN-003` (Systems Thinking).
- Domain Knowledge: `ERPF-SE-DOM-002` (Codebase Understanding).
- Workflow: `ERPF-SE-WORK-002` (Codebase Exploration Workflow).
