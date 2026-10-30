// A Learn page's HTML (plan D12, F10; 004 §7.2): the block-slot pass over a page fragment, each block by engine, and a
// module's frame. Pure. Tests: module-html.test.ts.
// - The pass replaces `{{block:<id>}}`, `{{exercise:<id>[ in order]}}` and `{{skip:<id>[ in order]}}` (course.ts
//   pageSlots), and refuses an unknown kind or any other `{{` left in the fragment (F10). The rendered code is
//   inserted after the check, so a `{{` in a block (M records) is no leftover.
// - duckdb: an editor holding the block's code (test headers dropped), `data-block`/`data-after` (and `data-expect` for
//   a probe), Run, Stop, Reset database, Schema, a result region (cards.ts tabs). The page's script runs it isolated
//   after its `-- after:` blocks' code as written (site/learn/src/pages/module.ts).
// - postgis: the code, read-only, with Copy; the result learn:check recorded (checked/<id>.txt) or the untested reason;
//   an EXPLAIN block's `-- plan:` lines in words above its recorded plan, an example; the page's .sql; Lab schema.
// - python (L4 plan §7): the same, linking the page's .py and .ipynb.
// - Before the page's first PostGIS or Python block: "Checked <date> on PostgreSQL…", from checked.json, plus the
//   Python and requirements.txt it ran on when the page has a Python block.
// - powerbi (m, dax): the code; the star files it reads with the manifest's rows and sha256; "Not run by critwire".
// - diagram: a <picture>, light and dark, with its alt (diagrams.ts).
// - exercise and skip (duckdb): Your answer, Check, a verdict, the reference behind Show answer; a skip check marks the
//   module done. A PostGIS or Python exercise: Show answer around its code and recorded result.
import type { DownloadKind } from "../../learn/assemble.ts";
import type { Block } from "../../learn/blocks.ts";
import type { PlanAssertion } from "../../learn/plan.ts";
import { pageSlots, type Curriculum, type Module, type Slot, type TOOLS } from "../../learn/course.ts";
import type { Stamp } from "../../learn/freshness.ts";
import type { StarManifest } from "../../learn/star-check.ts";
import { esc, link } from "../html.ts";
import { diagramHtml, type Diagram } from "./diagrams.ts";

export interface PageContext {
  /** The fragment's path, for errors. */
  file: string;
  /** The page's blocks, by id. */
  blocks: ReadonlyMap<string, Block>;
  /** site/learn/labs/checked/<id>.txt, by id. */
  recorded: ReadonlyMap<string, string>;
  /** checked.json's versions and date; undefined before the first learn:check. */
  stamp: Pick<Stamp, "checked" | "versions"> | undefined;
  /** The page's downloads under /learn/labs/ by kind (assemble.ts pageDownloads): .sql with PostGIS blocks, .py and .ipynb with Python ones. */
  downloads: Partial<Record<DownloadKind, string>>;
  /** /learn/data/star/manifest.json's files. */
  star: Readonly<Record<string, Pick<StarManifest["files"][string], "rows" | "sha256">>>;
  /** --draft: a ran PostGIS or Python block may lack its recorded result (preview only). */
  draft: boolean;
  /** The Schema and Lab schema dialogs' SVG titles (their .mmd accTitle). */
  erdTitles: Record<Dialog, string>;
  /** site/learn/diagrams/'s diagrams, checked (diagrams.ts). */
  diagrams: ReadonlyMap<string, Diagram>;
}

type Dialog = "schema" | "lab";
const DIALOGS: Record<Dialog, { heading: string; svg: string; page: string }> = {
  schema: { heading: "Schema: the browser's tables", svg: "/learn/schema/schema.svg", page: "/learn/schema/" },
  lab: { heading: "Lab schema: the PostGIS tables", svg: "/learn/schema/lab.svg", page: "/learn/schema/lab/" },
};

export const TOOL_NAMES: Record<(typeof TOOLS)[number], string> = {
  B: "Browser", PG: "PostgreSQL with PostGIS", Py: "Python", PBI: "Power BI Desktop",
};

