// A Learn page's HTML (module-html.ts; plan D12, F10, S13; 004 §7.2), written before the code. Failure modes: a slot
// the pass doesn't know, or a stray `{{`, reaches the page as text (F10); a block's code closes its own element or its
// `{{` (M records) trips the leftover check; a PostGIS block shows no result, another block's, or versions other than
// checked.json's, or the versions line repeats; a ran block without its recorded result reaches a deployable page; a
// Power BI block's inputs aren't the published star files; an editor loses its `-- after:` chain or its probe's
// expected error; a skip check on a block the browser can't run; Previous/Next or a prerequisite link to a page that
// doesn't exist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlock, type Block } from "../../learn/blocks.ts";
import type { Curriculum, Module, Slot } from "../../learn/course.ts";
import { fillBlockSlots, moduleFrame, moduleUrl, renderFragment, type PageContext } from "./module-html.ts";

function block(file: string, text: string): Block {
  const { block, errors } = parseBlock(file, text);
  assert.deepEqual(errors, []);
  return block!;
}
const LESSON = block("site/learn/sql/x1-count.sql", "-- q: x1-count\n-- status: ran\nSELECT count(*) AS n FROM species WHERE a < 3;\n");
const AFTER = block("site/learn/sql/x1-more.sql", "-- q: x1-more\n-- status: ran\n-- after: x1-count\nSELECT 1 AS one;\n");
const EX = block("site/learn/sql/x1-ex.sql", "-- q: x1-ex\n-- status: ran\nCREATE TABLE t (a INTEGER PRIMARY KEY);\nSELECT 1 AS one;\n");
const PROBE = block("site/learn/sql/x1-probe.sql", "-- q: x1-probe\n-- status: ran\n-- after: x1-ex\n-- expect: error Duplicate key\nINSERT INTO t VALUES (1), (1);\n");
const PG = block("site/learn/sql/x1-pg.sql", "-- q: x1-pg\n-- status: ran\n-- engine: postgis\nSELECT '</pre>' AS tag;\n");
const PG2 = block("site/learn/sql/x1-pg2.sql", "-- q: x1-pg2\n-- status: untested: it needs two psql windows\n-- engine: postgis\nSELECT 2 AS two;\n");
const PBI = block("site/learn/sql/x1-pbi.m", '// q: x1-pbi\n// status: untested: Power BI is Windows-only\n// input: star/dim_country.csv\nlet T = Table.TransformColumnTypes(S, {{"a", type text}}) in T\n');

const ctx = (over: Partial<PageContext> = {}): PageContext => ({
  file: "site/learn/modules/x1.html",
  blocks: new Map([LESSON, AFTER, EX, PROBE, PG, PG2, PBI].map((b) => [b.id, b])),
  recorded: new Map([["x1-pg", "-- result: x1-pg · 1 row · sha256 000000000000\ntag\n</pre>"]]),
  stamp: { checked: "2026-10-28", versions: { postgresql: "16.15", postgis: "3.4.2", geos: "3.12.1" } },
  download: "x1.sql",
  star: { "dim_country.csv": { rows: 250, sha256: "ab".repeat(32) } },
  draft: false,
  erdTitles: { schema: "Schema v2", lab: "The lab database" },
  ...over,
});
const render = (html: string, over: Partial<PageContext> = {}) => renderFragment(html, ctx(over));
const count = (html: string, s: string) => html.split(s).length - 1;

