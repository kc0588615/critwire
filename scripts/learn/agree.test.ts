// The agreement gates (plan L4 §6, D12; AG1–AG8), on rendered results in the blocks' formats. Written before the code,
// seen failing first. Failure modes:
// - AG1: a grid row missing on either side of the Moran pair passes (the gate compares only common grids) → failed,
//   naming the grid;
// - AG2: a statistic more than 5e-7 off passes (only n checked, or a loose threshold) → failed, naming it and both values;
// - AG3: two values within 5e-7 that round to different 6-decimal strings pass → failed;
// - AG4: n differs → failed;
// - AG5: Gi*'s SQL line and PySAL's data line differ → failed;
// - AG6: a LISA quadrant's cell count differs, or a quadrant is missing on one side → failed;
// - AG7: a zone's records differ, km² differ by more than 1, or a shown zone is missing in GeoPandas → failed;
// - AG8: a pair with one block in the run fails the run (a --module run on one page) → skipped; a result whose table
//   can't be found is a failure, never a silent pass.
import assert from "node:assert/strict";
import { test } from "node:test";
import { agreement } from "./agree.ts";

const MORAN_SQL = `-- result: s4-moran-sql · 2 rows · sha256 7cd3a5f317d7
edge_m | n | i | ei | var_norm | z
5000 | 1094 | 0.27329612511604184 | -0.0009149130832570906 | 0.000326399057870225 | 15.177857980449323
10000 | 296 | 0.2035877773186644 | -0.003389830508474576 | 0.0012597916525627741 | 5.831415676740585`;
const agreeRow5 = "5000 | 1094 | 5432 | 0.27329612511604184 | -0.0009149130832570906 | 0.000326399057870225 | 15.177857980449323";
const agreeRow10 = "10000 | 296 | 1180 | 0.2035877773186644 | -0.003389830508474576 | 0.0012597916525627741 | 5.831415676740585";
const s4Agree = (...rows: string[]) => `-- result: s4-agree · python · sha256 000000000000
neighbour pairs equal s4_neighbours on every grid
edge_m | n | pairs | I | E[I] | Var_norm | z_norm
${rows.join("\n")}`;

const GISTAR_HEAD = "cells | hot_05 | cold_05 | hot_fdr | cold_fdr | max_z | min_z";
const GISTAR_SQL = `-- result: s5-gistar · 1 row · sha256 84ede64c9841\n${GISTAR_HEAD}\n1094 | 99 | 0 | 39 | 0 | 10.632449 | -1.289294`;
const gistarPy = (line: string) => `-- result: s5-gistar-pysal · python · sha256 42a8f2bf8f68\n${GISTAR_HEAD}\n${line}`;

const LISA_PY = `-- result: s5-lisa · python · sha256 ff0ae1985d8b
false discovery rate cut: p <= 0.0021
quadrant | cells | p <= 0.05 | after FDR
high-high | 185 | 68 | 16
low-high | 230 | 34 | 2
low-low | 557 | 0 | 0
high-low | 122 | 29 | 29`;
const lisaSql = (...rows: string[]) => `-- result: s5-lisa-sql · ${rows.length} rows · sha256 000000000000\nquadrant | cells\n${rows.join("\n")}`;
const LISA_ROWS = ["high-high | 185", "low-high | 230", "low-low | 557", "high-low | 122"];

const zones = (...rows: string[]) => `-- result: s6-zones · 7 rows · sha256 72c259664d1d
eco_id | name | km2 | records | jaguar | per_1000_km2 | record_ratio | jaguar_ratio
${rows.join("\n")}
… 2 more rows`;
const ZONE_ROWS = [
  "470 | Isthmian-Atlantic moist forests | 17288 | 215 | 0 | 12.4 | 1.23 | 0.00",
  "527 | Central American dry forests | 6062 | 62 | 61 | 10.2 | 1.01 | 7.29",
];
const geopandas = (...rows: string[]) => `-- result: s6-geopandas · python · sha256 1c182b76d465
records coded CR: 619  inside the outline: 591  in a zone: 504
eco_id | km2 | records
${rows.join("\n")}
chi-square: 77.4  df: 6  p: 1.2e-14`;
const GEO_ROWS = ["470 | 17288 | 215", "527 | 6061 | 62", "617 | 636 | 7"];

const run = (results: Record<string, string>) => agreement(new Map(Object.entries(results)));
const gate = (results: Record<string, string>, name: string) => {
  const g = run(results).find((r) => r.gate === name);
  assert.ok(g, `gate ${name} reported`);
  return g;
};
const fails = (results: Record<string, string>, name: string, pattern: RegExp) => {
  const g = gate(results, name);
  assert.equal(g.skipped, false);
  assert.ok(g.failures.some((f) => pattern.test(f)), `expected ${pattern} in:\n${g.failures.join("\n")}`);
  assert.ok(g.failures.every((f) => /fix the SQL, never the threshold/.test(f)));
};
const passes = (results: Record<string, string>, name: string) => assert.deepEqual(gate(results, name), { gate: name, skipped: false, failures: [] });

test("AG1 a grid row missing on either side fails, naming the grid", () => {
  fails({ "s4-moran-sql": MORAN_SQL, "s4-agree": s4Agree(agreeRow5) }, "moran", /edge_m 10000: no s4-agree row/);
  const sql5 = MORAN_SQL.split("\n").slice(0, 3).join("\n");
  fails({ "s4-moran-sql": sql5, "s4-agree": s4Agree(agreeRow5, agreeRow10) }, "moran", /edge_m 10000: no s4-moran-sql row/);
  passes({ "s4-moran-sql": MORAN_SQL, "s4-agree": s4Agree(agreeRow5, agreeRow10) }, "moran");
});