const trimEnd = (s: string) => s.replace(/\n+$/, "");
const rows = (code: string) => Math.min(20, Math.max(3, trimEnd(code).split("\n").length));
const n = (x: number) => x.toLocaleString("en-US");
/** "1 hour", "1.5 hours": a module's or a track's time. */
export const hoursText = (h: number) => `${Number(h.toFixed(1))} ${h === 1 ? "hour" : "hours"}`;

/** `html` with each block slot replaced by `render(slot)`; throws on a bad slot or a leftover `{{`, naming `file`. */
export function fillBlockSlots(file: string, html: string, render: (slot: Slot) => string): string {
  const { slots, errors } = pageSlots(file, html);
  if (errors.length) throw new Error(errors.join("\n"));
  const rest = slots.reduce((h, s) => h.replaceAll(s.text, ""), html);
  const at = rest.indexOf("{{");
  if (at >= 0) throw new Error(`${file}: a leftover {{ (not a block slot): ${JSON.stringify(rest.slice(at, at + 40))}`);
  return slots.reduce((h, s) => h.replaceAll(s.text, () => render(s)), html);
}

const dialogButton = (d: Dialog) => `<button type="button" data-dialog="${d}">${d === "lab" ? "Lab schema" : "Schema"}</button>`;

function dialogHtml(d: Dialog, title: string): string {
  const { heading, svg, page } = DIALOGS[d];
  return [
    `<dialog id="dialog-${d}" aria-labelledby="dialog-${d}-title">`,
    `<h2 id="dialog-${d}-title">${esc(heading)}</h2>`,
    `<img src="${svg}" alt="${esc(title)}">`,
    `<p><a href="${page}">Every column, in words</a> · <a href="${svg}">The diagram alone</a></p>`,
    `<form method="dialog"><button>Close</button></form>`,
    `</dialog>`,
  ].join("\n");
}

function editorHtml(b: Block): string {
  const expect = b.expectError === undefined ? "" : ` data-expect="${esc(b.expectError)}"`;
  return [
    `<div class="block editor" id="q-${b.id}">`,
    `<label for="sql-${b.id}">Query <span class="block-id">${b.id}</span></label>`,
    ...(b.after.length ? [`<p class="runs-after">Runs after: ${b.after.map((id) => `<a href="#q-${id}">${id}</a>`).join(", ")}</p>`] : []),
    `<textarea id="sql-${b.id}" data-block="${b.id}" data-after="${b.after.join(" ")}"${expect} rows="${rows(b.code)}" spellcheck="false" autocapitalize="off">`,
    `${esc(trimEnd(b.code))}</textarea>`,
    `<div class="buttons"><button type="button" data-run disabled>Run</button><button type="button" data-stop disabled>Stop</button><button type="button" data-reset disabled>Reset database</button>${dialogButton("schema")}</div>`,
    `<div id="result-${b.id}" class="result" aria-live="polite"></div>`,
    `</div>`,
  ].join("\n");
}

function exerciseHtml(b: Block, inOrder: boolean, skip: boolean): string {
  return [
    `<div class="block exercise" id="q-${b.id}" data-exercise="${b.id}"${skip ? " data-skip" : ""} data-ordered="${inOrder}" data-after="${b.after.join(" ")}">`,
    `<label for="answer-${b.id}">Your answer</label>`,
    `<textarea id="answer-${b.id}" rows="${rows(b.code)}" spellcheck="false" autocapitalize="off">`,
    `</textarea>`,
    `<div class="buttons"><button type="button" data-run disabled>Check</button><button type="button" data-stop disabled>Stop</button><button type="button" data-reset disabled>Reset database</button>${dialogButton("schema")}</div>`,
    `<p class="verdict" id="verdict-${b.id}" role="status"></p>`,
    `<div id="result-${b.id}" class="result" aria-live="polite"></div>`,
    `<details><summary>Show answer</summary><pre class="code"><code data-block="${b.id}">${esc(trimEnd(b.code))}</code></pre></details>`,
    `</div>`,
  ].join("\n");
}

const codeHead = (b: Block, engine: string, extra = "") =>
  `<p class="block-head"><span class="block-id">${b.id}</span> · ${engine} <button type="button" class="copy" data-copy="code-${b.id}">Copy</button>${extra}</p>\n` +
  `<pre class="code" id="code-${b.id}"><code>${esc(trimEnd(b.code))}</code></pre>`;

