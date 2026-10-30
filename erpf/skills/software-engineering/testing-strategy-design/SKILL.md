---
name: testing-strategy-design
description: Design comprehensive testing strategies, construct test pyramids, enforce trust boundary verification, eliminate test flakiness, and design high-leverage unit, integration, and E2E test suites. Use when establishing testing standards for new features or reviewing test coverage.
---

# Skill: Testing Strategy Design
# ERPF-SE-SKILL-004 (Version 1.0.0)

---

## 1. Purpose
This skill equips an agent or test engineer to design robust, deterministic, and high-leverage testing strategies. It establishes the **Testing Pyramid**, focuses verification effort on **Trust Boundaries and Business Invariants**, prevents false confidence from hollow coverage metrics, and eliminates **Test Flakiness** to keep CI pipelines fast and reliable.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Designing test plans for a new subsystem, micro-service, or module.
- Refactoring legacy code with zero or inadequate test coverage.
- Addressing slow, flaky, or non-deterministic test suites in CI.
- Auditing test quality during code review to prevent "assert-less" coverage games.

---

## 3. Required Context
Before designing the testing strategy:
1. Module architecture, public interfaces, and domain invariants (`architecture-design/`).
2. Current test harness and configuration (`pytest.ini`, `conftest.py`, `playwright.config.ts`).
3. External dependency boundaries: databases, third-party APIs, storage engines.

---

## 4. Step-by-Step Instructions

### Phase 1: Test Pyramid Allocation
Distribute test types based on feedback speed, cost, and determinism:
1. **Unit Tests (70-80% of suite):**
   - *Target:* Pure domain logic, state machines, math routines, invariant validators.
   - *Constraint:* In-memory execution, sub-millisecond per test, zero network IO, zero disk writes.
2. **Integration Tests (15-20% of suite):**
   - *Target:* Database queries, ORM serializers, API endpoint contracts, cache adapters.
   - *Constraint:* Use isolated transactional rollbacks (`TestCase` / `db` fixture).
3. **End-to-End Tests (5-10% of suite):**
   - *Target:* Top 3-5 critical user journeys (e.g., User Login $\rightarrow$ Search Place $\rightarrow$ Add Photo $\rightarrow$ Favorite).
   - *Constraint:* Strictly limited in count; run headlessly; mocked external payment/email gateways.

### Phase 2: Trust Boundary & Invariant Focus
1. **Identify the Trust Boundaries:** Any point where external, untrusted data crosses into the system (HTTP request body, CSV upload, Webhook payload, query string).
2. **Design Equivalence Partitions & Boundary Value Tests:**
   - Test minimum, maximum, and exact off-by-one edge values (e.g., string length 0, 1, 255, 256).
   - Test unicode edge cases, SQL injection payloads, null/empty collections.
3. **Assert State Invariants, Not Implementation Details:**
   - Assert *what* the system produced (database state, return value, HTTP status code).
   - Do NOT assert internal private variable states or spy on private method invocations.

### Phase 3: Flakiness Elimination Protocol
1. **Purge Non-Deterministic Inputs:**
   - Replace `datetime.now()` with deterministic frozen time (`freezegun` / time fixtures).
   - Seed random number generators explicitly.
2. **Eliminate Arbitrary Sleep Calls:**
   - Ban `time.sleep(2)`.
   - Use explicit polling conditions: `wait_for_condition(lambda: check(), timeout=5)`.
3. **Isolate Database State:**
   - Ensure every test runs in an atomic transaction rolled back at test teardown.

### Phase 4: Mutation & Coverage Integrity Check
1. Avoid chasing 100% line coverage for the sake of metrics.
2. Verify test effectiveness by mentally or automatically mutating the code:
   - If changing `>` to `>=` or returning `None` does not break any test, the test suite is hollow.

---

## 5. Decision Criteria

| Testing Dilemma | Engineering Directive |
| :--- | :--- |
| External 3rd party API (e.g., Stripe, Cloudflare Images) | **Mock at the Seam:** Fake the client adapter; never hit live external APIs in automated tests. |
| Complex database query with window functions or PostGIS | **Test with Real DB:** Do not mock the ORM query; test against a real PostgreSQL test instance. |
| Test suite takes $> 10$ minutes in local dev | **Prune E2E & Parallelize:** Shift redundant E2E tests down to integration/unit layer; run `pytest -n auto`. |

---

## 6. Expected Outputs
A **Testing Strategy Plan** containing:
1. Pyramid distribution breakdown (Unit vs Integration vs E2E counts).
2. Trust boundary test matrix (boundary values, invalid payloads, error codes).
3. Test fixture and mock seam architecture.
4. Flakiness prevention checklist.

---

## 7. Verification Requirements
- [ ] Every critical domain invariant has at least one positive and one negative test case.
- [ ] No `time.sleep()` exists in any test file.
- [ ] All unit tests pass in $< 5\text{ seconds}$ total.

---

## 8. Failure Modes & Anti-Patterns
- **The Ice Cream Cone Anti-Pattern:** 10 unit tests, 50 integration tests, and 200 brittle UI E2E tests.
- **The Mocking-the-World Trap:** Mocking so many internal objects that the test tests nothing except the mock configuration.
- **Assert-Less Tests:** Tests that execute code to inflate coverage metrics without verifying the resulting state.

---

## 9. Safety & Scope Boundaries
- Tests must run in isolated test databases (`test_rendez_db`), never against staging or production data.
- Tests must not write files outside designated temporary test directories (`tmpdir`).

---

## 10. References to Supporting Knowledge
- Foundation: `ERPF-CORE-PRIN-002` (Falsifiability), `ERPF-CORE-PRIN-005` (Evidence-Based Reasoning).
- Domain Knowledge: `ERPF-SE-DOM-012` (Software Testing).
- Workflow: `ERPF-SE-WORK-005` (Testing and Quality Assurance Workflow).
- Skills: `tdd` (`.agents/skills/tdd/SKILL.md`).
