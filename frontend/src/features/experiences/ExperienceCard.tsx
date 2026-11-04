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
    <article className="experience-card group relative flex flex-col rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--surface-card)] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <Link
        className="experience-card__media relative block aspect-[4/5] overflow-hidden bg-[var(--surface-muted)]"
        to={"/photos/" + photo.id}
        aria-label={"Xem ảnh tại " + place.name}
      >
        <SafeImage
          sources={[photo.url]}
          alt={photo.alt_text || photo.caption || place.name}
          /* Khung media cố định 4/5; ảnh gốc lệch tỷ lệ thì object-cover lấp
             đầy, không để hở nền tạo khoảng trống lớn trước card kế tiếp. */
          ratio="4 / 5"
          eager={eager}
          className="group-hover:scale-[1.03] transition-transform duration-500"
        />
      </Link>

      <div className="absolute top-3 right-3 z-10">
        <SavePlaceButton place={place} variant="icon" />
      </div>

      <div className="p-4 flex flex-col gap-2 min-w-0">
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--ink-faint)]">
          <p className="truncate font-medium">
            {place.category?.name || "Địa điểm"}
            {district ? ` · ${district}` : ""}
          </p>
          {timeFormatted && (
            <span className="flex items-center gap-1 shrink-0">
              <Clock size={12} aria-hidden />
              {timeFormatted}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold tracking-tight text-[var(--ink)] truncate">
          <Link to={"/places/" + place.id} className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-2">
            {place.name}
          </Link>
        </h3>

        {photo.caption && (
          <p className="text-sm text-[var(--ink-soft)] line-clamp-2 leading-relaxed">
            {photo.caption}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 text-xs text-[var(--ink-faint)] pt-2 border-t border-[var(--line)] mt-1">
          <p className="flex items-center gap-1 truncate">
            <MapPin size={12} className="shrink-0" aria-hidden />
            <span className="truncate">{shortAddress(place.address)}</span>
          </p>
          {photo.author_name && (
            <span className="flex items-center gap-1 shrink-0">
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
