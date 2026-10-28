"""The lab shapes, geometry only (004 §4.1, plan D5). Run by `pnpm ingest shapes` (scripts/ingest/shapes.ts), never alone.

.venv-learn/bin/python -I scripts/ingest/shapes.py --in <dir> --select <select.json> --out <dir>

Reads the pinned inputs shapes.ts downloaded into --in (no network) and the 1:50m selection it made (no country rule
here), and writes into --out:
- country_shapes.parquet: country_code, geom; one selected feature per code, each checked against its cross-check
  property (ADM0_A3 or GU_A3);
- admin1_shapes.parquet: adm1_code (key), country_code (Natural Earth's iso_a2), name; iso_3166_2 dropped;
- ecoregions.parquet: eco_id (key), biome_id, name, realm; RESOLVE read in place through /vsizip/, each feature
  simplified on its own at a fixed 0.05° keeping topology. "N/A" biome and realm become NULL on ECO_ID 0 only;
- biomes.csv: biome_id, name.
GeoParquet 1.0.0 (WKB `geom`, bbox, no crs = OGC:CRS84), rows sorted by key, fixed writer options: the same inputs and
pins give byte-identical files. Invalid geometries are kept (g2 teaches them) and counted. Prints a JSON report on
stdout; any failed check exits non-zero.
"""
import argparse
import csv
import json
import platform
import sys
from pathlib import Path

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq
import pyogrio
import shapely

COUNTRIES = "ne_50m_admin_0_countries.geojson"
MAP_UNITS = "ne_50m_admin_0_map_units.geojson"
ADMIN1 = "ne_50m_admin_1_states_provinces.geojson"
RESOLVE = "Ecoregions2017.zip"
LAYERS = {"countries": COUNTRIES, "map_units": MAP_UNITS}
TOLERANCE = 0.05  # degrees (004 §4.1): the finest that keeps ecoregions.parquet under 8 MB
# RESOLVE's "no biome, no realm" value. Only ECO_ID 0 "Rock and Ice" has it (its BIOME_NUM 11 is a placeholder,
# Tundra's id): it becomes NULL biome_id and realm, a nullable FK. Any other row fails.
RESOLVE_NA = "N/A"
RESOLVE_NA_ECO_IDS = {0}
GEOMETRY_TYPES = {3: "Polygon", 6: "MultiPolygon"}
# Every pq.write_table option that shapes the bytes, spelled out (pyarrow 26's defaults, except zstd).
WRITE_OPTIONS = dict(version="2.6", compression="zstd", compression_level=None, use_dictionary=True, write_statistics=True,
                     data_page_version="1.0", store_schema=True, write_page_index=False, write_page_checksum=False,
                     use_byte_stream_split=False, use_content_defined_chunking=False)


def fail(message: str) -> None:
    raise SystemExit(f"shapes.py: {message}")


def write_geoparquet(path: Path, columns: dict, geoms: np.ndarray) -> None:
    types = sorted({int(shapely.get_type_id(g)) for g in geoms})
    unknown = [t for t in types if t not in GEOMETRY_TYPES]
    if unknown:
        fail(f"{path.name}: unexpected geometry type ids {unknown}")
    bbox = [round(float(v), 6) for v in shapely.total_bounds(geoms)]
    geo = {"version": "1.0.0", "primary_column": "geom",
           "columns": {"geom": {"encoding": "WKB", "geometry_types": [GEOMETRY_TYPES[t] for t in types], "bbox": bbox}}}
    table = pa.table({**columns, "geom": pa.array(shapely.to_wkb(geoms, include_srid=False), pa.binary())})
    table = table.replace_schema_metadata({"geo": json.dumps(geo, separators=(",", ":"))})
    pq.write_table(table, path, **WRITE_OPTIONS)


def invalid_reasons(geoms: np.ndarray) -> dict:
    reasons: dict = {}
    for r in shapely.is_valid_reason(geoms[~shapely.is_valid(geoms)]):
        key = r.split("[")[0]
        reasons[key] = reasons.get(key, 0) + 1
    return dict(sorted(reasons.items()))


def country_shapes(src: Path, selection: list, out: Path) -> dict:
    """One feature per selected code, at the layer and index shapes.ts picked; its cross-check property must match."""
    frames = {layer: pyogrio.read_dataframe(src / name, columns=["ADM0_A3" if layer == "countries" else "GU_A3"])
              for layer, name in LAYERS.items()}
    codes, geoms, checked = [], [], 0
    for s in sorted(selection, key=lambda s: s["code"]):
        df = frames[s["layer"]]
        if not 0 <= s["index"] < len(df):
            fail(f"{s['code']}: {s['layer']} has no feature {s['index']}")
        got = df[s["check"]["field"]].iloc[s["index"]]
        if got != s["check"]["value"]:
            fail(f"{s['code']}: {s['layer']} feature {s['index']} {s['check']['field']} is {got!r}, selection says {s['check']['value']!r}")
        checked += 1
        codes.append(s["code"])
        geoms.append(df.geometry.iloc[s["index"]])
    if len(set(codes)) != len(codes):
        fail("country_shapes: a code selected twice")
    geoms = np.asarray(geoms, dtype=object)
    if shapely.is_missing(geoms).any() or shapely.is_empty(geoms).any():
        fail("country_shapes: a selected feature has no geometry")
    write_geoparquet(out / "country_shapes.parquet", {"country_code": pa.array(codes, pa.string())}, geoms)
    return {"rows": len(codes), "invalid": invalid_reasons(geoms), "checked": checked}


