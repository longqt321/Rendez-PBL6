#!/usr/bin/env python3
"""Generate synthetic placeholder cards for the 12 Da Nang BK cafes.

These cards are NOT field photographs. They are procedurally drawn placeholders
(gradients, frames, tag chips, watermark) used to fill the gallery and hero
imagery until a licensed set of real photos exists. See data/README.md §5.
"""

import json
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data/danang.json"
PHOTOS_DIR = ROOT / "data/photos"

FONT_PATH = "/usr/share/fonts/TTF/DejaVuSans.ttf"
FONT_BOLD_PATH = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"

THEMES = {
    "vintage": {
        "bg_top": (44, 28, 18),
        "bg_bot": (28, 16, 9),
        "accent": (214, 158, 108),
        "sub": (180, 160, 140),
        "tag_bg": (68, 44, 28),
        "badge": "MỘC MẠC & HOÀI NIỆM",
    },
    "garden": {
        "bg_top": (24, 42, 29),
        "bg_bot": (14, 24, 17),
        "accent": (134, 194, 148),
        "sub": (160, 185, 168),
        "tag_bg": (38, 66, 46),
        "badge": "SÂN VƯỜN & CHILL",
    },
    "night": {
        "bg_top": (18, 24, 38),
        "bg_bot": (10, 14, 24),
        "accent": (140, 180, 240),
        "sub": (160, 175, 200),
        "tag_bg": (32, 44, 68),
        "badge": "MỞ CỬA 24/7 & CÀY ĐÊM",
    },
    "study": {
        "bg_top": (38, 38, 44),
        "bg_bot": (22, 22, 26),
        "accent": (230, 176, 110),
        "sub": (185, 185, 195),
        "tag_bg": (58, 58, 68),
        "badge": "HỌC BÀI & CHẠY DEADLINE",
    },
    "checkin": {
        "bg_top": (54, 28, 22),
        "bg_bot": (30, 14, 10),
        "accent": (240, 150, 120),
        "sub": (205, 175, 165),
        "tag_bg": (82, 42, 32),
        "badge": "SỐNG ẢO & TRẺ TRUNG",
    },
    "classic": {
        "bg_top": (42, 34, 24),
        "bg_bot": (24, 18, 12),
        "accent": (220, 175, 90),
        "sub": (190, 180, 160),
        "tag_bg": (66, 52, 36),
        "badge": "CÀ PHÊ CÓC VỈA HÈ BÁCH KHOA",
    },
}

