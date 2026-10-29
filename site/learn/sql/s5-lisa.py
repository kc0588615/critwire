# q: s5-lisa
# status: ran
# after: py-connect
import esda
import numpy as np
from libpysal.weights import DistanceBand

with connect() as conn:
    rows = conn.execute("SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = 5000 ORDER BY id").fetchall()
ids = [r[0] for r in rows]
y = np.array([r[1] for r in rows])
w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=10000, binary=True, ids=ids)

lisa = esda.Moran_Local(y, w, transformation="r", permutations=999, seed=2026)
cut = esda.fdr(lisa.p_sim, 0.05)
print(f"false discovery rate cut: p <= {cut:.4f}")
print("quadrant | cells | p <= 0.05 | after FDR")
for q, name in [(1, "high-high"), (2, "low-high"), (3, "low-low"), (4, "high-low")]:
    in_q = lisa.q == q
    print(f"{name} | {in_q.sum()} | {np.sum(in_q & (lisa.p_sim <= 0.05))} | {np.sum(in_q & (lisa.p_sim <= cut))}")
