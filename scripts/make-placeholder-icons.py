# Временные иконки и обложки: надпись «НЕ ПРО БЕГ» шрифтом Sofia Sans Extra Condensed 800 на coral.
# Запуск: python3 scripts/make-placeholder-icons.py public/fonts/sofia-sans-extra-condensed-cyrillic-800-normal.woff2 .
import sys
from PIL import Image, ImageDraw, ImageFont
font_path, out = sys.argv[1], sys.argv[2]
CORAL, TEXT = (237, 94, 90), (236, 236, 238)
LINES = ['НЕ', 'ПРО', 'БЕГ']

def square(size, pad):
    c = Image.new('RGB', (size, size), CORAL)
    d = ImageDraw.Draw(c)
    box = size * (1 - 2 * pad)
    fs = int(box / 3)
    font = ImageFont.truetype(font_path, fs)
    lh = int(fs * 0.86)
    total = lh * 3
    y0 = (size - total) / 2
    for i, t in enumerate(LINES):
        l, tp, r, b = font.getbbox(t)
        d.text(((size - (r - l)) / 2 - l, y0 + i * lh - tp + (lh - (b - tp)) / 2), t, font=font, fill=TEXT)
    return c

for s in (180, 192, 512):
    square(s, 0.1).save(f'{out}/public/icons/icon-{s}.png')
square(512, 0.22).save(f'{out}/public/icons/icon-maskable-512.png')
square(512, 0.1).save(f'{out}/public/cover-512.jpg', quality=90)
square(1024, 0.1).save(f'{out}/public/cover-1024.jpg', quality=90)
square(3000, 0.1).save(f'{out}/public/cover-3000.jpg', quality=88)
