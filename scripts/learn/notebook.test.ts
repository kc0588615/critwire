// notebook.ts and the .ipynb downloads (L4 plan §5; AS13 = the architecture's AS3). Written before the code, seen
// failing first. Failure modes:
// - the notebook runs something the .py doesn't, or in another order → its code cells are the .py's segments, in order;
// - an untested block is a code cell, so "Run all" submits e1's GBIF download → a Markdown cell, never code;
// - two cells share an id (nbformat 4.5 rejects the file) or an id nbformat refuses → refused;
// - the same course gives other bytes (key order, indent), so the build and freshness disagree → sorted keys,
//   1-space indent, a final newline, same bytes twice.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleDownloads } from "./assemble.ts";
import { parseBlock, type Block } from "./blocks.ts";
import type { CoursePage } from "./course.ts";
import { notebook } from "./notebook.ts";

function file(name: string, ...lines: string[]): Block {
  const { block: b, errors } = parseBlock(`site/learn/sql/${name}`, lines.join("\n") + "\n");
  assert.deepEqual(errors, [], name);
  return b!;
}
const page = (id: string, ...blocks: Block[]): CoursePage => ({ page: { id, file: `site/learn/modules/${id}.html`, html: "" }, slots: [], blocks });

test("AS13 the writer: nbformat 4.5, kernelspec python3, source as lines, sorted keys, 1-space indent, final newline", () => {
  const text = notebook([{ id: "a-md", type: "markdown", source: "## a" }, { id: "a", type: "code", source: "import x\nprint(1)" }]);
  assert.equal(text, `{
 "cells": [
  {
   "cell_type": "markdown",
   "id": "a-md",
   "metadata": {},
   "source": [
    "## a"
   ]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "id": "a",
   "metadata": {},
   "outputs": [],
   "source": [
    "import x\\n",
    "print(1)"
   ]
  }
 ],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "name": "python"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 5
}
`);
  assert.throws(() => notebook([{ id: "a", type: "code", source: "x" }, { id: "a", type: "markdown", source: "y" }]), /notebook: cell id "a" twice/);
  assert.throws(() => notebook([{ id: "a b", type: "code", source: "x" }]), /notebook: cell id "a b" isn't \[A-Za-z0-9_-\]\{1,64\}/);
});

test("AS13 the .ipynb: code cells = the .py's segments in order; untested is Markdown; unique ids; same bytes twice", () => {
  const session = file("pg-session.sql", "-- q: pg-session", "-- status: ran", "-- engine: postgis", "SET search_path = learn_curriculum, public;", "SHOW search_path;");
  const connect = file("py-connect.py", "# q: py-connect", "# status: ran", "import psycopg", "", "", "def connect():", "    return psycopg.connect()");
  const cells = file("s4-cells.sql", "-- q: s4-cells", "-- status: ran", "-- boot", "-- engine: postgis", "CREATE TABLE s4_cells AS SELECT 1 AS id;");
  const moran = file("s4-moran.py", "# q: s4-moran", "# status: ran", "# after: py-connect", "with connect() as conn:", '    print(conn.execute("SELECT count(*) FROM s4_cells").fetchone()[0])');
  const later = file("s4-later.py", "# q: s4-later", "# status: untested: needs arcpy", "import arcpy", "", "arcpy.x()");
  const course = [page("setup", session, connect), page("s4", cells, moran, later)];
  const ds = assembleDownloads(course);
  const py = ds.find((d) => d.name === "s4.py")!;
  const nb = ds.find((d) => d.name === "s4.ipynb")!;
  assert.equal(nb.kind, "ipynb");
  assert.equal(nb.text, assembleDownloads(course).find((d) => d.name === "s4.ipynb")!.text, "same bytes twice");
  type Cell = { cell_type: string; id: string; source: string[] };
  const json = JSON.parse(nb.text) as { cells: Cell[]; nbformat: number; nbformat_minor: number };
  assert.deepEqual([json.nbformat, json.nbformat_minor], [4, 5]);
  const ids = json.cells.map((c) => c.id);
  assert.deepEqual(ids, ["about", "py-connect", "s4-cells", "s4-moran-md", "s4-moran", "s4-later-md", "s4-later"]);
  const src = (c: Cell) => c.source.join("");
  const segments = py.text.split(/\n\n(?=# %% )/).slice(1).map((s) => s.replace(/^# %% .*\n/, "").replace(/\n$/, ""));
  const code = json.cells.filter((c) => c.cell_type === "code");
  assert.deepEqual(code.map(src), segments.slice(0, 3), "code cells = the .py's segments, untested excepted");
  assert.deepEqual(code.map((c) => c.id), ["py-connect", "s4-cells", "s4-moran"]);
  const md = new Map(json.cells.filter((c) => c.cell_type === "markdown").map((c) => [c.id, src(c)]));
  assert.equal(md.get("s4-moran-md"), "## s4-moran");
  assert.equal(md.get("s4-later"), ["not run from this file: needs arcpy. Run it by hand, as its page says.", "", "```python", later.text.trimEnd(), "```"].join("\n"));
  assert.match(md.get("about")!, /^critwire Learn: \/learn\/labs\/s4\.ipynb\n/);
  assert.match(md.get("about")!, /LEARN_BASE/);
});
