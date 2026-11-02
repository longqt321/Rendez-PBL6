# Data source licensing register

**Read date:** 2026-11-03  
**Policy:** A source is not ingested until its official license terms and source-specific conditions are understood. A general source license does not prove that an individual image or every record is covered by it.

No external dataset or photograph was downloaded during this execution. The statuses below distinguish a license review from actual access, ingestion and record-level validation.

## Candidate POI sources

| Source | Official license / reference | License identified | Conditions and caveats | Status |
|---|---|---|---|---|
| Geofabrik Vietnam OSM extract | https://www.geofabrik.de/data/download.html and https://download.geofabrik.de/asia/vietnam.html | ODbL 1.0 for OSM-derived extracts | Attribute OpenStreetMap contributors. Public redistribution of OSM data and derivative databases has ODbL/share-alike obligations. Analyze whether a merged database is derivative or collective before redistribution. | License reviewed; download blocked by DNS; not ingested. |
| OpenStreetMap legal terms | https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ | ODbL 1.0 | Attribution is required for public use. Share-alike obligations apply to distributed databases and derivatives as described by OSMF guidance. Produced works and databases have different obligations. | Legal reference reviewed. |
| Overture Places | https://docs.overturemaps.org/guides/places/ and https://docs.overturemaps.org/attribution/ | Per-source licensing, including CDLA-Permissive-2.0 for several providers, Apache-2.0 for Foursquare-sourced records and CC0-1.0 for AllThePlaces records | Preserve each feature's source/license provenance and required credits. Do not treat the Places theme as one blanket license. The Places theme documentation says it does not contain OSM data. | License reviewed; Parquet not downloaded. |
| Foursquare Open Source Places direct Hugging Face dataset | https://huggingface.co/datasets/foursquare/fsq-os-places | Dataset card reports Apache-2.0. | Dataset files are gated. The access page requires sign-in and agreement to conditions including sharing Hugging Face account information and allowing entity name/logo use in partner/marketing descriptions. No agreement was accepted in this run. | Excluded; do not access without project-owner authorization and acceptance of terms. |
| Wikidata structured data | https://www.wikidata.org/wiki/Wikidata:Licensing | CC0-1.0 for structured data | This conclusion applies to structured data. Do not assume all prose or media in Wikimedia projects is CC0. | License reviewed; no SPARQL records downloaded. |
| Overpass API fallback | https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ | ODbL 1.0, because the served map data is OSM data | Same attribution and share-alike analysis as OSM. Use sequential requests and a clear project User-Agent. | Not queried; DNS blocked in this environment. |

## Candidate image sources

| Source | Official license / metadata reference | Acceptance rule | Status |
|---|---|---|---|
| OSM image or wikimedia_commons tags | OSM database license plus each linked image's own license | An OSM tag is not an image license. Inspect every linked Commons file and accept only CC0, CC BY or CC BY-SA with complete attribution metadata. | No candidate inspected. |
| Wikidata P18 | Wikidata structured data is CC0; the image file license is separate. | Inspect the actual Commons file and accept only CC0, CC BY or CC BY-SA. | No candidate inspected. |
| Wikimedia Commons geosearch | https://commons.wikimedia.org/wiki/Commons:Machine-readable_data | Query each file via imageinfo/extmetadata. Require LicenseShortName, UsageTerms, Artist and Credit. Reject NC, ND, all-rights-reserved and missing license metadata. | API unavailable from this runtime; no image downloaded. |
| Mapillary | https://www.mapillary.com/terms | Consider only if an authorized token and applicable use terms are available. Street-level imagery is secondary only and is not visual ground truth. | Not used; no token read. |

Commons has no blanket license applying to all files. Each image's own license and attribution requirements must be checked independently. Its machine-readable data guidance documents retrieving file metadata through the API.

## Explicit exclusions

- Places365 is not used as imagery of a Da Nang POI. It may be considered separately for permitted pretraining or linear-probe experiments only.
- Direct Foursquare Hugging Face data is excluded in this run because access is gated and its terms were not accepted.
- No source with unverified license or missing attribution metadata is accepted.
- No image is assigned solely because it is geographically close to a POI.
- Existing generated images in data/photos are placeholders, not licensed field photographs, and are excluded from this AI dataset.

## ODbL and merged records

Cross-source conflation can combine entities and fields from datasets with materially different licenses. Keep immutable source identifiers, source-level license metadata, field-level provenance and original source files. Before publishing a merged database or derivative, apply OSMF guidance on derivative versus collective databases and get the project owner's decision on redistribution.

References:
- https://osmfoundation.org/wiki/Licence/Community_Guidelines/Collective_Database_Guideline_Guideline
- https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline

## Evidence boundary

Official licensing documentation was reviewed through the web research interface. Raw endpoint probes from the execution container failed before HTTP response due to DNS resolution. Therefore dump contents, per-record licenses and file-level image metadata were not inspected. License review is not a claim that a dataset was downloaded or ingested.
