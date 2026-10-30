// Learn's lab blocks on their pages and in their downloads (plan D13 learn-labs, S13; 004 §7.2–7.3): each page's
// /learn/labs/ file is served as the build assembled it (assemble.ts, what learn:check ran); each PostGIS block's
// page code appears verbatim in it, or, for an untested or two-session block, commented out under its reason; the
// result a page shows is checked/<id>.txt, and its versions line is checked.json's; an EXPLAIN block lists its
// `-- plan:` lines and labels its plan an example (D4); a Power BI block lists the star files it reads with the
// manifest's rows and sha256, which the served files match and star-check passes. The setup page links the checks'
// download (pg-checks.sql) and the loader. /learn/labs/requirements.txt is the labs' pin file (L4 plan §5). By
// Download.kind (L4 plan §10): a .sql holds its page's PostGIS blocks, a .py its Python blocks (untested ones behind
// `# `), each linked from its block; an .ipynb is served as assembled, its code cells the .py's cells in order (an
// untested block a Markdown cell, never code); a download naming s4_cells or s4_neighbours runs s4-cells right after
// pg-session or py-connect; the versions line names Python and requirements.txt on a page with a Python block; every
// download link on a page returns 200.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { moduleUrl } from "../scripts/build/learn/module-html.ts";
import { codeOnly } from "../scripts/build/learn/sql.ts";
import { assembleDownloads, pageDownloads, type Download } from "../scripts/learn/assemble.ts";
import { CHECKED_DIR, PG_SESSION_ID, PY_CONNECT_ID, type Block } from "../scripts/learn/blocks.ts";
import { SETUP_PAGE, type CoursePage } from "../scripts/learn/course.ts";
import { readCourse } from "../scripts/learn/course-files.ts";
import { readStamp } from "../scripts/learn/freshness.ts";
import { checkInput, type StarManifest } from "../scripts/learn/star-check.ts";
import { distPath, learnContext, repoPath, sha256 } from "./helpers.ts";

const trimEnd = (s: string) => s.replace(/\n+$/, "");
const runnable = (b: Block) => b.status === "ran" && !b.sessions.length;
/** The engine whose blocks a download holds, and the comment mark that hides an unrun one; an .ipynb holds the .py's. */
const HOLDS = { sql: { engine: "postgis", mark: "--" }, py: { engine: "python", mark: "#" } } as const;
const isLab = (b: Block) => b.engine === "postgis" || b.engine === "python";
/** The module pages with Python blocks (L4), and the untested blocks the downloads must hide, by page. */
const PY_PAGES = ["s2", "s3", "s4", "s5", "s6", "e1", "e2", "e3", "e4", "e5"];
const UNTESTED = [["g3", "g3-iucn"], ["setup", "arcpy-moran"], ["e1", "e1-submit"]] as const;

async function course() {
  const c = await readCourse();
  const url = (p: CoursePage) => (p.page.id === SETUP_PAGE ? "/learn/setup/" : moduleUrl(c.curriculum!.modules.find((m) => m.id === p.page.id)!));
  return { pages: c.pages, url };
}

