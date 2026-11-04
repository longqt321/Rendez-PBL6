import { Link } from "react-router";
import { ArrowUpRight, Clock, MapPin, User } from "lucide-react";
import type { FeedItem } from "../../lib/api/types";
import {
  extractDistrict,
  formatRelative,
  shortAddress,
} from "../../lib/format";
import { SafeImage } from "../../components/ui/safe-image";
import { SavePlaceButton } from "../places/PlaceCard";

export function ExperienceCard({
  item,
  eager = false,
}: {
  item: FeedItem;
  eager?: boolean;
}) {
  const { photo, place } = item;
  const district = extractDistrict(place.address);
  const timeFormatted = photo.published_at
    ? formatRelative(photo.published_at)
    : null;

  return (
    <article className="experience-card group relative flex flex-col rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-shadow">
      <Link
        className="experience-card__media relative block aspect-[4/5] overflow-hidden bg-neutral-100 dark:bg-neutral-800"
        to={"/photos/" + photo.id}
        aria-label={"Xem ảnh tại " + place.name}
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
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </Link>

      <div className="absolute top-2.5 right-2.5 z-10">
        <SavePlaceButton place={place} variant="icon" />
      </div>

      <div className="p-3.5 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400">
          <p className="truncate">
            {place.category?.name || "Địa điểm"}
            {district ? ` · ${district}` : ""}
          </p>
          {timeFormatted && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock size={11} aria-hidden />
              {timeFormatted}
            </span>
          )}
        </div>

        <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
          <Link to={"/places/" + place.id} className="hover:underline">
            {place.name}
          </Link>
        </h3>

        {photo.caption && (
          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {photo.caption}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 pt-1 border-t border-neutral-100 dark:border-neutral-800/60 mt-1">
          <p className="flex items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" aria-hidden />
            <span className="truncate">{shortAddress(place.address)}</span>
          </p>
          {photo.author_name && (
            <span className="flex items-center gap-1 shrink-0 text-neutral-400">
              <User size={12} aria-hidden />
              {photo.author_name}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ExperienceTile({
  item,
  from,
}: {
  item: FeedItem;
  from?: string;
}) {
  const { photo, place } = item;
  return (
    <Link
      className="group relative block aspect-square rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800"
      to={"/photos/" + photo.id}
      state={from ? { from } : undefined}
      aria-label={"Xem trải nghiệm tại " + place.name}
    >
      <SafeImage
        sources={[photo.url]}
        alt={photo.alt_text || photo.caption || place.name}
        ratio="1 / 1"
        className="group-hover:scale-105 transition-transform duration-300"
      />
      <span className="absolute top-2 right-2 p-1 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden>
        <ArrowUpRight size={14} />
      </span>
    </Link>
  );
}
