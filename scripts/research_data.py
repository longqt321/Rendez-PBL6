"""Cache Commons source metadata locally; this script never writes to a database."""
import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.local' / 'research'
CACHE.mkdir(parents=True, exist_ok=True)
CATEGORIES = ['Cafés in Da Nang', 'Han Market', 'Con Market', 'Dragon Bridge (Danang)', 'Han River Bridge', 'Da Nang Cathedral', 'Museum of Cham Sculpture', 'My Khe Beach', 'Linh Ung Pagoda', 'Ngũ Hành Sơn', 'Parks in Da Nang', 'Tran Thi Ly Bridge', 'Love Lock Bridge (Da Nang)', 'Non Nuoc Beach']

def api(**params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urlencode({'format': 'json', **params})
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'RendezLocal/1.0 (local educational place directory)'}), timeout=60) as response:
                return json.load(response)
        except Exception:
            if attempt == 3:
                raise
            time.sleep(2 + attempt)

for i, category in enumerate(CATEGORIES):
    path = CACHE / f'{i:02d}.json'
    if path.exists() and json.loads(path.read_text()).get('query', {}).get('pages') :
        data = json.loads(path.read_text())
    else:
        data = api(action='query', generator='categorymembers', gcmtitle='Category:' + category, gcmtype='file', gcmlimit=40, prop='imageinfo', iiprop='url|extmetadata', iiurlwidth=1400)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    pages = data.get('query', {}).get('pages', {})
    print(category, len(pages))
    for page in list(pages.values())[:40]:
        print(' ', page['title'])
