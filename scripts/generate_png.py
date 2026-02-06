from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
dst = ROOT / 'assets' / 'preview.png'
dst.parent.mkdir(parents=True, exist_ok=True)

W, H = 1200, 630
img = Image.new('RGB', (W, H), '#eef2f7')
draw = ImageDraw.Draw(img)

# Header text
title = 'Layout_aria_CSS'
subtitle = 'Flexbox centralizado horizontal e verticalmente'

def load_font(size):
    for path in [
        'C:/Windows/Fonts/segoeui.ttf',
        'C:/Windows/Fonts/arial.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except Exception:
                continue
    return ImageFont.load_default()

font_title = load_font(56)
font_sub = load_font(26)
font_box = load_font(22)

draw.text((80, 120), title, fill='#0f172a', font=font_title)
draw.text((80, 170), subtitle, fill='#475569', font=font_sub)

# Cards positions and colors
cards = [
    ((80, 250, 260, 430), '#e9f5ff'),
    ((300, 250, 480, 430), '#e9fde9'),
    ((520, 250, 700, 430), '#ffeaea'),
]

def rounded_rectangle(draw, xy, r, fill, outline=None):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill, outline=outline)

for i, (rect, color) in enumerate(cards, start=1):
    rounded_rectangle(draw, rect, r=16, fill=color, outline='#d5d8df')
    cx = (rect[0] + rect[2]) // 2
    cy = (rect[1] + rect[3]) // 2
    text = f'Caixa {i}'
    tw, th = draw.textbbox((0,0), text, font=font_box)[2:]
    draw.text((cx - tw//2, cy - th//2), text, fill='#0f172a', font=font_box)

# CTA button
btn_rect = (880, 520, 1180, 576)
rounded_rectangle(draw, btn_rect, r=12, fill='#0ea5e9')
btn_text = 'Ver Demo'
tw, th = draw.textbbox((0,0), btn_text, font=font_box)[2:]
draw.text(( (btn_rect[0]+btn_rect[2])//2 - tw//2, (btn_rect[1]+btn_rect[3])//2 - th//2 ), btn_text, fill='white', font=font_box)

img.save(dst, format='PNG')
print(f'Wrote {dst} ({dst.stat().st_size} bytes)')
