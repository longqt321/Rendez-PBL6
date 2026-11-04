import { Link, useLocation, useNavigate } from "react-router";
import { Bookmark, MapPin } from "lucide-react";
import { clsx } from "clsx";
import type { VisualPlace } from "../../lib/api/types";
import { useSavePlace } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { extractDistrict, shortAddress } from "../../lib/format";
import { SafeImage } from "../../components/ui/safe-image";
import { ErrorText } from "../../components/ui/error-text";

export function SavePlaceButton({
  place,
  variant = "full",
}: {
  place: Pick<VisualPlace, "id" | "name" | "is_saved">;
  variant?: "full" | "icon";
}) {
  const me = useMe();
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useSavePlace();
  const saved = place.is_saved;

  const onClick = () => {
    if (!me.data) {
      navigate("/login", {
        state: {
          returnTo: location.pathname + location.search,
          savePlace: place.id,
        },
      });
      return;
    }
    mutation.mutate({ id: place.id, saved });
  };

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          className={clsx(
            "w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-card)]/95 shadow-sm border border-[var(--line)] transition-colors cursor-pointer backdrop-blur-sm",
            saved
              ? "text-[var(--accent)]"
              : "text-[var(--ink-soft)] hover:text-[var(--ink)]",
          )}
          aria-label={(saved ? "Bỏ lưu " : "Lưu ") + place.name}
          aria-pressed={saved}
          disabled={mutation.isPending}
          onClick={onClick}
        >
          <Bookmark
            size={16}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
        </button>
        <ErrorText error={mutation.error} />
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        className={clsx(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer",
          saved
            ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-soft)]"
            : "border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]",
        )}
        aria-label={(saved ? "Bỏ lưu " : "Lưu ") + place.name}
        aria-pressed={saved}
        disabled={mutation.isPending}
        onClick={onClick}
      >
        <Bookmark
          size={14}
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        />
        {saved ? "Đã lưu" : "Lưu"}
      </button>
      <ErrorText error={mutation.error} />
    </div>
  );
}

export function PlaceCard({
  place,
  eager = false,
}: {
  place: VisualPlace;
  eager?: boolean;
}) {
  const district = extractDistrict(place.address);
  return (
    <article className="place-card group relative flex flex-col rounded-2xl overflow-hidden border border-[var(--line)] bg-[var(--surface-card)] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <Link
        className="place-card__media relative block aspect-[4/5] overflow-hidden bg-[var(--surface-muted)]"
        to={"/places/" + place.id}
        aria-label={"Xem địa điểm " + place.name}
      >
        <SafeImage
          sources={[place.cover_media_url, place.cover_image_url]}
          alt={place.name}
          ratio="4 / 5"
          eager={eager}
          className="group-hover:scale-[1.03] transition-transform duration-500"
        />
      </Link>
      <div className="absolute top-3 right-3 z-10">
        <SavePlaceButton place={place} variant="icon" />
      </div>
      <div className="p-4 flex flex-col gap-1.5 min-w-0">
        <h3 className="place-card__title text-base font-bold tracking-tight text-[var(--ink)] truncate">
          <Link to={"/places/" + place.id} className="hover:underline decoration-[var(--accent)] decoration-2 underline-offset-2">
            {place.name}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-xs text-[var(--ink-soft)] truncate">
          <MapPin size={13} className="shrink-0" aria-hidden />
          <span className="truncate">{shortAddress(place.address)}</span>
        </p>
        {district && (
          <span className="inline-block mt-1 self-start px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[var(--accent-soft)] text-[var(--accent)]">
            {district}
          </span>
        )}
      </div>
    </article>
  );
}
