"""Fetch one bounded OSM extract and build a local GeoJSON basemap (ODbL)."""
import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.local/research/osm.json'
TARGET = ROOT / 'frontend/public/map'
TARGET.mkdir(parents=True, exist_ok=True)
bbox = '15.955,108.17,16.16,108.31'
query = f'[out:json][timeout:100];(way[highway~"^(trunk|primary|secondary|tertiary|residential|unclassified|trunk_link|primary_link|secondary_link|tertiary_link)$"]({bbox});way[natural=coastline]({bbox});way[natural=water]({bbox});relation[natural=water]({bbox});way[leisure=park]({bbox}););out geom;'
if not CACHE.exists():
    for host in ['https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']:
        try:
            request = Request(host, data=urlencode({'data':query}).encode(), headers={'User-Agent':'RendezLocal/1.0'})
            with urlopen(request, timeout=70) as response:
                CACHE.write_bytes(response.read())
            break
        except Exception as exc:
            print(type(exc).__name__, host, flush=True)
            time.sleep(2)
    else:
        raise SystemExit('Could not download local map.')
data = json.loads(CACHE.read_text())
features = []
coasts = []
def coords(item):
    return [[x['lon'],x['lat']] for x in item.get('geometry',[]) if 'lon' in x]
def stitch(parts):
    rings = []
    while parts:
        ring = parts.pop()
        while ring[0] != ring[-1]:
            found = False
            for i, segment in enumerate(parts):
                if ring[-1] == segment[0]:
                    ring.extend(segment[1:]); found = True
                elif ring[-1] == segment[-1]:
                    ring.extend(segment[-2::-1]); found = True
                elif ring[0] == segment[-1]:
                    ring = segment[:-1] + ring; found = True
                elif ring[0] == segment[0]:
                    ring = segment[:0:-1] + ring; found = True
                if found:
                    parts.pop(i); break
            if not found: break
        rings.append(ring)
    return rings
for item in data['elements']:
    tags = item.get('tags',{})
    points = coords(item)
    if item['type'] == 'relation':
        for ring in stitch([coords(m) for m in item.get('members',[]) if m.get('role') == 'outer' and coords(m)]):
            if len(ring)>3 and ring[0] == ring[-1]:
                features.append({'type':'Feature','properties':{'kind':'water'},'geometry':{'type':'Polygon','coordinates':[ring]}})
    elif len(points) >= 2:
        kind = 'road' if 'highway' in tags else 'coast' if tags.get('natural')=='coastline' else 'water' if tags.get('natural')=='water' else 'park'
        if kind == 'coast': coasts.append(points)
        polygon = kind in ('water','park') and len(points)>3 and points[0] == points[-1]
        features.append({'type':'Feature','properties':{'kind':kind,'class':tags.get('highway',''),'name':tags.get('name','')},'geometry':{'type':'Polygon' if polygon else 'LineString','coordinates':[points] if polygon else points}})
# Close complete coastline segments towards the eastern edge; OSM coastlines are real geometry.
for coast in stitch(coasts):
    if len(coast) > 15 and abs(coast[-1][1]-coast[0][1]) > .03:
        ring = coast + [[108.5,coast[-1][1]],[108.5,coast[0][1]],coast[0]]
        features.insert(0, {'type':'Feature','properties':{'kind':'water'},'geometry':{'type':'Polygon','coordinates':[ring]}})
(TARGET / 'region.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features}, ensure_ascii=False, separators=(',',':')))
print(f'Local OSM map: {len(features)} features, {(TARGET / "region.geojson").stat().st_size // 1024} KiB')
