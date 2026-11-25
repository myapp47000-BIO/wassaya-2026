"""Generate PWA icons for rusukh-tarkat-pwa (no external deps beyond Pillow)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
GREEN = "#0d5548"
CREAM = "#f5f2ea"
GOLD = "#d5a020"

FONT_CANDIDATES = [
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
]


def font(size):
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def make(size, maskable=False):
    img = Image.new("RGB", (size, size), GREEN)
    d = ImageDraw.Draw(img)
    pad = int(size * (0.16 if maskable else 0.08))
    d.rounded_rectangle((pad, pad, size-pad, size-pad), radius=int(size*0.10),
                        fill=CREAM, outline=GOLD, width=max(2, size//90))
    # book pages
    cx, cy = size/2, size*0.48
    d.polygon([(cx-size*0.24, cy-size*0.18), (cx-size*0.02, cy-size*0.10), (cx-size*0.02, cy+size*0.20), (cx-size*0.24, cy+size*0.12)], fill="#ffffff")
    d.polygon([(cx+size*0.24, cy-size*0.18), (cx+size*0.02, cy-size*0.10), (cx+size*0.02, cy+size*0.20), (cx+size*0.24, cy+size*0.12)], fill="#ffffff")
    d.line((cx, cy-size*0.10, cx, cy+size*0.20), fill=GOLD, width=max(2, size//100))
    for i in range(3):
        y = cy-size*0.05 + i*size*0.08
        d.line((cx-size*0.19, y, cx-size*0.05, y+size*0.02), fill=GREEN, width=max(1, size//160))
        d.line((cx+size*0.05, y+size*0.02, cx+size*0.19, y), fill=GREEN, width=max(1, size//160))
    # star
    d.text((cx, size*0.72), "✦", font=font(int(size*0.13)), fill=GOLD, anchor="mm")
    img.save(OUT / ("icon-maskable-%d.png" % size if maskable else ("favicon-32.png" if size == 32 else "icon-%d.png" % size)))


for s in (32, 192, 512):
    make(s)
for s in (192, 512):
    make(s, maskable=True)
print("icons written to", OUT)
