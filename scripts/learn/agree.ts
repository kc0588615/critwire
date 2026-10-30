// The agreement gates (plan L4 §6, D12): SQL and PySAL must agree, checked over a learn:check run's rendered results
// (checked/<id>.txt's text), so the pairs are tested on every run and no SQL is copied into Python. Pure.
// - moran: s4-agree's rows (esda at full precision; the block asserts the neighbour pairs itself) against
//   s4-moran-sql's: a row per grid on both sides, n equal, each statistic within 5e-7 and the same 6-decimal string;
// - gistar: s5-gistar's row equals s5-gistar-pysal's data line;
// - lisa: s5-lisa-sql's cells per quadrant equal s5-lisa's cells column;
// - zonal: each zone s6-zones shows has s6-geopandas' records and km² within 1.
// A pair is checked when both of its blocks rendered a result in the run, else skipped. Tests: agree.test.ts (AG1–AG8).

export interface GateResult {
  gate: string;
  /** Only one block of the pair (or neither) rendered a result in the run. */
  skipped: boolean;
  failures: string[];
}

const TOLERANCE = 5e-7;
const SEP = " | ";

type Row = Record<string, string>;

/** The rows of the first table in `text` whose header holds every one of `columns` (until a line of another width). */
function table(id: string, text: string, columns: readonly string[]): Row[] {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => {
    const head = l.split(SEP);
    return columns.every((c) => head.includes(c));
  });
  if (at < 0) throw new Error(`${id}: no table with columns ${columns.join(", ")}`);
  const head = lines[at]!.split(SEP);
  const rows: Row[] = [];
  for (const line of lines.slice(at + 1)) {
    const cells = line.split(SEP);
    if (cells.length !== head.length) break;
    rows.push(Object.fromEntries(head.map((h, i) => [h, cells[i]!])));
  }
  return rows;
}

function byKey(id: string, rows: readonly Row[], key: string): Map<string, Row> {
  const map = new Map<string, Row>();
  for (const r of rows) {
    if (map.has(r[key]!)) throw new Error(`${id}: ${key} ${r[key]} appears twice`);
    map.set(r[key]!, r);
  }
  return map;
}

function num(id: string, value: string, column: string): number {
  const n = Number(value);
  if (value.trim() === "" || !Number.isFinite(n)) throw new Error(`${id}: ${column} ${JSON.stringify(value)} isn't a number`);
  return n;
}

/** Every key of either side, in a's order then b's; a key missing on one side is named. */
function joinKeys(a: Map<string, Row>, b: Map<string, Row>, label: string, aId: string, bId: string, failures: string[]): [string, Row, Row][] {
  const both: [string, Row, Row][] = [];
  for (const k of new Set([...a.keys(), ...b.keys()])) {
    const ra = a.get(k);
    const rb = b.get(k);
    if (!ra) failures.push(`${label} ${k}: no ${aId} row`);
    else if (!rb) failures.push(`${label} ${k}: no ${bId} row`);
    else both.push([k, ra, rb]);
  }
  return both;
}

// s4-agree's column → s4-moran-sql's.
const MORAN_STATS = [["I", "i"], ["E[I]", "ei"], ["Var_norm", "var_norm"], ["z_norm", "z"]] as const;

function moran(r: ReadonlyMap<string, string>): string[] {
  const failures: string[] = [];
  const py = byKey("s4-agree", table("s4-agree", r.get("s4-agree")!, ["edge_m", "n", "I", "E[I]", "Var_norm", "z_norm"]), "edge_m");
  const sql = byKey("s4-moran-sql", table("s4-moran-sql", r.get("s4-moran-sql")!, ["edge_m", "n", "i", "ei", "var_norm", "z"]), "edge_m");
  for (const [edge, p, s] of joinKeys(py, sql, "edge_m", "s4-agree", "s4-moran-sql", failures)) {
    if (num("s4-agree", p.n!, "n") !== num("s4-moran-sql", s.n!, "n")) failures.push(`edge_m ${edge}: n ${p.n} vs ${s.n}`);
    for (const [pc, sc] of MORAN_STATS) {
      const a = num("s4-agree", p[pc]!, pc);
      const b = num("s4-moran-sql", s[sc]!, sc);
      const what = `edge_m ${edge}: ${pc} ${p[pc]} vs ${sc} ${s[sc]}`;
      if (Math.abs(a - b) > TOLERANCE) failures.push(`${what}: differ by ${Math.abs(a - b)} > ${TOLERANCE}`);
      else if (a.toFixed(6) !== b.toFixed(6)) failures.push(`${what}: ${a.toFixed(6)} vs ${b.toFixed(6)} to 6 decimals`);
    }
  }
  return failures;
}

