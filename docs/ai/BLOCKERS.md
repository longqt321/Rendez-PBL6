# Blockers

**Last checked:** 2026-11-03  
**Environment:** execution container without a mounted repository checkout.

## B-001 — No local checkout; baseline cannot run

**Symptom:** No repository checkout or Git working tree was mounted. git ls-remote to GitHub failed with DNS resolution error: Temporary failure in name resolution.

**Tried:** Searched the available workspace for a checkout; inspected repository files through the connected GitHub interface; attempted git ls-remote; created the requested feature branch through the GitHub connection.

**Impact:** Cannot run scripts/check.sh all, backend tests, frontend tests, migrations, Django runtime, API or Playwright. BASELINE_TESTS.md records the baseline as NOT RUN.

**Fallback:** Keep application code and migrations untouched. Restore a local checkout of feat/ai-smart-search in a network-enabled development environment, run the baseline gate and resolve every failure before changing runtime code.

## B-002 — All eight required connectivity probes failed before HTTP

Each request used a descriptive project User-Agent and a 5-second timeout. All failed during DNS resolution. No HTTP response or response headers were received.

| Endpoint | Result | Elapsed (ms) | HTTP status | x-deny-reason |
|---|---|---:|---|---|
| https://download.geofabrik.de/ | DNS resolution failure | 5059.4 | N/A | unavailable |
| https://huggingface.co/ | DNS resolution failure | 5056.7 | N/A | unavailable |
| https://overturemaps-us-west-2.s3.amazonaws.com/ | DNS resolution failure | 5055.7 | N/A | unavailable |
| https://codeberg.org/ | DNS resolution failure | 5056.3 | N/A | unavailable |
| https://overpass-api.de/api/status | DNS resolution failure | 10059.5 | N/A | unavailable |
| https://commons.wikimedia.org/w/api.php?action=query&meta=siteinfo&format=json | DNS resolution failure | 5044.0 | N/A | unavailable |
| https://upload.wikimedia.org/ | DNS resolution failure | 5039.0 | N/A | unavailable |
| https://query.wikidata.org/ | DNS resolution failure | 10048.1 | N/A | unavailable |

Since no HTTP response was received, a 403/429 status or x-deny-reason value cannot be reported.

**Impact:** No PBF, Parquet, SPARQL, Commons API or image data could be downloaded from this runtime. No source checksum or Da Nang boundary file is available.

**Fallback:** This is a general DNS failure, not evidence of a source-specific HTTP denial. Do not switch to scraped web pages. Restore DNS/egress and retry the same source priority.

## B-003 — Foursquare direct Hugging Face dataset is gated

**Symptom:** The dataset card reports Apache-2.0, but the content is gated behind sign-in and agreement to access conditions. The page describes sharing Hugging Face account information and permitting entity name/logo use in partner or marketing descriptions.

**Tried:** Read the dataset card and access terms; did not accept the gate.

**Impact:** No direct Foursquare dataset files were accessed.

**Fallback:** Exclude the direct gated dataset unless the project owner authorizes and accepts its terms. Foursquare-sourced records in an accessible Overture Places dump may be considered only with source/license provenance retained.

## B-004 — No image file-level license candidates could be examined

**Symptom:** Commons API and media hosts could not be reached from the execution container.

**Impact:** No per-file extmetadata, author, credit or license validation; no real licensed image, SHA-256, thumbnail, EXIF processing or pHash.

**Fallback:** Use no Commons image until the individual file license and attribution metadata are read. Do not assign an image solely because it is geographically close to a POI.

## B-005 — No executable ML/runtime environment

**Symptom:** No mounted code, dependency environment or database; external DNS unavailable.

**Impact:** No parser tests, 30 real OSM opening-hours examples, migration tests, 60-case query parser, CLIP labels, LambdaMART, teacher scores, ablations, latency tests or Playwright screenshots.

**Fallback:** Do not publish synthetic performance claims. Synthetic fixtures can be added after the baseline is run, but must be explicitly marked synthetic and never counted as real POIs or external evaluation evidence.

## Allowlist / network action

The observed failure is DNS resolution, not an HTTP deny response. An allowlist may help only if the network policy filters DNS. Check DNS resolution and outbound HTTPS from the execution host before assuming an HTTP allowlist is sufficient.

Hosts to check:
- download.geofabrik.de
- huggingface.co
- overturemaps-us-west-2.s3.amazonaws.com
- codeberg.org
- overpass-api.de
- commons.wikimedia.org
- upload.wikimedia.org
- query.wikidata.org

No secrets or tokens were read or written.
