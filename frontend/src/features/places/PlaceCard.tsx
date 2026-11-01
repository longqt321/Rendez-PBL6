import { Link, useLocation, useNavigate } from "react-router";
import { Bookmark, MapPin } from "lucide-react";
import { clsx } from "clsx";
import type { VisualPlace } from "../../lib/api/types";
import { useSavePlace } from "../../lib/api/queries";
import { useMe } from "../../lib/session";
import { extractDistrict, shortAddress } from "../../lib/format";
import { SafeImage } from "../../components/ui/safe-image";
import { ErrorText } from "../../app/shared";

/**
 * Save control.
 *
 * Guests are sent to sign in with an intent that survives the round trip, so
 * tapping save while logged out still saves the place afterwards.
 */
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
          className={clsx("save-toggle", saved && "is-saved")}
          aria-label={(saved ? "Bỏ lưu " : "Lưu ") + place.name}
          aria-pressed={saved}
          disabled={mutation.isPending}
          onClick={onClick}
        >
          <Bookmark
            size={17}
            fill={saved ? "currentColor" : "none"}
            aria-hidden
          />
        </button>
        <ErrorText error={mutation.error} />
      </>
    );
  }

  return (
    <div className="save-control">
      <button
        type="button"
        className={clsx("btn btn--outline", saved && "is-saved")}
        aria-label={(saved ? "Bỏ lưu " : "Lưu ") + place.name}
        aria-pressed={saved}
        disabled={mutation.isPending}
        onClick={onClick}
      >
        <Bookmark
          size={17}
          fill={saved ? "currentColor" : "none"}
          aria-hidden
        />
        {saved ? "Đã lưu" : "Lưu địa điểm"}
      </button>
      <ErrorText error={mutation.error} />
    </div>
  );
}

/**
 * Place card.
 *
 * A place is the primary object, so the card leads with the place name and
 * shows a single representative image. Community experiences are linked from
 * the place, not inlined here — one card must not pretend to be a feed.
 */
export function PlaceCard({
  place,
  eager = false,
}: {
  place: VisualPlace;
  eager?: boolean;
}) {
  const district = extractDistrict(place.address);
  return (
    <article className="place-card">
      <Link
        className="place-card__media"
        to={"/places/" + place.id}
        aria-label={"Xem địa điểm " + place.name}
      >
        <SafeImage
          sources={[place.cover_media_url, place.cover_image_url]}
          alt={place.name}
          ratio="4 / 5"
          eager={eager}
        />
      </Link>
      <div className="place-card__save">
        <SavePlaceButton place={place} variant="icon" />
      </div>
      <div className="place-card__body">
        <p className="eyebrow">{place.category.name}</p>
        <h3 className="place-card__title">
          <Link to={"/places/" + place.id}>{place.name}</Link>
        </h3>
        <p className="place-card__meta">
          <MapPin size={13} aria-hidden />
          <span>{shortAddress(place.address)}</span>
        </p>
        {district && <span className="badge">{district}</span>}
      </div>
    </article>
  );
}

/** Horizontal variant used in search results and "nearby" lists. */
export function PlaceRow({ place }: { place: VisualPlace }) {
  return (
    <article className="place-row">
      <Link
        className="place-row__media"
        to={"/places/" + place.id}
        aria-label={"Xem địa điểm " + place.name}
      >
        <SafeImage
          sources={[place.cover_media_url, place.cover_image_url]}
          alt={place.name}
          ratio="1 / 1"
        />
      </Link>
      <div className="place-row__body">
        <p className="eyebrow">{place.category.name}</p>
        <h3 className="place-row__title">
          <Link to={"/places/" + place.id}>{place.name}</Link>
        </h3>
        <p className="place-row__meta">
          <MapPin size={13} aria-hidden />
          <span>{shortAddress(place.address)}</span>
        </p>
      </div>
      <SavePlaceButton place={place} variant="icon" />
    </article>
  );
}
