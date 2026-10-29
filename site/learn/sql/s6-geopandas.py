# q: s6-geopandas
# status: ran
# after: py-connect
import geopandas as gpd
import shapely
from scipy.stats import chisquare

with connect() as conn:
    outline = conn.execute("SELECT ST_AsBinary(geom) FROM country_shapes WHERE country_code = 'CR'").fetchone()[0]
    eco = conn.execute(
        """SELECT e.eco_id, e.name, ST_AsBinary(e.geom)
           FROM ecoregions AS e JOIN country_shapes AS c ON c.country_code = 'CR' AND ST_Intersects(e.geom, c.geom)
           ORDER BY e.eco_id"""
    ).fetchall()
    recs = conn.execute("SELECT id, longitude, latitude FROM occurrences WHERE country_code = 'CR' ORDER BY id").fetchall()

country = gpd.GeoDataFrame(geometry=[shapely.from_wkb(bytes(outline))], crs=4326)
zones = gpd.GeoDataFrame({"eco_id": [e[0] for e in eco], "name": [e[1] for e in eco]},
                         geometry=shapely.from_wkb([bytes(e[2]) for e in eco]), crs=4326)
pieces = gpd.overlay(zones, country, how="intersection", keep_geom_type=True)
points = gpd.GeoDataFrame({"id": [r[0] for r in recs]},
                          geometry=gpd.points_from_xy([r[1] for r in recs], [r[2] for r in recs]), crs=4326)
inside = points[points.within(country.geometry.iloc[0])]
counts = gpd.sjoin(inside, pieces, predicate="within").groupby("eco_id").size()

pieces["km2"] = pieces.to_crs(6933).area / 1e6
pieces["records"] = pieces["eco_id"].map(counts).fillna(0).astype(int)
pieces = pieces.sort_values(["km2", "eco_id"], ascending=[False, True])
print(f"records coded CR: {len(points)}  inside the outline: {len(inside)}  in a zone: {pieces['records'].sum()}")
print("eco_id | km2 | records")
for z in pieces.itertuples():
    print(f"{z.eco_id} | {z.km2:.0f} | {z.records}")
expected = pieces["records"].sum() * pieces["km2"] / pieces["km2"].sum()
test = chisquare(pieces["records"], expected)
print(f"chi-square: {test.statistic:.1f}  df: {len(pieces) - 1}  p: {test.pvalue:.2g}")
