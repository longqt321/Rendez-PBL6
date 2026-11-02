# Rendez smart-search architecture

**Status:** Design specification only. No search/ranking code has been deployed.

## Integration boundary

Retain the current Django modular monolith, existing GET /api/v1/places/ contract and frontend. Add a dedicated smart-search module and a new GET /api/v1/places/search/ endpoint. Do not replace existing selectors or change their response contract.

Proposed response:

- results[]: place identity/display fields, score, reasons, and licensed image information with attribution.
- Top-level relaxed, relaxation_reason, vibe_missing and model_version.
- Preserve current authentication, visibility and pagination rules. A research dataset record must not become public simply because it exists in the source dump.

## Offline data pipeline

1. Read only source files with reviewed licenses and recorded checksums.
2. Resolve and version the administrative boundary using the selected source snapshot; record boundary date and definition.
3. Extract the allowed POI tags with name and valid coordinates. Ways/relations use a documented centroid method.
4. Normalize names; deduplicate within a source first, then cross-source candidate pairs using exact accent-folded name and distance under 30 m. Keep source IDs and field provenance. Ambiguous pairs are not auto-merged.
5. Keep immutable source snapshots and normalized research tables separate from user-generated place/photo tables.
6. Import only after dry-run, count reconciliation and QA. Never overwrite user edits or delete old records.

## Query interpretation

- Normalize lowercase Vietnamese text and fold accents; preserve the original query for explanations.
- Hard filters: explicit opening-hours constraints and explicit numeric distance limits.
- Soft signals: category, intended use, visual labels and proximity when no explicit radius is supplied.
- “gần đây” without a numeric radius is a soft distance preference, not a hard exclusion.
- Missing hours and visual labels remain unknown/neutral, never inferred as negative or positive.
- Parser target below 20 ms is a target only; measure p50/p95 on documented CPU hardware.

## Candidate generation

Generate 50–100 candidates with accent-insensitive text retrieval, BM25/TF-IDF and existing PostgreSQL trigram support. Apply hard constraints separately from candidate generation. If a hard constraint yields no candidates, relax only the documented constraint and return relaxed=true with the reason.

## Ranker

Train a CPU-serving LightGBM LambdaMART ranker with objective=lambdarank and query-grouped candidate rows. Version the feature schema.

Feature families: lexical (bm25_name, bm25_desc, trgm_name); semantic (sem_cos); intent (intent_cov, intent_p_min, intent_p_mean); visual (zs_clip_max, vibe_missing); geography (log_dist, dist_missing, rel_pos_by_dist); time (open_now, close_slack_min, open_24h, hours_unknown); category (cat_match); quality (n_images, img_freshness).

No rating feature: these open sources do not provide comparable, licensed star ratings.

Initial parameters from the task: num_leaves=15, min_data_in_leaf=20, learning_rate=0.05, feature_fraction=0.8, bagging_fraction=0.8, lambda_l2=1.0, maximum 500 rounds, early stopping 50, label gains [0,1,3], eval_at [5,10]. Check monotonic constraint compatibility with the selected LightGBM version before relying on it.

Use TF-IDF character n-grams + Logistic Regression for intent; train on synthetic templates and benchmark training queries only. multilingual-e5-small ONNX INT8 and POI text embeddings are offline artifacts. The complete request-path checkpoint must be CPU compatible and stay below 150 MB.

CLIP and cross-encoder inference are offline-only. TreeSHAP explanation cost is not assumed to be free; benchmark it before enabling per-result explanations. If too expensive, use a documented deterministic top-feature explanation.

## Labels and evaluation

- CLIP zero-shot labels are unreviewed proposals only.
- Agent visual review is not independent human annotation. Do not claim reviewed=true under the request's human/independent review semantics unless the label is explicitly marked agent_visual_review and the UI/report makes that distinction.
- Qrels are separate 0/1/2 agent judgements on a candidate pool; label_source=agent_judgment. Do not derive qrels from visual labels.
- Create 80–100 authored Vietnamese queries, explicitly not real-user logs. Synthetic templates may train, but must not leak into held-out evaluation.
- Hold out POIs; group candidate rows by query; run query-grouped cross-validation and open the fixed test set once after configuration freeze.
- Report P@5, R@10, NDCG@10, latency, paired query-level comparisons and 95% bootstrap intervals. No superiority claim when uncertainty overlaps materially.

## Ablation plan

B0 lexical baseline; B1 hard constraints; B2 Logistic Regression pointwise; B3 linear RankSVM; B4 LambdaMART without visual features; B5 full LambdaMART; B6 teacher-score blend only if the offline cross-encoder runs. Add zero-shot CLIP variants only under the same reviewed/test protocol.

## Serving and fallbacks

Store immutable dataset snapshots, feature schema version and model versions. Load a small LightGBM text model on CPU. Do not run CLIP or cross-encoder inference in the request path.

Fallbacks: no GPS means omit distance features; zero candidates triggers documented relaxation; unknown intent falls back to text search; missing attributes use neutral values and explicit missing flags.