test("MH1 a leftover {{ is refused, naming the page", () => {
  for (const html of ["<p>{{title}}</p>", "<p>{{ block:x1-count }}</p>", "<p>{{block:x1-count}</p>", "<p>a {{ b</p>"]) {
    assert.throws(() => fillBlockSlots("site/learn/modules/x1.html", html, () => ""), /^Error: site\/learn\/modules\/x1\.html: a leftover \{\{/, html);
  }
  assert.equal(fillBlockSlots("p.html", "<p>{{block:a}} and {{exercise:b in order}}</p>", (s: Slot) => `[${s.kind} ${s.name} ${s.inOrder}]`),
    "<p>[block a false] and [exercise b true]</p>");
});

test("MH2 an unknown slot kind is refused", () => {
  assert.throws(() => fillBlockSlots("site/learn/modules/x1.html", "{{video:x1-count}}", () => ""), /site\/learn\/modules\/x1\.html: unknown slot kind "video"/);
});

test("MH3 code is escaped, and a `{{` in it (M records) is no leftover", () => {
  const html = render("{{block:x1-count}}\n{{block:x1-pg}}\n{{block:x1-pbi}}");
  assert.ok(html.includes("WHERE a &lt; 3;"));
  assert.ok(html.includes("&#39;&lt;/pre&gt;&#39;"));
  assert.ok(html.includes("{{&quot;a&quot;, type text}}"));
  assert.ok(!html.includes("</pre>' AS"));
});

test("MH4 a browser block is an editor with its id, `-- after:` chain and probe text; no test headers in the editor", () => {
  const html = render("{{block:x1-count}}{{block:x1-more}}{{exercise:x1-ex}}{{block:x1-probe}}");
  assert.match(html, /<textarea id="sql-x1-count" data-block="x1-count"[^>]*>\nSELECT count\(\*\)/);
  assert.match(html, /data-block="x1-more" data-after="x1-count"/);
  assert.ok(html.includes('Runs after: <a href="#q-x1-count">x1-count</a>'));
  assert.match(html, /data-block="x1-probe" data-after="x1-ex" data-expect="Duplicate key"/);
  assert.ok(!html.includes("-- q:") && !html.includes("-- status:"));
  // the exercise: an empty answer, Check, a live verdict, and the reference behind Show answer
  assert.match(html, /<div class="block exercise" id="q-x1-ex" data-exercise="x1-ex" data-ordered="false" data-after="">/);
  assert.match(html, /<textarea id="answer-x1-ex"[^>]*>\n<\/textarea>/);
  assert.match(html, /<details><summary>Show answer<\/summary><pre class="code"><code data-block="x1-ex">CREATE TABLE t/);
  assert.match(render("{{exercise:x1-ex in order}}"), /data-ordered="true"/);
});

test("MH5 a PostGIS block: code, its recorded result, the download; the versions line once per page", () => {
  const html = render("{{block:x1-pg}}{{block:x1-pg2}}");
  assert.equal(count(html, "Checked 2026-10-28 on PostgreSQL 16.15, PostGIS 3.4.2, GEOS 3.12.1."), 1);
  assert.ok(html.indexOf("Checked 2026-10-28") < html.indexOf('id="q-x1-pg"'));
  assert.ok(html.includes('<pre class="recorded">\n-- result: x1-pg · 1 row · sha256 000000000000\ntag\n&lt;/pre&gt;</pre>'));
  assert.ok(html.includes('<p class="untested">Not run here: it needs two psql windows.</p>'));
  assert.equal(count(html, '<a href="/learn/labs/x1.sql">x1.sql</a>'), 2);
  assert.equal(count(html, 'data-dialog="lab"'), 2);
  assert.equal(count(html, '<dialog id="dialog-lab"'), 1);
});

test("MH6 a ran PostGIS block without its recorded result: refused, unless --draft; no checked.json: refused", () => {
  assert.throws(() => render("{{block:x1-pg}}", { recorded: new Map() }), /x1-pg: no recorded result/);
  assert.match(render("{{block:x1-pg}}", { recorded: new Map(), draft: true }), /No result recorded yet/);
  assert.throws(() => render("{{block:x1-pg}}", { stamp: undefined }), /checked\.json/);
  assert.throws(() => render("{{block:x1-pg}}", { download: undefined }), /x1-pg: the page has no download/);
});

test("MH7 a Power BI block lists its inputs with the star manifest's rows and sha256; an unpublished input is refused", () => {
  const html = render("{{block:x1-pbi}}");
  assert.ok(html.includes('<a href="/learn/data/star/dim_country.csv">star/dim_country.csv</a></td><td>250</td><td><code>' + "ab".repeat(32)));
  assert.ok(html.includes("Not run by critwire: Power BI Desktop is Windows-only."));
  assert.throws(() => render("{{block:x1-pbi}}", { star: {} }), /x1-pbi: input star\/dim_country\.csv isn't in the star manifest/);
});

test("MH8 refused slots: a skip check on a non-browser block, a diagram (S25), a block the page lacks", () => {
  assert.throws(() => render("{{skip:x1-pg}}"), /\{\{skip:x1-pg\}\}: a skip check runs in the browser/);
  assert.throws(() => render("{{diagram:flow}}"), /\{\{diagram:flow\}\}: diagrams aren't rendered yet/);
  assert.throws(() => render("{{block:x1-none}}"), /\{\{block:x1-none\}\}: no block x1-none on the page/);
  assert.match(render("{{skip:x1-ex}}"), /data-exercise="x1-ex" data-skip/);
});

const mod = (id: string, over: Partial<Module> = {}): Module => ({
  id, slug: `s-${id}`, title: `Title ${id}`, track: "database-architecture", tools: ["PG", "B"], hours: 2.5, prereqs: [],
  state: "built", skill: "x", questions: ["Why?"], ...over,
});
const CURRICULUM: Curriculum = {
  tracks: [{ id: "foundations", title: "Foundations" }, { id: "database-architecture", title: "Database architecture" }],
  modules: [mod("f1", { track: "foundations" }), mod("d1"), mod("d2", { state: "planned" }), mod("d3", { prereqs: ["f1", "d2"] }), mod("d4", { state: "planned" }), mod("d5")],
};

test("MH9 the frame: title and id, badges, prerequisites linked only when built, Previous/Next among built modules of the track", () => {
  const d3 = CURRICULUM.modules[3]!;
  assert.equal(moduleUrl(d3), "/learn/database-architecture/s-d3/");
  const html = moduleFrame(d3, CURRICULUM, "<p>body</p>");
  assert.ok(html.startsWith('<h1>Title d3 <span class="module-id">d3</span></h1>'));
  assert.ok(html.includes("<li>PostgreSQL with PostGIS</li><li>Browser</li><li>2.5 hours</li>"));
  assert.ok(html.includes('Prerequisites: <a href="/learn/foundations/s-f1/">Title f1</a> (f1), Title d2 (d2, in preparation)'));
  assert.ok(html.includes("<p>body</p>"));
  assert.ok(html.includes('<button type="button" class="mark-done" data-module="d3" aria-pressed="false">Mark done</button>'));
  assert.ok(html.includes('<a rel="prev" href="/learn/database-architecture/s-d1/">Previous: Title d1 (d1)</a>'));
  assert.ok(html.includes('<a rel="next" href="/learn/database-architecture/s-d5/">Next: Title d5 (d5)</a>'));
  const f1 = moduleFrame(CURRICULUM.modules[0]!, CURRICULUM, "");
  assert.ok(!f1.includes('rel="prev"') && !f1.includes('rel="next"') && !f1.includes("Prerequisites"));
});
