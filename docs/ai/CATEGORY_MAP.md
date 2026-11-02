# Provisional POI category map

**Status:** Mapping proposal only. No source records have been ingested or mapped.

The existing Rendez seed categories (study, night, vintage, garden, checkin, classic) describe user intent or vibe, not a canonical business-type taxonomy. Keep these concepts separate.

## Canonical internal POI types

| Canonical slug | OSM key/value(s) | Meaning |
|---|---|---|
| cafe | amenity=cafe; shop=coffee | Coffee shop / cafe |
| restaurant | amenity=restaurant | Restaurant |
| fast_food | amenity=fast_food | Fast-food venue |
| bar | amenity=bar, pub, biergarten | Bar / pub / beer garden |
| dessert | amenity=ice_cream | Ice-cream / dessert outlet |
| food_court | amenity=food_court | Food court |
| nightlife | amenity=nightclub | Nightclub |
| cinema | amenity=cinema | Cinema |
| bakery | shop=bakery, pastry | Bakery / pastry |
| park | leisure=park, garden | Park / garden |
| sports_venue | leisure=sports_centre | Sports centre |
| dance_venue | leisure=dance | Dance venue |
| lodging | tourism=hotel, hostel, guest_house | Accommodation |
| gallery | tourism=gallery | Art gallery |
| museum | tourism=museum | Museum |

## Overture and Foursquare mappings

Map source taxonomy values by their documented identifiers, not free-text guessing. Preserve the original category ID and label alongside the normalized slug. For ambiguous or multi-category records, retain all source categories and select a primary category only through a deterministic, documented priority.

## Vibe and visual labels remain separate

- Existing Rendez seed categories: study, night, vintage, garden, checkin, classic.
- Proposed visual labels: low_light, plants_garden, vintage_wood, interior_study, photo_spot.
- Existing app visual attributes: plants, study, architecture, interior, night, food, wood.

Do not copy existing generated-seed tags into newly reviewed visual labels. Every label must retain its own label_source, review state and source image ID.
