import hashlib
import http.client
import json
import logging
import math
import re
import ssl
import threading
import urllib.parse
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

# Cache nạp dữ liệu đường phố từ cơ sở dữ liệu OpenStreetMap bên thứ ba (region.geojson)
_OSM_STREET_DATABASE = None
_OSM_STREET_DATABASE_LOCK = threading.Lock()


def unaccent(text: str) -> str:
    """Chuẩn hóa chuỗi tiếng Việt về chữ thường không dấu để so khớp linh hoạt."""
    if not text:
        return ""
    s = text.lower()
    mapping = {
        r"[àáạảãâầấậẩẫăằắặẳẵ]": "a",
        r"[èéẹẻẽêềếệểễ]": "e",
        r"[ìíịỉĩ]": "i",
        r"[òóọỏõôồốộổỗơờớợởỡ]": "o",
        r"[ùúụủũưừứựửữ]": "u",
        r"[ỳýỵỷỹ]": "y",
        r"đ": "d",
    }
    for pattern, repl in mapping.items():
        s = re.sub(pattern, repl, s)
    return s.strip()


def normalize_street_name(name: str) -> str:
    """Bỏ các tiền tố đường xá để đối sánh tên đường chính xác."""
    norm = unaccent(name)
    prefixes = [
        "duong ",
        "pho ",
        "kiet ",
        "ngo ",
        "hem ",
        "tinh lo ",
        "quoc lo ",
        "ql ",
    ]
    for pfx in prefixes:
        if norm.startswith(pfx):
            norm = norm[len(pfx) :]
            break
    return norm.strip()


def _safe_https_get_json(host: str, path: str, timeout: float = 3.0) -> dict | list | None:
    """Thực hiện HTTP GET qua kết nối TLS/HTTPS an toàn, ngăn ngừa protocol injection."""
    conn = None
    try:
        ctx = ssl.create_default_context()
        conn = http.client.HTTPSConnection(host, timeout=timeout, context=ctx)
        conn.request(
            "GET",
            path,
            headers={
                "User-Agent": "RendezCityDiscovery/1.0 (contact@rendez.local)",
                "Accept": "application/json",
            },
        )
        resp = conn.getresponse()
        if resp.status == 200:
            return json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.debug("HTTPS request to %s%s failed: %s", host, path, exc)
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception as close_err:
                logger.debug("Failed to close HTTPS connection: %s", close_err)
    return None


def query_nominatim_realtime(address: str) -> dict | None:
    """
    Tra cứu thời gian thực từ OpenStreetMap Nominatim (bên thứ ba uy tín toàn cầu).
    Ưu tiên tìm kiếm trong phạm vi Việt Nam / Đà Nẵng.
    """
    try:
        query = address.strip()
        if "da nang" not in unaccent(query):
            query += ", Da Nang, Vietnam"

        params = urllib.parse.urlencode(
            {
                "q": query,
                "format": "json",
                "addressdetails": 1,
                "limit": 1,
                "countrycodes": "vn",
                "viewbox": "108.0,16.25,108.35,15.95",
            }
        )
        data = _safe_https_get_json("nominatim.openstreetmap.org", f"/search?{params}")
        if data and len(data) > 0:
            first = data[0]
            lat = Decimal(str(round(float(first["lat"]), 6)))
            lng = Decimal(str(round(float(first["lon"]), 6)))
            return {
                "latitude": lat,
                "longitude": lng,
                "display_name": first.get("display_name", address),
                "provider": "OpenStreetMap Nominatim (Real-time)",
            }
    except Exception as e:
        logger.debug("Nominatim lookup failed: %s", e)
    return None