/** An EXPLAIN block's `-- plan:` lines in words, and the recorded plan labelled an example (plan D4); "" for other blocks. */
function planChecks(b: Block): string {
  if (!b.plan.length) return "";
  const item = (a: PlanAssertion) =>
    a.kind === "rows" ? `the top node returns ${a.rows} rows (<code>actual rows=${a.rows}</code>)` : `${a.kind === "no" ? "no line" : "a line"} with <code>${esc(a.text)}</code>`;
  return (
    `<p>What the plan must show:</p>\n<ul class="plan-checks">${b.plan.map((a) => `<li>${item(a)}</li>`).join("")}</ul>\n` +
    `<p class="plan-example">An example plan, from the versions above; yours passes if it shows the lines listed, whatever else differs.</p>\n`
  );
}

function labResult(b: Block, ctx: PageContext): string {
  if (b.status === "untested") return `<p class="untested">Not run here: ${esc(b.reason)}.</p>`;
  const recorded = ctx.recorded.get(b.id);
  if (recorded !== undefined) return planChecks(b) + `<pre class="recorded">\n${esc(trimEnd(recorded))}</pre>`;
  if (ctx.draft) return `<p class="untested">No result recorded yet (draft build): run pnpm learn:check --update.</p>`;
  throw new Error(`${ctx.file}: q ${b.id}: no recorded result (site/learn/labs/checked/${b.id}.txt)`);
}

const LAB_ENGINES = { postgis: { name: "PostgreSQL with PostGIS", kinds: ["sql"] }, python: { name: "Python", kinds: ["py", "ipynb"] } } as const;

/** A PostGIS or Python block: its code with Copy and Lab schema, its result, and the page's downloads that hold it. */
function labHtml(b: Block, engine: keyof typeof LAB_ENGINES, ctx: PageContext): string {
  const { name, kinds } = LAB_ENGINES[engine];
  const links = kinds.map((k) => {
    const file = ctx.downloads[k];
    if (file === undefined) throw new Error(`${ctx.file}: q ${b.id}: the page has no .${k} download`);
    return `<a href="/learn/labs/${esc(file)}">${esc(file)}</a>`;
  });
  return [
    `<div class="block lab" id="q-${b.id}">`,
    codeHead(b, name, ` ${dialogButton("lab")}`),
    labResult(b, ctx),
    `<p class="download">In ${links.join(" and ")}, with the blocks it runs after.</p>`,
    `</div>`,
  ].join("\n");
}

function powerBiHtml(b: Block, ctx: PageContext): string {
  const inputs = b.inputs.map((input) => {
    const f = ctx.star[input.slice("star/".length)];
    if (!f) throw new Error(`${ctx.file}: q ${b.id}: input ${input} isn't in the star manifest`);
    return `<tr><td>${link(`/learn/data/${input}`, input)}</td><td>${n(f.rows)}</td><td><code>${esc(f.sha256)}</code></td></tr>`;
  });
  return [
    `<div class="block powerbi" id="q-${b.id}">`,
    codeHead(b, `Power BI (${b.file.endsWith(".dax") ? "DAX" : "M"})`),
    `<table class="inputs"><caption>The files it reads</caption><thead><tr><th scope="col">File</th><th scope="col">Rows</th><th scope="col">sha256</th></tr></thead><tbody>${inputs.join("")}</tbody></table>`,
    `<p class="untested">Not run by critwire: Power BI Desktop is Windows-only.</p>`,
    `</div>`,
  ].join("\n");
}

