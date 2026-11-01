"""Materialize the reviewed Commons manifest and local JPEG files, no fake imagery."""
import hashlib
import json
import shutil
import time
from pathlib import Path
from urllib.request import Request, urlopen
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
photos_dir = ROOT / 'data/photos'
photos_dir.mkdir(parents=True,exist_ok=True)
cache = {}
for p in (ROOT / '.local/research').glob('[0-9][0-9].json'):
    cache.update({x['title']: x for x in json.loads(p.read_text()).get('query',{}).get('pages',{}).values()})

# Address source is kept per place; photo caption and tags are kept per image.
places = [
('oxy-garden','Oxy Garden Coffee','cafe','Đường Trần Quốc Vượng, khu đô thị FPT, Đà Nẵng',None,None,'https://shopeefood.vn/da-nang/oxy-garden-coffee-tran-quoc-vuong','Quán cà phê trong khu đô thị FPT, gần FPT Complex.', ['Quán Cà Phê Oxy Garden.jpg','Quán Cà Phê Oxy Garden (14224).jpg','Quán Cà Phê Oxy Garden (43495).jpg']),
('truc-lam-vien','Trúc Lâm Viên','cafe','8–10 Trần Quý Cáp, Đà Nẵng',16.081833,108.221833,'https://truclamvien.vn/','Quán cà phê và nhà hàng trên đường Trần Quý Cáp.',['Truc Lam Vien Coffeeshop DN.JPG']),
('highlands-indochina','Highlands Coffee · Indochina','cafe','74 Bạch Đằng, Đà Nẵng',16.069833,108.225167,'https://www.highlandscoffee.com.vn/vn/he-thong-cua-hang/10/duong-dai-hoa-tranh-dong-ho-.html','Cửa hàng Highlands Coffee tại Indochina Riverside, bên sông Hàn.',['Highlands Coffee storefront DN.JPG','Highlands Coffee drip filter and cup.jpg']),
('cho-han','Chợ Hàn','market','119 Trần Phú, Đà Nẵng',16.067875,108.224636,'https://trademap.danang.gov.vn/','Chợ ở trung tâm thành phố, gần đường Bạch Đằng và sông Hàn.',['Han Market 1.jpg','Han Market 2.jpg','Produce in Han Market - Da Nang, Vietnam - DSC02385.JPG']),
('cho-con','Chợ Cồn','market','290 Hùng Vương, Đà Nẵng',16.067439,108.213565,'https://commons.wikimedia.org/wiki/Category:Con_Market','Chợ tại góc đường Hùng Vương và Ông Ích Khiêm.',['Con Market 1.jpg','Con Market 2.jpg','Con Market at sunset.jpg']),
('cau-rong','Cầu Rồng','riverside','Đường Nguyễn Văn Linh – Võ Văn Kiệt, Đà Nẵng',16.061174,108.227292,'https://commons.wikimedia.org/wiki/Category:Dragon_Bridge_(Danang)','Cầu bắc qua sông Hàn, nối đường Nguyễn Văn Linh với Võ Văn Kiệt.',['Da Nang Dragon Bridge (I).jpg','Cầu Rồng.jpg','Dragon Bridge 01.jpg','Dragon Bridge 02.jpg']),
('cau-song-han','Cầu Sông Hàn','riverside','Đường Lê Duẩn – Phạm Văn Đồng, Đà Nẵng',16.072094,108.226251,'https://commons.wikimedia.org/wiki/Category:Han_River_Bridge','Cầu nối hai bờ sông Hàn, trên trục Lê Duẩn và Phạm Văn Đồng.',['Han River Bridge 1.jpg','Han River Bridge 2.jpg','Han River Bridge, Da Nang, 20241209, Ansicht01.jpeg']),
('cau-tran-thi-ly','Cầu Trần Thị Lý','riverside','Đường 2 Tháng 9 – Nguyễn Văn Thoại, Đà Nẵng',16.047929,108.230423,'https://commons.wikimedia.org/wiki/Category:Tran_Thi_Ly_Bridge','Cầu dây văng bắc qua sông Hàn, phía nam cầu Rồng.',['Tran Thi Ly Bridge (I).jpg','Trần Thị Lý Bridge at daytime.jpg','Red Night at Tran Thi Ly Bridge (Unsplash).jpg']),
('nha-tho-con-ga','Nhà thờ Con Gà','culture','156 Trần Phú, Đà Nẵng',16.06609,108.223439,'https://visitdanang.org/nha-tho-con-ga-the-gothic-architectural-style-church-in-da-nang/','Nhà thờ Chính tòa Đà Nẵng trên đường Trần Phú. Tôn trọng không gian hành lễ khi ghé thăm.',['Da Nang Cathedral 2026 05 05.jpg','Da Nang Cathedral in 2015 01.jpg','Nhà thờ Con Gà Đà Nẵng.jpg']),
('bao-tang-cham','Bảo tàng Điêu khắc Chăm','culture','2 đường 2 Tháng 9, Đà Nẵng',16.06046,108.22322,'https://danangfantasticity.com/wp-content/uploads/2026/01/Ho-Chieu-Di-san-Da-Nang.pdf','Bảo tàng trưng bày điêu khắc và hiện vật văn hóa Chăm, gần đầu phía tây cầu Rồng.',['Bảo tàng Nghệ thuật điêu khắc Chàm Đà Nẵng.jpg','Interior view - Museum of Cham Sculpture - Danang, Vietnam - DSC01931.JPG','Terrace - Museum of Cham Sculpture - Danang, Vietnam - DSC01987.JPG']),
('bien-my-khe','Biển Mỹ Khê','beach','Đường Võ Nguyên Giáp, Đà Nẵng',16.063935,108.246976,'https://commons.wikimedia.org/wiki/Category:My_Khe_Beach','Bãi biển ven đường Võ Nguyên Giáp, phía đông trung tâm Đà Nẵng.',['My Khe Beach 1.jpg','My Khe Beach 10.jpg','My Khe Beach 13.jpg','Bai bien My Khe.jpg']),
('bien-non-nuoc','Biển Non Nước','beach','Đường Trường Sa, khu vực Ngũ Hành Sơn, Đà Nẵng',15.9986,108.2721,'https://commons.wikimedia.org/wiki/Category:Non_Nuoc_Beach','Bãi biển ở khu vực Ngũ Hành Sơn, dọc đường Trường Sa.',['Non nuoc Basket boats.jpg']),
('chua-linh-ung','Chùa Linh Ứng · Sơn Trà','culture','Đường Hoàng Sa, bán đảo Sơn Trà, Đà Nẵng',16.100548,108.277572,'https://commons.wikimedia.org/wiki/Category:Linh_Ung_Pagoda','Chùa trên bán đảo Sơn Trà, nhìn về phía biển. Giữ yên lặng và mặc trang phục phù hợp khi vào chùa.',['2024-12-07 Linh Ung Pagoda 1.jpg','2024-12-07 Linh Ung Pagoda 2.jpg','Chùa Linh Ứng - Sơn Trà - NKS.jpg']),
('ngu-hanh-son','Danh thắng Ngũ Hành Sơn','nature','81 Huyền Trân Công Chúa, Đà Nẵng',16.003868,108.263351,'https://nguhanhson.org/','Quần thể núi đá với các hang động và chùa. Lối tham quan có nhiều bậc thang.',['Hiking at Marble Mountains, Da Nang, Vietnam.jpg','Da Nang - coastal view from Marble Mountains Mar 2024 01.jpg','Da Nang Marble Mountains 2020 IMG 4008.jpg']),
]
old_path = ROOT / 'data/danang.json'
old_tags = {photo['file']:photo.get('tags',[]) for place in json.loads(old_path.read_text())['places'] for photo in place['photos']} if old_path.exists() else {}
manifest = {'checked_at':'2026-10-13','categories':{'cafe':'Cà phê','market':'Chợ & ẩm thực','riverside':'Ven sông','beach':'Biển','culture':'Văn hóa','nature':'Thiên nhiên'},'places':[]}
for slug,name,category,address,lat,lng,source,description,titles in places:
    entry = dict(slug=slug,name=name,category=category,address=address,latitude=lat,longitude=lng,source_url=source,description=description,photos=[])
    for title in titles:
        item = cache['File:'+title]['imageinfo'][0]
        basename=hashlib.sha256(title.encode()).hexdigest()[:16]+'.jpg'
        dest=photos_dir/basename
        if not dest.exists():
            for attempt in range(4):
                try:
                    with urlopen(Request(item['thumburl'],headers={'User-Agent':'RendezLocal/1.0 (attributed local gallery)'}),timeout=60) as response:
                        raw=response.read()
                    raw_path=ROOT/'.local/research/download-image'
                    raw_path.write_bytes(raw)
                    with Image.open(raw_path) as img:
                        img=ImageOps.exif_transpose(img).convert('RGB')
                        img.thumbnail((1600,1800))
                        img.save(dest,'JPEG',quality=87,optimize=True)
                    break
                except Exception:
                    if attempt==3: raise
                    time.sleep(3+attempt)
        entry['photos'].append({'file':basename,'caption':name,'tags':old_tags.get(basename,[])})
        print(name,basename,flush=True)
    manifest['places'].append(entry)
(ROOT/'data/danang.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# The first photo of these places is also used on the login and discovery headers.
public=ROOT/'frontend/public/photos'; public.mkdir(exist_ok=True)
for key,dest in [('bien-my-khe','danang-beach.jpg'),('oxy-garden','danang-cafe.jpg'),('cau-rong','danang-river.jpg')]:
    place=next(p for p in manifest['places'] if p['slug']==key)
    shutil.copyfile(photos_dir/place['photos'][0]['file'],public/dest)
print('Manifest:',len(manifest['places']),'places,',sum(len(p['photos']) for p in manifest['places']),'photos')