test("each download is served as assembled; each PostGIS (Python) block's page code is in its .sql (.py), verbatim or commented out under its reason, and links it", async ({ browser, request }) => {
  const { pages, url } = await course();
  const all = assembleDownloads(pages);
  const names = pageDownloads(all);
  for (const d of all) {
    const res = await request.get(`/learn/labs/${d.name}`);
    expect(res.status(), d.name).toBe(200);
    expect(await res.text(), d.name).toBe(d.text);
  }
  expect(all.filter((d) => d.kind === "sql").map((d) => d.name)).toEqual(expect.arrayContaining(["pg-checks.sql", "d6.sql", "g1.sql", "g2.sql", "g3.sql", "g4.sql", "g5.sql", "g6.sql", "g7.sql"]));
  // L4: every page with a Python block has its .py (and .ipynb, checked below).
  expect(all.filter((d) => d.kind === "py").map((d) => d.name)).toEqual(expect.arrayContaining(["setup.py", ...PY_PAGES.map((p) => `${p}.py`)]));
  // L3: g3-iucn reads the learner's own IUCN download, so g3.sql holds it commented out (checked below); L4: so do
  // setup.py arcpy-moran (ArcGIS Pro only) and e1.py e1-submit (a real GBIF download).
  for (const [p, id] of UNTESTED) expect(pages.find((x) => x.page.id === p)!.blocks.find((b) => b.id === id)?.status, id).toBe("untested");
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  for (const d of all.filter((x): x is Download & { kind: keyof typeof HOLDS } => x.kind in HOLDS)) {
    const { engine, mark } = HOLDS[d.kind];
    const course = pages.find((p) => p.page.id === d.page)!;
    // A .sql's blocks link it alone; a .py's link it and the page's .ipynb.
    const links = (d.kind === "sql" ? [d.name] : [d.name, names.get(d.page)!.ipynb!]).map((n) => `/learn/labs/${n}`);
    await page.goto(url(course));
    for (const b of course.blocks.filter((x) => x.engine === engine)) {
      const code = await page.locator(`#q-${b.id} pre.code`).textContent();
      expect(code, b.id).toBe(trimEnd(b.code));
      if (runnable(b)) expect(d.text.includes(code!), `${b.id} in ${d.name}`).toBe(true);
      else {
        const reason = b.status === "untested" ? b.reason : `it needs one psql window per session (${b.sessions.join(", ")})`;
        const commented = code!.split("\n").map((l) => (l ? `${mark} ${l}` : mark)).join("\n");
        expect(d.text.includes(`${mark} not run from this file: ${reason}. Run it by hand, as its page says.`), b.id).toBe(true);
        expect(d.text.includes(commented), `${b.id} commented out in ${d.name}`).toBe(true);
      }
      expect(await page.locator(`#q-${b.id} .download a`).evaluateAll((as) => as.map((a) => a.getAttribute("href"))), b.id).toEqual(links);
    }
  }
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("a PostGIS or Python block shows checked/<id>.txt (or its untested reason); the page's versions line is checked.json's, once", async ({ browser }) => {
  const { pages, url } = await course();
  const stamp = readStamp()!;
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  for (const p of pages.filter((x) => x.blocks.some(isLab))) {
    await page.goto(url(p));
    const v = stamp.versions;
    const python = p.blocks.some((b) => b.engine === "python") ? `; Python ${v.python} with requirements.txt sha256 ${v.requirements}` : "";
    await expect(page.locator(".checked")).toHaveText([`Checked ${stamp.checked} on PostgreSQL ${v.postgresql}, PostGIS ${v.postgis}, GEOS ${v.geos}, GDAL ${v.gdal}${python}.`]);
    for (const b of p.blocks.filter(isLab)) {
      if (b.status === "untested") await expect(page.locator(`#q-${b.id} .untested`)).toHaveText(`Not run here: ${b.reason}.`);
      else expect(await page.locator(`#q-${b.id} pre.recorded`).textContent(), b.id)
        .toBe(trimEnd(await readFile(repoPath(`${CHECKED_DIR}/${b.id}.txt`), "utf8")));
      // An EXPLAIN block (plan D4): what its plan must show, one item per `-- plan:` line, its recorded plan an example.
      const checks = page.locator(`#q-${b.id} .plan-checks li`);
      await expect(checks, b.id).toHaveCount(b.plan.length);
      for (const [i, a] of b.plan.entries()) await expect(checks.nth(i), b.id).toContainText(a.kind === "rows" ? `actual rows=${a.rows}` : a.text);
      await expect(page.locator(`#q-${b.id} .plan-example`), b.id).toHaveCount(b.plan.length ? 1 : 0);
    }
  }
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("every download link on a Learn page returns 200", async ({ page, request }) => {
  const { pages, url } = await course();
  const seen = new Set<string>();
  for (const p of pages) {
    await page.goto(url(p));
    for (const href of await page.locator('main a[href^="/learn/labs/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")!))) {
      if (seen.has(href)) continue;
      seen.add(href);
      expect((await request.get(href)).status(), `${href} on ${url(p)}`).toBe(200);
    }
  }
  expect([...seen]).toEqual(expect.arrayContaining(["/learn/labs/pg-checks.sql", "/learn/labs/g7.sql", "/learn/labs/requirements.txt", "/learn/labs/setup.py", "/learn/labs/setup.ipynb"]));
});

/** A .py's cells: the text after each `# %% <label>` line, up to the blank line before the next. */
const pyCells = (text: string) => text.split(/\n\n(?=# %% )/).slice(1).map((c) => {
  const [marker, ...code] = c.split("\n");
  return { label: marker!.slice("# %% ".length), code: trimEnd(code.join("\n")) };
});
type NbCell = { cell_type: string; id: string; source: string[] };

test("each .ipynb's code cells are its .py's cells, in order, with unique ids; an untested block is a Markdown cell, never code", async () => {
  const { pages } = await course();
  const all = assembleDownloads(pages);
  const py = all.filter((d) => d.kind === "py");
  expect(py.map((d) => d.name)).toEqual(expect.arrayContaining(["setup.py", ...PY_PAGES.map((p) => `${p}.py`)]));
  const markdown: string[] = [];
  for (const d of py) {
    const nb = JSON.parse(all.find((x) => x.page === d.page && x.kind === "ipynb")!.text) as { cells: NbCell[] };
    const ids = nb.cells.map((c) => c.id);
    expect(new Set(ids).size, d.name).toBe(ids.length);
    const cells = pyCells(d.text);
    const untested = new Set(pages.find((p) => p.page.id === d.page)!.blocks.filter((b) => b.engine === "python" && b.status === "untested").map((b) => b.id));
    const code = nb.cells.filter((c) => c.cell_type === "code").map((c) => ({ id: c.id, code: c.source.join("") }));
    expect(code, d.name).toEqual(cells.filter((c) => !untested.has(c.label)).map((c) => ({ id: c.label.replace(/^boot: /, ""), code: c.code })));
    for (const id of untested) {
      const cell = nb.cells.find((c) => c.id === id)!;
      expect(cell.cell_type, `${id} in ${d.page}.ipynb`).toBe("markdown");
      expect(cell.source.join(""), id).toMatch(/^not run from this file: .+\. Run it by hand, as its page says\.\n\n```python\n/);
      markdown.push(id);
    }
  }
  expect(markdown).toEqual(expect.arrayContaining(UNTESTED.filter(([p]) => p !== "g3").map(([, id]) => id)));
});

test("a download naming s4_cells or s4_neighbours runs s4-cells right after pg-session or py-connect", async () => {
  const { pages } = await course();
  const blocks = pages.flatMap((p) => p.blocks);
  const text = (id: string) => trimEnd(blocks.find((b) => b.id === id)!.text);
  // A .sql names a table in its code (a string literal or comment doesn't: g1-columns filters 's4_cells' out); a .py in its SQL strings.
  const names = (d: Download) => /\bs4_(cells|neighbours)\b/.test(d.kind === "sql" ? codeOnly(d.text) : d.text);
  const naming = assembleDownloads(pages).filter((x) => x.kind !== "ipynb" && names(x));
  // L4: s2–s5 read the 5 km and 10 km cells in both engines, and setup.py's gpkg-export writes them.
  expect(naming.map((d) => d.name)).toEqual(expect.arrayContaining(["setup.py", ...["s2", "s3", "s4", "s5"].flatMap((p) => [`${p}.sql`, `${p}.py`])]));
  for (const d of naming) {
    const boot = d.kind === "sql"
      ? `${text(PG_SESSION_ID)}\n\nBEGIN;\n${text("s4-cells")}\nCOMMIT;\n`
      : `# %% ${PY_CONNECT_ID}\n${text(PY_CONNECT_ID)}\n\n# %% boot: s4-cells\n`;
    expect(d.text.includes(boot), d.name).toBe(true);
  }
});

test("a Power BI block lists its star inputs with the manifest's rows and sha256, and the served files match", async ({ browser, request }) => {
  const { pages, url } = await course();
  const manifest = (await (await request.get("/learn/data/star/manifest.json")).json()) as StarManifest;
  const { context } = await learnContext(browser);
  const page = await context.newPage();
  const pbi = pages.flatMap((p) => p.blocks.filter((b) => b.engine === "powerbi").map((b) => [p, b] as const));
  expect(pbi.map(([, b]) => b.id)).toContain("pbi-smoke");
  for (const [p, b] of pbi) {
    await page.goto(url(p));
    await expect(page.locator(`#q-${b.id} .untested`)).toHaveText("Not run by critwire: Power BI Desktop is Windows-only.");
    const rows = await page.locator(`#q-${b.id} table.inputs tbody tr`).evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent)));
    const want = b.inputs.map((input) => {
      const f = manifest.files[input.slice("star/".length)]!;
      return [input, f.rows.toLocaleString("en-US"), f.sha256];
    });
    expect(rows, b.id).toEqual(want);
    for (const [input, , hash] of want) expect(sha256(await (await request.get(`/learn/data/${input}`)).body()), input).toBe(hash);
    // What the M reads passes the star's checks: header, rows, sha256, keys (star-check).
    for (const input of b.inputs) expect((await checkInput(distPath("learn/data/star"), input)).errors, `${b.id} ${input}`).toEqual([]);
  }
  await context.close();
});

test("the setup page covers the browser, PostGIS, Python and Power BI, and links pg-checks.sql, the loader, requirements.txt, setup.py and setup.ipynb", async ({ page }) => {
  expect((await page.goto("/learn/setup/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["The browser", "PostgreSQL with PostGIS, on your computer", "Python", "Power BI Desktop"]);
  for (const href of ["/learn/labs/pg-checks.sql", "/learn/data/postgis/learn_curriculum.sql", "/learn/schema/lab/", "/learn/labs/requirements.txt", "/learn/labs/setup.py", "/learn/labs/setup.ipynb"])
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  for (const id of ["setup-counts", "pg-session", "pg-smoke", "pg-role-smoke", "pg-tx-smoke", "py-connect", "py-smoke", "pbi-smoke"]) await expect(page.locator(`#q-${id}`)).toHaveCount(1);
});

test("/learn/labs/requirements.txt is site/learn/labs/requirements.txt", async ({ request }) => {
  const res = await request.get("/learn/labs/requirements.txt");
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe(await readFile(repoPath("site/learn/labs/requirements.txt"), "utf8"));
});
