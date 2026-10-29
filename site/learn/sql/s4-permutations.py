# q: s4-permutations
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

np.random.seed(2026)
mi = esda.Moran(y, w, transformation="r", permutations=999)
print(f"I: {mi.I:.6f}  shuffles: {mi.permutations}")
print(f"shuffled I: mean {mi.EI_sim:.6f}  sd {mi.seI_sim:.6f}  max {mi.sim.max():.6f}")
print(f"pseudo p: {mi.p_sim:.4f}  z_sim: {mi.z_sim:.2f}")
