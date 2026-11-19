"""Build full-bleed Android icon sources from the iOS app icon (rounded dark corners baked in).

Usage (from frontend/):
    uv run --with pillow --with numpy python scripts/android-icons.py \\
        ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png assets
    npx @capacitor/assets@3 generate --android --iconBackgroundColor '#0E1530' \\
        --iconBackgroundColorDark '#0E1530' --splashBackgroundColor '#0E1530' \\
        --splashBackgroundColorDark '#0E1530'
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

src_path, out_dir = sys.argv[1], sys.argv[2]
src = Image.open(src_path).convert("RGB")
S = src.size[0]  # 1024
scale = 0.85     # the generator insets the layer 16.7%: the whole image is the visible area

# Gradient only (strokes blurred away), without the baked rounded corners.
m = int(S * 0.08)
grad = src.crop((m, m, S - m, S - m)).filter(ImageFilter.GaussianBlur(45))

# Same gradient at the artwork's scale, extended to the full canvas by edge padding:
# its colours match the shrunk logo's own background, so the seam disappears.
gs = grad.resize((int((S - 2 * m) * scale),) * 2, Image.LANCZOS)
a = np.asarray(gs)
pad_lo = (S - gs.size[0]) // 2
pad_hi = S - gs.size[0] - pad_lo
backdrop = Image.fromarray(np.pad(a, ((pad_lo, pad_hi), (pad_lo, pad_hi), (0, 0)), mode="edge"))
backdrop = backdrop.filter(ImageFilter.GaussianBlur(30))

art = src.resize((int(S * scale),) * 2, Image.LANCZOS)
r = art.size[0]
mask = Image.new("L", art.size, 0)
ImageDraw.Draw(mask).ellipse((r * 0.07, r * 0.07, r * 0.93, r * 0.93), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(r * 0.03))

full = backdrop.copy()
off = (S - r) // 2
full.paste(art, (off, off), mask)

full.save(f"{out_dir}/icon-only.png")
full.save(f"{out_dir}/icon-background.png")
Image.new("RGBA", (S, S), (0, 0, 0, 0)).save(f"{out_dir}/icon-foreground.png")

# Splash: night background with the icon, rounded, in the middle.
for name in ("splash.png", "splash-dark.png"):
    sp = Image.new("RGB", (2732, 2732), (0x0E, 0x15, 0x30))
    ic = full.resize((600, 600), Image.LANCZOS)
    rm = Image.new("L", ic.size, 0)
    ImageDraw.Draw(rm).rounded_rectangle((0, 0, 600, 600), radius=130, fill=255)
    sp.paste(ic, ((2732 - 600) // 2, (2732 - 600) // 2), rm)
    sp.save(f"{out_dir}/{name}")
print("ok")
