// erd-render.ts: pnpm erd draws site/learn/erd/{schema,lab,star}.mmd as SVG offline (plan D10, S8; R5), the spike's
// renderer ported (ER1–ER4). Written before the code, seen failing first. Failure modes:
// ER1: a Mermaid syntax error writes a broken SVG, or a half-written one → fails with Mermaid's parser message, the
//      previous SVG byte for byte, no temp file;
// ER2: a directive turns HTML labels back on, so the SVG holds <foreignObject> and draws blank inside <img> → refused;
// ER3: the diagram fetches something while rendering (a themeCSS url), so the build isn't offline → refused, naming it;
// ER4: a diagram that draws no entity, or not every entity, is written → refused;
// - the SVG lacks its source's sha256, its size, or its accTitle/accDescr as <title>/<desc> → the rendered schema has
//   them all;
// - a fresh SVG is redrawn on every run (a diff in every PR), or a stale one is kept → only stale SVGs are written,
//   unless forced; one failing diagram writes none.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { parseErd } from "./erd-model.ts";
import { renderErd, writeErds } from "./erd-render.ts";

const ERD = new URL("../../site/learn/erd/", import.meta.url);
const SCHEMA = readFileSync(new URL("schema.mmd", ERD), "utf8");
const TIMEOUT = 90_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const dirs: string[] = [];
after(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })));

// A folder holding copies of schema.mmd and lab.mmd, `schema` replaced if given.
function folder(schema = SCHEMA): string {
  const dir = mkdtempSync(join(tmpdir(), "critwire-erd-"));
  dirs.push(dir);
  writeFileSync(join(dir, "schema.mmd"), schema);
  copyFileSync(new URL("lab.mmd", ERD), join(dir, "lab.mmd"));
  return dir;
}
const quiet = { log: () => {} };

test("the schema renders: the source's sha256 and size on the root <svg>, <title> and <desc>, every entity, no foreignObject", { timeout: TIMEOUT }, async () => {
  const svg = await renderErd(SCHEMA);
  assert.match(svg, /^<svg [^>]*data-source-sha256="[0-9a-f]{64}"/);
  assert.equal(/data-source-sha256="([0-9a-f]{64})"/.exec(svg)![1], sha(SCHEMA));
  assert.match(svg, /^<svg [^>]*width="\d+" [^>]*height="\d+"|^<svg [^>]*height="\d+" [^>]*width="\d+"/);
  assert.ok(!svg.includes("<foreignObject"));
  const erd = parseErd(SCHEMA);
  assert.ok(svg.includes(`<title`) && svg.includes(`>${erd.title}</title>`), "accTitle as <title>");
  assert.ok(svg.includes(`>${erd.description}</desc>`), "accDescr as <desc>");
  for (const e of erd.entities) assert.ok(svg.includes(`>${e.name}<`), `no ${e.name} label`);
});

test("ER1 a Mermaid syntax error fails with the parser's message; the previous SVG stays, no temp file", { timeout: 2 * TIMEOUT }, async () => {
  const dir = folder();
  await writeErds(dir, ["schema"], quiet);
  const before = readFileSync(join(dir, "schema.svg"));
  writeFileSync(join(dir, "schema.mmd"), SCHEMA.replace("taxa |o--o{ taxa", "taxa |o--o{{ taxa"));
  await assert.rejects(writeErds(dir, ["schema"], quiet), /schema\.mmd: Parse error on line \d+/);
  assert.deepEqual(readFileSync(join(dir, "schema.svg")), before);
  assert.deepEqual(readdirSync(dir).filter((f) => f.includes(".tmp")), []);
});

test("ER2 an SVG with <foreignObject> fails (a directive turning HTML labels back on)", { timeout: TIMEOUT }, async () => {
  await assert.rejects(renderErd('%%{init: {"htmlLabels": true, "er": {"htmlLabels": true}}}%%\n' + SCHEMA), /<foreignObject>/);
});

// A stylesheet @import lands after mermaid's own rules, where browsers ignore it; a background image is fetched.
test("ER3 any network request while rendering fails, naming it", { timeout: TIMEOUT }, async () => {
  await assert.rejects(renderErd('%%{init: {"themeCSS": "g { background-image: url(https://example.com/erd.png); }"}}%%\n' + SCHEMA),
    /network request.*example\.com/);
});

test("ER4 an empty diagram fails: no SVG without every entity drawn", { timeout: TIMEOUT }, async () => {
  await assert.rejects(renderErd("erDiagram\n"), /draws no entities/);
});

test("only stale SVGs are written, unless forced; one failing diagram writes none", { timeout: 4 * TIMEOUT }, async () => {
  const dir = folder();
  const lines: string[] = [];
  const log = { log: (l: string) => lines.push(l) };
  await writeErds(dir, ["schema", "lab"], log);
  assert.deepEqual(lines, [`erd: wrote ${join(dir, "schema.svg")}`, `erd: wrote ${join(dir, "lab.svg")}`]);
  const mtime = (n: string) => statSync(join(dir, `${n}.svg`)).mtimeMs;
  const first = { schema: mtime("schema"), lab: mtime("lab") };

  lines.length = 0;
  await writeErds(dir, ["schema", "lab"], log);
  assert.deepEqual(lines, ["erd: schema.svg, lab.svg up to date"]);
  assert.deepEqual({ schema: mtime("schema"), lab: mtime("lab") }, first);

  lines.length = 0;
  writeFileSync(join(dir, "lab.mmd"), readFileSync(join(dir, "lab.mmd"), "utf8") + "%% edited\n");
  await writeErds(dir, ["schema", "lab"], log);
  assert.deepEqual(lines, [`erd: wrote ${join(dir, "lab.svg")}`]);
  assert.equal(mtime("schema"), first.schema);

  lines.length = 0;
  await writeErds(dir, ["schema"], { ...log, force: true });
  assert.deepEqual(lines, [`erd: wrote ${join(dir, "schema.svg")}`]);

  const lab = readFileSync(join(dir, "lab.svg"));
  writeFileSync(join(dir, "lab.mmd"), readFileSync(join(dir, "lab.mmd"), "utf8") + "%% again\n");
  writeFileSync(join(dir, "schema.mmd"), "erDiagram\n");
  await assert.rejects(writeErds(dir, ["lab", "schema"], log), /schema\.mmd: the diagram draws no entities/);
  assert.deepEqual(readFileSync(join(dir, "lab.svg")), lab, "lab.svg unchanged: nothing is written when one fails");
  assert.ok(existsSync(join(dir, "schema.svg")));
});
