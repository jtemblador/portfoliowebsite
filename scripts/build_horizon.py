#!/usr/bin/env python3
"""
build_horizon.py — Compute the real horizon profile around the observer.

Ray-marches outward along each azimuth over a terrain elevation model and
records the highest apparent altitude (with Earth curvature and standard
refraction). The observer location is read from js/viewer/config.js, so
re-run this after changing it.

Source: AWS Terrain Tiles (Mapzen/Tilezen; SRTM, USGS NED and others).
Requires Pillow + numpy.  Output: data/horizon.json
"""

import json
import math
import os
import re
import urllib.request

import numpy as np
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
CACHE_DIR = os.path.join(DATA_DIR, "terrain_cache")
OUT_PATH = os.path.join(DATA_DIR, "horizon.json")
TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"

ZOOM_FAR = 11          # ~65 m/pixel at this latitude
ZOOM_NEAR = 13         # ~16 m/pixel — keeps nearby peaks from being shaved
NEAR_DIST_M = 12_000
MAX_DIST_M = 80_000    # far mountains past this are < ~0.5° tall
MIN_DIST_M = 200       # skip the observer's own block (DEM noise)
EYE_HEIGHT_M = 2
AZ_STEP = 0.5
EARTH_R = 6_371_000
REFRACTION_K = 0.13


def observer_from_config():
    src = open(os.path.join(PROJECT_DIR, "js", "viewer", "config.js")).read()
    lat = float(re.search(r"LAT_LA\s*=\s*(-?[\d.]+)", src).group(1))
    lon = float(re.search(r"LON_LA\s*=\s*(-?[\d.]+)", src).group(1))
    return lat, lon


def global_px(lat, lon, zoom):
    """Lat/lon → global Web Mercator pixel coords at the given zoom."""
    n = 2 ** zoom * 256
    x = (lon + 180) / 360 * n
    phi = math.radians(lat)
    y = (1 - math.log(math.tan(phi) + 1 / math.cos(phi)) / math.pi) / 2 * n
    return x, y


class Terrain:
    def __init__(self, zoom):
        self.zoom = zoom
        self.tiles = {}

    def tile(self, tx, ty):
        key = (tx, ty)
        if key not in self.tiles:
            path = os.path.join(CACHE_DIR, f"{self.zoom}_{tx}_{ty}.png")
            if not os.path.exists(path):
                urllib.request.urlretrieve(TILE_URL.format(z=self.zoom, x=tx, y=ty), path)
            rgb = np.asarray(Image.open(path).convert("RGB")).astype(np.float64)
            self.tiles[key] = rgb[..., 0] * 256 + rgb[..., 1] + rgb[..., 2] / 256 - 32768
        return self.tiles[key]

    def pixel(self, gx, gy):
        tx, ty = int(gx // 256), int(gy // 256)
        return self.tile(tx, ty)[int(gy - ty * 256), int(gx - tx * 256)]

    def elevation(self, lat, lon):
        """Bilinear elevation in meters."""
        x, y = global_px(lat, lon, self.zoom)
        x0, y0 = math.floor(x - 0.5), math.floor(y - 0.5)
        fx, fy = x - 0.5 - x0, y - 0.5 - y0
        return ((1 - fx) * (1 - fy) * self.pixel(x0, y0) + fx * (1 - fy) * self.pixel(x0 + 1, y0)
                + (1 - fx) * fy * self.pixel(x0, y0 + 1) + fx * fy * self.pixel(x0 + 1, y0 + 1))


def main():
    os.makedirs(CACHE_DIR, exist_ok=True)
    lat0, lon0 = observer_from_config()
    near, far = Terrain(ZOOM_NEAR), Terrain(ZOOM_FAR)
    h0 = near.elevation(lat0, lon0) + EYE_HEIGHT_M
    m_per_deg_lat = 111_320
    m_per_deg_lon = 111_320 * math.cos(math.radians(lat0))
    print(f"Observer {lat0}, {lon0} at {h0:.0f} m")

    alts = []
    n = int(round(360 / AZ_STEP))
    for i in range(n):
        az = math.radians(i * AZ_STEP)
        best = -90.0
        d = MIN_DIST_M
        while d < MAX_DIST_M:
            lat = lat0 + d * math.cos(az) / m_per_deg_lat
            lon = lon0 + d * math.sin(az) / m_per_deg_lon
            drop = d * d * (1 - REFRACTION_K) / (2 * EARTH_R)
            elev = (near if d < NEAR_DIST_M else far).elevation(lat, lon)
            ang = math.degrees(math.atan2(elev - h0 - drop, d))
            best = max(best, ang)
            d *= 1.01
        alts.append(round(max(best, -2.0), 2))
        if i % 90 == 0:
            print(f"  az {i * AZ_STEP:5.1f}°  horizon {alts[-1]:5.2f}°")

    with open(OUT_PATH, "w") as f:
        json.dump({"lat": lat0, "lon": lon0, "elev_m": round(h0), "az_step": AZ_STEP, "alt": alts},
                  f, separators=(",", ":"))
    print(f"Wrote {OUT_PATH}  (max {max(alts):.1f}° at az {alts.index(max(alts)) * AZ_STEP}°)")


if __name__ == "__main__":
    main()