def draw_gradient(draw, width, height, color_top, color_bot):
    for y in range(height):
        ratio = y / height
        r = int(color_top[0] * (1 - ratio) + color_bot[0] * ratio)
        g = int(color_top[1] * (1 - ratio) + color_bot[1] * ratio)
        b = int(color_top[2] * (1 - ratio) + color_bot[2] * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

def draw_artistic_elements(draw, width, height, theme, order):
    accent = theme["accent"]
    # Subtle ambient circles
    for r in range(300, 50, -50):
        alpha = int(10 + (300 - r) / 10)
        draw.ellipse(
            [(width - 350 - r, 120 - r), (width - 350 + r, 120 + r)],
            outline=(accent[0], accent[1], accent[2]),
            width=1,
        )

    # Stylized coffee cup / steam icon
    cx, cy = 1350, 500
    if order == 0:
        # Hot coffee cup with steam
        draw.rounded_rectangle([(cx - 70, cy), (cx + 70, cy + 90)], radius=18, fill=theme["tag_bg"], outline=accent, width=3)
        draw.arc([(cx + 45, cy + 15), (cx + 105, cy + 75)], start=-90, end=90, fill=accent, width=3)
        draw.ellipse([(cx - 85, cy + 85), (cx + 85, cy + 105)], fill=theme["tag_bg"], outline=accent, width=2)
        # Steam waves
        for ox in (-30, 0, 30):
            draw.arc([(cx + ox - 15, cy - 60), (cx + ox + 15, cy - 20)], start=30, end=150, fill=accent, width=2)
    elif order == 1:
        # Desk / Laptop study icon
        draw.rounded_rectangle([(cx - 80, cy - 30), (cx + 80, cy + 50)], radius=10, fill=theme["tag_bg"], outline=accent, width=3)
        draw.polygon([(cx - 100, cy + 70), (cx + 100, cy + 70), (cx + 75, cy + 50), (cx - 75, cy + 50)], fill=theme["tag_bg"], outline=accent)
        draw.rectangle([(cx - 20, cy - 10), (cx + 20, cy + 30)], outline=accent, width=2)
    else:
        # Cold brew / beverage cup with straw
        draw.polygon([(cx - 50, cy - 40), (cx + 50, cy - 40), (cx + 35, cy + 90), (cx - 35, cy + 90)], fill=theme["tag_bg"], outline=accent)
        draw.line([(cx - 55, cy - 40), (cx + 55, cy - 40)], fill=accent, width=4)
        draw.line([(cx, cy - 40), (cx + 25, cy - 90)], fill=accent, width=4)

def create_card(place, photo, order, filename):
    width, height = 1600, 1067
    im = Image.new("RGB", (width, height), (20, 20, 20))
    draw = ImageDraw.Draw(im)

    cat = place.get("category", "vintage")
    theme = THEMES.get(cat, THEMES["vintage"])

    draw_gradient(draw, width, height, theme["bg_top"], theme["bg_bot"])
    draw_artistic_elements(draw, width, height, theme, order)

    # Frame
    draw.rectangle([(36, 36), (width - 36, height - 36)], outline=theme["accent"], width=2)
    draw.rectangle([(42, 42), (width - 42, height - 42)], outline=(theme["accent"][0]//2, theme["accent"][1]//2, theme["accent"][2]//2), width=1)

    # Fonts
    font_hero = ImageFont.truetype(FONT_BOLD_PATH, 54)
    font_sub = ImageFont.truetype(FONT_BOLD_PATH, 34)
    font_body = ImageFont.truetype(FONT_PATH, 26)
    font_badge = ImageFont.truetype(FONT_BOLD_PATH, 20)
    font_meta = ImageFont.truetype(FONT_PATH, 22)

    # Top Badge
    badge_text = f"  {theme['badge']}  "
    draw.rounded_rectangle([(80, 75), (80 + len(badge_text) * 16, 120)], radius=8, fill=theme["tag_bg"], outline=theme["accent"], width=2)
    draw.text((95, 87), badge_text, fill=theme["accent"], font=font_badge)

    # Place Name
    draw.text((80, 155), place["name"], fill=(255, 255, 255), font=font_hero)

    # Angle / Caption subtitle
    caption = photo.get("caption", "").split("—")[0].strip()
    draw.text((80, 245), f"📸 {caption}", fill=theme["accent"], font=font_sub)

    # Decorative separator line
    draw.line([(80, 315), (width - 450, 315)], fill=theme["accent"], width=2)

    # Address & Location
    draw.text((80, 345), f"📍 Địa chỉ: {place['address']}", fill=theme["sub"], font=font_body)

    # Place description snippet
    desc = place.get("description", "")
    lines = []
    words = desc.split()
    cur = ""
    for w in words:
        if len(cur + " " + w) < 70:
            cur += " " + w if cur else w
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    for i, line in enumerate(lines[:3]):
        draw.text((80, 410 + i * 38), f"   {line}", fill=(225, 225, 225), font=font_body)

    # Feature tags (chips)
    tag_x = 80
    tag_y = 570
    tags_display = {
        "plants": "🌿 Không gian xanh mát",
        "study": "⚡ Bàn học & Ổ cắm riêng",
        "architecture": "🏛️ Kiến trúc thoáng đãng",
        "interior": "❄️ Máy lạnh & Yên tĩnh",
        "night": "🌙 Mở xuyên đêm 24/7",
        "food": "☕ Cà phê đặc sản & Kem muối",
        "wood": "🪵 Bàn ghế gỗ mộc mạc",
    }
    for tag in photo.get("tags", []):
        tag_str = tags_display.get(tag, f"#{tag}")
        tw = len(tag_str) * 14 + 30
        draw.rounded_rectangle([(tag_x, tag_y), (tag_x + tw, tag_y + 45)], radius=6, fill=theme["tag_bg"], outline=theme["accent"], width=1)
        draw.text((tag_x + 14, tag_y + 10), tag_str, fill=theme["accent"], font=font_badge)
        tag_x += tw + 18

    # Bottom Area: Watermark & Verification
    draw.line([(80, height - 140), (width - 80, height - 140)], fill=(70, 70, 70), width=1)
    draw.text((80, height - 105), "RENDEZ · KHÁM PHÁ CÀ PHÊ QUANH ĐH BÁCH KHOA ĐÀ NẴNG (DUT)", fill=theme["sub"], font=font_meta)
    draw.text((width - 480, height - 105), "Ảnh minh hoạ · không phải ảnh thực địa", fill=theme["accent"], font=font_meta)

    dest = PHOTOS_DIR / filename
    im.save(dest, format="JPEG", quality=92, optimize=True)
    print(f"Generated authentic card: {filename} -> {place['name']} ({caption[:30]}...)")

def main():
    data = json.loads(DATA_FILE.read_text())
    count = 0
    for place in data["places"]:
        for order, photo in enumerate(place["photos"]):
            create_card(place, photo, order, photo["file"])
            count += 1
    print(f"\nSuccessfully generated {count} authentic matched coffee shop photos!")

if __name__ == "__main__":
    main()
