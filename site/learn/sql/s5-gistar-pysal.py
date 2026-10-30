# q: s5-gistar-pysal
# status: ran
# after: py-connect
import esda
import numpy as np
from libpysal.weights import DistanceBand
from scipy.stats import norm

with connect() as conn:
    rows = conn.execute("SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = 5000 ORDER BY id").fetchall()
ids = [r[0] for r in rows]
y = np.array([r[1] for r in rows])
w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=10000, binary=True, ids=ids)

g = esda.G_Local(y, w, transform="B", star=True, permutations=0)
p = 2 * norm.sf(np.abs(g.Zs))
cut = esda.fdr(p, 0.05)
print("cells | hot_05 | cold_05 | hot_fdr | cold_fdr | max_z | min_z")
print(f"{len(y)} | {np.sum((g.Zs > 0) & (p <= 0.05))} | {np.sum((g.Zs < 0) & (p <= 0.05))} | "
      f"{np.sum((g.Zs > 0) & (p <= cut))} | {np.sum((g.Zs < 0) & (p <= cut))} | {g.Zs.max():.6f} | {g.Zs.min():.6f}")
