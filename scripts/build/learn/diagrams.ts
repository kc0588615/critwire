// The teaching diagrams (plan D14): site/learn/diagrams/<name>.html and <name>-dark.html, diagram-design's sources,
// and their exports <name>.svg and <name>-dark.svg (export_svg.py --system-fonts). A page shows one through
// {{diagram:<name>}}: a <picture> whose dark <source> follows the reader's color scheme and whose <img alt> is the
// SVG's <title>. checkDiagrams refuses a missing file of the four, an SVG without a <title> or a viewBox, any
// reference outside the file (the build is offline, the site fetches nothing elsewhere), a diagram no page uses and a
// file that isn't one. Tests: diagrams.test.ts.
import { readdir, readFile } from "node:fs/promises";
import { DIAGRAM_DIR, type CoursePage } from "../../learn/course.ts";
import { esc } from "../html.ts";

export interface Diagram {
  /** The light SVG's <title>: the <img alt>. */
  title: string;
  /** From its viewBox: the <img>'s size. */
  width: number;
  height: number;
}

export const DIAGRAM_URL = "/learn/diagrams/";
const FILE = /^([a-z0-9]+(?:-[a-z0-9]+)*?)(-dark)?\.(html|svg)$/;
const variants = (name: string) => [`${name}.html`, `${name}-dark.html`, `${name}.svg`, `${name}-dark.svg`];
const TITLE = /<svg\b[^>]*>\s*<title\b[^>]*>([^<]*)<\/title>/;
const VIEWBOX = /<svg\b[^>]*\bviewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/;
// @import; url(…) not to a fragment; href, xlink:href or src not to a fragment.
const OUTSIDE = /@import|url\(\s*['"]?(?!#)|\b(?:xlink:href|href|src)\s*=\s*["'](?!#)/;

/** Each diagram `used` names, from `files` (site/learn/diagrams/'s file names and texts), and every error. */
export function checkDiagrams(files: ReadonlyMap<string, string>, used: ReadonlySet<string>): { diagrams: Map<string, Diagram>; errors: string[] } {
  const errors: string[] = [];
  const names = new Set<string>();
  for (const f of files.keys()) {
    const m = FILE.exec(f);
    if (m) names.add(m[1]!);
    else errors.push(`${DIAGRAM_DIR}/${f}: not a diagram file (<name>.html, <name>-dark.html, <name>.svg, <name>-dark.svg)`);
  }
  const diagrams = new Map<string, Diagram>();
  for (const name of [...names].sort()) {
    const need = variants(name);
    const missing = need.filter((f) => !files.has(f));
    for (const f of missing) errors.push(`${DIAGRAM_DIR}/${f}: missing (${name} needs ${need.join(", ")})`);
    if (!used.has(name)) errors.push(`${DIAGRAM_DIR}/${name}.svg: no page has {{diagram:${name}}}`);
    let ok = missing.length === 0;
    for (const f of need.slice(2).filter((f) => files.has(f))) {
      const svg = files.get(f)!;
      const at = `${DIAGRAM_DIR}/${f}`;
      if (!TITLE.exec(svg)?.[1]!.trim()) errors.push(`${at}: no <title> (the page's alt text)`), (ok = false);
      if (!VIEWBOX.test(svg)) errors.push(`${at}: no viewBox="0 0 <width> <height>"`), (ok = false);
      if (OUTSIDE.test(svg)) errors.push(`${at}: a reference outside the file (the build is offline)`), (ok = false);
    }
    if (!ok) continue;
    const light = files.get(`${name}.svg`)!;
    const [, w, h] = VIEWBOX.exec(light)!;
    diagrams.set(name, { title: TITLE.exec(light)![1]!.trim(), width: Number(w), height: Number(h) });
  }
  return { diagrams, errors };
}

/** The diagrams the pages' {{diagram:…}} slots name, read from site/learn/diagrams/ and checked; their SVG texts by file name. */
export async function readDiagrams(pages: readonly CoursePage[]): Promise<{ diagrams: Map<string, Diagram>; svgs: Map<string, string>; errors: string[] }> {
  const dir = new URL(`../../../${DIAGRAM_DIR}/`, import.meta.url);
  let names: string[] = [];
  try {
    names = (await readdir(dir)).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const files = new Map<string, string>();
  for (const n of names) files.set(n, await readFile(new URL(n, dir), "utf8"));
  const used = new Set(pages.flatMap((p) => p.slots.filter((s) => s.kind === "diagram").map((s) => s.name)));
  const svgs = new Map([...files].filter(([n]) => n.endsWith(".svg")));
  return { ...checkDiagrams(files, used), svgs };
}

/** A {{diagram:<name>}} slot's HTML. */
export function diagramHtml(name: string, d: Diagram): string {
  return [
    `<figure class="diagram" id="diagram-${name}">`,
    `<picture><source srcset="${DIAGRAM_URL}${name}-dark.svg" media="(prefers-color-scheme: dark)"><img src="${DIAGRAM_URL}${name}.svg" alt="${esc(d.title)}" width="${d.width}" height="${d.height}"></picture>`,
    `</figure>`,
  ].join("\n");
}