const GISTAR_COLUMNS = ["cells", "hot_05", "cold_05", "hot_fdr", "cold_fdr", "max_z", "min_z"];

function gistar(r: ReadonlyMap<string, string>): string[] {
  const line = (id: string) => {
    const rows = table(id, r.get(id)!, GISTAR_COLUMNS);
    if (rows.length !== 1) throw new Error(`${id}: ${rows.length} rows, expected 1`);
    return GISTAR_COLUMNS.map((c) => rows[0]![c]).join(SEP);
  };
  const sql = line("s5-gistar");
  const py = line("s5-gistar-pysal");
  return sql === py ? [] : [`s5-gistar ${sql} vs s5-gistar-pysal ${py}`];
}

function lisa(r: ReadonlyMap<string, string>): string[] {
  const failures: string[] = [];
  const sql = byKey("s5-lisa-sql", table("s5-lisa-sql", r.get("s5-lisa-sql")!, ["quadrant", "cells"]), "quadrant");
  const py = byKey("s5-lisa", table("s5-lisa", r.get("s5-lisa")!, ["quadrant", "cells"]), "quadrant");
  for (const [q, s, p] of joinKeys(sql, py, "quadrant", "s5-lisa-sql", "s5-lisa", failures)) {
    if (num("s5-lisa-sql", s.cells!, "cells") !== num("s5-lisa", p.cells!, "cells")) failures.push(`quadrant ${q}: cells ${s.cells} vs ${p.cells}`);
  }
  return failures;
}

function zonal(r: ReadonlyMap<string, string>): string[] {
  const failures: string[] = [];
  const geo = byKey("s6-geopandas", table("s6-geopandas", r.get("s6-geopandas")!, ["eco_id", "km2", "records"]), "eco_id");
  for (const z of table("s6-zones", r.get("s6-zones")!, ["eco_id", "km2", "records"])) {
    const g = geo.get(z.eco_id!);
    if (!g) {
      failures.push(`eco_id ${z.eco_id}: no s6-geopandas row`);
      continue;
    }
    if (num("s6-zones", z.records!, "records") !== num("s6-geopandas", g.records!, "records")) failures.push(`eco_id ${z.eco_id}: records ${z.records} vs ${g.records}`);
    if (Math.abs(num("s6-zones", z.km2!, "km2") - num("s6-geopandas", g.km2!, "km2")) > 1) failures.push(`eco_id ${z.eco_id}: km2 ${z.km2} vs ${g.km2}: differ by more than 1`);
  }
  return failures;
}

const GATES: readonly { gate: string; blocks: readonly [string, string]; check: (r: ReadonlyMap<string, string>) => string[] }[] = [
  { gate: "moran", blocks: ["s4-moran-sql", "s4-agree"], check: moran },
  { gate: "gistar", blocks: ["s5-gistar", "s5-gistar-pysal"], check: gistar },
  { gate: "lisa", blocks: ["s5-lisa-sql", "s5-lisa"], check: lisa },
  { gate: "zonal", blocks: ["s6-zones", "s6-geopandas"], check: zonal },
];

/** Every gate over `results` (block id → its rendered result), in order; a failure names the pair and the value. */
export function agreement(results: ReadonlyMap<string, string>): GateResult[] {
  return GATES.map(({ gate, blocks, check }) => {
    if (!blocks.every((id) => results.has(id))) return { gate, skipped: true, failures: [] };
    let found: string[];
    try {
      found = check(results);
    } catch (e) {
      found = [(e as Error).message];
    }
    const pair = blocks.join(" vs ");
    return { gate, skipped: false, failures: found.map((f) => `agree ${gate} (${pair}): ${f}: fix the SQL, never the threshold`) };
  });
}
