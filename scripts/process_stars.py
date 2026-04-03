#!/usr/bin/env python3
"""
process_stars.py — Download and process the HYG star database into a compact
JSON file for the real-time night sky renderer.

Sources:
  - HYG Database v3: https://github.com/astronexus/HYG-Database
  - Constellation lines: Stellarium-style hip-to-hip connections
  - Deep sky objects: curated Messier + notable NGC objects

Output: data/stars.json
"""

import csv
import gzip
import json
import os
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, "data")
CSV_PATH = os.path.join(DATA_DIR, "hygdata_v42.csv")
OUTPUT_PATH = os.path.join(DATA_DIR, "stars.json")

HYG_URL = "https://www.astronexus.com/downloads/catalogs/hygdata_v42.csv.gz"
STELLARIUM_URL = "https://raw.githubusercontent.com/Stellarium/stellarium-skycultures/master/western/index.json"
STELLARIUM_PATH = os.path.join(DATA_DIR, "stellarium_western.json")

MAG_LIMIT = 7.0  # extended for zoom detail (naked-eye ~6.5)


def download_hyg():
    """Download the HYG CSV if not already present."""
    os.makedirs(DATA_DIR, exist_ok=True)
    if os.path.exists(CSV_PATH):
        print(f"  HYG CSV already exists at {CSV_PATH}")
        return
    gz_path = CSV_PATH + ".gz"
    print(f"  Downloading HYG database...")
    urllib.request.urlretrieve(HYG_URL, gz_path)
    print(f"  Extracting...")
    with gzip.open(gz_path, "rb") as gz, open(CSV_PATH, "wb") as out:
        out.write(gz.read())
    os.remove(gz_path)
    print(f"  Saved to {CSV_PATH}")


def parse_stars():
    """Parse HYG CSV → list of {hip, ra, dec, mag}."""
    stars = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                mag = float(row["mag"])
                dec = float(row["dec"])
                ra = float(row["ra"])  # in hours (0-24)
            except (ValueError, KeyError):
                continue

            if mag > MAG_LIMIT:
                continue

            # Skip Sol
            if row.get("proper", "").strip() == "Sol":
                continue

            hip = int(row["hip"]) if row.get("hip") and row["hip"] != "" else None
            ci_raw = row.get("ci", "").strip()
            ci = round(float(ci_raw), 2) if ci_raw else None
            proper = row.get("proper", "").strip() or None
            con = row.get("con", "").strip() or None

            # Distance: parsecs → light years (1 pc = 3.26156 ly)
            dist_raw = row.get("dist", "").strip()
            dist_ly = round(float(dist_raw) * 3.26156, 2) if dist_raw and dist_raw != "" else None
            if dist_ly is not None and dist_ly > 100000:
                dist_ly = None  # filter out unrealistic distances

            # Spectral type: first letter determines color class
            spect_raw = row.get("spect", "").strip()
            spect = spect_raw if spect_raw else None

            stars.append({
                "hip": hip,
                "ra": round(ra, 6),
                "dec": round(dec, 5),
                "mag": round(mag, 2),
                "ci": ci,
                "proper": proper,
                "con": con,
                "dist_ly": dist_ly,
                "spect": spect,
            })

    print(f"  Parsed {len(stars)} stars (mag <= {MAG_LIMIT}, full sky)")
    return stars


def download_stellarium():
    """Download the Stellarium Western sky culture constellation data."""
    if os.path.exists(STELLARIUM_PATH):
        print(f"  Stellarium data already exists at {STELLARIUM_PATH}")
        return
    print(f"  Downloading Stellarium constellation data...")
    urllib.request.urlretrieve(STELLARIUM_URL, STELLARIUM_PATH)
    print(f"  Saved to {STELLARIUM_PATH}")


def parse_stellarium_constellations():
    """Parse Stellarium western/index.json → constellation line pairs + labels."""
    with open(STELLARIUM_PATH, encoding="utf-8") as f:
        stel = json.load(f)

    constellations_raw = []
    for c in stel.get("constellations", []):
        name = c.get("common_name", {}).get("native", c.get("iau", "?"))
        abbr = c.get("iau", "?")
        polylines = c.get("lines", [])

        # Convert polylines to [hip1, hip2] pairs, skipping string hints like "thin"
        pairs = []
        for polyline in polylines:
            hips = [v for v in polyline if isinstance(v, int)]
            for i in range(len(hips) - 1):
                pairs.append([hips[i], hips[i + 1]])

        if pairs:
            constellations_raw.append((name, abbr, pairs))

    print(f"  Parsed {len(constellations_raw)} constellations from Stellarium data")
    return constellations_raw

