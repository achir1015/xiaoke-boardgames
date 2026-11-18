# 產生棋類大全圖示（1024 滿版、無透明）：木紋棋盤上有象棋「帥」、黑白圍棋子、紅綠藍跳棋彈珠
# 用法：python scripts/make_icon.py  → launcher/img/icon.png、ios/XiaokeBoardGames/Assets…、ios/Mac/Assets…
import math
import os
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 1024
random.seed(7)

# 木紋底
img = Image.new('RGB', (S, S), (214, 160, 92))
d = ImageDraw.Draw(img)
for y in range(S):
    t = y / S
    d.line([(0, y), (S, y)], fill=(int(226 - 40 * t), int(176 - 40 * t), int(108 - 30 * t)))
grain = Image.new('L', (S, S), 0)
gd = ImageDraw.Draw(grain)
for k in range(70):
    y0 = random.uniform(-100, S + 100)
    amp = random.uniform(6, 22)
    ph = random.uniform(0, 6.28)
    pts = [(x, y0 + amp * math.sin(x / random.uniform(120, 260) + ph)) for x in range(0, S + 8, 8)]
    gd.line(pts, fill=random.randint(18, 42), width=random.randint(2, 6))
grain = grain.filter(ImageFilter.GaussianBlur(2))
img = Image.composite(Image.new('RGB', (S, S), (120, 74, 34)), img, grain)
img = img.convert('RGBA')

# 淡淡的棋盤格線
lines = Image.new('RGBA', (S, S), (0, 0, 0, 0))
ld = ImageDraw.Draw(lines)
for i in range(1, 9):
    p = i * S / 9
    ld.line([(p, 0), (p, S)], fill=(70, 40, 18, 70), width=5)
    ld.line([(0, p), (S, p)], fill=(70, 40, 18, 70), width=5)
img = Image.alpha_composite(img, lines)


def shadow(box, blur=18, alpha=150, dx=10, dy=18):
    global img
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    x0, y0, x1, y1 = box
    ImageDraw.Draw(sh).ellipse((x0 + dx, y0 + dy, x1 + dx, y1 + dy), fill=(0, 0, 0, alpha))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(blur)))


def radial(cx, cy, r, inner, outer, hl=(0.35, 0.3)):
    """球面漸層圓（高光在左上）"""
    global img
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    steps = 70
    hx, hy = cx - r * hl[0], cy - r * hl[1]
    for k in range(steps):
        t = k / (steps - 1)
        rr = r * (1 - t)
        ccx = cx + (hx - cx) * t
        ccy = cy + (hy - cy) * t
        col = tuple(int(outer[j] + (inner[j] - outer[j]) * t) for j in range(3)) + (255,)
        ld.ellipse((ccx - rr, ccy - rr, ccx + rr, ccy + rr), fill=col)
    img = Image.alpha_composite(img, layer)


# 象棋「帥」：大棋子在左上
cx, cy, r = 400, 390, 270
shadow((cx - r, cy - r, cx + r, cy + r), blur=26, alpha=170, dx=16, dy=28)
d = ImageDraw.Draw(img)
d.ellipse((cx - r, cy - r + 26, cx + r, cy + r + 26), fill=(150, 98, 46, 255))   # 側邊厚度
radial(cx, cy, r, (255, 238, 200), (226, 184, 120), hl=(0.25, 0.3))
d = ImageDraw.Draw(img)
d.ellipse((cx - r + 30, cy - r + 30, cx + r - 30, cy + r - 30), outline=(186, 34, 28, 255), width=14)
font = None
for f in ('C:/Windows/Fonts/kaiu.ttf', 'C:/Windows/Fonts/msjhbd.ttc', 'C:/Windows/Fonts/msjh.ttc'):
    if os.path.exists(f):
        font = ImageFont.truetype(f, 330)
        break
d.text((cx, cy + 6), '帥', font=font, fill=(186, 34, 28, 255), anchor='mm')

# 圍棋黑白子：右下
for (gx, gy, black) in ((742, 690, True), (900, 820, False), (760, 900, False), (905, 640, True)):
    rr = 112
    shadow((gx - rr, gy - rr, gx + rr, gy + rr), blur=16, alpha=150, dx=8, dy=14)
    if black:
        radial(gx, gy, rr, (110, 110, 118), (14, 14, 18), hl=(0.38, 0.4))
    else:
        radial(gx, gy, rr, (255, 255, 255), (196, 196, 190), hl=(0.38, 0.4))

# 跳棋彈珠：左下三顆
for (mx, my, col) in ((250, 790, (229, 57, 53)), (430, 860, (47, 168, 79)), (250, 960, (31, 111, 224))):
    rr = 92
    shadow((mx - rr, my - rr, mx + rr, my + rr), blur=14, alpha=150, dx=8, dy=12)
    hi = tuple(min(255, int(c + (255 - c) * 0.75)) for c in col)
    lo = tuple(int(c * 0.45) for c in col)
    radial(mx, my, rr, hi, lo, hl=(0.42, 0.45))
    d = ImageDraw.Draw(img)
    d.ellipse((mx - rr * 0.55, my - rr * 0.62, mx - rr * 0.15, my - rr * 0.28), fill=(255, 255, 255, 190))

out = img.convert('RGB')
os.makedirs(os.path.join(ROOT, 'launcher', 'img'), exist_ok=True)
out.save(os.path.join(ROOT, 'launcher', 'img', 'icon-1024.png'))
out.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, 'launcher', 'img', 'icon.png'))
ios = os.path.join(ROOT, 'ios', 'XiaokeBoardGames', 'Assets.xcassets', 'AppIcon.appiconset')
if os.path.isdir(ios):
    out.save(os.path.join(ios, 'icon-1024.png'))
mac = os.path.join(ROOT, 'ios', 'Mac', 'Assets.xcassets', 'AppIcon.appiconset')
if os.path.isdir(mac):
    # Mac 圖示：圓角方塊＋四周留白（macOS 的圖示格式）
    for size in (16, 32, 128, 256, 512):
        for scale in (1, 2):
            px = size * scale
            canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
            body = out.resize((824, 824), Image.LANCZOS).convert('RGBA')
            mask = Image.new('L', (824, 824), 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, 823, 823), radius=185, fill=255)
            sh = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
            ImageDraw.Draw(sh).rounded_rectangle((100, 112, 924, 936), radius=185, fill=(0, 0, 0, 110))
            canvas = Image.alpha_composite(canvas, sh.filter(ImageFilter.GaussianBlur(14)))
            canvas.paste(body, (100, 100), mask)
            canvas.resize((px, px), Image.LANCZOS).save(os.path.join(mac, f'icon-{size}@{scale}x.png'))
print('icon ok')