def admin1_shapes(src: Path, out: Path) -> dict:
    df = pyogrio.read_dataframe(src / ADMIN1, columns=["adm1_code", "iso_a2", "name"])
    if df.adm1_code.isna().any() or (df.adm1_code == "").any():
        fail("admin-1: a feature has no adm1_code")
    if not df.adm1_code.is_unique:
        fail("admin-1: adm1_code not unique")
    df = df.sort_values("adm1_code", kind="stable").reset_index(drop=True)
    geoms = np.asarray(df.geometry.values)
    write_geoparquet(out / "admin1_shapes.parquet",
                     {"adm1_code": pa.array(df.adm1_code), "country_code": pa.array(df.iso_a2), "name": pa.array(df["name"])},
                     geoms)
    return {"rows": len(df), "invalid": invalid_reasons(geoms), "codes": sorted(df.iso_a2.unique())}


def ecoregions(src: Path, out: Path) -> tuple:
    df = pyogrio.read_dataframe(f"/vsizip/{src / RESOLVE}/Ecoregions2017.shp",
                                columns=["ECO_ID", "BIOME_NUM", "BIOME_NAME", "ECO_NAME", "REALM"])
    if not df.ECO_ID.is_unique:
        fail("RESOLVE: ECO_ID not unique")
    df = df.sort_values("ECO_ID", kind="stable").reset_index(drop=True)
    na = (df.BIOME_NAME == RESOLVE_NA) | (df.REALM == RESOLVE_NA)
    if set(df.ECO_ID[na]) != RESOLVE_NA_ECO_IDS:
        fail(f"RESOLVE: {RESOLVE_NA!r} biome or realm on ECO_ID {sorted(df.ECO_ID[na])}, expected {sorted(RESOLVE_NA_ECO_IDS)}")
    if not (df.BIOME_NUM == df.BIOME_NUM.round()).all():
        fail("RESOLVE: BIOME_NUM not integral")
    biomes = sorted({(int(b), n) for b, n in zip(df.BIOME_NUM[~na], df.BIOME_NAME[~na])})
    if len({b for b, _ in biomes}) != len(biomes):
        fail(f"RESOLVE: a biome id has two names: {biomes}")
    with open(out / "biomes.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["biome_id", "name"])
        w.writerows(biomes)

    print(f"ecoregions: simplifying {len(df)} features at {TOLERANCE}° (a few minutes)", file=sys.stderr)
    geoms = shapely.simplify(np.asarray(df.geometry.values), TOLERANCE, preserve_topology=True)
    empty = int(shapely.is_empty(geoms).sum())
    if empty:
        fail(f"ecoregions: {empty} geometries empty after simplify")
    write_geoparquet(out / "ecoregions.parquet",
                     {"eco_id": pa.array(df.ECO_ID.astype("int32")), "biome_id": pa.array(df.BIOME_NUM.astype("int32").mask(na), pa.int32()),
                      "name": pa.array(df.ECO_NAME), "realm": pa.array(df.REALM.mask(na), pa.string())},
                     geoms)
    return {"rows": len(df), "invalid": invalid_reasons(geoms)}, {"rows": len(biomes)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0], formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--in", dest="src", type=Path, required=True, help="folder with the four pinned inputs")
    parser.add_argument("--select", type=Path, required=True, help="shapes.ts's 1:50m selection (JSON)")
    parser.add_argument("--out", type=Path, required=True, help="empty folder for the four outputs")
    args = parser.parse_args()
    if any(args.out.iterdir()):
        fail(f"{args.out} is not empty")
    selection = json.loads(args.select.read_text(encoding="utf-8"))

    shapes = country_shapes(args.src, selection, args.out)
    admin1 = admin1_shapes(args.src, args.out)
    eco, biomes = ecoregions(args.src, args.out)
    report = {
        "tools": {"python": platform.python_version(), "shapely": shapely.__version__, "geos": shapely.geos_version_string,
                  "pyogrio": pyogrio.__version__, "gdal": pyogrio.__gdal_version_string__, "pyarrow": pa.__version__,
                  "numpy": np.__version__},
        "tolerance": TOLERANCE,
        "crossChecked": shapes.pop("checked"),
        "admin1CountryCodes": admin1.pop("codes"),
        "outputs": {"admin1_shapes.parquet": admin1, "biomes.csv": biomes, "country_shapes.parquet": shapes,
                    "ecoregions.parquet": eco},
    }
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
