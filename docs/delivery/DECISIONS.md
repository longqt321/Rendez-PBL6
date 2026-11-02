# Architectural & Research Decisions

## ADR-01: Autonomous Execution & Operating Baseline
- **Context**: Autonomous end-to-end mission to deliver working Vietnamese AI retrieval, benchmarks, reports, and verification for PBL6 course requirements.
- **Decision**: Preserve existing local database and test structure. Execute all deep learning training and evaluation on Modal with strict budget bounds (target <= $5, hard ceiling $7).
- **Status**: Accepted.

## ADR-02: AI Model Selection for Vietnamese Visual-Semantic Retrieval
- **Context**: Need a genuinely capable multimodal vision-language model for Vietnamese text-to-image/place search within Rendez, adhering to open licenses, high accuracy, and strict Modal cost constraints.
- **Decision**: Select `google/siglip-base-patch16-256-multilingual` (Apache 2.0) as the primary multimodal backbone. Benchmark against lexical baseline (PostgreSQL Trigram/Unaccent) and `sentence-transformers/clip-ViT-B-32-multilingual-v1`. Perform conservative fine-tuning on Modal NVIDIA L4.
- **Status**: Accepted.
