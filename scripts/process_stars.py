#!/usr/bin/env python3
"""
process_stars.py — Download and process the HYG star database into a compact
JSON file for the real-time night sky renderer.

Sources:
  - HYG Database v3: https://github.com/astronexus/HYG-Database
  - Constellation lines: Stellarium-style hip-to-hip connections
  - Deep sky objects: curated Messier + notable NGC objects
  (The Milky Way glow is a separate texture — see build_milkyway.py)

Output: data/stars.json
"""

import csv
import gzip
import json
import math
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

# Bayer letter codes (HYG "bayer" field) → (Greek letter, spelled-out name)
GREEK = {
    "Alp": ("α", "Alpha"), "Bet": ("β", "Beta"), "Gam": ("γ", "Gamma"),
    "Del": ("δ", "Delta"), "Eps": ("ε", "Epsilon"), "Zet": ("ζ", "Zeta"),
    "Eta": ("η", "Eta"), "The": ("θ", "Theta"), "Iot": ("ι", "Iota"),
    "Kap": ("κ", "Kappa"), "Lam": ("λ", "Lambda"), "Mu": ("μ", "Mu"),
    "Nu": ("ν", "Nu"), "Xi": ("ξ", "Xi"), "Omi": ("ο", "Omicron"),
    "Pi": ("π", "Pi"), "Rho": ("ρ", "Rho"), "Sig": ("σ", "Sigma"),
    "Tau": ("τ", "Tau"), "Ups": ("υ", "Upsilon"), "Phi": ("φ", "Phi"),
    "Chi": ("χ", "Chi"), "Psi": ("ψ", "Psi"), "Ome": ("ω", "Omega"),
}
SUPERSCRIPT = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")

# IAU constellation genitives, used in designations like "61 Cygni"
GENITIVE = {
    "And": "Andromedae", "Ant": "Antliae", "Aps": "Apodis", "Aql": "Aquilae",
    "Aqr": "Aquarii", "Ara": "Arae", "Ari": "Arietis", "Aur": "Aurigae",
    "Boo": "Boötis", "CMa": "Canis Majoris", "CMi": "Canis Minoris",
    "CVn": "Canum Venaticorum", "Cae": "Caeli", "Cam": "Camelopardalis",
    "Cap": "Capricorni", "Car": "Carinae", "Cas": "Cassiopeiae", "Cen": "Centauri",
    "Cep": "Cephei", "Cet": "Ceti", "Cha": "Chamaeleontis", "Cir": "Circini",
    "Cnc": "Cancri", "Col": "Columbae", "Com": "Comae Berenices",
    "CrA": "Coronae Australis", "CrB": "Coronae Borealis", "Crt": "Crateris",
    "Cru": "Crucis", "Crv": "Corvi", "Cyg": "Cygni", "Del": "Delphini",
    "Dor": "Doradus", "Dra": "Draconis", "Equ": "Equulei", "Eri": "Eridani",
    "For": "Fornacis", "Gem": "Geminorum", "Gru": "Gruis", "Her": "Herculis",
    "Hor": "Horologii", "Hya": "Hydrae", "Hyi": "Hydri", "Ind": "Indi",
    "LMi": "Leonis Minoris", "Lac": "Lacertae", "Leo": "Leonis", "Lep": "Leporis",
    "Lib": "Librae", "Lup": "Lupi", "Lyn": "Lyncis", "Lyr": "Lyrae",
    "Men": "Mensae", "Mic": "Microscopii", "Mon": "Monocerotis", "Mus": "Muscae",
    "Nor": "Normae", "Oct": "Octantis", "Oph": "Ophiuchi", "Ori": "Orionis",
    "Pav": "Pavonis", "Peg": "Pegasi", "Per": "Persei", "Phe": "Phoenicis",
    "Pic": "Pictoris", "PsA": "Piscis Austrini", "Psc": "Piscium", "Pup": "Puppis",
    "Pyx": "Pyxidis", "Ret": "Reticuli", "Scl": "Sculptoris", "Sco": "Scorpii",
    "Sct": "Scuti", "Ser": "Serpentis", "Sex": "Sextantis", "Sge": "Sagittae",
    "Sgr": "Sagittarii", "Tau": "Tauri", "Tel": "Telescopii", "TrA": "Trianguli Australis",
    "Tri": "Trianguli", "Tuc": "Tucanae", "UMa": "Ursae Majoris", "UMi": "Ursae Minoris",
    "Vel": "Velorum", "Vir": "Virginis", "Vol": "Volantis", "Vul": "Vulpeculae",
}


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

            # Designations: Bayer letter, Flamsteed number, catalog IDs
            bayer = row.get("bayer", "").strip() or None
            flam = row.get("flam", "").strip() or None
            hd = row.get("hd", "").strip() or None
            gl = row.get("gl", "").strip() or None

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
                "bayer": bayer,
                "flam": flam,
                "hd": hd,
                "gl": gl,
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

