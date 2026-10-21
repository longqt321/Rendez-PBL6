"""Small, deterministic ranking for the current local photo collection."""


def rank_similar_places(source, candidates, limit=12):
    source_codes = {a.code for a in source.attributes.all() if a.active}
    best = {}
    for photo in candidates:
        if photo.place_id == source.place_id:
            continue
        codes = {a.code for a in photo.attributes.all() if a.active}
        score = 3 * (photo.place.category_id == source.place.category_id) + len(
            source_codes & codes
        )
        if not score:
            continue
        # Prefer the cover when photos of a place have the same similarity.
        key = (-score, not photo.is_cover, str(photo.id))
        if photo.place_id not in best or key < best[photo.place_id][0]:
            best[photo.place_id] = (key, photo)
    return [photo for _, photo in sorted(best.values(), key=lambda item: item[0])[:limit]]