/** A page fragment with its block slots filled, then the dialogs its buttons open. */
export function renderFragment(html: string, ctx: PageContext): string {
  const dialogs = new Set<Dialog>();
  let versionsShown = false;
  const versions = () => {
    if (versionsShown) return "";
    versionsShown = true;
    if (!ctx.stamp) throw new Error(`${ctx.file}: lab blocks, but no site/learn/labs/checked/checked.json: run pnpm learn:check`);
    const v = ctx.stamp.versions;
    // A stamp from before GDAL was recorded is stale (the checker changed with it), so only a --draft build shows one.
    const gdal = v.gdal === undefined ? "" : `, GDAL ${esc(v.gdal)}`;
    const python = !hasPython ? "" : `; Python ${esc(v.python)} with requirements.txt sha256 ${esc(v.requirements)}`;
    return `<p class="checked">Checked ${esc(ctx.stamp.checked)} on PostgreSQL ${esc(v.postgresql)}, PostGIS ${esc(v.postgis)}, GEOS ${esc(v.geos)}${gdal}${python}.</p>\n`;
  };
  const hasPython = [...ctx.blocks.values()].some((b) => b.engine === "python");
  const lab = (b: Block, engine: keyof typeof LAB_ENGINES) => {
    dialogs.add("lab");
    return versions() + labHtml(b, engine, ctx);
  };
  const body = fillBlockSlots(ctx.file, html, (slot) => {
    const at = `${ctx.file}: ${slot.text}`;
    if (slot.kind === "diagram") {
      const d = ctx.diagrams.get(slot.name);
      if (!d) throw new Error(`${at}: no diagram ${slot.name}`);
      return diagramHtml(slot.name, d);
    }
    const b = ctx.blocks.get(slot.name);
    if (!b) throw new Error(`${at}: no block ${slot.name} on the page`);
    if (slot.kind === "skip" && b.engine !== "duckdb") throw new Error(`${at}: a skip check runs in the browser, and ${b.id} is ${b.engine}`);
    if (b.engine === "duckdb") {
      dialogs.add("schema");
      return slot.kind === "block" ? editorHtml(b) : exerciseHtml(b, slot.inOrder, slot.kind === "skip");
    }
    if (b.engine === "postgis" || b.engine === "python")
      return slot.kind === "block" ? lab(b, b.engine) : `<details class="exercise-answer"><summary>Show answer</summary>\n${lab(b, b.engine)}\n</details>`;
    if (slot.kind !== "block") throw new Error(`${at}: a Power BI block can't be an exercise`);
    return powerBiHtml(b, ctx);
  });
  return [body, ...[...dialogs].map((d) => dialogHtml(d, ctx.erdTitles[d]))].join("\n");
}

/** A module's URL: /learn/<track>/<slug>/. */
export const moduleUrl = (m: Pick<Module, "track" | "slug">) => `/learn/${m.track}/${m.slug}/`;

const moduleLink = (m: Module, rel: "prev" | "next") =>
  `<a rel="${rel}" href="${moduleUrl(m)}">${rel === "prev" ? "Previous" : "Next"}: ${esc(m.title)} (${m.id})</a>`;

/** A module's tool and hours badges. */
export const badges = (m: Module) => `<ul class="badges">${m.tools.map((t) => `<li>${TOOL_NAMES[t]}</li>`).join("")}<li>${hoursText(m.hours)}</li></ul>`;

/** "Prerequisites: <title> (<id>), …", built ones linked, planned ones "in preparation"; "" without any. */
export function prerequisites(m: Module, curriculum: Curriculum): string {
  if (!m.prereqs.length) return "";
  const byId = new Map(curriculum.modules.map((x) => [x.id, x]));
  const list = m.prereqs.map((id) => {
    const p = byId.get(id)!;
    return p.state === "built" ? `${link(moduleUrl(p), p.title)} (${p.id})` : `${esc(p.title)} (${p.id}, in preparation)`;
  });
  return `<p class="prereqs">Prerequisites: ${list.join(", ")}</p>`;
}

/** A module page's main: title and id, badges, prerequisites, `body`, Mark done, Previous and Next among built modules of its track. */
export function moduleFrame(m: Module, curriculum: Curriculum, body: string): string {
  const track = curriculum.modules.filter((x) => x.track === m.track && x.state === "built");
  const i = track.indexOf(m);
  const near = [i > 0 ? moduleLink(track[i - 1]!, "prev") : "", i >= 0 && i < track.length - 1 ? moduleLink(track[i + 1]!, "next") : ""].filter(Boolean);
  const trackTitle = curriculum.tracks.find((t) => t.id === m.track)!.title;
  return [
    `<h1>${esc(m.title)} <span class="module-id">${m.id}</span></h1>`,
    badges(m),
    prerequisites(m, curriculum),
    body,
    `<p class="module-end"><button type="button" class="mark-done" data-module="${m.id}" aria-pressed="false">Mark done</button></p>`,
    ...(near.length ? [`<nav class="prev-next" aria-label="${esc(trackTitle)}">${near.join(" ")}</nav>`] : []),
  ].join("\n");
}
