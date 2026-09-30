"""Generates launcher icons + splash screens from the ChronoSprint logo (gradient + clock)."""
import os, glob
import numpy as np
from PIL import Image, ImageDraw

RES = 'android/app/src/main/res'
SS = 4  # supersampling

def gradient(size):
    # bottom-left -> top-right : indigo-600, indigo-500, emerald-400
    stops = [(0.0, (79, 70, 229)), (0.5, (99, 102, 241)), (1.0, (52, 211, 153))]
    y, x = np.mgrid[0:size, 0:size]
    t = ((x / (size - 1)) + (1 - y / (size - 1))) / 2.0
    out = np.zeros((size, size, 3), dtype=np.float32)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        f = ((t - t0) / (t1 - t0))[m][:, None]
        out[m] = np.array(c0) * (1 - f) + np.array(c1) * f
    return Image.fromarray(out.astype(np.uint8), 'RGB').convert('RGBA')

def clock_glyph(size, diameter_frac):
    """White clock (ring + hands) on transparent, like the heroicons clock used in the app header."""
    S = size * SS
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    unit = S * diameter_frac / 18.0          # the glyph spans 18 units (3..21) in a 24-unit grid
    cx = cy = S / 2
    def P(x, y):                              # 24-grid -> pixels, centred on (12,12)
        return (cx + (x - 12) * unit, cy + (y - 12) * unit)
    w = 2.2 * unit
    r = 9 * unit
    d.ellipse([cx - r - w / 2, cy - r - w / 2, cx + r + w / 2, cy + r + w / 2], fill=(255, 255, 255, 255))
    d.ellipse([cx - r + w / 2, cy - r + w / 2, cx + r - w / 2, cy + r - w / 2], fill=(0, 0, 0, 0))
    pts = [P(12, 8), P(12, 12), P(15, 15)]
    d.line(pts, fill=(255, 255, 255, 255), width=int(w), joint='curve')
    for p in pts:
        d.ellipse([p[0] - w / 2, p[1] - w / 2, p[0] + w / 2, p[1] + w / 2], fill=(255, 255, 255, 255))
    return img.resize((size, size), Image.LANCZOS)

def rounded_mask(size, radius_frac):
    S = size * SS
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_frac), fill=255)
    return m.resize((size, size), Image.LANCZOS)

def circle_mask(size):
    S = size * SS
    m = Image.new('L', (S, S), 0)
    ImageDraw.Draw(m).ellipse([0, 0, S - 1, S - 1], fill=255)
    return m.resize((size, size), Image.LANCZOS)

def legacy_icon(size, round_=False):
    img = gradient(size)
    img.alpha_composite(clock_glyph(size, 0.56))
    img.putalpha(circle_mask(size) if round_ else rounded_mask(size, 0.22))
    return img

DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in DENS.items():
    legacy = round(48 * k); adaptive = round(108 * k)
    d = f'{RES}/mipmap-{name}'
    legacy_icon(legacy).save(f'{d}/ic_launcher.png')
    legacy_icon(legacy, True).save(f'{d}/ic_launcher_round.png')
    fg = Image.new('RGBA', (adaptive, adaptive), (0, 0, 0, 0))
    fg.alpha_composite(clock_glyph(adaptive, 0.50))
    fg.save(f'{d}/ic_launcher_foreground.png')
    gradient(adaptive).save(f'{d}/ic_launcher_background.png')

# Splash: black screen, centred logo tile (~28% of the shorter side)
for path in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(path).size
    img = Image.new('RGBA', (w, h), (0, 0, 0, 255))
    tile = int(min(w, h) * 0.28)
    logo = gradient(tile); logo.alpha_composite(clock_glyph(tile, 0.56)); logo.putalpha(rounded_mask(tile, 0.24))
    img.alpha_composite(logo, ((w - tile) // 2, (h - tile) // 2))
    img.convert('RGB').save(path)

# Adaptive icon XML now uses the gradient PNG as background
for n in ('ic_launcher', 'ic_launcher_round'):
    open(f'{RES}/mipmap-anydpi-v26/{n}.xml', 'w').write(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
        '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
        '</adaptive-icon>\n')
print('icons + splash generated')
