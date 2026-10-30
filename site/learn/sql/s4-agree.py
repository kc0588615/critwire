# q: s4-agree
# status: ran
# after: py-connect
import sys

import esda
import numpy as np
from libpysal.weights import DistanceBand

with connect() as conn:
    edges = [e for (e,) in conn.execute("SELECT DISTINCT edge_m FROM s4_cells ORDER BY edge_m")]
    grids = {}
    for edge_m in edges:
        rows = conn.execute(
            "SELECT id, y, cx, cy FROM s4_cells WHERE edge_m = %s ORDER BY id", (edge_m,)
        ).fetchall()
        sql_pairs = set(conn.execute("SELECT i, j FROM s4_neighbours WHERE edge_m = %s", (edge_m,)).fetchall())
        grids[edge_m] = (rows, sql_pairs)

table = []
for edge_m, (rows, sql_pairs) in grids.items():
    w = DistanceBand(np.array([(r[2], r[3]) for r in rows]), threshold=2 * edge_m, binary=True, ids=[r[0] for r in rows])
    pysal_pairs = {(i, j) for i, js in w.neighbors.items() for j in js}
    differ = sorted(sql_pairs ^ pysal_pairs)
    if differ:
        shown = ", ".join(f"{p} only in {'SQL' if p in sql_pairs else 'PySAL'}" for p in differ[:5])
        sys.exit(f"{edge_m} m grid: {len(differ)} neighbour pairs differ; first: {shown}")
    mi = esda.Moran(np.array([r[1] for r in rows]), w, transformation="r", permutations=0)
    table.append((edge_m, mi.n, len(pysal_pairs), mi.I, mi.EI, mi.VI_norm, mi.z_norm))

print("neighbour pairs equal s4_neighbours on every grid")
print("edge_m | n | pairs | I | E[I] | Var_norm | z_norm")
for edge_m, n, pairs, *stats in table:
    print(" | ".join([str(edge_m), str(n), str(pairs), *(repr(float(s)) for s in stats)]))
