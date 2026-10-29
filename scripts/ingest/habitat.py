"""The habitat ingest's raster and geometry work (L3 plan §1.2). Run by `pnpm ingest habitat` (scripts/ingest/habitat.ts), never alone.

.venv-learn/bin/python -I scripts/ingest/habitat.py --fractions <zip> --composite <zip> --shapes <country_shapes.parquet>
    --records <csv: id,longitude,latitude> --clips <json: {tileSize, clips: {id: {west, south, east, north, country}}}> --out <empty dir>

Reads Jung et al. 2020 v004's zips in place through /vsizip/ (no network, no class rule: habitat.ts holds the rules and
checks the report) and writes into --out:
- country_layer_km2.csv (country, code, km2): per country and 1 km layer, Σ fraction ÷ 1000 × the cell's geodesic area
  over the cells whose centre is inside the outline (003 §5's method 3), unrounded, rows above 0 only. Each outline is
  rasterized on its own, so overlapping outlines (FR and GF, RE, MQ) both count a shared cell;
- outline_km2.csv (country, km2, cells): each outline's geodesic area and its cell count;
- record_fractions.csv (id, code, fraction): each record's 1 km cell, non-zero values only;
- clip_<id>.bin (raw little-endian uint16, row-major from the upper left) and clip_<id>.tif (cloud-optimized GeoTIFF):
  the 100 m composite's window for each clip, snapped outward to its grid, with every cell of a tileSize × tileSize tile
  (counted from the window's upper left) whose box doesn't intersect the clip's country outline set to nodata. The
  report gives each clip's tile count and its masked tiles' numbers (row-major from the upper left).
Asserts on the way: EPSG:4326 everywhere, one shape and transform for all 1 km layers, values 0–1000, each cell's
partition sum at most 1000 plus 1 per non-zero layer, the composite uint16 with nodata 0, the COG's layout and cells.
Prints a JSON report on stdout and progress on stderr; any failed check exits non-zero.
"""
import argparse
import csv
import json
import math
import platform
import re
import resource
import sys
import time
import zipfile
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import pyproj
import rasterio
import rasterio.shutil
import shapely
from rasterio import features
from rasterio.transform import Affine
from rasterio.windows import Window
from shapely.geometry.polygon import orient

FRACTION_MEMBER = re.compile(r"^lvl2_frac_1km_ver004/iucn_habitatclassification_fraction_lvl2__(\d+)_[^/]*__ver004\.tif$")
FRACTION_SCALE = 1000  # a cell value of 1000 is the whole cell (Zenodo 4058819: "[0-1] * 1000")
OVERLAY = {901, 1000, 1001, 1002, 1003, 1004}  # open water over the partition (003 §5); habitat.ts's OVERLAY_CODES
COMPOSITE_NODATA = 0
# Rows of the 1 km grid read at once per layer: memory is ~7 B per cell of a band (a layer, the partition sum and its
# count), ~0.5 GB at 2048 rows × 36,308 columns. Lower it if memory runs short; the result is the same.
BAND_ROWS = 2048
# No predictor: class codes are categories, so differences between neighbours don't shrink them (measured −26 % bytes).
COG_OPTIONS = dict(driver="COG", COMPRESS="DEFLATE", LEVEL="9", PREDICTOR="1", BLOCKSIZE="256", OVERVIEW_RESAMPLING="NEAREST", NUM_THREADS="1")
GEOD = pyproj.Geod(ellps="WGS84")


def fail(message: str) -> None:
    raise SystemExit(f"habitat.py: {message}")


def log(message: str) -> None:
    print(f"habitat.py: {message}", file=sys.stderr, flush=True)


def grid_of(ds, name: str) -> tuple:
    """(width, height, transform) of a north-up, square-cell EPSG:4326 single band uint16 raster."""
    if ds.crs is None or ds.crs.to_epsg() != 4326:
        fail(f"{name}: CRS {ds.crs}, expected EPSG:4326")
    if ds.count != 1 or ds.dtypes[0] != "uint16":
        fail(f"{name}: {ds.count} bands of {ds.dtypes}, expected one uint16 band")
    t = ds.transform
    if t.b != 0 or t.d != 0 or t.a <= 0 or t.e != -t.a:
        fail(f"{name}: transform {tuple(t)[:6]} isn't north-up with square cells")
    return ds.width, ds.height, t


def window_of(bounds: tuple, t: Affine, width: int, height: int) -> tuple:
    """(col0, row0, col1, row1) of the cells a lon/lat box touches, snapped outward, clipped to the grid."""
    west, south, east, north = bounds
    col0 = max(0, math.floor((west - t.c) / t.a))
    col1 = min(width, math.ceil((east - t.c) / t.a))
    row0 = max(0, math.floor((t.f - north) / t.a))
    row1 = min(height, math.ceil((t.f - south) / t.a))
    return col0, row0, col1, row1