# Deep sky objects: name, ra (hours), dec (degrees), apparent_size (degrees), brightness (0-1)
DEEP_SKY_OBJECTS = [
    # Nebulae
    {"name": "M42 Orion Nebula",     "ra": 5.588, "dec": -5.39,  "size": 1.0, "brightness": 0.6,  "type": "nebula"},
    {"name": "M8 Lagoon Nebula",     "ra": 18.063,"dec": -24.38, "size": 0.75,"brightness": 0.35, "type": "nebula"},
    {"name": "M20 Trifid Nebula",    "ra": 18.043,"dec": -23.03, "size": 0.45,"brightness": 0.25, "type": "nebula"},
    {"name": "M17 Omega Nebula",     "ra": 18.346,"dec": -16.18, "size": 0.4, "brightness": 0.3,  "type": "nebula"},
    {"name": "M16 Eagle Nebula",     "ra": 18.313,"dec": -13.78, "size": 0.5, "brightness": 0.25, "type": "nebula"},
    {"name": "M1 Crab Nebula",       "ra": 5.575, "dec": 22.01,  "size": 0.1, "brightness": 0.15, "type": "nebula"},
    {"name": "M57 Ring Nebula",      "ra": 18.893,"dec": 33.03,  "size": 0.05,"brightness": 0.15, "type": "nebula"},
    {"name": "M27 Dumbbell Nebula",  "ra": 19.993,"dec": 22.72,  "size": 0.15,"brightness": 0.2,  "type": "nebula"},
    {"name": "NGC 7000 N. America",  "ra": 20.983,"dec": 44.53,  "size": 2.0, "brightness": 0.15, "type": "nebula"},
    # Galaxies
    {"name": "M31 Andromeda",        "ra": 0.712, "dec": 41.27,  "size": 3.0, "brightness": 0.35, "type": "galaxy"},
    {"name": "M33 Triangulum",       "ra": 1.564, "dec": 30.66,  "size": 1.0, "brightness": 0.15, "type": "galaxy"},
    {"name": "M51 Whirlpool",        "ra": 13.497,"dec": 47.20,  "size": 0.2, "brightness": 0.12, "type": "galaxy"},
    {"name": "M81 Bode's Galaxy",    "ra": 9.926, "dec": 69.07,  "size": 0.35,"brightness": 0.12, "type": "galaxy"},
    {"name": "M104 Sombrero",        "ra": 12.666,"dec": -11.62, "size": 0.15,"brightness": 0.12, "type": "galaxy"},
    # Open clusters
    {"name": "M45 Pleiades",         "ra": 3.787, "dec": 24.12,  "size": 1.8, "brightness": 0.5,  "type": "open_cluster"},
    {"name": "M44 Beehive",          "ra": 8.667, "dec": 19.67,  "size": 1.2, "brightness": 0.25, "type": "open_cluster"},
    {"name": "M7 Ptolemy Cluster",   "ra": 17.898,"dec": -34.79, "size": 1.3, "brightness": 0.3,  "type": "open_cluster"},
    {"name": "M6 Butterfly Cluster", "ra": 17.668,"dec": -32.22, "size": 0.4, "brightness": 0.2,  "type": "open_cluster"},
    {"name": "h+χ Per Double Clust.","ra": 2.333, "dec": 57.13,  "size": 0.8, "brightness": 0.3,  "type": "open_cluster"},
    # Globular clusters
    {"name": "M13 Hercules Cluster", "ra": 16.695,"dec": 36.46,  "size": 0.3, "brightness": 0.25, "type": "globular_cluster"},
    {"name": "M22",                  "ra": 18.606,"dec": -23.90, "size": 0.4, "brightness": 0.2,  "type": "globular_cluster"},
    {"name": "M5",                   "ra": 15.308,"dec": 2.08,   "size": 0.3, "brightness": 0.2,  "type": "globular_cluster"},
    {"name": "M3",                   "ra": 13.703,"dec": 28.38,  "size": 0.25,"brightness": 0.18, "type": "globular_cluster"},
    {"name": "M15",                  "ra": 21.497,"dec": 12.17,  "size": 0.2, "brightness": 0.15, "type": "globular_cluster"},
    {"name": "M4",                   "ra": 16.393,"dec": -26.53, "size": 0.45,"brightness": 0.2,  "type": "globular_cluster"},
    {"name": "47 Tuc",               "ra": 0.401, "dec": -72.08, "size": 0.5, "brightness": 0.3,  "type": "globular_cluster"},
    {"name": "Omega Centauri",       "ra": 13.447,"dec": -47.48, "size": 0.6, "brightness": 0.35, "type": "globular_cluster"},
]

