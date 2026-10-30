---
name: literature-review-synthesis
description: Conduct systematic literature reviews, screen and synthesize academic papers, construct structured 10-column literature matrices, and identify verifiable research gaps without fabricating citations or claims. Use when starting a new AI/ML research direction, surveying prior art, or writing Related Work sections.
---

# Skill: Literature Review and Evidence Synthesis
# ERPF-AI-SKILL-001 (Version 1.0.0)

---

## 1. Purpose and Scope
This skill guides an AI research agent or human practitioner to systematically discover, screen, extract, and synthesize academic literature in machine learning and artificial intelligence. It enforces **strict anti-hallucination protocols**, builds a structured **10-Column Literature Matrix** (`ERPF-TOOL-TMP-001`), identifies authentic research gaps (differentiating scientific gaps from mere engineering opportunities), and clusters prior art thematically rather than as an author-by-author laundry list.

---

## 2. Activation Conditions
Invoke this skill whenever:
- Embarking on a new research direction or formulating a scientific project proposal.
- Drafting or reviewing the Related Work section of a research paper.
- Validating whether a proposed algorithmic novelty has already been published.
- Auditing the bibliographic integrity and claim traceability of a manuscript.

---

## 3. Required Information & Context
Before initiating the review:
1. Research topic, keywords, or initial query string (e.g., *"Contrastive learning for multimodal tabular data"*).
2. Defined inclusion and exclusion criteria (e.g., peer-reviewed conferences 2021-2026, English language, reproducible benchmarks).
3. Access to academic search tools / APIs (Semantic Scholar, ArXiv, Google Scholar, dblp) or local paper repository.

---

## 4. Prerequisites
- Deep familiarity with `ERPF-AI-DOM-002` (Literature Review and Synthesis).
- Ubiquitous language definitions in `GLOSSARY.md`.
- Basic understanding of ML terminology (loss functions, optimization, benchmark datasets).

---

## 5. Structured Execution Instructions

### Phase 1: Multi-Tiered Search Strategy & Query Expansion
1. **Define Core Keyword Dimensions:**
   - Problem / Domain terms (e.g., `long-tail classification`, `continual learning`).
   - Methodological terms (e.g., `class-balanced loss`, `memory replay`, `prompt tuning`).
   - Target modality / context (e.g., `vision-language`, `tabular data`).
2. **Execute Multi-Hop Traversal:**
   - *Seed Search:* Retrieve top 5 seminal papers with $> 200$ citations.
   - *Forward Snowballing:* Search recent papers (past 18 months) citing the seeds.
   - *Backward Snowballing:* Inspect the foundational bibliography of the top 3 papers.
3. **Strict Source Verification & Anti-Hallucination:**
   - **MANDATORY RULE:** Never invent, extrapolate, or hallucinate a paper title, author list, publication venue, or year.
   - If an external tool is unavailable, declare that search verification is restricted to locally provided sources.

### Phase 2: Systematic Three-Pass Paper Screening
1. **Pass 1 (Bird's Eye View - 5 minutes):**
   - Read Title, Abstract, and Conclusions.
   - Scan section headings and examine Figure 1 (the Teaser/Architecture diagram).
   - *Decision:* Classify as Relevant (proceed to Pass 2) or Irrelevant (discard with reason).
2. **Pass 2 (Structural Grasp - 15 minutes):**
   - Read Introduction and Methodology overview.
   - Examine Main Results tables (identify baselines and datasets).
   - Check Limitations and Ethics section.
   - *Output:* Fill Columns 1 to 6 in the Literature Matrix.
3. **Pass 3 (Deep Mechanical Deconstruction - 45 minutes, top 10 papers only):**
   - Reconstruct mathematical derivations and loss formulations.
   - Inspect Appendix for hidden hyperparameters, compute budget, and failure modes.
   - *Output:* Complete Columns 7 to 10 in the Literature Matrix.

### Phase 3: Matrix Population & Thematic Clustering
Populate the standard 10-Column Literature Matrix (`ERPF-TOOL-TMP-001`):
1. Paper Title & Year.
2. Core Problem & Motivation.
3. Theoretical Mechanism / Proposed Method.
4. Benchmark Datasets & Modality.
5. Key Baselines Evaluated.
6. Primary Quantitative Findings (with error margins).
7. Critical Flaws / Unaddressed Failure Cases.
8. Unstated Assumptions / Compute Requirements.
9. Reproducibility Status (code, weights, license).
10. Differentiator Relative to Current Work.

### Phase 4: Research Gap Synthesis & Differentiation
1. Group papers into 3-4 thematic clusters based on *underlying mechanism*, not author names.
2. Identify cross-cutting limitations across the entire cluster.
3. Verify that the identified gap is a true **Research Gap** (unsolved conceptual/methodological limitation) rather than a trivial **Engineering Delta** (e.g., *"Nobody has applied Model X to Dataset Y yet"*).

---

## 6. Technical Decision Criteria

| Observed Situation in Literature | Scientific Action |
| :--- | :--- |
| Proposed method has already been published in a top venue | **Pivoting Required:** Acknowledge prior art; pivot hypothesis toward an unexamined boundary condition or mechanism. |
| A paper claims SOTA but omits standard strong baselines | **Flag Methodological Defect:** Do not accept claimed superiority at face value; record in Column 7 of matrix. |
| Papers in the field report single-run numbers without seeds | **Note High Variance Risk:** Plan multi-seed evaluations to test claim robustness. |

---

## 7. Expected Outputs
1. **Systematic Search Log:** Keywords, venues searched, date boundaries, and inclusion/exclusion counts.
2. **Populated 10-Column Literature Matrix** (`literature-matrix.md`).
3. **Thematic Synthesis Summary:** 1-2 pages analyzing clusters, shared trade-offs, and verified research gaps.

---

## 8. Verification Criteria
- [ ] 100% of cited papers exist and have verified DOIs, ArXiv IDs, or venue publications.
- [ ] Every paper in the matrix has a documented limitation or unstated assumption.
- [ ] Related Work synthesis is organized thematically by methodology, not as an alphabetical list.

---

## 9. Common Methodological Mistakes (Failure Modes)
- **Hallucinated Citations:** Generating plausible-sounding papers (e.g., *"Smith et al., 2023, Journal of Neural Innovation"*).
- **Laundry List Syndrome:** Writing *"Paper A did X [1]. Paper B did Y [2]. Paper C did Z [3]"* without comparative analysis.
- **Strawman Literature Framing:** Dismissing prior art as "hopeless" or "primitive" to artificially exaggerate novelty.
- **Confusing Engineering Gap with Research Gap:** Proposing to tune hyperparameters or train on a new language without addressing a core mechanism.

---

## 10. Limitations
- Does not automatically guarantee that all relevant papers are retrieved if novel non-standard terminology is used by other research communities.
- Cannot replace human critical appraisal of mathematical proofs in complex theoretical papers.

---

## 11. Supporting Knowledge References
- Foundations: `ERPF-CORE-PRIN-001` (Intellectual Honesty), `ERPF-CORE-PRIN-005` (Evidence-Based Reasoning).
- Competencies: `ERPF-CORE-COMP-004` (Information Literacy and Knowledge Synthesis).
- Domains: `ERPF-AI-DOM-002` (Literature Review and Synthesis).
- Workflows: `ERPF-AI-WORK-002` (Literature Review Workflow).
- Templates: `ERPF-TOOL-TMP-001` (Literature Matrix Template).