def query_photon_realtime(address: str) -> dict | None:
    """
    Tra cứu thời gian thực từ Photon (Komoot / OpenStreetMap database).
    Hỗ trợ định vị theo trọng tâm tọa độ Đà Nẵng (16.068, 108.153).
    """
    try:
        query = address.strip()
        params = urllib.parse.urlencode(
            {
                "q": query,
                "lat": 16.068,
                "lon": 108.153,
                "limit": 1,
            }
        )
        data = _safe_https_get_json("photon.komoot.io", f"/api/?{params}")
        if isinstance(data, dict):
            features = data.get("features", [])
            if features:
                feat = features[0]
                coords = feat.get("geometry", {}).get("coordinates", [])
                props = feat.get("properties", {})
                if len(coords) >= 2:
                    lng = Decimal(str(round(float(coords[0]), 6)))
                    lat = Decimal(str(round(float(coords[1]), 6)))
                    parts = [
                        props.get("name"),
                        props.get("street"),
                        props.get("district"),
                        props.get("city"),
                    ]
                    display_name = ", ".join([p for p in parts if p]) or address
                    return {
                        "latitude": lat,
                        "longitude": lng,
                        "display_name": display_name,
                        "provider": "Photon by Komoot (OpenStreetMap Real-time)",
                    }
    except Exception as e:
        logger.debug("Photon lookup failed: %s", e)
    return None


