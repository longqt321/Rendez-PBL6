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
            "w-8 h-8 rounded-full flex items-center justify-center bg-white/90 dark:bg-neutral-900/90 shadow-sm border border-neutral-200 dark:border-neutral-700 transition-colors cursor-pointer",
            saved
              ? "text-blue-600 dark:text-blue-400"
              : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100",
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
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer",
          saved
            ? "border-blue-600 text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400"
            : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800",
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
    <article className="place-card group relative flex flex-col rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs hover:shadow-md transition-shadow">
      <Link
        className="place-card__media relative block aspect-[4/5] overflow-hidden bg-neutral-100 dark:bg-neutral-800"
        to={"/places/" + place.id}
        aria-label={"Xem địa điểm " + place.name}
      >
        <SafeImage
          sources={[place.cover_media_url, place.cover_image_url]}
          alt={place.name}
          ratio="4 / 5"
          eager={eager}
          className="group-hover:scale-105 transition-transform duration-300"
        />
      </Link>
      <div className="absolute top-2.5 right-2.5 z-10">
        <SavePlaceButton place={place} variant="icon" />
      </div>
      <div className="p-3.5 flex flex-col gap-1.5 min-w-0">
        <h3 className="place-card__title text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
          <Link to={"/places/" + place.id} className="hover:underline">
            {place.name}
          </Link>
        </h3>
        <p className="flex items-center gap-1 text-xs text-neutral-500 truncate">
          <MapPin size={13} className="shrink-0" aria-hidden />
          <span className="truncate">{shortAddress(place.address)}</span>
        </p>
        {district && (
          <span className="inline-block mt-1 self-start px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
            {district}
          </span>
        )}
      </div>
    </article>
  );
}
