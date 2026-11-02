# Da Nang POI dataset status

**Status: NOT BUILT — zero new POIs ingested.**  
**Snapshot date:** none.  
**Source manifest:** data/MANIFEST_SOURCES.jsonl (empty).

## Counts

| Item | Count | Interpretation |
|---|---:|---|
| New POIs in this AI dataset | 0 | No external source dump/API data was downloaded. |
| Existing checked-in seed POIs | 12 | Reported by data/README.md and data/danang.json. Not counted in the new dataset. |
| Existing generated placeholder images | 36 | Reported by data/README.md. Not field photographs; excluded. |
| New licensed external photographs | 0 | No image candidate reached file-level license validation. |
| POIs with a new licensed photo | 0 | No images assigned. |
| Source opening-hours strings parsed | 0 | No PBF was available. |
| Agent-reviewed visual labels | 0 | No licensed real source image was available. |
| Benchmark queries / qrels | 0 / 0 | No query/judgement protocol was run. |

## Existing project seed is not the new dataset

data/README.md describes the checked-in seed as 12 places and 36 automatically generated placeholder illustrations. They are not an external source dump, not a verified public-source POI collection, and not licensed field photographs. They are excluded from the AI dataset and visual-label evaluation.

Some older audit material refers to 14 places and 39 photos in a development database. That database was not available in this execution environment. These runtime totals conflict with the checked-in seed and are not included in this dataset count.

## Source snapshots

None. No downloaded source file exists, so no source checksum, snapshot date, extract boundary or source manifest row can be recorded. data/MANIFEST_SOURCES.jsonl intentionally has zero records.

## Required metrics not available

- POI count after each extraction/conflation filter: CHƯA ĐO.
- Same-source and cross-source duplicate pairs: CHƯA ĐO.
- Suspected merge sample: CHƯA ĐO.
- Category and district/area distributions: CHƯA ĐO.
- Valid hours / open_24h / hours_unknown: CHƯA ĐO.
- Image candidate/license/match/duplicate counts: CHƯA ĐO.
- 50-record QA sample: CHƯA THỰC HIỆN; see QA_SAMPLE.md.

## Interpretation

The target of 1,000–2,000 records and minimum acceptance of 300 are not met. No synthetic POIs were created to make the count appear complete. Resume after resolving BLOCKERS.md, downloading a verified snapshot and choosing an explicit Da Nang boundary.