def load_osm_third_party_database():
    """
    Nạp dữ liệu đường xá từ cơ sở dữ liệu OpenStreetMap (region.geojson - Nextzen/OSM dump).
    Tuyệt đối không sử dụng danh sách thủ công, toàn bộ được phân tích từ hình học OSM.
    """
    global _OSM_STREET_DATABASE
    with _OSM_STREET_DATABASE_LOCK:
        if _OSM_STREET_DATABASE is not None:
            return _OSM_STREET_DATABASE

        database = {}
        geojson_path = settings.BASE_DIR.parent / "frontend" / "public" / "map" / "region.geojson"

        if geojson_path.exists():
            try:
                with open(geojson_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for feat in data.get("features", []):
                    props = feat.get("properties", {})
                    name = props.get("name")
                    if name and props.get("kind") == "road":
                        geom = feat.get("geometry", {})
                        if geom.get("type") == "LineString":
                            norm = normalize_street_name(name)
                            coords = geom.get("coordinates", [])
                            if len(coords) >= 2:
                                if norm not in database or len(coords) > len(
                                    database[norm]["coords"]
                                ):
                                    database[norm] = {
                                        "raw_name": name,
                                        "coords": coords,
                                    }
            except Exception as e:
                logger.warning("Không thể đọc cơ sở dữ liệu OpenStreetMap region.geojson: %s", e)

        _OSM_STREET_DATABASE = database
        return _OSM_STREET_DATABASE


def interpolate_along_osm_polyline(
    coords: list[list[float]], ratio: float
) -> tuple[Decimal, Decimal] | None:
    """
    Thuật toán nội suy tuyến tính (Linear Referencing) dọc theo Polyline OpenStreetMap
    để tính toán vị trí số nhà chính xác dựa trên độ dài hình học của con đường.

    Trả về ``None`` khi polyline không có đủ điểm để nội suy: tuyệt đối không
    tự suy ra một tọa độ mặc định (ví dụ trung tâm Đà Nẵng) vì như vậy sẽ gán
    sai vị trí cho địa chỉ mà người dùng nhập.
    """
    if not coords:
        return None
    if len(coords) == 1:
        return Decimal(str(round(coords[0][1], 6))), Decimal(str(round(coords[0][0], 6)))

    lengths = []
    total_len = 0.0
    for i in range(len(coords) - 1):
        dx = coords[i + 1][0] - coords[i][0]
        dy = coords[i + 1][1] - coords[i][1]
        dist = math.hypot(dx, dy)
        lengths.append(dist)
        total_len += dist

    if total_len == 0.0:
        return Decimal(str(round(coords[0][1], 6))), Decimal(str(round(coords[0][0], 6)))

    target_dist = total_len * ratio
    accumulated = 0.0
    for i, seg_len in enumerate(lengths):
        if accumulated + seg_len >= target_dist:
            seg_ratio = (target_dist - accumulated) / seg_len if seg_len > 0 else 0
            lng = coords[i][0] + (coords[i + 1][0] - coords[i][0]) * seg_ratio
            lat = coords[i][1] + (coords[i + 1][1] - coords[i][1]) * seg_ratio
            return (
                Decimal(str(round(lat, 6))),
                Decimal(str(round(lng, 6))),
            )
        accumulated += seg_len

    last = coords[-1]
    return Decimal(str(round(last[1], 6))), Decimal(str(round(last[0], 6)))


def query_osm_local_database(address: str) -> dict | None:
    """
    Thuật toán đối sánh và nội suy từ cơ sở dữ liệu hình học OpenStreetMap địa phương.
    Dùng khi máy chủ ngoại tuyến hoặc các dịch vụ thời gian thực gặp độ trễ.
    """
    norm_addr = unaccent(address)
    osm_db = load_osm_third_party_database()
    if not osm_db:
        return None

    # Trích xuất số nhà / số kiệt
    num_match = re.search(r"(?:k|kiet|so\s*|\/)?(\d+)", norm_addr)
    house_num = int(num_match.group(1)) if num_match else None

    # Tính toán tỉ lệ vị trí theo số nhà (số nhỏ ở đầu đường, số lớn ở cuối đường)
    if house_num is not None:
        ratio = min(max(house_num / 200.0, 0.05), 0.95)
    else:
        ratio = 0.5

    # Tìm tuyến đường trong cơ sở dữ liệu OSM có độ trùng khớp tên dài nhất (Longest Matching Street)
    best_match_key = ""
    best_street = None
    for street_key, street_data in osm_db.items():
        if len(street_key) >= 3 and street_key in norm_addr:
            if len(street_key) > len(best_match_key):
                best_match_key = street_key
                best_street = street_data

    if best_street:
        interpolated = interpolate_along_osm_polyline(best_street["coords"], ratio)
        if interpolated is None:
            return None
        lat, lng = interpolated
        house_desc = f" (gần số {house_num})" if house_num else ""
        return {
            "latitude": lat,
            "longitude": lng,
            "display_name": f"{best_street['raw_name']}{house_desc}",
            "provider": "OpenStreetMap Vector Database (Linear Interpolation)",
        }

    return None


def geocode_address(address: str) -> dict:
    """
    Hàm định vị địa chỉ thực tế (Geocoding):
    - Sử dụng dữ liệu mở từ OpenStreetMap (Nominatim, Photon/Komoot).
    - Ưu tiên gọi API thời gian thực, các nguồn tự động dự phòng cho nhau.
    - Tự động fallback sang cơ sở dữ liệu OpenStreetMap vector offline khi không có kết nối.
    - Kết quả thành công được cache 24 giờ, kết quả thất bại được cache 1 giờ
      (negative caching) theo địa chỉ đã chuẩn hóa để giảm số lần gọi dịch vụ ngoài.
    - Khi mọi nguồn thất bại, trả về success=False để caller tự quyết định;
      không suy diễn tọa độ thay cho người dùng.
    """
    if not address or not address.strip():
        return {
            "success": False,
            "message": "Địa chỉ không được để trống.",
        }

    clean_addr = address.strip()
    cache_key = f"geocode:v1:{hashlib.sha256(unaccent(clean_addr).encode()).hexdigest()}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    result = None
    for lookup in (
        query_nominatim_realtime,
        query_photon_realtime,
        query_osm_local_database,
    ):
        res = lookup(clean_addr)
        if res:
            result = {
                "success": True,
                "latitude": res["latitude"],
                "longitude": res["longitude"],
                "display_name": res["display_name"],
                "provider": res["provider"],
            }
            break

    if result is None:
        failure = {
            "success": False,
            "message": "Không thể xác định vị trí từ địa chỉ đã cho.",
        }
        # Negative caching: địa chỉ không tra cứu được cũng được ghi nhớ ngắn hạn
        # để tránh việc người dùng (hoặc bot) gửi lặp đi lặp lại cùng một địa
        # chỉ sai và mỗi lần lại gọi toàn bộ chuỗi dịch vụ ngoài.
        cache.set(cache_key, failure, 60 * 60)
        return failure

    cache.set(cache_key, result, 60 * 60 * 24)
    return result
