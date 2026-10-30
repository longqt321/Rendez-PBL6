# Evaluation Rubric: Testing Strategy Design

| Dimension | Level 1: Novice / Fail | Level 2: Competent / Pass | Level 3: Exemplary / Proficient |
| :--- | :--- | :--- | :--- |
| **1. Pyramid Balance** | Creates an inverted pyramid with dozens of slow UI tests and near-zero unit tests. | Balances unit, integration, and E2E tests approximately in pyramid proportions. | Optimal pyramid: high-density sub-millisecond unit tests, lean integration tests, minimal critical E2E flows. |
| **2. Trust Boundary Focus** | Only tests happy paths with clean mock data; ignores untrusted boundary inputs. | Tests basic invalid input types and expected HTTP 400 error codes. | Rigorous boundary value analysis (min, max, off-by-one, malformed bytes, injection payloads, concurrency). |
| **3. Assertion Substance** | Assert-less tests (code executes but asserts nothing) or asserts superficial boolean flags. | Asserts response status codes and primary return fields. | Asserts complete post-state invariants (DB persistence, transaction rollback on failure, audit log creation). |
| **4. Flakiness Resistance** | Relies on `time.sleep()`, unseeded randomness, or shared mutable global state. | Avoids `time.sleep()` and uses basic test database resets. | Completely deterministic: frozen clocks, condition-based polling, fully isolated transactions, zero network leaks. |