# Milky Way band — approximate centerline path as (ra_hours, dec_degrees) waypoints
MILKY_WAY = [
    {"ra": 6.0,  "dec": -25.0, "width": 15},
    {"ra": 7.0,  "dec": -15.0, "width": 12},
    {"ra": 8.0,  "dec": -5.0,  "width": 10},
    {"ra": 12.0, "dec": 60.0,  "width": 8},
    {"ra": 18.0, "dec": -25.0, "width": 20},
    {"ra": 18.5, "dec": -20.0, "width": 25},
    {"ra": 19.0, "dec": -15.0, "width": 22},
    {"ra": 19.5, "dec": 0.0,   "width": 18},
    {"ra": 20.0, "dec": 20.0,  "width": 15},
    {"ra": 20.5, "dec": 35.0,  "width": 15},
    {"ra": 21.0, "dec": 45.0,  "width": 14},
    {"ra": 21.5, "dec": 52.0,  "width": 13},
    {"ra": 22.0, "dec": 56.0,  "width": 12},
    {"ra": 23.0, "dec": 58.0,  "width": 10},
    {"ra": 0.0,  "dec": 60.0,  "width": 10},
    {"ra": 1.0,  "dec": 58.0,  "width": 10},
    {"ra": 2.0,  "dec": 55.0,  "width": 10},
    {"ra": 3.0,  "dec": 50.0,  "width": 12},
    {"ra": 4.0,  "dec": 40.0,  "width": 12},
    {"ra": 5.0,  "dec": 20.0,  "width": 14},
    {"ra": 5.5,  "dec": 0.0,   "width": 15},
    {"ra": 6.0,  "dec": -25.0, "width": 15},
]


def build_constellation_data(stars):
    """Build constellation lines and label positions from Stellarium data."""
    # Index stars by HIP ID for fast lookup
    hip_index = {}
    for s in stars:
        if s["hip"] is not None:
            hip_index[s["hip"]] = s

    constellations_raw = parse_stellarium_constellations()

    constellations = []
    for name, abbr, segments in constellations_raw:
        lines = []
        ra_sum = 0
        dec_sum = 0
        count = 0
        for hip1, hip2 in segments:
            if hip1 in hip_index and hip2 in hip_index:
                lines.append([hip1, hip2])
                ra_sum += hip_index[hip1]["ra"] + hip_index[hip2]["ra"]
                dec_sum += hip_index[hip1]["dec"] + hip_index[hip2]["dec"]
                count += 2

        if lines and count > 0:
            constellations.append({
                "name": name,
                "abbr": abbr,
                "lines": lines,
                "label_ra": round(ra_sum / count, 4),
                "label_dec": round(dec_sum / count, 3),
            })

    print(f"  Built {len(constellations)} constellations with visible line segments")
    return constellations


def build_output(stars, constellations):
    """Assemble final JSON."""
    # Build HIP lookup for constellation rendering (client needs ra/dec by hip)
    hip_set = set()
    for c in constellations:
        for h1, h2 in c["lines"]:
            hip_set.add(h1)
            hip_set.add(h2)

    # Compact star array: [ra, dec, mag] — no hip needed for most stars
    # Stars with HIP IDs used in constellations get stored in a separate lookup
    star_array = []
    hip_lookup = {}
    star_names = {}

    for s in stars:
        star_array.append([s["ra"], s["dec"], s["mag"], s["ci"], s["dist_ly"], s["spect"]])
        if s["hip"] is not None:
            if s["hip"] in hip_set:
                hip_lookup[s["hip"]] = [s["ra"], s["dec"]]
            if s["proper"]:
                star_names[s["hip"]] = {
                    "name": s["proper"], "con": s["con"],
                    "dist": s["dist_ly"], "spect": s["spect"],
                }

    dsos = list(DEEP_SKY_OBJECTS)
    print(f"  Named stars: {len(star_names)}")

    output = {
        "meta": {
            "star_count": len(star_array),
            "constellation_count": len(constellations),
            "dso_count": len(dsos),
            "mag_limit": MAG_LIMIT,
        },
        "stars": star_array,
        "hip": {str(k): v for k, v in hip_lookup.items()},
        "constellations": constellations,
        "dsos": dsos,
        "milky_way": MILKY_WAY,
        "star_names": {str(k): v for k, v in star_names.items()},
    }

    return output


def main():
    print("Step 1: Download HYG database")
    download_hyg()

    print("Step 2: Download Stellarium constellation data")
    download_stellarium()

    print("Step 3: Parse stars")
    stars = parse_stars()

    print("Step 4: Build constellation data")
    constellations = build_constellation_data(stars)

    print("Step 5: Assemble output")
    output = build_output(stars, constellations)

    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"\nDone! Written to {OUTPUT_PATH}")
    print(f"  File size: {size_kb:.0f} KB")
    print(f"  Stars: {output['meta']['star_count']}")
    print(f"  Constellations: {output['meta']['constellation_count']}")
    print(f"  Deep sky objects: {output['meta']['dso_count']}")


if __name__ == "__main__":
    main()
