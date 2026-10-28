// pnpm erd's renderer (plan D10; R5): a Mermaid erDiagram drawn as SVG offline, the spike's erd.ts ported, SVG only.
// Mermaid's own browser bundle (mermaid 12.2.0's dist/mermaid.min.js) in Playwright's headless Chromium, every request
// aborted and named: no mermaid-cli, no server.
// - handDrawnSeed fixed: Mermaid's shapes (rough.js) draw random control points otherwise, so a forced redraw differs.
// - htmlLabels off, so labels are plain SVG <text> and the SVG draws inside <img>; a <foreignObject> fails (ER2).
// - Mermaid's parser runs first, so a syntax error fails with its message (ER1); then erd-model's stricter subset.
// - Any network request while rendering fails (ER3); a diagram that doesn't draw every entity fails (ER4); so does one
//   whose accTitle/accDescr isn't the SVG's <title>/<desc>.
// - The root <svg> gets data-source-sha256 (the .mmd's sha256: the build refuses a stale SVG, build/learn/erd.ts) and
//   the viewBox size as width/height, so <img> needs no CSS to size it.
// writeErds draws only stale SVGs (or all, forced), and writes them only once every one rendered, each through a temp
// file and a rename. Tests: erd-render.test.ts (ER1–ER4).
import { createHash } from "node:crypto";
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { readOptionalText } from "../json.ts";
import { parseErd, svgStale } from "./erd-model.ts";

const MERMAID = fileURLToPath(new URL("../../node_modules/mermaid/dist/mermaid.min.js", import.meta.url));
/** Verdana's metrics are close to DejaVu Sans's (this VPS's fallback), so labels measured here fit elsewhere. */
const FONT = 'Verdana, "DejaVu Sans", sans-serif';
const TIMEOUT_MS = 60_000;

type Rendered = { svg: string } | { error: string };

async function draw(source: string): Promise<string> {
  const sha = createHash("sha256").update(source).digest("hex");
  const browser = await chromium.launch({ headless: true });
  try {
    const blocked: string[] = [];
    const context = await browser.newContext();
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.protocol === "data:" || url.protocol === "blob:") return route.continue();
      blocked.push(url.href);
      return route.abort("blockedbyclient");
    });
    const page = await context.newPage();
    await page.setContent("<!doctype html><meta charset=utf-8><body></body>");
    await page.addScriptTag({ path: MERMAID });
    const rendered: Rendered = await page.evaluate(
      async ([src, font, sha]) => {
        const m = (window as unknown as { mermaid: typeof import("mermaid").default }).mermaid;
        m.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", handDrawnSeed: 1, htmlLabels: false, fontFamily: font, er: { useMaxWidth: false } });
        try {
          await m.parse(src);
        } catch (e) {
          return { error: (e as Error).message };
        }
        const { svg } = await m.render("erd", src);
        const root = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
        const [, , w, h] = (root.getAttribute("viewBox") ?? "").split(/\s+/).map(Number);
        if (!w || !h) return { error: `the SVG has no usable viewBox (${root.getAttribute("viewBox")})` };
        root.setAttribute("width", String(Math.ceil(w)));
        root.setAttribute("height", String(Math.ceil(h)));
        root.removeAttribute("style"); // mermaid's max-width
        root.setAttribute("data-source-sha256", sha);
        // Into the page as well, so anything the SVG would fetch (a stylesheet @import, an image) is tried now (ER3).
        document.body.append(document.importNode(root, true));
        return { svg: new XMLSerializer().serializeToString(root) };
      },
      [source, FONT, sha] as const,
    );
    if ("error" in rendered) throw new Error(rendered.error);
    await page.evaluate(() => document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 250))));
    if (blocked.length) throw new Error(`network request while rendering: ${blocked.join(", ")}`);
    return rendered.svg;
  } finally {
    await browser.close();
  }
}

/** Throws naming the first way `svg` fails to draw `source`: HTML labels, a missing entity, title or description. */
function assertDrawn(source: string, svg: string): void {
  if (svg.includes("<foreignObject")) throw new Error("the SVG contains <foreignObject> (HTML labels): it won't render inside <img>");
  const erd = parseErd(source);
  if (!erd.entities.length) throw new Error("the diagram draws no entities");
  const missing = erd.entities.map((e) => e.name).filter((e) => !svg.includes(`>${e}<`));
  if (missing.length) throw new Error(`the SVG doesn't draw ${missing.join(", ")}`);
  const escaped = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  if (erd.title !== undefined && !svg.includes(`>${escaped(erd.title)}</title>`)) throw new Error("the SVG's <title> isn't the accTitle");
  if (erd.description !== undefined && !svg.includes(`>${escaped(erd.description)}</desc>`)) throw new Error("the SVG's <desc> isn't the accDescr");
}

/** The SVG of the erDiagram `source`, checked (ER1–ER4); throws naming what failed, or after 60 s. */
export async function renderErd(source: string): Promise<string> {
  let timer!: NodeJS.Timeout;
  const svg = await Promise.race([
    draw(source),
    new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(`no SVG after ${TIMEOUT_MS / 1000} s`)), TIMEOUT_MS))),
  ]).finally(() => clearTimeout(timer));
  assertDrawn(source, svg);
  return svg;
}

export interface WriteOptions {
  /** Draw every SVG, stale or not. */
  force?: boolean;
  log?: (line: string) => void;
}

/**
 * Draws `<dir>/<name>.svg` from `<dir>/<name>.mmd` for each stale name (all, forced), and writes them once every one
 * rendered; a failure, named with its .mmd, writes none.
 */
export async function writeErds(dir: string, names: readonly string[], { force = false, log = console.log }: WriteOptions = {}): Promise<void> {
  const svgs: [file: string, svg: string][] = [];
  const current: string[] = [];
  for (const name of names) {
    const file = join(dir, `${name}.svg`);
    const source = await readFile(join(dir, `${name}.mmd`), "utf8");
    if (!force && !svgStale(source, (await readOptionalText(pathToFileURL(file))) ?? undefined)) {
      current.push(`${name}.svg`);
      continue;
    }
    try {
      svgs.push([file, await renderErd(source)]);
    } catch (e) {
      throw new Error(`${name}.mmd: ${(e as Error).message}`);
    }
  }
  for (const [file, svg] of svgs) {
    await writeFile(`${file}.tmp`, svg);
    await rename(`${file}.tmp`, file);
    log(`erd: wrote ${file}`);
  }
  if (current.length && !svgs.length) log(`erd: ${current.join(", ")} up to date`);
}
