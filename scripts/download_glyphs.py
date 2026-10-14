"""Refresh only the font glyph ranges used by the local OSM snapshot."""
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parents[1] / "frontend/public/map"
region = json.loads((root / "region.geojson").read_text())
ranges = sorted({ord(char) // 256 * 256 for feature in region["features"] for char in feature["properties"].get("name", "")})
font = "Noto Sans Regular"
for start in ranges:
    target = root / "glyphs" / font / f"{start}-{start + 255}.pbf"
    if target.exists():
        continue
    url = f"https://tiles.openfreemap.org/fonts/{quote(font)}/{start}-{start + 255}.pbf"
    with urlopen(Request(url, headers={"User-Agent": "RendezLocal/1.0"}), timeout=30) as response:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(response.read())
    print(target.name)
print(f"Local glyphs ready: {len(ranges)} ranges.")