def geodesic_km2(geom) -> float:
    total = 0.0
    for part in shapely.get_parts(geom):
        area, _ = GEOD.geometry_area_perimeter(orient(part, 1.0))
        total += abs(area)
    return total / 1e6


def row_areas(t: Affine, height: int) -> np.ndarray:
    """Each 1 km row's cell area on the WGS84 ellipsoid, km² (a lon/lat cell's area depends on its row only)."""
    out = np.empty(height)
    for r in range(height):
        top = min(90.0, t.f - r * t.a)
        bottom = max(-90.0, t.f - (r + 1) * t.a)
        area, _ = GEOD.polygon_area_perimeter([0, t.a, t.a, 0], [bottom, bottom, top, top])
        out[r] = abs(area) / 1e6
    return out


def country_cells(codes: list, geoms: np.ndarray, t: Affine, width: int, height: int) -> dict:
    """Per country: its cells (centre inside the outline) as flat row-major indices, ascending, with each row's start."""
    cells = {}
    for code, geom in zip(codes, geoms):
        col0, row0, col1, row1 = window_of(shapely.bounds(geom), t, width, height)
        if col1 <= col0 or row1 <= row0:
            idx = np.empty(0, np.uint32)
        else:
            mask = features.rasterize([(geom, 1)], out_shape=(row1 - row0, col1 - col0), transform=t * Affine.translation(col0, row0),
                                      fill=0, all_touched=False, dtype="uint8")
            r, c = np.nonzero(mask)  # row-major order: sorted by row, then column
            idx = ((r + row0).astype(np.uint64) * width + (c + col0)).astype(np.uint32)
        rows = idx // width
        starts = np.flatnonzero(np.r_[True, rows[1:] != rows[:-1]]) if len(idx) else np.empty(0, np.int64)
        cells[code] = {"idx": idx, "rows": rows[starts], "starts": starts}
    return cells