test("AG2 a statistic more than 5e-7 off fails, naming it and both values", () => {
  const off = agreeRow5.replace("15.177857980449323", "15.177858980449323");
  fails({ "s4-moran-sql": MORAN_SQL, "s4-agree": s4Agree(off, agreeRow10) }, "moran",
    /edge_m 5000: z_norm 15\.177858980449323 vs z 15\.177857980449323/);
  const offI = agreeRow10.replace("0.2035877773186644", "0.2035867773186644");
  fails({ "s4-moran-sql": MORAN_SQL, "s4-agree": s4Agree(agreeRow5, offI) }, "moran", /edge_m 10000: I 0\.2035867773186644 vs i 0\.2035877773186644/);
});

test("AG3 values within 5e-7 whose 6-decimal strings differ fail; equal strings within 5e-7 pass", () => {
  // 0.2732965 rounds to 0.273297 (shown 0.273296 + 4e-7 vs 0.273296 - 1e-8): within 5e-7, different strings.
  const sql = MORAN_SQL.replace("0.27329612511604184", "0.2732964999");
  const py = agreeRow5.replace("0.27329612511604184", "0.2732965001");
  fails({ "s4-moran-sql": sql, "s4-agree": s4Agree(py, agreeRow10) }, "moran", /edge_m 5000: I 0\.2732965001 vs i 0\.2732964999: 0\.273297 vs 0\.273296/);
  const near = agreeRow5.replace("0.27329612511604184", "0.27329612611604184");
  passes({ "s4-moran-sql": MORAN_SQL, "s4-agree": s4Agree(near, agreeRow10) }, "moran");
});

test("AG4 n differs: fails", () => {
  fails({ "s4-moran-sql": MORAN_SQL, "s4-agree": s4Agree(agreeRow5.replace("5000 | 1094", "5000 | 1093"), agreeRow10) }, "moran",
    /edge_m 5000: n 1093 vs 1094/);
});

test("AG5 Gi*'s SQL line and PySAL's data line differ: fails", () => {
  fails({ "s5-gistar": GISTAR_SQL, "s5-gistar-pysal": gistarPy("1094 | 99 | 0 | 38 | 0 | 10.632449 | -1.289294") }, "gistar",
    /s5-gistar 1094 \| 99 \| 0 \| 39 \| 0 \| 10\.632449 \| -1\.289294 vs s5-gistar-pysal 1094 \| 99 \| 0 \| 38/);
  passes({ "s5-gistar": GISTAR_SQL, "s5-gistar-pysal": gistarPy("1094 | 99 | 0 | 39 | 0 | 10.632449 | -1.289294") }, "gistar");
});

test("AG6 a LISA quadrant count differs or is missing: fails", () => {
  fails({ "s5-lisa": LISA_PY, "s5-lisa-sql": lisaSql("high-high | 185", "low-high | 231", "low-low | 557", "high-low | 122") }, "lisa",
    /low-high: cells 231 vs 230/);
  fails({ "s5-lisa": LISA_PY, "s5-lisa-sql": lisaSql(...LISA_ROWS.slice(0, 3)) }, "lisa", /high-low: no s5-lisa-sql row/);
  passes({ "s5-lisa": LISA_PY, "s5-lisa-sql": lisaSql(...LISA_ROWS) }, "lisa");
});

test("AG7 zonal records differ, km² differ by more than 1, or a shown zone is missing: fails", () => {
  fails({ "s6-zones": zones(...ZONE_ROWS), "s6-geopandas": geopandas("470 | 17288 | 214", "527 | 6061 | 62") }, "zonal",
    /eco_id 470: records 215 vs 214/);
  fails({ "s6-zones": zones(...ZONE_ROWS), "s6-geopandas": geopandas("470 | 17290 | 215", "527 | 6061 | 62") }, "zonal",
    /eco_id 470: km2 17288 vs 17290/);
  fails({ "s6-zones": zones(...ZONE_ROWS), "s6-geopandas": geopandas("470 | 17288 | 215") }, "zonal", /eco_id 527: no s6-geopandas row/);
  passes({ "s6-zones": zones(...ZONE_ROWS), "s6-geopandas": geopandas(...GEO_ROWS) }, "zonal");
});

test("AG8 a pair with one block in the run is skipped; a result without its table fails", () => {
  const all = run({ "s4-moran-sql": MORAN_SQL, "s5-gistar-pysal": gistarPy("x"), "s5-lisa": LISA_PY, "s6-geopandas": geopandas(...GEO_ROWS) });
  assert.deepEqual(all.map((g) => [g.gate, g.skipped, g.failures.length]),
    [["moran", true, 0], ["gistar", true, 0], ["lisa", true, 0], ["zonal", true, 0]]);
  assert.deepEqual(run({}).map((g) => g.skipped), [true, true, true, true]);
  fails({ "s4-moran-sql": MORAN_SQL, "s4-agree": "-- result: s4-agree · python · sha256 0\nno table" }, "moran",
    /s4-agree: no table with columns edge_m, n, I, E\[I\], Var_norm, z_norm/);
});