def build_constellation_data(stars):
    """Build constellation lines and label positions from Stellarium data."""
    # Index stars by HIP ID for fast lookup
    hip_index = {}
    for s in stars:
        if s["hip"] is not None:
            hip_index[s["hip"]] = s

    constellations_raw = parse_stellarium_constellations()

    def unit(star):
        ra, dec = math.radians(star["ra"] * 15), math.radians(star["dec"])
        return (math.cos(dec) * math.cos(ra), math.cos(dec) * math.sin(ra), math.sin(dec))

    constellations = []
    for name, abbr, segments in constellations_raw:
        lines = []
        # Label at the mean direction of the line endpoints. Averaging unit
        # vectors (not RA numbers) keeps figures that straddle 0h/24h, like
        # Pisces and Pegasus, from landing on the opposite side of the sky.
        vx = vy = vz = 0.0
        for hip1, hip2 in segments:
            if hip1 in hip_index and hip2 in hip_index:
                lines.append([hip1, hip2])
                for h in (hip1, hip2):
                    x, y, z = unit(hip_index[h])
                    vx += x; vy += y; vz += z

        if lines:
            norm = math.sqrt(vx * vx + vy * vy + vz * vz)
            constellations.append({
                "name": name,
                "abbr": abbr,
                "lines": lines,
                "label_ra": round((math.degrees(math.atan2(vy, vx)) % 360) / 15, 4),
                "label_dec": round(math.degrees(math.asin(vz / norm)), 3),
            })

    print(f"  Built {len(constellations)} constellations with visible line segments")
    return constellations


def star_names(s):
    """
    Display names, best first, joined by ";". Bayer letters are spelled out
    ("Nu Ceti") since ν/v and ρ/p look alike on screen; a Bayer-named star
    also lists the symbol form. Examples:
      "Vega;Alpha Lyrae;3 Lyrae"
      "Nu Ceti;ν Ceti;78 Ceti;HD 16161"
      "61 Cygni;HD 201091"
    """
    gen = GENITIVE.get(s["con"], s["con"])
    bayer = bayer_sym = flam = None
    if s["bayer"]:
        letter, _, sup = s["bayer"].partition("-")
        sym, word = GREEK[letter]
        sup = sup.translate(SUPERSCRIPT)
        bayer, bayer_sym = f"{word}{sup} {gen}", f"{sym}{sup} {gen}"
    if s["flam"]:
        flam = f"{s['flam']} {gen}"
    catalog = (f"HD {s['hd']}" if s["hd"] else
               f"HIP {s['hip']}" if s["hip"] else s["gl"])

    if s["proper"]:
        names = [n for n in (s["proper"], bayer, flam, catalog) if n][:3]
    else:
        names = [n for n in (bayer, bayer_sym, flam, catalog) if n]
    return ";".join(names)


def build_output(stars, constellations):
    """Assemble final JSON."""
    # Build HIP lookup for constellation rendering (client needs ra/dec by hip)
    hip_set = set()
    for c in constellations:
        for h1, h2 in c["lines"]:
            hip_set.add(h1)
            hip_set.add(h2)

    # Compact star array: [ra, dec, mag, ci, dist_ly, spect, con, names]
    # Stars with HIP IDs used in constellations get stored in a separate lookup
    star_array = []
    hip_lookup = {}

    for s in stars:
        star_array.append([s["ra"], s["dec"], s["mag"], s["ci"], s["dist_ly"], s["spect"],
                           s["con"], star_names(s)])
        if s["hip"] is not None and s["hip"] in hip_set:
            hip_lookup[s["hip"]] = [s["ra"], s["dec"]]

    dsos = list(DEEP_SKY_OBJECTS)
    print(f"  Proper names: {sum(1 for s in stars if s['proper'])}")

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

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, separators=(",", ":"), ensure_ascii=False)

    size_kb = os.path.getsize(OUTPUT_PATH) / 1024
    print(f"\nDone! Written to {OUTPUT_PATH}")
    print(f"  File size: {size_kb:.0f} KB")
    print(f"  Stars: {output['meta']['star_count']}")
    print(f"  Constellations: {output['meta']['constellation_count']}")
    print(f"  Deep sky objects: {output['meta']['dso_count']}")


if __name__ == "__main__":
    main()
