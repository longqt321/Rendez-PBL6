# Practical Examples: Critical Technical Reasoning

## Example: Critical Review of a "Distributed Microservices Rewrite" Proposal

### Proposal Under Scrutiny
An engineering lead proposes: *"Split the existing Django monolith into 4 independent microservices (Auth, Places, Photos, Favorites) communicating via an asynchronous message bus (RabbitMQ) to enable independent team scaling and improve reliability."*

---

### Uncritical / Superficial Review (Anti-Pattern)
- *"Looks great! Microservices are industry standard and will make our teams much more decoupled. Approved."*
- *Result:* 6 months later, team struggles with distributed transactions, eventual consistency race conditions in favorites count, complex local dev environments, and 5x infrastructure cost.

---

### Critical Review Applying `critical-technical-reasoning`

#### 1. Extracted Implicit Assumptions
1. **Assumption:** Network boundaries will not introduce latency overhead that impacts user-facing place browsing.
   - *Counter-Proof:* Currently, fetching a Place with its Photos and Favorites status takes 1 local DB join ($< 8\text{ms}$). In microservices, this requires 3 cross-service HTTP/gRPC calls over the network, compounding tail latency to $> 85\text{ms}$.
2. **Assumption:** Monolithic code was the bottleneck for team delivery.
   - *Counter-Proof:* Commit logs show 95% of features touch both Places and Photos simultaneously. Splitting them forces multi-repo coordination and distributed two-phase commits.
3. **Assumption:** The operational cost of managing 4 Kubernetes services and RabbitMQ cluster is negligible.
   - *Counter-Proof:* The current team has 2 backend engineers and zero dedicated DevOps personnel.

#### 2. Pre-Mortem Scenario
- **Failure:** "A user unfavorites a place, but due to RabbitMQ partition lag, the favorites service does not process the event for 30 seconds. Meanwhile, the client queries the Place service, which still shows the place as favorited. The user clicks unfavorite repeatedly, causing message queue congestion and duplicate event storms."
- **Root Cause:** Introducing distributed state and eventual consistency where strict ACID transactions were previously guaranteed by PostgreSQL.

#### 3. Constructive Alternative & Decision
- **Verdict:** **REJECT Microservices Proposal.**
- **Alternative:** Implement **Clean Monolith with Deep Modular Seams** (`ERPF-SE-DOM-003`). Use strict Python package boundaries and internal domain events inside the monolith. Preserve single database ACID transactions.
- **Escape Hatch:** If a specific sub-domain (e.g., photo processing/resizing) demonstrates distinct compute resource requirements, isolate *only* that heavy background worker while keeping core domain logic in the monolith.
