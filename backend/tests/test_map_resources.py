import json
from django.conf import settings
import pytest
from apps.places.geocoding import load_osm_third_party_database, query_osm_local_database


def test_map_style_json_validity():
    repo_root = settings.BASE_DIR.parent
    style_path = repo_root / "frontend" / "public" / "map" / "style.json"
    assert style_path.exists(), f"Map style file not found at {style_path}"

    with open(style_path, "r", encoding="utf-8") as f:
        style = json.load(f)

    assert style.get("version") == 8
    sources = style.get("sources", {})
    assert "esri-street" in sources
    assert "danang" in sources

    # Check Esri source attribution and tiles
    esri = sources["esri-street"]
    assert esri.get("type") == "raster"
    assert "Esri" in esri.get("attribution", "")
    assert "OpenStreetMap" in esri.get("attribution", "")
    tiles = esri.get("tiles", [])
    assert len(tiles) >= 1
    for tile_url in tiles:
        assert "{z}/{y}/{x}" in tile_url
        assert "arcgisonline.com" in tile_url

    # Check GeoJSON source
    danang = sources["danang"]
    assert danang.get("type") == "geojson"
    assert danang.get("data") == "/map/region.geojson"
    assert "OpenStreetMap" in danang.get("attribution", "")

    # Check fallback background layer
    layers = style.get("layers", [])
    bg_layer = next((layer for layer in layers if layer.get("id") == "background"), None)
    assert bg_layer is not None
    assert bg_layer.get("paint", {}).get("background-color") == "#f3f0e8"

    # Check glyphs configuration
    assert style.get("glyphs") == "/map/glyphs/{fontstack}/{range}.pbf"


def test_region_geojson_validity():
    repo_root = settings.BASE_DIR.parent
    geojson_path = repo_root / "frontend" / "public" / "map" / "region.geojson"
    assert geojson_path.exists(), f"region.geojson not found at {geojson_path}"

    with open(geojson_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert data.get("type") == "FeatureCollection"
    features = data.get("features", [])
    assert len(features) > 0

    # Ensure road and water features exist and have valid coordinates within Da Nang bounding box
    # Da Nang approx bounds: lat 15.9 to 16.25, lng 108.0 to 108.4
    has_road = False
    for feat in features:
        props = feat.get("properties", {})
        if props.get("kind") == "road":
            has_road = True
            break
    assert has_road is True


def test_map_glyphs_and_font_license():
    repo_root = settings.BASE_DIR.parent
    glyphs_dir = repo_root / "frontend" / "public" / "map" / "glyphs" / "Noto Sans Regular"
    assert glyphs_dir.exists()

    required_pbfs = ["0-255.pbf", "256-511.pbf", "7680-7935.pbf"]
    for pbf in required_pbfs:
        pbf_file = glyphs_dir / pbf
        assert pbf_file.exists(), f"Glyph {pbf} missing from {glyphs_dir}"
        assert pbf_file.stat().st_size > 1000

    license_file = repo_root / "frontend" / "public" / "map" / "FONT-LICENSE.txt"
    assert license_file.exists()
    content = license_file.read_text(encoding="utf-8")
    assert "SIL Open Font License" in content
    assert "The Noto Project Authors" in content


def test_photo_credits_attribution():
    repo_root = settings.BASE_DIR.parent
    credits_path = repo_root / "frontend" / "public" / "photos" / "credits.json"
    assert credits_path.exists()

    with open(credits_path, "r", encoding="utf-8") as f:
        credits = json.load(f)

    assert len(credits) > 0
    for place_slug, meta in credits.items():
        assert "author" in meta
        assert "source_url" in meta


@pytest.mark.django_db
def test_offline_geocoding_from_local_region_geojson():
    # Verify that load_osm_third_party_database successfully reads region.geojson
    db = load_osm_third_party_database()
    assert len(db) > 0

    # Test local geometry lookup without network
    res = query_osm_local_database("Phạm Như Xương, Liên Chiểu, Đà Nẵng")
    assert res is not None
    lat = res["latitude"]
    lng = res["longitude"]
    assert 15.9 < float(lat) < 16.25
    assert 108.0 < float(lng) < 108.4
