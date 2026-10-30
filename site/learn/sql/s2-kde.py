# q: s2-kde
# status: ran
# after: py-connect
import numpy as np
from sklearn.neighbors import KernelDensity

with connect() as conn:
    points = np.array(conn.execute(
        """SELECT ST_X(g), ST_Y(g)
           FROM (SELECT ST_Transform(o.geom, 3577) AS g
                 FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
                 WHERE s.scientific_name = 'Sarcophilus harrisii') AS devils
           ORDER BY 1, 2"""
    ).fetchall())
    cells = conn.execute(
        "SELECT id, n, cx, cy, ST_Area(geom) FROM s4_cells WHERE edge_m = 5000 ORDER BY id"
    ).fetchall()

kde = KernelDensity(bandwidth=5000, kernel="gaussian").fit(points)
centroids = np.array([(c[2], c[3]) for c in cells])
per_km2 = np.exp(kde.score_samples(centroids)) * len(points) * 1e6
cell_km2 = cells[0][4] / 1e6

print(f"records: {len(points)}  cells: {len(cells)}  cell area: {cell_km2:.2f} km2")
print(f"density x area, summed over the cells: {(per_km2 * cell_km2).sum():.0f} records")
print("densest cells: id | records in cell | records per km2")
for k in np.argsort(-per_km2, kind="stable")[:5]:
    print(f"{cells[k][0]} | {cells[k][1]} | {per_km2[k]:.3f}")
