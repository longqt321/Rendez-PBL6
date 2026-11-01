import { Link } from "react-router";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { FeedItem } from "../../lib/api/types";
import { extractDistrict, shortAddress } from "../../lib/format";
import { SafeImage } from "../../components/ui/safe-image";
import { SavePlaceButton } from "../places/PlaceCard";

/**
 * Experience card.
 *
 * This is the community contribution — a photo plus the place it was taken at.
 * It is visually distinct from a place card: the image dominates, the place is
 * a caption-level attribution, and the whole card opens the photo. That keeps
 * "a place" and "someone's experience of a place" from reading as the same
 * object.
 */
export function ExperienceCard({
  item,
  eager = false,
}: {
  item: FeedItem;
  eager?: boolean;
}) {
  const { photo, place } = item;
  const district = extractDistrict(place.address);
  const attributes = photo.attributes?.slice(0, 2) ?? [];

  return (
    <article className="experience-card">
      <Link
        className="experience-card__media"
        to={"/photos/" + photo.id}
        aria-label={"Xem trải nghiệm tại " + place.name}
      >
        <SafeImage
          sources={[photo.url]}
          alt={photo.alt_text || photo.caption || place.name}
          ratio={
            photo.width && photo.height
              ? `${photo.width} / ${photo.height}`
              : "4 / 5"
          }
          eager={eager}
        />
      </Link>

      <div className="experience-card__save">
        <SavePlaceButton place={place} variant="icon" />
      </div>

      <div className="experience-card__body">
        <p className="eyebrow">
          {photo.author_name}
          {district ? ` · ${district}` : ""}
        </p>
        <h3 className="experience-card__place">
          <Link to={"/places/" + place.id}>{place.name}</Link>
        </h3>
        {photo.caption && (
          <p className="experience-card__caption line-clamp-2">
            {photo.caption}
          </p>
        )}
        {attributes.length > 0 && (
          <ul className="experience-card__tags" role="list">
            {attributes.map((attribute) => (
              <li key={attribute.code} className="chip">
                {attribute.display_name_vi}
              </li>
            ))}
          </ul>
        )}
        <p className="experience-card__address">
          <MapPin size={12} aria-hidden />
          <span>{shortAddress(place.address)}</span>
        </p>
      </div>
    </article>
  );
}

/** Compact experience tile used inside place detail and related rails. */
export function ExperienceTile({
  item,
  from,
}: {
  item: FeedItem;
  /** Origin path so the photo page can return here. */
  from?: string;
}) {
  const { photo, place } = item;
  return (
    <Link
      className="experience-tile"
      to={"/photos/" + photo.id}
      state={from ? { from } : undefined}
      aria-label={"Xem trải nghiệm tại " + place.name}
    >
      <SafeImage
        sources={[photo.url]}
        alt={photo.alt_text || photo.caption || place.name}
        ratio="1 / 1"
      />
      <span className="experience-tile__hint" aria-hidden>
        <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}
