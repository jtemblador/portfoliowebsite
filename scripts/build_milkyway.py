#!/usr/bin/env python3
"""
build_milkyway.py — Bake the Milky Way glow texture for the star viewer.

Source: ESO/S. Brunier all-sky panorama (eso0932a, CC BY 4.0) — a plate
carrée map in galactic coordinates: l = 0 at center increasing leftward,
b = +90 at top.

The photo's point stars are removed (the viewer draws real catalog stars),
the sky background is subtracted, and the result is saved as a small
equirectangular texture.

Requires Pillow + numpy.  Output: data/milkyway.jpg
"""

import os
import urllib.request

import numpy as np
from PIL import Image, ImageFilter

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "data")
SRC_PATH = os.path.join(DATA_DIR, "eso0932a.jpg")
OUT_PATH = os.path.join(DATA_DIR, "milkyway.jpg")
SRC_URL = "https://cdn.eso.org/images/large/eso0932a.jpg"

OUT_SIZE = (1024, 512)

# Compact glows that survive the star filter but aren't fixed sky features
# (a planet in the source photo): (l, b, radius) in degrees.
ARTIFACTS = [(69.3, -58.4, 2.5)]


def patch_artifacts(a):
    """Replace each artifact disk with the median of a surrounding ring."""
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    for l, b, r in ARTIFACTS:
        x0 = ((0.5 - l / 360) % 1) * w
        y0 = (0.5 - b / 180) * h
        rp = r / 180 * h
        d = np.hypot(xx - x0, yy - y0)
        ring = (d > rp) & (d < 2 * rp)
        a[d <= rp] = np.median(a[ring], axis=0)
    return a


def main():
    if not os.path.exists(SRC_PATH):
        print("Downloading ESO panorama...")
        urllib.request.urlretrieve(SRC_URL, SRC_PATH)

    im = Image.open(SRC_PATH).convert("RGB")

    # Remove point stars: shrink, then median-filter away anything a few
    # pixels wide. Diffuse structure (star clouds, dust lanes) survives.
    im = im.resize((2048, 1024), Image.LANCZOS)
    im = im.filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.MedianFilter(5))
    im = im.resize(OUT_SIZE, Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.2))

    a = patch_artifacts(np.asarray(im).astype(np.float32) / 255.0)

    # Subtract the dark-sky floor so empty sky renders as true black, then
    # stretch so the galactic core lands near full scale.
    lum = a.mean(axis=2)
    floor = np.percentile(lum, 35)
    peak = np.percentile(lum, 99.95)
    a = np.clip((a - floor) / (peak - floor), 0, 1)

    # Soft threshold: drop the faintest wings, which read as gray haze
    a = np.clip((a - 0.04) / 0.96, 0, 1)

    # Gentle gamma keeps the faint outer band visible; mild desaturation —
    # to the naked eye the Milky Way is nearly colorless.
    a = a ** 0.85
    gray = a.mean(axis=2, keepdims=True)
    a = gray + (a - gray) * 0.55

    out = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
    out.save(OUT_PATH, quality=85)
    print(f"Wrote {OUT_PATH} ({os.path.getsize(OUT_PATH) // 1024} KB)")


if __name__ == "__main__":
    main()
