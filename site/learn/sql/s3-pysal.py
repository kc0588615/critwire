# q: s3-pysal
# status: ran
# after: py-connect
import geopandas as gpd
import numpy as np
import shapely
from libpysal.weights import KNN, DistanceBand, Queen
from scipy.spatial import cKDTree

with connect() as conn:
    rows = conn.execute(
        "SELECT id, cx, cy, ST_AsBinary(geom) FROM s4_cells WHERE edge_m = 5000 ORDER BY id"
    ).fetchall()
ids = [r[0] for r in rows]
xy = np.array([(r[1], r[2]) for r in rows])
cells = gpd.GeoDataFrame({"id": ids}, geometry=shapely.from_wkb([bytes(r[3]) for r in rows]), crs=3577)

queen = Queen.from_dataframe(cells, ids="id")
band = DistanceBand(xy, threshold=10000, binary=True, ids=ids)
same = all(set(queen.neighbors[i]) == set(band.neighbors[i]) for i in ids)
print(f"queen = distance band: {same}  links: {queen.s0:.0f}  islands: {queen.islands}")
print("neighbours: cells | " + "  ".join(f"{k}: {c}" for k, c in queen.histogram))

queen.transform = "r"
rows_sum_to_one = np.allclose(np.asarray(queen.sparse.sum(axis=1)).ravel(), 1)
lone = next(i for i in ids if queen.cardinalities[i] == 1)
inner = next(i for i in ids if queen.cardinalities[i] == 6)
print(f"rows sum to 1: {rows_sum_to_one}  cell {lone} (1 neighbour): {queen.weights[lone]}  "
      f"cell {inner} (6): {[round(v, 4) for v in queen.weights[inner]]}")

knn = KNN(xy, k=4, ids=ids, silence_warnings=True)
one_way = sum(1 for i in ids for j in knn.neighbors[i] if i not in knn.neighbors[j])
d, _ = cKDTree(xy).query(xy, k=6)
tied = int(np.sum(np.round(d[:, 4], 2) == np.round(d[:, 5], 2)))
print(f"k = 4: links: {knn.s0:.0f}  one-way: {one_way}  cells with the 4th and 5th tied: {tied}")