def fractions(args, codes: list, geoms: np.ndarray, records: dict, out: Path) -> dict:
    with zipfile.ZipFile(args.fractions) as z:
        tifs = sorted(n for n in z.namelist() if n.endswith(".tif"))
    layers = []
    for name in tifs:
        m = FRACTION_MEMBER.match(name)
        if not m:
            fail(f"fractions zip: member {name!r} isn't lvl2_frac_1km_ver004/…lvl2__<code>_<name>__ver004.tif")
        layers.append({"member": name, "code": int(m.group(1)), "nonZero": 0, "max": 0})
    if len({l["code"] for l in layers}) != len(layers):
        fail("fractions zip: a code twice")
    datasets = [rasterio.open(f"/vsizip/{args.fractions}/{l['member']}") for l in layers]
    width, height, t = grid_of(datasets[0], layers[0]["member"])
    for l, ds in zip(layers, datasets):
        if grid_of(ds, l["member"]) != (width, height, t):
            fail(f"{l['member']}: grid differs from {layers[0]['member']}'s")
        if ds.nodata not in (None, 0):
            fail(f"{l['member']}: nodata {ds.nodata}, expected none or 0")
    if width * height >= 2**32:
        fail(f"grid {width} × {height} doesn't fit uint32 indices")
    log(f"1 km grid {width} × {height}, {t.a}°, {len(layers)} layers; rasterizing {len(codes)} outlines")

    started = time.monotonic()
    cells = country_cells(codes, geoms, t, width, height)
    areas = row_areas(t, height)
    outline = {code: geodesic_km2(g) for code, g in zip(codes, geoms)}

    rec_ids, rec_flat, outside = [], [], []
    for i, lon, lat in zip(records["id"], records["longitude"], records["latitude"]):
        col, row = math.floor((lon - t.c) / t.a), math.floor((t.f - lat) / t.a)
        if 0 <= col < width and 0 <= row < height:
            rec_ids.append(i)
            rec_flat.append(row * width + col)
        else:
            outside.append(i)
    order = np.argsort(np.asarray(rec_flat, np.int64), kind="stable")
    rec_ids = np.asarray(rec_ids, np.int64)[order]
    rec_flat = np.asarray(rec_flat, np.int64)[order]

    km2 = {}  # (country, code) → km²
    found = []  # (id, code, fraction)
    for r0 in range(0, height, BAND_ROWS):
        r1 = min(height, r0 + BAND_ROWS)
        base = r0 * width
        # Each country's slice of this band: its cells (band-local) and its rows' starts and areas.
        local = {}
        for code, c in cells.items():
            j0, j1 = np.searchsorted(c["rows"], [r0, r1])
            if j1 > j0:
                lo = c["starts"][j0]
                hi = c["starts"][j1] if j1 < len(c["starts"]) else len(c["idx"])
                local[code] = (c["idx"][lo:hi] - np.uint32(base), c["starts"][j0:j1] - lo, areas[c["rows"][j0:j1]])
        b0, b1 = np.searchsorted(rec_flat, [base, r1 * width])
        rec_local = rec_flat[b0:b1] - base
        psum = np.zeros((r1 - r0) * width, np.uint32)
        pcount = np.zeros((r1 - r0) * width, np.uint8)
        for l, ds in zip(layers, datasets):
            band = ds.read(1, window=Window(0, r0, width, r1 - r0)).ravel()
            top = int(band.max())
            if top > FRACTION_SCALE:
                fail(f"{l['member']}: value {top} in rows {r0}–{r1}, expected 0–{FRACTION_SCALE}")
            if top == 0:
                continue
            l["max"] = max(l["max"], top)
            l["nonZero"] += int(np.count_nonzero(band))
            if l["code"] not in OVERLAY:
                psum += band
                pcount += band > 0
            for country, (idx, starts, row_area) in local.items():
                per_row = np.add.reduceat(band[idx], starts, dtype=np.int64)
                if per_row.any():
                    key = (country, l["code"])
                    km2[key] = km2.get(key, 0.0) + float(per_row @ row_area) / FRACTION_SCALE
            vals = band[rec_local]
            for i in np.flatnonzero(vals):
                found.append((int(rec_ids[b0 + i]), l["code"], int(vals[i])))
        over = np.flatnonzero(psum > pcount.astype(np.uint32) + FRACTION_SCALE)
        if len(over):
            cell = base + int(over[0])
            fail(f"cell row {cell // width} col {cell % width}: partition sum {int(psum[over[0]])} > {FRACTION_SCALE} + {int(pcount[over[0]])} layers ({len(over)} cells)")
        log(f"rows {r0}–{r1} of {height} ({time.monotonic() - started:.0f} s)")
    for ds in datasets:
        ds.close()

    with open(out / "country_layer_km2.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["country", "code", "km2"])
        w.writerows([country, code, repr(v)] for (country, code), v in sorted(km2.items()) if v > 0)
    with open(out / "outline_km2.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["country", "km2", "cells"])
        w.writerows([code, repr(outline[code]), len(cells[code]["idx"])] for code in sorted(codes))
    with open(out / "record_fractions.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["id", "code", "fraction"])
        w.writerows(sorted(found))
    return {"grid": {"crs": "EPSG:4326", "width": width, "height": height, "transform": list(t)[:6], "bandRows": BAND_ROWS},
            "layers": layers, "outlines": len(codes), "recordsOutside": sorted(outside), "seconds": time.monotonic() - started}


def mask_tiles(cells: np.ndarray, ulx: float, uly: float, scale: float, size: int, outline) -> list:
    """Sets to nodata, in place, every cell of each size × size tile (edge tiles smaller) whose box doesn't intersect
    outline; returns those tiles' numbers (tile row × tile columns + tile column, from the upper left)."""
    height, width = cells.shape
    across = math.ceil(width / size)
    shapely.prepare(outline)
    masked = []
    for r0 in range(0, height, size):
        for c0 in range(0, width, size):
            r1, c1 = min(height, r0 + size), min(width, c0 + size)
            if not shapely.intersects(shapely.box(ulx + c0 * scale, uly - r1 * scale, ulx + c1 * scale, uly - r0 * scale), outline):
                cells[r0:r1, c0:c1] = COMPOSITE_NODATA
                masked.append(r0 // size * across + c0 // size)
    return masked


def clips(args, boxes: dict, tile: int, outlines: dict, out: Path) -> dict:
    with zipfile.ZipFile(args.composite) as z:
        tifs = [n for n in z.namelist() if n.endswith(".tif")]
    if len(tifs) != 1:
        fail(f"composite zip: {len(tifs)} .tif members, expected 1")
    name = tifs[0]
    report = {}
    with rasterio.open(f"/vsizip/{args.composite}/{name}") as ds:
        width, height, t = grid_of(ds, name)
        if ds.nodata != COMPOSITE_NODATA:
            fail(f"{name}: nodata {ds.nodata}, expected {COMPOSITE_NODATA}")
        log(f"100 m composite {width} × {height}, {t.a}°")
        # North first: the member is one deflate stream, so reads only move forward.
        for clip, box in sorted(boxes.items(), key=lambda kv: -kv[1]["north"]):
            started = time.monotonic()
            col0, row0, col1, row1 = window_of((box["west"], box["south"], box["east"], box["north"]), t, width, height)
            cells = ds.read(1, window=Window(col0, row0, col1 - col0, row1 - row0))
            ulx, uly = t.c + col0 * t.a, t.f - row0 * t.a
            if box["country"] not in outlines:
                fail(f"clip {clip}: country {box['country']} isn't in country_shapes")
            masked = mask_tiles(cells, ulx, uly, t.a, tile, outlines[box["country"]])
            tiles = math.ceil(cells.shape[1] / tile) * math.ceil(cells.shape[0] / tile)
            (out / f"clip_{clip}.bin").write_bytes(cells.astype("<u2").tobytes())
            cog = out / f"clip_{clip}.tif"
            profile = dict(driver="GTiff", width=cells.shape[1], height=cells.shape[0], count=1, dtype="uint16", crs="EPSG:4326",
                           transform=Affine(t.a, 0, ulx, 0, -t.a, uly), nodata=COMPOSITE_NODATA)
            with rasterio.MemoryFile() as mem:
                with mem.open(**profile) as tmp:
                    tmp.write(cells, 1)
                with mem.open() as src:
                    rasterio.shutil.copy(src, cog, **COG_OPTIONS)
            with rasterio.open(cog) as c:
                layout = c.tags(ns="IMAGE_STRUCTURE").get("LAYOUT")
                if layout != "COG" or c.crs.to_epsg() != 4326 or c.nodata != COMPOSITE_NODATA or tuple(c.transform) != tuple(profile["transform"]):
                    fail(f"{cog.name}: layout {layout}, CRS {c.crs}, nodata {c.nodata}, transform {tuple(c.transform)[:6]}")
                if not np.array_equal(c.read(1), cells):
                    fail(f"{cog.name}: cells differ from the window read")
            values, counts = np.unique(cells, return_counts=True)
            report[clip] = {"crs": "EPSG:4326", "dtype": "uint16", "layout": layout, "width": int(cells.shape[1]), "height": int(cells.shape[0]),
                            "ulx": ulx, "uly": uly, "scale": t.a, "nodata": COMPOSITE_NODATA,
                            "values": {str(int(v)): int(n) for v, n in zip(values, counts) if v != COMPOSITE_NODATA},
                            "nodataCells": int(counts[values == COMPOSITE_NODATA].sum()), "tiles": tiles, "maskedTiles": masked,
                            "seconds": time.monotonic() - started}
            log(f"clip {clip}: {cells.shape[1]} × {cells.shape[0]} cells, {len(report[clip]['values'])} classes, {len(masked)} of {tiles} tiles masked ({report[clip]['seconds']:.0f} s)")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    for name, help_ in [("--fractions", "lvl2_frac_1km_ver004.zip"), ("--composite", "iucn_habitatclassification_composite_lvl2_ver004.zip"),
                        ("--shapes", "data/learn/country_shapes.parquet"), ("--records", "records.csv (id,longitude,latitude)"),
                        ("--clips", "clips.json ({tileSize, clips: {id: {west, south, east, north, country}}})"), ("--out", "empty folder for the outputs")]:
        parser.add_argument(name, type=Path, required=True, help=help_)
    args = parser.parse_args()
    if any(args.out.iterdir()):
        fail(f"{args.out} is not empty")

    table = pq.read_table(args.shapes, columns=["country_code", "geom"])
    codes = table.column("country_code").to_pylist()
    if len(set(codes)) != len(codes):
        fail("country_shapes: a code twice")
    geoms = shapely.from_wkb(table.column("geom").to_numpy(zero_copy_only=False))
    with open(args.records, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    records = {"id": [int(r["id"]) for r in rows], "longitude": [float(r["longitude"]) for r in rows], "latitude": [float(r["latitude"]) for r in rows]}
    spec = json.loads(args.clips.read_text(encoding="utf-8"))
    if not (isinstance(spec.get("tileSize"), int) and spec["tileSize"] > 0):
        fail(f"clips.json: tileSize {spec.get('tileSize')!r}")

    clip = clips(args, spec["clips"], spec["tileSize"], dict(zip(codes, geoms)), args.out)  # first: the slower read to fail on (one 2.6 GB deflate stream)
    frac = fractions(args, codes, geoms, records, args.out)
    report = {
        "tools": {"python": platform.python_version(), "numpy": np.__version__, "rasterio": rasterio.__version__, "gdal": rasterio.__gdal_version__,
                  "pyproj": pyproj.__version__, "proj": pyproj.proj_version_str, "pyarrow": pa.__version__, "shapely": shapely.__version__,
                  "geos": shapely.geos_version_string},
        "grid": frac["grid"],
        "layers": frac["layers"],
        "outlines": frac["outlines"],
        "recordsOutside": frac["recordsOutside"],
        "clips": {k: {key: v for key, v in c.items() if key != "seconds"} for k, c in clip.items()},
        "timings": {"fractions": round(frac["seconds"], 1), **{f"clip {k}": round(c["seconds"], 1) for k, c in clip.items()},
                    "maxRssMb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1024)},
    }
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
