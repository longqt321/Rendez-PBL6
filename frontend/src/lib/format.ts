/**
 * Presentation helpers.
 *
 * Kept free of React so they can be unit-tested and reused in any layer.
 */

const VN = "vi-VN";
const TZ = "Asia/Ho_Chi_Minh";

/** Absolute calendar date, e.g. "12/03/2025". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(VN, { timeZone: TZ });
}

/**
 * Relative time for community content. Falls back to an absolute date beyond
 * a month so old contributions stay unambiguous.
 */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const diffMs = Date.now() - parsed.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDate(value);
}

/** Vietnamese count formatting with thousands separators. */
export function formatCount(value: number | null | undefined): string {
  if (value == null) return "0";
  return new Intl.NumberFormat(VN).format(value);
}

/** "3 ảnh", "1 ảnh" — used in gallery and experience summaries. */
export function countLabel(count: number, singular: string, plural: string) {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}

/**
 * Đà Nẵng addresses arrive as one long string. The district is the most useful
 * part for scanning, so it is extracted explicitly rather than guessed.
 */
const DISTRICTS = [
  "Hải Châu",
  "Thanh Khê",
  "Sơn Trà",
  "Ngũ Hành Sơn",
  "Liên Chiểu",
  "Cẩm Lệ",
  "Hòa Vang",
];

export function extractDistrict(
  address: string | null | undefined,
): string | null {
  if (!address) return null;
  const found = DISTRICTS.find((district) =>
    address.toLowerCase().includes(district.toLowerCase()),
  );
  return found ?? null;
}

/** Address without the trailing ", Đà Nẵng" that every record carries. */
export function shortAddress(address: string | null | undefined): string {
  if (!address) return "";
  return address.replace(/,?\s*Đà Nẵng\s*$/i, "").trim();
}

/** Initials for the avatar fallback; never returns an empty string. */
export function initials(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

/**
 * Directions link. Prefers a full name+address query because that survives
 * stale coordinates; coordinates are the fallback, then the place name.
 */
export function directionsUrl(place: {
  name?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}): string {
  if (place.name && place.address) {
    return (
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(`${place.name}, ${place.address}`)
    );
  }
  if (place.latitude != null && place.longitude != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(place.name || place.address || "Đà Nẵng")
  );
}
